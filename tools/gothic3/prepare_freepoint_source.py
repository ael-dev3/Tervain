"""Recover the original AI FreePoint wrapper startup and its reflected type."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from read_dialogue_native_evidence import audit_module, PE


def capture(study):
    module = audit_module(study, 'Game_dll', 'Game.dll', {
        0x20035a08: 'freePointTypeGetter',
        0x20008571: 'freePointWrapperInitialize',
        0x20017d78: 'freePointClassName',
        0x2002a987: 'freePointParentTypeGetter',
        0x20024672: 'freePointTypeAccessor',
        0x20018b42: 'freePointVirtualClassName',
        0x200310d4: 'freePointWrapperObjectGetter',
    })
    pe = PE((study / '00_Original_Runtime/Game.dll').read_bytes())
    path = Path(__file__).parents[2] / 'assets/gothic3/game-cinit-callbacks/sources/Game/204b2130.asm.txt'
    instructions = []
    for line_number, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
        address, raw, instruction = line.split(' | ', 2)
        assert pe.bytes(int(address,16),len(raw)//2).hex()==raw
        instructions.append({'va':address,'rva':f'{int(address,16)-pe.base:x}',
            'fileOffset':pe.offset(int(address,16),len(raw)//2),
            'bytes':raw,'instruction':instruction,'assemblyLine':line_number})
    body = b''.join(bytes.fromhex(row['bytes']) for row in instructions)
    assert instructions[-1]['va']=='204b217a' and instructions[-1]['instruction']=='RET'
    cleanups = {'typeCleanup': [], 'classNameCleanup': []}
    pattern = re.compile(r'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)')
    with (study / '01_Decompiled_Code/Game_dll/full_disassembly.asm').open(encoding='utf-8') as stream:
        for line in stream:
            match = pattern.fullmatch(line.rstrip('\r\n'))
            if not match:
                continue
            address = int(match[1], 16)
            label = 'typeCleanup' if 0x20549b30 <= address <= 0x20549b4a else 'classNameCleanup' if 0x20549b60 <= address <= 0x20549b65 else None
            if label:
                assert pe.bytes(address, len(match[2]) // 2).hex() == match[2]
                cleanups[label].append({'va': match[1], 'bytes': match[2], 'instruction': match[3]})
    assert len(cleanups['typeCleanup']) == 5 and len(cleanups['classNameCleanup']) == 2
    cleanup_receipts = {}
    for label, rows in cleanups.items():
        assert rows[-1]['instruction'].startswith('JMP dword ptr')
        cleanup_receipts[label] = {'entry': rows[0]['va'], 'instructions': rows,
            'bodyInstructionBytesSha256': hashlib.sha256(b''.join(bytes.fromhex(row['bytes']) for row in rows)).hexdigest()}
    thunk = pe.bytes(0x2002ec53, 5)
    assert thunk.hex() == 'e908af5100'
    assert 0x2002ec53 + 5 + int.from_bytes(thunk[1:], 'little', signed=True) == 0x20549b60
    cleanup_receipts['classNameCleanup']['entryChain'] = [{'va':'2002ec53','bytes':thunk.hex(),'targetVA':'20549b60'}]
    images = []
    for address, size, label in [
        (0x207b511c, 16, 'freePointWrapper'),
        (0x207b5088, 64, 'freePointTypeAndGuard'),
        (0x207b507c, 12, 'freePointClassNameAndCache'),
        (0x207b5114, 4, 'freePointClassNameInput'),
        (0x20659f94, 16, 'freePointTypeVtable'),
        (0x2065a074, 68, 'freePointWrapperVtable'),
        (0x20798230, 8 + len('.?AVgCAIHelper_FreePoint_PS@@') + 1, 'freePointTypeInfoDescriptor'),
    ]:
        rva = address - pe.base
        section = next(s for s in pe.sections if s[1] <= rva and rva + size <= s[1] + max(s[0], s[2]))
        virtual_size, start, raw_size, raw_offset = section
        backed = max(0, min(size, start + raw_size - rva))
        raw = (pe.bytes(address, backed) if backed else b'') + bytes(size - backed)
        images.append({'label': label, 'address': f'{address:08x}', 'bytes': size,
            'raw': raw.hex(), 'fileBackedBytes': backed, 'loaderZeroFillBytes': size - backed,
            'section': {'virtualAddress': start, 'virtualSize': virtual_size, 'rawSize': raw_size, 'rawOffset': raw_offset},
            'sha256': hashlib.sha256(raw).hexdigest(), 'liveValueCaptured': False})
    return {'schema':'gothic3-freepoint-startup-source-v1','module':module,
            'initializer':{'entry':'204b2130','assemblyPath':str(path.relative_to(Path(__file__).parents[2])).replace('\\','/'),'instructions':instructions,
                           'bodyInstructionBytesSha256':hashlib.sha256(body).hexdigest()},
            'cleanups': cleanup_receipts, 'images': images,
            'pendingCleanupCallback':'20549b80','sourceOnly':True,
            'initializerReturned':False,'fullCampaignCompleted':False}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--typescript',type=Path)
    args=parser.parse_args()
    source=capture(args.study)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(source,indent=2)+'\n',encoding='utf-8',newline='\n')
    if args.typescript:
        expected = json.dumps(args.output.read_text(encoding='utf-8'))
        generated = """/** Generated original FreePoint image and initializer admission. */
