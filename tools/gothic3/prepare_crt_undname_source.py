"""Produce offline original-PE receipts for the Engine CRT demangler dependency.

Reconstructed C is explanatory. Original x86 operands and byte-checked assembly
are authoritative; this package executes no native code and captures no live
process state. Capturing a dependency does not implement that dependency.
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
OUT = ROOT / 'assets/gothic3/crt-undname'
ENGINE = 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'
SCENE_RULES = 'a226e0cf9479c4789a6966b7d9b6ef182858e24d0ebf1e97de6dba9340592670'

# The 61 catalog methods in the preceding read-only research checkpoint.
BASE_TARGETS = {
    'unDName': 0x3069b26b, 'unDNameCleanup': 0x3069b305,
    'ensureLock': 0x306832e3, 'mtInitLocks': 0x30683218,
    'mtDeleteLocks': 0x30683261, 'lock': 0x306833a6,
    'unlock': 0x306832b6, 'ensureLockCleanup': 0x3068339d,
    'mallocCrt': 0x3067c9c1, 'errno': 0x306783df,
    'initCritSecAndSpinCount': 0x30696484, 'initCritSecFallback': 0x30696474,
    'heapInit': 0x3068442b, 'heapSelect': 0x306843d0,
    'getOsPlatform': 0x3067d032, 'getWinMajor': 0x3067d0e1,
    'mtInit': 0x3067e2d9, 'crtAttach': 0x3067717c,
    'unDecoratorConstructor': 0x3069747a, 'unDecoratorToString': 0x3069afb8,
    'getDecoratedName': 0x3069a2f7, 'getDataType': 0x3069b876,
    'getDataIndirectType': 0x3069aad4, 'getPrimaryDataType': 0x3069b738,
    'getSimpleDataType': 0x3069b3b1, 'getECSUDataType': 0x306995dd,
    'getScopedName': 0x306994ea, 'getZName': 0x30699300,
    'dnameDelimitedConstructor': 0x30697709, 'dnameDoPchar': 0x3069760c,
    'heapGetMemory': 0x30696bf0, 'heapDestructor': 0x30696606,
    'replicatorConstructor': 0x306972b8, 'replicatorAppend': 0x306972d6,
    'replicatorLookup': 0x30696e2d, 'dnameCopyConstructor': 0x30696c93,
    'dnameAssign': 0x30696da9, 'dnameNodeConcat': 0x30696e63,
    'dnameIndirectNodeConstructor': 0x30696ec9,
    'dnamePointerConstructor': 0x30696ffb, 'dnameStatusConstructor': 0x30697051,
    'dnameStatusNodeConstructor': 0x30696ef8,
    'dnameIsValid': 0x306970b2, 'dnameIsEmpty': 0x306970c9,
    'dnameLength': 0x30697114, 'dnameGetString': 0x30697171,
    'dnameAssignStatus': 0x30697237, 'dnameCloneNode': 0x3069731d,
    'dnameTextNodeConstructor': 0x30697364, 'undStrncpy': 0x30696f3c,
    'dnameTextNodeGetString': 0x306973db,
    'dnameIndirectNodeLength': 0x3069740c,
    'dnameIndirectNodeGetString': 0x3069742a,
    'dnameConcatStatus': 0x3069752b, 'dnameAssignPointer': 0x306975a4,
    'dnameCharConstructor': 0x306976b2, 'dnameTextConstructor': 0x306976d8,
    'dnameConcat': 0x30697906, 'dnamePointerConcat': 0x30697968,
    'dnameAssignText': 0x30697a0f, 'dnamePlus': 0x30697b16,
}
# Additional selected consumers: CRT owner termination, actual allocator calls,
# and every virtual callback needed by the four physical DName node types.
EXTRA_TARGETS = {
    'heapTerm': 0x30684485, 'malloc': 0x30672ec7,
    'free': 0x30672f8a, 'freeCleanup': 0x30672fe0,
    'callNewHandler': 0x306824b9, 'osErrorToErrno': 0x306783a4,
    'encodePointer': 0x3067de64, 'decodePointer': 0x3067dedb,
    'pointerEncodingAvailability': 0x3067ddf8,
    'dnameLastChar': 0x30697139,
    'dnameCharNodeLength': 0x30696ea2, 'dnameCharNodeLastChar': 0x30696ea6,
    'dnameCharNodeGetString': 0x30696eaa,
    'dnameTextNodeLength': 0x30696ec5, 'dnameTextNodeLastChar': 0x306973c9,
    'dnameIndirectNodeLastChar': 0x3069741b,
    'dnameStatusNodeLength': 0x30696f1d, 'dnameStatusNodeLastChar': 0x30696f21,
    'dnameStatusNodeGetString': 0x30697447,
}
POST_FREE_RECOVERY = {
    0x3068336c: ('59', 'POP ECX'),
    0x3068336d: ('e86d50ffff', 'CALL 0x306783df'),
    0x30683372: ('c7000c000000', 'MOV dword ptr [EAX],0xc'),
    0x30683378: ('895de4', 'MOV dword ptr [EBP + -0x1c],EBX'),
    0x3068337b: ('eb0b', 'JMP 0x30683388'),
    0x30683387: ('59', 'POP ECX'),
    0x30683284: ('832600', 'AND dword ptr [ESI],0x0'),
    0x30683287: ('59', 'POP ECX'),
}
# Scope-table pointers, not a guessed control-flow continuation, identify these
# two otherwise uncataloged SEH entries. Their full extents are byte-pinned.
SECTION_SEH_RECOVERY = {
    0x3069650a: ('8b45ec', 'MOV EAX,dword ptr [EBP + -0x14]'),
    0x3069650d: ('8b00', 'MOV EAX,dword ptr [EAX]'),
    0x3069650f: ('8b00', 'MOV EAX,dword ptr [EAX]'),
    0x30696511: ('8945dc', 'MOV dword ptr [EBP + -0x24],EAX'),
    0x30696514: ('33c9', 'XOR ECX,ECX'),
    0x30696516: ('3d170000c0', 'CMP EAX,0xc0000017'),
    0x3069651b: ('0f94c1', 'SETZ CL'),
    0x3069651e: ('8bc1', 'MOV EAX,ECX'),
    0x30696520: ('c3', 'RET'),
    0x30696521: ('8b65e8', 'MOV ESP,dword ptr [EBP + -0x18]'),
    0x30696524: ('817ddc170000c0', 'CMP dword ptr [EBP + -0x24],0xc0000017'),
    0x3069652b: ('7508', 'JNZ 0x30696535'),
    0x3069652d: ('6a08', 'PUSH 0x8'),
    0x3069652f: ('ff150cc7af30', 'CALL dword ptr [0x30afc70c]'),
    0x30696535: ('8365e000', 'AND dword ptr [EBP + -0x20],0x0'),
}
COLD_STORAGE = {
    'crtHeapHandle': (0x30af76f4, 4),
    'crtOsFields': (0x30af70f8, 20),
    'crtHeapMode': (0x30af7e20, 4),
    'crtMallocRetry': (0x30af70f0, 4),
    'newMode': (0x30af76f8, 4),
    'crtLockTable': (0x30ad4aa0, 36 * 8),
    'crtStaticSections': (0x30af75a0, 14 * 24),
    'crtSectionInitializer': (0x30af7c50, 4),
    'demanglerGlobals': (0x30af7c54, 60),
    'crtTypeInfoList': (0x30af70ac, 8),
    'crtTlsIndexes': (0x30ad4840, 8),
}
CONSTANT_STORAGE = {
    'classKeyword': (0x3089f408, 7),
    'charNodeVtable': (0x3089f28c, 12),
    'indirectNodeVtable': (0x3089f29c, 12),
    'statusNodeVtable': (0x3089f2ac, 12),
    'textNodeVtable': (0x3089f2bc, 12),
    'truncatedNameText': (0x3089f2c8, 5),
    'sectionInitExceptionTable': (0x30956ea0, 28),
    'sceneTypeInfoDescriptor': (0x30aa3050, 27),
}
STRING_CONSTANTS = {
    'kernel32Module': 0x3089eb80,
    'initializeCriticalSectionAndSpinCountName': 0x3089eb58,
    'templateParameterPrefix': 0x3089f3d4,
    'genericTypePrefix': 0x3089f3c4,
    'pointerKernel32Module': 0x3089377c,
    'encodePointerName': 0x3089376c,
    'decodePointerName': 0x3089378c,
    'mixedCrtSectionName': 0x30893764,
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def encode(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf8')


def instruction(pe: native.PE, address: int, raw: str, text: str) -> dict:
    data = bytes.fromhex(raw)
    require(pe.bytes(address, len(data)) == data, f'Recovered PE bytes differ at {address:08x}')
    return dict(va=f'{address:08x}', rva=f'{address-pe.base:x}', fileOffset=pe.offset(address, len(data)),
                bytes=raw, instruction=text, originalPERecovered=True, sourceASMGap=True)


def verify_extents(pe: native.PE, method: dict) -> None:
    for begin, finish in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})', method['bodyRanges']):
        start, end = int(begin, 16), int(finish, 16)
        cursor = start
        for row in method['instructions']:
            address = int(row['va'], 16)
            if start <= address <= end:
                raw = bytes.fromhex(row['bytes'])
                require(address == cursor and pe.bytes(address, len(raw)) == raw,
                        f'Instruction coverage differs: {method["label"]} {cursor:08x}')
                cursor += len(raw)
        require(cursor == end + 1, 'Body extent differs: ' + method['label'])
    for link in method['entryChain']:
        data = bytes.fromhex(link['bytes'])
        address = int(link['va'], 16)
        require(pe.bytes(address, len(data)) == data and data[0] == 0xe9 and
                address + 5 + struct.unpack('<i', data[1:])[0] == int(link['targetVA'], 16),
                'Original entry alias differs: ' + method['label'])


def emit_refs(study: Path, method: dict) -> dict:
    directory = OUT / 'sources/Engine'
    directory.mkdir(parents=True, exist_ok=True)
    address = method['bodyVA'][2:]
    path = directory / (address + '.asm.txt')
    path.write_text('\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction']
                             for row in method['instructions']) + '\n', encoding='utf8', newline='\n')
    refs = dict(assemblyExcerpt=path.relative_to(OUT).as_posix(), assemblyExcerptSha256=sha(path.read_bytes()))
    if 'reconstructedC' in method:
        path = directory / (address + '.c.txt')
        path.write_text(source_excerpt(study, method), encoding='utf8', newline='\n')
        refs.update(cExcerpt=path.relative_to(OUT).as_posix(), cExcerptSha256=sha(path.read_bytes()),
                    reconstructedC=method['reconstructedC'])
    return refs


def storage(pe: native.PE, address: int, size: int) -> dict:
    raw, section = image_bytes(pe, address, size)
    return dict(module='Engine', address=f'{address:08x}', bytes=size, raw=raw.hex(), knownMask='ff' * size,
                sha256=sha(raw), section=section, allZero=not any(raw),
                scope='cold-original-image', liveValueCaptured=False)


def make_rule(method: dict) -> dict:
    raw = b''.join(bytes.fromhex(row['bytes']) for row in method['instructions'])
    method.update(module='Engine', instructionCount=len(method['instructions']), bodyByteCount=len(raw),
                  bodyInstructionBytesSha256=sha(raw))
    result = dict(module='Engine', entry=method['entryVA'][2:], body=method['bodyVA'][2:],
                  bodyRanges=method['bodyRanges'], instructionCount=len(method['instructions']), bodyBytes=len(raw),
                  bodyInstructionBytesSha256=sha(raw), sourceRefs=method['sourceRefs'])
    for key in ['entryChain', 'originalCatalogBodyRanges', 'sourceASMGap', 'sourceCGap',
                'sourceCUntrustedNoReturnAnnotation', 'recovery', 'entryRaw', 'entryRawSha256']:
        if key in method:
            result[key] = method[key]
    return result


def layouts() -> dict:
    return dict(
        crtHeap=dict(handleAddress='30af76f4', selectorAddress='30af7e20', retryAddress='30af70f0',
            processAttachArgument=1, createFlags=0, initialBytes=4096, maximumBytes=0,
            selectedHeapMode=1, selectedOsPlatform=2, selectedMinimumWinMajor=5,
            scope='The NT branch requires actual admitted OS fields and a retained HeapCreate capability.'),
        crtOsFields=dict(storage='crtOsFields', bytes=20, offsets=dict(platform=0, build=4,
            packedMajorMinor=8, major=12, minor=16)),
        crtLocks=dict(tableStorage='crtLockTable', staticStorage='crtStaticSections', recordBytes=8,
            records=36, offsets=dict(sectionPointer=0, staticFlag=4), sectionBytes=24,
            staticSections=14, spinCount=4000, demanglerLock=5, creationLock=10, typeInfoLock=14),
        pointerEncoding=dict(tlsIndexStorage='crtTlsIndexes', bytes=8,
            offsets=dict(flsIndex=0, tlsIndex=4), coldIndex=0xffffffff,
            threadDataBytes=0x214, threadEncodePointerOffset=0x1f8, threadDecodePointerOffset=0x1fc,
            initializerCacheStorage='crtSectionInitializer', noSectionScanMinimumMajor=6),
        demanglerGlobals=dict(storage='demanglerGlobals', bytes=60,
            offsets=dict(allocator=0, free=4, firstBlock=8, tailBlock=12, remaining=16,
                         firstReplicator=20, secondReplicator=24, reserved=28,
                         cursor=32, originalInput=36, output=40, outputCapacity=44,
                         flags=48, parameterFunction=52, specialStateByte=56)),
        heapManager=dict(globalAddress='30af7c54', bytes=20, offsets=dict(allocator=0, free=4,
            firstBlock=8, tailBlock=12, remaining=16), alignment=8, scratchRequestBytes=4100,
            scratchAllocationBytes=4104, headerBytes=4, payloadBytes=4096,
            maximumArenaRequestBytes=4096, zeroArenaRequestBytes=8,
            directZeroRequestBytes=0, order='Downward allocation from tail+4+remaining; linked block order is retained.'),
        dname=dict(bytes=8, offsets=dict(head=0, status=4), statusMask=15,
            flagMask=0xff0, status=dict(valid=0, invalid=1, truncated=2, error=3),
            validStatuses=[0, 2], copyFlagMask=0xff0, assignFlagMask=0x8f0,
            allocationPaddingKnown=False),
        replicator=dict(bytes=60, offsets=dict(count=0, records=4, errorName=44, invalidName=52),
            maximumRecords=10, initialCount=-1, recordBytes=8,
            invalidNameStatus=1, errorNameStatus=3),
        nodes=dict(common=dict(vtableOffset=0, nextOffset=4),
            char=dict(bytes=12, alignedBytes=16, vtable='3089f28c', characterOffset=8),
            text=dict(bytes=16, alignedBytes=16, vtable='3089f2bc', pointerOffset=8, lengthOffset=12),
            indirect=dict(bytes=12, alignedBytes=16, vtable='3089f29c', dnamePointerOffset=8),
            status=dict(bytes=16, alignedBytes=16, vtable='3089f2ac', statusOffset=8, lengthOffset=12)),
    )


def prepare(study: Path) -> dict:
    pe = native.PE((study / '00_Original_Runtime/Engine.dll').read_bytes())
    require(sha(pe.data) == ENGINE, 'Original Engine input differs')
    scene_path = ROOT / 'assets/gothic3/scene-startup/runtime-rules.json'
    scene_raw = scene_path.read_bytes()
    require(sha(scene_raw) == SCENE_RULES, 'Frozen SceneAdmin rules differ')
    native.EXPECTED_INPUTS['Engine.dll'] = ENGINE
    targets = BASE_TARGETS | EXTRA_TARGETS
    require(len(BASE_TARGETS) == 61 and len(set(targets.values())) == len(targets), 'Catalog selection differs')
    audit = native.audit_module(study, 'Engine_dll', 'Engine.dll', {a: label for label, a in targets.items()})
    methods = audit['methods']
    by_label = {method['label']: method for method in methods}
    baseline_rows = {row['va']: row for label in BASE_TARGETS for row in by_label[label]['instructions']}
    require(len(baseline_rows) == 3256, 'Original baseline instruction selection differs')
    for label, extent in [('ensureLock', '306832e3-3068339c'), ('mtDeleteLocks', '30683261-306832b5')]:
        method = by_label[label]
        method['originalCatalogBodyRanges'] = method['bodyRanges']
        method['bodyRanges'] = extent
        start, end = (int(value, 16) for value in extent.split('-'))
        method['instructions'].extend(instruction(pe, a, raw, text)
            for a, (raw, text) in POST_FREE_RECOVERY.items() if start <= a <= end)
        method['instructions'].sort(key=lambda row: row['va'])
        method.update(sourceASMGap=True, sourceCUntrustedNoReturnAnnotation=True,
            recovery='Original PE continuation omitted after reconstructed noreturn _free annotation.')
    for label, start, end in [('initCritSecExceptionFilter', 0x3069650a, 0x30696520),
                              ('initCritSecExceptionHandler', 0x30696521, 0x30696538)]:
        methods.append(dict(label=label, entryVA=f'0x{start:08x}', bodyVA=f'0x{start:08x}',
            entryChain=[], bodyRanges=f'{start:08x}-{end:08x}', sourceCGap=True, sourceASMGap=True,
            recovery='Original PE SEH entry, selected by scope table30956ea0, omitted from source catalog/ASM.',
            instructions=[instruction(pe, a, raw, text) for a, (raw, text) in SECTION_SEH_RECOVERY.items()
                          if start <= a <= end]))
    rules_methods = {}
    for method in methods:
        verify_extents(pe, method)
        entry_raw = pe.bytes(int(method['entryVA'], 16), 5)
        method.update(entryRaw=entry_raw.hex(), entryRawSha256=sha(entry_raw))
        method['sourceRefs'] = emit_refs(study, method)
        rules_methods[method['label']] = make_rule(method)

    cold = {label: storage(pe, address, size) for label, (address, size) in COLD_STORAGE.items()}
    require(all(value['allZero'] for label, value in cold.items() if label not in ['crtLockTable', 'crtTlsIndexes']),
            'Original selected cold-zero storage differs')
    require(cold['crtTlsIndexes']['raw'] == 'ffffffffffffffff', 'Original cold TLS indexes differ')
    table = bytes.fromhex(cold['crtLockTable']['raw'])
    lock_records = []
    static_index = 0
    for index in range(36):
        pointer, flag = struct.unpack_from('<II', table, index * 8)
        require(pointer == 0 and flag in (0, 1), 'Original lock-table cold record differs')
        record = dict(index=index, address=f'{0x30ad4aa0+index*8:08x}', pointer=pointer,
                      staticFlag=flag, raw=table[index*8:index*8+8].hex())
        if flag == 1:
            record.update(staticSectionIndex=static_index, staticSectionAddress=f'{0x30af75a0+static_index*24:08x}')
            static_index += 1
        lock_records.append(record)
    require(static_index == 14 and lock_records[5]['staticFlag'] == 0 and
            lock_records[10]['staticSectionAddress'] == '30af7648' and
            lock_records[14]['staticSectionAddress'] == '30af7690', 'Selected static lock mapping differs')
    constants = {label: storage(pe, address, size) for label, (address, size) in CONSTANT_STORAGE.items()}
    for label, address in STRING_CONSTANTS.items():
        value = pe.string(address)
        constants[label] = storage(pe, address, len(value) + 1) | dict(ascii=value)
    require(constants['classKeyword']['raw'] == '636c6173732000', 'Class keyword differs')
    require(constants['truncatedNameText']['raw'] == '203f3f2000', 'Truncated DName text differs')
    require(constants['sectionInitExceptionTable']['raw'][-16:] == '0a65693021656930', 'SEH entries differ')
    descriptor = constants['sceneTypeInfoDescriptor']
    require(descriptor['raw'] == 'bc2a8930000000002e3f415665435363656e6541646d696e404000', 'Scene RTTI descriptor differs')
    descriptor.update(mangledName='.?AVeCSceneAdmin@@', nameOffset=8, demanglerInputOffset=9,
                      cachedNamePointerOffset=4)
    for record in list(cold.values()) + list(constants.values()):
        begin, size = int(record['address'], 16), record['bytes']
        record['operandReferences'] = [dict(method=method['label'], va=row['va'], bytes=row['bytes'],
                                           instruction=row['instruction'])
            for method in methods for row in method['instructions']
            if any(begin <= int(value, 16) < begin + size
                   for value in re.findall(r'0x([0-9a-f]{8})', row['instruction']))]
    callbacks = {
        'charNodeVtable': ['dnameCharNodeLength', 'dnameCharNodeLastChar', 'dnameCharNodeGetString'],
        'indirectNodeVtable': ['dnameIndirectNodeLength', 'dnameIndirectNodeLastChar', 'dnameIndirectNodeGetString'],
        'statusNodeVtable': ['dnameStatusNodeLength', 'dnameStatusNodeLastChar', 'dnameStatusNodeGetString'],
        'textNodeVtable': ['dnameTextNodeLength', 'dnameTextNodeLastChar', 'dnameTextNodeGetString'],
    }
    for label, method_labels in callbacks.items():
        values = struct.unpack('<III', bytes.fromhex(constants[label]['raw']))
        require([f'{value:08x}' for value in values] == [rules_methods[name]['entry'] for name in method_labels],
                'Node vtable callbacks differ: ' + label)
        constants[label].update(values=[f'{value:08x}' for value in values], methods=method_labels)

    used = {f'0x{value}' for method in methods for row in method['instructions']
            for value in re.findall(r'\[0x([0-9a-f]{8})\]', row['instruction'])}
    imports = [dict(item, originalIatRaw=pe.bytes(int(item['iatVA'], 16), 4).hex(),
                    originalIatSha256=sha(pe.bytes(int(item['iatVA'], 16), 4)),
                    scope='original-unbound-import-thunk') for item in pe.imports() if item['iatVA'] in used]
    import_by_va = {item['iatVA'][2:]: item for item in imports}
    entry_methods = {method['entry']: label for label, method in rules_methods.items()}
    calls = {}
    for method in methods:
        rows = []
        for row in method['instructions']:
            text = row['instruction']
            if not (text.startswith('CALL ') or text.startswith('JMP dword ptr ') or
                    re.fullmatch(r'JMP 0x[0-9a-f]{8}', text)):
                continue
            item = dict(va=row['va'], bytes=row['bytes'], instruction=text)
            target = re.fullmatch(r'(?:CALL|JMP) 0x([0-9a-f]{8})', text)
            indirect = re.fullmatch(r'(?:CALL|JMP) dword ptr \[0x([0-9a-f]{8})\]', text)
            if target:
                address = target[1]
                if text.startswith('JMP ') and any(int(begin, 16) <= int(address, 16) <= int(end, 16)
                    for begin, end in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})', method['bodyRanges'])):
                    continue
                item['target'] = address
                if address in entry_methods:
                    item['method'] = entry_methods[address]
                else:
                    item['receiptOwned'] = False
            elif indirect and indirect[1] in import_by_va:
                item['importIat'] = indirect[1]
            else:
                item['runtimeCapabilityRequired'] = True
            rows.append(item)
        calls[method['label']] = rows
    physical_layouts = layouts()
    physical_layouts['crtLocks']['recordsCold'] = lock_records
    requests = [('replicator1.error', 16), ('replicator1.invalid', 16),
                ('replicator2.error', 16), ('replicator2.invalid', 16),
                ('class.node', 16), ('class.payload', 6), ('identifier.node', 16),
                ('identifier.payload', 12), ('replicator2.record', 8),
                ('clone.node', 12), ('clone.dname', 8)]
    remaining = 4096
    allocations = []
    for label, request in requests:
        rounded = (request + 7) & ~7
        remaining -= rounded
        allocations.append(dict(label=label, requestBytes=request, alignedBytes=rounded,
                                offset=4+remaining, remaining=remaining))
    require(remaining == 3944, 'Selected graph allocation sequence differs')
    selected = dict(descriptorStorage='sceneTypeInfoDescriptor', inputOffset=9, flags=0x2800,
        inputBytes=bytes.fromhex(descriptor['raw'])[9:].hex(), outputBytes=b'class eCSceneAdmin\0'.hex(),
        outputLength=18, outputAllocationBytes=24, outputCapacity=19,
        keywordStorage='classKeyword', recordIdentifier=True, selectedReplicatorOffset=60,
        scratchBytesConsumed=152, scratchAllocations=allocations,
        order=['require admitted initialized CRT heap', 'ensureLock5', 'lock5',
               'install allocator/free and clear arena links/remaining', 'construct two Replicators',
               'install UnDecorator global pointers/flags', 'parse data type and qualification A',
               'parse class V and identifier bytes', 'record identifier in Replicator2',
               'clone/concatenate the DName graph', 'allocate independent CRT output',
               'copy graph bytes and terminating NUL', 'normalize ASCII spaces',
               'free scratch blocks', 'unlock5'],
        scope='Selected output and arena sequence are source-grammar deductions, not executed native observations or a production constant demangler.')
    prior = dict(sceneStartup=dict(path='../scene-startup/runtime-rules.json', bytes=len(scene_raw), sha256=sha(scene_raw),
        sharedStorage=['crtTypeInfoList', 'sceneTypeInfoDescriptor']))
    summary = dict(catalogMethodCount=len(targets), baselineCatalogMethodCount=len(BASE_TARGETS),
        baselineUniqueInstructionCount=len(baseline_rows), extraCatalogMethodCount=len(EXTRA_TARGETS),
        methodCount=len(methods), instructionCount=sum(len(m['instructions']) for m in methods),
        uniqueInstructionCount=len({row['va'] for method in methods for row in method['instructions']}),
        recoveredPostFreeInstructionCount=len(POST_FREE_RECOVERY),
        recoveredSEHInstructionCount=len(SECTION_SEH_RECOVERY),
        byteMismatchCount=0, nativeCodeExecuted=False)
    inputs = dict(Engine=ENGINE)
    rules = dict(schema='gothic3-crt-undname-rules-v1', inputs=inputs, methods=rules_methods,
        coldGlobals=cold, constBytes=constants, imports=dict(Engine=imports), callInventory=calls,
        layouts=physical_layouts, selectedPlainClass=selected, priorSourceReceipts=prior,
        scope='Offline cold image and instruction receipts; ownership of OS services, native helpers, and startup remains explicit.')
    evidence = dict(schema='gothic3-crt-undname-evidence-v1', inputs=inputs, sourceRoot='<LOCAL_DESKTOP_STUDY>',
        modules=dict(Engine={key: value for key, value in audit.items() if key != 'methods'}),
        methods=methods, coldGlobals=cold, constBytes=constants, imports=dict(Engine=imports),
        layouts=physical_layouts, selectedPlainClass=selected, priorSourceReceipts=prior, audit=summary)
    OUT.mkdir(parents=True, exist_ok=True)
    outputs = {}
    for filename, value in [('runtime-rules.json', rules), ('native-evidence.json', evidence)]:
        data = encode(value)
        (OUT / filename).write_bytes(data)
        outputs[filename] = dict(path=filename, bytes=len(data), sha256=sha(data))
    manifest = dict(schema='gothic3-crt-undname-manifest-v1', inputs=inputs, outputs=outputs, audit=summary)
    (OUT / 'manifest.json').write_bytes(encode(manifest))
    readme = f'''# Engine CRT demangler source receipts

This is an offline package from the original installed Engine.dll, SHA-256
`{ENGINE}`. It executes no native code and captures no live process state.
The reconstructed C is explanatory. Original x86 instruction operands and the
byte-checked assembly govern the receipt and its physical layouts.

## Reproduce

From the repository root, run:

```powershell
python -B tools/gothic3/prepare_crt_undname_source.py --study '<LOCAL_DESKTOP_STUDY>'
```

The study must contain `00_Original_Runtime/Engine.dll` and the exported
`01_Decompiled_Code/Engine_dll` function catalog, assembly, and pseudocode.
The producer also verifies the frozen SceneAdmin rules before writing this
separate package. It never modifies the earlier packages.

## Contents

- `{summary['catalogMethodCount']}` catalog methods and two recovered SEH entry receipts.
- `{summary['uniqueInstructionCount']}` unique PE-checked instructions, including eight recovered
  post-free instructions and fifteen uncataloged SEH instructions.
- Exact cold storage for the CRT heap, OS fields, allocation policy, 36-record
  lock table, fourteen static sections, type-info list, and demangler globals.
- Four node vtables, keyword/prefix literals, call/import bindings, physical
  field layouts, source excerpt hashes, and a selected plain class parse trace.

`runtime-rules.json` uses `gothic3-crt-undname-rules-v1`.
`native-evidence.json` retains individual instructions and original source
references. `manifest.json` pins the generated rule/evidence hashes.

## Physical scope

The lock table starts with NULL pointer slots and preserves the nonzero static
flags. The CRT heap handle starts NULL. Startup must retain an actual admitted
heap capability and initialize its section capabilities before demangling.

The selected RTTI input is descriptor offset 9, `?AVeCSceneAdmin@@`, with flags
0x2800. Its source grammar constructs `class eCSceneAdmin`: the identifier is
read from input bytes, recorded in the second Replicator, and concatenated in a
physical DName graph. The normal graph consumes 152 arena bytes in one 4,104-byte
CRT backing. Output is a separate 24-byte CRT allocation. The arena is freed
before lock 5 is released; the output is retained for the caller.

This selected trace is a source deduction. It is not a constant production
demangler, an executed-game observation, a complete CRT loader, or evidence of
owned generic template/function parsing. OS services, pointer encoding, errno,
new handlers, unsupported heap modes and unimplemented grammar branches remain
explicit runtime boundaries until their source owners are implemented.

All C excerpts preserve their original study spelling, including erroneous
noreturn annotations. The producer restores omitted continuations directly
from PE bytes and records that recovery in the method receipts.
'''
    (OUT / 'README.md').write_text(readme, encoding='utf8', newline='\n')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    arguments = parser.parse_args()
    print(json.dumps(prepare(arguments.study)))
