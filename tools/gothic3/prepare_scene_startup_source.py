"""Audit SceneAdmin startup and two additional heap pools against original PE bytes.

This is an offline source package. Capturing a method does not implement its
unowned CRT, application, reflection, section, module, or shutdown services.
Reconstructed C is explanatory; instruction operands and original bytes govern.
"""
# SPDX-License-Identifier: GPL-3.0-only
from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
from pathlib import Path

import read_dialogue_native_evidence as native
from prepare_runtime_admin_source import image_bytes, source_excerpt

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/gothic3/scene-startup'
SHARED = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'
ENGINE = 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'
BASE_RULES = '4c95912d7c7087af7a4c6c1c1d9f31d1b69e23da9456e5022c7d64f8756be016'

SHARED_TARGETS = {
    'heap24BitmapAlloc': 0x10004557, 'heap24BlockInitialize': 0x10002b3f,
    'heap384BitmapAlloc': 0x100067bc, 'heap384BlockInitialize': 0x100076b7,
    'heap24InlineFree': 0x10003afd, 'heap384InlineFree': 0x100072ac,
    'heap24Statistics': 0x10007536,
    'classNameUnMangle': 0x100088cd, 'sceneSectionSetSpinCount': 0x10002f27,
    'objectBaseConstructor': 0x10007c11, 'objectRefBaseConstructor': 0x10001d07,
    'objectBaseCreate': 0x10008143, 'objectBaseDestroy': 0x100046ba,
    'objectBaseIsValid': 0x10006140, 'objectBaseDestructor': 0x10002946,
    'objectRefBaseCreate': 0x100079fa, 'objectRefBaseDestroy': 0x10004d59,
    'objectRefBaseIsValid': 0x10007f81, 'objectRefBaseDestructor': 0x10005998,
    'vectorConstructor': 0x10002833, 'sphereConstructor': 0x10003634,
    'boxConstructor': 0x1000782e, 'sphereClear': 0x10005e20,
    'boxInvalidate': 0x10007e28,
}
ENGINE_TARGETS = {
    'sceneGetInstance': 0x30009a2a, 'sceneClassName': 0x3003d91f,
    'typeInfoName': 0x306713ae, 'typeInfoNameBody': 0x3067da97,
    'sceneReflectedCreator': 0x304d1fb0,
    'engineComponentConstructor': 0x300027b1, 'inputReceiverConstructor': 0x30035a5d,
    'inputReceiverIsInputEnabled': 0x30001e9c, 'inputReceiverGetInputPriority': 0x3000d95e,
    'inputReceiverDestructor': 0x3003b5fc,
    'objectRefBaseIsValidImport': 0x306378de,
    'objectRefBaseAddReferenceImport': 0x30637908,
    'objectRefBaseReleaseReferenceImport': 0x3063790e,
    'entityAdminConstructor': 0x3001d1ce, 'entityAdminInvalidate': 0x300210a8,
    'entityMapConstructor': 0x304502a0, 'entityMapGrow': 0x3044ef00,
    'templateMapConstructor': 0x304d1220, 'templateMapGrow': 0x304ce8b0,
    'unknownMapConstructor': 0x304d14e0, 'unknownMapGrow': 0x304ceaf0,
    'moduleGetInstance': 0x3002e9ec, 'moduleFindModule': 0x3001d11a,
    'moduleRegister': 0x300164ff, 'moduleDestructor': 0x3001bb30,
    'moduleArrayGrow': 0x3002f1b2,
    'inputDispatcherConstructor': 0x3003f026, 'inputDispatcherCreate': 0x3000f5bf,
    'inputDispatcherRegister': 0x3001ca21, 'inputDispatcherDestroy': 0x300235bf,
    'inputDispatcherDestructor': 0x300458fe,
    'inputDispatcherArrayContains': 0x30006203, 'inputDispatcherArrayAppend': 0x30029be0,
    'inputDispatcherSetSession': 0x30014a79, 'inputDispatcherSetActionMapper': 0x30012a49,
    'inputDispatcherInvalidate': 0x30036237,
    'applicationGetInstance': 0x3003e270, 'applicationGetKeyboard': 0x30010e1a,
    'applicationGetMouse': 0x30006519, 'keyboardClearKeyBuffer': 0x3003fb9d,
    'mouseClearBuffer': 0x30024ac3,
    'sceneDestructor': 0x304cc4b0, 'crtAtexit': 0x30671596,
    'sceneDynamicCast': 0x30671ae7,
    'crtTypeInfoMalloc': 0x30672ec7, 'crtTypeInfoFree': 0x30672f8a,
    'crtTypeInfoLock': 0x306833a6, 'crtTypeInfoUnlock': 0x306832b6,
}
# Exact non-padding extents for methods absent from the source function catalog.
SHARED_ASM = {
    'heap24PoolDispatch': (0x10004214, [(0x10048050, 0x10048079), (0x10048080, 0x100480cf)]),
    'heap384PoolDispatch': (0x10006eec, [(0x10048a50, 0x10048a79), (0x10048a80, 0x10048acf)]),
    'heap24Free': (0x10003ee5, [(0x10044270, 0x100442b4)]),
    'heap24Realloc': (0x1000332d, [(0x100442d0, 0x10044326)]),
    'heap384Free': (0x10001b68, [(0x10044f00, 0x10044f44)]),
    'heap384Realloc': (0x100012d5, [(0x10044f60, 0x10044fa5)]),
    'heap24PoolShutdown': (0x10008a6c, [(0x1003fea0, 0x1003fed9),
        (0x1003fee0, 0x1003ff3c), (0x1003ff40, 0x1003ff5f), (0x1003ff60, 0x1003ff73)]),
    'heap384PoolShutdown': (0x1000629e, [(0x10041610, 0x100416e3)]),
    'heap384Statistics': (0x10006217, [(0x10041720, 0x1004176c)]),
}
ENGINE_ASM = {
    'sceneClassNameInitializer': (0x307325e0, [(0x307325e0, 0x307325ea)]),
    'sceneClassNameDestructor': (0x300184df, [(0x30797c90, 0x30797c9a)]),
    'moduleShutdown': (0x30797fc0, [(0x30797fc0, 0x30797fc9)]),
}
# Ghidra omitted these instructions after incorrectly treating _free as noreturn.
# Each exact x86 opcode is pinned to original PE bytes. The recovered cleanup is
# a separate function, entered at +3 by the normal type_info::name path.
PE_RECOVERY = {
    0x3067db45: ('83c414', 'ADD ESP,0x14'),
    0x3067db61: ('59', 'POP ECX'),
    0x3067db6a: ('59', 'POP ECX'),
    0x3067db6b: ('c745fcfeffffff', 'MOV dword ptr [EBP + -0x4],0xfffffffe'),
    0x3067db72: ('e80c000000', 'CALL 0x3067db83'),
    0x3067db80: ('8b7d08', 'MOV EDI,dword ptr [EBP + 0x8]'),
    0x3067db83: ('6a0e', 'PUSH 0xe'),
    0x3067db85: ('e82c570000', 'CALL 0x306832b6'),
    0x3067db8a: ('59', 'POP ECX'),
    0x3067db8b: ('c3', 'RET'),
}
BUCKETS = {
    '24': dict(stride=24, minimumRequest=21, maximumRequest=24,
        regionBytes=0xc0000, capacity=0x7f55, bitmapOffset=0xbf008,
        bitmapBytes=0xfec, lastBitmapMask=0x1fffff, payloadBytes=0xbeff8,
        globals=dict(count='102ffd70', list='102ffd74', peak='102ffd78', descriptor='102ffef8'),
        callbacks=['10003ee5', '1000332d', '10008a6c', '10007536']),
    '384': dict(stride=384, minimumRequest=321, maximumRequest=384,
        regionBytes=0x300000, capacity=0x1ffd, bitmapOffset=0x2ffb90,
        bitmapBytes=0x400, lastBitmapMask=0x1fffffff, payloadBytes=0x2ffb80,
        globals=dict(count='102ffe30', list='102ffe34', peak='102ffe38', descriptor='102fff38'),
        callbacks=['10001b68', '100012d5', '1000629e', '10006217']),
}
SHARED_COLD = {
    'heap24PoolGlobals': (0x102ffd70, 12), 'heap24DescriptorSlot': (0x102ffef8, 4),
    'heap384PoolGlobals': (0x102ffe30, 12), 'heap384DescriptorSlot': (0x102fff38, 4),
    'heapPointerAreasSelected': (0x10149a18, 14 * 16),
}
ENGINE_COLD = {
    'sceneClassName': (0x30ad9c44, 12), 'sceneCachedSingleton': (0x30ad9cdc, 8),
    'applicationPointer': (0x30ad9898, 4), 'applicationInitialized': (0x30ad989c, 1),
    # This is a cached CLASS-NAME return pointer, not the RTTI descriptor.
    'sceneTypeInfoPointer': (0x30ad9d6c, 4), 'crtTypeInfoList': (0x30af70ac, 8),
    'moduleAdmin': (0x30ad9e78, 0x54), 'moduleAdminGuard': (0x30ad9ecc, 4),
    'entityAdminCriticalSection': (0x30af23d0, 24),
    'sceneGlobalCString': (0x30adcd2c, 4), 'sceneGlobalCounter': (0x30adcd30, 4),
    'sceneDefaultTrigger': (0x30adcd28, 4),
}
# These immutable vtable slices prove the selected inherited dispatch slots.
# A receipt records original target identities; it does not bind a live owner.
INPUT_VTABLES = {
    'objectBaseVtable': ('SharedBase', 0x100e7e1c, 0x1c,
        {0x04: 0x10006140, 0x14: 0x100046ba, 0x18: 0x10008143}),
    'objectRefBaseVtable': ('SharedBase', 0x100e7eac, 0x40,
        {0x04: 0x10007f81, 0x14: 0x10004d59, 0x18: 0x100079fa,
         0x20: 0x100022d4, 0x24: 0x1000551a}),
    'inputReceiverVtable': ('Engine', 0x308257bc, 0x70,
        {0x04: 0x306378de, 0x20: 0x30637908, 0x24: 0x3063790e, 0x60: 0x3000d95e}),
    'inputDispatcherVtable': ('Engine', 0x3081cabc, 0x88,
        {0x04: 0x306378de, 0x14: 0x300235bf, 0x18: 0x3000f5bf,
         0x20: 0x30637908, 0x24: 0x3063790e, 0x60: 0x3000d95e,
         0x74: 0x3001ca21, 0x7c: 0x30014a79, 0x80: 0x30012a49}),
    'moduleAdminVtable': ('Engine', 0x3081cdd4, 0x88,
        {0x04: 0x306378de, 0x20: 0x30637908, 0x24: 0x3063790e,
         0x60: 0x3000d95e, 0x74: 0x300164ff, 0x7c: 0x30014a79, 0x80: 0x30012a49}),
    'engineComponentVtable': ('Engine', 0x3082553c, 0x70,
        {0x04: 0x306378de, 0x20: 0x30637908, 0x24: 0x3063790e, 0x60: 0x3000d95e}),
    'sceneAdminVtable': ('Engine', 0x3087c7dc, 0x70,
        {0x04: 0x306378de, 0x20: 0x30637908, 0x24: 0x3063790e, 0x60: 0x3000d95e}),
}
INPUT_IMPORTS = {
    'objectRefBaseConstructor': (0x30afdc08, '??0bCObjectRefBase@@QAE@XZ', 'objectRefBaseConstructor'),
    'objectRefBaseCreate': (0x30afdc50, '?Create@bCObjectRefBase@@UAE?AW4bEResult@@XZ', 'objectRefBaseCreate'),
    'objectRefBaseDestroy': (0x30afdc54, '?Destroy@bCObjectRefBase@@UAEXXZ', 'objectRefBaseDestroy'),
    'objectRefBaseDestructor': (0x30afdc04, '??1bCObjectRefBase@@MAE@XZ', 'objectRefBaseDestructor'),
    'objectRefBaseIsValid': (0x30afdc64, '?IsValid@bCObjectRefBase@@UBE_NXZ', 'objectRefBaseIsValid'),
    # The real receiver's reference lifetime remains a lower service owner.
    'objectRefBaseAddReference': (0x30afdc48, '?AddReference@bCObjectRefBase@@UAEKXZ', None),
    'objectRefBaseReleaseReference': (0x30afdc44, '?ReleaseReference@bCObjectRefBase@@UAEKXZ', None),
    'memoryGetInstance': (0x30afdbac, '?GetInstance@bCMemoryAdmin@@SGAAV1@XZ', None),
    'memoryFree': (0x30afdb0c, '?Free@bCMemoryAdmin@@QAEXPAX@Z', None),
    'memoryRealloc': (0x30afdb08, '?Realloc@bCMemoryAdmin@@QAEPAXPAXK@Z', None),
}
REUSED_ENGINE = {
    'registeredMapConstructor': 'registeredMapConstructor', 'registeredMapGrow': 'registeredMapGrow',
    'nameMapConstructor': 'nameMapConstructor', 'nameMapGrow': 'nameMapGrow',
    'sceneConstructor': 'sceneConstructorCallInventory',
}
CALLER_ALIASES = {
    'sceneConstructor': [0x30014619],
    'registeredMapConstructor': [0x30015a5f], 'entityMapConstructor': [0x30009e12],
    'templateMapConstructor': [0x3003e3d3], 'nameMapConstructor': [0x3003b9da],
    'unknownMapConstructor': [0x30001109],
}
REUSED_NPC = ['cstringDefaultConstructor', 'cstringTextConstructor', 'cstringAssign',
    'cstringSetShared', 'cstringSetText', 'cstringAlloc', 'cstringRealloc',
    'cstringRelease', 'cstringStaticRelease', 'cstringDestructor', 'cstringIsEmpty',
    'cstringGetText', 'cstringClear', 'sceneSectionConstructor', 'sceneSectionAcquire',
    'sceneSectionRelease', 'memoryMalloc']


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def encode(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf8')


def parse_assembly(study: Path, module: str, selections: dict) -> list[tuple]:
    rows = []
    ranges = [extent for _, extents in selections.values() for extent in extents]
    with (study / f'01_Decompiled_Code/{module}_dll/full_disassembly.asm').open(encoding='utf8') as stream:
        for line, text in enumerate(stream, 1):
            match = re.fullmatch(r'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', text.rstrip('\r\n'))
            if match and any(a <= int(match[1], 16) <= b for a, b in ranges):
                rows.append((int(match[1], 16), match[2], match[3], line))
    return rows


def instruction(pe: native.PE, address: int, raw: str, text: str, line: int | None) -> dict:
    data = bytes.fromhex(raw)
    require(pe.bytes(address, len(data)) == data, f'ASM/PE byte mismatch at {address:08x}')
    row = dict(va=f'{address:08x}', rva=f'{address-pe.base:x}', bytes=raw,
               instruction=text, fileOffset=pe.offset(address, len(data)))
    if line is None:
        row.update(originalPERecovered=True, sourceASMGap=True)
    else:
        row['assemblyLine'] = line
    return row


def manual_method(pe: native.PE, parsed: list[tuple], label: str, entry: int, ranges: list[tuple]) -> dict:
    first = ranges[0][0]
    chain = []
    if entry != first:
        raw = pe.bytes(entry, 5)
        require(raw[0] == 0xe9 and entry + 5 + struct.unpack('<i', raw[1:])[0] == first,
                'Alias target differs: ' + label)
        chain = [dict(va=f'{entry:08x}', bytes=raw.hex(), targetVA=f'{first:08x}')]
    instructions = [instruction(pe, a, raw, text, line) for a, raw, text, line in parsed
                    if any(start <= a <= end for start, end in ranges)]
    result = dict(label=label, entryVA=f'0x{entry:08x}', bodyVA=f'0x{first:08x}',
                  entryChain=chain, bodyRanges=';'.join(f'{a:08x}-{b:08x}' for a, b in ranges),
                  instructions=instructions, sourceCGap=True, sourceASMGap=False)
    verify_extents(pe, result)
    return result


def verify_extents(pe: native.PE, method: dict) -> None:
    rows = method['instructions']
    for start_text, end_text in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})', method['bodyRanges']):
        start, end = int(start_text, 16), int(end_text, 16)
        cursor = start
        for row in rows:
            address = int(row['va'], 16)
            if start <= address <= end:
                raw = bytes.fromhex(row['bytes'])
                require(address == cursor and pe.bytes(address, len(raw)) == raw,
                        f'Instruction coverage differs: {method["label"]} {cursor:08x}')
                cursor += len(raw)
        require(cursor == end + 1, 'Body extent differs: ' + method['label'])
    for row in method.get('entryChain', []):
        require(pe.bytes(int(row['va'], 16), len(bytes.fromhex(row['bytes']))) == bytes.fromhex(row['bytes']),
                'Thunk bytes differ: ' + method['label'])


