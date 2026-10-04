# SPDX-License-Identifier: GPL-3.0-only
"""Export every indexed native terrain cell without running Gothic 3.

Python3.10+ and Pillow DDS support. Usage:
python -B tools/gothic3/export_terrain.py --study PATH_TO_COMPLETED_STUDY
Writes only public/gothic3/terrain and assets/gothic3/terrain. Original source
files, existing world/gameplay/static exports and runtime files are read only.
The converter supplies geometry/graphs; it does not implement their renderer,
original lightmaps, collision, sector activation, or full-game progression.
"""
import argparse
from collections import Counter,defaultdict
import gzip
import hashlib
import json
import os
from pathlib import Path,PurePosixPath
import re
import struct
import uuid

from export_world_index import Sources,physical,portable,read_context,read_sector,sha
from read_gameplay_ini import parse_ini
from read_genome import read_entities
from read_xcmsh import read_mesh,mesh_bounds
from terrain_formats import geometry_glb,json_bytes,material_graph,ximg_png


REPO=Path(__file__).resolve().parents[2]
OUT=REPO/'public/gothic3/terrain'
RECEIPTS=REPO/'assets/gothic3/terrain'
HELPERS=['export_terrain.py','terrain_formats.py','export_world_index.py','read_genome.py',
         'read_gameplay_ini.py','read_xcmsh.py','read_xshmat.py']
FORMAT_REFERENCES={
    'g3dit':{'repository':'https://github.com/georgeto/g3dit',
        'commit':'30113b8254d3e6d0395d8e3c78618a99fbc0a6ca','license':'GPL-3.0-only',
        'paths':['LrentNode/src/main/java/de/george/lrentnode/classes/eCShaderDefault.java',
                 'LrentNode/src/main/java/de/george/lrentnode/classes/eCShaderBase.java',
                 'LrentNode/src/main/java/de/george/lrentnode/classes/eCShaderEllementBase.java',
                 'LrentNode/src/main/java/de/george/lrentnode/classes/eCColorSrcBase.java',
                 'LrentNode/src/main/java/de/george/lrentnode/classes/eCColorSrcBlend.java',
                 'LrentNode/src/main/java/de/george/lrentnode/classes/eCColorSrcCombiner.java',
                 'LrentNode/src/main/java/de/george/lrentnode/structures/bCFloatColor.java',
                 'LrentNode/src/main/java/de/george/lrentnode/structures/eCColorSrcProxy.java',
                 'LrentNode/src/main/java/de/george/lrentnode/structures/eCTexCoordSrcProxy.java']},
    'rmtools':{'repository':'https://github.com/Baltram/rmtools',
        'commit':'5525421bf4b22636259bdc0d250ee96a5abcae66','license':'GPL-3.0-only',
        'paths':['mimicry/source/Mimicry/mi_xcmshreader.cpp',
                 'mimicry/source/Mimicry/mi_xnvmshreader.cpp']}}
