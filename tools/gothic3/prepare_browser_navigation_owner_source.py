"""Audit the original application cache, area registry and Navigation notifications.

Offline receipts only. This never runs native code or treats source geometry as
a constructed resident. Platform module lookup remains an explicit boundary.
"""
# SPDX-License-Identifier: GPL-3.0-only
from __future__ import annotations
import argparse
import hashlib
import json
import struct
import sys
from pathlib import Path

import read_dialogue_native_evidence as native
from prepare_runtime_admin_source import source_excerpt, image_bytes, require
from prepare_crt_undname_source import encode, verify_extents

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/gothic3/browser-navigation-owner'
MODULES = {
    'Game': ('Game_dll', 'Game.dll', 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f', {
        'appGameRunning': 0x20002ecd, 'cachedSession': 0x200207de,
        'sessionGameRunning': 0x20023cef, 'zoneRegister': 0x20024d2f,
        'sessionInvalidate': 0x2002d510,
        'zoneDeregister': 0x200232c2, 'zoneOnAdded': 0x2002c5d9,
        'zoneOnRemoved': 0x20001898, 'zonePropertyType': 0x20008724,
        'navigationNotifyEnter': 0x200328bc, 'navigationNotifyExit': 0x2002bb11,
        'contactEnabled': 0x200218a0,
        'navigationPSOnTouch': 0x200234ed, 'navigationPSOnUntouch': 0x2001cac1,
        'zonePSOnTouch': 0x2002cef3, 'zonePSOnUntouch': 0x20002ac7,
        'pathPSOnTouch': 0x2000707c, 'pathPSOnUntouch': 0x2002d0c9,
        'scriptAdmin': 0x2001afbe,
        'zoneDccDeregister': 0x2000c630, 'zoneDccRegister': 0x20010f19,
        'pathDccDeregister': 0x2001e5fb, 'pathDccRegister': 0x20026bb6,
        'navigationNameDestructorCurrentZoneEntityProxy': 0x2055bd80,
        'navigationNameDestructorRoutine': 0x2055bd90,
        'navigationNameDestructorSleepingPoint': 0x2055bda0,
        'navigationNameDestructorWorkingPoint': 0x2055bdb0,
        'navigationNameDestructorRelaxingPoint': 0x2055bdc0,
    }),
    'Engine': ('Engine_dll', 'Engine.dll', 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3', {
        'engineIsInitialized': 0x30025cd4, 'proxyGetEntity': 0x3001e8da,
        'proxySetEntityPointer': 0x30017e77, 'proxyConstructor': 0x3001d7b9,
        'proxyAssignment': 0x300021c1, 'proxyCopyFrom': 0x30008adf,
        'proxyDestructor': 0x300150a5,
        'notifyEnter': 0x3003b5bb, 'notifyExit': 0x3001a091,
        'inheritedNotifyEnter': 0x3002ad10, 'inheritedNotifyExit': 0x30037ca4,
        'contactIteratorConstructor': 0x3003e3a1, 'contactIteratorReset': 0x3000e7a0,
        'contactIteratorDestructor': 0x30027bc9,
        'dynamicEntityOnTouch': 0x3003af80, 'dynamicEntityOnUntouch': 0x30044850,
    }),
    'SharedBase': ('SharedBase_dll', 'SharedBase.dll', '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214', {
        'stringConstructor': 0x10003ba7, 'stringDestructor': 0x100060c3,
        'stringEqualsString': 0x10002eb9, 'stringEqualsChars': 0x10005ffb,
        'stringCompareChars': 0x10004bfb,
        'contactIteratorVectorConstructor': 0x10002833,
        'contactIteratorVectorClear': 0x10005ae7,
        'contactIteratorVectorDestructor': 0x10005461,
    }),
}
COLD = {
    'Game': {'sessionCache': (0x207b4d58, 8), 'scriptCache': (0x207b6028, 8),
             'contactMask': (0x207b8588, 8)},
    'Engine': {'engineInitialized': (0x30ad989c, 1)},
}
NAVIGATION_NAME_INITIALIZERS = (
    ('CurrentZoneEntityProxy', 100357, 0x2050aa10, 0x207bfaa0, 0x20656168, 0x2055bd80),
    ('Routine',                100358, 0x2050aa40, 0x207bfaa4, 0x20656138, 0x2055bd90),
    ('SleepingPoint',          100359, 0x2050aa70, 0x207bfaa8, 0x20656128, 0x2055bda0),
    ('WorkingPoint',           100360, 0x2050aaa0, 0x207bfaac, 0x20656108, 0x2055bdb0),
    ('RelaxingPoint',          100361, 0x2050aad0, 0x207bfab0, 0x20656118, 0x2055bdc0),
)
PROXY_COPY_VTABLE = {'address': 0x3087bff4, 'copyFromOffset': 0x14, 'copyFrom': 0x30008adf}
ENTITY_CONTACT_VTABLE = {'address': 0x2066813c, 'touchOffset': 0x174, 'untouchOffset': 0x17c}
ENTITY_CONTACT_IMPORTS = {
    'OnTouch': '?OnTouch@eCDynamicEntity@@UAEXPAVeCEntity@@AAVeCContactIterator@@@Z',
    'OnUntouch': '?OnUntouch@eCDynamicEntity@@UAEXPAVeCEntity@@AAVeCContactIterator@@@Z',
}
PROPERTY_CONTACT_VTABLES = (
    ('gCNavigation_PS', 0x2068e8b4, 'navigationPSOnTouch', 'navigationPSOnUntouch', 0x200234ed, 0x2001cac1,
     0x202864c0, 0x202864d0),
    ('gCNavZone_PS', 0x2068fb34, 'zonePSOnTouch', 'zonePSOnUntouch', 0x2002cef3, 0x20002ac7,
     0x2029f300, 0x2029f310),
    ('gCNavPath_PS', 0x2068f414, 'pathPSOnTouch', 'pathPSOnUntouch', 0x2000707c, 0x2002d0c9,
     0x20296ef0, 0x20296f00),
)
CONTACT_ITERATOR_METHODS = {
    'contactIteratorConstructor': ('3003e3a1', '30315c70'),
    'contactIteratorReset': ('3000e7a0', '30315f30'),
    'contactIteratorDestructor': ('30027bc9', '30316670'),
    'contactIteratorVectorConstructor': ('10002833', '10024b70'),
    'contactIteratorVectorClear': ('10005ae7', '10024e00'),
    'contactIteratorVectorDestructor': ('10005461', '10024b80'),
    'dynamicEntityOnTouch': ('3003af80', '304be5c0'),
    'dynamicEntityOnUntouch': ('30044850', '304be760'),
}

