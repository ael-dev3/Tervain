"""Capture bounded original ScriptAdmin static-startup source, offline only.

The Game CRT package owns the real callbacks and canonical Game image storage.
This package captures their type/wrapper/accessor/native-construction graph.
No DLL is executed, no study file is edited and no live process is inspected.
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

import read_dialogue_native_evidence as native
from prepare_crt_undname_source import encode, verify_extents
from prepare_runtime_admin_source import image_bytes, source_excerpt

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/gothic3/script-admin-startup'
NORMALIZATION = 'rstrip-line-whitespace; LF line endings; final newline'
INPUTS = {
    'Game': 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f',
    'SharedBase': '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214',
    'Engine': 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3',
}
GAME = {
    'typeSingleton': 0x2001a311, 'cloneWrapper': 0x200108a7,
    'initializeWrapper': 0x200277ff, 'initializeNative': 0x200151b3,
    'nativeConstructor': 0x200098bd, 'setNative': 0x2001ba54,
    'rootGetter': 0x20033f14, 'typeGetFactory': 0x2000fb05,
    'typeGetFactoryConst': 0x200334b0, 'baseClassName': 0x2002f1df,
    'typePropertyCount': 0x2002c421, 'typePropertyAt': 0x200368d6,
    'typeClassTemplate': 0x200227af, 'typeClassNameHelper': 0x200192db,
    'typeDeletingDestructor': 0x2001daed, 'wrapperDeletingDestructor': 0x200205bd,
    'wrapperDestroy': 0x20005489, 'smartptrDestructor': 0x20033a46,
    'wrapperGetNative': 0x2000d5b2,
    'scriptAdminCreate': 0x20017670, 'scriptAdminClearDllList': 0x2002b373,
    'processingCtor': 0x2002c313, 'processingInvalidate': 0x200295f5,
    'processingElementConstruct': 0x203502c0,
    'mapCtor0': 0x203553d0, 'mapCtor1': 0x20355430, 'mapCtor2': 0x20355490,
    'mapCtor3': 0x203554f0, 'mapCtor4': 0x20355550,
    'mapGrow0': 0x2000fd3a, 'mapGrow1': 0x200246f9, 'mapGrow2': 0x20018601,
    'mapGrow3': 0x2002378b, 'mapGrow4': 0x200241e5,
}
SHARED = {
    'creatorPropertyIdName': 0x10002ee1, 'queryNewObject': 0x10007036,
    'factoryClone': 0x10007ec8, 'propertyClone': 0x100056e6,
    'registerPropertyObject': 0x10006db6, 'typeBaseCtor': 0x10006997,
    'factoryCtor': 0x10002649, 'singletonGetInstance': 0x10004fd4,
    'registerTemplate': 0x1000191f, 'propertyWrapperCtor': 0x10007130,
    'creatorWrapperCtor': 0x100068b6, 'accessorPropertyCtor': 0x10005e48,
    'accessorPropertyDtor': 0x10001712, 'creatorDtor': 0x10007356,
    'propertyIdDtor': 0x10007dab, 'propertyIdGuidCtor': 0x1000459d,
    'guidTextCtor': 0x10001528, 'guidDtor': 0x100015cd,
    'registrationEnabled': 0x10001f23, 'propertyIsRoot': 0x100058a3,
    'templateMapFind': 0x100019d8, 'singletonCtor': 0x10004aac,
    'templateMapInsert': 0x1000153c, 'classNameHash': 0x10002c7a,
    'cstringEqual': 0x10002eb9, 'factoryArrayAppend': 0x10007798,
    'factoryArrayRemove': 0x10006122, 'factoryArrayInsert': 0x10007d92,
    'factoryArrayGrow': 0x100035f8, 'singletonEnableRegistration': 0x100020e5,
    'singletonGetRootObject': 0x100085e9, 'factoryUnregister': 0x10004db3,
    'propertyDestroy': 0x10003922, 'propertyDtor': 0x10008012,
    'factoryDtor': 0x10002f86, 'typeBaseDtor': 0x10001e1a,
    'addVirtualRef': 0x10004ea3, 'getNativeRefCount': 0x10004e99,
    'setPropertyObject': 0x100030da, 'releaseVirtualRef': 0x1000235b,
    'getPropertyObject': 0x10008a67, 'accessorIsValid': 0x100083b9,
    'creatorIsValid': 0x1000664a, 'accessorGetType': 0x10003049,
    'accessorIncrement': 0x10008cba, 'singletonMapCtor': 0x10001c49,
    'singletonMapReset': 0x10005cdb, 'singletonMapGrow': 0x1000799b,
    'singletonDtor': 0x10006654, 'propertyAddRef': 0x10004b74,
    'propertyReleaseRef': 0x10006636, 'typeDestroy': 0x10005a0b,
    'nativePostInitialize': 0x100076f8,
    'guidSetText': 0x10008175, 'guidIsValid': 0x10006abe,
    'guidGetGuid': 0x10008201, 'guidGetGuidConst': 0x10008be3,
    'guidIsNull': 0x10003fd0, 'propertyIdSetGuid': 0x100053e9,
    'cstringEqualsText': 0x10005ffb, 'cstringGetText': 0x100044a3,
    'guidEqualsRaw': 0x100075f4, 'cstringCompareText': 0x10004bfb,
}
VTABLES = {
    'scriptAdminPropertyTypeVtable': ('Game', 0x2069b6fc, 40),
    'scriptAdminWrapperVtable': ('Game', 0x2069b734, 68),
    # Only the prefix through PostInitializeProperties+0x40 is selected.
    'scriptAdminNativeVtablePrefix': ('Game', 0x2069bebc, 68),
}
CANONICAL_GAME = {
    'scriptAdminStartupObjects': ('coldGlobals', '207cbf04', 40),
    'scriptAdminPropertyTypeAndGuard': ('coldGlobals', '207cbe78', 64),
    'scriptAdminRootLookupCacheGuard': ('coldGlobals', '207cbe68', 8),
    'scriptAdminPropertyIdLiteral': ('constBytes', '2069c090', 39),
    'scriptAdminRootInitializerSlot': ('constBytes', '205faf54', 4),
    'scriptAdminPropertyIdInitializerSlot': ('constBytes', '205faf58', 4),
    'scriptAdminAccessorInitializerSlot': ('constBytes', '205faf5c', 4),
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def follow(pe: native.PE, entry: int) -> tuple[int, list[dict]]:
    chain = []
    current = entry
    while pe.bytes(current, 5)[0] == 0xe9:
        raw = pe.bytes(current, 5)
        target = current + 5 + struct.unpack_from('<i', raw, 1)[0]
        chain.append(dict(va=f'{current:08x}', bytes=raw.hex(), targetVA=f'{target:08x}'))
        current = target
        require(len(chain) < 12, 'Original entry chain exceeds bound')
    return current, chain


def named_exports(pe: native.PE) -> dict[str, int]:
    rva, size = struct.unpack_from('<II', pe.data, pe.optional + 96)
    if not rva or not size:
        return {}
    table = pe.bytes(pe.base + rva, 40)
    count, names, functions, name_table, ordinal_table = struct.unpack_from('<IIIII', table, 20)
    result = {}
    for index in range(names):
        name_rva = struct.unpack('<I', pe.bytes(pe.base + name_table + index * 4, 4))[0]
        ordinal = struct.unpack('<H', pe.bytes(pe.base + ordinal_table + index * 2, 2))[0]
        require(ordinal < count, 'Original export ordinal exceeds table')
        target = struct.unpack('<I', pe.bytes(pe.base + functions + ordinal * 4, 4))[0]
        require(not rva <= target < rva + size, 'Forwarded export requires a separate owner')
        result[pe.string(pe.base + name_rva)] = pe.base + target
    return result


def singleton_cleanup(study: Path, pe: native.PE) -> dict:
    """An original ASM-only body, not a PE-recovered missing instruction."""
    start, end = 0x100e30a0, 0x100e30a9
    path = study / '01_Decompiled_Code/SharedBase_dll'
    with (path / 'functions.csv').open(encoding='utf-8-sig', newline='') as stream:
        require(f'{start:08x}' not in {row['address'] for row in csv.DictReader(stream)},
                'Singleton cleanup now has catalog provenance')
    rows = []
    pattern = re.compile(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)')
    with (path / 'full_disassembly.asm').open('rb') as stream:
        for number, line in enumerate(stream, 1):
            match = pattern.fullmatch(line.rstrip(b'\r\n'))
            if not match or not start <= int(match[1], 16) <= end:
                continue
            address = int(match[1], 16)
            raw = bytes.fromhex(match[2].decode())
            require(pe.bytes(address, len(raw)) == raw, 'Singleton cleanup ASM/PE mismatch')
            rows.append(dict(va=f'{address:08x}', rva=f'{address-pe.base:x}',
                fileOffset=pe.offset(address, len(raw)), bytes=raw.hex(),
                instruction=match[3].decode('utf8'), assemblyLine=number))
    require([row['bytes'] for row in rows] == ['b9c0482f10', 'e9aa35f2ff'],
            'Original singleton cleanup extent differs')
    return dict(label='propertySingletonCleanup', entryVA='0x100e30a0', bodyVA='0x100e30a0',
        entryChain=[], bodyRanges='100e30a0-100e30a9', instructions=rows,
        sourceCGap=True, sourceASMGap=False,
        selection='Existing original ASM-only atexit cleanup; no fabricated catalog or C')


def emit_method(study: Path, pe: native.PE, module: str, method: dict) -> dict:
    verify_extents(pe, method)
    rows = method['instructions']
    raw = b''.join(bytes.fromhex(row['bytes']) for row in rows)
    method.update(module=module, instructionCount=len(rows), bodyByteCount=len(raw),
                  bodyInstructionBytesSha256=sha(raw))
    folder = OUT / 'sources' / module
    folder.mkdir(parents=True, exist_ok=True)
    body = method['bodyVA'][2:]
    asm = folder / (body + '.asm.txt')
    asm.write_text('\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction']
                             for row in rows) + '\n', encoding='utf8', newline='\n')
    refs = dict(assembly=asm.relative_to(OUT).as_posix(), assemblySha256=sha(asm.read_bytes()))
    if 'reconstructedC' in method:
        path = folder / (body + '.c.txt')
        text = '\n'.join(line.rstrip() for line in source_excerpt(study, method).splitlines()) + '\n'
        path.write_text(text, encoding='utf8', newline='\n')
        refs.update(c=path.relative_to(OUT).as_posix(), cSha256=sha(path.read_bytes()),
                    cNormalization=NORMALIZATION)
    method['sourceRefs'] = refs
    result = dict(module=module, entry=method['entryVA'][2:], body=body,
        bodyRanges=method['bodyRanges'], instructionCount=len(rows), bodyBytes=len(raw),
        bodyInstructionBytesSha256=sha(raw), entryChain=method['entryChain'], sourceRefs=refs)
    for key in ['sourceCGap', 'sourceASMGap', 'selection']:
        if key in method:
            result[key] = method[key]
    return result


def storage(pe: native.PE, module: str, address: int, size: int, constant: bool = False) -> dict:
    raw, section = image_bytes(pe, address, size)
    require(not constant or section['loaderZeroFillBytes'] == 0, 'Constant slice must be file-backed')
    return dict(module=module, address=f'{address:08x}', bytes=size, raw=raw.hex(), knownMask='ff' * size,
        sha256=sha(raw), section=section, allZero=not any(raw), liveValueCaptured=False,
        scope='original-file-backed-constant' if constant else 'cold-original-image')


def prepare(study: Path) -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    pes = {module: native.PE((study / '00_Original_Runtime' / (module + '.dll')).read_bytes())
           for module in INPUTS}
    for module, pe in pes.items():
        require(sha(pe.data) == INPUTS[module], 'Original module hash differs: ' + module)
        native.EXPECTED_INPUTS[module + '.dll'] = INPUTS[module]
    audits, methods, rules_methods = {}, [], {}
    for module, selection in [('Game', GAME), ('SharedBase', SHARED)]:
        require(len(set(selection.values())) == len(selection), 'Duplicate original source selection')
        audit = native.audit_module(study, module + '_dll', module + '.dll',
                                    {address: label for label, address in selection.items()})
        audit.pop('constants', None)
        audit.pop('tables', None)
        if module == 'SharedBase':
            audit['methods'].append(singleton_cleanup(study, pes[module]))
        audits[module] = audit
        for method in audit['methods']:
            require(method['label'] not in rules_methods, 'Duplicate method label')
            rules_methods[method['label']] = emit_method(study, pes[module], module, method)
            methods.append(method)
    require(len(methods) == 98 and sum(len(m['instructions']) for m in methods) == 2552 and
            sum(m['bodyByteCount'] for m in methods) == 7146, 'Bounded startup source selection differs')

    crt_path = ROOT / 'assets/gothic3/game-crt/runtime-rules.json'
    crt_raw = crt_path.read_bytes()
    crt = json.loads(crt_raw)
    require(crt['schema'] == 'gothic3-game-crt-rules-v1' and crt['inputs']['Game'] == INPUTS['Game'],
            'Canonical Game CRT dependency differs')
    canonical = {}
    for label, (group, address, size) in CANONICAL_GAME.items():
        receipt = crt[group][label]
        expected = storage(pes['Game'], 'Game', int(address, 16), size, group == 'constBytes')
        require(receipt == expected, 'Canonical Game receipt differs: ' + label)
        canonical[label] = dict(package='game-crt', group=group, label=label,
            module='Game', address=address, bytes=size, sha256=receipt['sha256'])
    cold = dict(propertySingletonAndGuard=storage(pes['SharedBase'], 'SharedBase', 0x102f48c0, 40),
                guidNullPayload=storage(pes['SharedBase'], 'SharedBase', 0x101ab150, 16))
    require(cold['propertySingletonAndGuard']['allZero'], 'Cold Shared singleton image differs')
    constants = {label: storage(pes[module], module, address, size, True)
                 for label, (module, address, size) in VTABLES.items()}
    constants.update(guidEmptyLiteral=storage(pes['SharedBase'], 'SharedBase', 0x100e5e10, 3, True),
                     emptyCStringText=storage(pes['SharedBase'], 'SharedBase', 0x100e5e3c, 1, True))
    require(constants['guidEmptyLiteral']['raw'] == '7b7d00' and
            constants['emptyCStringText']['raw'] == '00' and cold['guidNullPayload']['allZero'],
            'Original GUID/CString empty/null source slices differ')
    vtable_slots = {label: {str(offset): f'{struct.unpack_from("<I", bytes.fromhex(receipt["raw"]), offset)[0]:08x}'
                    for offset in range(0, receipt['bytes'], 4)} for label, receipt in constants.items()
                    if label in VTABLES}

    all_imports = {module: {int(row['iatVA'], 16): row for row in pe.imports()}
                   for module, pe in pes.items()}
    exports = {module: named_exports(pe) for module, pe in pes.items()}
    by_body = {(method['module'], method['body']): label for label, method in rules_methods.items()}
    needed = {module: set() for module in INPUTS}
    for method in methods:
        needed[method['module']].update(int(value, 16) for row in method['instructions']
            for value in re.findall(r'\[0x([0-9a-f]{8})\]', row['instruction'])
            if int(value, 16) in all_imports[method['module']])
    vtable_bindings = {}
    for label, slots in vtable_slots.items():
        module = VTABLES[label][0]
        bindings = {}
        for offset, target in slots.items():
            address = int(target, 16)
            body, chain = follow(pes[module], address)
            item = dict(module=module, originalTarget=target, entryChain=chain,
                        body=f'{body:08x}', selectedMethod=by_body.get((module, f'{body:08x}')))
            raw = pes[module].bytes(body, 6)
            if raw[:2] == b'\xff\x25':
                slot = struct.unpack_from('<I', raw, 2)[0]
                require(slot in all_imports[module], 'Original vtable import thunk has no import')
                needed[module].add(slot)
                item.update(importThunkAddress=f'{body:08x}', importThunkBytes=raw.hex(),
                            importBinding=module + ':' + f'{slot:08x}')
            bindings[offset] = item
        vtable_bindings[label] = bindings
    import_bindings, imports = {}, {}
    for module, addresses in needed.items():
        imports[module] = [all_imports[module][address] for address in sorted(addresses)]
        for address in sorted(addresses):
            receipt = all_imports[module][address]
            owner = receipt['module'].removesuffix('.dll')
            item = dict(module=module, iatVA=f'{address:08x}', importModule=receipt['module'],
                        decoratedName=receipt['name'], ordinal=receipt['ordinal'],
                        originalIATBytes=pes[module].bytes(address, 4).hex(), liveImportTargetCaptured=False)
            if owner in exports and receipt['name'] in exports[owner]:
                entry = exports[owner][receipt['name']]
                body, chain = follow(pes[owner], entry)
                item.update(targetModule=owner, exportEntry=f'{entry:08x}', entryChain=chain,
                            body=f'{body:08x}', selectedMethod=by_body.get((owner, f'{body:08x}')),
                            resolution='original named import/export and PE thunk proof')
            else:
                item.update(resolution='external platform service; never executed')
            import_bindings[module + ':' + f'{address:08x}'] = item
    require(import_bindings['SharedBase:102f963c']['importModule'] == 'KERNEL32.dll' and
            import_bindings['SharedBase:102f963c']['decoratedName'] == 'MultiByteToWideChar' and
            import_bindings['SharedBase:102f9a30']['importModule'] == 'ole32.dll' and
            import_bindings['SharedBase:102f9a30']['decoratedName'] == 'IIDFromString',
            'Original GUID text platform import identities differ')

    aliases = {}
    for label, entry in [('typeClassName', 0x20031c14), ('wrapperClassName', 0x2003682c)]:
        body, chain = follow(pes['Game'], entry)
        require(body == int(crt['methods']['scriptAdminClassName']['body'], 16) and chain,
                'Original ScriptAdmin class-name alias differs')
        aliases[label] = dict(module='Game', entry=f'{entry:08x}', body=f'{body:08x}', entryChain=chain,
            sourceOwner=dict(package='game-crt', method='scriptAdminClassName'),
            bodyInstructionBytesSha256=crt['methods']['scriptAdminClassName']['bodyInstructionBytesSha256'])
    layouts = dict(
        wrapper=dict(bytes=16, offsets=dict(vtable=0, flags=4, nativePointer=8, typePointer=12),
                     rootMask=1, allocationTag=400, cloneSlot=56, copySlot=60),
        propertyType=dict(bytes=24, factoryOffset=24, factoryAccessedExtentBytes=24,
                          factorySpanToGuard=36, factoryUnclassifiedTailBytes=12, guardOffset=60,
                          getFactorySlot=12, propertyCountSlot=16, propertyAtSlot=20),
        factory=dict(accessedExtentBytes=24, spanToGuard=36, unclassifiedTailBytes=12,
            extentScope='Selected original factory constructor/destructor accessed prefix; sizeof unproven',
            extentMethods=['factoryCtor', 'factoryDtor'],
            offsets=dict(vtable=0, arrayPointer=4, count=8, capacity=12, referenceField=16, className=20)),
        accessor=dict(bytes=4, wrapperPointerOffset=0, propertyIdArgumentReadByCreator=False),
        guid=dict(physicalBytes=20, payloadOffset=0, payloadBytes=16, validByteOffset=16,
            nullPayloadStorage='guidNullPayload', emptyLiteralStorage='guidEmptyLiteral',
            setTextMethod='guidSetText', codePage=0, conversionFlags=0, sourceCharacters=-1,
            wcharBytes=2, iidSuccessHRESULT=0, guidParserExecuted=False),
        propertyId=dict(bytes=20, payloadOffset=0, payloadBytes=16, referenceFieldOffset=16,
                        setGuidMethod='propertyIdSetGuid'),
        singleton=dict(storage='propertySingletonAndGuard', physicalBytes=40,
            offsets=dict(vtable=0, registrationEnabled=4, registrationOwner=8, map=12, guard=36),
            mapHeaderOffsets=dict(pointer=0, count=4, capacity=8, nodeCount=12),
            initialBuckets=43, resetBuckets=43, finalBuckets=359, growthMinimum=8, growthMaximum=1024),
        native=dict(bytes=520, allocationTag=196, vtable='scriptAdminNativeVtablePrefix',
            createSlot=24, postInitializeSlot=64, moduleRegisterSlot=116,
            processingUnitOffset=20, mapOffsets=[432, 448, 464, 480, 496],
            constructorZeroDwordOffsets=[420, 424, 428, 512, 516]),
    )
    calls = {method['label']: [dict(va=row['va'], instruction=row['instruction'])
             for row in method['instructions'] if row['instruction'].startswith(('CALL ', 'JMP '))]
             for method in methods}
    dependency = dict(path='../game-crt/runtime-rules.json', bytes=len(crt_raw), sha256=sha(crt_raw),
        canonicalImages=canonical, methods=['scriptAdminClassName', 'atexit', 'scriptAdminRootInitializer',
            'scriptAdminPropertyIdInitializer', 'scriptAdminAccessorInitializer', 'scriptAdminRootCleanup',
            'scriptAdminPropertyIdCleanup', 'scriptAdminAccessorCleanup', 'scriptAdminTypeCleanup'])
    summary = dict(selectedMethods=len(methods), instructions=sum(len(m['instructions']) for m in methods),
        bodyBytes=sum(m['bodyByteCount'] for m in methods),
        uniqueInstructionCount=len({(m['module'], row['va']) for m in methods for row in m['instructions']}),
        byteMismatchCount=0, completeSelectedBodyExtents=True, allSelectedInstructionBytesMatchOriginalPE=True,
        recoveredPEInstructions=0, asmOnlyMethods=1, vtableSlices=len(VTABLES),
        vtableWords=sum(len(slots) for slots in vtable_slots.values()), exactImportBindings=len(import_bindings),
        sourceExcerptNormalization=NORMALIZATION, nativeCodeExecuted=False, liveProcessStateCaptured=False,
        fullStartupClosureImplemented=False)
    rules = dict(schema='gothic3-script-admin-startup-rules-v1', inputs=INPUTS,
        methods=rules_methods, coldGlobals=cold, constBytes=constants, vtableSlots=vtable_slots,
        vtableBindings=vtable_bindings, imports=imports, importBindings=import_bindings,
        entryAliases=aliases, dependencies=dict(gameCrt=dependency), layouts=layouts,
        callInventory=calls, startup=dict(callbacks=crt['initializerTables']['cppInitializers']['selectedScriptAdminInitializers'],
            callbacksExecuted=False, propertyFactoryInstantiated=False, nativeModuleInstantiated=False),
        scope='Bounded source receipts; original earlier callbacks and reached source/platform owners remain required')
    evidence = dict(schema='gothic3-script-admin-startup-evidence-v1', inputs=INPUTS,
        modules={module: {key: value for key, value in audit.items() if key != 'methods'}
                 for module, audit in audits.items()}, methods=methods, coldGlobals=cold, constBytes=constants,
        vtableSlots=vtable_slots, vtableBindings=vtable_bindings, imports=imports, importBindings=import_bindings,
        entryAliases=aliases, dependencies=rules['dependencies'], layouts=layouts, audit=summary)
    (OUT / 'runtime-rules.json').write_bytes(encode(rules))
    (OUT / 'native-evidence.json').write_bytes(encode(evidence))
    (OUT / 'README.md').write_text(
        '# Original ScriptAdmin static-startup source\n\n'
        'Offline capture of 98 original bodies, 2552 instructions and 7146 instruction bytes. '
        'Every selected body extent and byte is checked against the immutable original PE. '
        'The Shared singleton cleanup is existing ASM-only evidence; no C or ASM gap is called recovered.\n\n'
        'Game CRT owns the original callbacks, their real table order and canonical Game image ranges. '
        'This package captures the Game wrapper/type/clone graph, Shared accessor/template/factory graph '
        'and selected native constructor/processing/map continuation. Vtable bytes, decimal slot offsets, '
        'import/export thunk chains and class-name aliases are explicit receipts.\n\n'
        'The selected factory constructor/destructor access a 24-byte prefix. The factory start '
        'is 36 bytes before its guard; the remaining 12 bytes are unclassified. Neither extent '
        'establishes the complete factory sizeof. The canonical type/factory/guard capture remains 64 bytes.\n\n'
        'These receipts do not execute or implement DLL startup. Earlier callbacks, actual allocations, '
        'string storage, descriptor/base-type owners, cleanup paths and platform services remain required. '
        'GUID text conversion has exact source receipts and import identities; no Win32/OLE call is executed.\n',
        encoding='utf8', newline='\n')
    files = [file for file in OUT.rglob('*') if file.is_file() and file.name != 'source-manifest.json']
    files.append(Path(__file__).resolve())
    for module in list(sys.modules.values()):
        path = getattr(module, '__file__', None)
        if path:
            candidate = Path(path).resolve()
            if candidate.parent == ROOT / 'tools/gothic3' and candidate.suffix == '.py':
                files.append(candidate)
    files.append(crt_path)
    manifest = dict(schema='gothic3-script-admin-startup-source-manifest-v1', inputs=INPUTS, audit=summary,
        checksActuallyPerformed=['Original PE/CSV/C/ASM input hash and selected instruction/extent audit',
            'Original ASM-only cleanup provenance and exact byte audit',
            'Physical image/vtable/import-export/entry-alias and canonical Game CRT dependency audit'],
        noTestsOrBuildRunByProducer=True, manifestSelfReferenceExcluded=True,
        files=[dict(path=file.relative_to(ROOT).as_posix(), bytes=file.stat().st_size,
                    sha256=sha(file.read_bytes())) for file in sorted(set(files))])
    (OUT / 'source-manifest.json').write_bytes(encode(manifest))
    return summary


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.study.resolve())))
