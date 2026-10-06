"""Recover property notification and entity modification reads from original PE bytes.

Reads the completed local study offline. No native binary or reconstructed
native code is loaded or executed. Run from the Tervain repository checkout.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import struct

from research_native_combat import (
    PE, INPUTS, SHORT, SUPPORTED_SHA256, collect_module, save_json, sha,
)

INPUTS['SharedBase_dll'] = '00_Original_Runtime/SharedBase.dll'
SHORT['SharedBase_dll'] = 'SharedBase'
SUPPORTED_SHA256['SharedBase'] = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'

SELECTED = {
    'Engine_dll': set('''
3001ca2b 3001b09a 30010b68 3000d0da 3003dd93
3003b5bb 3001a091 3002ad10 30037ca4 3003544f
3001882c 3000a173 30003bbb 3000dc79
300253e2 3001d7b9 30047636 30030e27
'''.split()),
    'SharedBase_dll': set('''
10001186 10005a65 10008805 100027de 10006019 10002568
10001f05 100059ed 10006334 1000873d
10005ffb 10004bfb
'''.split()),
    'Game_dll': set('''
20004f0c 2000ee3a 20028745 20029cb7 2000cce3 20036cdc 200049a3 20031f48
200077e8 20462864 20461e80 20461e86 20461e8c 20461e92
'''.split()),
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    root = Path.cwd().resolve()
    if not (root / 'src/gothic3').is_dir():
        raise ValueError('Run from the Tervain repository root')
    out = root / 'assets/gothic3/properties'
    out.mkdir(parents=True, exist_ok=True)
    bodies, instructions, registrations, inputs = [], {}, [], {}
    for module, selected in SELECTED.items():
        short = SHORT[module]
        path = args.study / INPUTS[module]
        if sha(path) != SUPPORTED_SHA256[short]:
            raise ValueError('Unsupported original ' + short + '.dll')
        inputs[short] = {'path': INPUTS[module], 'sha256': sha(path)}
        b, i, r = collect_module(args.study, module, set(selected), PE(path), out)
        bodies += b
        instructions.update(i)
        registrations += r
    audit = {
        'entries': len(bodies),
        'instructions': sum(len(rows) for rows in instructions.values()),
        'matchedBytes': sum(len(bytes.fromhex(row['bytes']))
                            for rows in instructions.values() for row in rows),
        'allListedInstructionBytesMatchOriginalPE': True,
        'nativeCodeExecuted': False,
    }
    entity_tables = {'eCEntity': ('Engine', 0x3087aa9c),
                     'eCSpatialEntity': ('Engine', 0x3087b23c),
                     'eCDynamicEntity': ('Engine', 0x3087b3ec),
                     'gCEntity': ('Game', 0x2066813c)}
    property_tables = {'gCScriptRoutine_PS': 0x2069c754,
                       'gCPlayerMemory_PS': 0x2069845c,
                       'gCNPC_PS': 0x2069668c}
    # Pin concrete receiver classes, rather than inferring their behavior from
    # a decompiler's occasionally lossy constructor/type names.
    expected_entity_targets = {'eCEntity': 0x3003544f,
                               'eCSpatialEntity': 0x3003544f,
                               'eCDynamicEntity': 0x3003544f,
                               'gCEntity': 0x20462864}
    inherited_targets = {0x4c: 0x20461e80, 0x50: 0x20461e86,
                         0x58: 0x20461e8c, 0x5c: 0x20461e92}
    vtables = {'entities': {}, 'propertySets': {}}
    for name, (module, va) in entity_tables.items():
        pe = PE(args.study / INPUTS[module + '_dll'])
        raw = pe.at(va + 0x118, 4)
        if struct.unpack('<I', raw)[0] != expected_entity_targets[name]:
            raise ValueError('Original entity Modified dispatch differs: ' + name)
        vtables['entities'][name] = {'module': module, 'vtableAddress': f'{va:08x}',
                                    'offset': '0x118', 'bytes': raw.hex(),
                                    'target': f'{struct.unpack("<I", raw)[0]:08x}'}
    pe = PE(args.study / INPUTS['Game_dll'])
    for name, va in property_tables.items():
        entries = {}
        for offset in (0x4c, 0x50, 0x58, 0x5c):
            raw = pe.at(va + offset, 4)
            expected = (0x200077e8 if name == 'gCNPC_PS' and offset == 0x50
                        else inherited_targets[offset])
            if struct.unpack('<I', raw)[0] != expected:
                raise ValueError('Original property-set notification dispatch differs: '
                                 + name + ' +' + hex(offset))
            entries[f'0x{offset:x}'] = {'bytes': raw.hex(),
                                     'target': f'{struct.unpack("<I", raw)[0]:08x}'}
        vtables['propertySets'][name] = {'module': 'Game', 'vtableAddress': f'{va:08x}',
                                       'entries': entries}
    save_json(out / 'native-evidence.json', {
        'schema': 'gothic3-native-properties-evidence-v1', 'inputs': inputs,
        'functions': bodies, 'instructions': instructions,
        'registrations': registrations, 'audit': audit, 'vtables': vtables,
    })
    rules = {
        'schema': 'gothic3-native-properties-rules-v1',
        'inputs': {module: item['sha256'] for module, item in inputs.items()},
        'modifiedWordOffset': 0x130, 'defaultModifiedWord': 0xffffffff,
        'ownerOffset': 0x0c, 'dispatchOffsets': [0x4c, 0x50],
        'ownerModifiedIsReadOnly': True,
        'profiles': {
            'gCScriptRoutine_PS': {'customExit': None, 'vtable': '2069c754'},
            'gCPlayerMemory_PS': {'customExit': None, 'vtable': '2069845c'},
            'gCNPC_PS': {'customExit': 'Enclave proxy SetEntity unless propagated', 'vtable': '2069668c'},
        },
        'propertyID': {'storageBytes': 20, 'equalityBytes': 16,
                       'assignmentCopiesBytes': 16, 'assignmentClearsTrailingDWORD': True},
        'proxySetEntity': 'Compare PropertyID first16 bytes; equal leaves internal reference intact; otherwise copy ID/clear tail, ReleaseReference when nonnull, then clear internal pointer',
        'evidence': {'path': 'native-evidence.json', 'sha256': sha(out / 'native-evidence.json')},
        'remaining': ['full entity create/read/world lifecycle',
                      'nonnull proxy internal ReleaseReference and final destruction host',
                      'notification overrides of other property-set classes'],
    }
    save_json(out / 'runtime-rules.json', rules)
    public = root / 'public/gothic3/properties'
    save_json(public / 'runtime-rules.json', rules)
    save_json(out / 'output-receipt.json', {
        'schema': 'gothic3-native-properties-output-receipt-v1',
        'runtime': {'path': 'src/gothic3/native-properties.ts', 'sha256': sha(root / 'src/gothic3/native-properties.ts')},
        'producer': {'path': 'tools/gothic3/research_native_properties.py', 'sha256': sha(Path(__file__))},
        'helper': {'path': 'tools/gothic3/research_native_combat.py', 'sha256': sha(root / 'tools/gothic3/research_native_combat.py')},
        'publicRules': {'path': 'public/gothic3/properties/runtime-rules.json',
                        'bytes': (public / 'runtime-rules.json').stat().st_size,
                        'sha256': sha(public / 'runtime-rules.json')},
        'audit': audit, 'nativeCodeExecuted': False,
    })
    print(audit)


if __name__ == '__main__':
    main()
