#!/usr/bin/env python3
"""Preserve supplied Meshy surfaces, reduce complete animals, fit quadruped skins and in-place clips.
Run Blender --background --factory-startup --offline-mode --disable-autoexec --python thisfile --
  --inputs SOURCE_DIRECTORY --workshop PRIVATE_OUTPUT_DIRECTORY [--only ID,...] [--render]
The checked-in source list contains filenames only. Inputs are read, never overwritten.
Skeleton joints use identity axes in glTF (+Y up, +Z forward). Anatomical skin fields separate
four legs from torso/head/tail; two-bone IK produces planted stance feet and articulated swing.
No uniform mesh wobble, vertex animation or procedural runtime deformation is used.
"""
import argparse, hashlib, json, math, pathlib, struct, sys, time
from collections import defaultdict

def read_glb(path):
    raw=path.read_bytes();assert raw[:4]==b'glTF';n,t=struct.unpack_from('<II',raw,12);assert t==0x4e4f534a
    doc=json.loads(raw[20:20+n]);ln,bt=struct.unpack_from('<II',raw,20+n);assert bt==0x004e4942
    return doc,bytearray(raw[28+n:28+n+ln])

def write_glb(path,doc,data):
    data+=bytes((-len(data))%4);doc['buffers']=[{'byteLength':len(data)}]
    raw=json.dumps(doc,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
    path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(raw)+len(data))+struct.pack('<II',len(raw),0x4e4f534a)+raw+struct.pack('<II',len(data),0x004e4942)+data)

def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)

def separate_source_contact(animal,row):
    """Separate the verified fused tiger toes with a closed, atlas-matched narrow cut.
    The surrounding source paws remain intact; only the 14 mm touching junction changes.
    Connected low surfaces identify anatomical feet even when the source crosses its midplane.
    """
    import bpy,bmesh
    from mathutils import Vector
    spec=row['sourceContactRepair'];low=spec['min'];high=spec['max']
    lo=Vector((low[0],-high[2],low[1]));hi=Vector((high[0],-low[2],high[1]))
    source_uv=defaultdict(list);layer=animal.data.uv_layers.active
    for polygon in animal.data.polygons:
        for index in polygon.loop_indices:
            loop=animal.data.loops[index];point=animal.data.vertices[loop.vertex_index].co
            source_uv[tuple(round(float(x),6) for x in point)].append(tuple(layer.data[index].uv))
    original=set(source_uv)
    bpy.ops.mesh.primitive_cube_add(size=2,location=(lo+hi)*.5);cutter=bpy.context.object;cutter.scale=(hi-lo)*.5
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);bpy.context.view_layer.objects.active=animal
    mod=animal.modifiers.new('Closed source toe contact separation','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter;mod.use_self=True
    bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
    bm=bmesh.new();bm.from_mesh(animal.data);uv=bm.loops.layers.uv.active
    caps=[f for f in bm.faces if abs(f.normal.y)>.999 and all(min(abs(v.co.y-lo.y),abs(v.co.y-hi.y))<2e-5 for v in f.verts)]
    assert len(caps)==2,'expected two closed source paw cut caps'
    capset=set(caps);edges=[e for e in bm.edges if sum(f in capset for f in e.link_faces)==1]
    for face in caps:
        for loop in face.loops:
            neighbour=next((other for other in loop.vert.link_loops if other.face not in capset),None)
            if neighbour:loop[uv].uv=neighbour[uv].uv
    bmesh.ops.bevel(bm,geom=edges,offset=spec['bevel'],segments=2,profile=.5,affect='EDGES',clamp_overlap=True)
    bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>3],quad_method='BEAUTY',ngon_method='BEAUTY')
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));roi=lambda v:v.co.x<high[0] and low[2]-.15<-v.co.y<high[2]+.1 and v.co.z<high[1]+.03
    assert not any(not e.is_manifold and any(roi(v) for v in e.verts) for e in bm.edges),'source contact repair must stay closed'
    bm.to_mesh(animal.data);bm.free();animal.data.update()
    retained=changed=0
    for polygon in animal.data.polygons:
        for index in polygon.loop_indices:
            loop=animal.data.loops[index];point=animal.data.vertices[loop.vertex_index].co
            reference=source_uv.get(tuple(round(float(x),6) for x in point))
            if reference:
                actual=animal.data.uv_layers.active.data[index].uv
                if any(max(abs(actual[k]-values[k]) for k in range(2))<1e-6 for values in reference):retained+=1
                else:changed+=1
    assert changed==0,'repair must preserve all retained authored UV loops'
    # Edge connectivity, rather than spatial Voronoi cells, keeps the long raised fore toes
    # attached to their actual fore leg after the touching source junction is separated.
    mesh=animal.data;parents=list(range(len(mesh.vertices)))
    def root(i):
        while parents[i]!=i:parents[i]=parents[parents[i]];i=parents[i]
        return i
    def join(a,b):
        a,b=root(a),root(b)
        if a!=b:parents[b]=a
    faces=[p for p in mesh.polygons if all(mesh.vertices[i].co.z<spec['componentHeight'] for i in p.vertices)]
    for face in faces:
        for i in face.vertices[1:]:join(face.vertices[0],i)
    groups=defaultdict(list)
    for i in {i for f in faces for i in f.vertices}:groups[root(i)].append(i)
    groups=[ids for ids in groups.values() if len(ids)>100]
    assert len(groups)==4,'expected four separate anatomical low paws'
    groups.sort(key=lambda ids:sum(-mesh.vertices[i].co.y for i in ids)/len(ids))
    result={};labels={}
    for key,ids in zip(spec['componentOrder'],groups):
        idset=set(ids);source_ids={i for i in ids if tuple(round(float(x),6) for x in mesh.vertices[i].co) in original}
        source_faces=[p for p in faces if set(p.vertices)<=idset and p.normal.z<-.45 and max(mesh.vertices[i].co.z for i in p.vertices)<.16 and all(i in source_ids for i in p.vertices)]
        area=sum(p.area for p in source_faces);assert area>0
        center=sum((p.center*p.area for p in source_faces),Vector())/area;foot=Vector((center.x,center.z,-center.y))
        floor=min(mesh.vertices[i].co.z for i in source_ids);samples=[(math.hypot(mesh.vertices[i].co.x-foot.x,-mesh.vertices[i].co.y-foot.z),p.area/len(p.vertices)) for p in source_faces for i in p.vertices];accumulated=0;radius=0
        for distance,value in sorted(samples):
            accumulated+=value
            if accumulated>=area*.95:radius=distance;break
        result[key]={'foot':foot,'soleY':floor,'contactRadius':radius}
        for i in ids:labels[i]=key
    return result,labels,{'cutBounds':{'min':low,'max':high},'capBevelMeters':spec['bevel'],'capPolygons':len(caps),'closedContactSurface':True,'authoredUVLoopsRetained':retained,'authoredUVLoopsChanged':changed}

