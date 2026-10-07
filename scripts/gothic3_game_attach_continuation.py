"""Capture original Game attach continuation source without executing game code."""
import argparse
import csv
import hashlib
import json
import re
import struct
import sys
from pathlib import Path
sys.dont_write_bytecode = True

PRIMARY = {0x20476835: 'crtGetEnvironmentStringsA', 0x204742ff: 'ioInit',
           0x2047677c: 'setArgv', 0x204764ff: 'setEnvp'}
CONTEXT = {0x204677e4: 'crtAttach', 0x204665f4: 'cinit'}
TRANSITIVE = {0x20463ed0: 'memcpy', 0x20468570: 'sehProlog4', 0x204685b5: 'sehEpilog4',
    0x2046bcff: 'initMbcTable', 0x204765e4: 'parseCmdline', 0x2046a0d6: 'invokeWatson',
    0x204738b0: 'isNonwritableInCurrentImage', 0x20469672: 'initMiscFloatPointers',
    0x2047453f: 'ioTerm', 0x2047e627: 'getSse2Info', 0x2047e5d7: 'getSse2OsCapability',
    0x2046bb65: 'setMbcCodePage', 0x2047012d: 'isMbcLead',
    0x20473830: 'validateImageBase', 0x20473860: 'findPESection',
    0x2000e8d6: 'firstCppInitializerCallee', 0x2002c9f8: 'secondCppInitializerCallee',
    0x2046b832: 'updateThreadMbcInfo', 0x2046b8d6: 'getSystemCP', 0x2046b950: 'setMbcpNoLock',
    0x2046bcc6: 'unlockSetMbcp', 0x2046ff6f: 'isMbcType', 0x20463917: 'fpMath',
    0x20464c66: 'localeUpdate', 0x2046b624: 'mbcLocaleIdentifier',
    0x2046b653: 'setSbcs', 0x2046b6a8: 'setSbUpLow', 0x2046b8cd: 'unlockUpdateThreadMbcInfo'}
ASM_ONLY = {'cInit20469f3a': (0x20469f3a, 0x20469f4d),
    'cInit2047470c': (0x2047470c, 0x204747bc), 'cInit2047e687': (0x2047e687, 0x2047e693),
    'cppInit204b11b0': (0x204b11b0, 0x204b11ba), 'cppInit204b11c0': (0x204b11c0, 0x204b11ca)}
SHA = lambda raw: hashlib.sha256(raw).hexdigest()