def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def selected_initializer(pe: native.PE, study: Path, table: dict, row: tuple) -> tuple[dict, dict]:
    name, index, entry, slot, literal, destructor = row
    table_address, table_bytes = int(table['address'], 16), table['bytes']
    require(table_bytes % 4 == 0 and len(bytes.fromhex(table['raw'])) == table_bytes,
            'C++ initializer table extent differs')
    raw_table = bytes.fromhex(table['raw'])
    require(digest(raw_table) == table['sha256'] and pe.bytes(table_address, table_bytes) == raw_table,
            'Original Game C++ initializer table differs')
    require(index < table_bytes // 4 and
            int.from_bytes(raw_table[index * 4:index * 4 + 4], 'little') == entry,
            'Selected original C++ initializer table entry differs')
    text = pe.string(literal)
    require(text == name and pe.bytes(literal, len(text.encode('ascii')) + 1) == text.encode('ascii') + b'\0',
            'Selected Navigation name literal differs')
    cold, section = image_bytes(pe, slot, 4)
    require(cold == b'\0' * 4 and section['loaderZeroFillBytes'] == 4,
            'Selected Navigation CString global is not loader zero-fill')

    disassembly = study / '01_Decompiled_Code' / 'Game_dll' / 'full_disassembly.asm'
    instructions = []
    started = False
    next_address = entry
    with disassembly.open('r', encoding='utf8') as stream:
        for line_number, line in enumerate(stream, 1):
            fields = line.rstrip('\r\n').split(' | ', 2)
            is_instruction = (len(fields) == 3 and len(fields[0]) == 8 and
                              all(character in '0123456789abcdef' for character in fields[0]))
            if not started:
                if not is_instruction or int(fields[0], 16) != entry:
                    continue
                started = True
            if not is_instruction:
                break
            address = int(fields[0], 16)
            code = bytes.fromhex(fields[1])
            require(address == next_address and pe.bytes(address, len(code)) == code,
                    f'Initializer assembly/PE disagreement at {address:08x}')
            instructions.append(dict(va=fields[0], rva=f'{address-pe.base:x}',
                fileOffset=pe.offset(address, len(code)), bytes=fields[1],
                instruction=fields[2], assemblyLine=line_number))
            next_address += len(code)
            if fields[2].upper().startswith('RET'):
                break
    require(started and instructions and instructions[-1]['instruction'].upper().startswith('RET'),
            f'Complete selected initializer extent unavailable: {name}')

    c_path = study / '01_Decompiled_Code' / 'Game_dll' / 'pseudocode' / 'functions_00127.c'
    c_text = c_path.read_text(encoding='utf8')
    marker = f'/* ENTRY {entry:08x} |'
    c_at = c_text.index(marker)
    c_end = c_text.find('/* ENTRY ', c_at + 1)
    excerpt = c_text[c_at:c_end if c_end >= 0 else len(c_text)].rstrip() + '\n'
    require(f'"{name}"' in excerpt and f'FUN_{destructor:08x}' in excerpt and
            f'DAT_{slot:08x}' in excerpt,
            f'Decompiler initializer description differs: {name}')

    label = 'navigationNameInitializer' + name
    body_raw = b''.join(bytes.fromhex(item['bytes']) for item in instructions)
    folder = OUT / 'sources' / 'Game'
    folder.mkdir(parents=True, exist_ok=True)
    address = f'{entry:08x}'
    asm_path = folder / (address + '.asm.txt')
    asm_path.write_text('\n'.join(item['va'] + ' | ' + item['bytes'] + ' | ' + item['instruction']
        for item in instructions) + '\n', encoding='utf8', newline='\n')
    c_path_out = folder / (address + '.c.txt')
    c_path_out.write_text('\n'.join(part.rstrip() for part in excerpt.splitlines()) + '\n',
        encoding='utf8', newline='\n')
    source_refs = dict(assembly=asm_path.relative_to(OUT).as_posix(),
        assemblySha256=digest(asm_path.read_bytes()), c=c_path_out.relative_to(OUT).as_posix(),
        cSha256=digest(c_path_out.read_bytes()), cNormalization='rstrip-line-whitespace; LF line endings; final newline',
        decompilerInput='01_Decompiled_Code/Game_dll/pseudocode/functions_00127.c',
        decompilerInputSha256=digest(c_path.read_bytes()),
        decompilerLine=c_text.count('\n', 0, c_at) + 1)
    method = dict(module='Game', entry=address, body=address,
        bodyRanges=f'{entry:08x}-{next_address-1:08x}', instructionCount=len(instructions),
        bodyBytes=len(body_raw), bodyInstructionBytesSha256=digest(body_raw), sourceRefs=source_refs)
    initializer = dict(name=name, tableIndex=index, tableSlot=f'{table_address + index * 4:08x}',
        tableTarget=f'{entry:08x}', globalSlot=f'{slot:08x}', globalBytes=4,
        globalRaw=cold.hex(), globalKnownMask='ff' * 4, globalSha256=digest(cold),
        globalScope='original-Game-PE-loader-zero-fill', globalSection=section,
        literalAddress=f'{literal:08x}', literalRaw=(text.encode('ascii') + b'\0').hex(),
        destructor=f'{destructor:08x}', method=method)
    return (label, method), initializer