NATIVE_REFERENCES=[
    {'module':'Engine.dll','entry':'3003183b','body':'305410d0','function':'eCColorSrcBlend::GetImplementation',
     'assemblyLine':1389414,'stringVA':'308840d0','expression':'lerp(color1,color2,blend)'},
    {'module':'Engine.dll','entry':'3001978b','body':'30543370','function':'eCColorSrcCombiner::GetImplementation',
     'expression':'0:Add,1:Subtract,2:Multiply,3:Max,4:Min'},
    {'module':'Engine.dll','entry':'30009f93','body':'30538890','function':'eCTexCoordSrcScale::GetVSImplementation',
     'assemblyLine':1380046,'stringVA':'308835ac','expression':'UV * Scale'},
    {'module':'Engine.dll','entry':'30024528','body':'30551060','function':'eCColorSrcSampler::GetImplementation',
     'assemblyLine':1406445,'stringVA':'30885664','expression':'tex2D(sampler,UV) + selected swizzle'},
    {'module':'Engine.dll','entry':'3001c1cf','body':'3055cc30','function':'eCColorSrcVertexColor::GetImplementation',
     'assemblyLine':1418721,'stringVA':'30886230','expression':'XFX_PS_VERTEXCOLOR + selected swizzle'},
    {'module':'Engine.dll','entry':'3000ed40','function':'eCColorSrcBase::GetSwizzle',
     'pseudocodeFile':'01_Decompiled_Code/Engine_dll/pseudocode/functions_00015.c','line':7062,
     'expression':'0:whole,1:rgb,2:r,3:g,4:b,5:a'},
    {'module':'Engine.dll','entry':'30027a34','function':'eCResourceLightmap_PS::Read',
     'pseudocodeFile':'01_Decompiled_Code/Engine_dll/pseudocode/functions_00041.c','line':12530,
     'meaning':'Original per-mesh lightmap objects and optional ambient-occlusion grid are not decoded by this export.'},
    {'module':'Engine.dll','entry':'30041015','body':'30532010','function':'eCTexCoordSrcProxy::GetVSImplementation',
     'assemblyLines':[1373322,1373342],
     'meaning':'Valid instance tail-calls its VS method with caller arguments unchanged. Missing instance uses this proxy vertex selector for input UV.'},
    {'module':'Engine.dll','entry':'30019d44','body':'30532050','function':'eCTexCoordSrcProxy::GetPSImplementation',
     'assemblyLines':[1373344,1373360],
     'meaning':'Valid instance tail-calls its PS method; missing instance uses caller param_2 for generated output TEX slot, not stored original input selector.'},
    {'module':'Engine.dll','entry':'30034bfd','function':'eTShaderEllementProxy<eCTexCoordSrcBase>::GetInstance',
     'meaning':'Resolves/caches GUID element without changing its input-selector fields.'},
    {'module':'Engine.dll','entry':'30003e4a','body':'30526a60','function':'eCTexCoordSrcBumpOffset::GetPSImplementation',
     'assemblyLine':1361513,'stringVA':'30882004',
     'expression':'(( height * constant.xy + constant.zw ) * XFX_PS_TANGENTSPACE_EYE + UV )',
     'meaning':'Disabled bump passes UV. Enabled height whole/rgb selectors0/1 are forced to alpha5.'},
    {'module':'Engine.dll','entry':'3000acc2','function':'eCTexCoordSrcBumpOffset::OnNotifyPropertyValueChangedExitEx',
     'expression':'OffsetAmount O updates constant vec4(O,-O,-0.5*O,+0.5*O).'},
]
ATTRIBUTE_API={
    'POSITION':{'threeName':'position','componentType':5126,'itemSize':3,'space':'Centered browser metres'},
    'NORMAL':{'threeName':'normal','componentType':5126,'itemSize':3,'space':'Original direction with Z reflected'},
    'TEXCOORD_0':{'threeName':'uv','componentType':5126,'itemSize':2,'nativeStream':12},
    'TEXCOORD_1':{'threeName':'uv1','componentType':5126,'itemSize':2,'nativeStream':15},
    'TEXCOORD_2':{'threeName':'uv2','componentType':5126,'itemSize':2,'nativeStream':18},
    'TEXCOORD_3':{'threeName':'uv3','componentType':5126,'itemSize':2,'nativeStream':21},
    '_G3_BGRA':{'threeName':'_g3_bgra','componentType':5121,'itemSize':4,'normalized':False,'nativeStream':4,
                'channels':'Original unsigned bytes B,G,R,A. Red=z/255, alpha=w/255.'},
    '_G3_SPECULAR_BGRA':{'threeName':'_g3_specular_bgra','componentType':5121,'itemSize':4,'normalized':False,'nativeStream':5},
    '_G3_TANGENT':{'threeName':'_g3_tangent','componentType':5126,'itemSize':3,'nativeStream':64,
        'space':'Original tangent with Z reflected; custom VEC3, not standard glTF TANGENT.'},
}
LIMITS=[
    'All original geometry is exported; native material graphs require a separate runtime GLSL adapter. Generic GLB materials are explicitly placeholders.',
    'The connected native sampler with an empty ImageFilePath remains unresolved; no replacement texture is selected.',
    'PNG hosts the original largest decoded native mip. Original lower mips are not hosted; browser-generated mipmaps are not claimed as native mip fidelity.',
    'Lightmap and collision companion files are source-verified and referenced, not converted or applied by this exporter.',
    'Registry/context flags are native source evidence; original runtime sector/quest activation is not implemented here.',
    'Terrain cells are not a complete world: buildings/caves/statics/vegetation/gameplay remain independent streaming and runtime work.',
]


