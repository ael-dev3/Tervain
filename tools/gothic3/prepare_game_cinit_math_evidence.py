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
    0x2048c74b: 'errno', 0x2046a282: 'invalidParameterNoInfo',
    0x2046a20a: 'controlFp', 0x20467d64: 'encodePointer',
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


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n',
                           encoding='utf-8', newline='\n')
    print('Captured', len(result['module']['methods']), 'original methods; no execution granted')
