"""Capture original AI Label startup evidence; this does not execute startup."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from read_dialogue_native_evidence import audit_module, PE


def capture(study):
    module = audit_module(study, 'Game_dll', 'Game.dll', {
        0x20006b0e: 'labelTypeGetter',
        0x200340e0: 'labelWrapperInitialize',
        0x200340d6: 'labelClassName',
        0x20025e55: 'labelObjectReplacement',
        0x20017e27: 'labelTypeAccessor',
        0x20004bb0: 'labelVirtualClassName',
    })
    pe = PE((study / '00_Original_Runtime/Game.dll').read_bytes())
    root = Path(__file__).parents[2]
    assembly = root / 'assets/gothic3/game-cinit-callbacks/sources/Game/204b23d0.asm.txt'
    instructions = []
    for line_number, line in enumerate(assembly.read_text(encoding='utf-8').splitlines(), 1):
        address, raw, instruction = line.split(' | ', 2)
        va = int(address, 16)
        assert pe.bytes(va, len(raw) // 2).hex() == raw
        instructions.append(dict(va=address, rva=f'{va-pe.base:x}', bytes=raw, instruction=instruction,
            fileOffset=pe.offset(va, len(raw) // 2), assemblyLine=line_number))
    assert len(instructions) == 14 and instructions[-1]['va'] == '204b241a'
    assert instructions[-1]['instruction'] == 'RET'
    cleanup_rows = []
    pattern = re.compile(r'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)')
    with (study / '01_Decompiled_Code/Game_dll/full_disassembly.asm').open(encoding='utf-8') as stream:
        for line in stream:
            match = pattern.fullmatch(line.rstrip('\r\n'))
            if match and 0x20549c20 <= int(match[1],16) <= 0x20549c3a:
                va = int(match[1],16)
                assert pe.bytes(va,len(match[2])//2).hex() == match[2]
                cleanup_rows.append(dict(va=match[1],bytes=match[2],instruction=match[3],fileOffset=pe.offset(va,len(match[2])//2)))
    assert len(cleanup_rows)==5 and cleanup_rows[-1]['instruction']=='JMP dword ptr [0x207d87a4]'
    cleanup = dict(entry='20549c20',instructions=cleanup_rows,
        bodyInstructionBytesSha256=hashlib.sha256(b''.join(bytes.fromhex(row['bytes']) for row in cleanup_rows)).hexdigest())
    images = []
    for address, size, label in [
        (0x207b51c4, 16, 'labelWrapper'),
        (0x207b5138, 64, 'labelTypeAndGuard'),
        (0x207b5070, 12, 'labelClassNameAndCache'),
        (0x207b5118, 4, 'labelClassNameInput'),
        (0x2065a384, 16, 'labelTypeVtable'),
        (0x2065a45c, 68, 'labelWrapperVtable'),
        (0x20798260, 36, 'labelTypeInfoDescriptor'),
    ]:
        rva = address - pe.base
        virtual_size, start, raw_size, raw_offset = next(s for s in pe.sections
            if s[1] <= rva and rva + size <= s[1] + max(s[0], s[2]))
        backed = max(0, min(size, start + raw_size - rva))
        raw = (pe.bytes(address, backed) if backed else b'') + bytes(size - backed)
        images.append(dict(label=label, address=f'{address:08x}', bytes=size,
            raw=raw.hex(), fileBackedBytes=backed, loaderZeroFillBytes=size-backed,
            section=dict(virtualAddress=start, virtualSize=virtual_size,
                rawSize=raw_size, rawOffset=raw_offset),
            sha256=hashlib.sha256(raw).hexdigest(), liveValueCaptured=False))
    return dict(schema='gothic3-label-startup-source-v1', module=module,
        initializer=dict(entry='204b23d0', assemblyPath=assembly.relative_to(root).as_posix(),
            instructions=instructions, bodyInstructionBytesSha256=hashlib.sha256(
                b''.join(bytes.fromhex(row['bytes']) for row in instructions)).hexdigest()),
        typeCleanup=cleanup, images=images, sourceOnly=True, initializerReturnCaptured=False,
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
        generated = """/** Generated original Label image and initializer admission. */
import source from '../../assets/gothic3/label-startup/source.json';
import sourceText from '../../assets/gothic3/label-startup/source.json?raw';
import type { NativeCrtImageReceipt } from './native-game-crt-profile';
import type { NativeGameIoInstruction } from './native-game-crt-io-source';
const expectedText = EXPECTED;
function freeze(value:unknown):void {if(value!==null&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}}
export function admitGameLabelSource():void {if(sourceText!==expectedText)throw new Error('Original Label source differs');}
admitGameLabelSource();freeze(source);
export const labelImagePins = Object.fromEntries(source.images.map(image=>[image.label,[image.loaderZeroFillBytes?'coldGlobals':'constBytes',image.address,image.bytes,image.raw,image.sha256] as const]));
freeze(labelImagePins);
export function labelImageReceipt(label:string):NativeCrtImageReceipt {admitGameLabelSource();const image=source.images.find(image=>image.label===label);if(!image)throw new Error('Unowned Label image');return Object.freeze({...image,module:'Game' as const,scope:image.loaderZeroFillBytes?'cold-original-image':'original-file-backed-constant',knownMask:'ff'.repeat(image.bytes)});}
export function labelInitializerInstruction(pc:string):NativeGameIoInstruction {admitGameLabelSource();const row=source.initializer.instructions.find(row=>row.va===pc);if(!row)throw new Error('Unowned Label initializer instruction');return row;}
export function labelWrapperInstruction(pc:string):NativeGameIoInstruction {admitGameLabelSource();const method=source.module.methods.find(method=>method.label==='labelWrapperInitialize'&&method.bodyVA==='0x20075040');const row=method?.instructions.find(row=>row.va===pc);if(!row)throw new Error('Unowned Label wrapper instruction');return row;}
export function labelTypeCleanupReceipt(){admitGameLabelSource();const cleanup=source.typeCleanup;if(cleanup.entry!=='20549c20')throw new Error('Original Label type cleanup differs');return Object.freeze({module:'Game' as const,entry:cleanup.entry,body:cleanup.entry,bodyInstructionBytesSha256:cleanup.bodyInstructionBytesSha256});}
""".replace('EXPECTED', expected)
        args.typescript.write_text(generated, encoding='utf-8', newline='\n')
    for method in source['module']['methods']:
        print(method['label'], method['bodyVA'], method['instructionCount'])
