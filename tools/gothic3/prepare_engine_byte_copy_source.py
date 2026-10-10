"""Capture Engine's scalar memcpy and its actual dispatch images."""
import argparse
import hashlib
import json
from pathlib import Path
from read_dialogue_native_evidence import EXPECTED_INPUTS, PE, audit_module


def capture(study):
    EXPECTED_INPUTS['Engine.dll'] = 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'
    evidence = audit_module(study, 'Engine_dll', 'Engine.dll', {0x30671cf0: 'engineMemcpy'})
    pe = PE((study / '00_Original_Runtime/Engine.dll').read_bytes())
    images = []
    for label, address, size in [
        ('sse2Flag', 0x30af7e68, 4),
        ('forwardAlignment', 0x30671d78, 16),
        ('forwardDwords', 0x30671df8, 32),
        ('forwardTail', 0x30671e64, 16),
        ('backwardAlignment', 0x30671f04, 16),
        ('backwardDwords', 0x30671f94, 32),
        ('backwardTail', 0x30672000, 16),
    ]:
        rva = address - pe.base
        section = next(s for s in pe.sections if s[1] <= rva and rva + size <= s[1] + max(s[0], s[2]))
        backed = max(0, min(size, section[1] + section[2] - rva))
        raw = (pe.bytes(address, backed) if backed else b'') + bytes(size - backed)
        images.append(dict(label=label, address=f'{address:08x}', bytes=size, raw=raw.hex(),
                           fileBackedBytes=backed, loaderZeroFillBytes=size-backed,
                           sha256=hashlib.sha256(raw).hexdigest()))
    caller = pe.bytes(0x3068e942, 18)
    # Capture both memcpy call and the following release call as independent
    # evidence. Do not infer their bytes from Game's similar CRT routine.
    if caller != bytes.fromhex('555657e8a633feff83c40c56ff1550c7af30'):
        raise ValueError('Original Engine environment memcpy call differs')
    return dict(schema='gothic3-engine-byte-copy-source-v1', source=evidence, images=images,
                caller=dict(arguments='3068e942', call='3068e945', target='30671cf0',
                            cleanup='3068e94a', releaseCall='3068e94e', releaseIat='30afc750', raw=caller.hex(),
                            sha256=hashlib.sha256(caller).hexdigest()),
                runtimeConnected=False,
                notes=['Scalar source includes forward and backward overlap paths.',
                       'Vector tail3067fda9 is a separate uncaptured dependency.',
                       'Source capture does not establish copying or environment return.'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    receipt = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')
