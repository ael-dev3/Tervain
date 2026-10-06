"""Offline original-PE receipts for Engine CRT process/thread bootstrap.

Instruction operands govern all layouts. This producer never executes game
code, captures live process state, or changes an earlier source package.
"""
# SPDX-License-Identifier: GPL-3.0-only
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import struct
from pathlib import Path

import read_dialogue_native_evidence as native
from prepare_runtime_admin_source import source_excerpt
from prepare_crt_undname_source import ENGINE, encode, require, sha, storage, verify_extents, make_rule

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/gothic3/crt-bootstrap'
PRIOR = ROOT / 'assets/gothic3/crt-undname'
PRIOR_RULES = 'd593c216c3cef9a2855be2dd3daa03170b36217b13d8065a320c7e5af495ef61'
PRIOR_EVIDENCE = '285a7ec06bfdbf9dcf1ad929fff03184da75ce2cb57e45998bb972655fc55b69'

TARGETS = {
    'entry': 0x3067744b, 'securityInitCookie': 0x3068e9a5,
    'dllMainCrtStartup': 0x30677355, 'crtAttach': 0x3067717c,
    'mtInit': 0x3067e2d9, 'initPointers': 0x3067d37b,
    'encodedNull': 0x3067ded2,
    'initNewHandler': 0x30682468, 'initSectionInitializer': 0x3069646a,
    'initInvalidParameter': 0x30674c1a, 'initCrtReportHook': 0x3067ea79,
    'initUnhandledException': 0x3069635c, 'initWinSignalPointers': 0x30695e68,
    'initDebugReportNoop': 0x3068aadb, 'initEhHooks': 0x3068a932,
    'exitPointerTarget': 0x3067d34c, 'terminatePointerTarget': 0x3068a8af,
    'preCInit': 0x3068e95d,
    'callocCrt': 0x3067ca01, 'callocImpl': 0x30695a7f,
    'callocCleanup': 0x30695b7b,
    'initPtd': 0x3067dff5, 'addLocaleRef': 0x3067a1f7,
    'unlockInitPtd': 0x3067e0ab, 'getPtdNoExit': 0x3067e0b4,
    'getCachedPtdGetter': 0x3067df6d, 'mtTerm': 0x3067dfb8,
    'freePtd': 0x3067e264, 'freePtdCallback': 0x3067e143,
    'unlockFreePtdMbc': 0x3067e24f, 'unlockFreePtdLocale': 0x3067e25b,
    'removeLocaleRef': 0x3067a27d, 'localeFree': 0x3067a0b7,
    'errno': 0x306783df, 'encodePointer': 0x3067de64,
    'decodePointer': 0x3067dedb, 'pointerEncodingAvailability': 0x3067ddf8,
    'heapInit': 0x3068442b, 'heapSelect': 0x306843d0,
    'heapTerm': 0x30684485, 'mtInitLocks': 0x30683218,
    'mtDeleteLocks': 0x30683261, 'ensureLock': 0x306832e3,
    'lock': 0x306833a6, 'unlock': 0x306832b6,
    'malloc': 0x30672ec7, 'mallocCrt': 0x3067c9c1,
    'free': 0x30672f8a, 'callNewHandler': 0x306824b9,
}

# Short compiler thunks have no function-catalog records. Extents and operands
# come directly from the original assembly and the original PE.
MANUAL = {
    'tlsAllocFallback': (0x3067df49, 0x3067df51),
    'tlsGetterDispatcher': (0x3067df52, 0x3067df66),
    'getFlsIndex': (0x3067df67, 0x3067df6c),
}

