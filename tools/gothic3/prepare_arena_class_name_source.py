"""Capture original Game Arena class-name dependencies; executes no native code."""
import argparse
import hashlib
import json
import re
import struct
from pathlib import Path
import read_dialogue_native_evidence as native
from prepare_runtime_admin_source import image_bytes, source_excerpt

GAME_SHA = 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'
def sha(raw): return hashlib.sha256(raw).hexdigest()
def capture(study, output):
    original = (study / '00_Original_Runtime/Game.dll').read_bytes()
    assert sha(original) == GAME_SHA
    pe = native.PE(original)
    audit = native.audit_module(study, 'Game_dll', 'Game.dll', {
        0x20031fca: 'arenaClassName', 0x2001d278: 'arenaClassNameVirtualEntry'})
    methods = audit['methods']
    selected = [
        ('arenaClassNameInitializer', 0x204b2110, 0x204b2110, 0x204b211a),
        ('arenaClassNameDestructor', 0x2000951b, 0x20549960, 0x2054996a)]
    manual = []
    for label, entry, body, end in selected:
        chain = []
        if entry != body:
            raw = pe.bytes(entry, 5)
            assert raw[0] == 0xe9 and entry + 5 + struct.unpack('<i', raw[1:])[0] == body
            chain = [dict(va=f'{entry:08x}', bytes=raw.hex(), targetVA=f'{body:08x}')]
        manual.append(dict(label=label, entryVA=f'0x{entry:08x}', bodyVA=f'0x{body:08x}',
            bodyRanges=f'{body:08x}-{end:08x}', entryChain=chain, instructions=[], sourceCGap=True))
    pattern = re.compile(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)')
    with (study / '01_Decompiled_Code/Game_dll/full_disassembly.asm').open('rb') as stream:
        for line in stream:
            match = pattern.fullmatch(line.rstrip(b'\r\n'))
            if not match: continue
            va = int(match[1], 16)
            for method, (_, _, begin, end) in zip(manual, selected):
                if begin <= va <= end:
                    raw = bytes.fromhex(match[2].decode())
                    assert pe.bytes(va, len(raw)) == raw
                    method['instructions'].append(dict(va=f'{va:08x}', bytes=raw.hex(), instruction=match[3].decode('utf-8')))
    initializer = manual[0]
    assert not initializer['instructions'], 'Initializer now has analyzed ASM; review provenance'
    for va, raw, text in [(0x204b2110, 'e8b5feb7ff', 'CALL 0x20031fca'),
                          (0x204b2115, 'a324507b20', 'MOV [0x207b5024],EAX'),
                          (0x204b211a, 'c3', 'RET')]:
        assert pe.bytes(va, len(bytes.fromhex(raw))) == bytes.fromhex(raw)
        initializer['instructions'].append(dict(va=f'{va:08x}', bytes=raw, instruction=text))
    initializer['sourceASMGap'] = True
    initializer['recovery'] = 'Original PE initializer bytes; absent from analyzed assembly'
    for method, (_, _, begin, end) in zip(manual, selected):
        cursor = begin
        for row in method['instructions']:
            assert int(row['va'], 16) == cursor
            cursor += len(bytes.fromhex(row['bytes']))
        assert cursor == end + 1
        raw = b''.join(bytes.fromhex(row['bytes']) for row in method['instructions'])
        method.update(instructionCount=len(method['instructions']), bodyByteCount=len(raw), bodyInstructionBytesSha256=sha(raw))
    methods += manual
    output.mkdir(parents=True, exist_ok=True)
    receipts = {}
    for method in methods:
        address = method['bodyVA'][2:]
        asm = ('\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction'] for row in method['instructions']) + '\n').encode('utf-8')
        (output / (address + '.asm.txt')).write_bytes(asm)
        refs = dict(assembly=address + '.asm.txt', assemblySha256=sha(asm))
        if not method.get('sourceCGap'):
            c = source_excerpt(study, method).encode('utf-8')
            (output / (address + '.c.txt')).write_bytes(c)
            refs.update(c=address + '.c.txt', cSha256=sha(c))
        receipts[method['label']] = dict(module='Game', entry=method['entryVA'][2:], body=address,
            bodyRanges=method['bodyRanges'], instructionCount=method['instructionCount'],
            bodyByteCount=method['bodyByteCount'], bodyInstructionBytesSha256=method['bodyInstructionBytesSha256'],
            entryChain=method['entryChain'], sourceRefs=refs, sourceCGap=method.get('sourceCGap', False),
            sourceASMGap=method.get('sourceASMGap', False), recovery=method.get('recovery'))
    cold, constants = {}, {}
    for label, address, size, constant in [
        ('arenaClassName', 0x207b4f4c, 12, False),
        ('arenaInitializerResult', 0x207b5024, 4, False),
        ('arenaTypeInfoDescriptor', 0x20798010, 25, False),
        ('arenaInitializerSlot', 0x2056c628, 4, True),
        ('arenaTypeClassNameSlot', 0x2065915c, 4, True)]:
        raw, section = image_bytes(pe, address, size)
        (constants if constant else cold)[label] = dict(module='Game', address=f'{address:08x}',
            bytes=size, raw=raw.hex(), knownMask='ff'*size, sha256=sha(raw), section=section,
            scope='original-file-backed-constant' if constant else 'cold-original-image', liveValueCaptured=False)
    assert cold['arenaClassName']['raw'] == '00'*12
    assert cold['arenaInitializerResult']['raw'] == '00'*4
    assert bytes.fromhex(cold['arenaTypeInfoDescriptor']['raw'])[8:] == b'.?AVgCArena_PS@@\0'
    assert constants['arenaInitializerSlot']['raw'] == '10214b20'
    assert constants['arenaTypeClassNameSlot']['raw'] == '78d20120'
    catalog = study / '01_Decompiled_Code/Game_dll/functions.csv'
    result = dict(schema='gothic3-arena-class-name-source-v1', inputs=dict(Game=GAME_SHA),
        methods=receipts, coldGlobals=cold, constBytes=constants, sourceOnly=True,
        wholeCrtTraversalCompleted=False, runtimeRegistrationCompleted=False,
        producerSha256=sha(Path(__file__).read_bytes()), catalogSha256=sha(catalog.read_bytes()))
    (output / 'source.json').write_bytes((json.dumps(result, indent=2)+'\n').encode('utf-8'))
    return result
if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    capture(args.study,args.output)