def fit_rig(points,row,contacts=None):
    import numpy as np
    from mathutils import Vector
    h=row['height'];s=row['species'];low=points.min(axis=0);high=points.max(axis=0);length=float(high[2]-low[2]);seated=row.get('restPose')=='seated'
    # Fractions are species anatomy, measured against full source height (deer includes antlers).
    anatomy={'deer':(.47,.48,.62,.69), 'boar':(.58,.59,.58,.56),'bear':(.64,.65,.59,.57),
             'wolf':(.54,.58,.67,.74),'dog':(.54,.59,.69,.79),'cat':(.53,.58,.67,.77),
             'tiger':(.59,.62,.69,.73),'lion':(.53,.60,.70,.76)}[s]
    hip_h,shoulder_h,neck_h,head_h=anatomy
    rear=-.23*length;front=.21*length
    if seated:hip_h=.21;shoulder_h=.53;neck_h=.66;head_h=.77;rear=-.12*length;front=.20*length
    # Fit two independent contact clusters at each body end; an asymmetric source pose can
    # put both front paws on one side of the overall fur/whisker bounding-box centre.
    foot={};sole={};contact_radius={};width=float(high[0]-low[0])
    for fore,z0 in [('front',front),('hind',rear)]:
        seed=points[(points[:,1]<h*.18)&(abs(points[:,2]-z0)<length*.22)]
        if len(seed)<30:seed=points[(points[:,1]<h*.27)&(abs(points[:,2]-z0)<length*.22)]
        centers=np.percentile(seed[:,0],[25,75]) if len(seed)>10 else np.array([-width*.24,width*.24])
        for _ in range(12):
            labels=np.argmin(abs(seed[:,0,None]-centers[None,:]),axis=1)
            for k in range(2):
                if np.count_nonzero(labels==k)>5:centers[k]=np.median(seed[labels==k,0])
        centers=np.sort(centers);mid=float(np.mean(centers))
        for side,sign,k in [('L',1,1),('R',-1,0)]:
            q=points[(points[:,1]<h*.30)&((points[:,0]-mid)*sign>0)&(abs(points[:,2]-z0)<length*.22)]
            if len(q)>10:
                local_floor=float(np.percentile(q[:,1],2));q=q[q[:,1]<local_floor+h*.04]
            if len(q)>10:x=float(np.median(q[:,0]));z=float(np.median(q[:,2]));y=float(np.percentile(q[:,1],20))
            else:x=float(centers[k]);z=z0;y=h*.018
            foot[fore+side]=Vector((x,max(y,h*.012),z));sole[fore+side]=float(np.min(q[:,1])) if len(q)>10 else 0
            r=float(np.percentile(np.sqrt((q[:,0]-x)**2+(q[:,2]-z)**2),95))*1.12 if len(q)>10 else h*.08
            contact_radius[fore+side]=max(h*.045,min(h*.105,r))
    if contacts:
        for key,contact in contacts.items():
            foot[key]=contact['foot'];sole[key]=contact['soleY'];contact_radius[key]=contact['contactRadius']
    front_mean=float(sum(foot['front'+a].z for a in ('L','R'))*.5);rear_mean=float(sum(foot['hind'+a].z for a in ('L','R'))*.5)
    if abs(foot['frontL'].z-foot['frontR'].z)<h*.12:front=front_mean
    if abs(foot['hindL'].z-foot['hindR'].z)<h*.12:rear=rear_mean
    front_x=float((foot['frontL'].x+foot['frontR'].x)*.5);rear_x=float((foot['hindL'].x+foot['hindR'].x)*.5)
    names=[];parents=[];joints=[]
    def add(name,p,par=None):
        names.append(name);parents.append(names.index(par) if par else None);joints.append(Vector(p));return len(names)-1
    add('animalRoot',(0,0,0));add('hips',(rear_x,hip_h*h,rear),'animalRoot')
    add('spine',((front_x+rear_x)*.5,(hip_h+shoulder_h)*h*.5,(front+rear)*.5),'hips');add('chest',(front_x,shoulder_h*h,front),'spine')
    add('neck',(front_x,neck_h*h,front+length*.07),'chest');add('head',(front_x,head_h*h,min(float(high[2])-length*.10,front+length*.16)),'neck')
    add('jaw',(front_x,(head_h-.09)*h,float(high[2])-length*.12),'head')
    for sign,side in [(1,'L'),(-1,'R')]:add('ear'+side,(front_x+sign*width*.20,(head_h+.08)*h,joints[names.index('head')].z-length*.04),'head')
    # A tail chain follows source centreline rather than assuming a straight horizontal tail.
    tailbase=Vector((0,hip_h*h,rear-length*.055));add('tailBase',tailbase,'hips')
    for k in (1,2,3):
        tz=rear-length*(.07+.065*k);q=points[(abs(points[:,2]-tz)<length*.045)&(points[:,2]<rear-length*.04)&(abs(points[:,0])<width*.16)&(points[:,1]>h*.13)]
        ty=float(np.median(q[:,1])) if len(q)>5 else tailbase.y-h*.06*k
        tx=float(np.median(q[:,0])) if len(q)>5 else 0
        add('tail'+str(k),(tx,max(h*.04,ty),tz),'tailBase' if k==1 else 'tail'+str(k-1))
    legs=[]
    for fore,parent,top_h in [('front','chest',shoulder_h),('hind','hips',hip_h)]:
        for side in ('L','R'):
            key=fore+side;f=foot[key];top=Vector((f.x,top_h*h,front if fore=='front' else rear))
            knee=Vector((f.x,top.y*(.67 if fore=='front' else .57),(top.z+f.z)*.5+(-.04 if fore=='front' else .065)*h))
            ankle=Vector((f.x,max(f.y+h*.095,top.y*.20),f.z-.015*h))
            if seated and fore=='hind':knee=Vector((f.x,top.y*.58,f.z+.10*h));ankle=Vector((f.x,h*.06,f.z-.04*h))
            idx=[]
            for part,pos,par in [('Shoulder' if fore=='front' else 'Hip',top,parent),('Elbow' if fore=='front' else 'Knee',knee,None),('Wrist' if fore=='front' else 'Hock',ankle,None),('Paw',f,None)]:
                name=fore+part+side;idx.append(add(name,pos,par or names[idx[-1]]))
            legs.append({'key':key,'fore':fore=='front','indices':idx,'foot':list(f),'soleY':sole[key],'contactRadius':contact_radius[key],'legLength':(knee-top).length+(ankle-knee).length})
    return {'names':names,'parents':parents,'joints':joints,'legs':legs,'length':length,'width':width,'frontZ':front,'rearZ':rear,'seated':seated,'frontX':front_x,'rearX':rear_x}