class Export:
    def __init__(self,sources):
        self.sources=sources;self.outputs={};self.derived={};self.inputs_by_key={
            (e['family'],e['logical_path']):e for e in sources.entries}
        self.names=defaultdict(list)
        for e in sources.entries:self.names[PurePosixPath(e['logical_path']).name.casefold()].append(e)
    def resolve(self,name):
        basename=PurePosixPath(name.replace('\\','/')).name.casefold();candidates=self.names[basename]
        if len(candidates)!=1:raise ValueError(f'Nonunique exact native resource {name}: {len(candidates)}')
        return candidates[0]
    def ref(self,entry):return self.sources.verified[entry['family']+' :: '+entry['logical_path']]
    def original(self,ref):
        entry=self.inputs_by_key[(ref['family'],ref['path'])]
        assert ref['sha256']==entry['sha256'];data=self.sources.read(entry)
        return entry,data
    def derived_json(self,relative):
        path=REPO/portable(relative);data=path.read_bytes()
        self.derived[relative]={'bytes':len(data),'sha256':sha(data)}
        return json.loads(data)
    def write(self,relative,value):
        relative=portable(relative);target=OUT/relative
        if not target.resolve().is_relative_to(OUT.resolve()):raise ValueError('Output escapes dedicated terrain directory')
        target.parent.mkdir(parents=True,exist_ok=True)
        data=value if isinstance(value,bytes) else json_bytes(value)
        temporary=target.with_name(target.name+'.tmp');temporary.write_bytes(data);os.replace(temporary,target)
        readback=target.read_bytes();assert len(readback)==len(data) and sha(readback)==sha(data)
        record={'url':relative,'bytes':len(data),'sha256':sha(data)};self.outputs[relative]=record
        return record


