"""Capture the original Arena type singleton and its dependency imports."""
import argparse
import hashlib
import json
import re
from pathlib import Path
import read_dialogue_native_evidence as native
from prepare_runtime_admin_source import image_bytes, source_excerpt
GAME_SHA='b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'
def sha(raw):return hashlib.sha256(raw).hexdigest()
def capture(study,output):
    raw=(study/'00_Original_Runtime/Game.dll').read_bytes()
    assert sha(raw)==GAME_SHA
    pe=native.PE(raw)
    audit=native.audit_module(study,'Game_dll','Game.dll',{0x2000d152:'arenaTypeSingleton'})
    getter=audit['methods'][0]
    cleanup=dict(label='arenaTypeCleanup',entryVA='0x20549930',bodyVA='0x20549930',
        bodyRanges='20549930-2054994f',entryChain=[],instructions=[],sourceCGap=True)
    pattern=re.compile(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)')
    with (study/'01_Decompiled_Code/Game_dll/full_disassembly.asm').open('rb') as stream:
        for line in stream:
            match=pattern.fullmatch(line.rstrip(b'\r\n'))
            if not match:continue
            address=int(match[1],16)
            if 0x20549930<=address<=0x2054994f:
                data=bytes.fromhex(match[2].decode())
                assert pe.bytes(address,len(data))==data
                cleanup['instructions'].append(dict(va=f'{address:08x}',bytes=data.hex(),instruction=match[3].decode('utf-8')))
    cursor=0x20549930
    for row in cleanup['instructions']:
        assert int(row['va'],16)==cursor
        cursor+=len(bytes.fromhex(row['bytes']))
    assert cursor==0x20549950
    output.mkdir(parents=True,exist_ok=True)
    methods={}
    for method in [getter,cleanup]:
        body=method['bodyVA'][2:]
        assembly=('\n'.join(row['va']+' | '+row['bytes']+' | '+row['instruction'] for row in method['instructions'])+'\n').encode('utf-8')
        code=b''.join(bytes.fromhex(row['bytes']) for row in method['instructions'])
        refs=dict(assembly=body+'.asm.txt',assemblySha256=sha(assembly))
        (output/refs['assembly']).write_bytes(assembly)
        if not method.get('sourceCGap'):
            c=source_excerpt(study,method).encode('utf-8')
            refs.update(c=body+'.c.txt',cSha256=sha(c))
            (output/refs['c']).write_bytes(c)
        methods[method['label']]=dict(module='Game',entry=method['entryVA'][2:],body=body,
            bodyRanges=method['bodyRanges'],entryChain=method['entryChain'],
            instructionCount=len(method['instructions']),bodyByteCount=len(code),
            bodyInstructionBytesSha256=sha(code),sourceRefs=refs,sourceCGap=method.get('sourceCGap',False))
    data,section=image_bytes(pe,0x207b4f64,64)
    assert data==bytes(64)
    cold=dict(module='Game',address='207b4f64',bytes=64,raw=data.hex(),knownMask='ff'*64,
        sha256=sha(data),section=section,scope='cold-original-image',liveValueCaptured=False)
    names={'207d870c':'??0bCPropertyObjectTypeBase@@IAE@_N@Z',
        '207d8710':'??0bCPropertyObjectFactory@@QAE@ABVbCString@@@Z',
        '207d8714':'?RegisterTemplate@bCPropertyObjectSingleton@@QAE_NPBVbCPropertyObjectTypeBase@@@Z',
        '207d8868':'?GetInstance@bCPropertyObjectSingleton@@SGAAV1@XZ',
        '207d87a0':'??1bCPropertyObjectFactory@@UAE@XZ',
        '207d87a4':'??1bCPropertyObjectTypeBase@@UAE@XZ'}
    imports=[row for row in pe.imports() if row['iatVA'][2:] in names]
    assert len(imports)==len(names)
    for row in imports:
        assert row['module']=='SharedBase.dll' and row['name']==names[row['iatVA'][2:]] and row['ordinal'] is None
    result=dict(schema='gothic3-arena-type-source-v1',inputs=dict(Game=GAME_SHA),methods=methods,
        coldGlobals=dict(arenaTypeAndGuard=cold),imports=dict(Game=imports),
        layout=dict(objectBytes=60,guardOffset=60,baseOffset=0,baseBytes=24,factoryOffset=24,factoryBytes=24,
            untouchedTailOffset=48,untouchedTailBytes=12,typeVtable='2065915c'),
        sourceOnly=True,wholeCrtTraversalCompleted=False,runtimeRegistrationCompleted=False,
        producerSha256=sha(Path(__file__).read_bytes()))
    (output/'source.json').write_bytes((json.dumps(result,indent=2)+'\n').encode('utf-8'))
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    capture(args.study,args.output)