def refs(study: Path, module: str, method: dict) -> dict:
    folder = OUT / f'sources/{module}'
    folder.mkdir(parents=True, exist_ok=True)
    address = method['bodyVA'][2:]
    path = folder / (address + '.asm.txt')
    path.write_text('\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction']
                             for row in method['instructions']) + '\n', encoding='utf8', newline='\n')
    result = dict(assemblyExcerpt=path.relative_to(OUT).as_posix(), assemblyExcerptSha256=sha(path.read_bytes()))
    if 'reconstructedC' in method:
        path = folder / (address + '.c.txt')
        path.write_text(source_excerpt(study, method), encoding='utf8', newline='\n')
        result.update(cExcerpt=path.relative_to(OUT).as_posix(), cExcerptSha256=sha(path.read_bytes()),
                      reconstructedC=method['reconstructedC'])
    return result


def rule(module: str, method: dict) -> dict:
    raw = b''.join(bytes.fromhex(row['bytes']) for row in method['instructions'])
    method.update(module=module, instructionCount=len(method['instructions']), bodyByteCount=len(raw),
                  bodyInstructionBytesSha256=sha(raw))
    return dict(module=module, entry=method['entryVA'][2:], body=method['bodyVA'][2:],
                bodyRanges=method['bodyRanges'], instructionCount=method['instructionCount'],
                bodyBytes=len(raw), bodyInstructionBytesSha256=sha(raw), sourceRefs=method['sourceRefs'])


