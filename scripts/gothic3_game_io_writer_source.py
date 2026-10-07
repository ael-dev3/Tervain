"""Capture the original Game GetStartupInfoA caller and bounded continuation.

Offline source audit only. The declared virtual Win32 ABI is distinguished from
original local caller instructions and from unobserved Windows callee behavior.
"""
# SPDX-License-Identifier: GPL-3.0-only
import argparse
import csv
import hashlib
import json
import struct
import sys
from pathlib import Path

sys.dont_write_bytecode = True
SHA = lambda raw: hashlib.sha256(raw).hexdigest()
GAME = 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'
ASSEMBLY = 'fd23430904ab84b03e395bc4a705f5a475cc5816094603350a68e1bc2798f4dc'
CATALOG = '7683e99c3c22688b26c77eafc830f43abab471b9e9d3ca241e3157007c714018'
OUTPUT_ROOT = 'assets/gothic3/game-io-writer'
POINTS = {
    'ioGetStartupInfoCall': ('20474314', 'ff151c7c7d20', 'CALL dword ptr [0x207d7c1c]'),
    'ioTryLevelInactiveStore': ('2047431a', 'c745fcfeffffff', 'MOV dword ptr [EBP + -0x4],0xfffffffe'),
    'ioFirstBlockSizePush': ('20474321', '6a38', 'PUSH 0x38'),
    'ioFirstBlockCountPush': ('20474323', '6a20', 'PUSH 0x20'),
    'ioFirstBlockCountPop': ('20474325', '5e', 'POP ESI'),
    'ioFirstBlockCountArgumentPush': ('20474326', '56', 'PUSH ESI'),
    'ioFirstCallocBoundary': ('20474327', 'e8a240ffff', 'CALL 0x204683ce'),
}


