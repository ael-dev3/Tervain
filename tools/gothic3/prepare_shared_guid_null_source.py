"""Capture the selected Shared GUIDNull initializer and contextual CRT evidence.

Offline receipts only. No native code, tests, traversal or live-state capture.
Use explicit --repo and --output to generate a review draft outside the repo.
The intended future artifact directory is assets/gothic3/shared-guid-null.
"""
# SPDX-License-Identifier: GPL-3.0-only
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import struct
import sys
from pathlib import Path

# Imported repository helpers must remain read-only during external drafting.
sys.dont_write_bytecode = True

INPUTS = {'SharedBase': '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'}
ARTIFACT = 'assets/gothic3/shared-guid-null'
NORMALIZATION = 'rstrip-line-whitespace; LF line endings; final newline'
EXPECTED = {
    'guidNullInitializer': (9, 45, 'fe95f9b100333ef62ca804d288a0db74d3c72240b197fa4b92481e1be29d1e03'),
    'cinit': (50, 146, '41b51da16ad44681b0fb71a91e74220b1b07a950bcbd5eb4cb42c3ee734ca9c9'),
    'inittermE': (15, 32, '8026cc99de5f0f5083710e0c1f52beb27aede69826b267d12e8ccbe42ca3ca60'),
}
REUSED = {
    'guidIsNull': (0x10003fd0, 12, 31, '3b51a10464785c496b0f7a62a357ec7cb5172533ec2ceafc9ee59fc4928e2e03'),
    'guidEqualsRaw': (0x100075f4, 66, 161, '547f5bb93125da1133935d868b524c211fef6404611e336905b1672e6a6f534c'),
    'guidDtor': (0x100015cd, 1, 1, 'ae3f4619b0413d70d3004b9131c3752153074e45725be13b9a148978895e359e'),
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def encode(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf8')


def prepare(study: Path, repo: Path, out: Path) -> dict:
    sys.path.insert(0, str(repo / 'tools/gothic3'))
    import read_dialogue_native_evidence as native
    from prepare_runtime_admin_source import image_bytes, source_excerpt
    from prepare_crt_undname_source import verify_extents

    out.mkdir(parents=True, exist_ok=True)
    pe = native.PE((study / '00_Original_Runtime/SharedBase.dll').read_bytes())
    require(sha(pe.data) == INPUTS['SharedBase'], 'Original SharedBase image differs')
    section_count = len(pe.sections)
    section_start = pe.optional + struct.unpack_from('<H', pe.data, pe.optional-4)[0]
    sections = []
    for index in range(section_count):
        offset = section_start + index * 40
        virtual_size, rva, raw_size, raw_offset = pe.sections[index]
        flags = struct.unpack_from('<I', pe.data, offset+36)[0]
        sections.append(dict(name=pe.data[offset:offset+8].rstrip(b'\0').decode('ascii'),
            address=f'{pe.base+rva:08x}', rva=f'{rva:x}', virtualSize=virtual_size,
            rawSize=raw_size, rawOffset=raw_offset, characteristics=f'{flags:08x}',
            readable=bool(flags & 0x40000000), writable=bool(flags & 0x80000000),
            executable=bool(flags & 0x20000000)))
    module_header = dict(base=f'{pe.base:08x}',
        sizeOfImage=struct.unpack_from('<I', pe.data, pe.optional+56)[0], sections=sections)
    require(next(section for section in sections if section['address'] == '100e5000')['characteristics'] == '40000040'
            and next(section for section in sections if section['address'] == '1013f000')['characteristics'] == 'c0000040',
            'Original source/table readonly or destination writable section differs')
    native.EXPECTED_INPUTS['SharedBase.dll'] = INPUTS['SharedBase']
    base = study / '01_Decompiled_Code/SharedBase_dll'
    catalog_raw = (base / 'functions.csv').read_bytes()
    catalog = {row['address']: row for row in csv.DictReader(catalog_raw.decode('utf-8-sig').splitlines())}
    audit = native.audit_module(study, 'SharedBase_dll', 'SharedBase.dll',
                                {0x100aa632: 'cinit', 0x100aa47d: 'inittermE'})
    audit.pop('constants', None)
    audit.pop('tables', None)

    # This existing ASM-only initializer is not a missing body recovered from PE.
    require('100e1470' not in catalog, 'Initializer now has original catalog provenance')
    require(not any(b'/* ENTRY 100e1470 |' in path.read_bytes()
                    for path in (base / 'pseudocode').glob('*.c')),
            'Initializer now has original reconstructed C provenance')
    assembly_digest = hashlib.sha256()
    initializer_rows, direct_refs, entry_presence, linkage_rows = [], [], set(), {}
    operand_addresses = {0x100ebb28 + offset for offset in range(0, 16, 4)} | {
                         0x101ab150 + offset for offset in range(0, 16, 4)}
    pattern = re.compile(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)')
    with (base / 'full_disassembly.asm').open('rb') as stream:
        for number, line in enumerate(stream, 1):
            assembly_digest.update(line)
            match = pattern.fullmatch(line.rstrip(b'\r\n'))
            if not match:
                continue
            address = int(match[1], 16)
            if address in {0x100e1660, 0x100e1440, 0x100e1450}:
                entry_presence.add(address)
            text = match[3].decode('utf8')
            selected = 0x100e1470 <= address <= 0x100e149c
            reference = any(int(value, 16) in operand_addresses
                            for value in re.findall(r'0x([0-9a-f]{8})', text))
            linkage = address in {0x10092b5c, 0x1001271f}
            if not selected and not reference and not linkage:
                continue
            raw = bytes.fromhex(match[2].decode())
            require(pe.bytes(address, len(raw)) == raw, f'Original ASM/PE mismatch at {address:08x}')
            row = dict(va=f'{address:08x}', rva=f'{address-pe.base:x}',
                       fileOffset=pe.offset(address, len(raw)), bytes=raw.hex(),
                       instruction=text, assemblyLine=number)
            if selected:
                initializer_rows.append(row)
            if reference:
                direct_refs.append(row)
            if linkage:
                linkage_rows[address] = row
    require(assembly_digest.hexdigest() == audit['assemblySha256'], 'Original ASM input hash differs')
    require([row['bytes'] for row in initializer_rows] == [
        'a128bb0e10', '8b0d2cbb0e10', '8b1530bb0e10', 'a350b11a10',
        'a134bb0e10', '890d54b11a10', '891558b11a10', 'a35cb11a10', 'c3'],
        'Original initializer instruction/load/store order differs')
    symbols_raw = (base / 'symbols.csv').read_bytes()
    symbols = [dict(row, csvLine=number) for number, row in enumerate(
        csv.DictReader(symbols_raw.decode('utf-8-sig').splitlines()), 2) if row['address'] == '100e1470']
    require(any(row['name'] == 'LAB_100e1470' for row in symbols), 'Original initializer symbol differs')
    initializer = dict(label='guidNullInitializer', entryVA='0x100e1470', bodyVA='0x100e1470',
        entryChain=[], bodyRanges='100e1470-100e149c', instructions=initializer_rows,
        sourceCGap=True, sourceASMGap=False, originalCatalogGap=True, originalSymbols=symbols,
        selection='Existing original ASM-only initializer; no catalog/C recovery or native execution')
    methods = [initializer, *audit['methods']]
    rules_methods = {}
    for method in methods:
        verify_extents(pe, method)
        raw = b''.join(bytes.fromhex(row['bytes']) for row in method['instructions'])
        method.update(module='SharedBase', instructionCount=len(method['instructions']),
                      bodyByteCount=len(raw), bodyInstructionBytesSha256=sha(raw))
        require((len(method['instructions']), len(raw), sha(raw)) == EXPECTED[method['label']],
                'Selected method count/hash differs: ' + method['label'])
        folder = out / 'sources/SharedBase'
        folder.mkdir(parents=True, exist_ok=True)
        body = method['bodyVA'][2:]
        path = folder / (body + '.asm.txt')
        path.write_text('\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction']
                                  for row in method['instructions']) + '\n', encoding='utf8', newline='\n')
        refs = dict(assembly=path.relative_to(out).as_posix(), assemblySha256=sha(path.read_bytes()))
        if 'reconstructedC' in method:
            path = folder / (body + '.c.txt')
            text = '\n'.join(line.rstrip() for line in source_excerpt(study, method).splitlines()) + '\n'
            path.write_text(text, encoding='utf8', newline='\n')
            refs.update(c=path.relative_to(out).as_posix(), cSha256=sha(path.read_bytes()),
                        cNormalization=NORMALIZATION)
        method['sourceRefs'] = refs
        receipt = dict(module='SharedBase', entry=method['entryVA'][2:], body=body,
            bodyRanges=method['bodyRanges'], instructionCount=len(method['instructions']), bodyBytes=len(raw),
            bodyInstructionBytesSha256=sha(raw), entryChain=method['entryChain'], sourceRefs=refs,
            role='selected-initializer' if method['label'] == 'guidNullInitializer' else 'context-only')
        for key in ['sourceCGap', 'sourceASMGap', 'originalCatalogGap', 'selection']:
            if key in method:
                receipt[key] = method[key]
        rules_methods[method['label']] = receipt

    def storage(address: int, size: int, constant: bool = False) -> dict:
        raw, section = image_bytes(pe, address, size)
        require(not constant or section['loaderZeroFillBytes'] == 0, 'Constant must be file-backed')
        return dict(module='SharedBase', address=f'{address:08x}', bytes=size, raw=raw.hex(),
            knownMask='ff' * size, sha256=sha(raw), section=section, allZero=not any(raw),
            liveValueCaptured=False, scope='original-file-backed-constant' if constant else 'cold-original-image')

    tables, table_summaries = {}, {}
    for label, begin, end, slots, non_null, expected_hash in [
        ('cppInitializers', 0x100e5000, 0x100e5358, 214, 17,
         'fd99f7fcf539bc68eea33517557e25e1478c48baa66261e6658f02fad3552833'),
        ('cInitializers', 0x100e545c, 0x100e5678, 135, 5,
         'f215c2271c89b18acd8f55938e07e3b8905b43d4cd683f37545c961d8f87eafc')]:
        table = storage(begin, end-begin, True)
        values = struct.unpack('<' + 'I' * slots, bytes.fromhex(table['raw']))
        entries = []
        ordinal = 0
        for index, target in enumerate(values):
            if target:
                ordinal += 1
            entries.append(dict(index=index, slot=f'{begin+index*4:08x}', target=f'{target:08x}',
                                nonNullOrdinal=ordinal if target else None))
        table.update(exclusiveEnd=f'{end:08x}', elementBytes=4, slots=slots, entries=entries,
                     nonNullCallbacks=[entry for entry in entries if entry['target'] != '00000000'],
                     nonNullCount=ordinal, wholeTableExecuted=False)
        require(table['sha256'] == expected_hash and ordinal == non_null, 'Original table differs: ' + label)
        tables[label] = table
    selected = dict(tables['cppInitializers']['entries'][132], method='guidNullInitializer',
        slotStorage='guidNullInitializerSlot', table='cppInitializers', tableOffset=528,
        precedingNonNullCallbacks=3, selectedCallbackExecuted=False)
    require(selected['slot'] == '100e5210' and selected['target'] == '100e1470' and
            selected['nonNullOrdinal'] == 4, 'Selected physical GUIDNull slot differs')
    tables['cppInitializers']['selectedGuidNullInitializer'] = selected
    for label, table in tables.items():
        path = out / 'tables' / (label + '.json')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(encode(table))
        summary = {key: table[key] for key in ['module', 'address', 'bytes', 'sha256', 'scope',
            'liveValueCaptured', 'exclusiveEnd', 'elementBytes', 'slots', 'nonNullCount', 'wholeTableExecuted']}
        summary.update(sourceRef=dict(path=path.relative_to(out).as_posix(), bytes=path.stat().st_size,
                                     sha256=sha(path.read_bytes())), nonNullCallbacks=table['nonNullCallbacks'])
        if label == 'cppInitializers':
            summary['selectedGuidNullInitializer'] = selected
        table_summaries[label] = summary
    constants = dict(guidNullSourceLiteral=storage(0x100ebb28, 16, True),
                     guidNullInitializerSlot=storage(0x100e5210, 4, True))
    constants['guidNullInitializerSlot']['canonicalSlice'] = dict(table='cppInitializers', offset=528,
                                                               independentAllocationAllowed=False)
    cold = dict(guidNullPayload=storage(0x101ab150, 16))
    require(constants['guidNullSourceLiteral']['section']['fileBackedBytes'] == 16 and
            cold['guidNullPayload']['section']['loaderZeroFillBytes'] == 16 and
            cold['guidNullPayload']['raw'] == '00'*16, 'Original GUID source/cold provenance differs')

    # Reuse the focused package bodies and source files without emitting copies.
    package = repo / 'assets/gothic3/script-admin-startup'
    dep_paths = {name: package / name for name in ['native-evidence.json', 'runtime-rules.json']}
    dep_raw = {name: path.read_bytes() for name, path in dep_paths.items()}
    dep_docs = {name: json.loads(raw) for name, raw in dep_raw.items()}
    evidence, focused_rules = dep_docs['native-evidence.json'], dep_docs['runtime-rules.json']
    require(evidence['schema'] == 'gothic3-script-admin-startup-evidence-v1' and
            focused_rules['schema'] == 'gothic3-script-admin-startup-rules-v1' and
            all(doc['inputs']['SharedBase'] == INPUTS['SharedBase'] for doc in dep_docs.values()),
            'Focused source dependency differs')
    require(focused_rules['coldGlobals']['guidNullPayload'] == cold['guidNullPayload'],
            'Existing focused canonical cold GUID receipt differs')
    original_reused = native.audit_module(study, 'SharedBase_dll', 'SharedBase.dll',
        {spec[0]: label for label, spec in REUSED.items()})
    by_label = {method['label']: method for method in evidence['methods']}
    reused, dep_files = {}, list(dep_paths.values())
    for original in original_reused['methods']:
        label = original['label']
        verify_extents(pe, original)
        method, rule = by_label[label], focused_rules['methods'][label]
        require(all(method[key] == original[key] for key in original),
                'Focused receipt differs from original source: ' + label)
        require((method['instructionCount'], method['bodyByteCount'], method['bodyInstructionBytesSha256'])
                == REUSED[label][1:], 'Focused reused method count/hash differs: ' + label)
        require(rule['body'] == method['bodyVA'][2:] and rule['entryChain'] == method['entryChain'] and
                rule['sourceRefs'] == method['sourceRefs'], 'Focused method linkage differs: ' + label)
        refs = dict(rule['sourceRefs'])
        for field, hash_field in [('assembly', 'assemblySha256'), ('c', 'cSha256')]:
            if field not in refs:
                continue
            path = package / refs[field]
            raw = path.read_bytes()
            require(sha(raw) == refs[hash_field], 'Reused source excerpt hash differs')
            if field == 'assembly':
                expected = '\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction']
                                     for row in original['instructions']) + '\n'
            else:
                expected = '\n'.join(line.rstrip() for line in source_excerpt(study, original).splitlines()) + '\n'
            require(raw == expected.encode('utf8'), 'Reused original excerpt differs')
            dep_files.append(path)
            refs[field] = '../script-admin-startup/' + refs[field]
        reused[label] = dict(rule, sourceRefs=refs, sourceOwner=dict(package='script-admin-startup', method=label),
                            sourceDependency='scriptAdminStartup', reusedReceipt='../script-admin-startup/native-evidence.json')
    dependency = dict(path='../script-admin-startup/native-evidence.json',
        bytes=len(dep_raw['native-evidence.json']), sha256=sha(dep_raw['native-evidence.json']),
        methods=list(REUSED), contextualCallers=['propertyIdSetGuid'],
        runtimeRules=dict(path='../script-admin-startup/runtime-rules.json',
                         bytes=len(dep_raw['runtime-rules.json']), sha256=sha(dep_raw['runtime-rules.json'])),
        canonicalColdImage=dict(group='coldGlobals', label='guidNullPayload', module='SharedBase',
                                address='101ab150', bytes=16, sha256=cold['guidNullPayload']['sha256'],
                                independentLiveAllocationAllowed=False))
    call_sites = []
    for caller, callee, address in [('propertyIdSetGuid', 'guidIsNull', 0x10092b5c),
                                  ('guidIsNull', 'guidEqualsRaw', 0x1001271f)]:
        method = by_label[caller]
        row = next(row for row in method['instructions'] if int(row['va'], 16) == address)
        raw = bytes.fromhex(row['bytes'])
        caller_rule = focused_rules['methods'][caller]
        require(row == linkage_rows[address] and caller_rule['body'] == method['bodyVA'][2:] and
                caller_rule['entry'] == method['entryVA'][2:] and
                caller_rule['bodyInstructionBytesSha256'] == method['bodyInstructionBytesSha256'] and
                raw[0] == 0xe8 and pe.bytes(address, len(raw)) == raw and
                address + 5 + struct.unpack('<i', raw[1:])[0] == int(reused[callee]['entry'], 16),
                'Actual focused callsite linkage differs')
        call_sites.append(dict(row, module='SharedBase', caller=caller, callee=callee,
            callerEntry=method['entryVA'][2:], callerBody=method['bodyVA'][2:],
            callerBodyInstructionBytesSha256=method['bodyInstructionBytesSha256'],
            sourceOwner=dict(package='script-admin-startup', method=caller), sourceDependency='scriptAdminStartup'))

    operands = {row['va']: row for method in methods for row in method['instructions']}
    traversal_pins = []
    for address, expected in [(0x100aa65a, '6878560e10'), (0x100aa65f, '685c540e10'),
                              (0x100aa664, 'e814feffff'), (0x100aa66d, '7554'),
                              (0x100aa67b, 'be00500e10'), (0x100aa682, 'bf58530e10')]:
        row = operands[f'{address:08x}']
        require(row['bytes'] == expected, 'Original contextual table operand differs')
        traversal_pins.append(row)
    order = [('100e1470', 'load', 'eax', 'guidNullSourceLiteral', 0),
             ('100e1475', 'load', 'ecx', 'guidNullSourceLiteral', 4),
             ('100e147b', 'load', 'edx', 'guidNullSourceLiteral', 8),
             ('100e1481', 'store', 'eax', 'guidNullPayload', 0),
             ('100e1486', 'load', 'eax', 'guidNullSourceLiteral', 12),
             ('100e148b', 'store', 'ecx', 'guidNullPayload', 4),
             ('100e1491', 'store', 'edx', 'guidNullPayload', 8),
             ('100e1497', 'store', 'eax', 'guidNullPayload', 12)]
    operations = [dict(va=va, operation=op, register=reg, storage=storage_label,
                       offset=offset, bytes=4) for va, op, reg, storage_label, offset in order]
    operations.append(dict(va='100e149c', operation='return'))
    predecessors = [dict(entry, nativeRuntimeOwnerAdmitted=False, transitivePrerequisitesImplemented=False,
        originalCatalogPresent=entry['target'] in catalog,
        originalAssemblyEntryPresent=int(entry['target'], 16) in entry_presence,
        bodyCapturedByThisPackage=False) for entry in tables['cppInitializers']['nonNullCallbacks'][:3]]
    discrepancies = [dict(method='inittermE', source='original reconstructed C',
        originalDeclaration='void __initterm_e(undefined4 *param_1,undefined4 *param_2)',
        assemblyReturnRegister='eax', caller='cinit', callerResultTestAddress='100aa669',
        nonzeroResultBranchAddress='100aa66d', reconstructedSourceModified=False,
        semanticAuthority='Original ASM supplies callback result, return-register and short-circuit behavior; contextual owner remains unimplemented')]
    require(operands['100aa669']['instruction'] == 'TEST EAX,EAX' and
            'void __initterm_e(undefined4 *param_1,undefined4 *param_2)' in
            source_excerpt(study, next(method for method in methods if method['label'] == 'inittermE')),
            'Original C/ASM return discrepancy differs')
    layouts = dict(guidNull=dict(payloadBytes=16, source='guidNullSourceLiteral', destination='guidNullPayload',
        validBytePresent=False, validityOrPaddingExtentEstablished=False, physicalObjectSizeEstablished=False,
        initialColdZeroIsInitializedState=False, initializerMethod='guidNullInitializer',
        nativeGuardPresent=False, selectedInitializerRegistersCleanup=False,
        selectedInitializerCallsDestructor=False, initializerDwordOperations=operations))
    startup = dict(selectedGuidNullInitializer=selected, wholeTableExecuted=False,
        priorCallbacksExecuted=False, selectedBodyExecuted=False, crtTraversalImplemented=False,
        contextualMethodsImplemented=False, precedingCppCallbacks=predecessors,
        cCallbacksExecuted=False, canonicalLiveImageEstablished=False)
    summary = dict(selectedMethods=3, instructions=74, bodyBytes=223,
        uniqueInstructionCount=len({row['va'] for method in methods for row in method['instructions']}),
        byteMismatchCount=0, completeSelectedBodyExtents=True, allSelectedInstructionBytesMatchOriginalPE=True,
        recoveredPEInstructions=0, asmOnlyMethods=1, reconstructedCExcerpts=2,
        reusedMethods=3, reusedInstructions=79, reusedBodyBytes=193, reusedCallSites=2,
        cppSlots=214, cppNonNullCallbacks=17, cSlots=135, cNonNullCallbacks=5, tableBytes=1396,
        sourceExcerptNormalization=NORMALIZATION, nativeCodeExecuted=False, liveProcessStateCaptured=False,
        fullSharedCrtTraversalImplemented=False)
    rules = dict(schema='gothic3-shared-guid-null-rules-v1', inputs=INPUTS, methods=rules_methods,
        reusedMethods=reused, dependencies=dict(scriptAdminStartup=dependency),
        coldGlobals=cold, constBytes=constants, initializerTables=table_summaries,
        callSites=call_sites, traversalOperandPins=traversal_pins, sourceDiscrepancies=discrepancies,
        layouts=layouts, startup=startup,
        scope='Static source evidence for one explicitly selected initializer; CRT traversal and live canonical image remain unimplemented')
    evidence = dict(schema='gothic3-shared-guid-null-evidence-v1', inputs=INPUTS,
        moduleHeader=module_header,
        modules=dict(SharedBase={key: value for key, value in audit.items() if key != 'methods'}),
        originalSymbolsSha256=sha(symbols_raw), methods=methods, reusedMethods=reused,
        dependencies=rules['dependencies'], coldGlobals=cold, constBytes=constants,
        initializerTables=table_summaries, callSites=call_sites, traversalOperandPins=traversal_pins,
        directOperandReferences=dict(rows=direct_refs, absoluteOperandSearchOnly=True,
                                     wholeMemoryWriterClosureProven=False),
        sourceDiscrepancies=discrepancies, layouts=layouts, startup=startup, audit=summary)
    (out / 'runtime-rules.json').write_bytes(encode(rules))
    (out / 'native-evidence.json').write_bytes(encode(evidence))
    (out / 'README.md').write_text(
        '# Original Shared GUIDNull source\n\n'
        'Offline capture of three original bodies: 74 instructions and 223 bytes. '
        'The GUIDNull initializer 100e1470 is existing ASM-only evidence (9 instructions, 45 bytes); '
        'no catalog/C gap is called recovered. __cinit and __initterm_e are contextual evidence.\n\n'
        'The original reconstructed __initterm_e C declaration is void, while original assembly returns '
        'the callback result in EAX and __cinit tests that result. The unchanged C excerpt retains this '
        'discrepancy; assembly supplies the return and short-circuit behavior for any future owner.\n\n'
        'Both original initializer tables retain all physical slots: C++ 214/856 bytes and C 135/540 bytes. '
        'GUIDNull occupies C++ index 132, slot 100e5210, nonzero ordinal 4 with three earlier nonzero callbacks. '
        'No callback or complete traversal is executed by this producer.\n\n'
        'The initializer loads the first three source DWORDs, stores destination+0, loads source+12, '
        'then stores destination+4, +8 and +12. The source 100ebb28 is a file-backed 16-byte constant. '
        'Destination 101ab150 is a mutable 16-byte cold loader-zero-filled range; cold zeros do not '
        'establish live initialized state or a 20-byte bCGuid object. This initializer has no native '
        'guard, allocation, imported call, atexit registration or destructor call.\n\n'
        'Three focused IsNull/Equals/destructor receipts are reused by pinned dependency/source references '
        '(79 instructions, 193 bytes), without duplicate bodies or excerpts. SetGuid-to-IsNull and '
        'IsNull-to-Equals native callsites remain explicit. The selected slot is a slice of its table; '
        'the focused cold payload and this receipt describe the same future canonical address.\n\n'
        'Admission still requires a canonical Shared image registry tied to the actual RuntimePlatform, '
        'successful selected initializer execution and retained lifetime/mask checks before supplying '
        'host.guidNullPayload. Both literal-first and registry-first acquisition must resolve the same '
        'backings. Future larger image ranges require segmented resolution or an explicit unsupported '
        'overlap boundary; separately allocated TypedArray fragments cannot be enlarged/adopted into a '
        'single contiguous backing without changing identity. Mutable payloads must not be reseeded. '
        'Earlier C/C++ callbacks, whole Shared/Game CRT traversal, factory/root/accessor owners and '
        'native module creation remain outside this package.\n', encoding='utf8', newline='\n')

    records = []
    for path in sorted(out.rglob('*')):
        if path.is_file() and path.name != 'source-manifest.json':
            records.append(dict(path=ARTIFACT + '/' + path.relative_to(out).as_posix(), location='output',
                                bytes=path.stat().st_size, sha256=sha(path.read_bytes())))
    producer = Path(__file__).resolve()
    records.append(dict(path='tools/gothic3/prepare_shared_guid_null_source.py', location='producer',
                        bytes=producer.stat().st_size, sha256=sha(producer.read_bytes())))
    helper_files = set()
    for module in list(sys.modules.values()):
        path = getattr(module, '__file__', None)
        if path:
            candidate = Path(path).resolve()
            if candidate != producer and candidate.parent == repo / 'tools/gothic3' and candidate.suffix == '.py':
                helper_files.add(candidate)
    for path in sorted(helper_files | set(dep_files)):
        records.append(dict(path=path.relative_to(repo).as_posix(), location='repo',
                            bytes=path.stat().st_size, sha256=sha(path.read_bytes())))
    manifest = dict(schema='gothic3-shared-guid-null-source-manifest-v1', inputs=INPUTS, audit=summary,
        artifactPath=ARTIFACT, sourceLocationsExplicit=True, manifestSelfReferenceExcluded=True,
        checksActuallyPerformed=['Original Shared PE/CSV/C/ASM hashes and selected instruction/extents audit',
            'Existing ASM-only initializer provenance and exact ordered operand audit',
            'Complete original initializer tables/slot and source/cold storage provenance audit',
            'Reused focused method/source/dependency and actual native callsite audit'],
        noTestsOrBuildRunByProducer=True, files=sorted(records, key=lambda record: record['path']))
    (out / 'source-manifest.json').write_bytes(encode(manifest))
    return summary


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--repo', type=Path, required=True, help='Read-only repository supplying current audited helpers/dependencies')
    parser.add_argument('--output', type=Path, required=True, help='Explicit artifact output; use an external draft directory during review')
    args = parser.parse_args()
    print(json.dumps(prepare(args.study.resolve(), args.repo.resolve(), args.output.resolve())))
