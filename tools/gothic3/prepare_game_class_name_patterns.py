"""Recover complete Game class-name initializer patterns; grant no execution."""
import argparse
from bisect import bisect_right
import csv
import hashlib
import json
import re
import struct
from pathlib import Path

from read_dialogue_native_evidence import PE, audit_module, EXPECTED_INPUTS
from prepare_runtime_admin_source import image_bytes

INDEX_SHA = 'cf382081b53c8a8981e5240c738c968e2e993111eb2fa9588b443d12aaad541c'
CATALOG_SHA = '7683e99c3c22688b26c77eafc830f43abab471b9e9d3ca241e3157007c714018'
ASM_SHA = 'fd23430904ab84b03e395bc4a705f5a475cc5816094603350a68e1bc2798f4dc'
SHA = lambda data: hashlib.sha256(data).hexdigest()
ROW = re.compile(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)')


def forwarding(pe, entry):
    body, chain = entry, []
    for _ in range(12):
        raw = pe.bytes(body, 5)
        if raw[0] != 0xe9:
            return body, chain
        target = body + 5 + struct.unpack('<i', raw[1:])[0]
        chain.append(dict(va=f'{body:08x}', bytes=raw.hex(), targetVA=f'{target:08x}'))
        body = target
    raise ValueError('Unbounded original getter forwarding chain')


def recover_extents(study, pe, extents, allow_absent=False):
    """Recover explicit complete ASM extents absent from the function catalog."""
    starts = sorted(extents)
    rows = {start: [] for start in starts}
    digest = hashlib.sha256()
    with (study / '01_Decompiled_Code/Game_dll/full_disassembly.asm').open('rb') as stream:
        for line_number, line in enumerate(stream, 1):
            digest.update(line)
            match = ROW.fullmatch(line.rstrip(b'\r\n'))
            if not match:
                continue
            address = int(match[1], 16)
            index = bisect_right(starts, address) - 1
            if index < 0 or address >= starts[index] + extents[starts[index]]:
                continue
            raw = bytes.fromhex(match[2].decode())
            if pe.bytes(address, len(raw)) != raw:
                raise ValueError('Explicit recovery disagrees with original PE')
            rows[starts[index]].append(dict(va=f'{address:08x}', rva=f'{address-pe.base:x}',
                bytes=raw.hex(), instruction=match[3].decode(), assemblyLine=line_number,
                fileOffset=pe.offset(address, len(raw))))
    if digest.hexdigest() != ASM_SHA:
        raise ValueError('Original full disassembly differs')
    for start, instructions in rows.items():
        if not instructions and allow_absent:
            continue
        cursor = start
        for row in instructions:
            if int(row['va'], 16) != cursor:
                raise ValueError('Recovered extent contains an instruction gap')
            cursor += len(row['bytes']) // 2
        if cursor != start + extents[start]:
            raise ValueError(f'Recovered extent is incomplete at {start:08x}: {len(instructions)} rows, end {cursor:08x}')
    return rows


def decode_getter_pattern(pe, body):
    """Decode only the exact x86 opcode forms independently checked on 304 getters.

    No function-catalog or ASM entry is invented for a PE-only recovery.
    Each variable operand comes from its original instruction bytes.
    """
    forms = [
        ('a1', 'u32', 'MOV EAX,[0x{value:08x}]'), ('a801', None, 'TEST AL,0x1'),
        ('75', 'rel8', 'JNZ 0x{value:08x}'), ('8b0d', 'u32', 'MOV ECX,dword ptr [0x{value:08x}]'),
        ('83c801', None, 'OR EAX,0x1'), ('a3', 'u32', 'MOV [0x{value:08x}],EAX'),
        ('890d', 'u32', 'MOV dword ptr [0x{value:08x}],ECX'), ('a802', None, 'TEST AL,0x2'),
        ('75', 'rel8', 'JNZ 0x{value:08x}'), ('83c802', None, 'OR EAX,0x2'),
        ('68', 'u32', 'PUSH 0x{value:08x}'), ('b9', 'u32', 'MOV ECX,0x{value:08x}'),
        ('a3', 'u32', 'MOV [0x{value:08x}],EAX'), ('e8', 'rel32', 'CALL 0x{value:08x}'),
        ('50', None, 'PUSH EAX'), ('68', 'u32', 'PUSH 0x{value:08x}'),
        ('ff15', 'u32', 'CALL dword ptr [0x{value:08x}]'), ('68', 'u32', 'PUSH 0x{value:08x}'),
        ('e8', 'rel32', 'CALL 0x{value:08x}'), ('83c404', None, 'ADD ESP,0x4'),
        ('b8', 'u32', 'MOV EAX,0x{value:08x}'), ('c3', None, 'RET'),
    ]
    cursor, rows = body, []
    for prefix, kind, text in forms:
        opcode = bytes.fromhex(prefix)
        size = len(opcode) + (1 if kind == 'rel8' else 4 if kind else 0)
        raw = pe.bytes(cursor, size)
        if raw[:len(opcode)] != opcode:
            raise ValueError(f'Original PE does not match getter opcode form at {cursor:08x}')
        value = 0
        if kind == 'u32':
            value = struct.unpack('<I', raw[len(opcode):])[0]
        elif kind:
            value = cursor + size + struct.unpack('<b' if kind == 'rel8' else '<i', raw[len(opcode):])[0]
        rows.append(dict(va=f'{cursor:08x}', rva=f'{cursor-pe.base:x}', bytes=raw.hex(),
            instruction=text.format(value=value), fileOffset=pe.offset(cursor, size), assemblyLine=None,
            recoveryOrigin='original-PE-opcode-pattern-decoder'))
        cursor += size
    if cursor != body + 87:
        raise ValueError('Original getter decoder extent differs')
    return rows


