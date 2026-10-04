# SPDX-License-Identifier: GPL-3.0-only
"""Export original local Hero skin and XMOT clips to glTF 2.0 GLB + raw JSON.

Python 3.10+, standard library only. Reads the completed Gothic 3 study and
existing verified static textures; writes only public/gothic3/animated. No game
executable, remote operation, fixture or unrelated test suite is run.
"""
import argparse
import hashlib
import json
import math
import struct
from pathlib import Path
from read_xact_skin import read_actor, read_motion
from native_animation_math import (cleaned_rig, column_major, inverse, matrix,
    multiply, normal, point, rotation, translation)


REPO = Path(__file__).resolve().parents[2]
PARTS = [('body','G3_Hero_Body_Player.xact'),('head','G3_Head_Hero_Hero_01.xact')]
CLIPS = [
    ('idle',None,'Hero_Stand_None_None_P0_Ambient_Loop_N_Fwd_00_%_02_P0_0.xmot'),
    ('idle',None,'Hero_Stand_None_None_P0_Ambient_Loop_N_Fwd_01_%_00_P0_0.xmot'),
    ('idle',None,'Hero_Stand_None_None_P0_Ambient_Loop_N_Fwd_02_%_00_P0_0.xmot'),
    ('walk',None,'Hero_Stand_None_None_P0_Move_Walk_N_Fwd_00_%_00_P0_160.xmot'),
    ('run',None,'Hero_Stand_None_None_P0_Move_Run_N_Fwd_00_%_00_P0_400.xmot'),
    ('attack','raise','Hero_Stand_None_Fist_P0_Attack_Raise_N_Fwd_00_%_00_P0_0_R.xmot'),
    ('attack','hit','Hero_Stand_None_Fist_P0_Attack_Hit_N_Fwd_00_%_00_P1_100_R.xmot'),
    ('attack','recover','Hero_Stand_None_Fist_P0_Attack_Recover_N_Fwd_00_%_00_P0_0_L.xmot'),
    ('powerAttack','raise','Hero_Stand_None_Fist_P0_PowerAttack_Raise_N_Fwd_00_%_00_P0_0_R.xmot'),
    ('powerAttack','hit','Hero_Stand_None_Fist_P0_PowerAttack_Hit_N_Fwd_00_%_00_P1_100_R.xmot'),
    ('powerAttack','recover','Hero_Stand_None_Fist_P0_PowerAttack_Recover_N_Fwd_00_%_00_P0_0_L.xmot'),
]
FORMAT_REFERENCES = {
    'g3dit':{'repository':'https://github.com/georgeto/g3dit','commit':'30113b8254d3e6d0395d8e3c78618a99fbc0a6ca',
        'paths':['LrentNode/src/main/java/de/george/lrentnode/archive/animation/Chunks.java',
                 'LrentNode/src/main/java/de/george/lrentnode/archive/animation/eCResourceAnimationActor_PS.java',
                 'LrentNode/src/main/java/de/george/lrentnode/archive/animation/eCResourceAnimationMotion_PS.java']},
    'rmtools':{'repository':'https://github.com/Baltram/rmtools','commit':'5525421bf4b22636259bdc0d250ee96a5abcae66',
        'paths':['mimicry/source/Mimicry/mi_xactreader.cpp','mimicry/source/Mimicry/mi_matrix4.cpp',
                 'mimicry/source/Mimicry/mi_coordshifter.cpp','mimicry/source/Mimicry/mi_objwriter.cpp']},
}
NATIVE_REFERENCES = [
    {'module':'Engine.dll','entry':'3002f955','function':'eCWrapper_emfx2Actor::CleanUpHierachy',
     'file':'01_Decompiled_Code/Engine_dll/pseudocode/functions_00050.c','line':4108,
     'meaning':'Remove named _ROOT/_END helper children with >=3 underscore words; bake helper local matrix into promoted children.'},
    {'module':'Engine.dll','entry':'3001d039','function':'eCWrapper_emfx2Actor::Read',
     'file':'01_Decompiled_Code/Engine_dll/pseudocode/functions_00030.c','line':10635,
     'meaning':'Original actor loading calls CleanUpHierachy after the EMotionFX importer.'},
    {'module':'Engine.dll','entry':'300cff40','function':'native row matrix multiplication',
     'file':'01_Decompiled_Code/Engine_dll/pseudocode/functions_00083.c','line':116,
     'meaning':'Cleanup childRow * helperRow equals helperCol * childCol after transposition.'},
    {'module':'Engine.dll','entry':'3064fab0','function':'EMotionFX::SkeletalMotionInstance::vfunction3',
     'file':'01_Decompiled_Code/Engine_dll/pseudocode/functions_00167.c','line':317,
     'meaning':'Missing keyed P/R/S channels use MotionPart pose defaults; not serialized bindPose fields.'},
    {'module':'Engine.dll','entry':'3065d680','function':'EMotionFX::MotionPartChunkProcessor3::vfunction2',
     'file':'01_Decompiled_Code/Engine_dll/pseudocode/functions_00167.c','line':10962,
     'meaning':'Read native pose+bind fields, copy pose into motion-part fallback fields without q inversion.'},
    {'module':'Engine.dll','entry':'3064df00','function':'native quaternion LinearInterpolator',
     'file':'01_Decompiled_Code/Engine_dll/pseudocode/functions_00166.c','line':16461,
     'meaning':'Native runtime blends compressed quaternion components linearly; glTF LINEAR quaternion sampling uses slerp.'},
]


