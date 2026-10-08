"""Capture the original 0..4 byte pool used by property registration wrappers."""
import argparse
import hashlib
import json
import re
import struct
from pathlib import Path
import read_dialogue_native_evidence as native
import prepare_npc_heap_source as helpers

ASM = {
    'heap4PoolDispatch': (0x10008698, [(0x10047d30, 0x10047d59), (0x10047d60, 0x10047daf)]),
    'heap4Free': (0x100021da, [(0x10043e40, 0x10043e7d)]),
    'heap4Realloc': (0x1000633e, [(0x10043e90, 0x10043e9f), (0x10043ea0, 0x10043ef5)]),
    'heap4PoolShutdown': (0x10003dcd, [(0x1003f740, 0x1003f779), (0x1003f780, 0x1003f7dc),
        (0x1003f7e0, 0x1003f7ff), (0x1003f800, 0x1003f813)]),
}

def capture(study, output):
    helpers.OUT = output
    native.EXPECTED_INPUTS['SharedBase.dll'] = helpers.SHARED
    image = (study / '00_Original_Runtime/SharedBase.dll').read_bytes()
    assert helpers.sha(image) == helpers.SHARED
    assert helpers.sha((study / '00_Original_Runtime/Engine.dll').read_bytes()) == helpers.ENGINE
    pe = native.PE(image)
    audit = native.audit_module(study, 'SharedBase_dll', 'SharedBase.dll', {
        0x10004a07: 'heap4BitmapAlloc', 0x10002874: 'heap4BlockInitialize', 0x10004bbf: 'heap4Statistics'})
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
    values = dict(stride=4, minimumRequest=0, maximumRequest=4, regionBytes=0x42000,
        capacity=0xfffc, bitmapOffset=0x40000, bitmapBytes=0x2000, lastBitmapMask=0x0fffffff,
        payloadBytes=0x3fff0, globals=dict(count='102ffd34', list='102ffd38', peak='102ffd3c', descriptor='102ffee4'),
        callbacks=['100021da', '1000633e', '10003dcd', '10004bbf'])
    table = pe.bytes(0x102fb050, 4097 * 4)
    assert all(struct.unpack_from('<I', table, request * 4)[0] == 0x10008698 for request in range(5))
    assert struct.unpack_from('<I', table, 20)[0] != 0x10008698
    core = [row for method in methods if method['label'] in ['heap4PoolDispatch', 'heap4BlockInitialize', 'heap4BitmapAlloc'] for row in method['instructions']]
    proofs = {}
    for field in ['regionBytes', 'bitmapOffset', 'bitmapBytes', 'lastBitmapMask', 'payloadBytes']:
        operand = struct.pack('<I', values[field]).hex()
        proofs[field] = [row for row in core if operand in row['bytes']]
        assert proofs[field], field
    constants = {}
    for name, address, expected in [('heap4Stride', 0x100e7a90, 4), ('heap4Capacity', 0x100e7a94, 0xfffc)]:
        raw = pe.bytes(address, 4)
        assert struct.unpack('<I', raw)[0] == expected
        constants[name] = dict(address=f'{address:08x}', raw=raw.hex(), value=expected, sha256=helpers.sha(raw))
    code = b''.join(bytes.fromhex(row['bytes']) for row in core)
    assert all(struct.pack('<I', int(callback, 16)) in code for callback in values['callbacks'])
    cold = {name: helpers.cold(pe, address, size, 'SharedBase') for name, address, size in
        [('heap4PoolGlobals', 0x102ffd34, 12), ('heap4DescriptorSlot', 0x102ffee4, 4)]}
    bucket = dict(values, operandProofs=proofs, sourceRefs=rules, strideReceipt='heap4Stride', capacityReceipt='heap4Capacity')
    result = dict(schema='gothic3-property-heap-rules-v1', inputs=dict(SharedBase=helpers.SHARED, Engine=helpers.ENGINE),
        baseRulesSha256=helpers.BASE_RULES, methods=rules, buckets={'4': bucket}, coldGlobals=cold, constWords=constants,
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