import source from '../../assets/gothic3/freepoint-startup/source.json';
import sourceText from '../../assets/gothic3/freepoint-startup/source.json?raw';
import type { NativeCrtImageReceipt } from './native-game-crt-profile';
import type { NativeGameIoInstruction } from './native-game-crt-io-source';
const expectedText = EXPECTED;
function freeze(value:unknown):void {if(value!==null&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}}
export function admitGameFreePointSource():void {if(sourceText!==expectedText)throw new Error('Original FreePoint source differs');}
admitGameFreePointSource();freeze(source);
export const freePointImagePins = Object.fromEntries(source.images.map(image=>[image.label,[image.loaderZeroFillBytes?'coldGlobals':'constBytes',image.address,image.bytes,image.raw,image.sha256] as const]));
freeze(freePointImagePins);
export function freePointImageReceipt(label:string):NativeCrtImageReceipt {admitGameFreePointSource();const image=source.images.find(image=>image.label===label);if(!image)throw new Error('Unowned FreePoint image');return Object.freeze({...image,module:'Game' as const,scope:image.loaderZeroFillBytes?'cold-original-image':'original-file-backed-constant',knownMask:'ff'.repeat(image.bytes)});}
export function freePointInitializerInstruction(pc:string):NativeGameIoInstruction {admitGameFreePointSource();const row=source.initializer.instructions.find(row=>row.va===pc);if(!row)throw new Error('Unowned FreePoint initializer instruction');return row;}
export function freePointWrapperInstruction(pc:string):NativeGameIoInstruction {admitGameFreePointSource();const method=source.module.methods.find(method=>method.label==='freePointWrapperInitialize'&&method.bodyVA==='0x20073010');const row=method?.instructions.find(row=>row.va===pc);if(!row)throw new Error('Unowned FreePoint wrapper instruction');return row;}
export function freePointClassNameCleanupReceipt(){admitGameFreePointSource();const cleanup=source.cleanups.classNameCleanup;const chain=cleanup.entryChain;const thunk=chain[0];if(!thunk||cleanup.entry!=='20549b60'||chain.length!==1||thunk.va!=='2002ec53'||thunk.bytes!=='e908af5100'||thunk.targetVA!==cleanup.entry)throw new Error('Original FreePoint class-name cleanup differs');return Object.freeze({module:'Game' as const,entry:'2002ec53',body:cleanup.entry,entryChain:chain,bodyInstructionBytesSha256:cleanup.bodyInstructionBytesSha256});}
export function freePointTypeCleanupReceipt(){admitGameFreePointSource();const cleanup=source.cleanups.typeCleanup;if(cleanup.entry!=='20549b30')throw new Error('Original FreePoint type cleanup differs');return Object.freeze({module:'Game' as const,entry:cleanup.entry,body:cleanup.entry,bodyInstructionBytesSha256:cleanup.bodyInstructionBytesSha256});}
""".replace('EXPECTED', expected)
        args.typescript.write_text(generated,encoding='utf-8',newline='\n')
    for method in source['module']['methods']:
        print(method['label'],method['bodyVA'],method['instructionCount'])