def capture(study, repo, output):
    sys.path.insert(0, str(repo / 'tools/gothic3'))
    import read_dialogue_native_evidence as native
    from prepare_runtime_admin_source import source_excerpt
    from prepare_crt_undname_source import verify_extents
    base = study / '01_Decompiled_Code/Game_dll'
    original = (study / '00_Original_Runtime/Game.dll').read_bytes()
    catalog_raw = (base / 'functions.csv').read_bytes()
    assert SHA(original) == GAME and SHA(catalog_raw) == CATALOG
    pe = native.PE(original)
    assert pe.base == 0x20000000
    catalog = {r['address']: dict(r, csvLine=line) for line, r in enumerate(
        csv.DictReader(catalog_raw.decode('utf-8-sig').splitlines()), 2)}
    roots = {
        'gameCrt': repo / 'assets/gothic3/game-crt',
        'continuation': repo / 'assets/gothic3/game-attach-continuation',
        'ioStartup': repo / 'assets/gothic3/game-io-startup',
    }
    expected_schemas = {
        'gameCrt': 'gothic3-game-crt-rules-v1',
        'continuation': 'gothic3-game-attach-continuation-rules-v1',
        'ioStartup': 'gothic3-game-io-startup-rules-v1',
    }
    prior = {name: json.loads((root / 'runtime-rules.json').read_bytes()) for name, root in roots.items()}
    for name, rules in prior.items():
        assert rules['schema'] == expected_schemas[name] and rules['inputs']['Game'] == GAME
    dependencies = {name: {file: dict(path=(root / file).relative_to(repo).as_posix(),
        bytes=(root / file).stat().st_size, sha256=SHA((root / file).read_bytes()))
        for file in ['runtime-rules.json', 'native-evidence.json', 'source-manifest.json']}
        for name, root in roots.items()}
    audit = native.audit_module(study, 'Game_dll', 'Game.dll', {
        0x204742ff: 'ioInit', 0x204683ce: 'callocCrt',
    })
    assert audit['assemblySha256'] == ASSEMBLY and audit['functionsCsvSha256'] == CATALOG
    audit.pop('constants', None)
    audit.pop('tables', None)
    assert (len(audit['methods']), sum(m['instructionCount'] for m in audit['methods']),
        sum(m['bodyByteCount'] for m in audit['methods'])) == (2, 212, 634)
    refs = set()
    originals = {study / '00_Original_Runtime/Game.dll', base / 'functions.csv', base / 'full_disassembly.asm'}
    methods = {}
    for method in audit['methods']:
        verify_extents(pe, method)
        label, body = method['label'], method['bodyVA'][2:]
        package = 'continuation' if label == 'ioInit' else 'gameCrt'
        old = prior[package]['methods'][label]
        assert (old['entry'], old['body'], old['instructionCount'], old['bodyBytes'],
            old['bodyInstructionBytesSha256']) == (body, body, method['instructionCount'],
                method['bodyByteCount'], method['bodyInstructionBytesSha256'])
        old_refs = old['sourceRefs']
        old_root = old.get('sourceRefsRoot', roots[package].relative_to(repo).as_posix())
        asm = '\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction']
            for row in method['instructions']) + '\n'
        c = '\n'.join(line.rstrip() for line in source_excerpt(study, method).splitlines()) + '\n'
        for kind, text in [('assembly', asm), ('c', c)]:
            path = repo / old_root / old_refs[kind]
            assert path.read_bytes() == text.encode('utf8')
            assert SHA(path.read_bytes()) == old_refs[kind + 'Sha256']
            refs.add(path)
        originals.add(study / method['reconstructedC']['path'])
        method.update(originalCatalog=catalog[body], sourceRefs=old_refs, sourceRefsRoot=old_root,
            sourceOnly=True, runtimeOwnerAdmitted=False, currentLiveValueCaptured=False,
            sourceCGap=False, sourceASMGap=False, originalCatalogGap=False)
        methods[label] = dict(module='Game', entry=body, body=body,
            bodyRanges=method['bodyRanges'], instructionCount=method['instructionCount'],
            bodyBytes=method['bodyByteCount'], bodyByteCount=method['bodyByteCount'],
            bodyInstructionBytesSha256=method['bodyInstructionBytesSha256'], entryChain=method['entryChain'],
            sourceRefs=old_refs, sourceRefsRoot=old_root, sourceOnly=True, runtimeOwnerAdmitted=False,
            currentLiveValueCaptured=False, sourceCGap=False, sourceASMGap=False, originalCatalogGap=False)
    io = next(m for m in audit['methods'] if m['label'] == 'ioInit')
    by_pc = {row['va']: row for row in io['instructions']}
    points = {}
    for label, (pc, raw, instruction) in POINTS.items():
        row = by_pc[pc]
        assert row['bytes'] == raw and row['instruction'] == instruction
        points[label] = row
    assert points['ioGetStartupInfoCall'] == prior['ioStartup']['instructionPoints']['ioGetStartupInfoCall']
    assert points['ioFirstCallocBoundary'] == prior['ioStartup']['instructionPoints']['ioFirstCallocCall']
    active = [points[label] for label in list(POINTS)[:6]]
    active_raw = b''.join(bytes.fromhex(row['bytes']) for row in active)
    assert len(active) == 6 and len(active_raw) == 19
    assert [int(row['va'], 16) + len(bytes.fromhex(row['bytes'])) for row in active] == [
        int(row['va'], 16) for row in active[1:]] + [0x20474327]
    boundary_raw = bytes.fromhex(points['ioFirstCallocBoundary']['bytes'])
    assert boundary_raw[0] == 0xe8 and 0x20474327 + 5 + struct.unpack('<i', boundary_raw[1:])[0] == 0x204683ce
    imports = [record for record in pe.imports() if record['iatVA'] == '0x207d7c1c']
    assert imports == [dict(iatVA='0x207d7c1c', module='KERNEL32.dll', name='GetStartupInfoA', ordinal=None)]
    assert imports[0] in prior['ioStartup']['imports']['Game']

    def code_section(address, length):
        start = pe.optional + struct.unpack_from('<H', original, pe.optional - 4)[0]
        index = next(i for i, section in enumerate(pe.sections)
            if section[1] <= address - pe.base and address - pe.base + length <= section[1] + section[2])
        header = start + 40 * index
        virtual_size, rva, raw_size, raw_offset = pe.sections[index]
        flags = struct.unpack_from('<I', original, header + 36)[0]
        receipt = dict(name=original[header:header + 8].rstrip(b'\0').decode(),
            headerFileOffset=header, characteristics=f'{flags:08x}', virtualSize=virtual_size,
            rva=f'{rva:x}', rawSize=raw_size, rawFileOffset=raw_offset,
            readable=bool(flags & 0x40000000), writable=bool(flags & 0x80000000),
            executable=bool(flags & 0x20000000))
        assert receipt['name'] == '.text' and receipt['characteristics'] == '60000020'
        return receipt

    section = code_section(0x20474314, 24)
    context_points = {label: by_pc[pc] for label, pc in {
        'startupInfoAddress': '20474310', 'startupInfoArgumentPush': '20474313',
        'reserved2CountConsumer': '20474376', 'reserved2PointerConsumer': '20474380',
    }.items()}
    assert context_points['reserved2CountConsumer']['instruction'] == 'CMP word ptr [EBP + -0x32],DI'
    assert context_points['reserved2PointerConsumer']['instruction'] == 'MOV EAX,dword ptr [EBP + -0x30]'
    for field, value in {'startupInfoRelativeToEBP': -100, 'startupInfoBytes': 68,
        'espAfterPrologRelativeToEBP': -116, 'tryLevelRelativeToEBP': -4}.items():
        assert prior['ioStartup']['frameLayout'][field] == value
    frame = dict(sourceOnly=True, runtimeOwnerAdmitted=False, currentLiveValueCaptured=False,
        addressScope='Relative original caller relationships; no host or browser numerical x86 addresses captured',
        startupInfoRelativeToEBP=-100, startupInfoBytes=68, argumentBytes=4,
        espBeforeCallRelativeToEBP=-120, pendingReturnRelativeToEBP=-124,
        espAfterNormalReturnRelativeToEBP=-116, tryLevelRelativeToEBP=-4,
        protectedTryLevelBeforeCall=0, inactiveTryLevelAfterNormalReturn=-2,
        callPC='20474314', iat='207d7c1c', returnPC='2047431a', nextBoundaryPC='20474327',
        nextBoundaryTarget='204683ce', nextBoundaryExecuted=False,
        callocCount=32, callocElementBytes=56, callocArgumentsESPRelativeToEBP=-124,
        fields={
            'cbReserved2': dict(offset=50, bytes=2, relativeToEBP=-50, consumerPC='20474376', sourceOnly=True),
            'lpReserved2': dict(offset=52, bytes=4, relativeToEBP=-48, consumerPC='20474380', sourceOnly=True),
        },
        incomingCallerReturnPC='204678d3', callerReturnSlotConsumed=False,
        ioInitReturned=False, startupInfoZeroInitializedByCaller=False,
        currentOutputBytesCaptured=False, currentOutputMaskCaptured=False)
    abi = dict(scope='Declared virtual Win32 compatibility ABI, consistent with the captured caller; not original callee instructions or observed native state',
        sourceOnly=True, runtimeOwnerAdmitted=False, originalWindowsCalleeCaptured=False,
        nativeEndpointExecuted=False, callingConvention='stdcall', normalReturnType='void',
        normalCalleeArgumentBytes=4, normalReturnPC='2047431a',
        normalVolatileNumericalRegisters=['EAX', 'ECX', 'EDX'],
        normalVolatileRegisterValuePolicy='unknown unless supplied by separately owned ABI effects',
        normalPreservedRegisters=['EBX', 'ESI', 'EDI', 'EBP'], normalPreservedFS=True,
        normalReturnRequiresActualNormalEndpointOutcome=True,
        unknownOutcomeGrantsCleanup=False, escapedHostErrorIsNativeException=False)
    selection = dict(sourceOnly=True, runtimeOwnerAdmitted=False, currentLiveValueCaptured=False,
        instructionAddresses=[row['va'] for row in active], instructionCount=6, instructionBytes=19,
        instructionBytesSha256=SHA(active_raw), postCallInstructionCount=5, postCallInstructionBytes=13,
        startPC='20474314', normalReturnPC='2047431a', endExclusivePC='20474327',
        nextBoundaryPC='20474327', nextBoundaryTarget='204683ce', nextBoundaryExecuted=False,
        wholeIoInitImplemented=False, allocationAdmitted=False)
    flags = dict(sourceOnly=True, runtimeOwnersImplemented=False, currentLiveValuesCaptured=False,
        wholeIoInitImplemented=False, wholeExceptionDispatchImplemented=False,
        wholeGameAttachOrCrtTraversalImplemented=False, allocationAdmitted=False)
    common = dict(methods=methods, instructionPoints=points, sourceContextInstructionPoints=context_points,
        selectedContinuation=selection, frameLayout=frame, declaredCompatibilityABI=abi,
        originalCodeSection=section, imports={'Game': imports}, sourceDependencies=dependencies,
        **flags)
    evidence = dict(schema='gothic3-game-io-writer-evidence-v1', inputs={'Game.dll': GAME},
        originalModuleAudit=audit, originalCatalogSha256=CATALOG, originalAssemblySha256=ASSEMBLY,
        boundaryTargetOriginalCatalog=catalog['204683ce'],
        sourceCaptureScope='Exact reused caller and calloc-wrapper sources; Windows callee and nested allocation/EH execution are not captured or admitted',
        **common)
    rules = dict(schema='gothic3-game-io-writer-rules-v1', inputs={'Game': GAME},
        scope='Source receipts only; a current private caller/stack/import writer/normal return owner is required separately',
        **common)
    output.mkdir(parents=True, exist_ok=True)
    for name, document in [('native-evidence.json', evidence), ('runtime-rules.json', rules)]:
        (output / name).write_text(json.dumps(document, separators=(',', ':')) + '\n', encoding='utf8', newline='\n')
    readme = '''# Original Game startup-info writer caller

Reproduce from the repository root, replacing STUDY with the original readonly study directory:

    python -B scripts/gothic3_game_io_writer_source.py --study "STUDY" --repo . --output assets/gothic3/game-io-writer

This offline supplement preserves CALL 20474314 through IAT 207d7c1c (KERNEL32.dll!GetStartupInfoA), normal return PC 2047431a, and the five following original instructions at 2047431a/21/23/25/26. The six-row selection contains 19 original instruction bytes. The next CALL at 20474327 targets 204683ce and remains unexecuted. No allocation or I/O block publication is admitted.

The original ioInit body (186 rows / 562 bytes) and callocCrt wrapper (26 rows / 72 bytes) reuse exact existing C/ASM sourceRefs in game-attach-continuation and game-crt. These 212 rows / 634 bytes remain source context; full bodies being captured does not implement their branches. Original PE bytes, ASM line numbers, catalog records, C ENTRY identity, source hashes and text-section geometry are checked. Existing Game CRT, continuation and io-startup packages are read-only dependencies and are not regenerated. ioInit's existing 14-byte C/catalog/ASM gap is not reconstructed here.

The caller passes its actual 68-byte STARTUPINFOA frame at EBP-0x64. Its argument leaves ESP=EBP-0x78; CALL pushes return 2047431a at EBP-0x7c. Normal stdcall4 cleanup returns ESP to EBP-0x74. Later cbReserved2 WORD/+0x32 and lpReserved2 DWORD/+0x34 consumers are contextual original rows, not currently executed reads. The caller does not zero this buffer. No current output bytes, masks, numerical stack addresses or native Windows state are captured.

The void/stdcall4 normal-return and volatile/callee-saved rules are explicitly declared virtual compatibility ABI. They are consistent with this original caller, not a capture of the Windows callee. A source receipt cannot grant an import, private frame alias, current output write, exception dispatch, return-slot consumption, cleanup, replay or lifetime retirement. An unknown writer or escaped host error does not authorize normal return. The incoming ioInit caller return 204678d3 remains live. Nested callocImpl's SEH frame/scope and all later I/O/CRT work require separate ownership.

All four outputs are deterministic. The source manifest pins this final producer, every actually loaded local helper, all nine dependency documents, four reused source artifacts and original PE/ASM/catalog/C inputs. No external draft, output self hash or cyclic source dependency is used.
'''
    (output / 'README.md').write_text(readme, encoding='utf8', newline='\n')
    producer = Path(__file__).resolve()
    helpers = sorted({Path(module.__file__).resolve() for module in sys.modules.values()
        if getattr(module, '__file__', None) and Path(module.__file__).resolve().is_relative_to(repo / 'tools/gothic3')})
    manifest = []

    def record(path, location, relative):
        manifest.append(dict(path=relative, location=location, bytes=path.stat().st_size, sha256=SHA(path.read_bytes())))

    for path in sorted(output.rglob('*')):
        if path.is_file() and path.name != 'source-manifest.json':
            record(path, 'output', path.relative_to(output).as_posix())
    repository_files = {producer, *helpers, *refs}
    repository_files.update(repo / dependency['path'] for group in dependencies.values() for dependency in group.values())
    for path in sorted(repository_files):
        record(path, 'repo', path.relative_to(repo).as_posix())
    for path in sorted(originals):
        record(path, 'originalStudy', path.relative_to(study).as_posix())
    assert len(manifest) == len({(entry['location'], entry['path']) for entry in manifest})
    document = dict(schema='gothic3-game-io-writer-source-manifest-v1', inputs={'Game': GAME},
        manifestSelfReferenceExcluded=True, producerPath=producer.relative_to(repo).as_posix(),
        helperPaths=[path.relative_to(repo).as_posix() for path in helpers],
        files=sorted(manifest, key=lambda entry: (entry['location'], entry['path'])), **flags)
    (output / 'source-manifest.json').write_text(json.dumps(document, separators=(',', ':')) + '\n', encoding='utf8', newline='\n')
    print(json.dumps(dict(methods=2, reusedMethods=2, instructions=212, bodyBytes=634,
        selectedInstructions=6, selectedInstructionBytes=19, nextBoundaryInstructions=1,
        nextBoundaryBytes=5, imports=1, manifestRecords=len(manifest), outputFiles=4,
        producerSha256=SHA(producer.read_bytes()), runtimeRulesSha256=SHA((output / 'runtime-rules.json').read_bytes())), indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--repo', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    arguments = parser.parse_args()
    capture(arguments.study.resolve(), arguments.repo.resolve(), arguments.output.resolve())
