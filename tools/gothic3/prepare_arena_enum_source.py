"""Recover the next Arena enum metadata initializer and its original callees."""
import argparse
import hashlib
import json
from pathlib import Path
from read_dialogue_native_evidence import audit_module, PE


def capture(study):
    module = audit_module(study, 'Game_dll', 'Game.dll', {
        0x20011b99: 'arenaEnumValueConstructor',
        0x2001bdf1: 'arenaEnumValueName',
        0x2001cf35: 'arenaEnumValueInsert',
    })
    pe = PE((study / '00_Original_Runtime' / 'Game.dll').read_bytes())
    # The targeted initializer was recovered after the original functions CSV.
    # Admit its committed disassembly directly against the matching PE.
    path = Path(__file__).parents[2] / 'assets/gothic3/game-cinit-callbacks/sources/Game/204b1e70.asm.txt'
    instructions = []
    for line in path.read_text(encoding='utf-8').splitlines():
        address, raw, instruction = line.split(' | ', 2)
        assert pe.bytes(int(address, 16), len(raw) // 2).hex() == raw
        instructions.append({'va': address, 'bytes': raw, 'instruction': instruction})
    images = []
    for address, size, label in [
        (0x20659d48, 18, 'statusNoneName'),
        (0x207b4f48, 4, 'enumValueScratch'),
        (0x207b505c, 1, 'statusNoneReceiver'),
        (0x20659c74, 12, 'enumValueVtable'),
        (0x2065902c, 12, 'enumValueBaseVtable'),
    ]:
        rva = address - pe.base
        section = next((s for s in pe.sections if s[1] <= rva and rva + size <= s[1] + max(s[0], s[2])), None)
        if section is None:
            raise ValueError('Image outside original PE sections')
        virtual_size, start, raw_size, raw_offset = section
        file_bytes = max(0, min(size, start + raw_size - rva))
        raw = (pe.bytes(address, file_bytes) if file_bytes else b'') + bytes(size - file_bytes)
        images.append({'label': label, 'address': f'{address:08x}',
                       'bytes': size, 'raw': raw.hex(),
                       'fileBackedBytes': file_bytes, 'loaderZeroFillBytes': size - file_bytes,
                       'section': {'virtualAddress': start, 'virtualSize': virtual_size,
                                   'rawSize': raw_size, 'rawOffset': raw_offset},
                       'sha256': hashlib.sha256(raw).hexdigest()})
    return {'schema': 'gothic3-arena-enum-source-v1', 'module': module,
            'initializer': {'entry': '204b1e70', 'instructions': instructions},
            'images': images, 'sourceOnly': True,
            'initializerReturned': False, 'fullCampaignCompleted': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    source = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(source, indent=2) + '\n', encoding='utf-8', newline='\n')
    for method in source['module']['methods']:
        print(method['label'], method['bodyVA'], method['instructionCount'])
