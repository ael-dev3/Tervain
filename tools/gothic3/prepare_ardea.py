# SPDX-License-Identifier: GPL-3.0-only
"""Prepare a browser Ardea study from a read-only extracted local installation.

Usage: python tools/gothic3/prepare_ardea.py --study STUDY --rimy RIMY3D_EXE
Outputs only public/gothic3 and a caller-specified scratch folder. No game code
is executed. The source installation and completed desktop study are not edited.
See README.md for provenance, source-format references and the fidelity limits.
"""
import argparse
import hashlib
import json
import math
import re
import shutil
import struct
import subprocess
from pathlib import Path
from PIL import Image
from read_genome import read_entities
from read_xcmsh import read_mesh, mesh_bounds, obj_text
from read_xshmat import read_material, switched_image


ORIGIN = [92000, 5200, -12000]
REPO = Path(__file__).resolve().parents[2]


def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def position(v): return [(v[0]-ORIGIN[0])/100, (v[1]-ORIGIN[1])/100, -(v[2]-ORIGIN[2])/100]
def source_label(e): return e['candidate_effective_archive']+' :: '+e['logical_path']
def compact(v): return [round(x,6) for x in v]


def transform(m):
    scales = [math.sqrt(sum(m[i+j]**2 for j in range(3))) for i in (0,4,8)]
    # Column-major S*M*S, S=diag(1,1,-1), native left-handed to WebGL.
    a = [m[0]/scales[0], m[4]/scales[1], -m[8]/scales[2],
         m[1]/scales[0], m[5]/scales[1], -m[9]/scales[2],
         -m[2]/scales[0], -m[6]/scales[1], m[10]/scales[2]]
    trace = a[0]+a[4]+a[8]
    if trace > 0:
        s = math.sqrt(trace+1)*2; q = [(a[7]-a[5])/s,(a[2]-a[6])/s,(a[3]-a[1])/s,s/4]
    elif a[0]>a[4] and a[0]>a[8]:
        s=math.sqrt(1+a[0]-a[4]-a[8])*2; q=[s/4,(a[1]+a[3])/s,(a[2]+a[6])/s,(a[7]-a[5])/s]
    elif a[4]>a[8]:
        s=math.sqrt(1+a[4]-a[0]-a[8])*2; q=[(a[1]+a[3])/s,s/4,(a[5]+a[7])/s,(a[2]-a[6])/s]
    else:
        s=math.sqrt(1+a[8]-a[0]-a[4])*2; q=[(a[2]+a[6])/s,(a[5]+a[7])/s,s/4,(a[3]-a[1])/s]
    return compact(position(m[12:15])), compact(q), compact(scales)