COLD = {
    'securityCookie': (0x30ad43ec, 4),
    'securityCookieComplement': (0x30ad43f0, 4),
    'attachCount': (0x30af70d0, 4), 'procedureSlots': (0x30af7144, 16),
    'exitHandler': (0x30ad4830, 4),
    'newHandler': (0x30af759c, 4),
    'sectionInitializer': (0x30af7c50, 4),
    'invalidParameter': (0x30af70c8, 4),
    'exceptionFilter': (0x30af7474, 4),
    'mathError': (0x30af7c4c, 4),
    'winSignalPointers': (0x30af7c38, 16),
    'terminateHandler': (0x30af7744, 4),
    'defaultLocale': (0x30ad5100, 216), 'currentLocale': (0x30ad51d8, 4),
    'mbcObject': (0x30ad4bd0, 544), 'mbcRefCounter': (0x30ad4bd0, 4),
    'timeLocale': (0x30ad4330, 188), 'timeLocaleRefCounter': (0x30ad43e4, 4),
    'fallbackErrors': (0x30ad4560, 8), 'exceptionData': (0x30ad5410, 120),
    'exceptionTableMetadata': (0x30ad5488, 16),
    'localeEmptyString': (0x30af70cc, 1),
    'crtTlsIndexes': (0x30ad4840, 8), 'crtOsFields': (0x30af70f8, 20),
    'crtHeapHandle': (0x30af76f4, 4), 'crtHeapMode': (0x30af7e20, 4),
    'crtMallocRetry': (0x30af70f0, 4), 'newMode': (0x30af76f8, 4),
}
CONSTANTS = {
    'attachCallback': (0x30892dc0, 4),
    'preCInitializerTable': (0x3094c89c, 256),
    'localeSentinel': (0x30ad50f8, 4),
    'localeConventions': (0x30ad42e8, 48),
    'localeDecimalPoint': (0x30ad42e4, 2),
    'ctypeTable': (0x30893040, 514),
    'lowerCaseTable': (0x308934c8, 256),
    'upperCaseTable': (0x30893648, 256),
}

# Original catalog gaps after _free's erroneous noreturn annotation.
RECOVERY_RANGES = {
    'crtAttach': [(0x30677339, 0x3067733e)],
    'getPtdNoExit': [(0x3067e11c, 0x3067e11e)],
    'freePtdCallback': [(a, a) for a in [0x3067e167, 0x3067e175, 0x3067e183,
        0x3067e191, 0x3067e19f, 0x3067e1ad, 0x3067e1be, 0x3067e1eb, 0x3067e243]],
    'localeFree': [(0x3067a0f4, 0x3067a100), (0x3067a115, 0x3067a121),
        (0x3067a12d, 0x3067a139), (0x3067a159, 0x3067a187),
        (0x3067a1ac, 0x3067a1ad), (0x3067a1cd, 0x3067a1cd),
        (0x3067a1e4, 0x3067a1e4)],
}


def decode_recovery(pe: native.PE, begin: int, end: int) -> list[dict]:
    """Decode only the explicitly selected simple omitted instruction forms.

    Reject every other encoding; instruction lengths and original PE bytes are
    checked independently against each bounded continuation range.
    """
    cursor = begin
    rows = []
    while cursor <= end:
        raw = pe.bytes(cursor, end - cursor + 1)
        if raw[0] == 0x59:
            size, text = 1, 'POP ECX'
        elif raw[0] in (0xe8, 0xe9):
            size = 5
            target = cursor + 5 + struct.unpack('<i', raw[1:5])[0]
            text = ('CALL' if raw[0] == 0xe8 else 'JMP') + f' 0x{target:08x}'
        elif raw[:2] == bytes.fromhex('33f6'):
            size, text = 2, 'XOR ESI,ESI'
        elif raw[:2] == bytes.fromhex('ffb6'):
            size, text = 6, f'PUSH dword ptr [ESI + 0x{struct.unpack("<I", raw[2:6])[0]:x}]'
        elif raw[:2] == bytes.fromhex('8b86'):
            size, text = 6, f'MOV EAX,dword ptr [ESI + 0x{struct.unpack("<I", raw[2:6])[0]:x}]'
        elif raw[0] == 0xbf:
            size, text = 5, f'MOV EDI,0x{struct.unpack("<I", raw[1:5])[0]:x}'
        elif raw[:2] == bytes.fromhex('2bc7'):
            size, text = 2, 'SUB EAX,EDI'
        elif raw[0] == 0x50:
            size, text = 1, 'PUSH EAX'
        elif raw[:3] == bytes.fromhex('83c410'):
            size, text = 3, 'ADD ESP,0x10'
        else:
            raise ValueError(f'Unselected recovered instruction encoding {cursor:08x}: {raw.hex()}')
        require(cursor + size - 1 <= end, 'Recovered instruction exceeds bounded range')
        data = raw[:size]
        rows.append(dict(va=f'{cursor:08x}', rva=f'{cursor-pe.base:x}',
            fileOffset=pe.offset(cursor, size), bytes=data.hex(), instruction=text,
            originalPERecovered=True, sourceASMGap=True))
        cursor += size
    require(cursor == end + 1, 'Recovered range ends inside an instruction')
    return rows


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


