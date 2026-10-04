# SPDX-License-Identifier: GPL-3.0-only
"""Bounded, read-only native Gothic 3 FXA/XACT and LMA/XMOT decoder.

Format references: georgeto/g3dit 30113b8254d3e6d0395d8e3c78618a99fbc0a6ca,
LrentNode/archive/animation/{Chunks,eCResourceAnimationActor_PS,
eCResourceAnimationMotion_PS}.java; Baltram/rmtools
5525421bf4b22636259bdc0d250ee96a5abcae66, mi_xactreader.cpp. GPL-3.0.
No native executable is invoked. Unknown chunk payloads are identified by SHA;
supported chunks are decoded to their exact boundary, including skin weights.
"""
import hashlib
import math
import struct
from pathlib import Path


class Reader:
    def __init__(self, data, pos=0, end=None, strings=()):
        self.data, self.pos = data, pos
        self.end = len(data) if end is None else end
        self.strings = strings
        if not 0 <= pos <= self.end <= len(data):
            raise ValueError('invalid reader boundary')

    def take(self, size):
        if size < 0 or self.pos + size > self.end:
            raise ValueError(f'out of bounds read at {self.pos}: {size} (end {self.end})')
        result = self.data[self.pos:self.pos+size]
        self.pos += size
        return result

    def skip(self, size): self.take(size)
    def unpack(self, fmt): return struct.unpack('<'+fmt, self.take(struct.calcsize('<'+fmt)))
    def u8(self): return self.unpack('B')[0]
    def u16(self): return self.unpack('H')[0]
    def u32(self): return self.unpack('I')[0]
    def u64(self): return self.unpack('Q')[0]
    def f32(self): return self.vec(1)[0]
    def vec(self, size):
        value = list(self.unpack('f'*size))
        if not all(math.isfinite(x) for x in value):
            raise ValueError(f'nonfinite float at {self.pos-size*4}')
        return value
    def text(self): return self.take(self.u32()).decode('cp1252')
    def entry(self):
        index = self.u16()
        if index >= len(self.strings): raise ValueError(f'invalid string-table index {index}')
        return self.strings[index]
    def done(self):
        if self.pos != self.end: raise ValueError(f'unconsumed bytes {self.pos}..{self.end}')


def genome(data):
    r = Reader(data)
    if r.take(8) != b'GENOMFLE': raise ValueError('expected native GENOMFLE')
    version, end = r.u16(), r.u32()
    if data[end:end+4] != bytes.fromhex('efbeadde'): raise ValueError('missing Genome terminator')
    st = Reader(data, end+4)
    if st.u8() != 1: raise ValueError('unsupported string table')
    strings = [st.take(st.u16()).decode('cp1252') for _ in range(st.u32())]
    st.done()
    return Reader(data, 14, end, strings), {'genomeVersion':version,'dataEnd':end,'stringCount':len(strings)}


def chunk_records(r, end):
    while r.pos < end:
        offset = r.pos
        ident, size, version = r.u32(), r.u32(), r.u32()
        payload = Reader(r.data, r.pos, r.pos+size, r.strings)
        if payload.end > end: raise ValueError('chunk exceeds wrapper boundary')
        info = {'id':ident,'version':version,'offset':offset,'payloadOffset':r.pos,
                'bytes':size,'sha256':hashlib.sha256(r.data[r.pos:r.pos+size]).hexdigest()}
        yield info, payload
        payload.done()
        r.pos += size
    if r.pos != end: raise ValueError('chunk stream does not finish at wrapper boundary')


def required_version(info, expected):
    if info['version'] != expected:
        raise ValueError(f'unsupported chunk {info["id"]} version {info["version"]}')


