"""Capture original Engine I/O initialization and its first source dependencies."""
import argparse
import hashlib
import json
from pathlib import Path

from read_dialogue_native_evidence import EXPECTED_INPUTS, PE, audit_module


def capture(study):
    EXPECTED_INPUTS['Engine.dll'] = 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'
    evidence = audit_module(study, 'Engine_dll', 'Engine.dll', {
        0x306886ec: 'engineIoInit',
        0x3067e500: 'engineIoSehProlog',
        0x3067ca01: 'engineIoCallocCrt',
    })
    pe = PE((study / '00_Original_Runtime/Engine.dll').read_bytes())
    images = []
    for address, size, label in [(0x30af7cdc, 4, 'ioHandleCount'),
                                 (0x30af7d20, 256, 'ioBlockPointers'),
                                 (0x30956c00, 28, 'ioSehScope')]:
        rva = address - pe.base
        section = next(s for s in pe.sections if s[1] <= rva and rva + size <= s[1] + max(s[0], s[2]))
        backed = max(0, min(size, section[1] + section[2] - rva))
        raw = (pe.bytes(address, backed) if backed else b'') + bytes(size - backed)
        images.append(dict(label=label, address=f'{address:08x}', bytes=size,
                           raw=raw.hex(), fileBackedBytes=backed, loaderZeroFillBytes=size-backed,
                           sha256=hashlib.sha256(raw).hexdigest()))
    caller = pe.bytes(0x30677266, 21)
    if caller.hex() != 'e88114010085c07d07e8446d0000ebcce8f4740100':
        raise ValueError('Original Engine I/O caller differs')
    return dict(schema='gothic3-engine-io-source-v1', source=evidence,
                images=images, caller=dict(call='30677266', target='306886ec',
                resultTest='3067726b', failureCall='3067726f', failureTarget='3067dfb8',
                nextCall='30677276', nextTarget='3068e76f', raw=caller.hex(),
                sha256=hashlib.sha256(caller).hexdigest()),
                layout=dict(recordsPerBlock=32, recordBytes=56, initialBlockBytes=1792,
                            blockPointerSlots=64, startupInfoBytes=68),
                runtimeConnected=False,
                notes=['The original Engine I/O entry includes its own EH4 frame.',
                       'Captured source does not establish execution, allocation or I/O return.'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    receipt = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')
