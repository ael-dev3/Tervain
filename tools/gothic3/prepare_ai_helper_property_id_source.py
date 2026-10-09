"""Reproduce source evidence for Game's AI helper PropertyID initializer.

This captures original bytes; it does not execute or implement startup.
"""
import argparse
import hashlib
import json
from pathlib import Path

from read_dialogue_native_evidence import EXPECTED_INPUTS, PE


def capture(study):
    data = (study / '00_Original_Runtime/Game.dll').read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != EXPECTED_INPUTS['Game.dll']:
        raise ValueError('Unsupported Game.dll build')
    pe = PE(data)
    root = Path(__file__).resolve().parents[2]
    rows = []
    assembly = root / 'assets/gothic3/game-cinit-callbacks/sources/Game/204b26c0.asm.txt'
    for line in assembly.read_text(encoding='utf-8').splitlines():
        address, raw, instruction = line.split(' | ', 2)
        va = int(address, 16)
        if pe.bytes(va, len(raw) // 2).hex() != raw:
            raise ValueError('Assembly differs from original bytes at ' + address)
        rows.append(dict(va=address, bytes=raw, instruction=instruction))
    if len(rows) != 19 or rows[-1]['va'] != '204b270c' or rows[-1]['instruction'] != 'RET':
        raise ValueError('Unexpected initializer extent')
    raw = bytes.fromhex(''.join(row['bytes'] for row in rows))
    if raw != pe.bytes(0x204b26c0, 0x4d):
        raise ValueError('Initializer instructions are not contiguous')
    addresses = {0x207d890c, 0x207d86b8, 0x207d86ac, 0x207d86b0, 0x207d8834}
    imports = [row for row in pe.imports() if int(row['iatVA'], 16) in addresses]
    if len(imports) != 5:
        raise ValueError('Missing original import bindings')
    cleanup = pe.bytes(0x20549ce0, 11)
    if cleanup.hex() != 'b9a8527b20ff25d4887d20':
        raise ValueError('Unexpected original PropertyID cleanup')
    cleanup_import = next(row for row in pe.imports() if row['iatVA'] == '0x207d88d4')
    if cleanup_import['name'] != '??1bCPropertyID@@QAE@XZ' or cleanup_import['module'] != 'SharedBase.dll':
        raise ValueError('Unexpected PropertyID destructor binding')
    images = []
    for address, size, label in [(0x207b52a8, 20, 'aiHelperPropertyId'),
                                  (0x2065a6bc, 39, 'aiHelperPropertyIdGuidLiteral')]:
        rva = address - pe.base
        section = next(s for s in pe.sections if s[1] <= rva and rva + size <= s[1] + max(s[0], s[2]))
        virtual_size, start, raw_size, raw_offset = section
        backed = max(0, min(size, start + raw_size - rva))
        image = (pe.bytes(address, backed) if backed else b'') + bytes(size - backed)
        images.append(dict(label=label, address=f'{address:08x}', bytes=size,
            raw=image.hex(), fileBackedBytes=backed, loaderZeroFillBytes=size-backed,
            sha256=hashlib.sha256(image).hexdigest(), liveValueCaptured=False))
    return dict(schema='gothic3-ai-helper-property-id-research-v1',
        module='Game.dll', inputSha256=digest, initializer='204b26c0',
        extent='204b26c0-204b270c', bytes=raw.hex(),
        bytesSha256=hashlib.sha256(raw).hexdigest(), instructions=rows,
        guidLiteralAddress='2065a6bc', guidLiteral=pe.string(0x2065a6bc),
        destination='207b52a8', cleanup='20549ce0', imports=imports,
        cleanupReceipt=dict(entry='20549ce0', bytes=cleanup.hex(),
            bytesSha256=hashlib.sha256(cleanup).hexdigest(),
            instructions=[dict(va='20549ce0', bytes=cleanup[:5].hex(), instruction='MOV ECX,0x207b52a8'),
                          dict(va='20549ce5', bytes=cleanup[5:].hex(), instruction='JMP dword ptr [0x207d88d4]')],
            importBinding=cleanup_import), images=images,
        relatedImplementation='src/gothic3/native-game-script-admin-startup.ts',
        runtimeConnected=False, initializerReturnVerified=False,
        notes=['Original CString and GUID temporaries must retain their constructor and destructor behavior.',
               'PropertyID construction and cleanup must use canonical image storage.',
               'Source capture alone does not establish startup execution or return.'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    receipt = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')
