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
    EXPECTED_INPUTS['Engine.dll']='d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'
    engine=audit_module(study,'Engine_dll','Engine.dll',{
        0x300027b1:'engineComponentConstructor',0x30035a5d:'engineComponentBaseConstructor',
        0x3002e9ec:'moduleAdminGetInstance',0x3003f026:'moduleInputDispatcherConstructor',
        0x3000f5bf:'moduleInputDispatcherCreate',0x30671596:'moduleEngineAtexit',
        0x3067155a:'moduleEngineOnexit',0x30671472:'moduleEngineOnexitTable',
        0x30671590:'moduleEngineOnexitUnlock',0x3067e45d:'moduleEngineMsize',
        0x3067cfe8:'moduleEngineOnexitLock',0x3067cff1:'moduleEngineOnexitRelease'})
    engine_pe=PE((study/'00_Original_Runtime/Engine.dll').read_bytes())
    exit_rows=[]
    with (study/'01_Decompiled_Code/Engine_dll/full_disassembly.asm').open(encoding='utf-8') as assembly:
        for line_number,line in enumerate(assembly,1):
            if ' | ' not in line:
                continue
            address,raw,instruction=line.strip().split(' | ',2)
            if not '3067152b'<=address<='30671559':
                continue
            va=int(address,16)
            if engine_pe.bytes(va,len(raw)//2).hex()!=raw:
                raise ValueError('Engine exit initializer differs from original bytes')
            exit_rows.append(dict(va=address,bytes=raw,instruction=instruction,assemblyLine=line_number))
    exit_raw=bytes.fromhex(''.join(row['bytes'] for row in exit_rows))
    if exit_raw!=engine_pe.bytes(0x3067152b,0x2f) or exit_rows[-1]['instruction']!='RET':
        raise ValueError('Incomplete Engine exit initializer extent')
    exit_slot=engine_pe.bytes(0x30816a2c,4)
    if exit_slot.hex()!='2b156730':
        raise ValueError('Original Engine exit initializer slot differs')
    engine_exit_initialization=dict(entry='3067152b',extent='3067152b-30671559',
        instructions=exit_rows,bytes=exit_raw.hex(),bytesSha256=hashlib.sha256(exit_raw).hexdigest(),
        initializerSlot=dict(address='30816a2c',bytes=exit_slot.hex(),sha256=hashlib.sha256(exit_slot).hexdigest()),
        exitBegin='30af7e80',exitEnd='30af7e7c',runtimeConnected=False)
    exit_images=[]
    for address,label in [(0x30af7e80,'exitBegin'),(0x30af7e7c,'exitEnd')]:
        rva=address-engine_pe.base
        section=next(s for s in engine_pe.sections if s[1]<=rva and rva+4<=s[1]+max(s[0],s[2]))
        backed=max(0,min(4,section[1]+section[2]-rva))
        raw=(engine_pe.bytes(address,backed) if backed else b'')+bytes(4-backed)
        exit_images.append(dict(label=label,address=f'{address:08x}',bytes=4,raw=raw.hex(),
            fileBackedBytes=backed,loaderZeroFillBytes=4-backed,sha256=hashlib.sha256(raw).hexdigest()))
    engine_exit_initialization['images']=exit_images
    shutdown=engine_pe.bytes(0x30797fc0,10)
    if shutdown.hex()!='b9789ead30e9663b88ff':
        raise ValueError('Original Engine ModuleAdmin shutdown callback differs')
    engine_exit_initialization['shutdownCallback']=dict(entry='30797fc0',raw=shutdown.hex(),sha256=hashlib.sha256(shutdown).hexdigest())
    game=audit_module(study,'Game_dll','Game.dll',{0x20028efc:'aiHelperWrapperClone'})
    shared=audit_module(study,'SharedBase_dll','SharedBase.dll',{
        0x10002ee1:'accessorCreatorConstructor',0x10007036:'queryNewObject',0x10007356:'accessorCreatorDestructor',0x100019d8:'queryTypeNode',0x10007ec8:'factoryQueryObject',0x100058a3:'factoryRootCheck',0x100056e6:'wrapperQueryObject',0x10001d07:'engineObjectRefBaseConstructor',0x10007c11:'engineObjectBaseConstructor'})
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
        module='Game.dll', inputSha256=digest, shared=shared, game=game, engine=engine, engineExitInitialization=engine_exit_initialization, initializer='204b2720',
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
export function aiHelperComponentConstructorInstruction(entry:string,pc:string):NativeGameIoInstruction {admitAIHelperAccessorCreatorSource();const methods=[...source.engine.methods,...source.shared.methods.filter(method=>method.label==='engineObjectRefBaseConstructor'||method.label==='engineObjectBaseConstructor')];const method=methods.find(method=>method.bodyVA==='0x'+entry);const row=method?.instructions.find(row=>row.va===pc);if(!row)throw new Error('Original AI helper component constructor instruction required');return row;}
export function aiHelperModuleAdminInstruction(entry:string,pc:string):NativeGameIoInstruction {admitAIHelperAccessorCreatorSource();const method=source.engine.methods.find(method=>method.label.startsWith('module')&&method.bodyVA==='0x'+entry);const row=method?.instructions.find(row=>row.va===pc);if(!row)throw new Error('Original AI helper module administrator instruction required');return row;}
export function aiHelperAccessorCreatorCleanupReceipt(){admitAIHelperAccessorCreatorSource();const cleanup=source.cleanupReceipt;return Object.freeze({module:'Game' as const,entry:cleanup.entry,body:cleanup.entry,bodyInstructionBytesSha256:cleanup.bytesSha256});}
export function aiHelperAccessorCreatorInstruction(pc:string):NativeGameIoInstruction {admitAIHelperAccessorCreatorSource();const row=source.instructions.find(row=>row.va===pc);if(!row)throw new Error('Unowned AI helper accessor creator instruction');return row;}
""".replace('EXPECTED', expected)
        args.typescript.write_text(generated, encoding='utf-8', newline='\n')
