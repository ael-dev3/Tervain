# SPDX-License-Identifier: GPL-3.0-only
"""Native terrain graph, XIMG and geometry codecs; no native code execution.

Graph layouts reference georgeto/g3dit30113b8254d3e6d0395d8e3c78618a99fbc0a6ca.
Streams reference Baltram/rmtools5525421bf4b22636259bdc0d250ee96a5abcae66.
Tangent/color semantics follow the installed ge_globals.fx/ge_default_3_0.fx.
Unknown graph behavior remains data, never an invented texture or equation.
"""
import io
import json
import math
import re
import struct

from PIL import Image
from read_genome import Reader, read_class
from read_xcmsh import mesh_bounds
from read_xshmat import InlineReader


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False)+'\n').encode('utf-8')


def proxy(raw, position):
    flag=struct.unpack_from('<I',raw,position+20)[0]
    return {'selector':struct.unpack_from('<i',raw,position)[0],
            'token':raw[position+4:position+20].hex(),'valid':bool(flag&255),'validDword':flag}


def typed_value(prop):
    typ=prop['type'];raw=bytes.fromhex(prop['raw'])
    if prop['value'] is not None:return prop['value']
    if typ=='bool':
        assert len(raw)==1 and raw[0] in (0,1);return bool(raw[0])
    if typ=='char':assert len(raw)==1;return raw[0]
    if typ=='float':assert len(raw)==4;return struct.unpack('<f',raw)[0]
    if typ=='bCVector2':assert len(raw)==8;return list(struct.unpack('<ff',raw))
    if typ=='bCFloatColor':
        # First DWORD is a serialized vtable pointer, ignored by the game.
        assert len(raw)==16;return list(struct.unpack_from('<fff',raw,4))
    if typ.startswith('bTPropertyContainer<enum '):
        assert len(raw)==6 and struct.unpack_from('<H',raw)[0]==1
        return struct.unpack_from('<i',raw,2)[0]
    raise ValueError('Undecoded terrain operand '+typ)


def material_graph(data):
    modern=data[:8]==b'GENOMFLE';strings=[]
    end=struct.unpack_from('<I',data,10)[0] if modern else len(data)
    if modern:
        st=Reader(data,offset=end+4);assert st.u8()==1
        strings=[st.take(st.u16()).decode('cp1252') for _ in range(st.u32())]
        assert st.pos==len(data)
    nodes=[]
    for match in re.finditer(bytes.fromhex('010001010001'),data[:end]):
        r=Reader(data,strings,match.start()) if modern else InlineReader(data,offset=match.start())
        probe=Reader(data,strings,match.start()) if modern else InlineReader(data,offset=match.start())
        try:probe.skip(6);name=probe.entry()
        except (ValueError,IndexError,struct.error):continue
        if not name.startswith(('eCShader','eCColorSrc','eCTexCoordSrc')):continue
        cls=read_class(r,False);tail=bytes.fromhex(cls['tail'])
        node={'class':name,'version':cls['version'],'sourceOffset':match.start(),
              'properties':cls['properties'],'values':{p['name']:typed_value(p) for p in cls['properties']},
              'tailRaw':cls['tail']}
        if name=='eCShaderDefault':
            channels=['diffuse','opacity','selfIllumination','specular','specularPower','normal']
            if cls['version']>1:channels.append('distortion')
            node['outputs']={channel:proxy(tail,24*i) for i,channel in enumerate(channels)};own=24*len(channels)
        elif name=='eCColorSrcBlend':
            node['inputs']={channel:proxy(tail,24*i) for i,channel in enumerate(['color1','color2','blend'])};own=72
        elif name=='eCColorSrcCombiner':
            node['inputs']={channel:proxy(tail,24*i) for i,channel in enumerate(['color1','color2'])};own=48
        elif name=='eCColorSrcSampler':
            node['texCoord']=proxy(tail,0);node['samplerType']=struct.unpack_from('<i',tail,24)[0];own=28
        elif name in ('eCColorSrcConstant','eCColorSrcVertexColor'):own=0
        elif name=='eCTexCoordSrcScale':node['texCoord']=proxy(tail,0);own=24
        elif name=='eCTexCoordSrcBumpOffset':
            node['inputs']={'height':proxy(tail,0),'texCoord':proxy(tail,24)};own=48
        else:raise ValueError('Unsupported terrain graph class '+name)
        assert struct.unpack_from('<HH',tail,own)==(1,1)
        # ShaderBase additionally owns the serialized element collection.
        assert len(tail)>=own+40 if name=='eCShaderDefault' else len(tail)==own+40
        node['id']=tail[own+4:own+20].hex()
        node['tokenValidDword']=struct.unpack_from('<I',tail,own+20)[0]
        nodes.append(node)
    known={node['id'] for node in nodes}
    if len(known)!=len(nodes):raise ValueError('Duplicate native graph token')
    for node in nodes:
        links=list(node.get('inputs',{}).values())+list(node.get('outputs',{}).values())
        if 'texCoord' in node:links.append(node['texCoord'])
        for link in links:
            if link['valid'] and link['token'] not in known:raise ValueError('Missing valid native graph link')
    shaders=[n for n in nodes if n['class']=='eCShaderDefault']
    assert len(shaders)==1
    return nodes,shaders[0]['id']


