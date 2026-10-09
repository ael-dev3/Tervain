"""Capture original Game __cinit math dependencies. No runtime grant is issued."""
import argparse
import hashlib
import json
import struct
from pathlib import Path

from read_dialogue_native_evidence import PE, audit_module, EXPECTED_INPUTS

TARGETS = {
    0x204665f4: 'cinit', 0x204738b0: 'isNonwritableInCurrentImage',
    0x20473830: 'validateImageBase', 0x20473860: 'findPESection',
    0x20463917: 'fpMath', 0x204638a7: 'floatConversionInit',
    0x204696f6: 'pentiumDivideDispatch', 0x204696ba: 'pentiumDivideTest',
    0x20469691: 'setDefaultPrecision', 0x2047df48: 'controlFpSecure',
    0x20469672: 'encodeFloatPointers',
    0x2048c74b: 'control87', 0x2046a282: 'errno',
    0x2046a20a: 'invalidParameterDispatch', 0x20467d64: 'encodePointer',
    0x2046a0d6: 'invokeWatson',
}


def capture(study):
    data = (study / '00_Original_Runtime/Game.dll').read_bytes()
    if hashlib.sha256(data).hexdigest() != EXPECTED_INPUTS['Game.dll']:
        raise ValueError('Original Game DLL differs')
    pe = PE(data)
    evidence = audit_module(study, 'Game_dll', 'Game.dll', TARGETS)
    nt = struct.unpack_from('<I', data, 0x3c)[0]
    section_count = struct.unpack_from('<H', data, nt + 6)[0]
    optional_size = struct.unpack_from('<H', data, nt + 20)[0]
    header_end = nt + 24 + optional_size + section_count * 40
    headers = data[:header_end]
    imports = {row['iatVA']: row for row in pe.imports()}
    observed_imports = [imports[key] for key in ('0x207d7b5c', '0x207d7c94')]
    literals = []
    for label, address, size in (
        ('mathCallback', 0x206b638c, 4), ('divideNumerator', 0x206b64f8, 8),
        ('divideDenominator', 0x206b6500, 8), ('divideExport', 0x206b6508, 28),
        ('divideModule', 0x206b6524, 9), ('floatPointerTable', 0x207b2330, 40),
        ('nonwritableEH4Scope', 0x206e8db0, 28),
    ):
        raw = pe.bytes(address, size)
        literals.append({'label': label, 'address': f'{address:08x}', 'bytes': size,
                         'raw': raw.hex(), 'sha256': hashlib.sha256(raw).hexdigest()})
    return {
        'schema': 'gothic3-game-cinit-math-evidence-v1', 'module': evidence,
        'originalHeaders': {'address': f'{pe.base:08x}', 'bytes': len(headers),
                            'raw': headers.hex(), 'sha256': hashlib.sha256(headers).hexdigest()},
        'literals': literals, 'divideDispatchImports': observed_imports,
        'sourceOnly': True, 'runtimeOwnerAdmitted': False,
        'nextWork': ['Own the original PE header and section views on the existing Game image',
                     'Execute the section protection check and original callback frame',
                     'Own x87 control/status, stack and divide-test semantics',
                     'Execute pointer encoding and the original initializer tables'],
    }


def emit_runtime(result, path):
    selected = ['cinit', 'isNonwritableInCurrentImage', 'validateImageBase', 'findPESection']
    methods = [{key: method[key] for key in ('label', 'entryVA', 'bodyRanges',
                'bodyInstructionBytesSha256', 'instructions')}
               for method in result['module']['methods'] if method['label'] in selected]
    if len(methods) != 4 or sum(len(method['instructions']) for method in methods) != 150:
        raise ValueError('Selected cinit/PE method scope differs')
    images = {'cinitPEHeaders': result['originalHeaders']}
    for label, original in [('cinitMathCallback', 'mathCallback'),
                            ('cinitNonwritableEH4Scope', 'nonwritableEH4Scope')]:
        images[label] = next(row for row in result['literals'] if row['label'] == original)
    pins = {label: ['constBytes', row['address'], row['bytes'], row['raw'], row['sha256']]
            for label, row in images.items()}
    compact = lambda value: json.dumps(value, separators=(',', ':'), ensure_ascii=False)
    text = '''/** Original Game cinit and PE-check source admission. Context math code is not executable here. */
import sourceText from '../../assets/gothic3/game-cinit-math-source/source.json?raw';
import type { NativeGameIoInstruction } from './native-game-crt-io-source';
import type { NativeCrtImageReceipt } from './native-game-crt-profile';
const methods = __METHODS__;
export const gameCinitImagePins: Readonly<Record<string, readonly ['constBytes', string, number, string, string]>> = __PINS__;
const source = JSON.parse(sourceText);
function freeze(value: unknown): void {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child); Object.freeze(value);
  }
}
freeze(methods); freeze(gameCinitImagePins); freeze(source);
let admitted = false;
export function admitGameCinitSource(): void {
  if (admitted) return;
  if (source.schema !== 'gothic3-game-cinit-math-evidence-v1' || source.sourceOnly !== true ||
      source.runtimeOwnerAdmitted !== false || source.module.inputSha256 !== '__GAME__' ||
      source.module.verifiedAgainstOriginalPE !== true) throw new Error('Original Game cinit source scope differs');
  for (const method of methods) {
    const original = source.module.methods.find((row: { label: string }) => row.label === method.label);
    if (!original || Object.keys(method).some(key => JSON.stringify(original[key]) !== JSON.stringify(method[key as keyof typeof method])))
      throw new Error('Original Game cinit method differs: ' + method.label);
  }
  for (const [label, pin] of Object.entries(gameCinitImagePins)) {
    const original = label === 'cinitPEHeaders' ? source.originalHeaders : source.literals.find((row: { label: string }) =>
      row.label === (label === 'cinitMathCallback' ? 'mathCallback' : 'nonwritableEH4Scope'));
    if (!original || original.address !== pin[1] || original.bytes !== pin[2] || original.raw !== pin[3] || original.sha256 !== pin[4])
      throw new Error('Original Game cinit image differs: ' + label);
  }
  admitted = true;
}
export function gameCinitInstruction(pc: string): NativeGameIoInstruction {
  admitGameCinitSource();
  for (const method of methods) {
    const point = method.instructions.find(row => row.va === pc);
    if (point) return point;
  }
  throw new Error('No admitted original Game cinit instruction: ' + pc);
}
export function gameCinitImageReceipt(label: string): NativeCrtImageReceipt {
  admitGameCinitSource(); const pin = gameCinitImagePins[label];
  if (!pin) throw new Error('No admitted original Game cinit image: ' + label);
  return Object.freeze({ module: 'Game', address: pin[1], bytes: pin[2], raw: pin[3],
    knownMask: 'ff'.repeat(pin[2]), sha256: pin[4], scope: 'original-file-backed-constant', liveValueCaptured: false });
}
'''
    text = text.replace('__METHODS__', compact(methods)).replace('__PINS__', compact(pins))
    text = text.replace('__GAME__', EXPECTED_INPUTS['Game.dll'])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8', newline='\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--runtime-output', type=Path)
    args = parser.parse_args()
    result = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n',
                           encoding='utf-8', newline='\n')
    if args.runtime_output:
        emit_runtime(result, args.runtime_output)
    print('Captured', len(result['module']['methods']), 'original methods; no execution granted')