def skin_weights(points,rig,row):
    import numpy as np
    h=row['height'];names=rig['names'];joints=rig['joints'];ix={n:i for i,n in enumerate(names)};fore=rig['frontZ'];rear=rig['rearZ'];length=rig['length'];width=rig['width'];rows=[]
    def distseg(p,a,b):
        v=b-a;t=max(0,min(1,float(np.dot(p-a,v)/max(np.dot(v,v),1e-10))));return float(np.linalg.norm(p-(a+v*t))),t
    for p in points:
        x,y,z=map(float,p);between=smooth(rear,fore,z);w={ix['hips']:1-between,ix['chest']:between}
        middle=1-abs(2*between-1);w[ix['spine']]=middle*.7
        total=sum(w.values());w={k:v/total for k,v in w.items()}
        # Head field follows the elevated neck in deer/canines and the forward muzzle of bears/boars.
        n=joints[ix['neck']];hd=joints[ix['head']]
        headfront=smooth(fore-length*.025,fore+length*.11,z)
        elevated=smooth(n.y-h*.16,n.y+h*.015,y)
        headfield=headfront*(.35+.65*elevated)
        if row['species'] in ('bear','boar'):headfield=headfront
        if rig['seated']:headfield=headfront*elevated
        headfield=max(0,min(1,headfield))
        hf=smooth(n.y-h*.04,hd.y+h*.025,y)*.6+smooth(n.z,hd.z,z)*.4
        w={k:v*(1-headfield) for k,v in w.items()};w[ix['neck']]=headfield*(1-hf);w[ix['head']]=headfield*hf
        # Rigid antlers and outer face remain attached to the head. Lower muzzle has gentle jaw influence.
        if y>hd.y+h*.065 and z>fore-length*.03:w={ix['head']:1}
        jawfield=headfield*smooth(hd.z,hd.z+length*.085,z)*(1-smooth(hd.y-h*.12,hd.y-h*.065,y))*.75
        if jawfield>0:w={k:v*(1-jawfield) for k,v in w.items()};w[ix['jaw']]=jawfield
        # Tail beyond rump; taper body/tail blend to keep rump and rear limbs intact.
        tailfield=(1-smooth(rear-length*.20,rear-length*.065,z))*(1-smooth(width*.10,width*.17,abs(x)))
        tailfield*=max(smooth(h*.10,h*.24,y),1-smooth(rear-length*.25,rear-length*.17,z))
        # Deer height includes antlers; the short tail stays at the rump, above the
        # lower rear legs. A tail capsule extending to low hocks creates hind-leg leakage.
        if row['species']=='deer':tailfield*=smooth(h*.30,h*.37,y)
        if tailfield>0:
            d=[np.linalg.norm(p-np.array(joints[ix[n]])) for n in ['tailBase','tail1','tail2','tail3']];best=np.argsort(d)[:2];vw=[1/max(d[k],h*.025)**2 for k in best];sm=sum(vw)
            w={k:v*(1-tailfield) for k,v in w.items()}
            for k,v in zip(best,vw):w[ix[['tailBase','tail1','tail2','tail3'][k]]]=tailfield*v/sm
        # A narrow anatomical capsule restricts leg weights to each leg, not the belly between them.
        candidates=[]
        for leg in rig['legs']:
            ids=leg['indices'];js=[np.array(joints[k]) for k in ids];dist,t=distseg(p,js[0],js[1]);d2,t2=distseg(p,js[1],js[2]);d3,t3=distseg(p,js[2],js[3]);mind=min(dist,d2,d3)
            radius=h*({'bear':.155,'boar':.13,'deer':.065,'cat':.10}.get(row['species'],.085))
            vertical=1-smooth(js[0][1]-h*.16,js[0][1]+h*.035,y)
            lateral=smooth(width*.025,width*.12,abs(x))
            field=(1-smooth(radius*.55,radius*1.35,mind))*vertical*lateral
            lower_height=h*{'bear':.27,'boar':.22,'deer':.37,'cat':.31,'wolf':.35,'dog':.34,'tiger':.37,'lion':.30}[row['species']]
            lower_field=(1-smooth(lower_height-h*.05,lower_height+h*.035,y))*(1-smooth(radius*.95,radius*1.85,mind))
            center_x=rig['frontX'] if leg['fore'] else rig['rearX'];body_lateral=smooth(width*.025,width*.12,abs(x-center_x));lat=1-smooth(h*.18,h*.30,y)+body_lateral*smooth(h*.18,h*.30,y)
            field=max(field,lower_field*lat)
            # Include full toe/claw surfaces, while separating neighbouring feet.
            toe_field=(1-smooth(h*.07,h*.12,y))*(1-smooth(h*.16,h*.24,abs(z-js[3][2])))*(1-smooth(h*.13,h*.20,abs(x-js[3][0])))
            field=max(field,toe_field*lat)
            # The source can cross its own midplane in a walking pose; continuous distance scores
            # identify each limb without a hard spatial left/right boundary.
            candidates.append((field,-mind,leg,js))
        field=max(c[0] for c in candidates)
        if field>0:
            scores=[c[0]**2*math.exp(-((-c[1])/(h*.17))**2) for c in candidates];total_score=sum(scores)
            w={k:v*(1-field) for k,v in w.items()}
            for score,(_,_,leg,js) in zip(scores,candidates):
                if score<1e-12:continue
                ids=leg['indices'];knee=float(js[1][1]);ankle=float(js[2][1]);upper=smooth(knee-h*.06,knee+h*.10,y);paw=1-smooth(ankle-h*.045,ankle+h*.055,y);lower=(1-upper)*(1-paw)
                lw={ids[0]:upper,ids[1]:lower,ids[2]:paw*.65,ids[3]:paw*.35}
                for k,v in lw.items():w[k]=w.get(k,0)+v*field*score/total_score
        # All antler tines, including backward branches above the torso, are rigid head anatomy.
        if row['species']=='deer' and y>hd.y+h*.065:w={ix['head']:1}
        if row.get('sourceContactCleanup'):
            for leg in rig['legs']:
                ankle,paw=leg['indices'][2:];w[ankle]=w.get(ankle,0)+w.pop(paw,0)
        pairs=sorted(((k,v) for k,v in w.items() if v>1e-7),key=lambda kv:kv[1],reverse=True)[:4];total=sum(v for _,v in pairs);rows.append([(k,v/total) for k,v in pairs])
    return rows

