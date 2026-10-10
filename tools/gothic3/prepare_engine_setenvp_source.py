"""Capture Engine environment-vector setup, including omitted PE cleanup rows."""
import argparse
import hashlib
import json
from pathlib import Path
from read_dialogue_native_evidence import EXPECTED_INPUTS, PE, audit_module


def capture(study):
    EXPECTED_INPUTS['Engine.dll'] = 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'
    source = audit_module(study, 'Engine_dll', 'Engine.dll', {
        0x3068e4f2: 'engineSetEnvp',
        0x30679ad0: 'engineEnvironmentStrlen',
        0x3067ca01: 'engineEnvironmentCallocCrt',
        0x3068a84a: 'engineEnvironmentStringCopy',
        0x30672f8a: 'engineEnvironmentFree',
    })
    pe = PE((study / '00_Original_Runtime/Engine.dll').read_bytes())
    method = next(m for m in source['methods'] if m['bodyVA'] == '0x3068e4f2')
    # Ghidra's exported body omits these reachable tails. Admit only the exact
    # selected encodings, independently compared to the pinned original PE.
    tails = [
        (0x3068e59d, '891dd470af30', 'MOV dword ptr [0x30af70d4],EBX'),
        (0x3068e5a3, '891f', 'MOV dword ptr [EDI],EBX'),
        (0x3068e5a5, 'c7056c7eaf3001000000', 'MOV dword ptr [0x30af7e6c],0x1'),
        (0x3068e5af, '33c0', 'XOR EAX,EAX'),
        (0x3068e5b1, '59', 'POP ECX'),
        (0x3068e5b2, '5d', 'POP EBP'),
        (0x3068e5c2, '891d1871af30', 'MOV dword ptr [0x30af7118],EBX'),
        (0x3068e5c8, '83c8ff', 'OR EAX,0xffffffff'),
        (0x3068e5cb, 'ebe4', 'JMP 0x3068e5b1'),
    ]
    for address, encoding, instruction in tails:
        raw = bytes.fromhex(encoding)
        if pe.bytes(address, len(raw)) != raw:
            raise ValueError(f'Original Engine cleanup differs at {address:08x}')
        method['instructions'].append(dict(va=f'{address:08x}', rva=f'{address-pe.base:x}',
            fileOffset=pe.offset(address, len(raw)), bytes=encoding, instruction=instruction,
            originalPERecovered=True, sourceASMGap=True))
    method['instructions'].sort(key=lambda row: int(row['va'], 16))
    method['bodyRanges'] = '3068e4f2-3068e585;3068e589-3068e5cc'
    raw = b''.join(bytes.fromhex(row['bytes']) for row in method['instructions'])
    method.update(instructionCount=len(method['instructions']), bodyByteCount=len(raw),
        bodyInstructionBytesSha256=hashlib.sha256(raw).hexdigest())
    caller = pe.bytes(0x3067727b, 9)
    if caller.hex() != '85c07c20e86e720100':
        raise ValueError('Original Engine post-argument caller differs')
    images = []
    for address, label in [(0x30af7118, 'environmentVector'), (0x30af7e6c, 'environmentReady')]:
        rva = address - pe.base
        section = next(s for s in pe.sections if s[1] <= rva and rva + 4 <= s[1] + max(s[0], s[2]))
        backed = max(0, min(4, section[1] + section[2] - rva))
        raw = (pe.bytes(address, backed) if backed else b'') + bytes(4 - backed)
        images.append(dict(label=label, address=f'{address:08x}', bytes=4, raw=raw.hex(),
            fileBackedBytes=backed, loaderZeroFillBytes=4-backed, sha256=hashlib.sha256(raw).hexdigest()))
    return dict(schema='gothic3.engine-setenvp-source.v1', source=source, images=images,
        caller=dict(resultTest='3067727b', failureBranch='3067727d', failureTarget='3067729f',
            call='3067727f', target='3068e4f2', returnAddress='30677284', raw=caller.hex(),
            sha256=hashlib.sha256(caller).hexdigest()), runtimeConnected=False,
        notes=['Retain the existing Engine environment block at 30af70d4; do not seed another owner.',
            'Cleanup rows omitted from the assembly export are checked against original PE bytes.',
            'Capture does not establish environment-vector execution or full Engine attachment.'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--typescript', type=Path)
    args = parser.parse_args()
    receipt = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(receipt, indent=2) + '\n'
    args.output.write_text(text, encoding='utf-8', newline='\n')
    if args.typescript:
        generated = """/** Generated original Engine environment-vector source admission. */
import source from '../../assets/gothic3/engine-setenvp/research.json';
import sourceText from '../../assets/gothic3/engine-setenvp/research.json?raw';
const expectedText = EXPECTED;
function freeze(value:unknown):void {if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}}
freeze(source);
export function admitEngineSetenvpSource():void {if(sourceText!==expectedText)throw new Error('Original Engine environment-vector source differs');}
export function engineSetenvpInstruction(entry:string,pc:string){admitEngineSetenvpSource();const method=source.source.methods.find(method=>method.bodyVA==='0x'+entry);const row=method?.instructions.find(row=>row.va===pc);if(!row)throw new Error('Original Engine environment-vector instruction required');return row;}
export function engineSetenvpCaller(){admitEngineSetenvpSource();return source.caller;}
export function engineSetenvpImage(label:string){admitEngineSetenvpSource();const image=source.images.find(image=>image.label===label);if(!image)throw new Error('Original Engine environment-vector image required');return image;}
""".replace('EXPECTED', json.dumps(text))
        args.typescript.write_text(generated, encoding='utf-8', newline='\n')