def actor_wrapper(r):
    wrapper_offset = r.pos
    if r.take(4) != b'gena' or r.u16() != 4: raise ValueError('unsupported actor wrapper')
    size = r.u32(); payload_offset = r.pos; end = r.pos+size
    if r.take(6) != b'FXA \x01\x01': raise ValueError('unsupported FXA version')
    result = {'wrapperOffset':wrapper_offset,'payloadOffset':payload_offset,'payloadBytes':size,
              'nodes':[],'meshes':[],'skins':[],'materials':[],'chunks':[]}
    for info, p in chunk_records(r,end):
        ident = info['id']; result['chunks'].append(info)
        if ident == 0:
            required_version(info,3)
            node = {'position':p.vec(3),'rotation':p.vec(4),'scaleOrient':p.vec(4),
                    'scale':p.vec(3),'shear':p.vec(3),'name':p.text(),'parent':p.text(),
                    'sourceOffset':info['offset']}
            if not node['name']: raise ValueError('empty node name')
            result['nodes'].append(node)
        elif ident == 3:
            required_version(info,3)
            node, original, total, indices, submeshes, uv = p.unpack('6I')
            collision = p.u8(); padding = p.take(3)
            if collision not in (0,1) or not 0 <= uv <= 8: raise ValueError('invalid mesh header')
            mesh = {'nodeIndex':node,'originalVertices':original,'splitVertices':total,
                    'indexCount':indices,'uvSets':uv,'collision':bool(collision),
                    'sourceOffset':info['offset'],'submeshes':[]}
            for _ in range(submeshes):
                material, sub_uv = p.u8(), p.u8(); p.skip(2)
                ni, nv = p.u32(), p.u32()
                if ni%3: raise ValueError('nontriangular submesh')
                vertices = []
                for _ in range(nv):
                    org = p.u32()
                    if org >= original: raise ValueError('skin source vertex out of range')
                    vertices.append({'original':org,'position':p.vec(3),'normal':p.vec(3),
                                     'uv':[p.vec(2) for _ in range(uv)]})
                ix = list(p.unpack('I'*ni))
                if any(i >= nv for i in ix): raise ValueError('split vertex index out of range')
                mesh['submeshes'].append({'material':material,'storedUVSets':sub_uv,
                                          'vertices':vertices,'indices':ix})
            if sum(len(s['vertices']) for s in mesh['submeshes']) != total:
                raise ValueError('mesh vertex totals disagree')
            if sum(len(s['indices']) for s in mesh['submeshes']) != indices:
                raise ValueError('mesh index totals disagree')
            result['meshes'].append(mesh)
        elif ident == 4:
            required_version(info,1)
            skin = {'nodeIndex':p.u32(),'influences':[],'sourceOffset':info['offset']}
            while p.pos < p.end:
                row = []
                for _ in range(p.u8()):
                    node = p.u16(); padding = p.take(2); weight = p.f32()
                    if weight < 0: raise ValueError('negative skin weight')
                    row.append({'node':node,'weight':weight,'padding':padding.hex()})
                skin['influences'].append(row)
            result['skins'].append(skin)
        elif ident == 6:
            required_version(info,5)
            material = {'ambient':p.vec(3),'diffuse':p.vec(3),'specular':p.vec(3),'emissive':p.vec(3),
                        'shine':p.f32(),'shineStrength':p.f32(),'opacity':p.f32(),'ior':p.f32(),
                        'doubleSided':bool(p.u8()),'wireFrame':bool(p.u8()),
                        'transparencyType':p.take(1).decode('ascii'),'padding':p.u8(),
                        'name':p.text(),'shader':p.text(),'textures':[]}
            result['materials'].append(material)
        elif ident == 7:
            if not result['materials']: raise ValueError('texture precedes material')
            typ = p.u8(); opaque = p.take(27)
            result['materials'][-1]['textures'].append({'type':typ,'path':p.text(),'opaque':opaque.hex()})
        else:
            info['interpretation'] = 'opaque'
            p.pos = p.end
    result['materialReferences'] = [
        {'lod':r.u16(),'material':r.u16(),'name':r.entry()} for _ in range(r.u32())]
    ao = []
    r.u8()  # bTArray serialization prefix, g3dit G3FileReader.skipListPrefix.
    for _ in range(r.u32()):
        r.u8(); count = r.u32()
        ao.append(list(r.unpack('I'*count)))
    result['ambientOcclusion'] = ao
    result['tangentVertices'] = [[r.vec(3) for _ in row] for row in ao]
    result['wrapperEnd'] = r.pos
    validate_actor(result)
    return result


