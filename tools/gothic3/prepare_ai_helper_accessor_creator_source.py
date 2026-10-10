"""Reproduce source evidence for Game's AI helper accessor creator initializer.

This captures original bytes; it does not execute or implement startup.
"""
import argparse
import hashlib
import json
from pathlib import Path

from read_dialogue_native_evidence import EXPECTED_INPUTS, PE, audit_module


def capture(study):
    data = (study / '00_Original_Runtime/Game.dll').read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != EXPECTED_INPUTS['Game.dll']:
        raise ValueError('Unsupported Game.dll build')
    pe = PE(data)
    EXPECTED_INPUTS['SharedBase.dll']='5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'
    game=audit_module(study,'Game_dll','Game.dll',{0x20028efc:'aiHelperWrapperClone'})
    shared=audit_module(study,'SharedBase_dll','SharedBase.dll',{
        0x10002ee1:'accessorCreatorConstructor',0x10007036:'queryNewObject',0x10007356:'accessorCreatorDestructor',0x100019d8:'queryTypeNode',0x10007ec8:'factoryQueryObject',0x100058a3:'factoryRootCheck',0x100056e6:'wrapperQueryObject'})
    root = Path(__file__).resolve().parents[2]
    rows = []
    assembly = root / 'assets/gothic3/game-cinit-callbacks/sources/Game/204b2720.asm.txt'
    for line_number, line in enumerate(assembly.read_text(encoding='utf-8').splitlines(), 1):
        address, raw, instruction = line.split(' | ', 2)
        va = int(address, 16)
        if pe.bytes(va, len(raw) // 2).hex() != raw:
            raise ValueError('Assembly differs from original bytes at ' + address)
        rows.append(dict(va=address, rva=f'{va-pe.base:x}', fileOffset=pe.offset(va, len(raw)//2),
                         bytes=raw, instruction=instruction, assemblyLine=line_number))
    if len(rows) != 9 or rows[-1]['va'] != '204b2741' or rows[-1]['instruction'] != 'RET':
        raise ValueError('Unexpected initializer extent')
    raw = bytes.fromhex(''.join(row['bytes'] for row in rows))
    if raw != pe.bytes(0x204b2720, 0x22):
        raise ValueError('Initializer instructions are not contiguous')
    addresses = {0x207d86b4}
    imports = [row for row in pe.imports() if int(row['iatVA'], 16) in addresses]
    if len(imports) != 1:
        raise ValueError('Missing original import bindings')
    cleanup = pe.bytes(0x20549d50, 11)
    if cleanup.hex() != 'b9bc527b20ff25d0887d20':
        raise ValueError('Unexpected original PropertyID cleanup')
    cleanup_import = next(row for row in pe.imports() if row['iatVA'] == '0x207d88d0')
    if cleanup_import['name'] != '??1bCAccessorCreator@@QAE@XZ' or cleanup_import['module'] != 'SharedBase.dll':
        raise ValueError('Unexpected PropertyID destructor binding')
    images = []
    for address, size, label in [(0x207b52bc, 4, 'aiHelperAccessorCreator')]:
        rva = address - pe.base
        section = next(s for s in pe.sections if s[1] <= rva and rva + size <= s[1] + max(s[0], s[2]))
        virtual_size, start, raw_size, raw_offset = section
        backed = max(0, min(size, start + raw_size - rva))
        image = (pe.bytes(address, backed) if backed else b'') + bytes(size - backed)
        images.append(dict(label=label, address=f'{address:08x}', bytes=size,
            raw=image.hex(), fileBackedBytes=backed, loaderZeroFillBytes=size-backed,
            sha256=hashlib.sha256(image).hexdigest(), liveValueCaptured=False))
    return dict(schema='gothic3-ai-helper-accessor-creator-research-v1',
        module='Game.dll', inputSha256=digest, shared=shared, game=game, initializer='204b2720',
        extent='204b2720-204b2741', bytes=raw.hex(),
        bytesSha256=hashlib.sha256(raw).hexdigest(), instructions=rows,
        destination='207b52bc', cleanup='20549d50', imports=imports,
        cleanupReceipt=dict(entry='20549d50', bytes=cleanup.hex(),
            bytesSha256=hashlib.sha256(cleanup).hexdigest(),
            instructions=[dict(va='20549d50', bytes=cleanup[:5].hex(), instruction='MOV ECX,0x207b52bc'),
                          dict(va='20549d55', bytes=cleanup[5:].hex(), instruction='JMP dword ptr [0x207d88d0]')],
            importBinding=cleanup_import), images=images,
        relatedImplementation='src/gothic3/native-game-script-admin-startup.ts',
        runtimeConnected=False, initializerReturnVerified=False,
        notes=['The class-name getter reuses the canonical AI helper administrator CString.',
               'The accessor creator receives the retained PropertyID and class-name pointer.',
               'Source capture alone does not establish startup execution or return.'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--typescript', type=Path)
    args = parser.parse_args()
    receipt = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')
    if args.typescript:
        expected = json.dumps(args.output.read_text(encoding='utf-8'))
        generated = """/** Generated original AI helper accessor creator source admission. */
import source from '../../assets/gothic3/ai-helper-accessor-creator-startup/research.json';
import sourceText from '../../assets/gothic3/ai-helper-accessor-creator-startup/research.json?raw';
import type { NativeCrtImageReceipt } from './native-game-crt-profile';
import type { NativeGameIoInstruction } from './native-game-crt-io-source';
const expectedText = EXPECTED;
function freeze(value:unknown):void {if(value!==null&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}}
export function admitAIHelperAccessorCreatorSource():void {if(sourceText!==expectedText)throw new Error('Original AI helper accessor creator source differs');}
admitAIHelperAccessorCreatorSource();freeze(source);
export const aiHelperAccessorCreatorImagePins=Object.fromEntries(source.images.map(image=>[image.label,[image.loaderZeroFillBytes?'coldGlobals':'constBytes',image.address,image.bytes,image.raw,image.sha256] as const]));
freeze(aiHelperAccessorCreatorImagePins);
export function aiHelperAccessorCreatorImageReceipt(label:string):NativeCrtImageReceipt {admitAIHelperAccessorCreatorSource();const image=source.images.find(image=>image.label===label);if(!image)throw new Error('Unowned AI helper accessor creator image');return Object.freeze({...image,module:'Game' as const,scope:image.loaderZeroFillBytes?'cold-original-image':'original-file-backed-constant',knownMask:'ff'.repeat(image.bytes)});}
export function aiHelperAccessorCreatorConstructorInstruction(pc:string):NativeGameIoInstruction {admitAIHelperAccessorCreatorSource();const method=source.shared.methods.find(method=>method.label==='accessorCreatorConstructor'&&method.bodyVA==='0x100932e0');const row=method?.instructions.find(row=>row.va===pc);if(!row)throw new Error('Unowned original accessor constructor instruction');return row;}
export function aiHelperAccessorQueryInstruction(pc:string):NativeGameIoInstruction {admitAIHelperAccessorCreatorSource();const method=source.shared.methods.find(method=>method.label==='queryNewObject'&&method.bodyVA==='0x10090590');const row=method?.instructions.find(row=>row.va===pc);if(!row)throw new Error('Unowned original accessor query instruction');return row;}
export function aiHelperFactoryQueryInstruction(pc:string):NativeGameIoInstruction {admitAIHelperAccessorCreatorSource();const method=source.shared.methods.find(method=>method.label==='factoryQueryObject'&&method.bodyVA==='0x1008cdd0');const row=method?.instructions.find(row=>row.va===pc);if(!row)throw new Error('Unowned original factory query instruction');return row;}
export function aiHelperWrapperQueryInstruction(pc:string):NativeGameIoInstruction {admitAIHelperAccessorCreatorSource();const method=source.shared.methods.find(method=>method.label==='wrapperQueryObject'&&method.bodyVA==='0x100890d0');const row=method?.instructions.find(row=>row.va===pc);if(!row)throw new Error('Unowned original wrapper query instruction');return row;}
export function aiHelperWrapperCloneInstruction(pc:string):NativeGameIoInstruction {admitAIHelperAccessorCreatorSource();const method=source.game.methods.find(method=>method.label==='aiHelperWrapperClone'&&method.bodyVA==='0x20077bf0');const row=method?.instructions.find(row=>row.va===pc);if(!row)throw new Error('Unowned original AI helper wrapper clone instruction');return row;}
export function admitAIHelperCloneAllocationImport():void {admitAIHelperAccessorCreatorSource();const binding=source.game.imports.find(binding=>binding.iatVA==='0x207d88f8');if(binding?.module!=='SharedBase.dll'||binding.name!=='_new@8')throw new Error('Original tagged allocation import required');}
export function aiHelperAccessorCreatorCleanupReceipt(){admitAIHelperAccessorCreatorSource();const cleanup=source.cleanupReceipt;return Object.freeze({module:'Game' as const,entry:cleanup.entry,body:cleanup.entry,bodyInstructionBytesSha256:cleanup.bytesSha256});}
export function aiHelperAccessorCreatorInstruction(pc:string):NativeGameIoInstruction {admitAIHelperAccessorCreatorSource();const row=source.instructions.find(row=>row.va===pc);if(!row)throw new Error('Unowned AI helper accessor creator instruction');return row;}
""".replace('EXPECTED', expected)
        args.typescript.write_text(generated, encoding='utf-8', newline='\n')
