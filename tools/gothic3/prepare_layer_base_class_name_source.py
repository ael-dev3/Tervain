"""Recover Game's first C++ class-name initializer without executing it."""
import argparse
import hashlib
import json
import re
import struct
from pathlib import Path

from read_dialogue_native_evidence import PE, audit_module, EXPECTED_INPUTS
from prepare_runtime_admin_source import image_bytes


def capture(study):
    original = (study / '00_Original_Runtime/Game.dll').read_bytes()
    if hashlib.sha256(original).hexdigest() != EXPECTED_INPUTS['Game.dll']:
        raise ValueError('Original Game module differs')
    pe = PE(original)
    module = audit_module(study, 'Game_dll', 'Game.dll', {0x2000e8d6: 'layerBaseClassName'})
    # The destructor body is absent from the function catalog. Preserve an
    # explicit ASM/PE recovery, including its real forwarding entry.
    entry, body, end = 0x20034649, 0x20549180, 0x2054918a
    forwarding = pe.bytes(entry, 5)
    if forwarding[0] != 0xe9 or entry + 5 + struct.unpack('<i', forwarding[1:])[0] != body:
        raise ValueError('Original LayerBase destructor forwarding entry differs')
    rows = []
    assembly = study / '01_Decompiled_Code/Game_dll/full_disassembly.asm'
    with assembly.open('rb') as stream:
        for number, line in enumerate(stream, 1):
            match = re.fullmatch(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', line.rstrip(b'\r\n'))
            if not match or not body <= int(match[1], 16) <= end:
                continue
            address = int(match[1], 16)
            raw = bytes.fromhex(match[2].decode())
            if pe.bytes(address, len(raw)) != raw:
                raise ValueError('Original LayerBase destructor PE bytes differ')
            rows.append(dict(va=f'{address:08x}', bytes=raw.hex(), instruction=match[3].decode(),
                             assemblyLine=number, fileOffset=pe.offset(address, len(raw))))
    if [(row['va'], row['instruction']) for row in rows] != [
        ('20549180', 'MOV ECX,0x207b4580'), ('20549185', 'JMP dword ptr [0x207d8834]')]:
        raise ValueError('Complete LayerBase destructor extent differs')
    module['methods'].append(dict(label='layerBaseClassNameDestructor', entryVA=f'0x{entry:08x}',
        bodyVA=f'0x{body:08x}', bodyRanges=f'{body:08x}-{end:08x}', instructions=rows,
        entryChain=[dict(va=f'{entry:08x}', bytes=forwarding.hex(), targetVA=f'{body:08x}')],
        bodyInstructionBytesSha256=hashlib.sha256(b''.join(bytes.fromhex(row['bytes']) for row in rows)).hexdigest(),
        recoveryOrigin='explicit-original-disassembly-extent', functionCatalogEntryPresent=False,
        verifiedAgainstOriginalPE=True))
    descriptor, _ = image_bytes(pe, 0x20796004, 512)
    terminator = descriptor.index(0, 8)
    descriptor_size = (terminator + 4) // 4 * 4
    if struct.unpack_from('<I', descriptor)[0] != 0x206b6374:
        raise ValueError('Original Game type_info vtable differs')
    images = []
    for label, address, size in [('layerBaseClassName', 0x207b4580, 12),
                                 ('layerBaseInitializerResult', 0x207b4760, 4),
                                 ('layerBaseInitializerSlot', 0x2056c104, 4),
                                 ('layerBaseTypeInfoDescriptor', 0x20796004, descriptor_size)]:
        raw, _ = image_bytes(pe, address, size)
        images.append(dict(label=label, address=f'{address:08x}', bytes=size, raw=raw.hex(),
                           sha256=hashlib.sha256(raw).hexdigest(), liveValueCaptured=False))
    if images[2]['raw'] != 'b0114b20':
        raise ValueError('Original first C++ callback slot differs')
    imports = [row for row in pe.imports() if row['iatVA'] in {'0x207d8830', '0x207d8834'}]
    if len(imports) != 2 or any(row['module'] != 'SharedBase.dll' for row in imports):
        raise ValueError('Original class-name imports differ')
    return dict(schema='gothic3-layer-base-class-name-evidence-v1', module=module, images=images,
                decoratedName=descriptor[8:terminator].decode('ascii'), imports=imports,
                sourceOnly=True, executionAdmitted=False)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8', newline='\n')
    print('Captured original LayerBase getter, destructor and physical images; no execution granted')
