"""Capture the original 49..56-byte pool required by pointer class names."""
import argparse
import hashlib
import json
import re
import struct
from pathlib import Path
import read_dialogue_native_evidence as native
import prepare_npc_heap_source as helpers

METHODS = {
    'heap56PoolDispatch': (0x1000196a, [(0x10048370,0x10048399),(0x100483a0,0x100483ef)]),
    'heap56BitmapAlloc': (0x100014dd, [(0x1003e560,0x1003e5e6)]),
    'heap56BlockInitialize': (0x10001645, [(0x10046430,0x100464ee)]),
    'heap56Free': (0x10007f1d, [(0x10044660,0x100446aa)]),
    'heap56Realloc': (0x1000112c, [(0x100446c0,0x10044703)]),
    'heap56PoolShutdown': (0x100059b1, [(0x10040610,0x10040649),(0x10040650,0x100406ac),(0x100406b0,0x100406e3)]),
    'heap56Statistics': (0x1000486d, [(0x10040720,0x1004077f)]),
}

def capture(study):
    image = (study/'00_Original_Runtime/SharedBase.dll').read_bytes()
    assert helpers.sha(image) == helpers.SHARED
    assert helpers.sha((study/'00_Original_Runtime/Engine.dll').read_bytes()) == helpers.ENGINE
    pe = native.PE(image)
    asm = (study/'01_Decompiled_Code/SharedBase_dll/full_disassembly.asm').read_bytes()
    parsed = []
    for line,text in enumerate(asm.decode().splitlines(),1):
        match = re.fullmatch(r'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)',text)
        if match: parsed.append((int(match[1],16),match[2],match[3],line))
    methods = {}
    for label,(entry,ranges) in METHODS.items():
        alias = pe.bytes(entry,5)
        assert alias[0] == 0xe9 and entry+5+struct.unpack('<i',alias[1:])[0] == ranges[0][0]
        rows=[]
        for start,end in ranges:
            cursor=start
            for address,raw,instruction,line in parsed:
                if start <= address <= end:
                    data=bytes.fromhex(raw)
                    assert address == cursor and pe.bytes(address,len(data)) == data,(label,hex(cursor),hex(address))
                    rows.append(dict(va=f'{address:08x}',bytes=raw,instruction=instruction,assemblyLine=line))
                    cursor+=len(data)
            assert cursor == end+1,(label,hex(cursor),hex(end))
        methods[label]=dict(entry=f'{entry:08x}',body=f'{ranges[0][0]:08x}',entryBytes=alias.hex(),
            instructions=rows,bodyInstructionBytesSha256=helpers.sha(b''.join(bytes.fromhex(r['bytes']) for r in rows)))
    values=dict(stride=56,minimumRequest=49,maximumRequest=56,regionBytes=0x1c0000,
        capacity=0x7fb6,bitmapOffset=0x1befe0,bitmapBytes=0xff8,lastBitmapMask=0x3fffff,
        payloadBytes=0x1befd0,globals=dict(count='102ffdac',list='102ffdb0',peak='102ffdb4',descriptor='102fff0c'),
        callbacks=['10007f1d','1000112c','100059b1','1000486d'])
    table=pe.bytes(0x102fb050,4097*4)
    assert all(struct.unpack_from('<I',table,i*4)[0] == 0x1000196a for i in range(49,57))
    assert all(struct.unpack_from('<I',table,i*4)[0] != 0x1000196a for i in [48,57])
    core=[r for name,m in methods.items() if name in ['heap56PoolDispatch','heap56BitmapAlloc','heap56BlockInitialize'] for r in m['instructions']]
    proofs={}
    for field in ['regionBytes','bitmapOffset','bitmapBytes','lastBitmapMask','payloadBytes']:
        proofs[field]=[r for r in core if struct.pack('<I',values[field]).hex() in r['bytes']]
        assert proofs[field],field
    code=b''.join(bytes.fromhex(r['bytes']) for r in core)
    assert all(struct.pack('<I',int(c,16)) in code for c in values['callbacks'])
    constants={}
    for name,address,value in [('heap56Stride',0x100e7ae0,56),('heap56Capacity',0x100e7ae4,0x7fb6)]:
        raw=pe.bytes(address,4); assert struct.unpack('<I',raw)[0] == value
        constants[name]=dict(address=f'{address:08x}',raw=raw.hex(),value=value,sha256=helpers.sha(raw))
    cold={name:helpers.cold(pe,address,size,'SharedBase') for name,address,size in
        [('heap56PoolGlobals',0x102ffdac,12),('heap56DescriptorSlot',0x102fff0c,4)]}
    return dict(schema='gothic3-class-name-heap-rules-v1',baseRulesSha256=helpers.BASE_RULES,
        inputs=dict(SharedBase=helpers.SHARED,Engine=helpers.ENGINE),methods=methods,coldGlobals=cold,constWords=constants,
        buckets={'56':dict(values,operandProofs=proofs,strideReceipt='heap56Stride',capacityReceipt='heap56Capacity')},
        producerSha256=helpers.sha(Path(__file__).read_bytes()),assemblySha256=helpers.sha(asm))

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    result=capture(args.study)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Verified original heap56 geometry and',sum(len(m['instructions']) for m in result['methods'].values()),'instructions')
