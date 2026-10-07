"""Capture original Game physical calloc / first I/O block source receipts.

Offline evidence only. Full captured bodies, static selected-path ledgers and
declared import ABI do not grant current execution, allocation or frame access.
"""
# SPDX-License-Identifier: GPL-3.0-only
import argparse
import csv
import hashlib
import json
import re
import struct
import sys
from pathlib import Path

sys.dont_write_bytecode = True
SHA = lambda raw: hashlib.sha256(raw).hexdigest()
GAME = 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'
ASSEMBLY = 'fd23430904ab84b03e395bc4a705f5a475cc5816094603350a68e1bc2798f4dc'
CATALOG = '7683e99c3c22688b26c77eafc830f43abab471b9e9d3ca241e3157007c714018'
SYMBOLS = '4e92a5cb597f91d1c2eb661f171a1bb097175094dc32778bd6058676afea3eac'
TARGETS = {0x204683ce: 'callocCrt', 0x20477c2a: 'callocImpl',
    0x20468570: 'sehProlog4', 0x204685b5: 'sehEpilog4', 0x204742ff: 'ioInit'}


def capture(study, repo, output):
    sys.path.insert(0, str(repo / 'tools/gothic3'))
    import read_dialogue_native_evidence as native
    from prepare_runtime_admin_source import image_bytes, source_excerpt
    from prepare_crt_undname_source import verify_extents
    base = study / '01_Decompiled_Code/Game_dll'
    original = (study / '00_Original_Runtime/Game.dll').read_bytes()
    catalog_raw = (base / 'functions.csv').read_bytes()
    symbols_raw = (base / 'symbols.csv').read_bytes()
    assert SHA(original) == GAME and SHA(catalog_raw) == CATALOG and SHA(symbols_raw) == SYMBOLS
    pe = native.PE(original)
    assert pe.base == 0x20000000
    catalog = {r['address']: dict(r, csvLine=line) for line, r in enumerate(
        csv.DictReader(catalog_raw.decode('utf-8-sig').splitlines()), 2)}
    symbols = list(csv.DictReader(symbols_raw.decode('utf-8-sig').splitlines()))
    roots = {name: repo / 'assets/gothic3' / folder for name, folder in [
        ('gameCrt', 'game-crt'), ('continuation', 'game-attach-continuation'),
        ('ioStartup', 'game-io-startup'), ('ioWriter', 'game-io-writer')]}
    prior = {name: json.loads((root / 'runtime-rules.json').read_bytes()) for name, root in roots.items()}
    schemas = {'gameCrt': 'gothic3-game-crt-rules-v1', 'continuation': 'gothic3-game-attach-continuation-rules-v1',
        'ioStartup': 'gothic3-game-io-startup-rules-v1', 'ioWriter': 'gothic3-game-io-writer-rules-v1'}
    for name, rules in prior.items():
        assert rules['schema'] == schemas[name] and rules['inputs']['Game'] == GAME
    dependencies = {name: {file: dict(path=(root / file).relative_to(repo).as_posix(),
        bytes=(root / file).stat().st_size, sha256=SHA((root / file).read_bytes()))
        for file in ['runtime-rules.json', 'native-evidence.json', 'source-manifest.json']}
        for name, root in roots.items()}
    audit = native.audit_module(study, 'Game_dll', 'Game.dll', TARGETS)
    assert audit['assemblySha256'] == ASSEMBLY and audit['functionsCsvSha256'] == CATALOG
    audit.pop('constants', None)
    audit.pop('tables', None)
    assert (len(audit['methods']), sum(m['instructionCount'] for m in audit['methods']),
        sum(m['bodyByteCount'] for m in audit['methods'])) == (5, 337, 995)
    refs = set()
    originals = {study / '00_Original_Runtime/Game.dll', base / 'functions.csv', base / 'symbols.csv', base / 'full_disassembly.asm'}
    methods, points = {}, {}
    for method in audit['methods']:
        verify_extents(pe, method)
        label, body = method['label'], method['bodyVA'][2:]
        package = 'gameCrt' if label in ['callocCrt', 'callocImpl'] else 'continuation'
        old = prior[package]['methods'][label]
        assert (old['entry'], old['body'], old['instructionCount'], old['bodyBytes'], old['bodyInstructionBytesSha256']) == (
            body, body, method['instructionCount'], method['bodyByteCount'], method['bodyInstructionBytesSha256'])
        old_refs = old['sourceRefs']
        old_root = old.get('sourceRefsRoot', roots[package].relative_to(repo).as_posix())
        asm = '\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction'] for row in method['instructions']) + '\n'
        c = '\n'.join(line.rstrip() for line in source_excerpt(study, method).splitlines()) + '\n'
        for kind, text in [('assembly', asm), ('c', c)]:
            path = repo / old_root / old_refs[kind]
            assert path.read_bytes() == text.encode('utf8') and SHA(path.read_bytes()) == old_refs[kind + 'Sha256']
            refs.add(path)
        originals.add(study / method['reconstructedC']['path'])
        method.update(originalCatalog=catalog[body], sourceRefs=old_refs, sourceRefsRoot=old_root,
            sourceOnly=True, runtimeOwnerAdmitted=False, currentLiveValueCaptured=False,
            sourceCGap=False, sourceASMGap=False, originalCatalogGap=False)
        methods[label] = dict(module='Game', entry=body, body=body, bodyRanges=method['bodyRanges'],
            instructionCount=method['instructionCount'], bodyBytes=method['bodyByteCount'], bodyByteCount=method['bodyByteCount'],
            bodyInstructionBytesSha256=method['bodyInstructionBytesSha256'], entryChain=method['entryChain'],
            sourceRefs=old_refs, sourceRefsRoot=old_root, sourceOnly=True, runtimeOwnerAdmitted=False,
            currentLiveValueCaptured=False, sourceCGap=False, sourceASMGap=False, originalCatalogGap=False)
        for row in method['instructions']:
            assert row['va'] not in points
            points[row['va']] = row
    points = dict(sorted(points.items()))

    def image(address, size, scope):
        raw, section = image_bytes(pe, address, size)
        section_base = pe.optional + struct.unpack_from('<H', original, pe.optional - 4)[0]
        index = next(i for i, s in enumerate(pe.sections)
            if s[1] <= address - pe.base and address - pe.base + size <= s[1] + s[0])
        header = section_base + 40 * index
        flags = struct.unpack_from('<I', original, header + 36)[0]
        return dict(module='Game', address=f'{address:08x}', rva=f'{address - pe.base:x}', bytes=size,
            raw=raw.hex(), knownMask='ff' * size, sha256=SHA(raw), section=section,
            originalPESection=dict(name=original[header:header + 8].rstrip(b'\0').decode(),
                headerFileOffset=header, characteristics=f'{flags:08x}', readable=bool(flags & 0x40000000),
                writable=bool(flags & 0x80000000), executable=bool(flags & 0x20000000)),
            fileOffset=pe.offset(address, size) if section['fileBackedBytes'] == size else None,
            scope=scope, sourceOnly=True, runtimeOwnerAdmitted=False,
            liveValueCaptured=False, currentLiveValueCaptured=False)

    cold = {}
    for label, address, size in [('ioBlocks', 0x207d2a20, 256), ('ioHandleCount', 0x207d29c4, 4)]:
        receipt = image(address, size, 'cold-original-image')
        prior_receipt = prior['ioStartup']['coldGlobals'][label]
        for field in receipt:
            assert receipt[field] == prior_receipt[field]
        assert receipt['fileOffset'] is None and receipt['section']['fileBackedBytes'] == 0
        assert receipt['section']['loaderZeroFillBytes'] == size
        receipt['sourceDependency'] = dict(package='assets/gothic3/game-io-startup', label=label)
        receipt['initializationScope'] = 'Original PE loader zero-fill on fresh canonical Game image; never a current live Windows value or later reseed'
        cold[label] = receipt
    scope = image(0x206e8f98, 28, 'original-file-backed-constant')
    assert scope['raw'] == 'feffffff00000000d4ffffff00000000feffffff00000000217d4720'
    assert scope['sha256'] == 'b4056ba5650bfeaed49e6c64e2bd62c27844894baf4fbd62d4ff2ed34b32a454'
    scope['decodedDwords'] = [f'{word:08x}' for word in struct.unpack('<7I', bytes.fromhex(scope['raw']))]
    scope['decodedStructure'] = dict(gsCookieOffset=-2, gsCookieXorOffset=0, ehCookieOffset=-44,
        ehCookieXorOffset=0, tryLevel0=dict(enclosingLevel=-2, filter='00000000', handler='20477d21'))
    constants = {'callocEH4Scope': scope}
    gap = image(0x20477d21, 5, 'original-PE-only-code-with-ASM-C-catalog-gaps')
    assert gap['raw'] == '33ff8b750c' and gap['sha256'] == '81bcb9c51fffd414142b33c8a5671886219a46e4f90d15a4d642fe27a06e86a2'
    assert '20477d21' not in catalog
    gap.update(originalCatalogGap=True, sourceCGap=True, sourceASMGap=True,
        originalInstructions=[], reconstructedC=None, runtimeCallable=False,
        originalSymbols=[dict(row, csvLine=i) for i, row in enumerate(symbols, 2) if row['address'] == '20477d21'])
    c_corpus = []
    for path in sorted((base / 'pseudocode').glob('*.c')):
        data = path.read_bytes()
        assert '/* ENTRY 20477d21 |' not in data.decode('utf8')
        originals.add(path)
        c_corpus.append(dict(path=path.relative_to(study).as_posix(), bytes=len(data), sha256=SHA(data)))
    original_asm_hash, gap_rows = hashlib.sha256(), 0
    with (base / 'full_disassembly.asm').open('rb') as stream:
        for line in stream:
            original_asm_hash.update(line)
            match = re.fullmatch(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', line.rstrip(b'\r\n'))
            if match and 0x20477d21 <= int(match[1], 16) < 0x20477d26:
                gap_rows += 1
    assert original_asm_hash.hexdigest() == ASSEMBLY and gap_rows == 0
    gap_search = dict(sourceOnly=True, query='Original ENTRY/catalog/ASM at 20477d21 and ASM extent [20477d21,20477d26)',
        originalCatalogRecordsFound=0, originalCEntriesFound=0, originalASMRowsFound=0,
        corpusFiles=c_corpus, corpusRecordSha256=SHA((json.dumps(c_corpus, separators=(',', ':')) + '\n').encode()))
    imports = [record for record in pe.imports() if record['iatVA'] in ['0x207d7b84', '0x207d7bbc', '0x207d7c8c']]
    assert sorted((r['iatVA'], r['module'], r['name'], r['ordinal']) for r in imports) == [
        ('0x207d7b84', 'KERNEL32.dll', 'HeapAlloc', None),
        ('0x207d7bbc', 'KERNEL32.dll', 'GetStdHandle', None),
        ('0x207d7c8c', 'KERNEL32.dll', 'Sleep', None)]
    call_sites = {label: points[pc] for label, pc in {
        'ioCallocCall': '20474327', 'wrapperImplCall': '204683dc', 'callocPrologCall': '20477c31',
        'callocHeapAllocCall': '20477ce8', 'callocEpilogCall': '20477d42',
        'callocFinalReturn': '20477d47', 'wrapperFinalReturn': '20468415',
        'ioBlockPublication': '20474336', 'ioHandleCountPublication': '2047433b',
        'ioCurrentBlockReread': '20474366', 'ioStartupWordRead': '20474376',
        'ioGetStdHandleBoundary': '204744b4', 'wrapperSleepContext': '204683f3'}.items()}
    original_entries = {m[field][2:] for m in audit['methods'] for field in ['entryVA', 'bodyVA']}
    edges = []
    for method in audit['methods']:
        for row in method['instructions']:
            match = re.fullmatch(r'(CALL|JMP) 0x([0-9a-f]{8})', row['instruction'])
            if match:
                target = match[2]
                edges.append(dict(caller=method['label'], row=row, target=target, originalCatalog=catalog.get(target),
                    originalBodyCaptured=target in original_entries, sourceOnly=True, runtimeOwnerAdmitted=False))

    def span(first, last):
        return [pc for pc in points if first <= pc <= last]

    wrapper_prefix = span('204683ce', '204683dc')
    impl_prefix = span('20477c2a', '20477c31')
    prolog = span('20468570', '204685b4')
    impl_normal = span('20477c36', '20477c4c') + span('20477c6d', '20477c78') + span('20477c7d', '20477c8e') + \
        span('20477cdb', '20477cf2') + span('20477d40', '20477d42')
    epilog = span('204685b5', '204685c8')
    wrapper_return = span('204683e1', '204683e8') + span('20468411', '20468415')
    callee_path = wrapper_prefix + impl_prefix + prolog + impl_normal + epilog + ['20477d47'] + wrapper_return
    assert len(callee_path) == 85
    caller_path = ['20474327'] + callee_path + span('2047432c', '20474330')
    loop = span('20474349', '20474374')
    assert len(loop) == 12
    tail = span('20474336', '20474347') + ['20474372', '20474374'] + loop * 32 + \
        ['20474376', '2047437a'] + span('2047447d', '2047448f') + span('2047449c', '204744a7') + ['204744b3']
    assert len(caller_path) == 90 and len(tail) == 406
    selected_path = caller_path + tail
    path = dict(sourceOnly=True, runtimeOwnerAdmitted=False, currentLiveValueCaptured=False,
        scope='Static expected mode1 non-NULL HeapAlloc / current cbReserved2=0 path; no observed execution or forced branches',
        calleeOperations=85, callerCallAndCleanupOperations=5, firstBlockTailOperations=406,
        recordIterations=32, recordStrideBytes=56, allocationBytes=1792,
        addedOperations=496, priorOperations=35, totalOperations=531,
        instructionAddresses=selected_path, instructionRowsSha256=SHA((json.dumps(
            [points[pc] for pc in selected_path], separators=(',', ':')) + '\n').encode()),
        nextBoundaryPC='204744b4', nextBoundaryIAT='207d7bbc', nextBoundaryExecuted=False,
        nativeIOCompleted=False, nativeEHDispatchCompleted=False,
        currentHeapModeExpectedButNotCaptured=1, currentReserved2CountExpectedButNotCaptured=0)
    frame = dict(sourceOnly=True, runtimeOwnerAdmitted=False, currentLiveValueCaptured=False,
        addressScope='Original relative stack relationships only; no numerical browser or native runtime VAs captured',
        outerEBPRelativeToInitialESP=-8, outerESPBeforeCallRelativeToOuterEBP=-124,
        ioCallPC='20474327', ioReturnPC='2047432c', wrapperCallPC='204683dc', wrapperReturnPC='204683e1',
        innerEBPRelativeToOuterEBP=-156, innerESPAfterPrologRelativeToInnerEBP=-44,
        innerRegistrationRelativeToInnerEBP=-16, innerCookieRelativeToInnerEBP=-44,
        innerSavedOuterFsRelativeToInnerEBP=-16, innerSavedEspRelativeToInnerEBP=-24,
        innerSavedRegisters={'EBX': -32, 'ESI': -36, 'EDI': -40, 'EBP': 0},
        innerIncomingReturnRelativeToInnerEBP=4, innerCountRelativeToInnerEBP=8,
        innerSizeRelativeToInnerEBP=12, innerErrnoOutRelativeToInnerEBP=16,
        prologReturnPC='20477c36', epilogReturnPC='20477d47',
        heapCallPC='20477ce8', heapReturnPC='20477cee', heapIAT='207d7b84',
        heapCallReturnRelativeToInnerEBP=-60, heapArgumentsBytes=12,
        deepestSelectedStackBytes=224, nestedPrologStackBytes=212,
        innerFinalReturnPC='204683e1', wrapperFinalReturnPC='2047432c',
        afterWrapperReturnESPRelativeToOuterEBP=-124, afterIoArgumentPopsESPRelativeToOuterEBP=-116,
        outerCallerReturnPC='204678d3', outerCallerReturnConsumed=False,
        outerRegistrationRelativeToOuterEBP=-16, outerFsRestoredByInnerEpilogExpected=True,
        innerEpilogCookieCheckPresent=False, sourceCookieAddress='207b2314', sourceScopeAddress='206e8f98',
        nextStandardHandleArgument=-10, nextStandardHandleESPRelativeToOuterEBP=-120)
    abi = dict(scope='Declared virtual Win32 compatibility consistent with original caller; not native Windows callee instructions or current outputs',
        sourceOnly=True, runtimeOwnerAdmitted=False, originalWindowsCalleeCaptured=False, nativeEndpointExecuted=False,
        heapAlloc={'callingConvention': 'stdcall', 'argumentBytes': 12, 'normalReturnPC': '20477cee',
            'normalResult': 'Actual same-Game/Runtime live allocation capability or genuinely owned known NULL',
            'unknownOutcomeIsNormalNull': False, 'normalReturnRequiresActualEndpointOutcome': True,
            'normalUnknownRegisters': ['ECX', 'EDX'], 'normalArithmeticFlags': 'unknown',
            'normalPreservedRegisters': ['EBX', 'ESI', 'EDI', 'EBP'], 'normalPreservedFS': True},
        callocImpl={'callingConvention': 'cdecl', 'callerArgumentBytes': 12},
        callocCrt={'callingConvention': 'cdecl', 'callerArgumentBytes': 8},
        unknownOutcomeGrantsCleanup=False, escapedHostErrorIsNativeException=False)
    record = dict(sourceOnly=True, runtimeOwnerAdmitted=False, currentLiveValueCaptured=False,
        strideBytes=56, recordsExpected=32, zeroingAllocationBytes=1792,
        sourceWrites=[dict(pc=pc, offset=offset, width=width, operation=operation, operand=operand) for pc, offset, width, operation, operand in [
            ('20474349', 4, 1, 'MOV', 0), ('2047434d', 0, 4, 'OR-RMW', 0xffffffff),
            ('20474350', 5, 1, 'MOV', 10), ('20474354', 8, 4, 'MOV-current-EDI', None),
            ('20474357', 36, 1, 'MOV', 0), ('2047435b', 37, 1, 'MOV', 10), ('2047435f', 38, 1, 'MOV', 10)]],
        currentBlockRereadPC='20474366', endOffsetBytes=1792, endIsWritable=False,
        sectionOffset=12, sectionBytes=24, zeroSectionIsInitializedCriticalSection=False,
        standardFirstRecordFlagStorePC='2047449c', standardFirstRecordFlags=129,
        startupCountFieldOffset=50, startupCountFieldWidth=2, startupCountReadPC='20474376',
        inheritedSkipRequiresActualKnownWord=True, sourceBranchExpectationsGrantExecution=False)
    flags = dict(sourceOnly=True, runtimeOwnersImplemented=False, currentLiveValuesCaptured=False,
        wholeIoInitImplemented=False, wholeExceptionDispatchImplemented=False,
        wholeGameAttachOrCrtTraversalImplemented=False, sourceMetadataGrantsExecution=False)
    common = dict(methods=methods, instructionPoints=points, callSites=call_sites, coldGlobals=cold,
        constBytes=constants, peOnlyCode={'callocCleanupEntryPEOnly': gap},
        imports={'Game': imports}, sourceDependencies=dependencies, selectedNormalPath=path,
        frameLayout=frame, declaredCompatibilityABI=abi, ioRecordLayout=record, **flags)
    evidence = dict(schema='gothic3-game-io-allocation-evidence-v1', inputs={'Game.dll': GAME},
        originalModuleAudit=audit, originalCatalogSha256=CATALOG, originalAssemblySha256=ASSEMBLY,
        originalSymbolsSha256=SYMBOLS, originalGapSearch=gap_search, directCallAndTailEdges=edges,
        directCallCaptureScope='Membership in these five exact entry/body source captures; no runtime implementation or execution claim', **common)
    rules = dict(schema='gothic3-game-io-allocation-rules-v1', inputs={'Game': GAME},
        scope='Original source context and declared ABI only; actual current private execution owners are required separately',
        originalGapSearchSummary={key: value for key, value in gap_search.items() if key != 'corpusFiles'}, **common)
    output.mkdir(parents=True, exist_ok=True)
    for name, document in [('native-evidence.json', evidence), ('runtime-rules.json', rules)]:
        (output / name).write_text(json.dumps(document, separators=(',', ':')) + '\n', encoding='utf8', newline='\n')
    readme = '''# Original Game physical calloc and first I/O block source

Reproduce from the repository root, replacing STUDY with the original readonly study:

    python -B scripts/gothic3_game_io_allocation_source.py --study "STUDY" --repo . --output assets/gothic3/game-io-allocation

This four-output supplement reuses the exact full calloc wrapper, callocImpl, SEH prolog/epilog and ioInit C/ASM receipts: five contextual bodies, 337 original rows and 995 instruction bytes. No source listing is duplicated or manufactured. Original PE bytes, body extents, catalog/C ENTRY identities, original ASM line numbers and reused source hashes are checked. Prior Game CRT, continuation, io-startup and io-writer packages remain read-only and unchanged.

callocEH4Scope206e8f98 is the original readonly 28-byte scope. The cleanup entry20477d21 preserves five PE-only bytes and genuine original C/catalog/ASM gaps; it is noncallable. Original scope metadata does not implement handler, SBH cleanup, EH dispatch or cookie checking. The normal source epilog has no invented cookie-check call. Separate unexecuted cataloged cleanup20477d26 remains prior source context.

ioBlocks207d2a20/256B and ioHandleCount207d29c4/4B preserve original .data virtual/raw section geometry and loader-zero-fill provenance. Their fileOffset is NULL and fileBackedBytes is zero: these are loader initial bytes, not invented file-backed zero bytes or captured current Windows values. A fresh canonical Game image can initialize them once; later execution must use that same current aliased backing and pointer bookkeeping. No source package grants live stores or reseeding.

The static selected normal ledger follows the physical wrapper/nested calloc/HeapAlloc/epilog/RET path, then real caller cleanup, first-block publication, 32 record iterations, current startup WORD skip and first standard-input argument. It adds 496 source operations to the preceding 35, reaching 531 before unexecuted GetStdHandle204744b4/IAT207d7bbc. This is a static expected mode1/non-NULL/current-cbReserved2-zero path, not observed execution or authority to force branch values. Every runtime branch, allocation/global/pointer operation and field read still needs current words, masks, flags, canonical allocation/heap/image aliases and private lifetime proof.

Nested EBP=outerEBP-0x9c, inner returned ESP=innerEBP-0x2c, deepest selected depth224B. The same root retains outer FS and caller return204678d3. HeapAlloc normal stdcall12 / actual-capability-or-owned-NULL behavior is explicitly declared virtual compatibility, not a captured Windows callee or current register state. Unknown outcomes retain actual effects without cleanup/unwind/RET/replay. A facade allocation cannot substitute for the physical nested frame and returns.

Record source widths, per-iteration current block pointer reread, unsigned same-allocation comparisons, seven writes per56B record and source flags81 on the first standard record remain explicit. Known zero section bytes do not initialize a critical section. No GetStdHandle result, handle type, section, IO final return, full CRT/module startup, NPC activation or campaign completion is supplied by these receipts.

The manifest pins the final producer, every actually loaded local helper, twelve prior dependency documents, ten reused C/ASM artifacts and original PE/ASM/catalog/symbols/C inputs. The entire original C ENTRY corpus is retained as a hash ledger to prove the cleanup gap. There are no external draft dependencies, output self hashes or dependency cycles. All four outputs regenerate deterministically.
'''
    (output / 'README.md').write_text(readme, encoding='utf8', newline='\n')
    producer = Path(__file__).resolve()
    helpers = sorted({Path(module.__file__).resolve() for module in sys.modules.values()
        if getattr(module, '__file__', None) and Path(module.__file__).resolve().is_relative_to(repo / 'tools/gothic3')})
    manifest = []

    def record_file(path, location, relative):
        manifest.append(dict(path=relative, location=location, bytes=path.stat().st_size, sha256=SHA(path.read_bytes())))

    for path in sorted(output.rglob('*')):
        if path.is_file() and path.name != 'source-manifest.json':
            record_file(path, 'output', path.relative_to(output).as_posix())
    repo_files = {producer, *helpers, *refs}
    repo_files.update(repo / dependency['path'] for group in dependencies.values() for dependency in group.values())
    for path in sorted(repo_files):
        record_file(path, 'repo', path.relative_to(repo).as_posix())
    for path in sorted(originals):
        record_file(path, 'originalStudy', path.relative_to(study).as_posix())
    assert len(manifest) == len({(row['location'], row['path']) for row in manifest})
    document = dict(schema='gothic3-game-io-allocation-source-manifest-v1', inputs={'Game': GAME},
        manifestSelfReferenceExcluded=True, producerPath=producer.relative_to(repo).as_posix(),
        helperPaths=[path.relative_to(repo).as_posix() for path in helpers],
        files=sorted(manifest, key=lambda row: (row['location'], row['path'])), **flags)
    (output / 'source-manifest.json').write_text(json.dumps(document, separators=(',', ':')) + '\n', encoding='utf8', newline='\n')
    print(json.dumps(dict(methods=5, reusedMethods=5, instructions=337, bodyBytes=995,
        imageRanges=3, peOnlyGapBytes=5, instructionPoints=len(points), imports=len(imports),
        staticAdditionalOperations=496, staticTotalOperations=531,
        manifestRecords=len(manifest), outputFiles=4, producerSha256=SHA(producer.read_bytes()),
        runtimeRulesSha256=SHA((output / 'runtime-rules.json').read_bytes())), indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--repo', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    capture(args.study.resolve(), args.repo.resolve(), args.output.resolve())