def relax_skin(mesh,points,rows,rig,row):
    """Diffuse weights across real neighbouring surface vertices, including matching UV seams.
    Contacts and antlers remain coherent. Disconnected/very long mesh edges do not leak influence;
    floor edges crossing between opposite paws are source bridges that will be removed at export.
    """
    import numpy as np
    h=row['height'];n=len(points);k=len(rig['names']);weights=np.zeros((n,k),dtype=np.float64)
    for i,pairs in enumerate(rows):
        for bone,value in pairs:weights[i,bone]=value
    component_labels=rig.get('componentLabels',{})
    for i,key in component_labels.items():
        leg=next(l for l in rig['legs'] if l['key']==key);ids=leg['indices'];y=points[i,1]
        ankle=rig['joints'][ids[2]].y;paw=1-smooth(ankle-h*.045,ankle+h*.055,y)
        weights[i]=0;weights[i,ids[1]]=1-paw;weights[i,ids[2]]=paw*.65;weights[i,ids[3]]=paw*.35
    edges=np.array([(e.vertices[0],e.vertices[1]) for e in mesh.edges],dtype=np.int32)
    if not len(edges):return rows
    delta=points[edges[:,0]]-points[edges[:,1]];length=np.linalg.norm(delta,axis=1);keep=length<h*.075
    # Source floor bridges connect distinct soles and must not mix their skin fields.
    for fore,mid in [('front',rig['frontX']),('hind',rig['rearX'])]:
        z0=rig['frontZ'] if fore=='front' else rig['rearZ'];a=points[edges[:,0]];b=points[edges[:,1]]
        crossing=(a[:,0]-mid)*(b[:,0]-mid)<0
        low=(a[:,1]<h*.25)&(b[:,1]<h*.25)&(abs((a[:,2]+b[:,2])*.5-z0)<h*.35)
        left=weights[edges[:,0]];right=weights[edges[:,1]]
        li=np.argmax(left,axis=1);ri=np.argmax(right,axis=1);ln=np.array([rig['names'][i] for i in li]);rn=np.array([rig['names'][i] for i in ri])
        opposite=np.array([aa.startswith(fore) and bb.startswith(fore) and aa[-1]!=bb[-1] for aa,bb in zip(ln,rn)])
        keep&=~(crossing&low&opposite)
    edges=edges[keep];length=length[keep];a=np.concatenate([edges[:,0],edges[:,1],np.arange(n)]);b=np.concatenate([edges[:,1],edges[:,0],np.arange(n)])
    factor=1/(length+h*.008);f=np.concatenate([factor,factor,np.full(n,1/(h*.02))]);denom=np.bincount(a,weights=f,minlength=n)
    alpha=np.full(n,.55)
    # Skin diffusion near upper faces is gentle; it does not spread jaw motion into eyes/antlers.
    head_y=rig['joints'][rig['names'].index('head')].y;alpha[points[:,1]>head_y+h*.03]=.15
    for _ in range(48):
        average=np.stack([np.bincount(a,weights=weights[b,j]*f,minlength=n)/denom for j in range(k)],axis=1)
        weights=weights*(1-alpha[:,None])+average*alpha[:,None]
    if row.get('upperThighPelvisBlend'):
        # Broad rump/thigh flesh follows the pelvis and upper leg. The lower-leg knee
        # palette must taper out above the middle thigh instead of sweeping the rump forward.
        spec=row['upperThighPelvisBlend'];upper_thigh=np.clip((points[:,1]-h*spec['startHeight'])/(h*(spec['endHeight']-spec['startHeight'])),0,1);upper_thigh=upper_thigh*upper_thigh*(3-2*upper_thigh)
        for leg in rig['legs']:
            if leg['fore']:continue
            hip,knee=leg['indices'][:2];transfer=weights[:,knee]*upper_thigh
            weights[:,knee]-=transfer;weights[:,hip]+=transfer*(1-spec['pelvisShare']);weights[:,rig['names'].index('hips')]+=transfer*spec['pelvisShare']
    # Preserve the rigid high antler/head assignment after topology diffusion.
    if row['species']=='deer':
        antler=points[:,1]>head_y+h*.065;weights[antler]=0;weights[antler,rig['names'].index('head')]=1
    # Pin the source contact surface to its anatomically nearest foot, including posed/crossing paws.
    feet=np.array([rig['joints'][leg['indices'][-1]] for leg in rig['legs']]);dx=points[:,None,0]-feet[None,:,0];dz=points[:,None,2]-feet[None,:,2];distance=np.sqrt(dx*dx+dz*dz);closest=np.argmin(distance,axis=1)
    for i,key in component_labels.items():closest[i]=next(k for k,l in enumerate(rig['legs']) if l['key']==key)
    for i,leg in enumerate(rig['legs']):
        low=leg['soleY']+h*.035;high=leg['soleY']+h*.09
        yy=np.clip((points[:,1]-low)/(high-low),0,1);fade=1-yy*yy*(3-2*yy)
        rr=np.clip((distance[:,i]-h*.17)/(h*.08),0,1);fade*=1-rr*rr*(3-2*rr);fade*=closest==i
        weights*=1-fade[:,None];weights[:,leg['indices'][2]]+=fade*.65;weights[:,leg['indices'][3]]+=fade*.35
    for i,key in component_labels.items():
        leg=next(l for l in rig['legs'] if l['key']==key);ids=leg['indices'];y=points[i,1]
        # The raised source fore paw is long and tilted. Its connected toes follow this paw,
        # even where their coordinates lie nearer the rear foot across the repaired slit.
        top=leg['foot'][1]+h*.07;fade=1-smooth(top,top+h*.09,y)
        weights[i]*=1-fade;weights[i,ids[2]]+=fade*.65;weights[i,ids[3]]+=fade*.35
    # Paw and wrist/hock palettes are identical in all authored clips. Keep the contact leaf
    # bone, but combine its redundant influence before four-weight truncation for the tiger.
    if row.get('sourceContactCleanup'):
        for leg in rig['legs']:
            ankle,paw=leg['indices'][2:];weights[:,ankle]+=weights[:,paw];weights[:,paw]=0
        for i,leg in enumerate(rig['legs']):
            ankle,paw=leg['indices'][2:]
            core=(closest==i)&(distance[:,i]<leg['contactRadius']*.90)&(points[:,1]<leg['soleY']+h*.035)&(weights[:,ankle]>.999)
            weights[core,ankle]=.65;weights[core,paw]=.35
    output=[]
    for w in weights:
        ids=np.argsort(w)[-4:][::-1];values=w[ids];total=values.sum();output.append([(int(bone),float(value/total)) for bone,value in zip(ids,values) if value>1e-7])
    return output

