"""Capture the bounded original Game __setenvp source unit, offline only.

The eight original bodies and three contextual bodies reuse existing exact
listings. Source availability supplies no current runtime access or authority.
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
SHA = lambda data: hashlib.sha256(data).hexdigest()
GAME = 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'
ASM = 'fd23430904ab84b03e395bc4a705f5a475cc5816094603350a68e1bc2798f4dc'
CAT = '7683e99c3c22688b26c77eafc830f43abab471b9e9d3ca241e3157007c714018'
SYMBOLS = '4e92a5cb597f91d1c2eb661f171a1bb097175094dc32778bd6058676afea3eac'
LOGICAL = 'assets/gothic3/game-setenvp'
INTENDED_PRODUCER = 'scripts/gothic3_game_setenvp_source.py'
ACTIVE = {
    'setEnvp': '204764ff', 'strlen': '2046dbd0', 'strcpyS': '20475b80',
    'free': '20467c6a', 'callocCrt': '204683ce', 'callocImpl': '20477c2a',
    'sehProlog4': '20468570', 'sehEpilog4': '204685b5',
}
CONTEXT = {'callerAttach': '204677e4', 'freeCleanup': '20467cc0', 'cinit': '204665f4'}
REUSE = {
    'setEnvp': ('game-attach-continuation', 'setEnvp'),
    'strlen': ('game-crt', 'strlen'), 'strcpyS': ('game-crt', 'strcpyS'),
    'free': ('game-crt', 'free'), 'callocCrt': ('game-crt', 'callocCrt'),
    'callocImpl': ('game-crt', 'callocImpl'),
    'sehProlog4': ('game-attach-continuation', 'sehProlog4'),
    'sehEpilog4': ('game-attach-continuation', 'sehEpilog4'),
    'callerAttach': ('game-crt', 'crtAttach'), 'freeCleanup': ('game-crt', 'freeCleanup'),
    'cinit': ('game-attach-continuation', 'cinit'),
}
PACKAGE_SCHEMAS = {
    'game-crt': 'gothic3-game-crt-rules-v1',
    'game-attach-continuation': 'gothic3-game-attach-continuation-rules-v1',
    'game-io-allocation': 'gothic3-game-io-allocation-rules-v1',
    'game-argv': 'gothic3-game-argv-rules-v1',
}
SELECTED = {
    'setEnvp': ['2047652b', '2047653f', '2047655c', '2047656d', '2047657d', '204765a5'],
    'callocCrt': ['204683dc'], 'callocImpl': ['20477c31', '20477ce8', '20477d42'],
    'free': ['20467c71', '20467cd2', '20467cf2'],
}
IMAGE_SPECS = {
    'envp': ('207d0a4c', 4), 'environmentAllocated': ('207d2b6c', 4),
    'environmentBlock': ('207d0a74', 4), 'mbcInitialized': ('207d2b84', 4),
    'freeEH4Scope': ('206e8b70', 28), 'callocEH4Scope': ('206e8f98', 28),
    'securityCookie': ('207b2314', 4), 'crtHeapHandle': ('207d11b4', 4),
    'crtHeapMode': ('207d1658', 4), 'crtMallocRetry': ('207d0a94', 4), 'newMode': ('207d14e0', 4),
}
FLAGS = dict(sourceOnly=True, runtimeOwnerAdmitted=False, executionAdmitted=False,
             liveValueCaptured=False, currentLiveValueCaptured=False)


def dump(path, value):
    path.write_text(json.dumps(value, separators=(',', ':'), ensure_ascii=False) + '\n',
                    encoding='utf-8', newline='\n')


def capture(study, repo, output):
    sys.path.insert(0, str(repo / 'tools/gothic3'))
    import read_dialogue_native_evidence as native
    from prepare_runtime_admin_source import source_excerpt
    from prepare_crt_undname_source import verify_extents
    corpus = study / '01_Decompiled_Code/Game_dll'
    original_path = study / '00_Original_Runtime/Game.dll'
    original = original_path.read_bytes()
    catalog_raw, symbols_raw = (corpus / 'functions.csv').read_bytes(), (corpus / 'symbols.csv').read_bytes()
    assert SHA(original) == GAME and SHA(catalog_raw) == CAT and SHA(symbols_raw) == SYMBOLS
    pe = native.PE(original)
    assert pe.base == 0x20000000
    catalog = {row['address']: dict(row, csvLine=i) for i, row in enumerate(
        csv.DictReader(catalog_raw.decode('utf-8-sig').splitlines()), 2)}
    packages = {name: json.loads((repo / 'assets/gothic3' / name / 'runtime-rules.json').read_bytes())
                for name in PACKAGE_SCHEMAS}
    dependencies = {}
    for name, rules in packages.items():
        assert rules['schema'] == PACKAGE_SCHEMAS[name] and rules['inputs']['Game'] == GAME
        dependencies[name] = {filename: dict(path=f'assets/gothic3/{name}/{filename}',
            bytes=(repo / 'assets/gothic3' / name / filename).stat().st_size,
            sha256=SHA((repo / 'assets/gothic3' / name / filename).read_bytes()))
            for filename in ['runtime-rules.json', 'native-evidence.json', 'source-manifest.json']}
    assert sum(map(len, dependencies.values())) == 12
    audit = native.audit_module(study, 'Game_dll', 'Game.dll',
        {int(address, 16): label for label, address in (ACTIVE | CONTEXT).items()})
    assert audit['assemblySha256'] == ASM and audit['functionsCsvSha256'] == CAT
    audit.pop('constants', None)
    audit.pop('tables', None)
    assert (len(audit['methods']), sum(m['instructionCount'] for m in audit['methods']),
            sum(m['bodyByteCount'] for m in audit['methods'])) == (11, 582, 1650)
    originals = {original_path, corpus / 'functions.csv', corpus / 'symbols.csv', corpus / 'full_disassembly.asm'}
    refs, methods, contexts, points = {}, {}, {}, {}
    for method in audit['methods']:
        verify_extents(pe, method)
        label, body = method['label'], method['bodyVA'][2:]
        package, old_label = REUSE[label]
        old = packages[package]['methods'][old_label]
        assert (old['entry'], old['body'], old['instructionCount'], old['bodyBytes'], old['bodyInstructionBytesSha256']) == (
            body, body, method['instructionCount'], method['bodyByteCount'], method['bodyInstructionBytesSha256'])
        root, source_refs = old.get('sourceRefsRoot', 'assets/gothic3/' + package), old['sourceRefs']
        texts = {
            'assembly': '\n'.join(r['va'] + ' | ' + r['bytes'] + ' | ' + r['instruction'] for r in method['instructions']) + '\n',
            'c': '\n'.join(line.rstrip() for line in source_excerpt(study, method).splitlines()) + '\n',
        }
        for kind, text in texts.items():
            path = repo / root / source_refs[kind]
            data = path.read_bytes()
            assert data == text.encode('utf-8') and SHA(data) == source_refs[kind + 'Sha256']
            refs[path.relative_to(repo).as_posix()] = dict(method=label, kind=kind, bytes=len(data), sha256=SHA(data), **FLAGS)
        originals.add(study / method['reconstructedC']['path'])
        method.update(originalCatalog=catalog[body], sourceRefs=source_refs, sourceRefsRoot=root,
            sourceCGap=False, sourceASMGap=False, originalCatalogGap=False,
            contextOnly=label in CONTEXT, **FLAGS)
        rec = dict(module='Game', entry=body, body=body, bodyRanges=method['bodyRanges'],
            instructionCount=method['instructionCount'], bodyBytes=method['bodyByteCount'], bodyByteCount=method['bodyByteCount'],
            bodyInstructionBytesSha256=method['bodyInstructionBytesSha256'], entryChain=method['entryChain'],
            sourceRefs=source_refs, sourceRefsRoot=root, sourceCGap=False, sourceASMGap=False,
            originalCatalogGap=False, contextOnly=label in CONTEXT, **FLAGS)
        (methods if label in ACTIVE else contexts)[label] = rec
        if label in ACTIVE or label == 'callerAttach':
            for row in method['instructions']:
                assert row['va'] not in points
                points[row['va']] = row
    points = dict(sorted(points.items()))
    assert (len(methods), sum(m['instructionCount'] for m in methods.values()),
            sum(m['bodyBytes'] for m in methods.values()), len(points), len(refs)) == (8, 377, 1022, 528, 22)
    assert points['2046dc00']['instruction'] == 'MOV EAX,dword ptr [ECX]'

    section_table = pe.optional + struct.unpack_from('<H', original, pe.optional - 4)[0]

    def image(label, address, size, constant=False):
        va, rva = int(address, 16), int(address, 16) - pe.base
        index, section = next((i, s) for i, s in enumerate(pe.sections)
            if s[1] <= rva and rva + size <= s[1] + max(s[0], s[2]))
        virtual_size, start, raw_size, offset = section
        relative = rva - start
        backed = max(0, min(size, raw_size - relative))
        raw = original[offset + relative:offset + relative + backed] + bytes(size - backed)
        header = section_table + 40 * index
        bits = struct.unpack_from('<I', original, header + 36)[0]
        return dict(module='Game', address=address, rva=f'{rva:x}', bytes=size, raw=raw.hex(),
            sha256=SHA(raw), knownMask='ff' * size, fileOffset=offset + relative if backed else None,
            section=dict(name=original[header:header+8].rstrip(b'\0').decode(), virtualSize=virtual_size,
                rva=f'{start:x}', rawSize=raw_size, rawOffset=offset, fileBackedBytes=backed, loaderZeroFillBytes=size-backed),
            originalPESection=dict(name=original[header:header+8].rstrip(b'\0').decode(), headerFileOffset=header,
                characteristics=f'{bits:08x}', readable=bool(bits & 0x40000000),
                writable=bool(bits & 0x80000000), executable=bool(bits & 0x20000000)),
            scope='original-file-backed-constant' if constant else 'cold-original-image',
            canonicalImageLabel=label, **FLAGS)

    cold, constants = {}, {}
    for label, (address, size) in IMAGE_SPECS.items():
        constant = label.endswith('EH4Scope')
        receipt = image(label, address, size, constant)
        prior_refs = []
        for package, rules in packages.items():
            for group in ['coldGlobals', 'constBytes']:
                for old_label, old in rules[group].items():
                    if (old.get('module'), old.get('address'), old.get('bytes')) == ('Game', address, size):
                        assert old['raw'] == receipt['raw'] and old['sha256'] == receipt['sha256']
                        prior_refs.append(dict(package=f'assets/gothic3/{package}', file='runtime-rules.json',
                            group=group, label=old_label, sha256=dependencies[package]['runtime-rules.json']['sha256']))
        receipt['existingSourceReceiptReferences'] = prior_refs
        if constant:
            assert receipt['section']['fileBackedBytes'] == size and not receipt['originalPESection']['writable']
            receipt['decodedDwords'] = [f'{x:08x}' for x in struct.unpack('<7I', bytes.fromhex(receipt['raw']))]
            constants[label] = receipt
        else:
            cold[label] = receipt
    for label in ['envp', 'environmentAllocated']:
        assert cold[label]['raw'] == '00000000' and cold[label]['fileOffset'] is None
        assert cold[label]['section']['loaderZeroFillBytes'] == 4 and cold[label]['existingSourceReceiptReferences']
    assert constants['freeEH4Scope']['raw'] == 'feffffff00000000d4ffffff00000000feffffff00000000c07c4620'
    assert constants['callocEH4Scope']['decodedDwords'][-1] == '20477d21'
    assert constants['freeEH4Scope']['decodedDwords'][-1] == CONTEXT['freeCleanup']
    gaps = {}
    for label, address, size, raw, inference in [
        ('setEnvpWatsonFallthrough', '20476593', 3, '83c414', 'ADD ESP,0x14'),
        ('callocExceptionPrefix', '20477d21', 5, '33ff8b750c', 'XOR EDI,EDI; MOV ESI,dword ptr [EBP + 0xc]'),
    ]:
        receipt = image(label, address, size)
        assert receipt['raw'] == raw and address not in catalog
        for original_method in catalog.values():
            for a, b in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})', original_method['body_ranges']):
                assert not (int(a, 16) < int(address, 16) + size and int(b, 16) >= int(address, 16))
        receipt.update(scope='original-PE-only-code-with-ASM-C-catalog-gaps', contextOnly=True,
            runtimeCallable=False, sourceCGap=True, sourceASMGap=True, originalCatalogGap=True,
            originalInstructions=[], reconstructedC=None, originalCatalog=None,
            decodeIsInference=True, inferredInstruction=inference)
        gaps[label] = receipt
    c_corpus = []
    for path in sorted((corpus / 'pseudocode').glob('*.c')):
        data = path.read_bytes()
        for receipt in gaps.values():
            assert '/* ENTRY ' + receipt['address'] + ' |' not in data.decode('utf-8-sig')
        originals.add(path)
        c_corpus.append(dict(path=path.relative_to(study).as_posix(), bytes=len(data), sha256=SHA(data)))
    assert len(c_corpus) == 130
    asm_hash, gap_rows = hashlib.sha256(), []
    with (corpus / 'full_disassembly.asm').open('rb') as stream:
        for line in stream:
            asm_hash.update(line)
            match = re.fullmatch(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', line.rstrip(b'\r\n'))
            if match:
                address, size = int(match[1], 16), len(bytes.fromhex(match[2].decode()))
                for receipt in gaps.values():
                    gap_start = int(receipt['address'], 16)
                    if address < gap_start + receipt['bytes'] and address + size > gap_start:
                        gap_rows.append(line.decode('utf-8'))
    assert asm_hash.hexdigest() == ASM and not gap_rows
    gap_search = dict(queries=[dict(address=r['address'], bytes=r['bytes']) for r in gaps.values()],
        catalogEntriesFound=0, originalCatalogBodyRangeOverlapsFound=0, originalCEntriesFound=0,
        originalASMRowsFound=0, originalCFilesSearched=130, corpusFiles=c_corpus,
        corpusRecordSha256=SHA((json.dumps(c_corpus, separators=(',', ':')) + '\n').encode()), **FLAGS)
    imports_by_va = {row['iatVA'][2:]: row for row in pe.imports()}
    selected = {pc for values in SELECTED.values() for pc in values}
    calls = []
    for method in audit['methods']:
        if method['label'] not in ACTIVE and method['label'] != 'callerAttach':
            continue
        own_rows = {row['va'] for row in method['instructions']}
        for row in method['instructions']:
            ins = row['instruction']
            if not (ins.startswith('CALL ') or ins.startswith('JMP 0x') and ins[6:] not in own_rows):
                continue
            rec = dict(caller=method['label'], pc=row['va'], instruction=ins, sourceBytes=row['bytes'],
                selectedUnderDeclaredConditions=row['va'] in selected,
                callerEnvEntryCall=row['va'] == '204678e7', executionAdmitted=False)
            direct = re.fullmatch(r'(CALL|JMP) 0x([0-9a-f]{8})', ins)
            iat = re.fullmatch(r'CALL dword ptr \[0x([0-9a-f]{8})\]', ins)
            if direct:
                target = direct[2]
                rec.update(kind='direct-call-or-tail', target=target, originalCatalog=catalog.get(target),
                    originalBodyCaptured=target in set((ACTIVE | CONTEXT).values()),
                    activeBodyAvailable=target in set(ACTIVE.values()))
            elif iat:
                rec.update(kind='original-IAT', target=iat[1], importRecord=imports_by_va[iat[1]])
            else:
                rec.update(kind='indirect-current-procedure')
            calls.append(rec)
    assert len(selected) == 13 and {r['pc'] for r in calls if r['selectedUnderDeclaredConditions']} == selected
    normal_imports = [imports_by_va[address] for address in ['207d7b7c', '207d7b84']]
    assert [(r['iatVA'], r['module'], r['name'], r['ordinal']) for r in normal_imports] == [
        ('0x207d7b7c', 'KERNEL32.dll', 'HeapFree', None), ('0x207d7b84', 'KERNEL32.dll', 'HeapAlloc', None)]
    used_iats = {address for row in points.values()
        for address in re.findall(r'\[0x([0-9a-f]{8})\]', row['instruction']) if address in imports_by_va}
    context_imports = [imports_by_va[address] for address in sorted(used_iats)]
    caller_pcs = ['204678e7', '204678ec', '204678ee', '204678f0', '204678f2', '20467907']
    counts = dict(methods=8, instructionRows=377, bodyBytes=1022, reusedMethods=8, newMethods=0,
        contextOriginalMethods=3, contextOriginalRows=205, contextOriginalBodyBytes=628,
        getterRows=528, reusedSourceFiles=22, focusedDependencyJsonFiles=12,
        peOnlyGapBytes=8, conditionalSelectedUniqueCallSites=13, callerEnvEntryCalls=1,
        fullCallAndExternalTailSites=len(calls), normalImports=len(normal_imports), contextImports=len(context_imports))
    path = dict(conditions=['current mbcInitialized nonzero', 'current Game heapMode1',
            'valid bounded current environment strings', 'successful nonNULL normal allocations and release'],
        conditionalNormalSourceAvailable=True, runtimeExecutionAdmitted=False, completeFailureClosureAudited=False,
        dynamicOperationCountClaimed=False, callerExecutedPCs=caller_pcs[:4],
        callerContextBoundaryPCs=caller_pcs[4:], entry='204764ff', normalCalleeRet='204765c3',
        callerReturn='204678ec', nextUnexecutedBoundary='204678f2', nextTarget='204665f4',
        callerFailureBoundary='20467907', callerFailureTarget='2047453f', crtAttachReturned=False,
        conditionalSelectedUniqueCallSites=SELECTED,
        windowsImportABI={'20477ce8': dict(name='HeapAlloc', iat='207d7b84', convention='stdcall', argumentBytes=12,
                arguments=['current same Game heap', 'flags8', 'current scalar ESI byte count'], result='pointer-or-NULL'),
            '20467cd2': dict(name='HeapFree', iat='207d7b7c', convention='stdcall', argumentBytes=12,
                arguments=['current same Game heap', 'flags0', 'actual current owned environment allocation'], result='BOOL')},
        physicalReadRequirement=dict(sourcePC='2046dc00', operation=points['2046dc00']['instruction'], bytes=4,
            conditionalCurrentLogicalBytes=19, conditionalAlignedReadOffset=16, minimumPhysicalExtent=20,
            roundedPhysicalExtentProposal=24, proposalOnly=True, paddingKnown=False,
            partialMaskArithmeticRequired=True, oldAllocationMustNotBeWidenedOrReseeded=True))
    rules = dict(schema='gothic3-game-setenvp-rules-v1', inputs={'Game': GAME}, methods=methods,
        contextOriginalMethods=contexts, instructionPoints=points, callerInstructionPoints={pc: points[pc] for pc in caller_pcs},
        coldGlobals=cold, constBytes=constants, peOnlyCode=gaps, imports={'Game': normal_imports},
        contextImports={'Game': context_imports}, sourceDependencies=dependencies, counts=counts,
        selectedNormalPath=path, callAndTailSites=calls,
        originalGapSearchSummary={k: v for k, v in gap_search.items() if k != 'corpusFiles'}, **FLAGS)
    evidence = dict(rules, schema='gothic3-game-setenvp-evidence-v1', originalModuleAudit=audit,
        originalCatalogSha256=CAT, originalAssemblySha256=ASM, originalSymbolsSha256=SYMBOLS,
        originalGapSearch=gap_search,
        directCallCaptureScope='Captured only when target normalized entry is one of the eight active or three original context bodies; source captured is never runtime execution')
    ledger = dict(schema='gothic3-game-setenvp-source-reference-ledger-v1', inputs={'Game': GAME},
        reusedSourceFiles=dict(sorted(refs.items())), focusedDependencyFiles=dependencies,
        activeSourceLabels=list(ACTIVE), contextSourceLabels=list(CONTEXT), **FLAGS)
    output.mkdir(parents=True, exist_ok=True)
    dump(output / 'runtime-rules.json', rules)
    dump(output / 'native-evidence.json', evidence)
    dump(output / 'source-reference-ledger.json', ledger)
    readme = '''# Original Game environment source (checkpoint 110)

This package records eight complete original bodies (377 ASM rows, 1,022
instruction bytes). All bodies reuse exact earlier source files. The full caller
(151 rows, 473 bytes), free cleanup (4/9) and cinit (50/146) remain original source
context. There are 22 reused C/ASM references and 12 focused dependency JSON files.
No reconstructed C/ASM is invented or copied into this focused package.

The finite caller path is CALL204678e7 to __setenvp204764ff, actual RET204765c3 to
204678ec, caller TEST/JL and PUSH0 at204678f0, stopping before cinit CALL204678f2.
Only source availability is captured. Current conditions, instructions, frames,
memory/known masks, import grants and actual returns must be independently owned.
Source-only context and original call tables do not grant runtime execution.

Original PE-only gaps20476593 (3 bytes after the nonreturning Watson path) and
20477d21 (5-byte calloc EH4 prefix) have genuine catalog/C/ASM gaps. They remain
noncallable PE context; any mnemonic decoding is explicitly inference. Normal
captured freeCleanup20467cc0 is separate from the calloc gap.

Current environment input has a19-byte logical contract. Original aligned strlen
DWORD2046dc00 at offset16 requires a20-byte physical span. The selected fresh
24-byte capacity policy keeps padding unknown and uses conservative masked
arithmetic. This package cannot widen/reseed current storage or certify the new
heap contract. The same actual environment pointer, Game heap, scope, cookie and
existing canonical aliases must be retained. HeapAlloc flags8/HeapFree flags0
require new private physical call grants; earlier IO/malloc grants do not suffice.

Reproduce from the original local study with the repository producer:

```
python scripts/gothic3_game_setenvp_source.py --study <original-study> --repo . --output assets/gothic3/game-setenvp
```

The producer verifies original DLL/catalog/ASM/C, old listing bytes, scope/cold
geometry, genuine negative source evidence and exact imports. The manifest pins
its actual in-repository path and all loaded local helpers, original inputs,
existing listings/dependency files and generated outputs except itself.
Regenerate the manifest and immutable admission pins after changing any pinned
input or moving the producer. No external plan file is a production dependency.

No native/game/browser/TypeScript execution, tests, builds, Windows process state,
complete failure closure, completed CRT attach or full game is claimed.
'''
    (output / 'README.md').write_text(readme, encoding='utf-8', newline='\n')
    producer = Path(__file__).resolve()
    helper_root = (repo / 'tools/gothic3').resolve()
    helpers = sorted({Path(module.__file__).resolve() for module in sys.modules.values()
        if getattr(module, '__file__', None) and Path(module.__file__).resolve().is_relative_to(helper_root)})
    records = []
    def record(path, location, relative):
        data = path.read_bytes()
        records.append(dict(location=location, path=relative, bytes=len(data), sha256=SHA(data)))
    for child in sorted(output.rglob('*')):
        if child.is_file() and child.name != 'source-manifest.json':
            record(child, 'output', child.relative_to(output).as_posix())
    producer_location = 'repository' if producer.is_relative_to(repo.resolve()) else 'outside-preparation'
    producer_path = producer.relative_to(repo.resolve()).as_posix() if producer_location == 'repository' else producer.as_posix()
    record(producer, producer_location, producer_path)
    repository_files = {repo / name for name in refs} | set(helpers) | {
        repo / item['path'] for files in dependencies.values() for item in files.values()}
    for child in sorted(repository_files):
        record(child, 'repository', child.relative_to(repo).as_posix())
    for child in sorted(originals):
        record(child, 'local-original', child.relative_to(study).as_posix())
    assert len(records) == len({(r['location'], r['path']) for r in records})
    manifest = dict(schema='gothic3-game-setenvp-source-manifest-v1', inputs={'Game': GAME},
        manifestSelfReferenceExcluded=True, producerPath=producer_path,
        producerLocation=producer_location, intendedFinalProducerPath=INTENDED_PRODUCER,
        helperPaths=[p.relative_to(repo).as_posix() for p in helpers], logicalOutputPath=LOGICAL,
        files=sorted(records, key=lambda r: (r['location'], r['path'])), **FLAGS)
    dump(output / 'source-manifest.json', manifest)
    assert len([child for child in output.rglob('*') if child.is_file()]) == 5
    print(json.dumps(dict(counts, outputFiles=5, producerSha256=SHA(producer.read_bytes()),
        manifestRecords=len(records), loadedHelperCount=len(helpers))))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    capture(args.study.resolve(), args.repo.resolve(), args.output.resolve())
