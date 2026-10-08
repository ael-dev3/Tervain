"""Capture the original 17..20 byte pool used by the Arena class-name CString."""
import argparse
import hashlib
import json
import re
import struct
from pathlib import Path
import read_dialogue_native_evidence as native
import prepare_npc_heap_source as helpers

ASM = {
    'heap20Statistics': (0x10005551, [(0x1003fe30, 0x1003fe7e)]),
    'heap20PoolDispatch': (0x10002aa9, [(0x10047fb0, 0x10047fd9), (0x10047fe0, 0x1004802f)]),
    'heap20Free': (0x100023ce, [(0x100441a0, 0x100441e4)]),
    'heap20Realloc': (0x1000248c, [(0x10044200, 0x1004420f), (0x10044210, 0x10044250)]),
    'heap20PoolShutdown': (0x10005939, [(0x1003fd20, 0x1003fd59), (0x1003fd60, 0x1003fdbc),
        (0x1003fdc0, 0x1003fddf), (0x1003fde0, 0x1003fdf3)]),
}

def capture(study, output):
    helpers.OUT = output
    native.EXPECTED_INPUTS['SharedBase.dll'] = helpers.SHARED
    image = (study / '00_Original_Runtime/SharedBase.dll').read_bytes()
    assert helpers.sha(image) == helpers.SHARED
    assert helpers.sha((study / '00_Original_Runtime/Engine.dll').read_bytes()) == helpers.ENGINE
    pe = native.PE(image)
    audit = native.audit_module(study, 'SharedBase_dll', 'SharedBase.dll', {
        0x10008427: 'heap20BitmapAlloc', 0x10003396: 'heap20BlockInitialize'})
    assembly = (study / '01_Decompiled_Code/SharedBase_dll/full_disassembly.asm').read_bytes()
    parsed = []
    for line, text in enumerate(assembly.decode().splitlines(), 1):
        match = re.fullmatch(r'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', text)
        if match: parsed.append((int(match[1], 16), match[2], match[3], line))
    methods = audit['methods']
    for label, (entry, ranges) in ASM.items():
        alias = pe.bytes(entry, 5)
        assert alias[0] == 0xe9 and entry + 5 + struct.unpack('<i', alias[1:])[0] == ranges[0][0]
        rows = []
        for start, end in ranges:
            cursor = start
            for address, raw, instruction, line in parsed:
                if start <= address <= end:
                    data = bytes.fromhex(raw)
                    assert address == cursor and pe.bytes(address, len(data)) == data, label
                    rows.append(dict(va=f'{address:08x}', bytes=raw, instruction=instruction, assemblyLine=line))
                    cursor += len(data)
            assert cursor == end + 1, (label, hex(cursor), hex(end))
        methods.append(dict(label=label, entryVA=f'0x{entry:08x}', bodyVA=f'0x{ranges[0][0]:08x}',
            entryChain=[dict(va=f'{entry:08x}', bytes=alias.hex(), targetVA=f'{ranges[0][0]:08x}')],
            bodyRanges=';'.join(f'{a:08x}-{b:08x}' for a, b in ranges), instructions=rows, sourceCGap=True))
    rules = {}
    for method in methods:
        data = b''.join(bytes.fromhex(row['bytes']) for row in method['instructions'])
        rules[method['label']] = dict(entry=method['entryVA'][2:], body=method['bodyVA'][2:],
            bodyRanges=method['bodyRanges'], bodyInstructionBytesSha256=helpers.sha(data),
            instructionCount=len(method['instructions']), bodyBytes=len(data), sourceRefs=helpers.emit_refs(study, method))
    values = dict(stride=20, minimumRequest=17, maximumRequest=20, regionBytes=0x142000,
        capacity=0xffff, bitmapOffset=0x13fffc, bitmapBytes=0x2000, lastBitmapMask=0x7fffffff,
        payloadBytes=0x13ffec, globals=dict(count='102ffd64', list='102ffd68', peak='102ffd6c', descriptor='102ffef4'),
        callbacks=['100023ce', '1000248c', '10005939', '10005551'])
    table = pe.bytes(0x102fb050, 4097 * 4)
    assert all(struct.unpack_from('<I', table, request * 4)[0] == 0x10002aa9 for request in range(17,21))
    assert struct.unpack_from('<I', table, 16 * 4)[0] != 0x10002aa9
    assert struct.unpack_from('<I', table, 21 * 4)[0] != 0x10002aa9
    core = [row for method in methods if method['label'] in ['heap20PoolDispatch', 'heap20BlockInitialize', 'heap20BitmapAlloc'] for row in method['instructions']]
    proofs = {}
    for field in ['regionBytes', 'bitmapOffset', 'bitmapBytes', 'lastBitmapMask', 'payloadBytes']:
        operand = struct.pack('<I', values[field]).hex()
        proofs[field] = [row for row in core if operand in row['bytes']]
        assert proofs[field], field
    constants = {}
    for name, address, expected in [('heap20Stride', 0x100e7ab0, 20), ('heap20Capacity', 0x100e7ab4, 0xffff)]:
        raw = pe.bytes(address, 4)
        assert struct.unpack('<I', raw)[0] == expected
        constants[name] = dict(address=f'{address:08x}', raw=raw.hex(), value=expected, sha256=helpers.sha(raw))
    code = b''.join(bytes.fromhex(row['bytes']) for row in core)
    assert all(struct.pack('<I', int(callback, 16)) in code for callback in values['callbacks'])
    cold = {name: helpers.cold(pe, address, size, 'SharedBase') for name, address, size in
        [('heap20PoolGlobals', 0x102ffd64, 12), ('heap20DescriptorSlot', 0x102ffef4, 4)]}
    bucket = dict(values, operandProofs=proofs, sourceRefs=rules, strideReceipt='heap20Stride', capacityReceipt='heap20Capacity')
    result = dict(schema='gothic3-arena-heap-rules-v1', inputs=dict(SharedBase=helpers.SHARED, Engine=helpers.ENGINE),
        baseRulesSha256=helpers.BASE_RULES, methods=rules, buckets={'20': bucket}, coldGlobals=cold, constWords=constants,
        dispatchTableSha256=helpers.sha(table), assemblySha256=hashlib.sha256(assembly).hexdigest(),
        sourceOnly=True, nativeCodeExecuted=False)
    output.mkdir(parents=True, exist_ok=True)
    (output / 'runtime-rules.json').write_bytes(helpers.encode(result))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    capture(args.study, args.output)
