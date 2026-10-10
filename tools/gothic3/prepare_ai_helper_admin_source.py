"""Capture original AI helper administrator startup evidence; this does not execute startup."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from read_dialogue_native_evidence import audit_module, PE


def capture(study):
    module = audit_module(study, 'Game_dll', 'Game.dll', {
        0x20016e32: 'aiHelperAdminTypeGetter',
        0x20026a08: 'aiHelperAdminWrapperInitialize',
        0x200191f0: 'aiHelperAdminClassName',
        0x200319d0: 'aiHelperAdminObjectReplacement',
        0x2000e59d: 'aiHelperAdminTypeAccessor',
        0x2000fb8c: 'aiHelperAdminVirtualClassName',
    })
    pe = PE((study / '00_Original_Runtime/Game.dll').read_bytes())
    root = Path(__file__).parents[2]
    assembly = root / 'assets/gothic3/game-cinit-callbacks/sources/Game/204b2660.asm.txt'
    instructions = []
    for line_number, line in enumerate(assembly.read_text(encoding='utf-8').splitlines(), 1):
        address, raw, instruction = line.split(' | ', 2)
        va = int(address, 16)
        assert pe.bytes(va, len(raw) // 2).hex() == raw
        instructions.append(dict(va=address, rva=f'{va-pe.base:x}', bytes=raw, instruction=instruction,
            fileOffset=pe.offset(va, len(raw) // 2), assemblyLine=line_number))
    assert len(instructions) == 14 and instructions[-1]['va'] == '204b26aa'
    assert instructions[-1]['instruction'] == 'RET'
    cleanup_rows = []
    pattern = re.compile(r'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)')
    with (study / '01_Decompiled_Code/Game_dll/full_disassembly.asm').open(encoding='utf-8') as stream:
        for line in stream:
            match = pattern.fullmatch(line.rstrip('\r\n'))
            if match and 0x20549d10 <= int(match[1],16) <= 0x20549d2a:
                va = int(match[1],16)
                assert pe.bytes(va,len(match[2])//2).hex() == match[2]
                cleanup_rows.append(dict(va=match[1],bytes=match[2],instruction=match[3],fileOffset=pe.offset(va,len(match[2])//2)))
    assert len(cleanup_rows)==5 and cleanup_rows[-1]['instruction']=='JMP dword ptr [0x207d87a4]'
    cleanup = dict(entry='20549d10',instructions=cleanup_rows,
        bodyInstructionBytesSha256=hashlib.sha256(b''.join(bytes.fromhex(row['bytes']) for row in cleanup_rows)).hexdigest())
    wrapper_raw = pe.bytes(0x20549d60, 30)
    assert wrapper_raw.hex() == 'b998527b20c70598527b2094a76520e8a29badffb998527b20e998d7adff'
    wrapper_rows = []
    for offset, size in [(0,5),(5,10),(15,5),(20,5),(25,5)]:
        raw = wrapper_raw[offset:offset+size]
        address = 0x20549d60 + offset
        if raw[0] == 0xb9:
            instruction = f'MOV ECX,0x{int.from_bytes(raw[1:], "little"):x}'
        elif raw[:2] == bytes.fromhex('c705'):
            instruction = f'MOV dword ptr [0x{int.from_bytes(raw[2:6], "little"):x}],0x{int.from_bytes(raw[6:], "little"):x}'
        else:
            assert raw[0] in (0xe8,0xe9)
            target = address + 5 + int.from_bytes(raw[1:], 'little', signed=True)
            instruction = ('CALL' if raw[0] == 0xe8 else 'JMP') + f' 0x{target:x}'
        wrapper_rows.append({'va':f'{address:08x}','bytes':raw.hex(),'instruction':instruction,'fileOffset':pe.offset(address,size)})
    wrapper_cleanup = {'entry':'20549d60','instructions':wrapper_rows,
        'capture':'bounded-original-PE-five-encoding-decode', 'bodyByteCount':len(wrapper_raw),
        'bodyInstructionBytesSha256':hashlib.sha256(wrapper_raw).hexdigest()}
    images = []
    for address, size, aiHelperAdmin in [
        (0x207b5298, 16, 'aiHelperAdminWrapper'),
        (0x207b5208, 64, 'aiHelperAdminTypeAndGuard'),
        (0x207b51fc, 12, 'aiHelperAdminClassNameAndCache'),
        (0x207b5294, 4, 'aiHelperAdminClassNameInput'),
        (0x2065a68c, 16, 'aiHelperAdminTypeVtable'),
        (0x2065a794, 68, 'aiHelperAdminWrapperVtable'),
        (0x20798560, 32, 'aiHelperAdminTypeInfoDescriptor'),
    ]:
        rva = address - pe.base
        virtual_size, start, raw_size, raw_offset = next(s for s in pe.sections
            if s[1] <= rva and rva + size <= s[1] + max(s[0], s[2]))
        backed = max(0, min(size, start + raw_size - rva))
        raw = (pe.bytes(address, backed) if backed else b'') + bytes(size - backed)
        images.append(dict(label=aiHelperAdmin, address=f'{address:08x}', bytes=size,
            raw=raw.hex(), fileBackedBytes=backed, loaderZeroFillBytes=size-backed,
            section=dict(virtualAddress=start, virtualSize=virtual_size,
                rawSize=raw_size, rawOffset=raw_offset),
            sha256=hashlib.sha256(raw).hexdigest(), liveValueCaptured=False))
    return dict(schema='gothic3-ai-helper-admin-startup-source-v1', module=module,
        initializer=dict(entry='204b2660', assemblyPath=assembly.relative_to(root).as_posix(),
            instructions=instructions, bodyInstructionBytesSha256=hashlib.sha256(
                b''.join(bytes.fromhex(row['bytes']) for row in instructions)).hexdigest()),
        typeCleanup=cleanup, wrapperCleanup=wrapper_cleanup, images=images, sourceOnly=True, initializerReturnCaptured=False,
        cleanupExecutionCaptured=False, fullCampaignCompleted=False)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--typescript', type=Path)
    args = parser.parse_args()
    source = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(source, indent=2) + '\n', encoding='utf-8', newline='\n')
    if args.typescript:
        expected = json.dumps(args.output.read_text(encoding='utf-8'))
        generated = """/** Generated original AIHelperAdmin image and initializer admission. */
