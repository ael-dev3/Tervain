"""Capture original Arena property registration dependencies without executing native code."""
import argparse
import hashlib
import json
import struct
from pathlib import Path
import read_dialogue_native_evidence as native
from prepare_runtime_admin_source import INPUT_SHA, source_excerpt

def capture(study, output):
    native.EXPECTED_INPUTS['SharedBase.dll'] = INPUT_SHA
    audit = native.audit_module(study, 'SharedBase_dll', 'SharedBase.dll',
                               {0x100042e6: 'getPropertyTemplateIndex', 0x10006feb: 'registerPropertyTemplate', 0x1000206d: 'unregisterPropertyTemplate', 0x1000349f: 'createProperty', 0x100035ee: 'destroyProperty', 0x10006e83: 'getPropertyName', 0x10005e8e: 'messageDebug', 0x100a7f27: 'messageVsprintf', 0x100a7eab: 'messageVsprintfCore', 0x10005560: 'messageOnMessage'})
    output.mkdir(parents=True, exist_ok=True)
    methods = {}
    for method in audit['methods']:
        address = method['bodyVA'][2:]
        asm = ('\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction']
                         for row in method['instructions']) + '\n').encode()
        c = source_excerpt(study, method).encode()
        (output / (address + '.asm.txt')).write_bytes(asm)
        (output / (address + '.c.txt')).write_bytes(c)
        methods[method['label']] = {key: method[key] for key in
            ['entryVA', 'bodyVA', 'bodyRanges', 'instructionCount', 'bodyByteCount',
             'bodyInstructionBytesSha256', 'entryChain']}
        methods[method['label']].update(assemblySha256=hashlib.sha256(asm).hexdigest(),
                                       cSha256=hashlib.sha256(c).hexdigest())
    pe = native.PE((study / '00_Original_Runtime/SharedBase.dll').read_bytes())
    rva, size = struct.unpack_from('<II', pe.data, pe.optional + 96 + 9 * 8)
    assert size == 24
    directory = pe.bytes(pe.base + rva,24)
    start, end, index, callbacks, zero_fill, characteristics = struct.unpack('<6I',directory)
    assert (start,end,index,callbacks,zero_fill,characteristics) == (0x10301000,0x103016d4,0x102f6480,0x100e5780,0,0)
    tls = pe.bytes(start,end-start)
    format_text = pe.string(0x100e9f40)
    (output / 'source.json').write_bytes((json.dumps({'schema': 'gothic3-arena-property-registration-v1',
        'sharedBaseSha256': INPUT_SHA, 'methods': methods,
        'staticTls': {'directoryAddress': f'{pe.base+rva:08x}', 'directoryRaw': directory.hex(),
                      'templateAddress':f'{start:08x}', 'templateRaw':tls.hex(),
                      'templateSha256':hashlib.sha256(tls).hexdigest(),
                      'indexAddress':f'{index:08x}', 'callbacksAddress':f'{callbacks:08x}',
                      'debugBufferOffset':264, 'loaderSlotAssigned':False},
        'registrationDebugFormat': {'address':'100e9f40','text':format_text},
        'sourceOnly': True, 'wholeCrtTraversalCompleted': False}, indent=2) + '\n').encode())

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    capture(args.study, args.output)
