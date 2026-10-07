"""Capture source candidates for property owner getters; execute no game code.

Callback stores identify candidate vtables, not live dispatch results. The
runtime must read the actual receiver vtable before selecting a getter.
"""
import argparse
import hashlib
import json
import re
import struct
from pathlib import Path
import read_dialogue_native_evidence as native

def capture(study, callbacks, output, admission):
    image = (study / '00_Original_Runtime/Game.dll').read_bytes()
    assert hashlib.sha256(image).hexdigest() == native.EXPECTED_INPUTS['Game.dll']
    pe = native.PE(image)
    imports = {row['iatVA']: row for row in pe.imports()}
    index = json.loads((callbacks / 'callback-index.json').read_bytes())
    vtables = {}
    for method in index['callbacks'].values():
        assembly = (callbacks / method['assembly']).read_bytes()
        assert hashlib.sha256(assembly).hexdigest() == method['assemblySha256']
        registers, stores = {}, {}
        for line in assembly.decode().splitlines():
            pc, raw, text = line.split(' | ', 2)
            assert pe.bytes(int(pc, 16), len(bytes.fromhex(raw))) == bytes.fromhex(raw)
            op, args = (text.split(' ', 1) + [''])[:2]
            if op == 'MOV':
                reg = re.fullmatch(r'(E[A-Z]{2}),(0x[0-9a-f]+)', args)
                store = re.fullmatch(r'dword ptr \[(0x[0-9a-f]+)\],(0x[0-9a-f]+)', args)
                if reg: registers[reg[1]] = int(reg[2], 16)
                else: registers.pop(args.split(',')[0], None)
                if store: stores[int(store[1], 16)] = int(store[2], 16)
            elif op == 'CALL':
                match = re.fullmatch(r'dword ptr \[(0x[0-9a-f]+)\]', args)
                imported = imports.get(match[1]) if match else None
                if imported and imported['name'] == '?Create@bCPropertyTypeBase@@MAEXXZ':
                    receiver = registers.get('ECX')
                    assert receiver in stores, 'No literal vtable candidate: ' + pc
                    table = stores[receiver]
                    vtables[f'{table:08x}'] = f'{struct.unpack("<I", pe.bytes(table + 0x10, 4))[0]:08x}'
                for register in ['EAX', 'ECX', 'EDX']: registers.pop(register, None)
            elif op.startswith('J'): registers.clear(); stores.clear()
            elif op in ['LEA', 'POP', 'XOR', 'ADD', 'SUB']: registers.pop(args.split(',')[0], None)
    assert len(vtables) == 328
    audit = native.audit_module(study, 'Game_dll', 'Game.dll',
        {int(entry, 16): 'getter' + str(i) for i, entry in enumerate(sorted(set(vtables.values())))})
    getters = {}
    for method in audit['methods']:
        rows = method['instructions']
        assert len(rows) == 2 and rows[1]['bytes'] == 'c3' and rows[0]['bytes'] in ['8b4118', '8b411c']
        getters[method['entryVA'][2:]] = {'entry': method['entryVA'][2:], 'body': method['bodyVA'][2:],
            'entryChain': method['entryChain'], 'fieldOffset': int(rows[0]['bytes'][-2:], 16),
            'instructions': rows, 'bodySha256': method['bodyInstructionBytesSha256']}
    result = {'schema': 'gothic3-property-owner-getters-v1',
        'gameSha256': hashlib.sha256(image).hexdigest(), 'functionsCsvSha256': audit['functionsCsvSha256'],
        'assemblySha256': audit['assemblySha256'], 'vtables': vtables, 'getters': getters,
        'sourceOnly': True, 'liveDispatchProven': False}
    output.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(result, indent=2) + '\n'
    output.write_bytes(text.encode())
    admission.parent.mkdir(parents=True, exist_ok=True)
    admission.write_bytes(('/** Generated immutable property getter admission; regenerate from the original image. */\n'
        'export const propertyOwnerGetterSourceText = ' + json.dumps(text) + ';\n').encode())
    print('Captured', len(getters), 'owner getters for', len(vtables), 'vtable candidates')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--callbacks', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--admission', type=Path, required=True)
    args = parser.parse_args()
    capture(args.study, args.callbacks, args.output, args.admission)
