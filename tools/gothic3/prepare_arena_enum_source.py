"""Recover the next Arena enum metadata initializer and its original callees."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from read_dialogue_native_evidence import audit_module, PE, EXPECTED_INPUTS


def capture(study):
    EXPECTED_INPUTS['SharedBase.dll'] = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'
    shared = audit_module(study, 'SharedBase_dll', 'SharedBase.dll', {0x10007c11: 'objectBaseConstructor'})
    module = audit_module(study, 'Game_dll', 'Game.dll', {
        0x20011b99: 'arenaEnumValueConstructor',
        0x2001bdf1: 'arenaEnumValueName',
        0x2001cf35: 'arenaEnumValueInsert',
        0x2002a98c: 'enumNameRegistryConstructor',
        0x200129ae: 'enumNameRegistryLookup',
        0x2001efab: 'enumValueRegistryConstructor',
        0x20029b4f: 'enumValueRegistryLookup',
        0x2000ff83: 'enumValueArrayReserve',
        0x20022b92: 'enumNameRegistryReserve',
        0x20018b1a: 'enumNameRegistryFind',
        0x200067f8: 'enumValueVirtualAssignment',
        0x2002c20f: 'enumValueRegistryReserve',
    })
    pe = PE((study / '00_Original_Runtime' / 'Game.dll').read_bytes())
    cleanup_instructions = []
    pattern = re.compile(r'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)')
    assembly = study / '01_Decompiled_Code/Game_dll/full_disassembly.asm'
    with assembly.open(encoding='utf-8') as stream:
        for line in stream:
            match = pattern.fullmatch(line.rstrip('\r\n'))
            if not match or not 0x20549ac0 <= int(match[1], 16) <= 0x20549b09:
                continue
            assert pe.bytes(int(match[1],16),len(match[2])//2).hex() == match[2]
            cleanup_instructions.append({'va':match[1], 'bytes':match[2], 'instruction':match[3]})
    assert len(cleanup_instructions) == 16 and cleanup_instructions[-1]['instruction'] == 'RET'
    cleanup_bytes = b''.join(bytes.fromhex(row['bytes']) for row in cleanup_instructions)
    assert len(cleanup_bytes) == 74
    # The targeted initializer was recovered after the original functions CSV.
    # Admit its committed disassembly directly against the matching PE.
    path = Path(__file__).parents[2] / 'assets/gothic3/game-cinit-callbacks/sources/Game/204b1e70.asm.txt'
    instructions = []
    for line in path.read_text(encoding='utf-8').splitlines():
        address, raw, instruction = line.split(' | ', 2)
        assert pe.bytes(int(address, 16), len(raw) // 2).hex() == raw
        instructions.append({'va': address, 'bytes': raw, 'instruction': instruction})
    images = []
    for address, size, label in [
        (0x20659d48, 19, 'statusNoneName'),
        (0x207b4f48, 4, 'enumValueScratch'),
        (0x207b505c, 1, 'statusNoneReceiver'),
        (0x20659c74, 12, 'enumValueVtable'),
        (0x2065902c, 32, 'enumValueBaseVtable'),
        (0x207b5008, 16, 'enumNameRegistry'),
        (0x207b501c, 4, 'enumNameRegistryGuard'),
        (0x207b4ff0, 16, 'enumValueRegistry'),
        (0x207b5004, 4, 'enumValueRegistryGuard'),
    ]:
        rva = address - pe.base
        section = next((s for s in pe.sections if s[1] <= rva and rva + size <= s[1] + max(s[0], s[2])), None)
        if section is None:
            raise ValueError('Image outside original PE sections')
        virtual_size, start, raw_size, raw_offset = section
        file_bytes = max(0, min(size, start + raw_size - rva))
        raw = (pe.bytes(address, file_bytes) if file_bytes else b'') + bytes(size - file_bytes)
        images.append({'label': label, 'address': f'{address:08x}',
                       'bytes': size, 'raw': raw.hex(),
                       'fileBackedBytes': file_bytes, 'loaderZeroFillBytes': size - file_bytes,
                       'section': {'virtualAddress': start, 'virtualSize': virtual_size,
                                   'rawSize': raw_size, 'rawOffset': raw_offset},
                       'sha256': hashlib.sha256(raw).hexdigest()})
    return {'schema': 'gothic3-arena-enum-source-v1', 'module': module, 'shared': shared,
            'initializer': {'entry': '204b1e70', 'instructions': instructions},
            'nameRegistryCleanup': {'entry':'20549ac0', 'body':'20549ac0',
                                    'instructions':cleanup_instructions,
                                    'bodyInstructionBytesSha256':hashlib.sha256(cleanup_bytes).hexdigest()},
            'pendingCleanupCallbacks': ['20549a60'],
            'images': images, 'sourceOnly': True,
            'initializerReturned': False, 'fullCampaignCompleted': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--runtime-output', type=Path)
    args = parser.parse_args()
    source = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(source, indent=2) + '\n', encoding='utf-8', newline='\n')
    if args.runtime_output:
        payload = json.dumps(source, indent=2) + '\n'
        code = "import text from '../../assets/gothic3/arena-enum/source.json?raw';\n"
        code += "import source from '../../assets/gothic3/arena-enum/source.json';\n"
        code += "import type {NativeCrtImageReceipt} from './native-game-crt-profile';\n"
        code += 'const expectedText=' + json.dumps(payload) + ';\n'
        code += "export function admitArenaEnumSource():void {if(text!==expectedText)throw new Error('Original Arena enum source differs');}\n"
        code += "function freeze(value:unknown):void {if(value!==null&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}}\n"
        code += "admitArenaEnumSource();freeze(source);\n"
        code += "export const arenaEnumInstructions=source.module.methods;\n"
        code += "export const arenaEnumSharedInstructions=source.shared.methods;\n"
        code += "export function arenaEnumNameCleanupReceipt(){admitArenaEnumSource();const method=source.nameRegistryCleanup;return Object.freeze({module:'Game' as const,entry:method.entry,body:method.body,bodyInstructionBytesSha256:method.bodyInstructionBytesSha256});}\n"
        code += "export const arenaEnumImagePins=Object.fromEntries(source.images.map(image=>[image.label,[image.label==='statusNoneName'||image.label.endsWith('Vtable')?'constBytes':'coldGlobals',image.address,image.bytes,image.raw,image.sha256] as const]));freeze(arenaEnumImagePins);\n"
        code += "export function arenaEnumImageReceipt(label:string):NativeCrtImageReceipt {admitArenaEnumSource();const image=source.images.find(image=>image.label===label);if(!image)throw new Error('Unowned Arena enum image');return Object.freeze({...image,module:'Game',scope:arenaEnumImagePins[label]![0]==='coldGlobals'?'cold-original-image':'original-file-backed-constant',liveValueCaptured:false,knownMask:'ff'.repeat(image.bytes)});}\n"
        args.runtime_output.write_text(code, encoding='utf-8', newline='\n')
    for method in source['module']['methods']:
        print(method['label'], method['bodyVA'], method['instructionCount'])