def make_animation(rig,row,name,clip_spec=None):
    from mathutils import Vector,Quaternion
    s=row['species'];h=row['height'];names=rig['names'];parents=rig['parents'];js=rig['joints'];ix={n:i for i,n in enumerate(names)}
    trot=name=='Run' and row.get('runStyle')=='brisk-trot'
    duration={'Idle':4.,'Alert':2.,'Call':4.,'Graze':4.,'Groom':4.,'Sleep':5.,'Walk':1.3 if s in ('bear','boar') else .9 if s in ('cat','dog','wolf') else 1.2,'Run':.8 if s in ('bear','boar') or trot else .65}[name]
    ref={'tiger':(1.1,3.8),'lion':(1.05,3.4),'bear':(.8,2.2),'wolf':(1.2,3.5),'cat':(.55,1.8),'dog':(1.,2.6),'boar':(.75,2.),'deer':(1.15,3.5)}[s]
    moving=name in ('Walk','Run');duty=.64 if name=='Walk' else .60 if trot else .38
    speed=ref[0 if name=='Walk' else 1] if moving else 0
    stance=min(speed*duration*duty,min(l['legLength'] for l in rig['legs'])*.86) if moving else 0
    if moving:
        max_bob=(.012 if s in ('bear','boar') else .025)*h if name=='Walk' or trot else (.012 if s=='deer' else .035)*h
        drop=h*(.05 if name=='Walk' or trot else .04 if s=='deer' else .075);reachable=[]
        for leg in rig['legs']:
            top,knee,ankle,paw=leg['indices'];vertical=js[top].y-js[ankle].y+leg['soleY']+max_bob-drop
            horizontal=math.sqrt(max(0,(leg['legLength']*.997)**2-vertical**2))-h*.04
            reachable.append(max(h*.015,horizontal)*2)
        stance=min(stance,min(reachable))
    if clip_spec and moving and s!='deer':stance=min(stance,clip_spec['stanceDistance'])
    actual_speed=stance/(duration*duty) if moving else 0
    frames=round(duration*30);samples=[];last_q=[None]*len(names);max_stance_error=0
    for frame in range(frames+1):
        t=frame/frames;cycle=t*math.tau;quats=[Quaternion((1,0,0,0)) for _ in names];root=Vector((0,0,0))
        def rot(n,axis,angle):quats[ix[n]]=quats[ix[n]]@Quaternion(axis,angle)
        if name=='Idle':
            rot('chest',(1,0,0),math.sin(cycle)*.012);rot('neck',(0,1,0),math.sin(cycle)*.024);rot('head',(1,0,0),math.sin(cycle+.8)*.022)
            rot('earL',(0,0,1),max(0,math.sin(cycle*3))**12*.10);rot('earR',(0,0,1),-max(0,math.sin(cycle*3+1))**12*.10)
        elif moving:
            root.y=(.012 if s in ('bear','boar') else .025)*h*(1-math.cos(cycle*2))*.5
            if name=='Run' and not trot:root.y=h*(.012 if s=='deer' else .035)*(1-math.cos(cycle*2))*.5
            root.y-=h*(.05 if name=='Walk' or trot else .04 if s=='deer' else .075)
            rot('hips',(0,1,0),math.sin(cycle)*.018);rot('spine',(0,1,0),-math.sin(cycle)*.028)
            rot('chest',(1,0,0),math.sin(cycle*2)*(.014 if name=='Walk' else .045));rot('neck',(1,0,0),-math.sin(cycle*2)*.022)
        elif name=='Alert':
            e=math.sin(math.pi*t)**2;rot('neck',(1,0,0),-e*.14);rot('head',(0,1,0),math.sin(cycle)*.13);rot('earL',(0,0,1),e*.12);rot('earR',(0,0,1),-e*.12)
        elif name=='Call':
            e=math.sin(math.pi*t)**2;howl=s in ('wolf','dog','deer');rot('neck',(1,0,0),-e*(.25 if howl else .09));rot('head',(1,0,0),-e*(.28 if howl else .05));rot('jaw',(1,0,0),e*(.19 if s=='deer' else .28));rot('chest',(1,0,0),math.sin(cycle*3)*e*.018)
        elif name=='Graze':
            e=math.sin(math.pi*t)**2;rot('neck',(1,0,0),e*(.65 if s=='deer' else .24));rot('head',(1,0,0),e*(.37 if s=='deer' else .19));rot('jaw',(1,0,0),e*max(0,math.sin(cycle*6))*.045)
        elif name=='Groom':
            e=math.sin(math.pi*t)**2;rot('neck',(1,0,0),e*.28);rot('head',(0,0,1),e*.18);rot('jaw',(1,0,0),e*max(0,math.sin(cycle*5))*.12)
        elif name=='Sleep':
            e=math.sin(math.pi*t)**2;rot('neck',(1,0,0),e*.19);rot('head',(0,0,1),e*.10);rot('chest',(1,0,0),math.sin(cycle*2)*.006)
        for k in range(4):rot('tailBase' if k==0 else 'tail'+str(k),(0,1,0),math.sin(cycle+k*.55)*(.05 if s not in ('dog','cat') else .10))
        # Evaluate body first; inverse kinematics counters its motion during every stance phase.
        gp=[None]*len(names);gq=[None]*len(names)
        for k in range(13):
            p=parents[k];local=js[k]-(js[p] if p is not None else Vector((0,0,0)))
            gp[k]=(gp[p]+gq[p]@local) if p is not None else root+local;gq[k]=(gq[p]@quats[k]) if p is not None else quats[k]
        for leg in rig['legs']:
            top,knee,ankle,paw=leg['indices'];p=parents[top];toppos=gp[p]+gq[p]@(js[top]-js[p]);goal=js[paw].copy();phase=0
            if moving:
                goal.y-=leg['soleY'];goal.z=js[top].z+(js[paw].z-js[ankle].z)
                if name=='Walk':offset={'hindL':0,'frontL':.23,'hindR':.5,'frontR':.73}[leg['key']]
                elif s in ('wolf','dog') or trot:offset={'frontL':0,'hindR':0,'frontR':.5,'hindL':.5}[leg['key']]
                elif s in ('bear','boar'):offset={'hindL':0,'frontL':.10,'hindR':.5,'frontR':.60}[leg['key']]
                else:offset={'hindL':0,'hindR':.10,'frontL':.46,'frontR':.56}[leg['key']]
                phase=(t+offset)%1
                if phase<duty:goal.z+=stance*(.5-phase/duty)
                else:
                    a=(phase-duty)/(1-duty);goal.z+=stance*(-.5+smooth(0,1,a));goal.y+=math.sin(math.pi*a)**1.5*h*(.10 if trot else .12 if name=='Walk' else .13 if s=='deer' else .22)
            if name=='Groom' and leg['key']=='frontL':goal.y+=math.sin(math.pi*t)**2*h*.13;goal.z+=math.sin(math.pi*t)**2*h*.02
            # Keep seated hindquarters in their supplied bind pose; breathing remains in torso/head.
            if rig['seated'] and not leg['fore']:
                for k in leg['indices']:
                    par=parents[k];gp[k]=gp[par]+gq[par]@(js[k]-js[par]);gq[k]=gq[par]@quats[k]
                continue
            pawoffset=js[paw]-js[ankle];anklegoal=goal-pawoffset
            v=anklegoal-toppos;dist=v.length;l1=(js[knee]-js[top]).length;l2=(js[ankle]-js[knee]).length
            dist=max(abs(l1-l2)+1e-5,min(dist,(l1+l2)*.998));direction=v.normalized();along=(l1*l1-l2*l2+dist*dist)/(2*dist);bend=math.sqrt(max(0,l1*l1-along*along))
            perp=Vector((0,-direction.z,direction.y)).normalized();sign=1 if leg['fore'] else -1
            # Keep the anatomical bend branch fixed for the whole clip. Recomputing it from
            # the moving target flips the knee and creates metre-scale interpolation spikes.
            kp=toppos+direction*along+perp*bend*sign;ap=toppos+direction*dist
            qtop=(js[knee]-js[top]).rotation_difference(kp-toppos);qknee=(js[ankle]-js[knee]).rotation_difference(ap-kp)
            quats[top]=gq[p].conjugated()@qtop;quats[knee]=qtop.conjugated()@qknee;quats[ankle]=qknee.conjugated();quats[paw]=Quaternion((1,0,0,0))
            gp[top]=toppos;gp[knee]=kp;gp[ankle]=ap;gp[paw]=ap+pawoffset
            if moving and phase<duty:max_stance_error=max(max_stance_error,(gp[paw]-goal).length)
            gq[top]=qtop;gq[knee]=qknee;gq[ankle]=gq[paw]=Quaternion((1,0,0,0))
        encoded=[]
        for k,q in enumerate(quats):
            q.normalize()
            if last_q[k] is not None and q.dot(last_q[k])<0:q.negate()
            last_q[k]=q.copy();encoded.append((q.x,q.y,q.z,q.w))
        samples.append((duration*t,list(root),encoded))
    return {'name':name,'duration':duration,'referenceSpeed':actual_speed,'requestedReferenceSpeed':speed,'stanceDistance':stance,'stanceFraction':duty if moving else None,'maxStanceReachError':max_stance_error,'samples':samples}