def combine_ranges(ranges: str, added: list[tuple[int, int]]) -> str:
    values = [(int(a, 16), int(b, 16)) for a, b in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})', ranges)]
    merged = native.merged_ranges(values + added)
    return ';'.join(f'{a:08x}-{b:08x}' for a, b in merged)


def layouts() -> dict:
    return dict(
        ptd=dict(bytes=0x214, allocation=dict(count=1, elementBytes=0x214, heapFlags=8),
            offsets=dict(threadId=0, threadHandle=4, errno=8, dosErrno=12, randomSeed=20,
                exceptionData=92, mbcInfo=104, localeInfo=108, ownLocale=112,
                localeChar=200, localeWideChar=331, encodePointer=504, decodePointer=508),
            freedBufferOffsets=[36, 44, 52, 60, 68, 72],
            destructor='freePtdCallback', mbcLock=13, localeLock=12,
            scope='All532 calloc bytes start known zero; only the exact source stores establish later pointer/byte facts.'),
        procedures=dict(storage='procedureSlots', bytes=16,
            offsets=dict(flsAlloc=0, flsGetValue=4, flsSetValue=8, flsFree=12),
            fallback=dict(flsAlloc='tlsAllocFallback', flsGetValue='TlsGetValue',
                flsSetValue='TlsSetValue', flsFree='TlsFree')),
        locale=dict(storage='defaultLocale', bytes=216, offsets=dict(refCount=0,
            categoryRecords=72, categoryRecordBytes=16, categoryCount=6,
            lconvRef0=176, lconvRef1=180, lconvRef2=184,
            ctypeRef=192, localeConventions=188, ctype=200, lowerCase=204,
            upperCase=208, timeLocale=212), categoryRefOffsets=[80, 96, 112, 128, 144, 160],
            optionalRefOffsets=[176, 184, 180, 192], categorySentinel='localeSentinel'),
        mbc=dict(storage='mbcObject', bytes=544, refCountOffset=0),
        exceptionTable=dict(storage='exceptionData', bytes=120, recordBytes=12, records=10,
            offsets=dict(exceptionCode=0, signal=4, action=8), metadataStorage='exceptionTableMetadata'),
        timeLocale=dict(storage='timeLocale', bytes=188, refCountOffset=180),
        bootstrap=dict(entry='entry', attachReason=1, ptdBytes=532,
            preCTableStorage='preCInitializerTable', preCTableSlots=64,
            attachCallbackStorage='attachCallback', nextBoundary='GetCommandLineA'),
    )