def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def json_bytes(value): return (json.dumps(value,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n').encode('utf8')
def normalized_material(name): return name.replace(' ','_').replace('\t','_').rstrip('|')


class GLB:
    def __init__(self):
        self.binary = bytearray()
        self.doc = {'asset':{'version':'2.0','generator':'Tervain native Gothic 3 XACT/XMOT export'},
                    'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'Gothic3_Hero','children':[]}],
                    'meshes':[],'skins':[],'materials':[],'images':[],'textures':[],
                    'samplers':[{'wrapS':10497,'wrapT':10497,'magFilter':9729,'minFilter':9987}],
                    'animations':[],'bufferViews':[],'accessors':[],'buffers':[]}

    def accessor(self,values,typ,component=5126,target=None,bounds=False):
        components={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[typ]
        if not values: raise ValueError('empty glTF accessor')
        flat=values if typ=='SCALAR' else [v for row in values for v in row]
        if len(flat)!=len(values)*components: raise ValueError('accessor shape mismatch')
        while len(self.binary)%4: self.binary.append(0)
        offset=len(self.binary); code={5126:'f',5123:'H',5125:'I'}[component]
        self.binary.extend(struct.pack('<'+code*len(flat),*flat))
        view={'buffer':0,'byteOffset':offset,'byteLength':len(self.binary)-offset}
        if target: view['target']=target
        vi=len(self.doc['bufferViews']); self.doc['bufferViews'].append(view)
        a={'bufferView':vi,'componentType':component,'count':len(values),'type':typ}
        if bounds:
            a['min']=[min(flat[i::components]) for i in range(components)]
            a['max']=[max(flat[i::components]) for i in range(components)]
        ai=len(self.doc['accessors']); self.doc['accessors'].append(a)
        return ai

    def channel(self,animation,node,path,times,values):
        if len(times)!=len(values) or not times or any(a>=b for a,b in zip(times,times[1:])):
            raise ValueError('invalid portable animation key times')
        ti=self.accessor(times,'SCALAR',bounds=True)
        vi=self.accessor(values,'VEC4' if path=='rotation' else 'VEC3')
        si=len(animation['samplers']); animation['samplers'].append({'input':ti,'output':vi,'interpolation':'LINEAR'})
        animation['channels'].append({'sampler':si,'target':{'node':node,'path':path}})

    def bytes(self):
        self.doc['buffers']=[{'byteLength':len(self.binary)}]
        j=json_bytes(self.doc); j+=b' '*((-len(j))%4)
        b=bytes(self.binary); b+=b'\0'*((-len(b))%4)
        total=12+8+len(j)+8+len(b)
        return struct.pack('<III',0x46546C67,2,total)+struct.pack('<II',len(j),0x4E4F534A)+j+struct.pack('<II',len(b),0x004E4942)+b


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--study',type=Path,required=True)
    args=ap.parse_args(); study=args.study.resolve()
    out=REPO/'public/gothic3/animated'; static=REPO/'public/gothic3'
    if out==study or out.is_relative_to(study): raise ValueError('output overlaps read-only study')
    effective=study/'02_Unpacked_Data/_metadata/effective_layers.json'
    entries=json.loads(effective.read_text(encoding='utf8'))['files']; by_name={}
    for e in entries: by_name.setdefault(Path(e['logical_path']).name.lower(),[]).append(e)
    inputs={}; dependencies={}; outputs={}
    static_manifest_path=static/'source-manifest.json'
    static_manifest=json.loads(static_manifest_path.read_text(encoding='utf8'))
    scene=json.loads((static/'scene.json').read_text(encoding='utf8'))

    def source(name):
        candidates=by_name.get(name.lower(),[])
        if len(candidates)!=1: raise ValueError(f'nonunique effective asset: {name}')
        e=candidates[0]; p=(study/e['candidate_effective_output']).resolve()
        if not p.is_relative_to(study): raise ValueError('source outside study')
        if digest(p)!=e['sha256']: raise ValueError(f'source SHA mismatch {name}')
        label=e['candidate_effective_archive']+' :: '+e['logical_path']
        inputs[label]={'archive':e['candidate_effective_archive'],'path':e['logical_path'],
                       'sha256':e['sha256'],'bytes':p.stat().st_size}
        return p,label

    def dependency(relative):
        p=(static/relative).resolve()
        if not p.is_relative_to(static): raise ValueError('nonportable static dependency')
        receipt=static_manifest['outputs'].get(relative)
        if not receipt or digest(p)!=receipt['sha256'] or p.stat().st_size!=receipt['bytes']:
            raise ValueError(f'static dependency SHA mismatch: {relative}')
        dependencies[relative]=dict(receipt)
        return p

    actors=[]; rigs=[]; globals_by_part=[]; removed_by_part=[]
    for ident,name in PARTS:
        p,label=source(name); decoded=read_actor(p)
        if decoded['lods']: raise ValueError('selected Hero LOD selection must be explicit')
        actor=decoded['actor']; clean,globals_,removed=cleaned_rig(actor)
        actors.append({'id':ident,'source':label,'decoded':decoded})
        rigs.append(clean); globals_by_part.append(globals_); removed_by_part.append(removed)
    shared=[]; by_shared={}; shared_audit={'commonNodes':0,'maxPositionDifferenceMetres':0,'maxQuaternionComponentDifference':0}
    for rig in rigs:
        for n in rig:
            old=by_shared.get(n['name'])
            if old:
                if old['parent']!=n['parent']: raise ValueError('part skeleton parent disagreement')
                dt=max(abs(x-y) for x,y in zip(old['translation'],n['translation']))
                dq=min(max(abs(x-y) for x,y in zip(old['rotation'],n['rotation'])),
                       max(abs(x+y) for x,y in zip(old['rotation'],n['rotation'])))
                if dt>2e-6 or dq>2e-6: raise ValueError('part skeleton bind disagreement beyond float tolerance')
                shared_audit['commonNodes']+=1
                shared_audit['maxPositionDifferenceMetres']=max(shared_audit['maxPositionDifferenceMetres'],dt)
                shared_audit['maxQuaternionComponentDifference']=max(shared_audit['maxQuaternionComponentDifference'],dq)
            else:
                by_shared[n['name']]=n; shared.append(n)
    glb=GLB(); bone_index={n['name']:i+1 for i,n in enumerate(shared)}
    joint_index={n['name']:i for i,n in enumerate(shared)}
    for n in shared:
        glb.doc['nodes'].append({'name':n['name'],'translation':n['translation'],'rotation':n['rotation'],
                                'scale':[1,1,1],'children':[],
                                'extras':{'nativeSourceIndex':n['sourceIndex'],'removedAncestors':n['removedAncestors']}})
    for n in shared:
        parent=bone_index[n['parent']] if n['parent'] else 0
        glb.doc['nodes'][parent]['children'].append(bone_index[n['name']])
    shared_globals={}
    def shared_global(name):
        if name not in shared_globals:
            n=by_shared[name]; m=matrix(n['translation'],n['rotation'])
            shared_globals[name]=multiply(shared_global(n['parent']),m) if n['parent'] else m
        return shared_globals[name]
    for n in shared: shared_global(n['name'])
    material_cache={}; texture_cache={}; part_summaries=[]; native_part_data=[]; max_rest_error=0

    def material(part,actor,index):
        model_key=Path(PARTS[part][1]).stem+'_S00'; record=scene['models'][model_key]
        mtl=dependency(record['mtl']); native=actor['materials'][index]
        name=native['name'].replace(' ','_').replace('\t','_')
        normalized=normalized_material(native['name'])
        metadata=record.get('materials',{}).get(normalized)
        if not metadata: raise ValueError(f'no verified native material metadata {name}')
        maps={}; active=None
        for line in mtl.read_text(encoding='utf8').splitlines():
            if line.startswith('newmtl '): active=line[7:].strip()
            elif line.startswith('map_Kd ') and active: maps[active]=line[7:].strip()
        image_path=maps.get(name)
        if not image_path: raise ValueError(f'no verified diffuse texture {name}')
        image=(mtl.parent/image_path).resolve(); relative=image.relative_to(static).as_posix(); dependency(relative)
        for ref in actor['materialReferences']:
            if ref['material']==index and ref['lod']==0:
                _,shader_label=source(Path(ref['name'].replace('\\','/')).name)
                if metadata['source']!=shader_label: raise ValueError('native shader metadata source mismatch')
        key=(name,relative)
        if key not in material_cache:
            if relative not in texture_cache:
                ti=len(glb.doc['textures']); ii=len(glb.doc['images'])
                glb.doc['images'].append({'uri':'../'+relative})
                glb.doc['textures'].append({'source':ii,'sampler':0}); texture_cache[relative]=ti
            gm={'name':name,'pbrMetallicRoughness':{'baseColorTexture':{'index':texture_cache[relative]},
                    'metallicFactor':0,'roughnessFactor':0.85},'doubleSided':native['doubleSided'],
                'extras':{'gothic3Shader':metadata,'nativeFXAMaterial':native}}
            mode=metadata['blendMode']
            if mode==0: gm['alphaMode']='OPAQUE'
            elif mode==1:
                gm['alphaMode']='MASK'; gm['alphaCutoff']=max(metadata['maskReference']/255,1e-7)
            elif mode==2: gm['alphaMode']='BLEND'
            else: raise ValueError(f'unsupported native shader blend mode {mode}')
            material_cache[key]=len(glb.doc['materials']); glb.doc['materials'].append(gm)
        return material_cache[key]

    for pi,entry in enumerate(actors):
        actor=entry['decoded']['actor']; nodes=actor['nodes']; global_=globals_by_part[pi]
        ibm=[]
        for n in shared:
            # A part only weights its own nodes. Extra nodes in the shared union
            # receive the canonical inverse; native part joints retain their own.
            ibm.append(column_major(inverse(global_.get(n['name'],shared_globals[n['name']]))))
        sk=len(glb.doc['skins']); glb.doc['skins'].append({'name':'Hero_'+entry['id'],
            'joints':[bone_index[n['name']] for n in shared],
            'skeleton':bone_index['Hero_ROOT'],'inverseBindMatrices':glb.accessor(ibm,'MAT4'),
            'extras':{'nativeSource':entry['source'],'partSpecificInverseBinds':True}})
        skin_by_node={s['nodeIndex']:s for s in actor['skins']}; total_sets=0; primitive_count=0
        primitive_maps=[]
        for mi,mesh in enumerate(actor['meshes']):
            if mesh['collision']: continue
            skin=skin_by_node.get(mesh['nodeIndex'])
            if not skin: raise ValueError('selected Hero mesh has no native skin')
            maximum=max(len(row) for row in skin['influences']); sets=(maximum+3)//4
            total_sets=max(total_sets,sets); primitives=[]
            for si,sub in enumerate(mesh['submeshes']):
                if not sub['indices']: continue
                vertices=sub['vertices']; positions=[translation(v['position']) for v in vertices]
                attrs={'POSITION':glb.accessor(positions,'VEC3',target=34962,bounds=True),
                       'NORMAL':glb.accessor([normal(v['normal']) for v in vertices],'VEC3',target=34962)}
                for uv in range(mesh['uvSets']):
                    # Native Direct3D and glTF both address the image top-left.
                    # Rimy OBJ negates v; ordinary OBJ Texture.flipY=true then
                    # cancels that reflection modulo repeat. GLTFLoader sets
                    # flipY=false, so preserve native UV rather than invert it.
                    attrs['TEXCOORD_'+str(uv)]=glb.accessor([v['uv'][uv] for v in vertices],'VEC2',target=34962)
                rows=[]
                for v,pos in zip(vertices,positions):
                    row=skin['influences'][v['original']]
                    mapped=[(joint_index[nodes[i['node']]['name']],i['weight']) for i in row]
                    rows.append(mapped+[(0,0)]*(sets*4-len(mapped)))
                    rest=[0.,0.,0.]
                    for influence in row:
                        name=nodes[influence['node']]['name']
                        delta=multiply(shared_globals[name],inverse(global_[name]))
                        p=point(delta,pos)
                        for k in range(3): rest[k]+=p[k]*influence['weight']
                    max_rest_error=max(max_rest_error,max(abs(x-y) for x,y in zip(rest,pos)))
                for s in range(sets):
                    joints=[[j for j,w in row[s*4:s*4+4]] for row in rows]
                    weights=[[w for j,w in row[s*4:s*4+4]] for row in rows]
                    attrs['JOINTS_'+str(s)]=glb.accessor(joints,'VEC4',component=5123,target=34962)
                    attrs['WEIGHTS_'+str(s)]=glb.accessor(weights,'VEC4',target=34962)
                    if s==0:
                        # DISTINCT bufferView: GLTFLoader normalizes set0 in
                        # place, incorrectly ignoring later sets. Restore from
                        # this untouched custom copy before native all-set use.
                        attrs['_G3_WEIGHTS_0']=glb.accessor(weights,'VEC4',target=34962)
                indices=[]
                for i in range(0,len(sub['indices']),3): indices.extend(reversed(sub['indices'][i:i+3]))
                primitives.append({'attributes':attrs,'indices':glb.accessor(indices,'SCALAR',component=5125,target=34963),
                    'material':material(pi,actor,sub['material']),
                    'extras':{'nativeOriginalVertexCount':mesh['originalVertices'],'skinAttributeSets':sets,
                              'nativeMaxInfluences':maximum,'nativeSourceMeshNode':nodes[mesh['nodeIndex']]['name']}})
                primitive_maps.append({'mesh':mi,'submesh':si,'originalVertexIndices':[v['original'] for v in vertices],
                                       'skinAttributeSets':sets})
                primitive_count+=1
            mesh_index=len(glb.doc['meshes']); glb.doc['meshes'].append({'name':'Hero_'+entry['id'],'primitives':primitives})
            ni=len(glb.doc['nodes']); glb.doc['nodes'].append({'name':'Hero_'+entry['id']+'_SkinnedMesh','mesh':mesh_index,'skin':sk})
            glb.doc['nodes'][0]['children'].append(ni)
        part_summaries.append({'name':entry['id'],'source':entry['source'],**actor['audit'],
                              'joints':len(shared),'cleanedNativeNodes':len(rigs[pi]),
                              'removedHelpers':len(removed_by_part[pi]),'skinAttributeSets':total_sets,
                              'primitives':primitive_count})
        native_part_data.append({'id':entry['id'],'source':entry['source'],'decoded':entry['decoded'],
            'cleanedRig':rigs[pi],'removedHelpers':removed_by_part[pi],
            'globalBindMatricesColumnMajor':{n:column_major(m) for n,m in global_.items()},
            'portableVertexMappings':primitive_maps})

    clips=[]; native_motions=[]
    for role,phase,name in CLIPS:
        p,label=source(name); motion=read_motion(p); audit=motion['audit']; duration=audit['duration']
        if audit['interpolations']!=['L'] or audit['unknownChunks']: raise ValueError('motion needs unsupported native interpolation/chunk handling')
        parts={p['name']:p for p in motion['parts']}
        anim={'name':Path(name).stem,'samplers':[],'channels':[],
              'extras':{'nativeSource':label,'role':role,'phase':phase,
                        'nativeQuaternionInterpolation':'component-linear; GLB LINEAR uses slerp',
                        'serializedMotionBindPoseUsed':False}}
        matched=[]; constant_channels=0
        for node in shared:
            part=parts.get(node['name']); tracks={t['type']:t for t in part['tracks']} if part else {}
            pose=part['pose'] if part else None
            for typ,path in [('P','translation'),('R','rotation'),('S','scale')]:
                track=tracks.get(typ)
                if track and track['keys']:
                    times=[k['time'] for k in track['keys']]; values=[k['value'] for k in track['keys']]
                else:
                    fallback=pose[{'P':'position','R':'rotation','S':'scale'}[typ]] if pose else node[path]
                    if not pose:
                        values=[fallback,fallback]; times=[0,duration]
                        glb.channel(anim,bone_index[node['name']],path,times,values)
                        constant_channels+=1; continue
                    values=[fallback,fallback]; times=[0,duration]; constant_channels+=1
                if typ=='P': values=[translation(v) for v in values]
                elif typ=='R':
                    values=[rotation(v) for v in values]
                    # q and -q are equivalent; preserve native shortest-sign
                    # continuity rather than introducing an artificial spin.
                    for i in range(1,len(values)):
                        if sum(x*y for x,y in zip(values[i-1],values[i])) < 0:
                            values[i]=[-v for v in values[i]]
                elif any(max(abs(x-1) for x in v)>1e-4 for v in values):
                    raise ValueError('native non-unit animated scale requires affine support')
                glb.channel(anim,bone_index[node['name']],path,times,values)
            if part: matched.append(node['name'])
        unmatched=sorted(set(parts)-set(bone_index))
        root=parts.get('Hero_ROOT'); root_tracks=root['tracks'] if root else []
        root_summary={'node':'Hero_ROOT','keyedTypes':[t['type'] for t in root_tracks],
                      'translationKeys':next((t['keys'] for t in root_tracks if t['type']=='P'),[]),
                      'controllerSpeedFromFilenameCmPerSec':int(name.rsplit('_P0_',1)[1].split('.')[0])
                          if role in ('walk','run') else None,
                      'note':'Filename speed token retained as native naming metadata; browser movement controller is separate.'}
        clips.append({'name':anim['name'],'role':role,'phase':phase,'duration':duration,'source':label,
                      **{k:audit[k] for k in ('parts','tracks','keyframes','interpolations')},
                      'matchedParts':len(matched),'unmatchedParts':unmatched,
                      'portableChannels':len(anim['channels']),'constantPoseChannels':constant_channels,
                      'rootMotion':root_summary})
        native_motions.append({'name':anim['name'],'role':role,'phase':phase,'source':label,'decoded':motion,
            'matchedParts':matched,'unmatchedParts':unmatched,
            'bindPoseFieldsUsable':False,
            'bindPoseNote':'Serialized bind fields in these original motion parts contain non-unit near-zero/pointer-like values. Original update uses pose fallback; XACT bind matrices supply skin IBMs.'})
        glb.doc['animations'].append(anim)

    if max_rest_error>3e-6: raise ValueError(f'shared part native bind disagreement creates >3 micrometre rest error: {max_rest_error}')
    # All required native source and support evidence are hashed before writing.
    for r in NATIVE_REFERENCES:
        r['sha256']=digest(study/r['file'])
    limits=[
        'This is the native Hero skin and selected original clips, not a complete Gothic 3 gameplay implementation.',
        'All native weights are preserved, including 17 influences. A renderer using only JOINTS_0/WEIGHTS_0 is incorrect; use all declared sets and restore first-set weights from _G3_WEIGHTS_0.',
        'glTF LINEAR quaternion sampling uses spherical interpolation; the original engine component-interpolates compressed quaternion values. Raw original tracks are retained for a native runtime evaluator.',
        'Selected XACT scales are canonicalized to unit within <=1e-5 native float serialization noise; scale orientation and shear remain in raw metadata. General non-unit or sheared rigs are rejected.',
        'Original native diffuse images are reused. Browser PBR material response does not reproduce the complete original Genome shader graph.',
        'Unmatched original motion parts are authoring/other-actor objects; their data is preserved, and they do not animate nonexistent Hero nodes.',
        'Attack raise/hit/recover remain distinct source clips; combat timing, hit traces and gameplay state transitions are separate native systems.',
    ]
    coordinate={'nativeUnits':'centimetres','portableUnits':'metres','position':'[x/100,y/100,-z/100]',
        'quaternion':'normalize([-x,-y,z,w]); raw XACT q is not inverted again',
        'matrixOrder':'column vectors; parent * local','winding':'reverse each source triangle',
        'uv':'native [u,v]; image origin top-left as in glTF 2.0, textures flipY=false',
        'cleanup':'native _ROOT/_END child helpers with >=3 underscore words removed; composed local binds preserved',
        'sharedBones':'body preferred only after common parent/transform audit; each part has its own native inverse bind matrices'}
    native={'version':1,'nativeUnits':'centimetres','coordinateConvention':coordinate,
        'parts':native_part_data,'sharedCleanedRig':shared,'motions':native_motions,
        'formatReferences':FORMAT_REFERENCES,'nativeReferences':NATIVE_REFERENCES,'limitations':limits}
    out.mkdir(parents=True,exist_ok=True)
    def save(name,data):
        p=out/name; p.write_bytes(data); outputs['animated/'+name]={'sha256':digest(p),'bytes':p.stat().st_size}
    save('hero.glb',glb.bytes()); save('hero-native.json',json_bytes(native))
    manifest={'version':1,'units':'metres','assets':[{'id':'hero','glb':'animated/hero.glb',
        'native':'animated/hero-native.json','parts':part_summaries,'clips':clips,
        'skeleton':{'joints':len(shared),'root':'Hero_ROOT','partSpecificInverseBinds':True}}],
        'inputs':inputs,'dependencies':dependencies,'outputs':outputs,
        'staticManifestSHA256':digest(static_manifest_path),'effectiveLayerIndexSHA256':digest(effective),
        'coordinateConvention':coordinate,'formatReferences':FORMAT_REFERENCES,'nativeReferences':NATIVE_REFERENCES,
        'limitations':limits,'audit':{'sharedSkeleton':shared_audit,'maximumSkinnedRestErrorMetres':max_rest_error,
            'nativeInputFiles':len(inputs),'staticDependencies':len(dependencies),'outputFiles':len(outputs),
            'triangles':sum(p['triangles'] for p in part_summaries),'vertices':sum(p['splitVertices'] for p in part_summaries),
            'clips':len(clips),'nativeKeyframes':sum(c['keyframes'] for c in clips),
            'nativeByteBoundariesVerified':True,'allNativeWeightsPreserved':True,
            'threeFirstWeightSetBackupDistinctBufferView':True}}
    (out/'manifest.json').write_bytes(json_bytes(manifest))
    print(json.dumps({'manifest':str(out/'manifest.json'),'sha256':digest(out/'manifest.json'),
                      'audit':manifest['audit'],'parts':part_summaries,'outputBytes':sum(v['bytes'] for v in outputs.values())},indent=2))


if __name__=='__main__': main()