def append_rig(path,rig,rows,points,row):
    import numpy as np
    doc,binary=read_glb(path)
    def accessor(raw,component,typ,count,bounds=None):
        binary.extend(bytes((-len(binary))%4));vi=len(doc.setdefault('bufferViews',[]));doc['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(raw)});binary.extend(raw)
        ai=len(doc.setdefault('accessors',[]));a={'bufferView':vi,'componentType':component,'type':typ,'count':count};a.update(bounds or {});doc['accessors'].append(a);return ai
    lookup={tuple(round(float(x),5) for x in p):w for p,w in zip(points,rows)}
    def decode_positions(ai):
        a=doc['accessors'][ai];v=doc['bufferViews'][a['bufferView']];off=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',12)
        return [struct.unpack_from('<3f',binary,off+i*stride) for i in range(a['count'])]
    for mesh in doc['meshes']:
        for prim in mesh['primitives']:
            positions=decode_positions(prim['attributes']['POSITION']);ji=bytearray();we=bytearray()
            for p in positions:
                key=tuple(round(float(x),5) for x in p);weights=lookup.get(key)
                if weights is None:
                    choices=[lookup[k] for dx in (-1,0,1) for dy in (-1,0,1) for dz in (-1,0,1) if (k:=tuple(round(key[t]+[dx,dy,dz][t]*1e-5,5) for t in range(3))) in lookup];assert choices,('export position not found',p);weights=choices[0]
                ii=[i for i,w in weights];ww=[w for i,w in weights];ji.extend(struct.pack('<4H',*(ii+[0]*(4-len(ii)))));we.extend(struct.pack('<4f',*(ww+[0]*(4-len(ww)))))
            prim['attributes']['JOINTS_0']=accessor(ji,5123,'VEC4',len(positions));prim['attributes']['WEIGHTS_0']=accessor(we,5126,'VEC4',len(positions))
    start=len(doc['nodes']);names=rig['names'];parents=rig['parents'];js=rig['joints']
    for k,name in enumerate(names):
        p=parents[k];delta=js[k].copy() if p is None else js[k]-js[p];doc['nodes'].append({'name':name,'translation':list(delta)})
    for k,p in enumerate(parents):
        if p is not None:doc['nodes'][start+p].setdefault('children',[]).append(start+k)
    ibm=bytearray()
    for x,y,z in js:ibm.extend(struct.pack('<16f',1,0,0,0,0,1,0,0,0,0,1,0,-x,-y,-z,1))
    doc['skins']=[{'name':'Tervain anatomical quadruped','joints':list(range(start,start+len(names))),'skeleton':start,'inverseBindMatrices':accessor(ibm,5126,'MAT4',len(names))}]
    for n in doc['nodes'][:start]:
        if 'mesh' in n:n['skin']=0
    doc['scenes'][doc.get('scene',0)]['nodes'].append(start)
    clips=['Idle','Alert','Call','Groom','Sleep'] if rig['seated'] else ['Idle','Walk','Run','Alert','Call']+(['Graze'] if row['species'] in ('deer','boar') else [])
    animations=[];clipmeta=[]
    for name in clips:
        animation=make_animation(rig,row,name);samples=animation.pop('samples');count=len(samples);times=accessor(struct.pack('<'+'f'*count,*[a[0] for a in samples]),5126,'SCALAR',count,{'min':[0],'max':[animation['duration']]})
        a={'name':name,'extras':{'referenceSpeed':animation['referenceSpeed'],'rootMotion':False},'samplers':[],'channels':[]}
        def channel(node,property,output):
            si=len(a['samplers']);a['samplers'].append({'input':times,'output':output,'interpolation':'LINEAR'});a['channels'].append({'sampler':si,'target':{'node':start+node,'path':property}})
        channel(0,'translation',accessor(struct.pack('<'+'f'*(count*3),*[v for t,p,q in samples for v in p]),5126,'VEC3',count))
        for k in range(len(names)):channel(k,'rotation',accessor(struct.pack('<'+'f'*(count*4),*[v for t,p,q in samples for v in q[k]]),5126,'VEC4',count))
        animations.append(a);animation.update({'rootMotion':False,'loopable':name in ('Idle','Walk','Run','Graze','Groom','Sleep')});clipmeta.append(animation)
    doc['scenes'][doc.get('scene',0)]['extras']={'animal':{'id':row['id'],'species':row['species'],'restPose':'seated' if rig['seated'] else 'standing','motionSpeeds':{c['name']:c['referenceSpeed'] for c in clipmeta if c['name'] in ('Walk','Run')}}}
    doc['animations']=animations;doc['asset']['generator']='Tervain Blender anatomical quadruped preparation 1 / stable anatomical IK branch'
    doc['asset']['extras']={'sourceId':row['id'],'species':row['species'],'up':'+Y','forward':'+Z','units':'meters','rootMotion':False,'restPose':'seated' if rig['seated'] else 'standing'}
    # Remove export-quantized zero faces and tiny AI-generated floor bridges between distinct paws.
    # Such source bridges are invisible at rest but tear into strips when the real paws separate.
    removed_bridges=0
    def limb_group(p):
        pairs=lookup.get(tuple(round(float(x),5) for x in p),[])
        totals=defaultdict(float)
        for k,w in pairs:
            name=names[k]
            if name.startswith(('front','hind')):totals[('front' if name.startswith('front') else 'hind')+name[-1]]+=w
        return max(totals,key=totals.get) if totals and max(totals.values())>.55 else None
    def bridge(positions,ii):
        ps=[np.array(positions[i]) for i in ii]
        if row.get('sourceContactRepair'):return False
        if any(p[1]>row['height']*.25 for p in ps):return False
        groups=[limb_group(p) for p in ps]
        for a,bb in [(0,1),(1,2),(2,0)]:
            ga,gb=groups[a],groups[bb]
            contact=[]
            for p in (ps[a],ps[bb]):
                ds=[math.hypot(p[0]-leg['foot'][0],p[2]-leg['foot'][2]) for leg in rig['legs']];contact.append(int(np.argmin(ds)) if min(ds)<row['height']*.22 else None)
            contact_boundary=contact[0] is not None and contact[1] is not None and contact[0]!=contact[1]
            different=ga and gb and ga!=gb
            near_mid=min(max(abs(ps[a][0]-rig['frontX']),abs(ps[bb][0]-rig['frontX'])),max(abs(ps[a][0]-rig['rearX']),abs(ps[bb][0]-rig['rearX'])))<row['height']*.035
            opposite=different or contact_boundary or (near_mid and ps[a][0]*ps[bb][0]<0)
            if opposite and np.linalg.norm(ps[a]-ps[bb])<row['height']*.04:return True
        return False
    for mesh in doc['meshes']:
        for prim in mesh['primitives']:
            positions=decode_positions(prim['attributes']['POSITION']);ia=doc['accessors'][prim['indices']];iv=doc['bufferViews'][ia['bufferView']];code,size={5123:('H',2),5125:('I',4)}[ia['componentType']];ii=struct.unpack_from('<'+code*ia['count'],binary,iv.get('byteOffset',0)+ia.get('byteOffset',0));kept=[]
            for at in range(0,len(ii),3):
                p0,p1,p2=(np.array(positions[ii[at+k]]) for k in range(3))
                if bridge(positions,ii[at:at+3]):removed_bridges+=1
                elif np.linalg.norm(np.cross(p1-p0,p2-p0))>1e-12:kept.extend(ii[at:at+3])
            if len(kept)!=len(ii):prim['indices']=accessor(struct.pack('<'+code*len(kept),*kept),ia['componentType'],'SCALAR',len(kept),{'min':[min(kept)],'max':[max(kept)]})
    write_glb(path,doc,binary)
    return clipmeta,removed_bridges

def render_asset(path,workshop,row):
    import bpy
    from mathutils import Vector
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(path),merge_vertices=True)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=8;scene.render.threads_mode='FIXED';scene.render.threads=4
    scene.world=bpy.data.worlds.new('Animal review world');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.13,.15,.19,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
    helpers={b.custom_shape for ob in scene.objects if ob.type=='ARMATURE' for b in ob.pose.bones if b.custom_shape}
    obs=[o for o in scene.objects if o.type=='MESH' and o not in helpers];points=[o.matrix_world@v.co for o in obs for v in o.data.vertices];lo=Vector(tuple(min(p[k] for p in points) for k in range(3)));hi=Vector(tuple(max(p[k] for p in points) for k in range(3)));center=(lo+hi)*.5;size=max(hi-lo)
    bpy.ops.object.camera_add(location=center+Vector((size*1.9,-size*2.8,size*.95)));cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=size*1.9;scene.camera=cam
    bpy.ops.mesh.primitive_plane_add(size=size*3,location=(center.x,center.y,-.004));floor=bpy.context.object;floor.name='Private review ground';mat=bpy.data.materials.new('Review ground');mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.12,.14,.17,1);mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.9;floor.data.materials.append(mat)
    for loc,energy,scale in [(Vector((1,-2,3)),180,2.5),(Vector((-2,.8,1)),110,2),(Vector((0,2,2)),220,2)]:
        bpy.ops.object.light_add(type='AREA',location=center+loc*size);lamp=bpy.context.object;lamp.data.energy=energy*size*size;lamp.data.shape='DISK';lamp.data.size=size*scale;lamp.rotation_euler=(center-lamp.location).to_track_quat('-Z','Y').to_euler()
    scene.render.resolution_x=480;scene.render.resolution_y=360;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
    arms=[o for o in scene.objects if o.type=='ARMATURE'];assert arms,'export must import as real armature'
    arm=arms[0];actions=[a for a in bpy.data.actions if any(a.name.startswith(n) for n in ['Idle','Walk','Run','Call','Graze','Groom'])]
    arm.animation_data_create()
    for name,frame in [('Rest',0),('Walk',8),('Run',9),('Call',36),('Graze',60),('Groom',60)]:
        action=next((a for a in actions if a.name==name or a.name.startswith(name+'.')),None)
        if name!='Rest' and action is None:continue
        arm.animation_data.action=action
        if action and hasattr(action,'slots') and len(action.slots):arm.animation_data.action_slot=action.slots[0]
        scene.frame_set(frame);scene.render.filepath=str(workshop/(row['species']+'-'+row['id']+'-'+name+'.png'));bpy.ops.render.render(write_still=True)
    print('REVIEW_RENDER',row['id'],flush=True)