def validate_actor(actor):
    nodes = actor['nodes']; by_name = {n['name']:n for n in nodes}
    if len(by_name) != len(nodes): raise ValueError('duplicate actor node name')
    for node in nodes:
        ancestors = set(); cur = node
        while cur['parent']:
            if cur['name'] in ancestors: raise ValueError('cyclic hierarchy')
            ancestors.add(cur['name'])
            if cur['parent'] not in by_name: raise ValueError('missing parent')
            cur = by_name[cur['parent']]
        if abs(sum(x*x for x in node['rotation'])-1)>1e-4: raise ValueError('nonunit node quaternion')
    meshes = {m['nodeIndex']:m for m in actor['meshes']}
    if len(meshes) != len(actor['meshes']): raise ValueError('duplicate mesh-node binding')
    all_rows = []
    for skin in actor['skins']:
        if skin['nodeIndex'] not in meshes: raise ValueError('skin refers to absent mesh')
        if len(skin['influences']) != meshes[skin['nodeIndex']]['originalVertices']:
            raise ValueError('original-vertex/skin count mismatch')
        for row in skin['influences']:
            if not row or any(i['node'] >= len(nodes) for i in row): raise ValueError('invalid skin bone')
            if abs(sum(i['weight'] for i in row)-1)>1e-4: raise ValueError('unnormalized native skin weights')
            all_rows.append(row)
    for mesh in actor['meshes']:
        if mesh['nodeIndex'] >= len(nodes): raise ValueError('mesh node index out of range')
        if any(s['material'] >= len(actor['materials']) for s in mesh['submeshes']):
            raise ValueError('material index out of range')
    actor['audit'] = {'nodes':len(nodes),'meshes':len(meshes),
        'triangles':sum(m['indexCount']//3 for m in meshes.values()),
        'originalVertices':sum(m['originalVertices'] for m in meshes.values()),
        'splitVertices':sum(m['splitVertices'] for m in meshes.values()),
        'skinRows':len(all_rows),'influences':sum(len(r) for r in all_rows),
        'maxInfluences':max(map(len,all_rows),default=0),
        'maxWeightSumError':max((abs(sum(i['weight'] for i in row)-1) for row in all_rows),default=0),
        'maxScaleDeviation':max((abs(s-1) for n in nodes for s in n['scale']),default=0),
        'maxShear':max((abs(s) for n in nodes for s in n['shear']),default=0)}


def read_actor(path):
    data = Path(path).read_bytes(); r, header = genome(data)
    version = r.u16()
    if version != 54: raise ValueError(f'unsupported actor resource version {version}')
    header.update({'resourceVersion':version,'resourceSize':r.u32(),'priority':r.f32(),
        'nativeFileTime':r.u64(),'nativeFileSize':r.u32(),'boundary':r.vec(6)})
    constraints = [{'node':r.entry(),'speed':r.f32(),'min':r.vec(3),'max':r.vec(3)} for _ in range(r.u32())]
    lods = [actor_wrapper(r) for _ in range(r.u32())]
    actor = actor_wrapper(r); r.done()
    return {'header':header,'lookAtConstraints':constraints,'lods':lods,'actor':actor}


def read_motion(path):
    data = Path(path).read_bytes(); r, header = genome(data)
    version = r.u16()
    if version < 1 or version > 5: raise ValueError(f'unsupported motion resource version {version}')
    header.update({'resourceVersion':version,'resourceSize':r.u32(),'priority':r.f32(),
        'nativeFileTime':r.u64(),'nativeFileSize':r.u32()})
    if version >= 3: header['unknownFileTime'] = r.u64()
    effects = [{'keyFrame':r.u16(),'name':r.entry()} for _ in range(r.u16())] if version >= 2 else []
    size = r.u32(); offset = r.pos; end = r.pos+size
    if r.take(7) != b'LMA \x01\x01\x00': raise ValueError('unsupported motion wrapper')
    result = {'header':header,'payloadOffset':offset,'payloadBytes':size,'frameEffects':effects,
              'parts':[],'chunks':[]}
    for info, p in chunk_records(r,end):
        result['chunks'].append(info)
        if info['id'] == 1:
            required_version(info,3)
            part = {'pose':{'position':p.vec(3),'rotation':p.vec(4),'scale':p.vec(3)},
                    'bindPose':{'position':p.vec(3),'rotation':p.vec(4),'scale':p.vec(3)},
                    'name':p.text(),'sourceOffset':info['offset'],'tracks':[]}
            result['parts'].append(part)
        elif info['id'] == 2:
            required_version(info,1)
            if not result['parts']: raise ValueError('keyframe chunk precedes motion part')
            count = p.u32(); interpolation = p.take(1).decode('ascii'); typ = p.take(1).decode('ascii'); p.skip(2)
            if typ not in 'PRS' or interpolation not in 'LBT': raise ValueError('unknown track type')
            track = {'type':typ,'interpolation':interpolation,'sourceOffset':info['offset'],'keys':[]}
            previous = -math.inf
            for _ in range(count):
                time = p.f32(); value = p.vec(4 if typ == 'R' else 3)
                if time < 0 or time <= previous: raise ValueError('nonascending native key times')
                if typ == 'R' and abs(sum(x*x for x in value)-1)>1e-3: raise ValueError('nonunit motion quaternion')
                previous = time
                track['keys'].append({'time':time,'value':value})
            result['parts'][-1]['tracks'].append(track)
        else:
            info['interpretation'] = 'opaque'; p.pos = p.end
    r.done()
    names = [p['name'] for p in result['parts']]
    if len(names) != len(set(names)): raise ValueError('duplicate motion-part name')
    tracks = [t for p in result['parts'] for t in p['tracks']]
    for part in result['parts']:
        if len({t['type'] for t in part['tracks']}) != len(part['tracks']): raise ValueError('duplicate part channel')
    result['audit'] = {'parts':len(names),'tracks':len(tracks),
        'keyframes':sum(len(t['keys']) for t in tracks),
        'duration':max((k['time'] for t in tracks for k in t['keys']),default=0),
        'interpolations':sorted({t['interpolation'] for t in tracks}),
        'unknownChunks':[i for i in result['chunks'] if i.get('interpretation') == 'opaque']}
    return result
