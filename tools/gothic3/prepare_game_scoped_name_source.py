"""Capture original scoped struct demangler instructions and physical constants."""
import argparse
import hashlib
import json
from pathlib import Path

from read_dialogue_native_evidence import audit_module, PE, EXPECTED_INPUTS

def capture(study):
    module = audit_module(study, 'Game_dll', 'Game.dll', {
        0x2047ad36:'getZName', 0x2047af20:'getScopedName',
        0x2047b013:'getECSUDataType', 0x2047bf3e:'getScope',
    })
    raw = (study/'00_Original_Runtime/Game.dll').read_bytes()
    assert hashlib.sha256(raw).hexdigest() == EXPECTED_INPUTS['Game.dll']
    pe=PE(raw)
    constants=[]
    for label,address,expected in [('gameScopedStructKeyword',0x206bee08,b'struct \0'),('gameScopedSeparator',0x206bedec,b'::\0')]:
        data=pe.bytes(address,len(expected)); assert data==expected,(label,data)
        constants.append(dict(label=label,address=f'{address:08x}',bytes=len(data),raw=data.hex(),sha256=hashlib.sha256(data).hexdigest()))
    return dict(schema='gothic3-game-scoped-name-source-v1',module=module,constants=constants,
        producerSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),sourceOnly=True,
        wholeCrtTraversalCompleted=False,fullCampaignCompleted=False)

def runtime(source,path):
    payload=json.dumps(source,indent=2)+'\n'
    constants={c['label']:dict(module='Game',address=c['address'],bytes=c['bytes'],raw=c['raw'],
        knownMask='ff'*c['bytes'],sha256=c['sha256'],scope='original-file-backed-constant',liveValueCaptured=False)
        for c in source['constants']}
    pins={c['label']:['constBytes',c['address'],c['bytes'],c['raw'],c['sha256']] for c in source['constants']}
    path.write_text("import sourceText from '../../assets/gothic3/game-scoped-name/source.json?raw';\n"
        + "import type { NativeCrtImageReceipt } from './native-game-crt-profile';\n"
        + 'const expectedText = '+json.dumps(payload)+';\n'
        + 'export function admitGameScopedNameSource(): void {\n'
        + "  if (sourceText !== expectedText) throw new Error('Original Game scoped-name source differs');\n}\n"
        + 'function freeze(value:unknown):void { if(value!==null && typeof value===\'object\' && !Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);} }\n'
        + 'export const gameScopedNameImagePins = '+json.dumps(pins)+' as const;\n'
        + 'export const gameScopedNameConstants: Readonly<Record<string,NativeCrtImageReceipt>> = '+json.dumps(constants)+';\n'
        + 'freeze(gameScopedNameImagePins); freeze(gameScopedNameConstants);\n'
        + 'export function gameScopedNameImageReceipt(label:string):NativeCrtImageReceipt {\n'
        + "  admitGameScopedNameSource(); const receipt=gameScopedNameConstants[label]; if(!receipt)throw new Error('Unknown Game scoped-name image'); return receipt;\n}\n",
        encoding='utf-8',newline='\n')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--study',type=Path,required=True); p.add_argument('--output',type=Path,required=True)
    p.add_argument('--runtime-output',type=Path)
    args=p.parse_args(); source=capture(args.study)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(source,indent=2)+'\n',encoding='utf-8',newline='\n')
    if args.runtime_output: runtime(source,args.runtime_output)
    print('Verified',sum(m['instructionCount'] for m in source['module']['methods']),'scoped-name instructions')