def cold(pe: native.PE, module: str, address: int, size: int) -> dict:
    raw, section = image_bytes(pe, address, size)
    require(raw == b'\0' * size, f'Original cold range is nonzero: {address:08x}')
    return dict(address=f'{address:08x}', bytes=size, raw=raw.hex(), knownMask='ff' * size,
                sha256=sha(raw), module=module, section=section, scope='cold-original-image', liveValueCaptured=False)


def const(pe: native.PE, address: int, size: int) -> dict:
    raw, section = image_bytes(pe, address, size)
    return dict(address=f'{address:08x}', bytes=size, raw=raw.hex(), knownMask='ff' * size,
                sha256=sha(raw), module='Engine' if pe.base == 0x30000000 else 'SharedBase',
                section=section, scope='cold-original-image', liveValueCaptured=False)


def named_exports(pe: native.PE) -> dict[str, int]:
    rva, size = struct.unpack_from('<II', pe.data, pe.optional + 96)
    require(rva != 0 and size >= 40, 'Original named export directory is absent')
    fields = struct.unpack('<IIHHIIIIIII', pe.bytes(pe.base + rva, 40))
    count, name_count, functions, names, ordinals = fields[6:11]
    require(max(count, name_count) <= 65536, 'Original export count exceeds selected bounds')
    result = {}
    for index in range(name_count):
        name = struct.unpack('<I', pe.bytes(pe.base + names + index * 4, 4))[0]
        ordinal = struct.unpack('<H', pe.bytes(pe.base + ordinals + index * 2, 2))[0]
        require(ordinal < count, 'Original export ordinal exceeds function table')
        target = struct.unpack('<I', pe.bytes(pe.base + functions + ordinal * 4, 4))[0]
        result[pe.string(pe.base + name)] = pe.base + target
    return result


