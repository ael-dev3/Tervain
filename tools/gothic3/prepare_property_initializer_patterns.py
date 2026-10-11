"""Capture byte-verified Engine property initializer patterns, without executing them."""
import argparse
import hashlib
import json
import struct
from pathlib import Path

from read_dialogue_native_evidence import PE


ENGINE_SHA256 = 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'
TEMPLATE_SHA256 = '722e393d116aac38dedaafeed7557c04db5aa1f6679ed246365e355187c0ab9d'


def capture(study, research):
    data = (study / '00_Original_Runtime/Engine.dll').read_bytes()
    if hashlib.sha256(data).hexdigest() != ENGINE_SHA256:
        raise ValueError('Pinned original Engine.dll required')
    pe = PE(data)
    table = next(t for t in research['initializerTables'] if t['label'] == 'cppInitializers')
    begin, end = int(table['begin'], 16), int(table['end'], 16)
    raw_table = pe.bytes(begin, end - begin)
    if hashlib.sha256(raw_table).hexdigest() != table['sha256']:
        raise ValueError('Original C++ initializer table required')
    golden = pe.bytes(0x300767b0, 87)
    if hashlib.sha256(golden).hexdigest() != TEMPLATE_SHA256:
        raise ValueError('Original obsolete-class property body required')
    variable = set()
    for start in [1, 11, 19, 25, 37, 42, 47, 52, 58, 64, 69, 74, 82]:
        variable.update(range(start, start + 4))
    rows = []
    for offset in range(0, len(raw_table), 4):
        target = struct.unpack_from('<I', raw_table, offset)[0]
        if not target:
            continue
        try:
            callback = pe.bytes(target, 11)
            if callback[0] != 0xe8 or callback[5] != 0xa3 or callback[10] != 0xc3:
                continue
            thunk = (target + 5 + struct.unpack_from('<i', callback, 1)[0]) & 0xffffffff
            raw_thunk = pe.bytes(thunk, 5)
            if raw_thunk[0] != 0xe9:
                continue
            body = (thunk + 5 + struct.unpack_from('<i', raw_thunk, 1)[0]) & 0xffffffff
            code = pe.bytes(body, 87)
        except (ValueError, IndexError, struct.error):
            continue
        if any(code[i] != golden[i] for i in range(87) if i not in variable):
            continue
        word = lambda i: struct.unpack_from('<I', code, i)[0]
        call = lambda i: (body + i + 4 + struct.unpack_from('<i', code, i)[0]) & 0xffffffff
        flags, root, storage, type_info = word(1), word(11), word(58), word(42)
        if word(19) != flags or word(47) != flags or word(25) != storage + 4 or word(82) != storage:
            continue
        if call(52) != 0x306713ae or call(74) != 0x30671596 or word(64) != 0x30afdab0:
            continue
        if word(37) != 0x30af70ac or struct.unpack_from('<I', callback, 6)[0] != root:
            continue
        name = bytearray()
        for i in range(4096):
            ch = pe.bytes(type_info + 8 + i, 1)
            if ch == b'\0':
                break
            name.extend(ch)
        else:
            raise ValueError('Unterminated original property RTTI')
        rows.append(dict(slot=f'{begin+offset:08x}', callback=f'{target:08x}',
            thunk=f'{thunk:08x}', body=f'{body:08x}', flags=f'{flags:08x}',
            root=f'{root:08x}', storage=f'{storage:08x}', typeInfo=f'{type_info:08x}',
            decoratedName=name.decode('ascii'), shutdown=f'{word(69):08x}',
            callbackBytes=callback.hex(), thunkBytes=raw_thunk.hex(), bodyBytes=code.hex(),
            typeInfoRaw=pe.bytes(type_info, 8+len(name)+1).hex(),
            bodySha256=hashlib.sha256(code).hexdigest()))
    return dict(schema=1, engineSha256=ENGINE_SHA256, templateBody='300767b0',
        templateSha256=TEMPLATE_SHA256, runtimeConnected=False,
        notes=['Entries prove the recorded byte pattern and field relationships only.',
               'Unmatched callbacks remain outside this capture.',
               'Parser behavior, allocation lifetimes and campaign execution require runtime evidence.'],
        entries=rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--research', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    result = capture(args.study, json.loads(args.research.read_text(encoding='utf-8')))
    args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f"Captured {len(result['entries'])} original property initializer patterns")


if __name__ == '__main__':
    main()