def selected_contact_runtime(game_pe: native.PE, methods: dict) -> dict:
    imports = {int(row['iatVA'], 16): row for row in game_pe.imports()}
    entity_slots = []
    for phase, offset, expected_name in (
        ('OnTouch', ENTITY_CONTACT_VTABLE['touchOffset'], ENTITY_CONTACT_IMPORTS['OnTouch']),
        ('OnUntouch', ENTITY_CONTACT_VTABLE['untouchOffset'], ENTITY_CONTACT_IMPORTS['OnUntouch']),
    ):
        raw = game_pe.bytes(ENTITY_CONTACT_VTABLE['address'] + offset, 4)
        thunk = struct.unpack('<I', raw)[0]
        thunk_bytes = game_pe.bytes(thunk, 6)
        require(thunk_bytes[:2] == b'\xff\x25', f'gCEntity {phase} slot is not the selected import thunk')
        iat = struct.unpack('<I', thunk_bytes[2:])[0]
        imported = imports.get(iat)
        require(imported is not None and imported['module'].lower() == 'engine.dll' and
                imported['name'] == expected_name,
                f'gCEntity {phase} slot does not import the expected Engine method')
        entity_slots.append(dict(phase=phase, slotOffset=f'{offset:x}', slotBytes=raw.hex(),
            thunk=f'{thunk:08x}', thunkBytes=thunk_bytes.hex(), iat=f'{iat:08x}',
            importModule=imported['module'], importName=imported['name']))

    property_slots = []
    for class_name, table, touch_label, untouch_label, touch, untouch, touch_body, untouch_body in PROPERTY_CONTACT_VTABLES:
        slots = []
        for phase, offset, label, target, body in (
            ('OnTouch', 0xcc, touch_label, touch, touch_body),
            ('OnUntouch', 0xd4, untouch_label, untouch, untouch_body),
        ):
            raw = game_pe.bytes(table + offset, 4)
            actual = struct.unpack('<I', raw)[0]
            method = methods.get(label)
            require(actual == target and method is not None and method['entry'] == f'{target:08x}' and
                    method['body'] == f'{body:08x}',
                    f'{class_name} {phase} vtable/decompiler target differs')
            slots.append(dict(phase=phase, slotOffset=f'{offset:x}', slotBytes=raw.hex(),
                target=f'{target:08x}', method=label, body=f'{body:08x}',
                bodyInstructionBytesSha256=method['bodyInstructionBytesSha256']))
        property_slots.append(dict(className=class_name, tableAddress=f'{table:08x}', slots=slots))

    iterator_methods = {}
    for label, (entry, body) in CONTACT_ITERATOR_METHODS.items():
        method = methods.get(label)
        require(method is not None and method['entry'] == entry and method['body'] == body,
                'Selected eCContactIterator/contact virtual method differs: ' + label)
        iterator_methods[label] = dict(entry=entry, body=body,
            bodyInstructionBytesSha256=method['bodyInstructionBytesSha256'])
    return dict(
        entityContactVtable=dict(module='Game', tableAddress=f"{ENTITY_CONTACT_VTABLE['address']:08x}",
            className='gCEntity', slots=entity_slots,
            scope='original-Game-PE-file-backed-vtable-and-Engine-import-thunk'),
        propertyContactVtables=property_slots,
        contactIterator=dict(module='Engine', extentBytes=0x44, permittedTypes=[5, 8, 10],
            currentContactPointerOffset=0, flagBytesOffset=0x30, resetFlagOffset=0x32,
            collisionTypeOffset=0x38, cStringOffset=0x3c, trailingWordOffset=0x40,
            methods=iterator_methods,
            vectors=dict(defaultConstructor='10002833', clear='10005ae7', destructor='10005461',
                firstOffset=0x0c, secondOffset=0x18, clearedOffset=0x24)),
        contactDispatch=dict(module='Engine', methods={
            label: dict(entry=methods[label]['entry'], body=methods[label]['body'],
                bodyInstructionBytesSha256=methods[label]['bodyInstructionBytesSha256'])
            for label in ('dynamicEntityOnTouch', 'dynamicEntityOnUntouch')}))