def prepare(study: Path) -> dict:
    prior_raw = (PRIOR / 'runtime-rules.json').read_bytes()
    prior_ev_raw = (PRIOR / 'native-evidence.json').read_bytes()
    require(sha(prior_raw) == PRIOR_RULES and sha(prior_ev_raw) == PRIOR_EVIDENCE,
        'Frozen CRT demangler package differs')
    prior_rules = json.loads(prior_raw)
    prior_methods = {m['label']: m for m in json.loads(prior_ev_raw)['methods']}
    require(len(prior_methods) == 82, 'Frozen CRT demangler receipt count differs')
    data = (study / '00_Original_Runtime/Engine.dll').read_bytes()
    require(sha(data) == ENGINE, 'Original Engine input differs')
    pe = native.PE(data)
    native.EXPECTED_INPUTS['Engine.dll'] = ENGINE
    new_targets = {a: label for label, a in TARGETS.items() if label not in prior_methods}
    audit = native.audit_module(study, 'Engine_dll', 'Engine.dll', new_targets)
    methods = []
    reused_count = 0
    recovered_count = 0
    for label, entry in TARGETS.items():
        if label in prior_methods:
            method = copy.deepcopy(prior_methods[label])
            require(method['entryVA'] == f'0x{entry:08x}', 'Reused entry differs: ' + label)
            reused_count += 1
            method['reusedSourceReceipt'] = dict(package='../crt-undname/runtime-rules.json',
                packageSha256=PRIOR_RULES, method=label,
                bodyInstructionBytesSha256=prior_rules['methods'][label]['bodyInstructionBytesSha256'])
        else:
            method = next(copy.deepcopy(m) for m in audit['methods'] if m['label'] == label)
        for begin, end in RECOVERY_RANGES.get(label, []):
            rows = decode_recovery(pe, begin, end)
            recovered_count += len(rows)
            method['instructions'].extend(rows)
        if label in RECOVERY_RANGES:
            method['originalCatalogBodyRanges'] = method['bodyRanges']
            method['bodyRanges'] = combine_ranges(method['bodyRanges'], RECOVERY_RANGES[label])
            method.update(sourceASMGap=True, sourceCUntrustedNoReturnAnnotation=True,
                recovery='Original PE post-free continuation; reconstructed noreturn annotation is not authoritative.')
        method['instructions'].sort(key=lambda r: r['va'])
        method['entryRaw'] = pe.bytes(entry, 5).hex()
        method['entryRawSha256'] = sha(pe.bytes(entry, 5))
        verify_extents(pe, method)
        if 'reconstructedC' in method:
            r = method['reconstructedC']; original = (study / r['path']).read_bytes()
            require(sha(original) == r['sha256'], 'Reconstructed C file differs: ' + label)
            require(original.decode('utf8').splitlines()[r['line'] - 1].startswith('/* ENTRY ' + method['bodyVA'][2:] + ' |'),
                'Reconstructed C source line differs: ' + label)
        method['sourceRefs'] = emit_refs(study, method)
        methods.append(method)
    manual_rows = {}
    assembly = study / '01_Decompiled_Code/Engine_dll/full_disassembly.asm'
    pattern = re.compile(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)')
    for number, line in enumerate(assembly.open('rb'), 1):
        match = pattern.fullmatch(line.rstrip(b'\r\n'))
        if not match: continue
        a = int(match[1], 16)
        if any(begin <= a <= end for begin, end in MANUAL.values()):
            raw = bytes.fromhex(match[2].decode())
            require(pe.bytes(a, len(raw)) == raw, 'Manual thunk bytes differ')
            manual_rows[a] = dict(va=f'{a:08x}', rva=f'{a-pe.base:x}', fileOffset=pe.offset(a, len(raw)),
                bytes=raw.hex(), instruction=match[3].decode('utf8'), assemblyLine=number)
    for label, (begin, end) in MANUAL.items():
        method = dict(label=label, module='Engine', entryVA=f'0x{begin:08x}', bodyVA=f'0x{begin:08x}',
            entryChain=[], bodyRanges=f'{begin:08x}-{end:08x}',
            instructions=[manual_rows[a] for a in sorted(manual_rows) if begin <= a <= end],
            sourceCGap=True, recovery='Short compiler thunk has assembly and original PE authority but no function-catalog record.',
            entryRaw=pe.bytes(begin, 5).hex(), entryRawSha256=sha(pe.bytes(begin, 5)))
        verify_extents(pe, method); method['sourceRefs'] = emit_refs(study, method); methods.append(method)
    rules_methods = {m['label']: make_rule(m) for m in methods}
    for m in methods:
        if 'reusedSourceReceipt' in m:
            rules_methods[m['label']]['reusedSourceReceipt'] = m['reusedSourceReceipt']
    cold = {label: storage(pe, a, size) for label, (a, size) in COLD.items()}
    for label, owner, offset in [('mbcRefCounter', 'mbcObject', 0), ('timeLocaleRefCounter', 'timeLocale', 180)]:
        cold[label].update(aliasOf=owner, aliasOffset=offset)
        require(bytes.fromhex(cold[label]['raw']) == bytes.fromhex(cold[owner]['raw'])[offset:offset+4],
            'Canonical source storage alias differs: ' + label)
    constants = {label: storage(pe, a, size) for label, (a, size) in CONSTANTS.items()}
    for label, prior_label in [('sectionInitializer', 'crtSectionInitializer'), ('crtTlsIndexes', 'crtTlsIndexes'),
        ('crtOsFields', 'crtOsFields'), ('crtHeapHandle', 'crtHeapHandle'), ('crtHeapMode', 'crtHeapMode'),
        ('crtMallocRetry', 'crtMallocRetry'), ('newMode', 'newMode')]:
        earlier = prior_rules['coldGlobals'][prior_label]
        require(all(cold[label][k] == earlier[k] for k in ['address', 'bytes', 'raw', 'knownMask', 'sha256']),
            'Earlier canonical CRT storage differs: ' + label)
        cold[label]['reusedSourceReceipt'] = dict(package='../crt-undname/runtime-rules.json',
            packageSha256=PRIOR_RULES, storage=prior_label, sha256=earlier['sha256'])
    # NUL string operands referenced by the actual process/thread bootstrap.
    literals = {}
    for method in methods:
        for row in method['instructions']:
            if row['instruction'].startswith('PUSH 0x'):
                address = int(row['instruction'][7:], 16)
                if 0x30800000 <= address < 0x30900000:
                    try:
                        value = pe.string(address)
                        if value and all(32 <= ord(c) < 127 for c in value): literals[address] = value
                    except (ValueError, UnicodeDecodeError): pass
    names = {'KERNEL32.DLL': 'kernel32Module', 'FlsAlloc': 'flsAllocName',
        'FlsGetValue': 'flsGetValueName', 'FlsSetValue': 'flsSetValueName',
        'FlsFree': 'flsFreeName', 'EncodePointer': 'encodePointerName', 'DecodePointer': 'decodePointerName'}
    for a, value in sorted(literals.items()):
        label = names.get(value, 'literal' + f'{a:08x}')
        constants[label] = storage(pe, a, len(value)+1) | dict(ascii=value)
    for record in [*cold.values(), *constants.values()]:
        begin, end = int(record['address'], 16), int(record['address'], 16) + record['bytes']
        record['operandReferences'] = [dict(method=m['label'], va=r['va'], bytes=r['bytes'], instruction=r['instruction'])
            for m in methods for r in m['instructions']
            if any(begin <= int(a, 16) < end for a in re.findall(r'0x([0-9a-f]{8})', r['instruction']))]
    require(cold['securityCookie']['raw'] == '4ee640bb' and cold['securityCookieComplement']['raw'] == 'b119bf44',
        'Original cold security cookie differs')
    require(constants['preCInitializerTable']['allZero'] and constants['attachCallback']['allZero'],
        'Original attach/pre-C-init callback table differs')
    pointer_bindings = [dict(storage='exitHandler', offset=0, target='3067d34c', method='exitPointerTarget'),
        dict(storage='currentLocale', offset=0, target='30ad5100', storageTarget='defaultLocale')]
    for offset in [88, 104, 120, 136, 152]:
        pointer_bindings.append(dict(storage='defaultLocale', offset=offset, target='30ad50f8', storageTarget='localeSentinel'))
    for offset, label in [(188, 'localeConventions'), (200, 'ctypeTable'), (204, 'lowerCaseTable'),
        (208, 'upperCaseTable'), (212, 'timeLocale')]:
        pointer_bindings.append(dict(storage='defaultLocale', offset=offset,
            target=(cold | constants)[label]['address'], storageTarget=label))
    pointer_bindings.append(dict(storage='timeLocale', offset=184, target='30ad4330', storageTarget='timeLocale'))
    pointer_bindings.append(dict(storage='localeConventions', offset=0, target='30ad42e4', storageTarget='localeDecimalPoint'))
    for offset in range(4, 40, 4):
        pointer_bindings.append(dict(storage='localeConventions', offset=offset, target='30af70cc', storageTarget='localeEmptyString'))
    for binding in pointer_bindings:
        owner = (cold | constants)[binding['storage']]
        raw = bytes.fromhex(owner['raw'])
        require(struct.unpack_from('<I', raw, binding['offset'])[0] == int(binding['target'], 16),
            'Cold pointer binding differs')
    used = {'0x'+a for m in methods for r in m['instructions']
        for a in re.findall(r'\[0x([0-9a-f]{8})\]', r['instruction'])}
    imports = [dict(i, originalIatRaw=pe.bytes(int(i['iatVA'], 16), 4).hex(),
        originalIatSha256=sha(pe.bytes(int(i['iatVA'], 16), 4)), scope='original-unbound-import-thunk')
        for i in pe.imports() if i['iatVA'] in used]
    by_entry = {r['entry']: k for k, r in rules_methods.items()}
    by_iat = {i['iatVA'][2:]: i for i in imports}
    calls = {}
    for m in methods:
        entries = []
        for r in m['instructions']:
            t = r['instruction']
            if not (t.startswith('CALL ') or t.startswith('JMP dword ptr ') or re.fullmatch(r'JMP 0x[0-9a-f]{8}', t)): continue
            entry = dict(va=r['va'], bytes=r['bytes'], instruction=t)
            direct = re.fullmatch(r'(?:CALL|JMP) 0x([0-9a-f]{8})', t)
            indirect = re.fullmatch(r'(?:CALL|JMP) dword ptr \[0x([0-9a-f]{8})\]', t)
            if direct:
                target = direct[1]
                if t.startswith('JMP ') and any(int(a,16) <= int(target,16) <= int(b,16)
                    for a,b in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})', m['bodyRanges'])): continue
                entry['target'] = target
                if target in by_entry: entry['method'] = by_entry[target]
                else: entry['receiptOwned'] = False
            elif indirect and indirect[1] in by_iat: entry['importIat'] = indirect[1]
            else: entry['runtimeCapabilityRequired'] = True
            entries.append(entry)
        calls[m['label']] = entries
    prior_receipts = dict(crtUndname=dict(path='../crt-undname/runtime-rules.json', bytes=len(prior_raw),
        sha256=PRIOR_RULES, evidencePath='../crt-undname/native-evidence.json', evidenceSha256=PRIOR_EVIDENCE,
        packageMethodCount=82, reusedMethods=[m['label'] for m in methods if 'reusedSourceReceipt' in m]))
    summary = dict(methodCount=len(methods), newCatalogMethodCount=len(new_targets),
        reusedMethodCount=reused_count, unchangedReusedMethodCount=reused_count-1,
        extendedReusedMethodCount=1, uncatalogedThunkCount=len(MANUAL),
        instructionCount=sum(len(m['instructions']) for m in methods),
        uniqueInstructionCount=len({r['va'] for m in methods for r in m['instructions']}),
        newRecoveredPostFreeInstructionCount=recovered_count,
        reusedRecoveredPostFreeInstructionCount=sum(bool(r.get('originalPERecovered'))
            for m in methods if 'reusedSourceReceipt' in m
            for r in m['instructions'] if not any(a <= int(r['va'],16) <= b for a,b in RECOVERY_RANGES.get(m['label'],[]))),
        recoveredPostFreeInstructionCount=sum(bool(r.get('originalPERecovered')) for m in methods for r in m['instructions']),
        byteMismatchCount=0, nativeCodeExecuted=False)
    rules = dict(schema='gothic3-crt-bootstrap-rules-v1', inputs=dict(Engine=ENGINE), methods=rules_methods,
        coldGlobals=cold, constBytes=constants, imports=dict(Engine=imports), callInventory=calls,
        pointerBindings=pointer_bindings, layouts=layouts(), priorSourceReceipts=prior_receipts,
        scope='Original cold image and instruction receipts. No live state or native execution; OS/TLS/CRT services remain explicit capabilities.')
    evidence = dict(schema='gothic3-crt-bootstrap-evidence-v1', inputs=dict(Engine=ENGINE), sourceRoot='<LOCAL_DESKTOP_STUDY>',
        modules=dict(Engine={k:v for k,v in audit.items() if k != 'methods'}), methods=methods,
        coldGlobals=cold, constBytes=constants, imports=dict(Engine=imports), pointerBindings=pointer_bindings,
        layouts=layouts(), priorSourceReceipts=prior_receipts, audit=summary)
    OUT.mkdir(parents=True, exist_ok=True)
    outputs = {}
    for filename, value in [('runtime-rules.json', rules), ('native-evidence.json', evidence)]:
        raw = encode(value); (OUT / filename).write_bytes(raw)
        outputs[filename] = dict(path=filename, bytes=len(raw), sha256=sha(raw))
    manifest = dict(schema='gothic3-crt-bootstrap-manifest-v1', inputs=dict(Engine=ENGINE), outputs=outputs, audit=summary)
    (OUT / 'manifest.json').write_bytes(encode(manifest))
    (OUT / 'README.md').write_text(f'''# Engine CRT bootstrap source receipts

Offline receipts for the original Engine.dll, SHA-256 `{ENGINE}`.
The producer executes no game code and captures no live process state.
Original x86 operands and PE bytes govern the layouts; reconstructed C is explanatory.

## Reproduce

```powershell
python -B tools/gothic3/prepare_crt_bootstrap_source.py --study '<LOCAL_DESKTOP_STUDY>'
```

The study must contain the original Engine.dll and Engine function catalog,
assembly and reconstructed C. The frozen CRT demangler package is verified;
its selected receipts are explicitly referenced and never modified.

## Scope

{summary['methodCount']} method receipts include {summary['reusedMethodCount']} reused receipts,
{summary['newCatalogMethodCount']} newly audited catalog methods and {summary['uncatalogedThunkCount']} uncataloged compiler thunks.
All {summary['uniqueInstructionCount']} unique instructions match the original PE.
Post-free recovery retains {summary['reusedRecoveredPostFreeInstructionCount']} prior instructions and restores
{summary['newRecoveredPostFreeInstructionCount']} further instructions omitted by erroneous noreturn annotations.
One reused receipt (crtAttach) is explicitly extended by its recovered continuation;
the other {summary['unchangedReusedMethodCount']} retain their original instruction hashes.

The actual PTD request is calloc(1,0x214):532 bytes. Cold cookie/complement,
procedure and encoded-pointer slots, default locale/MBC/time objects, aliases,
pointer bindings and the zero pre-C-init callback table are byte-pinned.
Cold original pointers retain their numeric source value until an owner maps
them to the corresponding canonical capability. No nonzero field is forced zero.

The selected process path reaches the next GetCommandLineA boundary after
the captured MT/bootstrap and pre-C-init operations. Environment, I/O, full C
initialization, native application/module startup and gameplay remain separate
dependencies. Capturing a method does not establish runtime ownership.
''', encoding='utf8', newline='\n')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.study)))