def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--study',type=Path,required=True)
    ap.add_argument('--rimy',type=Path,required=True); ap.add_argument('--scratch',type=Path,required=True)
    args=ap.parse_args()
    study=args.study.resolve(); scratch=args.scratch.resolve()
    out=REPO/'public'/'gothic3'; models_dir=out/'models'; textures_dir=out/'textures'
    old_manifest=out/'source-manifest.json'
    previous_outputs=json.loads(old_manifest.read_text(encoding='utf8'))['outputs'] if old_manifest.exists() else {}
    if scratch==study or scratch.is_relative_to(study): raise ValueError('scratch must be outside read-only study')
    for p in (scratch,models_dir,textures_dir): p.mkdir(parents=True,exist_ok=True)
    layers=json.loads((study/'02_Unpacked_Data/_metadata/effective_layers.json').read_text(encoding='utf8'))['files']
    by_name={}; material_aliases={}
    for e in layers:
        by_name.setdefault(Path(e['logical_path']).name.lower(),[]).append(e)
        if e['logical_path'].lower().endswith('.xshmat'):
            # Rimy3D mi_objwriter.cpp GetCoherentName changes spaces/tabs to
            # underscores. Resolve only unique names produced by that rule.
            token=Path(e['logical_path']).stem.replace(' ','_').replace('\t','_').lower()
            material_aliases.setdefault(token,[]).append(e)
    inputs={}; outputs={}; omissions=[]; texture_cache={}; asset_cache={}; mesh_cache={}; source_nodes=[]; material_selections={}; texture_selections={}

    def resolve(name):
        candidates=by_name.get(Path(name.replace('\\','/')).name.lower(),[])
        if len(candidates)!=1: raise ValueError(f'asset lookup is not unique: {name}: {len(candidates)}')
        return candidates[0]

    def path(e):
        p=study/e['candidate_effective_output']
        label=source_label(e)
        if label not in inputs:
            if digest(p)!=e['sha256']: raise ValueError(f'source SHA mismatch: {label}')
            inputs[label]={'archive':e['candidate_effective_archive'],'path':e['logical_path'],
                           'sha256':e['sha256'],'bytes':p.stat().st_size}
        return p

    def save(p,data):
        if isinstance(data,str): p.write_text(data,encoding='utf8',newline='\n')
        else: p.write_bytes(data)
        outputs[p.relative_to(out).as_posix()]={'sha256':digest(p),'bytes':p.stat().st_size}

    def texture(name):
        stem=Path(name.replace('\\','/')).stem
        if stem in texture_cache: return texture_cache[stem]
        try: e=resolve(stem+'.ximg')
        except ValueError:
            omissions.append({'kind':'texture','resource':name,'reason':'no unique effective .ximg'}); return None
        b=path(e).read_bytes()
        assert b[38:43]==b'G3IMG'
        w,h=struct.unpack_from('<II',b,47); fourcc=b[71:75]
        assert fourcc in (b'DXT1',b'DXT3',b'DXT5')
        n=((w+3)//4)*((h+3)//4)*(8 if fourcc==b'DXT1' else 16)
        image_end=struct.unpack_from('<I',b,10)[0]
        mip_count=struct.unpack_from('<I',b,63)[0]
        # Native XIMG stores compressed mip levels from smallest to largest.
        # g3dit XimgLoader and Rimy3D XimgHandler both select the final full mip.
        offset=image_end-n
        assert offset>=87 and b[image_end:image_end+4]==bytes.fromhex('efbeadde')
        total=0; mw,mh=w,h
        for _ in range(mip_count):
            total+=((mw+3)//4)*((mh+3)//4)*(8 if fourcc==b'DXT1' else 16)
            mw=max(1,mw//2); mh=max(1,mh//2)
        assert 87+total==image_end
        header=bytearray(128); header[:4]=b'DDS '
        struct.pack_into('<7I',header,4,124,0x81007,h,w,n,0,1)
        struct.pack_into('<II',header,76,32,4); header[84:88]=fourcc
        struct.pack_into('<I',header,108,0x1000)
        dds=scratch/(stem+'.dds'); dds.write_bytes(header+b[offset:image_end])
        assert len(b[offset:image_end])==n
        with Image.open(dds) as image:
            rgba=image.convert('RGBA')
            opaque=rgba.getchannel('A').getextrema()==(255,255)
            filename=stem+('.jpg' if opaque else '.png'); dest=textures_dir/filename
            if opaque: rgba.convert('RGB').save(dest,quality=92,subsampling=0,optimize=True)
            else: rgba.save(dest,optimize=True)
        rel='../textures/'+filename
        outputs[dest.relative_to(out).as_posix()]={'sha256':digest(dest),'bytes':dest.stat().st_size}
        texture_cache[stem]=rel
        texture_selections[stem]={'source':source_label(e),'width':w,'height':h,'mipCount':mip_count,
            'format':fourcc.decode(),'mipOrder':'smallest-to-largest','fullMipSourceOffset':offset,
            'fullMipBytes':n,'imagePayloadEnd':image_end}
        return rel

    def diffuse_for_material(name,material_switch=0,optional=False):
        name=name.rstrip('|')
        try: e=resolve(Path(name).stem+'.xshmat')
        except ValueError:
            candidates=material_aliases.get(Path(name).stem.lower(),[])
            if len(candidates)==1: e=candidates[0]
            else:
                if not optional: omissions.append({'kind':'material','resource':name,'reason':'no unique .xshmat'})
                return None
        # Read sampler properties, including native repeat mode. Shader graph
        # evaluation is still unported; the first identified diffuse is stated.
        refs=[]; material=read_material(path(e))
        for sampler in material['samplers']:
            s=sampler['image']
            if ('diffuse' in s.lower() or (re.search(r'_S\d+[.]tga$',s,re.I) and not any(k in s.lower() for k in ('normal','specular','spec_')))) and s.lower().endswith(('.tga','.ximg','.dds')):
                if not any(p['image']==s for p in refs): refs.append(sampler)
        if not refs:
            omissions.append({'kind':'material','resource':name,'reason':'no diffuse sampler identified'}); return None
        if len(refs)>1: omissions.append({'kind':'shader-blend','resource':name,'samplers':[p['image'] for p in refs],'reason':'first diffuse sampler used; original shader graph is unported'})
        sampler=refs[0]
        image,switch_evidence=switched_image(sampler['image'],material_switch,sampler['switchRepeat'],by_name)
        material_selections[name+'#'+str(material_switch)]={'material':name,'nativeMaterial':Path(e['logical_path']).stem,'materialSwitch':material_switch,
            'source':source_label(e),'nativeSampler':sampler['image'],'samplerSourceOffset':sampler['sourceOffset'],
            'switchRepeat':sampler['switchRepeat'],'switchRepeatName':('Repeat','Clamp','PingPong')[sampler['switchRepeat']],
            'selectedImage':image,'range':switch_evidence,'shader':material['shader']}
        return texture(image)

    def material_metadata(names,material_switch=0):
        result={}
        for name in names:
            name=name.rstrip('|')
            record=material_selections.get(name+'#'+str(material_switch))
            if record and record['shader']:
                result[name]={k:record['shader'][k] for k in ('blendMode','maskReference')}
                result[name]['source']=record['source']
        return result

    def native_mesh(name,baked=False):
        key=(name,baked)
        if key in asset_cache: return asset_cache[key]
        e=resolve(name); stem=Path(name).stem
        sections=read_mesh(path(e)); mesh_cache[name]=sections
        text,triangles=obj_text(sections,stem,ORIGIN if baked else [0,0,0])
        obj=models_dir/(stem+'.obj'); mtl=models_dir/(stem+'.mtl')
        mats=[]; names=list(dict.fromkeys(Path(s['material']).stem for s in sections))
        for mat in names:
            diffuse=diffuse_for_material(mat)
            mats.extend([f'newmtl {mat}','Ka 0.25 0.25 0.25','Kd 1 1 1','Ks 0.03 0.03 0.03','Ns 8'])
            if diffuse: mats.append('map_Kd '+diffuse)
            mats.append('')
        save(obj,text); save(mtl,'\n'.join(mats))
        record={'obj':obj.relative_to(out).as_posix(),'mtl':mtl.relative_to(out).as_posix(),
                'source':source_label(e),'unitScale':1,'triangles':triangles,'materials':material_metadata(names)}
        asset_cache[key]=record
        return record

    def xact_model(name,material_switch=0):
        key=(name,material_switch)
        if key in asset_cache: return asset_cache[key]
        e=resolve(Path(name).stem+'.xact'); stem=Path(name).stem+f'_S{material_switch:02}'
        src=scratch/(stem+'.xact'); b=path(e).read_bytes()
        # Rimy3D imports only the first FXA payload. Keep the largest payload in
        # this scratch conversion wrapper; source bytes remain unchanged.
        payloads=[]
        for match in re.finditer(b'gena\x04\x00',b):
            start=match.start()+10
            if b[start:start+4]!=b'FXA ': continue
            n=struct.unpack_from('<I',b,match.start()+6)[0]
            if start+n>len(b): raise ValueError('FXA payload truncated')
            off=start+6; triangles=0
            while off<start+n:
                sid,size,version=struct.unpack_from('<III',b,off)
                if sid==3: triangles+=struct.unpack_from('<I',b,off+24)[0]//3
                off+=12+size
            assert off==start+n
            payloads.append((triangles,start,n))
        assert payloads
        triangles,start,n=max(payloads)
        wrapper=bytearray(b[:78]); struct.pack_into('<I',wrapper,74,n)
        src.write_bytes(wrapper+b[start:start+n])
        tmp=scratch/(stem+'.obj')
        cp=subprocess.run([str(args.rimy.resolve()),'-texlook','0','-matlook','0','-texout','0','-nkeep','-mtl','1',str(src),str(tmp)],capture_output=True)
        if cp.returncode!=0 or not tmp.exists(): raise RuntimeError(f'Rimy3D failed: {name}: {cp.stderr.decode(errors="replace")}')
        lines=[]
        for s in tmp.read_text().splitlines():
            if s.startswith('v '): s='v '+' '.join(f'{float(v)/100:.6f}' for v in s.split()[1:4])
            elif s.startswith('mtllib '): s='mtllib '+stem+'.mtl'
            lines.append(s)
        mtl_lines=[]; material=''; names=[]
        for s in tmp.with_suffix('.mtl').read_text().splitlines():
            if s.startswith('newmtl '):
                material=s.split(maxsplit=1)[1]; mtl_lines.append(s); names.append(material)
            elif s.startswith('map_Kd '):
                image=s.split(maxsplit=1)[1]
                diffuse=diffuse_for_material(material,material_switch,True)
                if diffuse is None:
                    # Older FXA fallback has no sampler repeat property; keep
                    # its recorded image rather than inventing a repeat mode.
                    diffuse=texture(image)
                if diffuse: mtl_lines.append('map_Kd '+diffuse)
            elif not s.startswith(('map_bump ','map_Ks ')): mtl_lines.append(s)
        obj=models_dir/(stem+'.obj'); mtl=models_dir/(stem+'.mtl')
        save(obj,'\n'.join(lines)+'\n'); save(mtl,'\n'.join(mtl_lines)+'\n')
        record={'obj':obj.relative_to(out).as_posix(),'mtl':mtl.relative_to(out).as_posix(),
                'source':source_label(e),'unitScale':1,'triangles':triangles,'materialSwitch':material_switch,
                'materials':material_metadata(names,material_switch)}
        asset_cache[key]=record
        return record

    def world_file(suffix):
        e=next(e for e in layers if e['logical_path'].endswith(suffix))
        source_nodes.append(source_label(e))
        return e,read_entities(path(e))

    scene={'version':1,'units':'metres','origin':ORIGIN,'bounds':{'min':[-125,-110,-200],'max':[200,30,250]},
           'spawn':[0,0,0],'spawnYaw':0,'meshes':[],'people':[],'inspectionPeople':[],'models':{},'metrics':{},'notes':[]}
    # Genuine native source instances. Full-detail family models share the
    # recorded low-detail family's transform; this resource choice is explicit.
    e,world=world_file('G3_World_Lowpoly_01_Levelmesh_01_Spat.node')
    for ent in world['entities']:
        m=ent['worldMatrix']; x,y,z=m[12:15]
        if (x-ORIGIN[0])**2+(z-ORIGIN[2])**2>10000**2: continue
        refs=[p['value'] for c in ent['classes'] for p in c['properties'] if p['name']=='ResourceFileName' and p['value']]
        if not refs: continue
        name=Path(refs[0]).name; selected=name.replace('_LOWPOLY','')
        if len(by_name.get(selected.lower(),[]))!=1: selected=name
        model=native_mesh(selected); pos,q,scale=transform(m)
        scene['meshes'].append({'id':'static-'+ent['guid'],'name':Path(selected).stem,
            **{k:model[k] for k in ('obj','mtl','materials')},'kind':'structure' if 'House' in selected or 'Palisaden' in selected else 'prop',
            'position':pos,'quaternion':q,'scale':scale,'source':source_label(e)+' # entity '+str(ent['index']),
            'sourceResource':name,'selectedResource':selected})
    for suffix in ('G3_Myrtana_01_Ardea_Dynamic_Objects_01_SHyb.node','G3_Myrtana_01_Outdoor_Ardea_Dynamic_Objects_01_SHyb.node'):
        e,world=world_file(suffix)
        for ent in world['entities']:
            m=ent['worldMatrix']; x,y,z=m[12:15]
            if (x-ORIGIN[0])**2+(z-ORIGIN[2])**2>10000**2: continue
            refs=[p['value'] for c in ent['classes'] if c['name'].startswith('eCVisualMesh') for p in c['properties'] if p['name'] in ('ResourceFileName','ResourceFilePath') and p['value']]
            if not refs: continue
            name=Path(refs[-1]).name
            if name.endswith('.xlmsh'): name=Path(name).stem+'.xcmsh'
            try: model=native_mesh(name)
            except ValueError as ex:
                omissions.append({'kind':'mesh','resource':name,'reason':str(ex)}); continue
            pos,q,scale=transform(m)
            scene['meshes'].append({'id':'prop-'+ent['guid'],'name':ent['name'],
                **{k:model[k] for k in ('obj','mtl','materials')},'kind':'prop','position':pos,'quaternion':q,'scale':scale,
                'source':source_label(e)+' # entity '+str(ent['index'])})
    for e in layers:
        name=e['logical_path']
        if not (name.startswith('G3_Myrtana_Landscape_01/LOD/') and name.endswith('.xcmsh')): continue
        p=study/e['candidate_effective_output']; sections=read_mesh(p); mn,mx=mesh_bounds(sections)
        if mn[0]>=102000 or mx[0]<=82000 or mn[2]>=-2000 or mx[2]<=-22000: continue
        model=native_mesh(Path(name).name,True)
        scene['meshes'].append({'id':'terrain-'+Path(name).stem,'name':Path(name).stem,
            **{k:model[k] for k in ('obj','mtl','materials')},'kind':'terrain','position':[0,0,0],'source':source_label(e),
            'sourceLod':'original Myrtana landscape LOD cell; world-space vertices'})
    def add_person(ent,e):
        if any(p['id']==ent['guid'] for p in scene['people']): return
        if not any(c['name']=='gCNPC_PS' for c in ent['classes']): return
        visual=next((c for c in ent['classes'] if c['name']=='eCVisualAnimation_PS'),None)
        if not visual: return
        slots={s['slot']:s for s in visual['slots']}
        if not slots.get('Slot_Body') or not slots.get('Slot_Head'): return
        parts={}
        for typ in ('Body','Head'):
            slot=slots['Slot_'+typ]; name=slot.get('file2') or slot['file']
            switch=slot.get('materialSwitch2',slot['materialSwitch'])
            model=xact_model(name,switch); key=Path(name).stem+f'_S{switch:02}'
            scene['models'][key]={k:model[k] for k in ('obj','mtl','source','unitScale','materials')}
            parts[typ.lower()]=key
        m=ent['worldMatrix']
        scene['people'].append({'id':ent['guid'],'name':ent['name'],'position':compact(position(m[12:15])),
            'rotationY':round(math.atan2(-m[8],m[10]),6),**parts,
            'source':source_label(e)+' # entity '+str(ent['index']),
            'sourceFlags':ent['flags'],'appearanceSlots':visual['slots'],
            'sourceActivation':'original quest-controlled activation is not reproduced'})

    for suffix in ('G3_Myrtana_01_Ardea_NPC_01.lrentdat','G3_Myrtana_01_Ardea_NPC_02.lrentdat'):
        e,world=world_file(suffix)
        for ent in world['entities']: add_person(ent,e)

    e,world=world_file('SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}.lrentdat')
    source_hero=next(v for v in world['entities'] if v['name']=='PC_Hero')
    m=source_hero['worldMatrix']
    scene['spawn']=compact(position(m[12:15]))
    # Choose the source entity's local -Z axis for the browser arrival view.
    # This faces into Ardea; it is a stated camera choice, not a recovered
    # original game camera controller. WebGL cameras themselves look down -Z.
    scene['spawnYaw']=round(math.atan2(-m[8],m[10]),6)
    scene['spawnSource']={'archive':e['candidate_effective_archive'],'path':e['logical_path'],
        'sha256':e['sha256'],'entityIndex':source_hero['index'],'entityName':'PC_Hero',
        'entityGuid':source_hero['guid'],'sourceOffset':source_hero['sourceOffset'],
        'worldMatrixCentimetres':m,'cameraOrientation':'browser arrival view along reflected source entity local -Z; original game camera not recovered'}
    story_names={'hamlar','gorn','diego','milten','lester','jack'}
    # Jack_KillBandits names these placed SysDyn actors, one of each. Their
    # body/head slots and transforms are read from the same winning source
    # layer as the story NPCs; template-only exhibits cannot fulfill the quest.
    quest_target_names={'Ardea_OutNovice_01','Ardea_OutNovice_02','Ardea_OutNovice_03'}
    for ent in world['entities']:
        if ent['name'].lower().split('_')[-1] not in story_names and ent['name'] not in quest_target_names: continue
        x,y,z=ent['worldMatrix'][12:15]
        if (x-ORIGIN[0])**2+(z-ORIGIN[2])**2<=22000**2: add_person(ent,e)
    hero={}
    for typ,name in (('body','G3_Hero_Body_Player.xact'),('head','G3_Head_Hero_Hero_01.xact')):
        model=xact_model(name); key=Path(name).stem+'_S00'
        scene['models'][key]={k:model[k] for k in ('obj','mtl','source','unitScale','materials')}; hero[typ]=key
    scene['inspectionPeople'].append({'id':'nameless-hero-exhibit','name':'Nameless Hero — source model exhibit',
        'position':[0,0,0],**hero,'source':'Inspection-only body/head model pair; no fabricated world placement'})
    scene['metrics']={'worldInstances':len(scene['meshes']),'people':len(scene['people']),
        'uniqueModels':len(asset_cache),'textures':len(texture_cache),
        'uniqueModelTriangles':sum(v['triangles'] for v in asset_cache.values()),
        'textureBytes':sum(v['bytes'] for k,v in outputs.items() if k.startswith('textures/')),
        'assetBytes':sum(v['bytes'] for v in outputs.values())}
    scene['notes']=[
        'Native geometry and recorded entity transforms from the local Gothic 3 installation; centimetres become metres and Z is reflected for right-handed WebGL.',
        'Structures use full-detail family resources at their corresponding recorded low-detail family transforms. sourceResource and selectedResource record this choice.',
        'Terrain is six original Myrtana landscape LOD cells. The original high-detail terrain mesh resources referenced by legacy .node data are not available as independent installed archive files.',
        'Humans and orcs use their actual Ardea/SysDyn NPC body/head slots and material switch values, exported as static bind-pose geometry. Hair/beard/equipment attachments, skeletal motion and original facial animation are not ported.',
        'Both local Ardea NPC layers, six named nearby SysDyn story NPCs and the three exact Jack_KillBandits target actors are listed at their source placements. Original quest-controlled activation and NPC combat/AI are not implemented.',
        'The arrival position is the recorded PC_Hero entity in the winning SysDyn world layer. Camera yaw is explicitly derived from its reflected orientation; this does not recover the original game camera controller.',
        'Diffuse samplers are converted from native DXT texture pixels. Opaque images use JPEG quality92; alpha images use PNG. Original shader graphs, terrain layer blending, normal/specular maps, native lighting and SpeedTree wind are not ported.'
    ]
    save(out/'scene.json',json.dumps(scene,ensure_ascii=False,indent=2)+'\n')
    provenance={'schemaVersion':1,'originCentimetres':ORIGIN,'coordinateConversion':'[(X-originX)/100,(Y-originY)/100,-(Z-originZ)/100]',
        'inputs':list(inputs.values()),'outputs':outputs,'sourceWorldLayers':source_nodes,
        'resourceChoice':'effective archive layer candidates as recorded in completed local study',
        'spawnSource':scene['spawnSource'],'materialSelections':list(material_selections.values()),
        'textureSelections':list(texture_selections.values()),
        'notes':scene['notes'],'omissions':omissions,'metrics':scene['metrics']}
    (out/'source-manifest.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    # Remove only generated files owned by the previous manifest that this
    # generation no longer references; never recurse or touch source folders.
    for relative in previous_outputs.keys()-outputs.keys():
        old=(out/relative).resolve()
        if not (old.is_relative_to(models_dir.resolve()) or old.is_relative_to(textures_dir.resolve())): continue
        if old.is_file(): old.unlink()
    print(json.dumps(scene['metrics'],indent=2)); print('omissions',len(omissions))


if __name__=='__main__': main()
