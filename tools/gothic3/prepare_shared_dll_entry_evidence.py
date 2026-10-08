"""Read-only capture of the SharedBase DLL entry dependency chain."""
import argparse
import hashlib
import json
from pathlib import Path
import read_dialogue_native_evidence as native
from prepare_runtime_admin_source import image_bytes

SHA = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'

def capture(study, output):
    binary = (study / '00_Original_Runtime/SharedBase.dll').read_bytes()
    if hashlib.sha256(binary).hexdigest() != SHA:
        raise ValueError('Unsupported SharedBase module')
    native.EXPECTED_INPUTS['SharedBase.dll'] = SHA
    result = native.audit_module(study, 'SharedBase_dll', 'SharedBase.dll', {
        0x100adc25: 'dllCrtStartupCaller',
        0x10008a76: 'sharedDllMain',
        0x10006645: 'sharedDllMainInitializer',
        0x10008058: 'dllVersionQuery',
        0x1000840e: 'dllLogSeparator',
        0x1000871f: 'dllLogVersion',
    })
    pe = native.PE(binary)
    result['coldImages'] = []
    for label, address, size in [
        ('optionalCrtHook', 0x100ed680, 4),
        ('dllInitializerObject', 0x102f48ec, 4),
        ('dllInitializerGuard', 0x102f48f0, 4),
        ('moduleName', 0x100ebb14, 15),
        ('versionFormat', 0x100eba68, 80),
        ('separator', 0x100ebab8, 76),
    ]:
        raw, section = image_bytes(pe, address, size)
        result['coldImages'].append({'label': label, 'address': f'{address:08x}',
            'size': size, 'bytes': raw.hex(), 'section': section})
    result['scope'] = 'Captured evidence only; these DLL entry bodies are not yet executed by the browser.'
    output.mkdir(parents=True, exist_ok=True)
    (output / 'source.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8', newline='\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    capture(args.study, args.output)