def prepare(args,row,config):
    import bpy,numpy as np,bmesh
    started=time.monotonic();source=args.inputs/row['sourceFilename'];source_bytes=source.read_bytes();source_sha=hashlib.sha256(source_bytes).hexdigest()
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(source),merge_vertices=True)
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert objects,'source has no mesh'
    # Every rendered mesh participates in the complete-model budget.
    for o in objects:
        bpy.context.view_layer.objects.active=o;o.select_set(True)
        if o.parent:o.matrix_world=o.matrix_world.copy();o.parent=None
        o.modifiers.clear()
        bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);o.select_set(False)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:bpy.ops.object.join()
    animal=bpy.context.object;animal.name=row['species']+'-'+row['id'];animal.parent=None
    pts=np.array([tuple(animal.matrix_world@v.co) for v in animal.data.vertices],dtype=np.float64);lo=pts.min(axis=0);hi=pts.max(axis=0);scale=row['height']/(hi[2]-lo[2]);center=(lo+hi)*.5
    pts=(pts-np.array([center[0],center[1],lo[2]]))*scale;animal.matrix_world.identity();animal.data.vertices.foreach_set('co',pts.astype(np.float32).ravel());animal.data.update()
    source_tris=sum(len(p.vertices)-2 for p in animal.data.polygons)
    if source_tris>config['targetTriangles']:
        protection=animal.vertex_groups.new(name='Source face antler paw tail detail')
        grouped=defaultdict(list)
        for v in animal.data.vertices:
            x,y,z=v.co;g=.05
            if z>row['height']*.73 or y<-float(hi[1]-lo[1])*scale*.25:g=.65
            if z<row['height']*.11:g=.45
            grouped[g].append(v.index)
        for value,indices in grouped.items():protection.add(indices,value,'REPLACE')
        ratio=config['targetTriangles']/source_tris
        for attempt in range(5):
            mod=animal.modifiers.new('Source UV-aware anatomical collapse','DECIMATE');mod.ratio=ratio;mod.use_collapse_triangulate=True;mod.vertex_group=protection.name;mod.vertex_group_factor=.45
            ev=animal.evaluated_get(bpy.context.evaluated_depsgraph_get());tris=sum(len(p.vertices)-2 for p in ev.data.polygons)
            if tris<=48000:bpy.ops.object.modifier_apply(modifier=mod.name);break
            animal.modifiers.remove(mod);ratio*=config['targetTriangles']/tris*.98
        else:raise RuntimeError('Unable to fit complete rendered model budget')
        group=animal.vertex_groups.get('Source face antler paw tail detail')
        if group:animal.vertex_groups.remove(group)
    bm=bmesh.new();bm.from_mesh(animal.data);flat=[f for f in bm.faces if f.calc_area()<1e-12]
    if flat:bmesh.ops.delete(bm,geom=flat,context='FACES')
    bm.to_mesh(animal.data);bm.free();animal.data.update()
    for p in animal.data.polygons:p.use_smooth=True
    # Existing materials, source images, UV islands and proportions survive reduction.
    contacts=None;component_labels={};contact_repair=None
    if row.get('sourceContactRepair'):contacts,component_labels,contact_repair=separate_source_contact(animal,row)
    pts=np.array([tuple(v.co) for v in animal.data.vertices],dtype=np.float64);gp=np.stack([pts[:,0],pts[:,2],-pts[:,1]],axis=1)
    rig=fit_rig(gp,row,contacts);rig['componentLabels']=component_labels;weights=relax_skin(animal.data,gp,skin_weights(gp,rig,row),rig,row)
    args.output.mkdir(parents=True,exist_ok=True);staging=args.workshop/'staging';staging.mkdir(parents=True,exist_ok=True);out=staging/(row['species']+'-'+row['id']+'.glb')
    bpy.ops.object.select_all(action='DESELECT');animal.select_set(True);bpy.context.view_layer.objects.active=animal
    bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=False,export_materials='EXPORT',export_image_format='AUTO',export_extras=False,export_yup=True,export_texcoords=True,export_normals=True,export_tangents=True)
    clips,removed_bridges=append_rig(out,rig,weights,gp,row);doc,data=read_glb(out)
    tris=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives']);assert tris<=config['triangleBudget']
    assert doc.get('skins') and all('JOINTS_0' in p['attributes'] and 'WEIGHTS_0' in p['attributes'] for m in doc['meshes'] for p in m['primitives'])
    assert len(doc.get('animations',[]))>=5
    final=args.output/out.name;out.replace(final);out=final
    entry={'id':row['id'],'species':row['species'],'filename':out.name,'sourceFilename':source.name,'sourceSha256':source_sha,'outputSha256':hashlib.sha256(out.read_bytes()).hexdigest(),'sourceTriangles':source_tris,'triangles':tris,'removedSourceGroundBridgeTriangles':removed_bridges,'bytes':out.stat().st_size,'height':row['height'],'bounds':{'min':list(gp.min(axis=0)),'max':list(gp.max(axis=0))},'sourceFacingVerified':'Blender -Y; glTF +Z','restPose':'seated' if rig['seated'] else 'standing','ikBendBranch':'fixed anatomical fore-backward / hind-forward','joints':{n:list(j) for n,j in zip(rig['names'],rig['joints'])},'pawBones':['frontPawL','frontPawR','hindPawL','hindPawR'],'clips':clips,'surface':'source textures/materials and UV islands retained; anatomical UV-aware mesh collapse','preparationSeconds':round(time.monotonic()-started,2)}
    if contact_repair:entry['sourceContactRepair']=contact_repair
    for key in ('runStyle','upperThighPelvisBlend'):
        if row.get(key):entry[key]=row[key]
    print('PREPARED',json.dumps({k:entry[k] for k in ('id','triangles','bytes','preparationSeconds')}),flush=True)
    if args.render:render_asset(out,args.workshop,row)
    return entry

def compact_glb(doc,binary):
    """Retain exact surface/skin bytes while removing superseded animation buffer data."""
    used=set()
    for mesh in doc['meshes']:
        for p in mesh['primitives']:
            used.update(p['attributes'].values());used.add(p['indices'])
    for skin in doc['skins']:used.add(skin['inverseBindMatrices'])
    for animation in doc['animations']:
        for sampler in animation['samplers']:used.update((sampler['input'],sampler['output']))
    ai={old:new for new,old in enumerate(sorted(used))};accessors=[doc['accessors'][old].copy() for old in sorted(used)]
    views={a['bufferView'] for a in accessors}|{im['bufferView'] for im in doc.get('images',[])};vi={old:new for new,old in enumerate(sorted(views))};data=bytearray();newviews=[]
    for old in sorted(views):
        v=doc['bufferViews'][old].copy();offset=v.get('byteOffset',0);length=v['byteLength'];data.extend(bytes((-len(data))%4));v['byteOffset']=len(data);data.extend(binary[offset:offset+length]);newviews.append(v)
    for a in accessors:a['bufferView']=vi[a['bufferView']]
    for mesh in doc['meshes']:
        for p in mesh['primitives']:
            p['attributes']={semantic:ai[index] for semantic,index in p['attributes'].items()};p['indices']=ai[p['indices']]
    for skin in doc['skins']:skin['inverseBindMatrices']=ai[skin['inverseBindMatrices']]
    for animation in doc['animations']:
        for sampler in animation['samplers']:sampler['input']=ai[sampler['input']];sampler['output']=ai[sampler['output']]
    for im in doc.get('images',[]):im['bufferView']=vi[im['bufferView']]
    doc['accessors']=accessors;doc['bufferViews']=newviews;return data