import source from '../../assets/gothic3/ai-helper-admin-startup/source.json';
import sourceText from '../../assets/gothic3/ai-helper-admin-startup/source.json?raw';
import type { NativeCrtImageReceipt } from './native-game-crt-profile';
import type { NativeGameIoInstruction } from './native-game-crt-io-source';
const expectedText = EXPECTED;
function freeze(value:unknown):void {if(value!==null&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}}
export function admitGameAIHelperAdminSource():void {if(sourceText!==expectedText)throw new Error('Original AIHelperAdmin source differs');}
admitGameAIHelperAdminSource();freeze(source);
export const aiHelperAdminImagePins = Object.fromEntries(source.images.map(image=>[image.label,[image.loaderZeroFillBytes?'coldGlobals':'constBytes',image.address,image.bytes,image.raw,image.sha256] as const]));
freeze(aiHelperAdminImagePins);
export function aiHelperAdminImageReceipt(aiHelperAdmin:string):NativeCrtImageReceipt {admitGameAIHelperAdminSource();const image=source.images.find(image=>image.label===aiHelperAdmin);if(!image)throw new Error('Unowned AIHelperAdmin image');return Object.freeze({...image,module:'Game' as const,scope:image.loaderZeroFillBytes?'cold-original-image':'original-file-backed-constant',knownMask:'ff'.repeat(image.bytes)});}
export function aiHelperAdminInitializerInstruction(pc:string):NativeGameIoInstruction {admitGameAIHelperAdminSource();const row=source.initializer.instructions.find(row=>row.va===pc);if(!row)throw new Error('Unowned AIHelperAdmin initializer instruction');return row;}
export function aiHelperAdminWrapperInstruction(pc:string):NativeGameIoInstruction {admitGameAIHelperAdminSource();const method=source.module.methods.find(method=>method.label==='aiHelperAdminWrapperInitialize'&&method.bodyVA==='0x20077040');const row=method?.instructions.find(row=>row.va===pc);if(!row)throw new Error('Unowned AIHelperAdmin wrapper instruction');return row;}
export function aiHelperAdminReplacementInstruction(pc:string):NativeGameIoInstruction {admitGameAIHelperAdminSource();const method=source.module.methods.find(method=>method.label==='aiHelperAdminObjectReplacement'&&method.bodyVA==='0x20076630');const row=method?.instructions.find(row=>row.va===pc);if(!row)throw new Error('Unowned AIHelperAdmin replacement instruction');return row;}
export function aiHelperAdminAccessorInstruction(pc:string):NativeGameIoInstruction {admitGameAIHelperAdminSource();const method=source.module.methods.find(method=>method.label==='aiHelperAdminTypeAccessor'&&method.bodyVA==='0x200763f0');const row=method?.instructions.find(row=>row.va===pc);if(!row)throw new Error('Unowned AIHelperAdmin accessor instruction');return row;}
export function aiHelperAdminTypeCleanupReceipt(){admitGameAIHelperAdminSource();const cleanup=source.typeCleanup;if(cleanup.entry!=='20549d10')throw new Error('Original AIHelperAdmin type cleanup differs');return Object.freeze({module:'Game' as const,entry:cleanup.entry,body:cleanup.entry,bodyInstructionBytesSha256:cleanup.bodyInstructionBytesSha256});}
export function aiHelperAdminWrapperCleanupReceipt(){admitGameAIHelperAdminSource();const cleanup=source.wrapperCleanup;if(cleanup.entry!=='20549d60')throw new Error('Original AIHelperAdmin wrapper cleanup differs');return Object.freeze({module:'Game' as const,entry:cleanup.entry,body:cleanup.entry,bodyInstructionBytesSha256:cleanup.bodyInstructionBytesSha256});}
""".replace('EXPECTED', expected)
        args.typescript.write_text(generated, encoding='utf-8', newline='\n')
    for method in source['module']['methods']:
        print(method['label'], method['bodyVA'], method['instructionCount'])
