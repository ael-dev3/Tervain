"""Capture the original 25..32-byte pools required by component class names."""
import argparse
import hashlib
import json
import re
import struct
from pathlib import Path
import read_dialogue_native_evidence as native
import prepare_npc_heap_source as helpers

METHODS = {'heap28PoolDispatch': (268458342, [(268730608, 268730649), (268730656, 268730735)]),
 'heap28BitmapAlloc': (268442482, [(268690080, 268690214)]),
 'heap28BlockInitialize': (268450267, [(268722288, 268722478)]),
 'heap28Free': (268452717, [(268714816, 268714890)]),
 'heap28Realloc': (268446297, [(268714912, 268714979)]),
 'heap28PoolShutdown': (268443227,
                        [(268697632, 268697689), (268697696, 268697788), (268697792, 268697843)]),
 'heap28Statistics': (268452787, [(268697904, 268697995)]),
 'heap32PoolDispatch': (268468562, [(268730768, 268730809), (268730816, 268730895)]),
 'heap32BitmapAlloc': (268444257, [(268690256, 268690390)]),
 'heap32BlockInitialize': (268444312, [(268722528, 268722708)]),
 'heap32Free': (268440477, [(268715008, 268715069)]),
 'heap32Realloc': (268464262, [(268715088, 268715200)]),
 'heap32PoolShutdown': (268448862,
                        [(268698032, 268698089), (268698096, 268698188), (268698192, 268698243)]),
 'heap32Statistics': (268454987, [(268698304, 268698375)])}

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
    pools={'28': {'stride': 28,
            'minimumRequest': 25,
            'maximumRequest': 28,
            'regionBytes': 1835008,
            'capacity': 65244,
            'bitmapOffset': 1826848,
            'bitmapBytes': 8156,
            'lastBitmapMask': 268435455,
            'payloadBytes': 1826832,
            'globals': {'count': '102ffd7c',
                        'list': '102ffd80',
                        'peak': '102ffd84',
                        'descriptor': '102ffefc'},
            'callbacks': ['1000436d', '10002a59', '10001e5b', '100043b3']},
     '32': {'stride': 32,
            'minimumRequest': 29,
            'maximumRequest': 32,
            'regionBytes': 1048576,
            'capacity': 32640,
            'bitmapOffset': 1044496,
            'bitmapBytes': 4080,
            'lastBitmapMask': 4294967295,
            'payloadBytes': 1044480,
            'globals': {'count': '102ffd88',
                        'list': '102ffd8c',
                        'peak': '102ffd90',
                        'descriptor': '102fff00'},
            'callbacks': ['1000139d', '10007086', '1000345e', '10004c4b']}}
    table=pe.bytes(0x102fb050,4097*4)
    constants={}; buckets={}
    for pool,values in pools.items():
        dispatch=int(methods['heap'+pool+'PoolDispatch']['entry'],16)
        assert all(struct.unpack_from('<I',table,i*4)[0] == dispatch for i in range(values['minimumRequest'],values['maximumRequest']+1))
        assert all(struct.unpack_from('<I',table,i*4)[0] != dispatch for i in [values['minimumRequest']-1,values['maximumRequest']+1])
        core=[r for name,m in methods.items() if name in ['heap'+pool+suffix for suffix in ['PoolDispatch','BitmapAlloc','BlockInitialize']] for r in m['instructions']]
        proofs={}
        for field in ['regionBytes','bitmapOffset','bitmapBytes','lastBitmapMask','payloadBytes']:
            proofs[field]=[r for r in core if struct.pack('<I',values[field]).hex() in r['bytes']]
            if pool=='32' and field=='lastBitmapMask':
                proofs[field]=[r for r in core if r['va']=='100461cd' and r['bytes']=='6aff']
            assert proofs[field],(pool,field)
        code=b''.join(bytes.fromhex(r['bytes']) for r in core)
        assert all(struct.pack('<I',int(c,16)) in code for c in values['callbacks'])
        address={'28':0x100e7ac0,'32':0x100e7ac8}[pool]
        for suffix,word,value in [('Stride',address,values['stride']),('Capacity',address+4,values['capacity'])]:
            raw=pe.bytes(word,4); assert struct.unpack('<I',raw)[0] == value
            constants['heap'+pool+suffix]=dict(address=f'{word:08x}',raw=raw.hex(),value=value,sha256=helpers.sha(raw))
        buckets[pool]=dict(values,operandProofs=proofs,strideReceipt='heap'+pool+'Stride',capacityReceipt='heap'+pool+'Capacity')
    cold={name:helpers.cold(pe,address,size,'SharedBase') for name,address,size in
        [('heap28PoolGlobals',0x102ffd7c,12),('heap28DescriptorSlot',0x102ffefc,4),
         ('heap32PoolGlobals',0x102ffd88,12),('heap32DescriptorSlot',0x102fff00,4)]}
    return dict(schema='gothic3-component-heap-rules-v1',baseRulesSha256=helpers.BASE_RULES,
        inputs=dict(SharedBase=helpers.SHARED,Engine=helpers.ENGINE),methods=methods,coldGlobals=cold,constWords=constants,
        capturedPools=buckets, buckets={'32':buckets['32']},
        sourceOnly=True, runtimeConnected=False,
        producerSha256=helpers.sha(Path(__file__).read_bytes()),assemblySha256=helpers.sha(asm))

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    result=capture(args.study)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Verified original heap28/32 geometry and',sum(len(m['instructions']) for m in result['methods'].values()),'instructions')