def read_bindings(export,cells):
    sources=export.sources;by_name={PurePosixPath(c['source']['path']).stem.casefold():c for c in cells}
    lightmap_lookup={}
    for entry in sources.entries:
        match=re.fullmatch(r'(G3_\w+_Landscape_Cell_\d+)_\{([^}]+)\}[.]xlmp',PurePosixPath(entry['logical_path']).name,re.I)
        if not match or match[1].casefold() not in by_name:continue
        guid=uuid.UUID(match[2]).bytes_le.hex()
        if guid in lightmap_lookup:raise ValueError('Ambiguous native cell lightmap GUID')
        sources.read(entry);lightmap_lookup[guid]=(by_name[match[1].casefold()],export.ref(entry))
    assert len(lightmap_lookup)==len(cells)
    selected=[]
    for path in sorted((REPO/'public/gothic3/gameplay/world/indices').glob('*.json.gz')):
        data=path.read_bytes();chunk=json.loads(gzip.decompress(data))
        matches=[entity for entity in chunk['entities'] if entity['guid'][:32] in lightmap_lookup]
        if matches:
            relative=path.relative_to(REPO).as_posix();export.derived[relative]={'bytes':len(data),'sha256':sha(data)}
            selected.extend(matches)
    entity_files=export.derived_json('public/gothic3/gameplay/world/files.json')
    world_files={f['id']:f for f in export.derived_json('public/gothic3/world/world-files.json')['files']}
    world_index=export.derived_json('public/gothic3/world/index.json')
    sectors={s['id']:s for s in world_index['sectors']};worlds={w['id']:w for w in world_index['worlds']}
    node_cache={};context_cache={};sector_cache={};registry_cache={};bindings={}
    identity=[1.,0.,0.,0.,0.,1.,0.,0.,0.,0.,1.,0.,0.,0.,0.,1.]
    for entity in selected:
        cell,lightmap=lightmap_lookup[entity['guid'][:32]];source=entity_files[entity['file']]['source']
        key=(source['family'],source['path'])
        if key not in node_cache:
            entry,data=export.original(source);node_cache[key]=read_entities(sources.path(entry))['entities']
            assert sha(sources.path(entry).read_bytes())==entry['sha256']
        native=node_cache[key][entity['entityIndex']]
        assert native['guid']==entity['guid'] and native['name']==entity['name']
        visual=next(c for c in native['classes'] if c['name']=='eCVisualMeshStatic_PS')
        props={p['name']:p for p in visual['properties']};resource=props['ResourceFileName']['value']
        assert PurePosixPath(resource.replace('\\','/')).name.casefold()==PurePosixPath(cell['source']['path']).name.casefold()
        switch=struct.unpack('<i',bytes.fromhex(props['MaterialSwitch']['raw']))[0]
        # The source corpus was proven identity/switch0. Refuse to silently
        # apply another installation's transform or change texture selection.
        assert native['worldMatrix']==identity and switch==0
        if cell['id'] in bindings:raise ValueError('Multiple original entities bind one terrain cell')
        world=world_files[source['path']];context=world['spatialContext'];context_source=context['source']
        ck=(context_source['family'],context_source['path'])
        if ck not in context_cache:
            ce,cb=export.original(context_source);context_cache[ck]=read_context(cb)
            assert all(context[k]==v for k,v in context_cache[ck].items())
        membership=[]
        for sector_id in world['sectorIds']:
            sector=sectors[sector_id];ss=sector['source'];sk=(ss['family'],ss['path'])
            if sk not in sector_cache:
                se,sb=export.original(ss);sector_cache[sk]=read_sector(sb)
            for member in sector['files']:
                if member['fileId']!=source['path']:continue
                names=sector_cache[sk]['nodes' if member['kind']=='static-node' else 'dynamicLayers']
                assert names[member['order']]==member['nativeName']
                registrations=[]
                for registration in sector['registrations']:
                    rs=worlds[registration['world']]['source'];rk=(rs['family'],rs['path'])
                    if rk not in registry_cache:
                        re_entry,rb=export.original(rs);registry_cache[rk]=parse_ini(rb)
                    row=next(r for r in registry_cache[rk]['records'] if r['line']==registration['line'])
                    assert row['section']=='Sector.List' and row['key']==registration['name'] and row['value']==registration['rawValue']
                    assert {'true':True,'false':False}.get(row['value'].casefold())==registration['enabled']
                    registrations.append({**registration,'source':export.ref(export.inputs_by_key[rk])})
                membership.append({'sectorId':sector_id,'sectorSource':export.ref(export.inputs_by_key[sk]),
                    'member':member,'registrations':registrations})
        assert membership
        collision_entry=export.resolve(PurePosixPath(cell['source']['path']).stem+'.xnvmsh');sources.read(collision_entry)
        bindings[cell['id']]={'entityGuid20':native['guid'],'entityName':native['name'],
            'entityIndex':native['index'],'entitySourceOffset':native['sourceOffset'],'entitySource':export.ref(export.inputs_by_key[key]),
            'visualResourceFileName':resource,'worldMatrixNative':native['worldMatrix'],'localMatrixNative':native['localMatrix'],
            'materialSwitch':switch,'sectorIds':world['sectorIds'],'membership':membership,
            'registered':world['registered'],'enabledByAnyRegistry':world['enabledByAnyRegistry'],
            'spatialContext':context,'lightmap':lightmap,'collision':export.ref(collision_entry)}
    assert len(bindings)==len(cells)
    print(f'Native bindings complete: {len(bindings)} cells in {len(node_cache)} original node files.',flush=True)
    return bindings