def ximg_png(data):
    assert data[38:43]==b'G3IMG'
    width,height=struct.unpack_from('<II',data,47);count=struct.unpack_from('<I',data,63)[0]
    assert width>0 and height>0 and count>0
    fourcc=data[71:75];assert fourcc in (b'DXT1',b'DXT3',b'DXT5')
    end=struct.unpack_from('<I',data,10)[0];assert data[end:end+4]==bytes.fromhex('efbeadde')
    w,h=width,height;sizes=[]
    for _ in range(count):
        sizes.append(((w+3)//4)*((h+3)//4)*(8 if fourcc==b'DXT1' else 16));w=max(1,w//2);h=max(1,h//2)
    assert 87+sum(sizes)==end
    pieces=[];offset=87
    for size in reversed(sizes):pieces.append(data[offset:offset+size]);offset+=size
    header=bytearray(128);header[:4]=b'DDS '
    struct.pack_into('<7I',header,4,124,0xa1007 if count>1 else 0x81007,height,width,sizes[0],0,count)
    struct.pack_into('<II',header,76,32,4);header[84:88]=fourcc
    struct.pack_into('<I',header,108,0x401008 if count>1 else 0x1000)
    dds=bytes(header)+b''.join(reversed(pieces))
    with Image.open(io.BytesIO(dds)) as image:
        rgba=image.convert('RGBA');pixels=rgba.tobytes();buffer=io.BytesIO()
        rgba.save(buffer,format='PNG',optimize=True);png=buffer.getvalue()
    with Image.open(io.BytesIO(png)) as image:
        assert image.size==(width,height) and image.convert('RGBA').tobytes()==pixels
    return png,pixels,{'width':width,'height':height,'format':fourcc.decode(),
        'nativeMipCount':count,'hostedMipCount':1,'nativeCompressedMipBytes':sizes,'flipY':False,
        'nativeMipPayloadOrder':'smallest-to-largest','rgbaBytes':len(pixels),
        'pixelConversion':'Original largest native DXT mip decoded to RGBA8; no gamma/colorspace or lossy conversion.',
        'runtimeMipLimit':'Original lower mips are not hosted; any generated GPU mipchain is a new browser policy.'}


def geometry_glb(sections,name,material_ids):
    low,high=mesh_bounds(sections);center=[(low[i]+high[i])/2 for i in range(3)]
    binary=bytearray();views=[];accessors=[];primitives=[];materials=[]
    max_position_error=0.;stream_summary={}
    def accessor(data,count,width,component=5126,target=34962,minimum=None,maximum=None):
        binary.extend(b'\0'*((-len(binary))%4));offset=len(binary);binary.extend(data)
        views.append({'buffer':0,'byteOffset':offset,'byteLength':len(data),'target':target})
        record={'bufferView':len(views)-1,'componentType':component,'count':count,
                'type':{1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4'}[width]}
        if minimum is not None:record['min']=minimum;record['max']=maximum
        accessors.append(record);return len(accessors)-1
    for section,material_id in zip(sections,material_ids,strict=True):
        streams=section['streams'];count=streams[1]['count'];attributes={}
        native=list(struct.iter_unpack('<fff',streams[1]['data']))
        pos=[[(v[i]-center[i])/100*(-1 if i==2 else 1) for i in range(3)] for v in native]
        if not all(math.isfinite(x) for p in pos for x in p):raise ValueError('Nonfinite native position')
        pb=b''.join(struct.pack('<fff',*v) for v in pos)
        rounded=list(struct.iter_unpack('<fff',pb))
        max_position_error=max(max_position_error,max((abs(a-b) for p,q in zip(pos,rounded) for a,b in zip(p,q)),default=0))
        attributes['POSITION']=accessor(pb,count,3,
            minimum=[min(v[i] for v in rounded) for i in range(3)],maximum=[max(v[i] for v in rounded) for i in range(3)])
        for typ,stream in streams.items():
            stream_summary[str(typ)]=stream_summary.get(str(typ),0)+len(stream['data'])
            if typ in (0,1):continue
            if stream['count']!=count:raise ValueError('Native per-vertex stream count mismatch')
            if typ in (3,64):
                rows=list(struct.iter_unpack('<fff',stream['data']))
                if not all(math.isfinite(v) for row in rows for v in row):raise ValueError('Nonfinite native direction')
                value=b''.join(struct.pack('<fff',x,y,-z) for x,y,z in rows)
                attributes['NORMAL' if typ==3 else '_G3_TANGENT']=accessor(value,count,3)
            elif typ in (12,15,18,21):
                if not all(math.isfinite(v) for row in struct.iter_unpack('<ff',stream['data']) for v in row):raise ValueError('Nonfinite native UV')
                attributes['TEXCOORD_'+str((typ-12)//3)]=accessor(stream['data'],count,2)
            elif typ in (4,5):
                attributes['_G3_BGRA' if typ==4 else '_G3_SPECULAR_BGRA']=accessor(stream['data'],count,4,5121)
            else:raise ValueError('Unsupported native terrain stream '+str(typ))
        ids=struct.unpack('<'+'I'*streams[0]['count'],streams[0]['data'])
        assert len(ids)%3==0 and max(ids,default=0)<count
        reflected=[i for j in range(0,len(ids),3) for i in reversed(ids[j:j+3])]
        component=5123 if max(ids,default=0)<=65535 else 5125;fmt='H' if component==5123 else 'I'
        index=accessor(struct.pack('<'+fmt*len(reflected),*reflected),len(reflected),1,component,34963)
        materials.append({'name':section['material'],'pbrMetallicRoughness':{'metallicFactor':0,'roughnessFactor':1},
            'extras':{'nativeMaterialId':material_id,'nativeGraphRequired':True,
                     'appearance':'Placeholder; native graph must be installed by the runtime adapter.'}})
        primitives.append({'attributes':attributes,'indices':index,'mode':4,'material':len(materials)-1})
    binary.extend(b'\0'*((-len(binary))%4))
    doc={'asset':{'version':'2.0','generator':'Tervain original Gothic 3 terrain converter'},
        'buffers':[{'byteLength':len(binary)}],'bufferViews':views,'accessors':accessors,
        'materials':materials,'meshes':[{'name':name,'primitives':primitives}],
        'nodes':[{'mesh':0,'name':name,'translation':[center[0]/100,center[1]/100,-center[2]/100]}],
        'scenes':[{'nodes':[0]}],'scene':0,'extras':{'nativeTopologyPreserved':True,
            'coordinateConversion':'Centered locally, absolute root; native centimetres (x,y,z) -> browser metres (x,y,-z)/100.',
            'materialFidelity':'Source graph is separate; generic glTF material is only a placeholder.'}}
    jb=json_bytes(doc);jb+=b' '*((-len(jb))%4)
    glb=struct.pack('<III',0x46546c67,2,28+len(jb)+len(binary))
    glb+=struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(binary),0x004e4942)+binary
    return glb,{'centerMetres':[center[0]/100,center[1]/100,-center[2]/100],
        'vertices':sum(s['streams'][1]['count'] for s in sections),
        'triangles':sum(s['streams'][0]['count']//3 for s in sections),
        'primitiveCount':len(sections),'binaryBytes':len(binary),'sourceStreamBytes':stream_summary,
        'maxPositionRoundingErrorMetres':max_position_error}