def capture(study, repo, output):
    sys.path.insert(0, str(repo / 'tools/gothic3'))
    import read_dialogue_native_evidence as native
    from prepare_runtime_admin_source import source_excerpt, image_bytes
    from prepare_crt_undname_source import verify_extents
    pe = native.PE((study / '00_Original_Runtime/Game.dll').read_bytes())
    catalog_raw = (study / '01_Decompiled_Code/Game_dll/functions.csv').read_bytes()
    catalog = {row['address']: row for row in csv.DictReader(catalog_raw.decode('utf-8-sig').splitlines())}
    audit = native.audit_module(study, 'Game_dll', 'Game.dll', {**PRIMARY, **CONTEXT, **TRANSITIVE})
    symbols_raw = (study / '01_Decompiled_Code/Game_dll/symbols.csv').read_bytes()
    symbols = list(csv.DictReader(symbols_raw.decode('utf-8-sig').splitlines()))
    assembly_rows = {label: [] for label in ASM_ONLY}
    assembly_path = study / '01_Decompiled_Code/Game_dll/full_disassembly.asm'
    with assembly_path.open('r', encoding='utf8') as stream:
        for number, line in enumerate(stream, 1):
            match = re.fullmatch(r'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', line.rstrip('\r\n'))
            if not match: continue
            address = int(match[1], 16)
            for label, (begin, end) in ASM_ONLY.items():
                if begin <= address <= end:
                    raw = bytes.fromhex(match[2])
                    assert pe.bytes(address, len(raw)) == raw
                    assembly_rows[label].append(dict(va=match[1], rva=f'{address-pe.base:x}',
                        fileOffset=pe.offset(address,len(raw)), bytes=match[2], instruction=match[3], assemblyLine=number))
    for label, (begin, end) in ASM_ONLY.items():
        assert f'{begin:08x}' not in catalog
        assert not any(f'/* ENTRY {begin:08x} |' in path.read_text(encoding='utf8')
            for path in (study / '01_Decompiled_Code/Game_dll/pseudocode').glob('*.c'))
        rows = assembly_rows[label]
        assert rows and rows[-1]['instruction'] == 'RET'
        raw = b''.join(bytes.fromhex(row['bytes']) for row in rows)
        method = dict(label=label, entryVA=f'0x{begin:08x}', bodyVA=f'0x{begin:08x}', entryChain=[],
            bodyRanges=f'{begin:08x}-{end:08x}', instructions=rows, instructionCount=len(rows), bodyByteCount=len(raw),
            bodyInstructionBytesSha256=SHA(raw), sourceCGap=True, sourceASMGap=False, originalCatalogGap=True,
            originalSymbols=[dict(row,csvLine=index) for index,row in enumerate(symbols,2) if row['address'] == f'{begin:08x}'],
            selection='Existing original ASM-only body; no reconstructed C/catalog source is emitted')
        audit['methods'].append(method)
    audit['originalSymbolsSha256'] = SHA(symbols_raw)
    for method in audit['methods']:
        verify_extents(pe, method)
        if int(method['entryVA'], 16) in CONTEXT:
            continue
        folder = output / 'sources/Game'
        folder.mkdir(parents=True, exist_ok=True)
        name = method['bodyVA'][2:]
        asm = '\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction'] for row in method['instructions']) + '\n'
        (folder / (name + '.asm.txt')).write_text(asm, encoding='utf8', newline='\n')
        method['sourceRefs'] = dict(assembly='sources/Game/' + name + '.asm.txt', assemblySha256=SHA(asm.encode()))
        if 'reconstructedC' in method:
            c = '\n'.join(line.rstrip() for line in source_excerpt(study, method).splitlines()) + '\n'
            (folder / (name + '.c.txt')).write_text(c, encoding='utf8', newline='\n')
            method['sourceRefs'].update(c='sources/Game/' + name + '.c.txt', cSha256=SHA(c.encode()),
                cNormalization='rstrip-line-whitespace; LF line endings; final newline')
    captured_targets = {f'{int(method[field], 16):08x}' for method in audit['methods']
        for field in ['entryVA', 'bodyVA']}
    calls = []
    for method in audit['methods']:
        direct_targets = []
        for row in method['instructions']:
            match = re.fullmatch(r'CALL 0x([0-9a-f]{8})', row['instruction'])
            if match:
                target = match[1]
                record = catalog.get(target)
                calls.append(dict(caller=method['label'], callerEntry=method['entryVA'],
                    row=row, target=target, originalCatalog=record,
                    originalBodyCaptured=target in captured_targets))
                if target not in direct_targets:
                    direct_targets.append(target)
        method['directCallTargets'] = direct_targets
    tables = {}
    for label, begin, end in [('cppInitializers', 0x2056c000, 0x20655410), ('cInitializers', 0x20655514, 0x20655730)]:
        raw, section = image_bytes(pe, begin, end-begin)
        targets = struct.unpack('<' + 'I' * ((end-begin)//4), raw)
        non_null = [dict(index=index, slot=f'{begin+4*index:08x}', target=f'{target:08x}') for index, target in enumerate(targets) if target]
        tables[label] = dict(address=f'{begin:08x}', exclusiveEnd=f'{end:08x}', bytes=len(raw), sha256=SHA(raw),
            section=section, slots=len(targets), nonNullCount=len(non_null), firstNonNull=non_null[:12], lastNonNull=non_null[-6:],
            wholeTableExecuted=False, allTargetsWithinOriginalImage=all(pe.base <= target < pe.base+struct.unpack_from('<I',pe.data,pe.optional+56)[0] for target in targets if target))
        table_folder = output / 'tables'
        table_folder.mkdir(parents=True, exist_ok=True)
        (table_folder / (label+'.bin')).write_bytes(raw)
        (table_folder / (label+'.non-null.json')).write_text(json.dumps(non_null, separators=(',',':'))+'\n', encoding='utf8', newline='\n')
        tables[label]['completeOriginalRawRef'] = 'tables/' + label + '.bin'
        tables[label]['nonNullRef'] = 'tables/' + label + '.non-null.json'
        if label == 'cppInitializers':
            simple = []
            for entry in non_null:
                target = int(entry['target'],16)
                first = pe.bytes(target,11)
                if first[0] == 0xe8 and first[5] == 0xa3 and first[10] == 0xc3:
                    simple.append(dict(entry,callTarget=f'{target+5+struct.unpack_from("<i",first,1)[0]:08x}',
                        storeAddress=f'{struct.unpack_from("<I",first,6)[0]:08x}',bodyRaw=first.hex(),bodySha256=SHA(first),
                        instructionPatternOnly=True,nativeRuntimeOwnerAdmitted=False))
            (table_folder / 'cppInitializers.call-store-ret.json').write_text(json.dumps(simple,separators=(',',':'))+'\n',encoding='utf8',newline='\n')
            tables[label]['callStoreRetPatternCount'] = len(simple)
            tables[label]['callStoreRetPatternRef'] = 'tables/cppInitializers.call-store-ret.json'
    cold = {}
    for label,address,size in [('environmentMode',0x207d11b0,4),('commandLinePointer',0x207d2b60,4),
        ('environmentBlock',0x207d0a74,4),('ioHandleCount',0x207d29c4,4),('ioBlocks',0x207d2a20,256),
        ('argc',0x207d0a40,4),('argv',0x207d0a44,4),('envp',0x207d0a4c,4),('programName',0x207d0a5c,4),
        ('moduleName',0x207d10a8,261),('mbcInitialized',0x207d2b84,4),('environmentAllocated',0x207d2b6c,4),
        ('dynamicTlsInitializer',0x207d2b88,4),('miscFloatPointers',0x207b2330,40),
        ('sse2Flag207d2b40',0x207d2b40,4),('sse2Flag207d2b50',0x207d2b50,4),
        ('iobMaximum',0x207d29c0,4),('iobPointer',0x207d1664,4),('staticIobObjects',0x207b2e50,640)]:
        raw,section = image_bytes(pe,address,size)
        cold[label] = dict(module='Game',address=f'{address:08x}',bytes=size,raw=raw.hex(),knownMask='ff'*size,
            sha256=SHA(raw),section=section,scope='cold-original-image',liveValueCaptured=False)
    raw,section = image_bytes(pe,0x206b638c,4)
    constants = dict(mathInitializer=dict(module='Game',address='206b638c',bytes=4,raw=raw.hex(),knownMask='ffffffff',
        sha256=SHA(raw),section=section,scope='original-file-backed-constant',liveValueCaptured=False))
    section_begin = pe.optional + struct.unpack_from('<H',pe.data,pe.optional-4)[0]
    rdata_section = next((index,value) for index,value in enumerate(pe.sections) if
        value[1] <= 0x206b638c-pe.base and 0x206b638c-pe.base+4 <= value[1]+value[0])
    section_offset = section_begin + 40*rdata_section[0]
    section_flags = struct.unpack_from('<I',pe.data,section_offset+36)[0]
    existing_game = json.loads((repo/'assets/gothic3/game-crt/runtime-rules.json').read_bytes())
    math_method = next(method for method in audit['methods'] if method['label']=='fpMath')
    math_receipt = dict(schema='gothic3-game-math-initializer-static-receipt-v1',
        originalModuleSha256=SHA(pe.data),address='206b638c',rva=f'{0x206b638c-pe.base:x}',
        fileOffset=pe.offset(0x206b638c,4),bytes=4,raw=raw.hex(),sha256=SHA(raw),
        target=f'{struct.unpack("<I",raw)[0]:08x}',section=section,
        originalPESection=dict(name=pe.data[section_offset:section_offset+8].rstrip(b'\0').decode('ascii'),
            address=f'{pe.base+rdata_section[1][1]:08x}',characteristics=f'{section_flags:08x}',
            readable=bool(section_flags&0x40000000),writable=bool(section_flags&0x80000000),executable=bool(section_flags&0x20000000)),
        cinitCaller=dict(entry='204665f4',nonzeroCellTest='204665f4',readonlyProofCall='20466602',
            indirectMathCall='20466610',indirectMathCallRaw='ff158c636b20',attachArgument=0),
        targetSource=dict(entry=math_method['entryVA'],body=math_method['bodyVA'],bodyRanges=math_method['bodyRanges'],
            instructionCount=math_method['instructionCount'],bodyBytes=math_method['bodyByteCount'],
            bodySha256=math_method['bodyInstructionBytesSha256'],sourceRefs=math_method['sourceRefs'],
            reconstructedC=math_method['reconstructedC']),
        currentPackageGap=dict(runtimeRulesSha256=SHA((repo/'assets/gothic3/game-crt/runtime-rules.json').read_bytes()),
            pointerReceiptPresent=any(value['address']=='206b638c' for group in ['constBytes','coldGlobals'] for value in existing_game[group].values()),
            mathTargetMethodPresent=any(value['body']=='20463917' for value in existing_game['methods'].values())),
        sourceOnly=True,liveCellValueCaptured=False,nativeOrBrowserCodeExecuted=False)
    assert math_receipt['target']=='20463917' and math_receipt['originalPESection']['writable'] is False
    assert pe.bytes(0x20466610,6).hex()==math_receipt['cinitCaller']['indirectMathCallRaw']
    (output/'math-initializer-receipt.json').write_text(json.dumps(math_receipt,indent=2)+'\n',encoding='utf8',newline='\n')
    audit.pop('constants', None)
    audit.pop('tables', None)
    memcpy_root = repo / 'assets/gothic3/game-memcpy'
    memcpy_raw = (memcpy_root/'native-evidence.json').read_bytes()
    memcpy = json.loads(memcpy_raw)
    assert memcpy['schema'] == 'gothic3-game-memcpy-supplement-evidence-v1'
    assert memcpy['inputs']['Game.dll'] == SHA(pe.data) and memcpy['sourceOnly'] is True
    dependencies = dict(gameCrt={name:dict(path='assets/gothic3/game-crt/'+name,
        bytes=(repo/'assets/gothic3/game-crt'/name).stat().st_size,
        sha256=SHA((repo/'assets/gothic3/game-crt'/name).read_bytes()))
        for name in ['runtime-rules.json','native-evidence.json','source-manifest.json']},
        memcpy={name:dict(path='assets/gothic3/game-memcpy/'+name,
            bytes=(memcpy_root/name).stat().st_size,sha256=SHA((memcpy_root/name).read_bytes()))
            for name in ['native-evidence.json','source-manifest.json']})
    evidence = dict(schema='gothic3-game-attach-continuation-evidence-v1', originalModuleAudit=audit,
        directCalls=calls,
        directCallCaptureScope="Original body source captured in this candidate's originalModuleAudit.methods at normalized entryVA/bodyVA (including verified entry redirects); no live value, runtime ownership or execution claim, and no reuse of external dependency receipts.",
        contextualInitializerTables=tables,coldGlobals=cold,constBytes=constants,
        sourceDependencies=dependencies,
        sourceOnly=True, runtimeOwnersImplemented=False, currentLiveValuesCaptured=False,
        scope='Original source receipts and unexecuted context; no runtime owners, native/browser execution or CRT traversal')
    output.mkdir(parents=True, exist_ok=True)
    (output / 'native-evidence.json').write_text(json.dumps(evidence, separators=(',', ':'))+'\n', encoding='utf8', newline='\n')
    methods = {}
    for method in audit['methods']:
        label = method['label']
        refs = method.get('sourceRefs')
        refs_root = 'assets/gothic3/game-attach-continuation'
        if int(method['entryVA'],16) in CONTEXT:
            old = existing_game['methods'][label]
            assert old['bodyInstructionBytesSha256'] == method['bodyInstructionBytesSha256']
            refs = old['sourceRefs']
            refs_root = 'assets/gothic3/game-crt'
        methods[label] = dict(module='Game', entry=f"{int(method['entryVA'],16):08x}",
            body=f"{int(method['bodyVA'],16):08x}",bodyRanges=method['bodyRanges'],
            instructionCount=method['instructionCount'],bodyBytes=method['bodyByteCount'],
            bodyByteCount=method['bodyByteCount'],bodyInstructionBytesSha256=method['bodyInstructionBytesSha256'],
            entryChain=method['entryChain'],sourceRefs=refs,sourceRefsRoot=refs_root,
            sourceCGap=bool(method.get('sourceCGap',False)),sourceASMGap=bool(method.get('sourceASMGap',False)),
            originalCatalogGap=bool(method.get('originalCatalogGap',False)),
            sourceOnly=True,runtimeOwnerAdmitted=False,currentLiveValueCaptured=False)
    normalized_constants = dict(constants)
    for name in ['forwardAlignment','forwardDwords','forwardTail','backwardAlignment','backwardDwords','backwardTail']:
        value = memcpy['scalarJumpTables'][name]
        label = 'memcpy' + name[0].upper() + name[1:]
        normalized_constants[label] = dict(module='Game',address=value['address'],bytes=value['bytes'],
            raw=value['raw'],knownMask=value['knownMask'],sha256=value['sha256'],
            scope='original-file-backed-constant',liveValueCaptured=False,currentLiveValueCaptured=False,
            sourceProvenance=dict(package='assets/gothic3/game-memcpy',label=name,
                evidenceSha256=SHA(memcpy_raw),scope=value['scope'],originalPE=value['originalPE'],
                decodedWords=value['decodedWords'],dispatchInstructions=value['dispatchInstructions'],
                negativeIndexAlias=value.get('negativeIndexAlias')))
    rules = dict(schema='gothic3-game-attach-continuation-rules-v1',inputs=dict(Game=SHA(pe.data)),
        methods=methods,coldGlobals=cold,constBytes=normalized_constants,imports=dict(Game=audit['imports']),
        sourceDependencies=dependencies,contextualInitializerTables=tables,sourceOnly=True,
        runtimeOwnersImplemented=False,currentLiveValuesCaptured=False,wholeGameAttachOrCrtTraversalImplemented=False,
        scope='Original source receipts; other methods and complete C/C++ tables are unexecuted source context')
    (output/'runtime-rules.json').write_text(json.dumps(rules,separators=(',',':'))+'\n',encoding='utf8',newline='\n')
    readme = '''# Game attach continuation source

Reproduce from the repository root (replace STUDY with the original decompiled-study directory):

    python -B scripts/gothic3_game_memcpy_supplement.py --study "STUDY" --repo . --output assets/gothic3/game-memcpy
    python -B scripts/gothic3_game_attach_continuation.py --study "STUDY" --repo . --output assets/gothic3/game-attach-continuation

The source profile retains 39 original methods /2,167 instructions /6,256 bytes, including two existing Game CRT bodies as source context. Five initializers remain genuinely ASM-only: 20469f3a,2047470c,2047e687,204b11b0,204b11c0. No C/catalog recovery is invented. All original rows, bytes, extents, C file/line/hash references, ASM lines, cold masks, math initializer and dependency receipts remain available. The two reused bodies reference their unchanged Game CRT package.

runtime-rules.json normalizes method receipts, 19 cold ranges, the nonzero math pointer and six scalar memcpy storage ranges. The complete C++ table has 238,852 physical slots /2,468 callbacks; the C table has 135 slots /5 callbacks. They and the 363 CALL/store/RET patterns are source context only. No table traversal, live module mapping, runtime owner, native execution or full attach is claimed by this source package.

The native memcpy table ranges include 30 actual targets and two unreachable index0 words overlapping instruction tails/NOP padding. Their original readonly code provenance and negative-index aliases are retained. Runtime storage must preserve real physical aliases; copying old navigation/ScriptAdmin fragments into a larger table cannot establish canonical identity.

Only actual canonical reads/writers can establish current environment/command-line/CPU state. Source cold zeros are not host API results. Fresh native order and prior-writer closure are required before selecting the first-attach scalar memcpy branch. Vector bodies are captured separately; modulo16, signed placement, direction flags, exact SSE access order, masks and allocation lifetimes remain implementation requirements.

The manifests pin the actual final scripts and their loaded helpers, focused Game CRT dependencies and finalized memcpy supplement. Producers execute only offline parsing/hashing and leave the older Game CRT package unchanged.
'''
    (output/'README.md').write_text(readme,encoding='utf8',newline='\n')
    generated = [output/'native-evidence.json',output/'math-initializer-receipt.json',output/'runtime-rules.json',output/'README.md']
    generated.extend(path for path in (output/'sources').rglob('*') if path.is_file())
    generated.extend(path for path in (output/'tables').rglob('*') if path.is_file())
    manifest_records = [dict(path=path.relative_to(output).as_posix(),location='output',bytes=path.stat().st_size,sha256=SHA(path.read_bytes())) for path in generated]
    producer=Path(__file__).resolve()
    manifest_records.append(dict(path=producer.relative_to(repo).as_posix(),location='repo',bytes=producer.stat().st_size,sha256=SHA(producer.read_bytes())))
    helpers = sorted({Path(module.__file__).resolve() for module in sys.modules.values()
        if getattr(module,'__file__',None) and Path(module.__file__).resolve().is_relative_to(repo/'tools/gothic3')})
    for path in helpers:
        manifest_records.append(dict(path=path.relative_to(repo).as_posix(),location='repo',bytes=path.stat().st_size,sha256=SHA(path.read_bytes())))
    for dependency in [value for group in dependencies.values() for value in group.values()]:
        path=repo/dependency['path']
        manifest_records.append(dict(path=path.relative_to(repo).as_posix(),location='repo',bytes=path.stat().st_size,sha256=SHA(path.read_bytes())))
    originals = {Path('00_Original_Runtime/Game.dll'),Path('01_Decompiled_Code/Game_dll/functions.csv'),
        Path('01_Decompiled_Code/Game_dll/symbols.csv'),Path('01_Decompiled_Code/Game_dll/full_disassembly.asm')}
    originals.update(Path(method['reconstructedC']['path']) for method in audit['methods'] if 'reconstructedC' in method)
    for relative in sorted(originals):
        path=study/relative
        manifest_records.append(dict(path=relative.as_posix(),location='originalStudy',bytes=path.stat().st_size,sha256=SHA(path.read_bytes())))
    assert len(manifest_records) == len({(record['location'],record['path']) for record in manifest_records})
    manifest=dict(schema='gothic3-game-attach-continuation-source-manifest-v1',inputs=dict(Game=SHA(pe.data)),
        manifestSelfReferenceExcluded=True,wholeGameAttachOrCrtTraversalImplemented=False,
        sourceOnly=True,producerPath=producer.relative_to(repo).as_posix(),helperPaths=[path.relative_to(repo).as_posix() for path in helpers],
        files=sorted(manifest_records,key=lambda record:(record['location'],record['path'])))
    (output/'source-manifest.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n',encoding='utf8',newline='\n')
    print(json.dumps(dict(methods=[dict(label=method['label'], entry=method['entryVA'], count=method['instructionCount'],
        bytes=method['bodyByteCount'], sha256=method['bodyInstructionBytesSha256'], calls=method['directCallTargets']) for method in audit['methods']],
        imports=audit['imports'], tables=tables), indent=2))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--repo', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    arguments = parser.parse_args()
    capture(arguments.study.resolve(), arguments.repo.resolve(), arguments.output.resolve())