def loose_shader_evidence(game):
    root=game/'Data/Materials/ShaderMaterial/Effects';result=[]
    for name,ranges in [('ge_globals.fx',[(62,69),(162,180),(391,403)]),
                        ('ge_default_3_0.fx',[(123,159),(550,582),(1019,1080),(1090,1115)])]:
        path=root/name;data=path.read_bytes();lines=data.decode('cp1252').splitlines()
        result.append({'installedRelativePath':path.relative_to(game).as_posix(),'sha256':sha(data),'bytes':len(data),
            'evidence':[{'startLine':a,'endLine':b,'lines':lines[a-1:b]} for a,b in ranges]})
    return result


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--study',type=Path,required=True)
    parser.add_argument('--game',type=Path,default=Path('C:/Program Files (x86)/Steam/steamapps/common/Gothic 3'))
    args=parser.parse_args();study=args.study.resolve();game=args.game.resolve()
    if OUT.resolve().is_relative_to(study) or RECEIPTS.resolve().is_relative_to(study):raise ValueError('Outputs must be outside immutable study')
    OUT.mkdir(parents=True,exist_ok=True);RECEIPTS.mkdir(parents=True,exist_ok=True)
    helper_hashes={name:sha((Path(__file__).parent/name).read_bytes()) for name in HELPERS}
    index_path=study/'02_Unpacked_Data/_metadata/effective_layers.json';index_bytes=index_path.read_bytes()
    sources=Sources(study,json.loads(index_bytes)['files']);export=Export(sources)
    terrain_index=export.derived_json('public/gothic3/world/terrain.json');cells=terrain_index['cells']
    if len(cells)!=782:raise ValueError('Expected original indexed corpus of782 cells')
    material_names=sorted({s['material'].rstrip('|') for c in cells for s in c['sections']})
    material_records=[];material_by_name={};texture_entries={};unknown=[]
    for name in material_names:
        entry=export.resolve(name);data=sources.read(entry);nodes,root=material_graph(data)
        material_id=entry['logical_path'];record={'id':material_id,'source':export.ref(entry),'root':root,'nodes':nodes}
        for node in nodes:
            if node['class']!='eCColorSrcSampler':continue
            image=node['values']['ImageFilePath'];node['sourceImagePath']=image
            node['materialSwitch']=0
            if not image:
                node['textureId']=None;node['selectionStatus']='native-empty-image-path; fallback-unresolved'
                issue={'materialId':material_id,'nodeId':node['id'],'sourceOffset':node['sourceOffset'],
                       'reason':node['selectionStatus'],'connected':any(
                           p['valid'] and p['token']==node['id'] for n in nodes
                           for p in list(n.get('inputs',{}).values())+list(n.get('outputs',{}).values()))}
                unknown.append(issue);continue
            native_image=PurePosixPath(image.replace('\\','/')).stem+'.ximg'
            texture_entry=export.resolve(native_image)
            node['textureId']=texture_entry['logical_path'];node['selectionStatus']='exact-native-sampler-image; MaterialSwitch0'
            texture_entries[texture_entry['logical_path']]=texture_entry
        material_records.append(record);material_by_name[name.casefold()]=record
    original_shaders=loose_shader_evidence(game)
    graphs={'schema':'gothic3-terrain-material-graphs-v1','materials':material_records,
        'proxySelectors':{'color':{'0':'whole','1':'rgb','2':'r','3':'g','4':'b','5':'a'},
                         'texCoord':'VS missing-instance branch uses this proxy selector as original input UV0..3; valid token follows the referenced UV node. PS missing-instance branch uses its caller-generated output TEX slot. An outer sampler selector must not override a linked Scale inner source selector.'},
        'combinerTypes':{'0':'Add','1':'Subtract','2':'Multiply','3':'Max','4':'Min'},
        'samplerRepeat':{'0':'Wrap','1':'Clamp','2':'Mirror'},
        'bumpOffset':{'VS':'Pass through the referenced texCoord VS expression.',
            'PS':'When enabled: UV + ((height * vec2(O,-O) + vec2(-0.5*O,0.5*O)) * tangentEye.xy). Disabled: UV.',
            'heightSelectorFallback':'Native whole/rgb selectors0/1 become alpha5.',
            'eye':'Normalized camera-to-world-position eye, dotted against interpolated T/B/N. This native expression has no divide by eye.z.',
            'constantProperty':'values.OffsetAmount'},
        'normalDecode':{'expression':'C=(graphNormalRGBA-0.5)*2; tangentNormal=(C.a,C.g,sqrt(1-C.a*C.a-C.g*C.g)); worldNormal=x*T+y*B+z*N.',
            'source':'ge_default_3_0.fx:1058-1077','precisionLimit':'Original uses half casts; exporter records equations, not browser GPU half-precision equivalence.'},
        'nativeReferences':NATIVE_REFERENCES,'installedShaderSources':original_shaders,'unknownSamplerBehavior':unknown}
    graph_ref=export.write('material-graphs.json',graphs)
    print(f'Graphs ready: {graph_ref["url"]}, {len(material_records)} typed native graphs.',flush=True)
    texture_records=[]
    for index,texture_id in enumerate(sorted(texture_entries)):
        entry=texture_entries[texture_id];data=sources.read(entry);png,pixels,metadata=ximg_png(data)
        output=export.write('textures/'+sha(png)+'.png',png)
        texture_records.append({'id':texture_id,'source':export.ref(entry),**output,**metadata,'pixelSHA256':sha(pixels)})
        if (index+1)%20==0:print(f'Textures written: {index+1}/{len(texture_entries)}.',flush=True)
    bindings=read_bindings(export,cells)
    records=[];streams=Counter();primitive_streams=Counter();total_binary=0;total_mesh_bytes=0
    max_position_error=0.
    for index,cell in enumerate(cells):
        entry,data=export.original(cell['source']);sections=read_mesh(sources.path(entry))
        assert sha(sources.path(entry).read_bytes())==entry['sha256']
        assert [s['material'] for s in sections]==[s['material'] for s in cell['sections']]
        low,high=mesh_bounds(sections);assert low==cell['bounds']['nativeCentimetres']['min'] and high==cell['bounds']['nativeCentimetres']['max']
        material_ids=[material_by_name[s['material'].rstrip('|').casefold()]['id'] for s in sections]
        glb,stats=geometry_glb(sections,PurePosixPath(entry['logical_path']).stem,material_ids)
        assert stats['vertices']==cell['vertices'] and stats['triangles']==cell['triangles']
        name='cells/'+PurePosixPath(entry['logical_path']).stem+'.'+sha(glb)[:12]+'.glb'
        output=export.write(name,glb);total_binary+=stats['binaryBytes'];total_mesh_bytes+=len(data)
        streams.update(stats['sourceStreamBytes']);max_position_error=max(max_position_error,stats['maxPositionRoundingErrorMetres'])
        for section in sections:primitive_streams.update(str(t) for t in section['streams'])
        texture_ids=sorted({node['textureId'] for mid in material_ids
            for node in next(m for m in material_records if m['id']==mid)['nodes']
            if node['class']=='eCColorSrcSampler' and node.get('textureId') is not None})
        records.append({'id':cell['id'],'region':cell['region'],'source':export.ref(entry),
            'boundsMetres':cell['bounds']['browserMetres'],'boundsNativeCentimetres':cell['bounds']['nativeCentimetres'],
            'centerMetres':stats['centerMetres'],'geometry':{**output,'vertices':stats['vertices'],
                'triangles':stats['triangles'],'primitiveCount':stats['primitiveCount']},
            'primitiveMaterialIds':material_ids,'textureIds':texture_ids,'native':bindings[cell['id']]})
        if (index+1)%100==0 or index+1==len(cells):print(f'GLBs written: {index+1}/{len(cells)}.',flush=True)
    summary={'cells':len(records),'regions':dict(Counter(c['region'] for c in records)),
        'triangles':sum(c['geometry']['triangles'] for c in records),'vertices':sum(c['geometry']['vertices'] for c in records),
        'primitives':sum(c['geometry']['primitiveCount'] for c in records),
        'materials':len(material_records),'textures':len(texture_records),'uniquePNGFiles':len({t['url'] for t in texture_records}),
        'geometryBytes':sum(c['geometry']['bytes'] for c in records),'geometryBinaryBytes':total_binary,
        'sourceMeshBytes':total_mesh_bytes,'sourceTextureBytes':sum(t['source']['bytes'] for t in texture_records),
        'texturePNGBytes':sum(export.outputs[url]['bytes'] for url in {t['url'] for t in texture_records}),
        'sourceLightmapBytes':sum(c['native']['lightmap']['bytes'] for c in records),
        'sourceCollisionBytes':sum(c['native']['collision']['bytes'] for c in records),
        'nativeNodeFiles':len({c['native']['entitySource']['path'] for c in records}),
        'nativeSectors':len({s for c in records for s in c['native']['sectorIds']}),
        'unresolvedSamplerBehaviors':len(unknown),'primitiveCountByStream':dict(primitive_streams),
        'sourceStreamBytes':dict(streams),'maxPositionRoundingErrorMetres':max_position_error}
    assert original_shaders==loose_shader_evidence(game)
    engine_coverage_path=study/'01_Decompiled_Code/Engine_dll/coverage.json'
    engine_coverage_data=engine_coverage_path.read_bytes();engine_coverage=json.loads(engine_coverage_data)
    assert engine_coverage['sha256']=='d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'
    assembly_path=study/'01_Decompiled_Code/Engine_dll/full_disassembly.asm';assembly_hash=sha(assembly_path.read_bytes())
    assert assembly_hash=='8b243b9520963161bc4ae73f35f2712b196f684e188276fb2453e2e4c7e65d36'
    native_evidence_module={'program':engine_coverage['program'],'inputSHA256':engine_coverage['sha256'],
        'coverageRelativePath':'01_Decompiled_Code/Engine_dll/coverage.json','coverageSHA256':sha(engine_coverage_data),
        'fullAssemblyRelativePath':'01_Decompiled_Code/Engine_dll/full_disassembly.asm','fullAssemblySHA256':assembly_hash}
    # Fresh input/output readback before publishing the manifest, including
    # all original source bytes and helper/derived-index identities.
    for key,ref in sources.verified.items():
        entry=export.inputs_by_key[(ref['family'],ref['path'])]
        assert sha(sources.path(entry).read_bytes())==ref['sha256']
    assert sha(index_path.read_bytes())==sha(index_bytes)
    assert helper_hashes=={name:sha((Path(__file__).parent/name).read_bytes()) for name in HELPERS}
    for relative,expected in export.derived.items():assert sha((REPO/relative).read_bytes())==expected['sha256']
    for relative,expected in export.outputs.items():
        data=(OUT/relative).read_bytes();assert len(data)==expected['bytes'] and sha(data)==expected['sha256']
    provenance={'schema':'gothic3-terrain-provenance-v1','selection':'static-effective-layer-candidate',
        'sourceIndexSHA256':sha(index_bytes),'compilerAndHelperSHA256':helper_hashes,
        'derivedIndexInputs':export.derived,'inputs':sources.verified,'outputs':dict(export.outputs),
        'sourceLicense':'Original Gothic 3 assets have no asserted open license; GPL tool licensing does not license these game assets.',
        'formatReferences':FORMAT_REFERENCES,'nativeReferences':NATIVE_REFERENCES,
        'nativeEvidenceModule':native_evidence_module,'installedShaderSources':original_shaders,
        'summary':summary,'limits':LIMITS,'audit':{'all782GLBsWrittenAndHashReadbackVerified':True,
            'allSelectedInputsFreshHashVerified':True,'allNonemptyImageDependenciesResolved':True,
            'PNGReadbackMatchesOriginalDecodedLargestMipRGBA':True,'nativeGameOrDLLExecuted':False}}
    provenance_ref=export.write('source-manifest.json',provenance)
    manifest={'schema':'gothic3-terrain-v1','worldId':'G3_World_01','summary':summary,
        'coordinates':{'unit':'metres','axisConversion':'(nativeX,nativeY,-nativeZ)/100',
            'positions':'Absolute world. Each GLB root restores its recorded center; vertices are centered locally.',
            'legacyArdeaOriginMetres':[920,52,120],
            'legacyArdeaIntegration':'Legacy Ardea positions are relative to this origin. Add origin for absolute streaming queries; subtract it from terrain root translations to display in that scene.'},
        'cells':records,'textures':texture_records,'materialGraphs':graph_ref,'provenance':provenance_ref,
        'attributeAPI':ATTRIBUTE_API,'nativeBitangent':'cross(normalize(N),normalize(T)) * (2 * _g3_bgra.z / 255 - 1)',
        'materialBinding':'Each GLB primitive material extras.nativeMaterialId references the corresponding graph.id; generic materials are placeholders.',
        'loaderAPI':'Resolve cell.geometry.url and texture.url relative to this manifest URL. Load cells lazily; no782-cell eager load is required.',
        'limits':LIMITS}
    manifest_ref=export.write('manifest.json',manifest)
    receipt={'schema':'gothic3-terrain-conversion-receipt-v1','manifest':manifest_ref,'provenance':provenance_ref,
        'summary':summary,'compilerAndHelperSHA256':helper_hashes,'sourceIndexSHA256':sha(index_bytes),
        'outputs':export.outputs,'limits':LIMITS,'nativeFilesReadOnly':True,'nativeCodeExecuted':False}
    receipt_path=RECEIPTS/'conversion-receipt.json';receipt_data=json_bytes(receipt)
    receipt_path.write_bytes(receipt_data);assert sha(receipt_path.read_bytes())==sha(receipt_data)
    print(json.dumps({'manifest':manifest_ref,'receiptSHA256':sha(receipt_data),'summary':summary}),flush=True)


if __name__=='__main__':main()
