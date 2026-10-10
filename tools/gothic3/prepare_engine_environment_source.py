"""Capture Engine's original CRT environment routine without executing it."""
import argparse
import hashlib
import json
from pathlib import Path

from read_dialogue_native_evidence import EXPECTED_INPUTS, PE, audit_module


def capture(study):
    EXPECTED_INPUTS['Engine.dll'] = 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'
    evidence = audit_module(study, 'Engine_dll', 'Engine.dll', {
        0x3068e828: 'engineGetEnvironmentStringsA',
    })
    pe = PE((study / '00_Original_Runtime/Engine.dll').read_bytes())
    images = []
    for address, label in [(0x30af7908, 'environmentMode'), (0x30af70d4, 'environmentPointer')]:
        rva = address - pe.base
        section = next(s for s in pe.sections if s[1] <= rva and rva + 4 <= s[1] + max(s[0], s[2]))
        backed = max(0, min(4, section[1] + section[2] - rva))
        raw = (pe.bytes(address, backed) if backed else b'') + bytes(4 - backed)
        images.append(dict(label=label, address=f'{address:08x}', raw=raw.hex(),
                           bytes=4, fileBackedBytes=backed, loaderZeroFillBytes=4-backed,
                           sha256=hashlib.sha256(raw).hexdigest()))
    continuation = pe.bytes(0x3067725c, 15)
    if continuation.hex() != 'e8c7750100a3d470af30e881140100':
        raise ValueError('Original Engine environment caller differs')
    return dict(schema='gothic3-engine-environment-source-v1', source=evidence,
                images=images, caller=dict(call='3067725c', target='3068e828',
                store='30677261', nextCall='30677266', nextTarget='306886ec',
                raw=continuation.hex(), sha256=hashlib.sha256(continuation).hexdigest()),
                runtimeConnected=False,
                notes=['Source evidence does not establish environment execution or return.',
                       'Engine environment state and allocation must belong to the Engine CRT.'])


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
        generated = """/** Generated original Engine environment source admission. */
import source from '../../assets/gothic3/engine-environment/research.json';
import sourceText from '../../assets/gothic3/engine-environment/research.json?raw';
const expectedText = EXPECTED;
function freeze(value:unknown):void {if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}}
freeze(source);
export function admitEngineEnvironmentSource():void {if(sourceText!==expectedText)throw new Error('Original Engine environment source differs');}
export function engineEnvironmentInstruction(pc:string){admitEngineEnvironmentSource();const row=source.source.methods[0]?.instructions.find(row=>row.va===pc);if(!row)throw new Error('Original Engine environment instruction required');return row;}
export function engineEnvironmentImage(label:string){admitEngineEnvironmentSource();const image=source.images.find(image=>image.label===label);if(!image)throw new Error('Original Engine environment image required');return image;}
""".replace('EXPECTED', expected)
        args.typescript.write_text(generated, encoding='utf-8', newline='\n')