def prepare(study: Path) -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    audits, methods, cold = {}, {}, {}
    proxy_copy_vtable = None
    for short, (directory, binary, expected, targets) in MODULES.items():
        data = (study / '00_Original_Runtime' / binary).read_bytes()
        if digest(data) != expected:
            raise ValueError('Original module differs: ' + short)
        native.EXPECTED_INPUTS[binary] = expected
        pe = native.PE(data)
        if short == 'Engine':
            raw = pe.bytes(PROXY_COPY_VTABLE['address'] + PROXY_COPY_VTABLE['copyFromOffset'], 4)
            target = int.from_bytes(raw, 'little')
            if target != PROXY_COPY_VTABLE['copyFrom']:
                raise ValueError('Original eCEntityProxy CopyFrom vtable slot differs')
            proxy_copy_vtable = dict(module='Engine', address=f"{PROXY_COPY_VTABLE['address']:08x}",
                slotOffset=f"{PROXY_COPY_VTABLE['copyFromOffset']:x}", slotBytes=raw.hex(),
                slotTarget=f'{target:08x}', scope='original-Engine-PE-file-backed-vtable')
        audit = native.audit_module(study, directory, binary, {value: key for key, value in targets.items()})
        for method in audit['methods']:
            verify_extents(pe, method)
            destination = OUT / 'sources' / short
            destination.mkdir(parents=True, exist_ok=True)
            address = method['bodyVA'][2:]
            asm_path = destination / (address + '.asm.txt')
            asm_path.write_text('\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction']
                for row in method['instructions']) + '\n', encoding='utf8', newline='\n')
            c_path = destination / (address + '.c.txt')
            excerpt = source_excerpt(study, method)
            normalized_excerpt = '\n'.join(line.rstrip() for line in excerpt.splitlines()) + '\n'
            c_path.write_text(normalized_excerpt, encoding='utf8', newline='\n')
            method['sourceRefs'] = {
                'assembly': asm_path.relative_to(OUT).as_posix(), 'assemblySha256': digest(asm_path.read_bytes()),
                'c': c_path.relative_to(OUT).as_posix(), 'cSha256': digest(c_path.read_bytes()),
                'cNormalization': 'rstrip-line-whitespace; LF line endings; final newline',
            }
            methods[method['label']] = dict(module=short, entry=method['entryVA'][2:],
                body=method['bodyVA'][2:], bodyRanges=method['bodyRanges'],
                instructionCount=method['instructionCount'], bodyBytes=method['bodyByteCount'],
                bodyInstructionBytesSha256=method['bodyInstructionBytesSha256'],
                entryChain=method['entryChain'], sourceRefs=method['sourceRefs'])
        for label, (address, size) in COLD.get(short, {}).items():
            raw, section = image_bytes(pe, address, size)
            if any(raw):
                raise ValueError('Expected cold zero module storage differs: ' + label)
            cold[label] = dict(module=short, address=f'{address:08x}', bytes=size,
                raw=raw.hex(), knownMask='ff' * size, sha256=digest(raw), section=section,
                scope='cold-original-image', liveValueCaptured=False)
        audits[short] = audit
    game_pe = native.PE((study / '00_Original_Runtime' / 'Game.dll').read_bytes())
    table_path = ROOT / 'assets/gothic3/game-crt/tables/cppInitializers.json'
    table = json.loads(table_path.read_text(encoding='utf8'))
    initializer_records = []
    initializer_instruction_count = 0
    for row in NAVIGATION_NAME_INITIALIZERS:
        (label, method), initializer = selected_initializer(game_pe, study, table, row)
        methods[label] = method
        initializer_records.append(initializer)
        initializer_instruction_count += method['instructionCount']
    contact_runtime = selected_contact_runtime(game_pe, methods)
    instructions = sum(method['instructionCount'] for audit in audits.values() for method in audit['methods']) + initializer_instruction_count
    audit_summary = dict(selectedMethods=len(methods), instructions=instructions,
        allSelectedInstructionBytesMatchOriginalPE=True, completeSelectedBodyExtents=True,
        nativeCodeExecuted=False, liveProcessStateCaptured=False)
    rules = dict(schema='gothic3-browser-navigation-owner-rules-v1',
        inputs={short: item[2] for short, item in MODULES.items()}, methods=methods, coldGlobals=cold,
        proxyCopyVtable=proxy_copy_vtable,
        navigationNameInitializers=dict(module='Game', tableAddress=table['address'], tableBytes=table['bytes'],
            tableSha256=table['sha256'], tableScope='original-Game-PE-C++-initializer-table',
            tableWholeExecuted=False, initializers=initializer_records),
        contactRuntime=contact_runtime,
        profile='Original algorithms with explicit browser module bridge; actual constructed area admission required',
        gaps=['Full native module/application/session construction and shutdown',
              'Full NavZone/NavPath entity construction and reflective Read',
              'eCCollisionShape contact callbacks, unsupported property-set contact classes, and ScriptAdmin callbacks',
              'Original proxy/internal ownership and other notification services required by hosts'])
    evidence = dict(schema='gothic3-browser-navigation-owner-evidence-v1', audit=audit_summary, modules=audits,
        proxyCopyVtable=proxy_copy_vtable, selectedNavigationNameInitializers=initializer_records,
        contactRuntime=contact_runtime)
    (OUT / 'runtime-rules.json').write_bytes(encode(rules))
    (OUT / 'native-evidence.json').write_bytes(encode(evidence))
    files = [file for file in OUT.rglob('*') if file.is_file() and file.name != 'source-manifest.json']
    files.extend([Path(__file__).resolve(), table_path])
    for module in list(sys.modules.values()):
        path = getattr(module, '__file__', None)
        if path:
            dependency = Path(path).resolve()
            if dependency.parent == ROOT / 'tools/gothic3' and dependency.suffix == '.py':
                files.append(dependency)
    manifest = dict(schema='gothic3-browser-navigation-owner-source-manifest-v1', audit=audit_summary,
        checksActuallyPerformed=['Offline original PE SHA/instruction/extents/cold-storage audit',
                                'Offline CSV-mapped decompiler/assembly source audit',
                                'Offline original Game C++ initializer table, selected callback, CString literal, and loader-zero-fill audit',
                                'Original gCEntity contact import slots and Navigation property-set contact vtable slots audit'],
        noTestsOrBuildRunByProducer=True,
        files=[dict(path=file.relative_to(ROOT).as_posix(), bytes=file.stat().st_size,
                    sha256=digest(file.read_bytes())) for file in sorted(set(files))])
    (OUT / 'source-manifest.json').write_bytes(encode(manifest))
    return audit_summary

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.study.resolve())))
