"""Audit selected NPC/name and Navigation CString heap prerequisites.

The package extends only a fresh MemoryAdmin owner. Original PE operands and
dispatch entries are authoritative; decompiler C excerpts are explanatory.
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
OUT = ROOT / 'assets/gothic3/npc-heap'
SHARED = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'
ENGINE = 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'
BASE_RULES = '4c95912d7c7087af7a4c6c1c1d9f31d1b69e23da9456e5022c7d64f8756be016'
TARGETS = {
    'heap32BitmapAlloc': 0x10002261, 'heap32BlockInitialize': 0x10002298,
    'heap20BitmapAlloc': 0x10008427, 'heap20BlockInitialize': 0x10003396,
    'heap40BitmapAlloc': 0x10002770, 'heap40BlockInitialize': 0x10002b76,
    'heap20InlineFree': 0x10002ae0, 'heap40InlineFree': 0x10008053,
    'propertyIdHash': 0x1000385a, 'propertyIdConstructor': 0x1000277a,
    'propertyIdAssign': 0x10001f05, 'propertyIdEquals': 0x1000873d,
    'propertyIdDestructor': 0x10007dab,
    'sceneSectionConstructor': 0x1000785b, 'sceneSectionAcquire': 0x10003d41,
    'sceneSectionRelease': 0x100076a3,
    'cstringDefaultConstructor': 0x1000779d, 'cstringTextConstructor': 0x10003ba7,
    'cstringAssign': 0x10004638, 'cstringSetShared': 0x10006550,
    'cstringSetText': 0x10005fec, 'cstringAlloc': 0x10007d65,
    'cstringRealloc': 0x10001f5a, 'cstringRelease': 0x10008431,
    'cstringStaticRelease': 0x10002009, 'cstringDestructor': 0x100060c3,
    'cstringIsEmpty': 0x10002f5e, 'cstringHash': 0x10002c7a,
    'cstringClear': 0x10003d28, 'memoryMalloc': 0x10003cd8,
    'cstringGetText': 0x1000708b, 'arraySortDefaultCompare': 0x10003553,
}
ASM = {
    'heap32PoolDispatch': (0x10008152, [(0x10048190, 0x100481b9), (0x100481c0, 0x1004820f)]),
    'heap32Free': (0x1000139d, [(0x10044400, 0x1004443d)]),
    'heap32Realloc': (0x10007086, [(0x10044450, 0x100444c0)]),
    'heap32DeleteObject': (0x1000345e, [(0x100401b0, 0x100401e9),
        (0x100401f0, 0x1004024c), (0x10040250, 0x10040283)]),
    'heap32InlineFree': (0x10004c4b, [(0x100402c0, 0x10040307)]),
    'heap20PoolDispatch': (0x10002aa9, [(0x10047fb0, 0x10047fd9), (0x10047fe0, 0x1004802f)]),
    'heap40PoolDispatch': (0x100031d4, [(0x10048230, 0x10048259), (0x10048260, 0x100482af)]),
    'heap20Free': (0x100023ce, [(0x100441a0, 0x100441e4)]),
    'heap20Realloc': (0x1000248c, [(0x10044200, 0x10044250)]),
    'heap40Free': (0x10005768, [(0x100444e0, 0x10044524)]),
    'heap40Realloc': (0x10006c49, [(0x10044540, 0x10044583)]),
}
BUCKETS = {
    '32': dict(stride=32, minimumRequest=29, maximumRequest=32,
        regionBytes=0x100000, capacity=0x7f80, bitmapOffset=0xff010,
        bitmapBytes=0xff0, lastBitmapMask=0xffffffff, payloadBytes=0xff000,
        globals=dict(count='102ffd88', list='102ffd8c', peak='102ffd90', descriptor='102fff00'),
        callbacks=['1000139d', '10007086', '1000345e', '10004c4b']),
    '20': dict(stride=20, minimumRequest=17, maximumRequest=20,
        regionBytes=0x142000, capacity=0xffff, bitmapOffset=0x13fffc,
        bitmapBytes=0x2000, lastBitmapMask=0x7fffffff, payloadBytes=0x13ffec,
        globals=dict(count='102ffd64', list='102ffd68', peak='102ffd6c', descriptor='102ffef4'),
        callbacks=['100023ce', '1000248c', '10005939', '10005551']),
    '40': dict(stride=40, minimumRequest=33, maximumRequest=40,
        regionBytes=0x280000, capacity=0xff33, bitmapOffset=0x27e008,
        bitmapBytes=0x1fe8, lastBitmapMask=0x7ffff, payloadBytes=0x27dff8,
        globals=dict(count='102ffd94', list='102ffd98', peak='102ffd9c', descriptor='102fff04'),
        callbacks=['10005768', '10006c49', '10006203', '10001357']),
}
COLD = {
    'heap32PoolGlobals': (0x102ffd88, 12), 'heap32DescriptorSlot': (0x102fff00, 4),
    'heap20PoolGlobals': (0x102ffd64, 12), 'heap20DescriptorSlot': (0x102ffef4, 4),
    'heap40PoolGlobals': (0x102ffd94, 12), 'heap40DescriptorSlot': (0x102fff04, 4),
    # Extended selected record prefix, not a claim about the native table maximum.
    'heapPointerAreasSelected': (0x10149a18, 12 * 16),
}
REUSED_ENGINE = ['sceneRegisterEntity', 'sceneUnregisterEntity',
    'registeredMapConstructor', 'registeredMapGrow', 'registeredMapLookup',
    'registeredMapSlot', 'registeredMapErase', 'registeredMapDeleteEntry',
    'entitySetName', 'sceneRegisterNameInfo', 'nameMapConstructor', 'nameMapGrow',
    'nameMapLookup', 'nameMapSlot', 'namePointerArrayGrow', 'namePointerArrayAssign',
    'nameTemporaryArrayDelete', 'sceneConstructorCallInventory']


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def encode(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf8')


def emit_refs(study: Path, method: dict) -> dict:
    folder = OUT / 'sources/SharedBase'
    folder.mkdir(parents=True, exist_ok=True)
    address = method['bodyVA'][2:]
    path = folder / (address + '.asm.txt')
    path.write_text('\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction']
                             for row in method['instructions']) + '\n', encoding='utf8', newline='\n')
    refs = {'assemblyExcerpt': path.relative_to(OUT).as_posix(), 'assemblyExcerptSha256': sha(path.read_bytes())}
    if 'reconstructedC' in method:
        path = folder / (address + '.c.txt')
        path.write_text(source_excerpt(study, method), encoding='utf8', newline='\n')
        refs.update(cExcerpt=path.relative_to(OUT).as_posix(), cExcerptSha256=sha(path.read_bytes()), reconstructedC=method['reconstructedC'])
    return refs


def cold(pe: native.PE, address: int, size: int, module: str) -> dict:
    raw, section = image_bytes(pe, address, size)
    require(raw == b'\0' * size, f'Cold original range differs: {address:08x}')
    return dict(address=f'{address:08x}', bytes=size, raw=raw.hex(), knownMask='ff' * size,
                sha256=sha(raw), scope='cold-original-image', liveValueCaptured=False,
                module=module, section=section)


def prepare(study: Path) -> dict:
    base_path = ROOT / 'assets/gothic3/runtime-admin/runtime-rules.json'
    base_raw = base_path.read_bytes()
    require(sha(base_raw) == BASE_RULES, 'Frozen base allocator receipt changed')
    binary = (study / '00_Original_Runtime/SharedBase.dll').read_bytes()
    engine_binary = (study / '00_Original_Runtime/Engine.dll').read_bytes()
    require(sha(binary) == SHARED and sha(engine_binary) == ENGINE, 'Original runtime input changed')
    pe, engine_pe = native.PE(binary), native.PE(engine_binary)
    native.EXPECTED_INPUTS['SharedBase.dll'] = SHARED
    audit = native.audit_module(study, 'SharedBase_dll', 'SharedBase.dll', {address: label for label, address in TARGETS.items()})
    parsed = []
    assembly = (study / '01_Decompiled_Code/SharedBase_dll/full_disassembly.asm').read_text(encoding='utf8').splitlines()
    for line, text in enumerate(assembly, 1):
        match = re.fullmatch(r'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', text)
        if match:
            parsed.append((int(match[1], 16), match[2], match[3], line))
    methods = audit['methods']
    for label, (entry, ranges) in ASM.items():
        first = ranges[0][0]
        alias = pe.bytes(entry, 5)
        require(alias[0] == 0xe9 and entry + 5 + struct.unpack('<i', alias[1:])[0] == first, 'Alias target differs: ' + label)
        instructions = []
        for start, end in ranges:
            cursor = start
            for address, raw, instruction, line in parsed:
                if start <= address <= end:
                    decoded = bytes.fromhex(raw)
                    require(address == cursor and pe.bytes(address, len(decoded)) == decoded, 'ASM/PE coverage differs: ' + label)
                    instructions.append(dict(va=f'{address:08x}', bytes=raw, instruction=instruction, assemblyLine=line,
                        rva=f'{address-pe.base:x}', fileOffset=pe.offset(address, len(decoded))))
                    cursor += len(decoded)
            require(cursor == end + 1, 'ASM body extent differs: ' + label)
        methods.append(dict(label=label, entryVA=f'0x{entry:08x}', bodyVA=f'0x{first:08x}',
            entryChain=[dict(va=f'{entry:08x}', bytes=alias.hex(), targetVA=f'{first:08x}')],
            bodyRanges=';'.join(f'{start:08x}-{end:08x}' for start, end in ranges),
            instructions=instructions, sourceCGap=True, sourceASMGap=False))
    method_rules = {}
    for method in methods:
        body = b''.join(bytes.fromhex(row['bytes']) for row in method['instructions'])
        method.update(instructionCount=len(method['instructions']), bodyByteCount=len(body), bodyInstructionBytesSha256=sha(body), sourceRefs=emit_refs(study, method))
        method_rules[method['label']] = dict(module='SharedBase', entry=method['entryVA'][2:], body=method['bodyVA'][2:],
            bodyRanges=method['bodyRanges'], bodyInstructionBytesSha256=sha(body), instructionCount=len(method['instructions']),
            bodyBytes=len(body), sourceRefs=method['sourceRefs'])
    base = json.loads(base_raw)
    table = base['pointerTables']['heapDispatchTable']
    table_raw = pe.bytes(0x102fb050, 4097 * 4)
    require(sha(table_raw) == table['sha256'] and table_raw.hex() == table['raw'], 'Frozen original dispatch table no longer matches PE')
    buckets, constants = {}, {}
    for name, values in BUCKETS.items():
        labels = ['heap' + name + suffix for suffix in ['PoolDispatch', 'BlockInitialize', 'BitmapAlloc', 'Free', 'Realloc', 'InlineFree']]
        refs = {label: method_rules[label] for label in labels}
        code_rows = [row for method in methods if method['label'] in labels[:3] for row in method['instructions']]
        code = b''.join(bytes.fromhex(row['bytes']) for row in code_rows)
        dispatch = method_rules[labels[0]]['entry']
        for request in range(values['minimumRequest'], values['maximumRequest'] + 1):
            require(table['values'][request] == dispatch, 'Exact dispatch range differs')
        require(table['values'][values['minimumRequest'] - 1] != dispatch and table['values'][values['maximumRequest'] + 1] != dispatch, 'Dispatch boundary differs')
        proofs = {}
        for field in ['regionBytes', 'bitmapOffset', 'bitmapBytes', 'lastBitmapMask', 'payloadBytes']:
            if name == '32' and field == 'lastBitmapMask':
                require(values['bitmapBytes'] * 8 == values['capacity'] and values[field] == 0xffffffff,
                        'Heap32 bitmap does not end on a complete all-ones word')
                proofs[field] = [dict(derived='All bitmap bytes are initialized to 0xff; 0xff0*8 equals the 0x7f80 slots, so the final 32-bit bitmap word is unmasked.',
                    bitmapBytes=values['bitmapBytes'], capacity=values['capacity'], codeRanges=['10046160-10046214', '1003e350-1003e3d6'])]
                continue
            operand = struct.pack('<I', values[field]).hex()
            rows = [row for row in code_rows if operand in row['bytes']]
            require(rows, 'Native pool operand absent: ' + name + ':' + field)
            proofs[field] = [dict(va=row['va'], bytes=row['bytes'], instruction=row['instruction']) for row in rows]
        for callback in values['callbacks']:
            require(struct.pack('<I', int(callback, 16)) in code, 'Native descriptor callback operand differs')
        word_address = {'20': 0x100e7ab0, '32': 0x100e7ac8, '40': 0x100e7ad0}[name]
        for suffix, address, value in [('Stride', word_address, values['stride']), ('Capacity', word_address + 4, values['capacity'])]:
            raw = pe.bytes(address, 4)
            require(struct.unpack('<I', raw)[0] == value, 'Native pool static DWORD differs')
            constants['heap' + name + suffix] = dict(address=f'{address:08x}', raw=raw.hex(), value=value, sha256=sha(raw))
        buckets[name] = dict(values, sourceRefs=refs, operandProofs=proofs,
            strideReceipt='heap' + name + 'Stride', capacityReceipt='heap' + name + 'Capacity',
            dispatchTableReceipt='../runtime-admin/runtime-rules.json#pointerTables.heapDispatchTable')
    cold_globals = {label: cold(pe, address, size, 'SharedBase') for label, (address, size) in COLD.items()}
    cold_globals['sceneTableCriticalSection'] = cold(engine_pe, 0x30af24f4, 24, 'Engine')
    prior_path = ROOT / 'assets/gothic3/runtime-admin/prior-startup-allocations.json'
    prior_raw = prior_path.read_bytes()
    prior = json.loads(prior_raw)
    require(prior['inputs']['SharedBase'] == SHARED and prior['inputs']['Engine'] == ENGINE, 'Frozen map/name inventory inputs differ')
    for method in prior['modules']['Engine']['methods']:
        label = method['label']
        if label not in REUSED_ENGINE:
            continue
        refs = dict(method['sourceRefs'])
        for key in ['assemblyExcerpt', 'cExcerpt']:
            if key in refs:
                refs[key] = '../runtime-admin/' + refs[key]
        method_rules[label] = dict(module='Engine', entry=method['entryVA'][2:], body=method['bodyVA'][2:],
            bodyRanges=method['bodyRanges'], bodyInstructionBytesSha256=method['bodyInstructionBytesSha256'],
            instructionCount=method['instructionCount'], bodyBytes=method['bodyByteCount'], sourceRefs=refs,
            reusedReceipt='../runtime-admin/prior-startup-allocations.json')
    require(all(label in method_rules for label in REUSED_ENGINE), 'Frozen reused method label absent')
    native.EXPECTED_INPUTS['Engine.dll'] = ENGINE
    engine_audit = native.audit_module(study, 'Engine_dll', 'Engine.dll', {
        0x30020356: 'sceneGetEntity', 0x304cfb90: 'registeredMapConstLookup'})
    for method in engine_audit['methods']:
        body = b''.join(bytes.fromhex(row['bytes']) for row in method['instructions'])
        # Keep these two newly required Engine bodies bounded and independent
        # of the immutable earlier inventory.
        folder = OUT / 'sources/Engine'
        folder.mkdir(parents=True, exist_ok=True)
        address = method['bodyVA'][2:]
        path = folder / (address + '.asm.txt')
        path.write_text('\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction'] for row in method['instructions']) + '\n', encoding='utf8', newline='\n')
        refs = dict(assemblyExcerpt=path.relative_to(OUT).as_posix(), assemblyExcerptSha256=sha(path.read_bytes()))
        path = folder / (address + '.c.txt')
        path.write_text(source_excerpt(study, method), encoding='utf8', newline='\n')
        refs.update(cExcerpt=path.relative_to(OUT).as_posix(), cExcerptSha256=sha(path.read_bytes()), reconstructedC=method['reconstructedC'])
        method.update(instructionCount=len(method['instructions']), bodyByteCount=len(body), bodyInstructionBytesSha256=sha(body), sourceRefs=refs)
        method_rules[method['label']] = dict(module='Engine', entry=method['entryVA'][2:], body=address,
            bodyRanges=method['bodyRanges'], bodyInstructionBytesSha256=sha(body), instructionCount=len(method['instructions']),
            bodyBytes=len(body), sourceRefs=refs)
    comparator_import = next(row for row in engine_pe.imports() if row['iatVA'] == '0x30afcd5c')
    require(comparator_import['module'].lower() == 'sharedbase.dll' and comparator_import['name'] == '?g_ArraySortDefaultCompare@@YAHPBX0@Z', 'Entity comparator import differs')
    comparator_raw = engine_pe.bytes(0x30afcd5c, 4)
    comparator_binding = dict(iatVA='30afcd5c', module='Engine', importIdentity=comparator_import,
        originalIatRaw=comparator_raw.hex(), originalIatSha256=sha(comparator_raw),
        scope='Original unbound PE import-thunk bytes, not a captured loaded function pointer.',
        resolvedExportEntry=method_rules['arraySortDefaultCompare']['entry'],
        resolvedExportBody=method_rules['arraySortDefaultCompare']['body'], sourceMethod='arraySortDefaultCompare')
    empty_text = pe.bytes(0x100e5e3c, 1)
    require(empty_text == b'\0', 'CString NULL GetText fallback is not the original empty literal')
    const_bytes = dict(emptyCStringText=dict(address='100e5e3c', raw=empty_text.hex(), bytes=1, sha256=sha(empty_text)))
    reused = {
        'baseAllocator': dict(path='../runtime-admin/runtime-rules.json', bytes=len(base_raw), sha256=sha(base_raw), scope='Source-verified runtime-admin allocator rules'),
        'engineMapNames': dict(path='../runtime-admin/prior-startup-allocations.json', bytes=len(prior_raw), sha256=sha(prior_raw), methods=REUSED_ENGINE),
    }
    records_path = ROOT / 'assets/gothic3/npc-entity/bandit-records.json'
    records_raw = records_path.read_bytes()
    records = json.loads(records_raw)
    names = []
    for entity in records['entities']:
        text = entity['name']
        raw = text.encode('cp1252')
        require(b'\0' not in raw and len(raw) == 18, 'Selected bandit name input differs')
        names.append(dict(key=entity['key'], name=text, sourceStringIndex=records['strings'].index(text),
            raw=raw.hex(), bytes=len(raw), nativeCStringRequestBytes=len(raw) + 9, nativeBucket='28'))
    string_path = dict(sourceRecords='../npc-entity/bandit-records.json', sourceRecordsSha256=sha(records_raw),
        sourceStringTableSha256=records['stringTable']['sha256'], selectedNames=names,
        holderLayout=dict(lengthOffset=0, referenceCountOffset=4, referenceCountBits=16, characterOffset=8,
            allocationBytes='length+9', uninitializedHeaderBytes=[6, 7], terminatorOffset='8+length'),
        callOrder=['source indexed-string stream supplies an owned CString temporary',
            'Entity.SetName: unregister old nonempty name', 'CString operator= -> SetText(shared)',
            'RegisterNameInfo acquires30af24f4', 'temporary pointer-array Realloc(NULL,36) -> bucket40',
            'cold name-slot tagged-new(20,0x199) -> bucket20', 'name-key assignment shares same CString holder',
            'resident pointer-array Realloc(NULL,36) -> bucket40', 'free temporary array',
            'release30af24f4', 'Entity virtual callback+0x118', 'temporary CString destructor releases its reference'],
        scope='Selected original ASCII name bytes; source stream/CString owners and native callbacks are runtime prerequisites, not inferred from browser strings.',
        unresolved=['Actual indexed-string table holder/lifetime capability before the temporary source CString read.',
            'Entity virtual callback+0x118 and owning entity dispatch.',
            'Full SceneAdmin construction and native startup outside the selected table subservice.'])
    all_methods = methods + engine_audit['methods']
    count = sum(len(method['instructions']) for method in all_methods)
    unique = {(method_rules[method['label']]['module'], row['va']) for method in all_methods for row in method['instructions']}
    rules = dict(schema='gothic3-npc-heap-rules-v1', inputs=dict(SharedBase=SHARED, Engine=ENGINE),
        baseRulesSha256=BASE_RULES, methods=method_rules, coldGlobals=cold_globals, buckets=buckets,
        constWords=constants, constBytes=const_bytes, reusedSourceReceipts=reused, nameStringPath=string_path, entityComparatorImport=comparator_binding,
        scope='Construction-only extension of one retained MemoryAdmin. Other owners consume their own PropertyID/CString/CS methods. No live native module image is claimed.')
    evidence = dict(schema='gothic3-npc-heap-evidence-v1', inputs=rules['inputs'], baseRulesSha256=BASE_RULES,
        sourceRoot='<LOCAL_DESKTOP_STUDY>', methods=all_methods, coldGlobals=cold_globals, constWords=constants, constBytes=const_bytes,
        reusedSourceReceipts=reused, nameStringPath=string_path, entityComparatorImport=comparator_binding,
        audit=dict(methodCount=len(all_methods), instructionCount=count, uniqueInstructionCount=len(unique),
            reusedMethodCount=len(REUSED_ENGINE), byteMismatchCount=0, nativeCodeExecuted=False))
    OUT.mkdir(parents=True, exist_ok=True)
    outputs = {}
    for filename, data in [('runtime-rules.json', rules), ('native-evidence.json', evidence)]:
        raw = encode(data); (OUT / filename).write_bytes(raw)
        outputs[filename] = dict(path=filename, bytes=len(raw), sha256=sha(raw))
    manifest = dict(schema='gothic3-npc-heap-manifest-v1', inputs=rules['inputs'], baseRulesSha256=BASE_RULES,
        outputs=outputs, audit=evidence['audit'])
    (OUT / 'manifest.json').write_bytes(encode(manifest))
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.study)))