def reuse_method(module: str, method: dict, folder: str, pe: native.PE) -> dict:
    method = json.loads(json.dumps(method))
    verify_extents(pe, method)
    source = dict(method['sourceRefs'])
    for key in ['assemblyExcerpt', 'cExcerpt']:
        if key in source:
            path = ROOT / f'assets/gothic3/{folder}' / source[key]
            require(sha(path.read_bytes()) == source[key + 'Sha256'], 'Frozen source excerpt differs: ' + str(path))
            source[key] = '../' + folder + '/' + source[key]
    method['sourceRefs'] = source
    method['reusedReceipt'] = '../' + folder + '/native-evidence.json'
    return rule(module, method) | {'reusedReceipt': method['reusedReceipt']}


def prepare(study: Path) -> dict:
    base_path = ROOT / 'assets/gothic3/runtime-admin/runtime-rules.json'
    base_raw = base_path.read_bytes()
    require(sha(base_raw) == BASE_RULES, 'Frozen base rules changed')
    pe = native.PE((study / '00_Original_Runtime/SharedBase.dll').read_bytes())
    engine = native.PE((study / '00_Original_Runtime/Engine.dll').read_bytes())
    require(sha(pe.data) == SHARED and sha(engine.data) == ENGINE, 'Original native input changed')
    native.EXPECTED_INPUTS.update({'SharedBase.dll': SHARED, 'Engine.dll': ENGINE})
    audits = {
        'SharedBase': native.audit_module(study, 'SharedBase_dll', 'SharedBase.dll',
                                         {a: label for label, a in SHARED_TARGETS.items()}),
        'Engine': native.audit_module(study, 'Engine_dll', 'Engine.dll',
                                     {a: label for label, a in ENGINE_TARGETS.items()}),
    }
    shared_parsed = parse_assembly(study, 'SharedBase', SHARED_ASM)
    engine_parsed = parse_assembly(study, 'Engine', ENGINE_ASM)
    for module, selections, owner, parsed in [('SharedBase', SHARED_ASM, pe, shared_parsed),
                                               ('Engine', ENGINE_ASM, engine, engine_parsed)]:
        for label, (entry, ranges) in selections.items():
            audits[module]['methods'].append(manual_method(owner, parsed, label, entry, ranges))
    type_method = next(m for m in audits['Engine']['methods'] if m['label'] == 'typeInfoNameBody')
    type_method['originalCatalogBodyRanges'] = type_method['bodyRanges']
    type_method['bodyRanges'] = '3067da97-3067db7f'
    for address, (raw, text) in PE_RECOVERY.items():
        if address < 0x3067db80:
            type_method['instructions'].append(instruction(engine, address, raw, text, None))
    type_method['instructions'].sort(key=lambda row: row['va'])
    type_method.update(sourceASMGap=True, sourceCUntrustedNoReturnAnnotation=True,
                       recovery='Original PE instructions omitted after reconstructed noreturn _free annotation.')
    cleanup = dict(label='typeInfoNameCleanup', entryVA='0x3067db83', bodyVA='0x3067db80',
        entryChain=[], bodyRanges='3067db80-3067db8b', sourceCGap=True, sourceASMGap=True,
        entryWithinBody=True, instructions=[instruction(engine, a, raw, text, None)
            for a, (raw, text) in PE_RECOVERY.items() if a >= 0x3067db80])
    audits['Engine']['methods'].append(cleanup)
    methods, method_rules = [], {}
    for module, audit in audits.items():
        owner = pe if module == 'SharedBase' else engine
        for method in audit['methods']:
            verify_extents(owner, method)
            method['sourceRefs'] = refs(study, module, method)
            method_rules[method['label']] = rule(module, method)
            methods.append(method)

    prior_path = ROOT / 'assets/gothic3/runtime-admin/prior-startup-allocations.json'
    prior_raw = prior_path.read_bytes()
    prior = json.loads(prior_raw)
    require(prior['inputs']['SharedBase'] == SHARED and prior['inputs']['Engine'] == ENGINE,
            'Frozen prior startup inputs differ')
    prior_methods = {m['label']: m for m in prior['modules']['Engine']['methods']}
    for label, old_label in REUSED_ENGINE.items():
        method_rules[label] = reuse_method('Engine', prior_methods[old_label], 'runtime-admin', engine)
        method_rules[label]['reusedReceipt'] = '../runtime-admin/prior-startup-allocations.json'
    npc_path = ROOT / 'assets/gothic3/npc-heap/native-evidence.json'
    npc_raw = npc_path.read_bytes()
    npc = json.loads(npc_raw)
    require(npc['inputs']['SharedBase'] == SHARED and npc['inputs']['Engine'] == ENGINE,
            'Frozen NPC heap inputs differ')
    npc_methods = {m['label']: m for m in npc['methods']}
    for label in REUSED_NPC:
        method_rules[label] = reuse_method('SharedBase', npc_methods[label], 'npc-heap', pe)
    for label, entries in CALLER_ALIASES.items():
        bindings = []
        for entry in entries:
            raw = engine.bytes(entry, 5)
            target = entry + 5 + struct.unpack('<i', raw[1:])[0]
            require(raw[0] == 0xe9 and f'{target:08x}' == method_rules[label]['body'],
                    'Original caller alias target differs: ' + label)
            bindings.append(dict(entry=f'{entry:08x}', raw=raw.hex(), target=f'{target:08x}', sha256=sha(raw)))
        method_rules[label]['callerAliases'] = bindings

    table = json.loads(base_raw)['pointerTables']['heapDispatchTable']
    table_raw = pe.bytes(0x102fb050, 4097 * 4)
    require(sha(table_raw) == table['sha256'] and table_raw.hex() == table['raw'], 'Frozen dispatch table differs')
    buckets, words = {}, {}
    for name, values in BUCKETS.items():
        labels = ['heap' + name + suffix for suffix in ['PoolDispatch', 'BlockInitialize', 'BitmapAlloc',
                  'Free', 'Realloc', 'InlineFree', 'PoolShutdown', 'Statistics']]
        rows = [row for method in methods if method['label'] in labels[:3] for row in method['instructions']]
        code = b''.join(bytes.fromhex(row['bytes']) for row in rows)
        dispatch = method_rules[labels[0]]['entry']
        require(all(table['values'][request] == dispatch
                    for request in range(values['minimumRequest'], values['maximumRequest'] + 1)),
                'Exact dispatch range differs: ' + name)
        require(table['values'][values['minimumRequest'] - 1] != dispatch and
                table['values'][values['maximumRequest'] + 1] != dispatch, 'Dispatch boundary differs: ' + name)
        proofs = {}
        for field in ['regionBytes', 'bitmapOffset', 'bitmapBytes', 'lastBitmapMask', 'payloadBytes']:
            operand = struct.pack('<I', values[field]).hex()
            matches = [row for row in rows if operand in row['bytes']]
            require(matches, 'Original pool operand absent: ' + name + ':' + field)
            proofs[field] = [dict(va=row['va'], bytes=row['bytes'], instruction=row['instruction']) for row in matches]
        for callback in values['callbacks']:
            require(struct.pack('<I', int(callback, 16)) in code, 'Descriptor callback operand differs')
        word_address = 0x100e7ab8 if name == '24' else 0x100e7b38
        for suffix, address, value in [('Stride', word_address, values['stride']),
                                        ('Capacity', word_address + 4, values['capacity'])]:
            raw = pe.bytes(address, 4)
            require(struct.unpack('<I', raw)[0] == value, 'Static pool DWORD differs')
            words['heap' + name + suffix] = dict(address=f'{address:08x}', raw=raw.hex(), value=value, sha256=sha(raw))
        buckets[name] = dict(values, sourceRefs={label: method_rules[label] for label in labels},
            operandProofs=proofs, strideReceipt='heap' + name + 'Stride', capacityReceipt='heap' + name + 'Capacity',
            dispatchTableReceipt='../runtime-admin/runtime-rules.json#pointerTables.heapDispatchTable')

    cold_globals = {label: cold(pe, 'SharedBase', address, size) for label, (address, size) in SHARED_COLD.items()}
    cold_globals.update({label: cold(engine, 'Engine', address, size) for label, (address, size) in ENGINE_COLD.items()})
    cold_globals['sceneTypeInfoPointer']['meaning'] = 'Cached class-name initializer result, not RTTI. Setter307325e0 calls SceneClassName then stores returned CString address.'
    descriptor_name = engine.string(0x30aa3058)
    require(descriptor_name == '.?AVeCSceneAdmin@@', 'Scene RTTI descriptor name differs')
    base_descriptor_name = engine.string(0x30aa2634)
    require(base_descriptor_name == '.?AVeCEngineComponentBase@@', 'Scene dynamic-cast base descriptor differs')
    constants = dict(sceneTypeInfoDescriptor=const(engine, 0x30aa3050, 8 + len(descriptor_name) + 1),
                     engineComponentTypeInfoDescriptor=const(engine, 0x30aa262c, 8 + len(base_descriptor_name) + 1),
                     entityAdminCreateFloat=const(engine, 0x30826e38, 4),
                     sphereClearRadius=const(pe, 0x100e5df4, 4),
                     boxInvalidMinimum=const(pe, 0x100e5df0, 4),
                     boxInvalidMaximum=const(pe, 0x100e5df4, 4),
                     classNameSpaceNeedle=const(pe, 0x100e6f44, 2))
    constants['sceneTypeInfoDescriptor'].update(mangledName=descriptor_name, nameOffset=8, demanglerInputOffset=9,
        cachedNamePointerOffset=4, sourceOperandVA='30078119', descriptorIndependentOfCopiedClassNameSlot=True)
    constants['engineComponentTypeInfoDescriptor'].update(mangledName=base_descriptor_name, nameOffset=8,
        cachedNamePointerOffset=4, sourceOperandVA='3007bf42')
    constants['entityAdminCreateFloat'].update(value=250.0, valueType='float32')
    require(constants['entityAdminCreateFloat']['raw'] == '00007a43', 'EntityAdmin source float differs')
    require(constants['sphereClearRadius']['raw'] == 'ffff7fff' and
            constants['boxInvalidMinimum']['raw'] == 'ffff7f7f' and
            constants['boxInvalidMaximum']['raw'] == 'ffff7fff', 'Source math invalidation constants differ')
    require(constants['classNameSpaceNeedle']['raw'] == '2000', 'UnMangle strstr space literal differs')
    vtable_slots = {}
    for label, (module, address, size, selected_slots) in INPUT_VTABLES.items():
        owner = engine if module == 'Engine' else pe
        receipt = const(owner, address, size)
        raw = bytes.fromhex(receipt['raw'])
        slots = {str(offset): f'{struct.unpack_from("<I", raw, offset)[0]:08x}'
                 for offset in range(0, size, 4)}
        for offset, expected in selected_slots.items():
            require(slots[str(offset)] == f'{expected:08x}',
                    f'Original selected vtable target differs: {label}+{offset:x}')
        constants[label] = receipt
        vtable_slots[label] = slots
    # Import metadata and unbound original thunk bytes never claim live bindings.
    imports = {}
    for module, owner in [('SharedBase', pe), ('Engine', engine)]:
        reused_methods = ([prior_methods[name] for name in REUSED_ENGINE.values()] if module == 'Engine'
                          else [npc_methods[name] for name in REUSED_NPC])
        used = {f'0x{v}' for method in [m for m in methods if m['module'] == module] + reused_methods for row in method['instructions']
                for v in re.findall(r'\[0x([0-9a-f]{8})\]', row['instruction'])}
        imports[module] = [dict(value, originalIatRaw=owner.bytes(int(value['iatVA'], 16), 4).hex(),
            originalIatSha256=sha(owner.bytes(int(value['iatVA'], 16), 4)), scope='original-unbound-import-thunk')
            for value in owner.imports() if value['iatVA'] in used]
    engine_imports = {row['iatVA']: row for row in imports['Engine']}
    shared_exports = named_exports(pe)
    input_imports = {}
    for label, (address, decorated, method_label) in INPUT_IMPORTS.items():
        receipt = engine_imports.get(f'0x{address:08x}')
        require(receipt is not None and receipt['module'].lower() == 'sharedbase.dll' and
                receipt['name'] == decorated and decorated in shared_exports,
                'Original dispatcher SharedBase import identity differs: ' + label)
        target = shared_exports[decorated]
        if method_label is not None:
            method = method_rules[method_label]
            require(method['module'] == 'SharedBase' and method['entry'] == f'{target:08x}',
                    'Original dispatcher import/export target differs: ' + label)
        input_imports[label] = dict(receipt, targetModule='SharedBase', exportEntry=f'{target:08x}',
            targetMethod=method_label, targetBody=method_rules[method_label]['body'] if method_label else None,
            source='original PE named export table; unbound Engine IAT metadata',
            liveBindingCaptured=False)
    call_inventory = {method['label']: [dict(va=row['va'], bytes=row['bytes'], instruction=row['instruction'])
        for row in method['instructions'] if row['instruction'].startswith('CALL ') or
            row['instruction'].startswith('JMP dword ptr ')] for method in methods}
    reused = dict(baseAllocator=dict(path='../runtime-admin/runtime-rules.json', bytes=len(base_raw), sha256=sha(base_raw)),
        priorStartup=dict(path='../runtime-admin/prior-startup-allocations.json', bytes=len(prior_raw), sha256=sha(prior_raw),
                          methods=REUSED_ENGINE),
        npcHeap=dict(path='../npc-heap/native-evidence.json', bytes=len(npc_raw), sha256=sha(npc_raw), methods=REUSED_NPC))
    class_name = dict(holderAddress='30ad9c44', copiedClassNameAddress='30ad9c48', guardAddress='30ad9c4c',
        initializerResultAddress='30ad9d6c', initializerMethod='sceneClassNameInitializer',
        typeInfoDescriptorAddress='30aa3050', typeInfoListAddress='30af70ac',
        guardBits=[1, 2], unDNameFlags=0x2800, crtLockNumber=14,
        expectedUnmangledClass='eCSceneAdmin', expectedTextBytes=12, cstringAllocationBytes=21, allocationBucket='24',
        order=['guard bit1 before copying initializer result', 'guard bit2 before CRT type_info::name',
               'type_info name: descriptor+4 cache; ___unDName(descriptor+9,flags0x2800)',
               'trim trailing ASCII spaces', 'CRT lock14', 'allocate list node8 then nameBytes+1',
               'strcpy_s then list linkage', 'free temporary unmangled buffer', 'CRT unlock14',
               'UnMangle strips prefix through first ASCII space', 'CString text constructor',
               'atexit(sceneClassNameDestructor)'],
        scope='The expected demangled spelling is a selected service outcome, not executed CRT evidence.')
    scene = dict(allocationBytes=348, allocationTag=0xc4, allocationBucket='384', vtable='3087c7dc',
        mapOrder=[dict(offset=offset, constructor=ctor, grow=grow, allocationBytes=204,
                       logicalBuckets=43, capacityBuckets=51, zeroBytes=172)
            for offset, ctor, grow in [(0x14, 'registeredMapConstructor', 'registeredMapGrow'),
                (0x24, 'entityMapConstructor', 'entityMapGrow'), (0x34, 'templateMapConstructor', 'templateMapGrow'),
                (0x44, 'nameMapConstructor', 'nameMapGrow'), (0x54, 'unknownMapConstructor', 'unknownMapGrow')]],
        entityAdminOffset=0x68, entityAdminSectionAddress='30af23d0', entityAdminSpinCount=4000,
        moduleRegistrationVirtualOffset=0x74,
        unowned=['Application initialization before enabling SceneGetInstance.',
                 'CRT ___unDName and actual malloc/free/lock platform owners.',
                 'EntityAdmin section initialization before SetSpinCount4000.',
                 'Module and reflection registration owners, full shutdown callback ownership.'])
    inputs = dict(SharedBase=SHARED, Engine=ENGINE)
    audit_summary = dict(methodCount=len(methods), instructionCount=sum(len(m['instructions']) for m in methods),
        uniqueInstructionCount=len({(m['module'], row['va']) for m in methods for row in m['instructions']}),
        reusedMethodCount=len(REUSED_ENGINE) + len(REUSED_NPC),
        recoveredPEInstructionCount=len(PE_RECOVERY), byteMismatchCount=0, nativeCodeExecuted=False,
        vtableCount=len(vtable_slots), vtableWordCount=sum(len(value) for value in vtable_slots.values()),
        inputDispatcherImportCount=len(input_imports))
    rules = dict(schema='gothic3-scene-startup-rules-v1', inputs=inputs, baseRulesSha256=BASE_RULES,
        methods=method_rules, coldGlobals=cold_globals, buckets=buckets, constWords=words, constBytes=constants,
        imports=imports, inputDispatcherImports=input_imports, vtableSlots=vtable_slots,
        callInventory=call_inventory, className=class_name, sceneConstruction=scene, reusedSourceReceipts=reused,
        scope='Source-only extension admitted at construction of a fresh shared MemoryAdmin owner; no live native process image or complete campaign is claimed.')
    evidence = dict(schema='gothic3-scene-startup-evidence-v1', inputs=inputs, baseRulesSha256=BASE_RULES,
        sourceRoot='<LOCAL_DESKTOP_STUDY>', modules={name: {k: v for k, v in value.items() if k != 'methods'}
            for name, value in audits.items()}, methods=methods, coldGlobals=cold_globals, constWords=words,
        constBytes=constants, imports=imports, inputDispatcherImports=input_imports, vtableSlots=vtable_slots,
        className=class_name, sceneConstruction=scene,
        reusedSourceReceipts=reused, audit=audit_summary)
    OUT.mkdir(parents=True, exist_ok=True)
    outputs = {}
    for filename, value in [('runtime-rules.json', rules), ('native-evidence.json', evidence)]:
        raw = encode(value)
        (OUT / filename).write_bytes(raw)
        outputs[filename] = dict(path=filename, bytes=len(raw), sha256=sha(raw))
    manifest = dict(schema='gothic3-scene-startup-manifest-v1', inputs=inputs, baseRulesSha256=BASE_RULES,
                    outputs=outputs, audit=audit_summary)
    (OUT / 'manifest.json').write_bytes(encode(manifest))
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.study)))