def animate_existing(args,row,entry):
    """Replace clips atomically; leave existing geometry, surfaces, bind joints and weights intact."""
    from mathutils import Vector,Quaternion
    path=args.output/entry['filename'];doc,binary=read_glb(path);skin=doc['skins'][0];nodes=skin['joints'];names=[doc['nodes'][i]['name'] for i in nodes];ix={n:i for i,n in enumerate(names)};nodeix={n:i for i,n in enumerate(nodes)};parents=[None]*len(nodes)
    for k,n in enumerate(nodes):
        for child in doc['nodes'][n].get('children',[]):
            if child in nodeix:parents[nodeix[child]]=k
    js=[Vector(entry['joints'][name]) for name in names];legs=[]
    for fore in ('front','hind'):
        for side in ('L','R'):
            nn=[fore+part+side for part in (('Shoulder','Elbow','Wrist','Paw') if fore=='front' else ('Hip','Knee','Hock','Paw'))];ids=[ix[n] for n in nn];legs.append({'key':fore+side,'fore':fore=='front','indices':ids,'foot':list(js[ids[-1]]),'soleY':0,'legLength':(js[ids[1]]-js[ids[0]]).length+(js[ids[2]]-js[ids[1]]).length})
    def decode(index):
        a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];off=v.get('byteOffset',0)+a.get('byteOffset',0);parts={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];stride=v.get('byteStride',parts*4);return [struct.unpack_from('<'+'f'*parts,binary,off+i*stride) for i in range(a['count'])]
    walk=next((a for a in doc['animations'] if a['name']=='Walk'),None)
    if walk:
        channels={}
        for c in walk['channels']:
            channels[(nodeix[c['target']['node']],c['target']['path'])]=decode(walk['samplers'][c['sampler']]['output'])
        count=len(next(iter(channels.values())));minimum=[1e9]*4
        for frame in range(count):
            gp=[];gq=[]
            for k in range(len(nodes)):
                p=parents[k];qv=channels.get((k,'rotation'));q=Quaternion((qv[frame][3],*qv[frame][:3])) if qv else Quaternion((1,0,0,0));translation=Vector(channels[(k,'translation')][frame]) if (k,'translation') in channels else js[k]-(js[p] if p is not None else Vector((0,0,0)))
                gp.append(gp[p]+gq[p]@translation if p is not None else translation);gq.append(gq[p]@q if p is not None else q)
            for i,leg in enumerate(legs):minimum[i]=min(minimum[i],gp[leg['indices'][-1]].y)
        for leg,y in zip(legs,minimum):leg['soleY']=max(0,js[leg['indices'][-1]].y-y)
    rig={'names':names,'parents':parents,'joints':js,'legs':legs,'length':entry['bounds']['max'][2]-entry['bounds']['min'][2],'width':entry['bounds']['max'][0]-entry['bounds']['min'][0],'frontZ':js[ix['chest']].z,'rearZ':js[ix['hips']].z,'frontX':js[ix['chest']].x,'rearX':js[ix['hips']].x,'seated':entry['restPose']=='seated'}
    def accessor(raw,typ,count,bounds=None):
        binary.extend(bytes((-len(binary))%4));vi=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(raw)});binary.extend(raw);ai=len(doc['accessors']);a={'bufferView':vi,'componentType':5126,'type':typ,'count':count};a.update(bounds or {});doc['accessors'].append(a);return ai
    animations=[];clips=[]
    for old in entry['clips']:
        clip=make_animation(rig,row,old['name'],old);samples=clip.pop('samples');count=len(samples);time=accessor(struct.pack('<'+'f'*count,*[a[0] for a in samples]),'SCALAR',count,{'min':[0],'max':[clip['duration']]});animation={'name':clip['name'],'extras':{'referenceSpeed':clip['referenceSpeed'],'rootMotion':False},'channels':[],'samplers':[]}
        def channel(k,property,values,typ,parts):
            output=accessor(struct.pack('<'+'f'*(count*parts),*values),typ,count);si=len(animation['samplers']);animation['samplers'].append({'input':time,'output':output,'interpolation':'LINEAR'});animation['channels'].append({'sampler':si,'target':{'node':nodes[k],'path':property}})
        channel(0,'translation',[v for t,p,q in samples for v in p],'VEC3',3)
        for k in range(len(names)):channel(k,'rotation',[v for t,p,q in samples for v in q[k]],'VEC4',4)
        clip.update({'rootMotion':False,'loopable':old['loopable']});animations.append(animation);clips.append(clip)
    doc['animations']=animations;doc['asset']['generator']='Tervain Blender anatomical quadruped preparation 1 / stable anatomical IK branch'
    doc['scenes'][doc.get('scene',0)]['extras']['animal']['motionSpeeds']={c['name']:c['referenceSpeed'] for c in clips if c['name'] in ('Walk','Run')};binary=compact_glb(doc,binary)
    staging=args.workshop/'staging';staging.mkdir(parents=True,exist_ok=True);temp=staging/path.name;write_glb(temp,doc,binary);temp.replace(path);entry=dict(entry);entry.update({'clips':clips,'outputSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'ikBendBranch':'fixed anatomical fore-backward / hind-forward'})
    print('ANIMATIONS_REENCODED',row['id'],flush=True)
    if args.render:render_asset(path,args.workshop,row)
    return entry

def main():
    base=pathlib.Path(__file__).resolve().parents[1];parser=argparse.ArgumentParser();parser.add_argument('--inputs',type=pathlib.Path,required=True);parser.add_argument('--workshop',type=pathlib.Path,required=True);parser.add_argument('--output',type=pathlib.Path,default=base/'public/models/animals');parser.add_argument('--metadata',type=pathlib.Path,default=base/'docs/engineering/meshy-animal-assets.json');parser.add_argument('--only');parser.add_argument('--render',action='store_true');parser.add_argument('--render-only',action='store_true');parser.add_argument('--animate-only',action='store_true');args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);args.workshop.mkdir(parents=True,exist_ok=True)
    config=json.loads((base/'tools/meshy-animal-sources.json').read_text());selected=set(args.only.split(',')) if args.only else None;rows=[r for r in config['animals'] if selected is None or r['id'] in selected]
    metadata=args.metadata;old=json.loads(metadata.read_text()) if metadata.exists() else {'schemaVersion':1,'coordinateContract':config['coordinateContract'],'triangleBudget':config['triangleBudget'],'animals':[]};entries={r['id']:r for r in old['animals']}
    for row in rows:
        if args.render_only:render_asset(args.output/(row['species']+'-'+row['id']+'.glb'),args.workshop,row)
        else:
            entries[row['id']]=animate_existing(args,row,entries[row['id']]) if args.animate_only else prepare(args,row,config);old['animals']=[entries[r['id']] for r in config['animals'] if r['id'] in entries];old['totalTriangles']=sum(r['triangles'] for r in old['animals']);metadata.parent.mkdir(parents=True,exist_ok=True);temporary=metadata.with_suffix('.json.tmp');temporary.write_text(json.dumps(old,indent=2)+'\n');temporary.replace(metadata)
    print('ANIMAL_PREPARATION_COMPLETE',len(rows),flush=True)
if __name__=='__main__':main()