def decode_cleanup_pattern(pe, body):
    raw = pe.bytes(body, 11)
    if raw[0] != 0xb9 or raw[5:7] != b'\xff\x25':
        raise ValueError('Original PE cleanup opcode forms differ')
    cache, iat = struct.unpack('<I', raw[1:5])[0], struct.unpack('<I', raw[7:11])[0]
    return [dict(va=f'{body:08x}', rva=f'{body-pe.base:x}', bytes=raw[:5].hex(),
                 instruction=f'MOV ECX,0x{cache:08x}', fileOffset=pe.offset(body, 5), assemblyLine=None,
                 recoveryOrigin='original-PE-opcode-pattern-decoder'),
            dict(va=f'{body+5:08x}', rva=f'{body+5-pe.base:x}', bytes=raw[5:].hex(),
                 instruction=f'JMP dword ptr [0x{iat:08x}]', fileOffset=pe.offset(body+5, 6), assemblyLine=None,
                 recoveryOrigin='original-PE-opcode-pattern-decoder')]


def capture(study, callbacks):
    original = (study / '00_Original_Runtime/Game.dll').read_bytes()
    if SHA(original) != EXPECTED_INPUTS['Game.dll']:
        raise ValueError('Original Game module differs')
    pe = PE(original)
    catalog_bytes = (study / '01_Decompiled_Code/Game_dll/functions.csv').read_bytes()
    if SHA(catalog_bytes) != CATALOG_SHA:
        raise ValueError('Original Game function catalog differs')
    catalog = {row['address']: row for row in csv.DictReader(catalog_bytes.decode().splitlines())}
    index_bytes = (callbacks / 'callback-index.json').read_bytes()
    if SHA(index_bytes) != INDEX_SHA:
        raise ValueError('Frozen callback package index differs')
    index = json.loads(index_bytes)
    table = index['tables']['cpp']
    table_bytes, _ = image_bytes(pe, int(table['begin'], 16), table['bytes'])
    if SHA(table_bytes) != table['sha256']:
        raise ValueError('Original C++ table differs from callback package')
    slots = {}
    for row in table['nonzeroEntries']:
        slot, target = int(row['slot'], 16), int(row['target'], 16)
        if struct.unpack('<I', pe.bytes(slot, 4))[0] != target:
            raise ValueError('Original C++ callback slot differs')
        slots.setdefault(row['target'], []).append(row['slot'])
    initializers, targets, missing = {}, {}, {}
    for callback in slots:
        receipt = index['callbacks'][callback]
        if receipt['instructionCount'] != 3:
            continue
        assembly = (callbacks / receipt['assembly']).read_bytes()
        reconstructed = (callbacks / receipt['c']).read_bytes()
        if SHA(assembly) != receipt['assemblySha256'] or SHA(reconstructed) != receipt['cSha256']:
            raise ValueError('Callback listing differs from frozen index')
        instructions = []
        for number, line in enumerate(assembly.splitlines(), 1):
            match = ROW.fullmatch(line)
            if not match:
                raise ValueError('Malformed callback assembly')
            address, raw = int(match[1], 16), bytes.fromhex(match[2].decode())
            if pe.bytes(address, len(raw)) != raw:
                raise ValueError('Callback instruction differs from original PE')
            instructions.append(dict(va=f'{address:08x}', bytes=raw.hex(), instruction=match[3].decode(),
                rva=f'{address-pe.base:x}', fileOffset=pe.offset(address, len(raw)), assemblyLine=number))
        call = re.fullmatch(r'CALL 0x([0-9a-f]{8})', instructions[0]['instruction'])
        store = re.fullmatch(r'MOV \[0x([0-9a-f]{8})\],EAX', instructions[1]['instruction'])
        if not call or not store or instructions[2]['instruction'] != 'RET':
            continue
        entry = int(call[1], 16)
        body, chain = forwarding(pe, entry)
        initializers[callback] = dict(receipt=receipt, instructions=instructions, getter=f'{entry:08x}',
                                     result=store[1], slots=slots[callback])
        if f'{body:08x}' in catalog:
            targets[entry] = 'classNameGetter' + f'{entry:08x}'
        else:
            missing[entry] = dict(body=body, chain=chain)
    if len(initializers) != 363 or len(targets) != 304 or len(missing) != 59:
        raise ValueError('Original class-name pattern coverage differs')
    module = audit_module(study, 'Game_dll', 'Game.dll', targets)
    if module['assemblySha256'] != ASM_SHA:
        raise ValueError('Original full disassembly differs')
    # Cross-check the restricted decoder against every catalog/ASM getter,
    # including all operands, relative branches and original instruction bytes.
    for method in module['methods']:
        decoded = decode_getter_pattern(pe, int(method['bodyVA'], 16))
        keys = ('va', 'bytes', 'instruction', 'fileOffset', 'rva')
        if [{key: row[key] for key in keys} for row in decoded] != [
                {key: row[key] for key in keys} for row in method['instructions']]:
            raise ValueError('Getter decoder disagrees with original full disassembly')
    recovered = recover_extents(study, pe, {row['body']: 87 for row in missing.values()}, allow_absent=True)
    for entry, info in missing.items():
        rows = recovered[info['body']]
        assembly_available = bool(rows)
        if not rows:
            rows = decode_getter_pattern(pe, info['body'])
        module['methods'].append(dict(label='classNameGetter' + f'{entry:08x}', entryVA=f'0x{entry:08x}',
            bodyVA=f"0x{info['body']:08x}", entryChain=info['chain'], instructions=rows,
            bodyInstructionBytesSha256=SHA(b''.join(bytes.fromhex(row['bytes']) for row in rows)),
            recoveryOrigin='explicit-contiguous-original-ASM-PE-extent' if assembly_available else 'original-PE-opcode-pattern-decoder',
            sourceASMAvailable=assembly_available, functionCatalogEntryPresent=False,
            reconstructedC=None, verifiedAgainstOriginalPE=True))
    getters = {method['entryVA'][2:]: method for method in module['methods']}
    images, classes, destructor_extents = {}, [], {}
    def image(address, size):
        key = f'{address:08x}:{size}'
        if key not in images:
            raw, section = image_bytes(pe, address, size)
            images[key] = dict(address=f'{address:08x}', bytes=size, raw=raw.hex(), sha256=SHA(raw),
                               knownMask='ff' * size, originalPESection=section, liveValueCaptured=False)
        return key
    for callback, initializer in initializers.items():
        getter = getters[initializer['getter']]
        rows = getter['instructions']
        if len(rows) != 22 or sum(len(row['bytes']) // 2 for row in rows) != 87:
            raise ValueError('Complete class-name getter extent differs')
        literal = lambda i: int(re.search(r'0x([0-9a-f]{8})', rows[i]['instruction'])[1], 16)
        guard, prior, descriptor, cache, cleanup = [literal(i) for i in (0, 3, 11, 15, 17)]
        expected = [f'MOV EAX,[0x{guard:08x}]', 'TEST AL,0x1', f"JNZ 0x{rows[7]['va']}",
            f'MOV ECX,dword ptr [0x{prior:08x}]', 'OR EAX,0x1', f'MOV [0x{guard:08x}],EAX',
            f'MOV dword ptr [0x{cache+4:08x}],ECX', 'TEST AL,0x2', f"JNZ 0x{rows[20]['va']}",
            'OR EAX,0x2', 'PUSH 0x207d0a18', f'MOV ECX,0x{descriptor:08x}',
            f'MOV [0x{guard:08x}],EAX', 'CALL 0x204637e0', 'PUSH EAX', f'PUSH 0x{cache:08x}',
            'CALL dword ptr [0x207d8830]', f'PUSH 0x{cleanup:08x}', 'CALL 0x204637ce',
            'ADD ESP,0x4', f'MOV EAX,0x{cache:08x}', 'RET']
        if guard != cache + 8 or prior != int(initializer['result'], 16) or [r['instruction'] for r in rows] != expected:
            raise ValueError('Original class-name getter pattern differs')
        descriptor_raw, _ = image_bytes(pe, descriptor, 512)
        if struct.unpack_from('<I', descriptor_raw)[0] != 0x206b6374:
            raise ValueError('Original Game type_info descriptor differs')
        terminator = descriptor_raw.index(0, 8)
        decorated = descriptor_raw[8:terminator].decode('ascii')
        cleanup_body, cleanup_chain = forwarding(pe, cleanup)
        cleanup_bytes = b'\xb9' + struct.pack('<I', cache) + b'\xff\x25\x34\x88\x7d\x20'
        if pe.bytes(cleanup_body, 11) != cleanup_bytes:
            raise ValueError('Original class-name cleanup differs')
        destructor_extents[cleanup_body] = 11
        classes.append(dict(initializer=callback, initializerInstructions=initializer['instructions'],
            initializerSource=initializer['receipt'], slots=initializer['slots'], getter=initializer['getter'],
            getterSource=getter, images=dict(fields=image(cache, 12), result=image(prior, 4),
                descriptor=image(descriptor, (terminator + 4) // 4 * 4)), decoratedName=decorated,
            destructor=dict(entry=f'{cleanup:08x}', body=f'{cleanup_body:08x}', entryChain=cleanup_chain,
                bodyInstructionBytesSha256=SHA(cleanup_bytes), functionCatalogEntryPresent=f'{cleanup_body:08x}' in catalog)))
    cleanup_rows = recover_extents(study, pe, destructor_extents, allow_absent=True)
    for entry in classes:
        cleanup = entry['destructor']
        rows = cleanup_rows[int(cleanup['body'], 16)]
        assembly_available = bool(rows)
        decoded = decode_cleanup_pattern(pe, int(cleanup['body'], 16))
        if rows:
            keys = ('va', 'bytes', 'instruction', 'fileOffset', 'rva')
            if [{key: row[key] for key in keys} for row in decoded] != [
                    {key: row[key] for key in keys} for row in rows]:
                raise ValueError('Cleanup decoder disagrees with original full disassembly')
        else:
            rows = decoded
        cache = images[entry['images']['fields']]['address']
        if [row['instruction'] for row in rows] != [f'MOV ECX,0x{cache}', 'JMP dword ptr [0x207d8834]']:
            raise ValueError('Complete original cleanup assembly differs')
        cleanup['instructions'] = rows
        cleanup['sourceASMAvailable'] = assembly_available
        cleanup['recoveryOrigin'] = 'explicit-contiguous-original-ASM-PE-extent' if assembly_available else 'original-PE-opcode-pattern-decoder'
    imports = [row for row in pe.imports() if row['iatVA'] in {'0x207d8830', '0x207d8834'}]
    if len(imports) != 2 or any(row['module'] != 'SharedBase.dll' for row in imports):
        raise ValueError('Original class-name imports differ')
    return dict(schema='gothic3-game-class-name-patterns-source-v1',
        inputs=dict(Game=SHA(original), functionsCsv=CATALOG_SHA, fullAssembly=ASM_SHA, callbacksIndex=INDEX_SHA),
        classes=classes, images=images, imports=imports,
        coverage=dict(initializers=363, catalogGetters=304, explicitlyRecoveredGetters=59,
                      getterInstructions=363 * 22, initializerInstructions=363 * 3, destructorInstructions=363 * 2,
                      getterDecoderASMComparisons=304,
                      peOnlyGetters=sum(not row['getterSource'].get('sourceASMAvailable', True) for row in classes),
                      peOnlyDestructors=sum(not row['destructor']['sourceASMAvailable'] for row in classes)),
        producerSha256=SHA(Path(__file__).read_bytes()), sourceOnly=True, executionAdmitted=False,
        wholeCrtTraversalCompleted=False, fullCampaignCompleted=False)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--callbacks', type=Path,
                        default=Path(__file__).resolve().parents[2] / 'assets/gothic3/game-cinit-callbacks')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = capture(args.study, args.callbacks)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(result['coverage']))
