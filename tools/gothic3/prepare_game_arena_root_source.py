"""Capture original Arena property-object startup and its immediate continuations."""
import argparse
import hashlib
import json
from pathlib import Path

from read_dialogue_native_evidence import audit_module, PE, EXPECTED_INPUTS


def capture(study):
    EXPECTED_INPUTS['SharedBase.dll'] = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'
    module = audit_module(study, 'Game_dll', 'Game.dll', {
        0x204b1d70: 'arenaRootInitializer',
        0x2000d152: 'arenaTypeSingleton',
        0x200021d5: 'arenaInitializeWrapper',
        0x2002dc8b: 'arenaReplaceWrappedObject',
        0x20549970: 'arenaRootCleanup',
        0x2002adfb: 'arenaTypeFactoryVirtual',
    })
    shared = audit_module(study, 'SharedBase_dll', 'SharedBase.dll', {
        0x10007130: 'propertyWrapperConstructor',
        0x100058a3: 'propertyWrapperIsRoot',
        0x100030da: 'objectRefSetPropertyObject',
        0x100020e5: 'propertySingletonEnableRegistration',
    })
    pe = PE((study / '00_Original_Runtime/Game.dll').read_bytes())
    images = []
    for label, address, size in [
        ('arenaRootWrapper', 0x207b5028, 16),
        ('arenaRootVtable', 0x206595dc, 68),
        ('arenaRootInitializerSlot', 0x2056c36c, 4),
        ('arenaRootTypeVtable', 0x2065915c, 16),
    ]:
        scope = 'original-file-backed-constant'
        if label == 'arenaRootWrapper':
            rva = address - pe.base
            section = next((entry for entry in pe.sections
                            if entry[1] + entry[2] <= rva
                            and rva + size <= entry[1] + entry[0]), None)
            assert section is not None, 'Wrapper must lie wholly in PE zero-fill extent'
            raw = bytes(size)
            scope = 'original-loader-zero-fill'
        else:
            raw = pe.bytes(address, size)
        if label == 'arenaRootInitializerSlot':
            assert int.from_bytes(raw, 'little') == 0x204b1d70
        if label == 'arenaRootTypeVtable':
            assert int.from_bytes(raw[12:16], 'little') == 0x2002adfb
        images.append(dict(label=label, address=f'{address:08x}', bytes=size,
                           raw=raw.hex(), sha256=hashlib.sha256(raw).hexdigest(),
                           scope=scope, liveValueCaptured=False))
    return dict(schema='gothic3-game-arena-root-source-v1', module=module,
                shared=shared, images=images,
                producerSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                sourceOnly=True, initializerImplemented=False,
                wholeCrtTraversalCompleted=False, fullCampaignCompleted=False)


def runtime(source, path):
    payload = json.dumps(source, indent=2) + '\n'
    path.write_text(
        "import sourceText from '../../assets/gothic3/game-arena-root/source.json?raw';\n"
        + "import source from '../../assets/gothic3/game-arena-root/source.json';\n"
        + "import type { NativeCrtImageReceipt } from './native-game-crt-profile';\n"
        + "import type { NativeGameIoInstruction } from './native-game-crt-io-source';\n"
        + 'const expectedText = ' + json.dumps(payload) + ';\n'
        + "function freeze(value:unknown):void { if(value!==null && typeof value==='object' && !Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);} }\n"
        + "export function admitGameArenaRootSource():void { if(sourceText!==expectedText)throw new Error('Original Arena root source differs'); }\n"
        + "admitGameArenaRootSource(); freeze(source);\n"
        + "export const gameArenaRootImages:Readonly<Record<string,NativeCrtImageReceipt>> = Object.fromEntries(source.images.map(image=>[image.label,{...image,module:'Game',scope:image.scope==='original-loader-zero-fill'?'cold-original-image':image.scope,knownMask:'ff'.repeat(image.bytes)}]));\n"
        + "export const gameArenaRootImagePins = Object.fromEntries(source.images.map(image=>[image.label,[image.scope==='original-loader-zero-fill'?'coldGlobals':'constBytes',image.address,image.bytes,image.raw,image.sha256] as const]));\n"
        + "freeze(gameArenaRootImages); freeze(gameArenaRootImagePins);\n"
        + "export function gameArenaRootImageReceipt(label:string):NativeCrtImageReceipt { admitGameArenaRootSource(); const image=gameArenaRootImages[label]; if(!image)throw new Error('Unknown Arena root image'); return image; }\n"
        + "export function gameArenaRootInstruction(entry:string,pc:string):NativeGameIoInstruction { admitGameArenaRootSource(); const method=[...source.module.methods,...source.shared.methods].find(method=>method.entryVA==='0x'+entry || method.bodyVA==='0x'+entry); const row=method?.instructions.find(row=>row.va===pc); if(!row)throw new Error('Unowned Arena root instruction'); return row; }\n"
        + "export function admitArenaWrapperConstructorImport():void { admitGameArenaRootSource(); const imported=source.module.imports.find(row=>row.iatVA==='0x207d87b8'); if(!imported || imported.module!=='SharedBase.dll' || imported.name!=='??0bCPropertyObjectBase@@IAE@XZ' || imported.ordinal!==null)throw new Error('Original Arena wrapper constructor import differs'); }\n"
        + "export function gameArenaWrapperImportTarget(iat:string):string { admitGameArenaRootSource(); const selected=iat==='207d86e8'?['propertyWrapperIsRoot','?IsRoot@bCPropertyObjectBase@@QBE_NXZ']:iat==='207d87c4'?['objectRefSetPropertyObject','?SetPropertyObject@bCObjectRefBase@@IAEXPBVbCPropertyObjectBase@@@Z']:null; const imported=source.module.imports.find(row=>row.iatVA==='0x'+iat); const method=source.shared.methods.find(method=>method.label===selected?.[0]); if(!selected || !imported || imported.module!=='SharedBase.dll' || imported.name!==selected[1] || imported.ordinal!==null || !method)throw new Error('Unowned Arena wrapper import'); return method.bodyVA.slice(2); }\n"
        + "export function admitArenaPropertySingletonImport():void { admitGameArenaRootSource(); const imported=source.module.imports.find(row=>row.iatVA==='0x207d8868'); if(!imported || imported.module!=='SharedBase.dll' || imported.name!=='?GetInstance@bCPropertyObjectSingleton@@SGAAV1@XZ' || imported.ordinal!==null)throw new Error('Original Arena property singleton import differs'); }\n"
        + "export function arenaRegistrationToggleTarget():string { admitGameArenaRootSource(); const imported=source.module.imports.find(row=>row.iatVA==='0x207d86ec'); const method=source.shared.methods.find(method=>method.label==='propertySingletonEnableRegistration'); if(!imported || imported.module!=='SharedBase.dll' || imported.name!=='?EnableRegistration@bCPropertyObjectSingleton@@QAEXPAX_N@Z' || imported.ordinal!==null || !method)throw new Error('Original Arena registration-toggle import differs'); return method.bodyVA.slice(2); }\n",
        encoding='utf-8', newline='\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--runtime-output', type=Path)
    args = parser.parse_args()
    source = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(source, indent=2) + '\n', encoding='utf-8', newline='\n')
    if args.runtime_output:
        runtime(source, args.runtime_output)
    print('Verified', sum(method['instructionCount'] for key in ['module', 'shared']
                          for method in source[key]['methods']), 'Arena startup instructions')
