# SPDX-License-Identifier: GPL-3.0-only
"""Read native sampler properties in old and GENOMFLE .xshmat files.

Binary class layouts and enum values reference georgeto/g3dit commit
30113b8254d3e6d0395d8e3c78618a99fbc0a6ca. Sampler switching uses native
Engine.dll eCColorSrcSampler::SetSwitch (30046a7e): zero-based switches and
contiguous S1..Sn, with Repeat/Clamp/PingPong. Native PingPong uses count-1.
The shader graph itself remains outside this browser slice.
"""
import re
import struct
from pathlib import Path
from read_genome import Reader, read_class


class InlineReader(Reader):
    def entry(self): return self.take(self.u16()).decode('cp1252')
    def property_entry(self, raw):
        # Legacy native entries store uint16 length followed by bytes. In
        # particular 00 00 is an empty entry, never a string-table index.
        r=InlineReader(raw)
        value=r.entry()
        assert r.pos==len(raw)
        return value


def read_material(path):
    data=Path(path).read_bytes()
    modern=data[:8]==b'GENOMFLE'; strings=[]; end=len(data)
    if modern:
        end=struct.unpack_from('<I',data,10)[0]
        st=Reader(data,offset=end+4)
        assert st.u8()==1
        strings=[st.take(st.u16()).decode('cp1252') for _ in range(st.u32())]
        assert st.pos==len(data)
    samplers=[]; shader=None; parsed_classes=[]
    for match in re.finditer(bytes.fromhex('010001010001'),data[:end]):
        reader=Reader(data,strings,match.start()) if modern else InlineReader(data,offset=match.start())
        probe=Reader(data,strings,match.start()) if modern else InlineReader(data,offset=match.start())
        try:
            probe.skip(6); candidate_name=probe.entry()
        except (ValueError,IndexError,struct.error): continue
        try: cls=read_class(reader,False)
        except (AssertionError,ValueError,IndexError,struct.error) as error:
            if candidate_name.startswith(('eCShader','eCColorSrc','eCResourceShader')):
                raise ValueError(f'cannot decode native material class {candidate_name} at {match.start()} in {path}') from error
            continue
        parsed_classes.append({'name':cls['name'],'sourceOffset':match.start()})
        props={p['name']:p for p in cls['properties']}
        if cls['name'].startswith('eCShader') and 'BlendMode' in props and 'MaskReference' in props:
            raw=bytes.fromhex(props['BlendMode']['raw'])
            assert len(raw)==6 and struct.unpack_from('<H',raw)[0]==1
            mask=bytes.fromhex(props['MaskReference']['raw'])
            assert len(mask)==1
            shader={'class':cls['name'],'sourceOffset':match.start(),
                'blendMode':struct.unpack_from('<i',raw,2)[0],'maskReference':mask[0]}
        if cls['name']!='eCColorSrcSampler': continue
        image=props['ImageFilePath']['value']
        if image is None:
            raw=bytes.fromhex(props['ImageFilePath']['raw'])
            size=struct.unpack_from('<H',raw)[0]
            assert len(raw)==size+2
            image=raw[2:].decode('cp1252')
        raw=bytes.fromhex(props['SwitchRepeat']['raw'])
        assert len(raw)==6 and struct.unpack_from('<H',raw)[0]==1
        repeat=struct.unpack_from('<i',raw,2)[0]
        assert repeat in (0,1,2)
        samplers.append({'image':image,'switchRepeat':repeat,'sourceOffset':match.start()})
    known_shader=any(c['name'].startswith('eCShader') for c in parsed_classes)
    if known_shader and shader is None:
        raise ValueError(f'native shader class has no decoded BlendMode/MaskReference in {path}')
    return {'samplers':samplers,'shader':shader,'classes':parsed_classes}


def read_samplers(path): return read_material(path)['samplers']


def switched_image(image,material_switch,repeat,available):
    """Return exact native switched name and evidence about its S1..Sn range."""
    stem=Path(image.replace('\\','/')).stem
    if not stem.lower().endswith('_s1') or material_switch==0: return image, None
    base=stem[:-1]; count=0
    while (base+str(count+1)+'.ximg').lower() in available: count+=1
    if not count: return image, {'textureCount':0,'textureIndex':None}
    if repeat==0: index=material_switch%count
    elif repeat==1: index=max(0,min(material_switch,count-1))
    elif repeat==2:
        if count==1: index=0
        else:
            quotient,index=divmod(material_switch,count-1)
            if quotient&1: index=count-1-index
    else: raise ValueError('unsupported native SwitchRepeat')
    selected=base+str(index+1)+Path(image).suffix
    return selected, {'textureCount':count,'textureIndex':index}
