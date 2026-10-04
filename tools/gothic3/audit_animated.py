# SPDX-License-Identifier: GPL-3.0-only
"""Original-data audit of the exported Hero GLB; no fixture/game execution.

Re-decodes the actual SHA-verified XACT/XMOT inputs read-only. Checks every
GLB split vertex, original influence (including all extra sets), index, native
track endpoint/default, source hierarchy and external dependency receipt.
Writes only public/gothic3/animated/audit.json, a reproducible evidence record.
"""
import argparse
import hashlib
import json
import math
import struct
from pathlib import Path
from read_xact_skin import read_actor, read_motion
from native_animation_math import cleaned_rig, rotation, translation, normal


REPO=Path(__file__).resolve().parents[2]
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def f32(value): return struct.unpack('<f',struct.pack('<f',value))[0]
def equal_float(actual,expected):
    if len(actual)!=len(expected) or any(a!=f32(e) for a,e in zip(actual,expected)):
        raise ValueError('exported FLOAT accessor differs from original-data conversion')


def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--study',type=Path,required=True)
    args=ap.parse_args(); study=args.study.resolve(); base=REPO/'public/gothic3'; out=base/'animated'
    manifest=json.loads((out/'manifest.json').read_text(encoding='utf8'))
    native=json.loads((out/'hero-native.json').read_text(encoding='utf8'))
    index=json.loads((study/'02_Unpacked_Data/_metadata/effective_layers.json').read_text(encoding='utf8'))['files']
    source_entries={e['candidate_effective_archive']+' :: '+e['logical_path']:e for e in index}
    for label,record in manifest['inputs'].items():
        e=source_entries[label];p=study/e['candidate_effective_output']
        if sha(p)!=record['sha256'] or record['sha256']!=e['sha256'] or p.stat().st_size!=record['bytes']:
            raise ValueError('original source receipt changed')
    for relative,record in {**manifest['dependencies'],**manifest['outputs']}.items():
        p=base/relative
        if sha(p)!=record['sha256'] or p.stat().st_size!=record['bytes']: raise ValueError('asset/dependency receipt mismatch')
    if sha(base/'source-manifest.json')!=manifest['staticManifestSHA256']: raise ValueError('static manifest changed')
    data=(out/'hero.glb').read_bytes();magic,version,total=struct.unpack_from('<III',data)
    if magic!=0x46546C67 or version!=2 or total!=len(data): raise ValueError('invalid GLB header')
    js,typ=struct.unpack_from('<II',data,12)
    if typ!=0x4E4F534A: raise ValueError('missing GLB JSON')
    doc=json.loads(data[20:20+js]);bs,typ=struct.unpack_from('<II',data,20+js)
    if typ!=0x004E4942 or 28+js+bs!=len(data): raise ValueError('invalid GLB binary boundary')
    binary=data[28+js:]; widths={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
    def accessor(index):
        a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
        if v['buffer']!=0 or v.get('byteOffset',0)%4: raise ValueError('invalid portable buffer alignment')
        size=widths[a['type']]; fmt={5126:'f',5123:'H',5125:'I'}[a['componentType']]
        width=struct.calcsize(fmt);offset=v.get('byteOffset',0)+a.get('byteOffset',0)
        n=a['count']*size*width
        if offset+n>len(binary) or n!=v['byteLength']: raise ValueError('accessor exceeds contiguous view')
        values=list(struct.unpack_from('<'+fmt*(a['count']*size),binary,offset))
        if any(not math.isfinite(x) for x in values): raise ValueError('nonfinite portable data')
        return values if size==1 else [values[i:i+size] for i in range(0,len(values),size)]
    for i in range(len(doc['accessors'])): accessor(i)
    names={n['name']:i for i,n in enumerate(doc['nodes'])}
    joint_names=[doc['nodes'][i]['name'] for i in doc['skins'][0]['joints']]
    joint_index={n:i for i,n in enumerate(joint_names)}
    if len(joint_names)!=len(set(joint_names)): raise ValueError('duplicate portable joint')
    counters={'splitVertices':0,'triangles':0,'originalInfluencesChecked':0,'splitInfluencesChecked':0,
              'nativeKeyframesChecked':0,'constantPoseChannelsChecked':0,'accessors':len(doc['accessors']),
              'distinctFirstWeightBackups':0,'staticOriginalVerticesCompared':0}
    scene=json.loads((base/'scene.json').read_text(encoding='utf8'))
    for part,mesh in zip(native['parts'],doc['meshes']):
        entry=source_entries[part['source']];source_path=study/entry['candidate_effective_output']
        decoded=read_actor(source_path)
        if decoded!=part['decoded']: raise ValueError('raw actor JSON differs from re-decoded original')
        clean,globals_,removed=cleaned_rig(decoded['actor'])
        if clean!=part['cleanedRig'] or removed!=part['removedHelpers']: raise ValueError('cleanup metadata mismatch')
        actor=decoded['actor'];nodes=actor['nodes'];skin={s['nodeIndex']:s for s in actor['skins']}
        original_positions={};primitive_index=0
        for native_mesh in actor['meshes']:
            rows=skin[native_mesh['nodeIndex']]['influences']
            counters['originalInfluencesChecked']+=sum(len(r) for r in rows)
            for sub in native_mesh['submeshes']:
                if not sub['indices']: continue
                primitive=mesh['primitives'][primitive_index];primitive_index+=1;attrs=primitive['attributes']
                positions=accessor(attrs['POSITION']);normals=accessor(attrs['NORMAL']);uvs=accessor(attrs['TEXCOORD_0'])
                if len(positions)!=len(sub['vertices']): raise ValueError('split vertex count mismatch')
                sets=primitive['extras']['skinAttributeSets']
                joints=[accessor(attrs['JOINTS_'+str(s)]) for s in range(sets)]
                weights=[accessor(attrs['WEIGHTS_'+str(s)]) for s in range(sets)]
                first=doc['accessors'][attrs['WEIGHTS_0']];backup=doc['accessors'][attrs['_G3_WEIGHTS_0']]
                if first['bufferView']==backup['bufferView'] or weights[0]!=accessor(attrs['_G3_WEIGHTS_0']):
                    raise ValueError('first native weight backup shares storage or differs')
                counters['distinctFirstWeightBackups']+=1
                for vi,v in enumerate(sub['vertices']):
                    equal_float(positions[vi],translation(v['position']));equal_float(normals[vi],normal(v['normal']))
                    equal_float(uvs[vi],v['uv'][0]);row=rows[v['original']]
                    original_positions[v['original']]=translation(v['position'])
                    mapped=[(joint_index[nodes[i['node']]['name']],i['weight']) for i in row]
                    expected=mapped+[(0,0)]*(sets*4-len(mapped))
                    actual_j=[j for s in range(sets) for j in joints[s][vi]]
                    actual_w=[w for s in range(sets) for w in weights[s][vi]]
                    if actual_j!=[j for j,w in expected]: raise ValueError('native skin joint mapping mismatch')
                    equal_float(actual_w,[w for j,w in expected]);counters['splitInfluencesChecked']+=len(row)
                ix=accessor(primitive['indices']);expected=[]
                for i in range(0,len(sub['indices']),3): expected.extend(reversed(sub['indices'][i:i+3]))
                if ix!=expected: raise ValueError('native triangle winding/index mismatch')
                counters['splitVertices']+=len(positions);counters['triangles']+=len(ix)//3
        # Existing static OBJ stores native original vertices in their source
        # index order. It is an independent Rimy3D conversion of the same input.
        model_key=Path(entry['logical_path']).stem+'_S00';static_model=base/scene['models'][model_key]['obj']
        obj_vertices=[]
        for line in static_model.read_text(encoding='utf8').splitlines():
            if line.startswith('v '): obj_vertices.append([float(x) for x in line[2:].split()[:3]])
        if len(obj_vertices)!=actor['meshes'][0]['originalVertices']: raise ValueError('static original vertex count mismatch')
        for original,expected in original_positions.items():
            if max(abs(a-b) for a,b in zip(obj_vertices[original],expected))>1e-6:
                raise ValueError('native coordinate conversion differs from independent static OBJ')
            counters['staticOriginalVerticesCompared']+=1
    for native_clip,anim in zip(native['motions'],doc['animations']):
        entry=source_entries[native_clip['source']];decoded=read_motion(study/entry['candidate_effective_output'])
        if decoded!=native_clip['decoded']: raise ValueError('raw motion JSON differs from re-decoded original')
        if anim['name']!=native_clip['name']: raise ValueError('native clip identity mismatch')
        motion_parts={p['name']:p for p in decoded['parts']};rig={n['name']:n for n in native['sharedCleanedRig']}
        actual={(doc['nodes'][c['target']['node']]['name'],c['target']['path']):anim['samplers'][c['sampler']] for c in anim['channels']}
        if len(actual)!=len(rig)*3: raise ValueError('incomplete native clip pose coverage')
        for bone,node in rig.items():
            part=motion_parts.get(bone);tracks={t['type']:t for t in part['tracks']} if part else {}
            for typ,path in [('P','translation'),('R','rotation'),('S','scale')]:
                sampler=actual[(bone,path)]
                if sampler['interpolation']!='LINEAR': raise ValueError('unexpected portable interpolation')
                times=accessor(sampler['input']);values=accessor(sampler['output']);track=tracks.get(typ)
                if track and track['keys']:
                    expected_times=[k['time'] for k in track['keys']];expected_values=[k['value'] for k in track['keys']]
                    counters['nativeKeyframesChecked']+=len(expected_times)
                else:
                    default=part['pose'][{'P':'position','R':'rotation','S':'scale'}[typ]] if part else node[path]
                    expected_times=[0,decoded['audit']['duration']];expected_values=[default,default]
                    counters['constantPoseChannelsChecked']+=1
                equal_float(times,expected_times)
                if part:
                    if typ=='P': expected_values=[translation(v) for v in expected_values]
                    elif typ=='R':
                        expected_values=[rotation(v) for v in expected_values]
                        for i in range(1,len(expected_values)):
                            if sum(a*b for a,b in zip(expected_values[i-1],expected_values[i]))<0:
                                expected_values[i]=[-x for x in expected_values[i]]
                if len(values)!=len(expected_values): raise ValueError('portable key count mismatch')
                for a,b in zip(values,expected_values): equal_float(a,b)
    for image in doc['images']:
        p=(out/image['uri']).resolve()
        if not p.is_relative_to(base) or p.relative_to(base).as_posix() not in manifest['dependencies']:
            raise ValueError('unreceipted/nonportable texture URI')
    if counters['triangles']!=manifest['audit']['triangles'] or counters['splitVertices']!=manifest['audit']['vertices']:
        raise ValueError('reported/exported geometry mismatch')
    report={'version':1,'passed':True,'kind':'actual native source byte/geometry/skin/motion audit',
        'manifestSHA256':sha(out/'manifest.json'),'glbSHA256':sha(out/'hero.glb'),'nativeJSONSHA256':sha(out/'hero-native.json'),
        'originalInputFilesChecked':len(manifest['inputs']),'outputsAndDependenciesChecked':len(manifest['outputs'])+len(manifest['dependencies']),
        'counts':counters,'nativeQuaternionInterpolation':'GLB slerp differs from native component-linear; explicitly retained limitation',
        'sourceInstallationModified':False,'gameExecuted':False}
    (out/'audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    print(json.dumps(report,indent=2))


if __name__=='__main__': main()
