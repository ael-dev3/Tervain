"""Capture original primitive RTTI branches, dispatch tables and keyword bytes."""
import argparse
import hashlib
import json
import struct
from pathlib import Path
from read_dialogue_native_evidence import audit_module, PE, EXPECTED_INPUTS

KEYWORDS = [('Bool',0x206bef94,'bool'),('Char',0x206beff4,'char'),('Short',0x206befec,'short'),
            ('Int',0x206befe8,'int'),('Long',0x206befe0,'long'),('Float',0x206befd8,'float'),
            ('Unsigned',0x206bed08,'unsigned ')]


def capture(study):
    raw=(study/'00_Original_Runtime/Game.dll').read_bytes()
    if hashlib.sha256(raw).hexdigest()!=EXPECTED_INPUTS['Game.dll']: raise ValueError('Original Game image differs')
    pe=PE(raw)
    module=audit_module(study,'Game_dll','Game.dll',{0x2047bd2d:'primitiveGetDecoratedName',
        0x2047d2ac:'primitiveGetDataType',0x2047d16e:'primitiveGetPrimaryDataType',0x2047cde7:'primitiveGetSimpleDataType'})
    images=[]
    for label,address,text in KEYWORDS:
        data=pe.bytes(address,len(text)+1)
        if data!=text.encode()+b'\0': raise ValueError('Original primitive keyword differs: '+label)
        images.append(dict(label='gamePrimitive'+label+'Keyword',address=f'{address:08x}',bytes=len(data),
            raw=data.hex(),sha256=hashlib.sha256(data).hexdigest(),liveValueCaptured=False))
    lookup=pe.bytes(0x2047d163,11); dispatch=pe.bytes(0x2047d14b,24)
    targets={code:struct.unpack_from('<I',dispatch,lookup[ord(code)-0x43]*4)[0] for code in 'EGHJKM'}
    if targets!={'E':0x2047ce3e,'G':0x2047ce48,'H':0x2047ce52,'J':0x2047ce5c,'K':0x2047ce5c,'M':0x2047ce66}:
        raise ValueError('Original primitive dispatch differs')
    rows=module['methods'][-1]['instructions']
    checks={'2047cf39':'CMP EAX,0x4e','2047cf3c':'JZ 0x2047cfef','2047cfef':'PUSH 0x206bef94',
            '2047d081':'PUSH 0x206bed08','2047d0b3':'JNZ 0x2047cf7d'}
    for address,instruction in checks.items():
        if next(row['instruction'] for row in rows if row['va']==address)!=instruction: raise ValueError('Primitive selecting branch differs')
    for label,address,data in [('gamePrimitiveLookup',0x2047d163,lookup),('gamePrimitiveDispatch',0x2047d14b,dispatch)]:
        images.append(dict(label=label,address=f'{address:08x}',bytes=len(data),raw=data.hex(),
            sha256=hashlib.sha256(data).hexdigest(),liveValueCaptured=False))
    return dict(schema='gothic3-game-primitive-demangler-v1',module=module,images=images,
        dispatchTargets={code:f'{target:08x}' for code,target in targets.items()},
        producerSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),sourceOnly=True,
        executionAdmitted=False,wholeCrtTraversalCompleted=False,fullCampaignCompleted=False)


def write_runtime(data,path):
    template='''/** Generated original primitive demangler source; no arbitrary grammar grant. */
import sourceText from '../../assets/gothic3/game-primitive-demangler/source.json?raw';
import type { NativeCrtSourceRules, NativeCrtImageReceipt } from './native-game-crt-profile';
const expectedText = __EXPECTED__;
export function admitGamePrimitiveSource(): void {
  if (sourceText !== expectedText) throw new Error('Original Game primitive demangler source differs');
}
admitGamePrimitiveSource();
const source = JSON.parse(sourceText) as { schema:string; module:{inputSha256:string; methods:{label:string;entryVA:string;bodyVA:string;bodyInstructionBytesSha256:string}[]};
  images:{label:string;address:string;bytes:number;raw:string;sha256:string;liveValueCaptured:boolean}[] };
function freeze(value: unknown): void {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child); Object.freeze(value);
  }
}
freeze(source);
export const gamePrimitiveImagePins: Readonly<Record<string, readonly ['constBytes',string,number,string,string]>> =
  Object.fromEntries(source.images.map(image => [image.label,['constBytes',image.address,image.bytes,image.raw,image.sha256]]));
export const gamePrimitiveSourceRules: NativeCrtSourceRules = { schema:source.schema,inputs:{Game:source.module.inputSha256},
  methods:Object.fromEntries(source.module.methods.map(method => [method.label,{...method,module:'Game',entry:method.entryVA.slice(2),body:method.bodyVA.slice(2)}])),
  coldGlobals:{},constBytes:Object.fromEntries(source.images.map(image => [image.label,{...image,module:'Game',knownMask:'ff'.repeat(image.bytes),scope:'original-file-backed-constant'}])) };
freeze(gamePrimitiveSourceRules); freeze(gamePrimitiveImagePins);
export function gamePrimitiveImageReceipt(label:string): NativeCrtImageReceipt {
  const receipt=gamePrimitiveSourceRules.constBytes[label];if (!receipt) throw new Error('Unknown original primitive image');return receipt;
}
'''
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(template.replace('__EXPECTED__',json.dumps(json.dumps(data,indent=2)+'\n')),encoding='utf-8',newline='\n')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',type=Path,required=True);parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--runtime-output',type=Path,required=True)
    args=parser.parse_args();data=capture(args.study)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8',newline='\n')
    write_runtime(data,args.runtime_output)
    print('Verified primitive branch source, keyword bytes and dispatch tables')
