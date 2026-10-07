"""Capture original Game ioInit/SEH source without executing native or TS code.

The package preserves cataloged source and separate PE-only gaps. Source capture
does not implement a stack, Windows endpoint, exception dispatch, or full ioInit.
"""
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
TARGETS = {
    0x204742ff: 'ioInit', 0x20468570: 'sehProlog4', 0x204685b5: 'sehEpilog4',
    0x20468600: 'exceptHandler4', 0x20467ad4: 'securityCheckCookie',
    0x2047649e: 'EH4CallFilter', 0x204764b5: 'EH4TransferHandler',
    0x204764ce: 'EH4GlobalUnwind', 0x204764e8: 'EH4LocalUnwind',
    0x204763ac: 'localUnwind4', 0x2046f891: 'nlgNotify',
    0x2048ebee: 'rtlUnwindThunk', 0x20476b2d: 'reportGsFailure',
}
REUSED = {'ioInit', 'sehProlog4', 'sehEpilog4'}
POINTS = {
    'callerIoInitCall': 0x204678ce, 'callerIoInitReturnTest': 0x204678d3,
    'callerIoInitResultBranch': 0x204678d5, 'callerIoInitFailureCall': 0x204678d7,
    'callerSetArgvCall': 0x204678de, 'ioLocalSizePush': 0x204742ff,
    'ioScopePush': 0x20474301, 'ioPrologCall': 0x20474306,
    'ioZeroEdi': 0x2047430b, 'ioTryLevelZeroStore': 0x2047430d,
    'ioStartupInfoAddress': 0x20474310, 'ioStartupInfoArgumentPush': 0x20474313,
    'ioGetStartupInfoCall': 0x20474314, 'ioTryLevelInactiveStore': 0x2047431a,
    'ioFirstCallocCall': 0x20474327, 'ioFirstBlockStore': 0x20474336,
    'ioHandleCountStore': 0x2047433b, 'ioAdditionalCallocCall': 0x204743aa,
    'ioInheritedGetFileTypeCall': 0x2047442a, 'ioInheritedSectionCall': 0x2047445e,
    'ioGetStdHandleCall': 0x204744b4, 'ioStandardGetFileTypeCall': 0x204744c6,
    'ioStandardSectionCall': 0x204744f4, 'ioSetHandleCountCall': 0x2047451e,
    'ioSuccessValue': 0x20474524, 'ioFailureValue': 0x20474536,
    'ioEpilogCall': 0x20474539, 'ioFinalReturn': 0x2047453e,
    'sectionLocalSizePush': 0x204741c7, 'sectionScopePush': 0x204741c9,
    'sectionPrologCall': 0x204741ce, 'sectionModuleLookupCall': 0x20474210,
    'sectionProcedureLookupCall': 0x20474220, 'sectionIndirectProcedureCall': 0x20474246,
    'sectionEpilogCall': 0x20474286, 'sectionFinalReturn': 0x2047428b,
}


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
    catalog = {r['address']: dict(r, csvLine=line) for line,r in enumerate(
        csv.DictReader(catalog_raw.decode('utf-8-sig').splitlines()), 2)}
    symbols = list(csv.DictReader(symbols_raw.decode('utf-8-sig').splitlines()))
    prior_roots = {'gameCrt': repo / 'assets/gothic3/game-crt',
                   'continuation': repo / 'assets/gothic3/game-attach-continuation'}
    old = json.loads((prior_roots['gameCrt'] / 'runtime-rules.json').read_bytes())
    continuation = json.loads((prior_roots['continuation'] / 'runtime-rules.json').read_bytes())
    assert old['inputs']['Game'] == GAME and continuation['inputs']['Game'] == GAME
    assert continuation['schema'] == 'gothic3-game-attach-continuation-rules-v1'
    dependencies = {name: {file: dict(path=(root/file).relative_to(repo).as_posix(),
        bytes=(root/file).stat().st_size, sha256=SHA((root/file).read_bytes()))
        for file in ['runtime-rules.json', 'native-evidence.json', 'source-manifest.json']}
        for name,root in prior_roots.items()}
    output.mkdir(parents=True, exist_ok=True)
    audit = native.audit_module(study, 'Game_dll', 'Game.dll', TARGETS)
    assert audit['assemblySha256'] == ASSEMBLY
    audit.pop('constants', None)
    audit.pop('tables', None)
    assert (len(audit['methods']), sum(m['instructionCount'] for m in audit['methods']),
        sum(m['bodyByteCount'] for m in audit['methods'])) == (13, 516, 1610)
    methods = {}
    all_refs = []
    for method in audit['methods']:
        verify_extents(pe, method)
        label, body = method['label'], method['bodyVA'][2:]
        method.update(originalCatalog=catalog[body], sourceOnly=True,
            runtimeOwnerAdmitted=False, currentLiveValueCaptured=False,
            sourceCGap=False, sourceASMGap=False, originalCatalogGap=False)
        asm = '\n'.join(r['va']+' | '+r['bytes']+' | '+r['instruction'] for r in method['instructions'])+'\n'
        c = '\n'.join(line.rstrip() for line in source_excerpt(study, method).splitlines())+'\n'
        if label in REUSED:
            prior = continuation['methods'][label]
            assert (prior['body'], prior['instructionCount'], prior['bodyByteCount'],
                prior['bodyInstructionBytesSha256']) == (body, method['instructionCount'],
                    method['bodyByteCount'], method['bodyInstructionBytesSha256'])
            refs = prior['sourceRefs']
            refs_root = prior['sourceRefsRoot']
            for name, content in [('assembly', asm), ('c', c)]:
                path = repo / refs_root / refs[name]
                assert path.read_bytes() == content.encode('utf8')
                assert SHA(path.read_bytes()) == refs[name+'Sha256']
                all_refs.append(path)
        else:
            folder = output / 'sources/Game'
            folder.mkdir(parents=True, exist_ok=True)
            (folder/(body+'.asm.txt')).write_text(asm, encoding='utf8', newline='\n')
            (folder/(body+'.c.txt')).write_text(c, encoding='utf8', newline='\n')
            refs = dict(assembly='sources/Game/'+body+'.asm.txt', assemblySha256=SHA(asm.encode()),
                c='sources/Game/'+body+'.c.txt', cSha256=SHA(c.encode()),
                cNormalization='rstrip-line-whitespace; LF line endings; final newline')
            refs_root = 'assets/gothic3/game-io-startup'
        method.update(sourceRefs=refs, sourceRefsRoot=refs_root)
        methods[label] = dict(module='Game', entry=method['entryVA'][2:], body=body,
            bodyRanges=method['bodyRanges'], instructionCount=method['instructionCount'],
            bodyBytes=method['bodyByteCount'], bodyByteCount=method['bodyByteCount'],
            bodyInstructionBytesSha256=method['bodyInstructionBytesSha256'], entryChain=method['entryChain'],
            sourceRefs=refs, sourceRefsRoot=refs_root, sourceCGap=False, sourceASMGap=False,
            originalCatalogGap=False, sourceOnly=True, runtimeOwnerAdmitted=False, currentLiveValueCaptured=False)

    def image(label, address, size, scope):
        raw, section = image_bytes(pe, address, size)
        start = pe.optional + struct.unpack_from('<H', pe.data, pe.optional-4)[0]
        index = next(i for i,s in enumerate(pe.sections)
            if s[1] <= address-pe.base and address-pe.base+size <= s[1]+s[0])
        header = start+40*index
        flags = struct.unpack_from('<I', pe.data, header+36)[0]
        return dict(module='Game', address=f'{address:08x}', rva=f'{address-pe.base:x}',
            bytes=size, raw=raw.hex(), knownMask='ff'*size, sha256=SHA(raw), section=section,
            originalPESection=dict(name=pe.data[header:header+8].rstrip(b'\0').decode(),
                headerFileOffset=header, characteristics=f'{flags:08x}', readable=bool(flags&0x40000000),
                writable=bool(flags&0x80000000), executable=bool(flags&0x20000000)),
            fileOffset=pe.offset(address,size) if section['fileBackedBytes']==size else None,
            scope=scope, sourceOnly=True, runtimeOwnerAdmitted=False,
            liveValueCaptured=False, currentLiveValueCaptured=False)

    cold = {label: image(label,address,size,'cold-original-image') for label,address,size in [
        ('ioHandleCount',0x207d29c4,4), ('ioBlocks',0x207d2a20,256), ('sehCxxCallbackCell',0x207d2b54,4),
        ('securityCookie',0x207b2314,4), ('securityCookieComplement',0x207b2318,4), ('crtSectionInitializer',0x207d109c,4)]}
    for label in ['ioHandleCount','ioBlocks']:
        assert cold[label]['raw'] == continuation['coldGlobals'][label]['raw']
        cold[label]['sourceDependency'] = dict(package='assets/gothic3/game-attach-continuation',label=label)
    for label in ['securityCookie','securityCookieComplement','crtSectionInitializer']:
        assert cold[label]['raw'] == old['coldGlobals'][label]['raw']
        cold[label]['sourceDependency'] = dict(package='assets/gothic3/game-crt',label=label)
    constants = {label: image(label,address,28,'original-file-backed-constant') for label,address in [
        ('ioInitEH4Scope',0x206e8e90),('sectionInitializerEH4Scope',0x206e8e70)]}
    for label, value in constants.items():
        assert value['originalPESection']['writable'] is False
        words = struct.unpack('<7I', bytes.fromhex(value['raw']))
        value['decodedDwords'] = [f'{word:08x}' for word in words]
        value['decodedStructure'] = dict(gsCookieOffset=struct.unpack('<i',struct.pack('<I',words[0]))[0],
            gsCookieXorOffset=words[1],ehCookieOffset=struct.unpack('<i',struct.pack('<I',words[2]))[0],
            ehCookieXorOffset=words[3],tryLevel0=dict(enclosingLevel=struct.unpack('<i',struct.pack('<I',words[4]))[0],
                filter=f'{words[5]:08x}',handler=f'{words[6]:08x}'))

    gaps = {}
    for label,address,size in [('ioInitFilterPEOnly',0x20474528,4),('ioInitHandlerPrefixPEOnly',0x2047452c,10)]:
        value = image(label,address,size,'original-PE-only-code-with-ASM-C-catalog-gaps')
        assert f'{address:08x}' not in catalog
        value.update(originalCatalogGap=True,sourceCGap=True,sourceASMGap=True,
            originalInstructions=[], reconstructedC=None,
            originalSymbols=[dict(row,csvLine=i) for i,row in enumerate(symbols,2) if row['address']==f'{address:08x}'])
        gaps[label] = value
    c_corpus = []
    for path in sorted((base/'pseudocode').glob('*.c')):
        raw=path.read_bytes()
        assert all('/* ENTRY '+value['address']+' |' not in raw.decode('utf8') for value in gaps.values())
        c_corpus.append(dict(path=path.relative_to(study).as_posix(),bytes=len(raw),sha256=SHA(raw)))
    gap_search = dict(sourceOnly=True, query='Original /* ENTRY <address> | records at 20474528 and 2047452c',
        catalogRecordsFound=0, reconstructedCEntriesFound=0, originalASMInstructionsFound=0,
        corpusFiles=c_corpus, corpusRecordSha256=SHA((json.dumps(c_corpus,separators=(',',':'))+'\n').encode()))
    decoded_inferences = dict(scope='Manual opcode interpretations inferred from verified PE bytes; no original ASM/C emitted',
        sourceOnly=True, runtimeOwnerAdmitted=False, independentlyDecodedRuntimeAdmission=False,
        ioInitFilterPEOnly=[dict(address='20474528',raw='33c0',interpretation='XOR EAX,EAX'),
            dict(address='2047452a',raw='40',interpretation='INC EAX'),dict(address='2047452b',raw='c3',interpretation='RET')],
        ioInitHandlerPrefixPEOnly=[dict(address='2047452c',raw='8b65e8',interpretation='MOV ESP,dword ptr [EBP-0x18]'),
            dict(address='2047452f',raw='c745fcfeffffff',interpretation='MOV dword ptr [EBP-4],-2')])
    point_addresses = set(POINTS.values())
    instruction_points = {}
    original_asm_hash = hashlib.sha256()
    gap_row_count = 0
    with (base/'full_disassembly.asm').open('rb') as stream:
        for line_number,line in enumerate(stream,1):
            original_asm_hash.update(line)
            match = re.fullmatch(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)',line.rstrip(b'\r\n'))
            if not match: continue
            address = int(match[1],16)
            if 0x20474528 <= address < 0x20474536: gap_row_count += 1
            if address not in point_addresses: continue
            raw = bytes.fromhex(match[2].decode())
            assert pe.bytes(address,len(raw)) == raw
            for label,va in POINTS.items():
                if address == va:
                    instruction_points[label] = dict(va=f'{address:08x}',rva=f'{address-pe.base:x}',
                        fileOffset=pe.offset(address,len(raw)),bytes=raw.hex(),instruction=match[3].decode(),assemblyLine=line_number)
    assert original_asm_hash.hexdigest() == ASSEMBLY and gap_row_count == 0
    assert set(instruction_points) == set(POINTS)
    for label in ['sehProlog4','sehEpilog4']:
        for row in next(m for m in audit['methods'] if m['label']==label)['instructions']:
            instruction_points[label+'_'+row['va']] = row

    frame = dict(sourceOnly=True, runtimeOwnerAdmitted=False, currentLiveValueCaptured=False,
        addressScope='Relative original x86 stack relationships only; no browser numerical x86 addresses assigned',
        entryStackSymbol='S',ebpRelativeToEntryStack=-4,espAfterPrologRelativeToEBP=-116,
        registrationRelativeToEBP=-16,startupInfoRelativeToEBP=-100,startupInfoBytes=68,
        originalLocalAllocationBytes=84,frameCookieRelativeToEBP=-116,
        encodedScopeRelativeToEBP=-8,tryLevelRelativeToEBP=-4,savedEspRelativeToEBP=-24,
        oldFsRelativeToEBP=-16,handlerRelativeToEBP=-12,exceptionPointersRelativeToEBP=-20,
        inheritedHandlesRelativeToEBP=-28,inheritedIndexRelativeToEBP=-32,
        savedRegisters={'EBX':-104,'ESI':-108,'EDI':-112,'EBP':0},incomingCallerReturnRelativeToEBP=4,
        callerReturnPC='204678d3',prologReturnPC='2047430b',epilogReturnPC='2047453e',finalIoReturnPC='204678d3',
        callerReturnSlotConsumedAt='2047453e',callerSlotSurvivesEpilog=True,
        prologRETExecuted=False,epilogRETExecuted=False,finalIoRETExecuted=False,
        protectedCallPC='20474314',protectedTryLevel=0,inactiveTryLevel=-2,
        runtimeBoundaryIsNativeException=False,cookieReadAddress='207b2314',scopeAddress='206e8e90',
        handlerAddress='20468600',FSChainWritten=False,FSChainRestored=False,
        arithmeticOwnerRequirement='Current same-Game cookie plus owned x86 address or reversible expression capability; preserve numerical unknown masks')
    original_imports = pe.imports()
    selected_import_addresses = {r['iatVA'] for r in audit['imports']}
    context_names = {'GetModuleHandleA','GetProcAddress','InitializeCriticalSection','SetLastError'}
    imports = [r for r in original_imports if r['iatVA'] in selected_import_addresses or r['name'] in context_names]
    import_usage = {r['iatVA']: dict(selectedBodyReference=r['iatVA'] in selected_import_addresses,
        dynamicSectionSourceContext=r['name'] in context_names,runtimeOwnerAdmitted=False) for r in imports}
    edge_targets = {field for method in audit['methods'] for field in [method['entryVA'][2:],method['bodyVA'][2:]]}
    edges = []
    for method in audit['methods']:
        for row in method['instructions']:
            if not row['instruction'].startswith(('CALL ','JMP ')): continue
            match = re.fullmatch(r'(CALL|JMP) 0x([0-9a-f]{8})',row['instruction'])
            edge = dict(caller=method['label'],callerEntry=method['entryVA'][2:],row=row,
                sourceOnly=True,runtimeOwnerAdmitted=False)
            if match:
                edge.update(target=match[2],originalCatalog=catalog.get(match[2]),
                    originalBodyCaptured=match[2] in edge_targets,
                    branchWithinCallerBody=any(int(a,16)<=int(match[2],16)<=int(b,16)
                        for a,b in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})',method['bodyRanges'])))
            edges.append(edge)
    flags = dict(sourceOnly=True,runtimeOwnersImplemented=False,currentLiveValuesCaptured=False,
        wholeIoInitImplemented=False,wholeExceptionDispatchImplemented=False,wholeGameAttachOrCrtTraversalImplemented=False)
    evidence = dict(schema='gothic3-game-io-startup-evidence-v1',inputs={'Game.dll':GAME},
        originalModuleAudit=audit,originalSymbolsSha256=SYMBOLS,coldGlobals=cold,constBytes=constants,
        peOnlyCode=gaps,originalGapSearch=gap_search,opcodeInterpretationInferences=decoded_inferences,
        instructionPoints=instruction_points,frameLayout=frame,callAndTailEdges=edges,
        directCallCaptureScope='Membership in these 13 original entry/body source captures; no owner or execution claim',
        imports={'Game':imports},importUsage=import_usage,sourceDependencies=dependencies,**flags)
    rules = dict(schema='gothic3-game-io-startup-rules-v1',inputs={'Game':GAME},methods=methods,
        coldGlobals=cold,constBytes=constants,peOnlyCode=gaps,instructionPoints=instruction_points,
        frameLayout=frame,imports={'Game':imports},importUsage=import_usage,sourceDependencies=dependencies,
        originalGapSearchSummary={k:v for k,v in gap_search.items() if k!='corpusFiles'},
        scope='Source captures only; caller, stack/FS graph, Windows endpoints and exception/IO owners require separate implementation',**flags)
    (output/'native-evidence.json').write_text(json.dumps(evidence,separators=(',',':'))+'\n',encoding='utf8',newline='\n')
    (output/'runtime-rules.json').write_text(json.dumps(rules,separators=(',',':'))+'\n',encoding='utf8',newline='\n')
    readme = '''# Original Game ioInit / SEH source

Reproduce from the repository root, replacing STUDY with the readonly original study directory:

    python -B scripts/gothic3_game_io_startup_source.py --study "STUDY" --repo . --output assets/gothic3/game-io-startup

This offline source package contains 13 cataloged bodies, 516 original instruction rows and 1,610 instruction bytes. Three bodies reuse exact sourceRefs in game-attach-continuation: ioInit, sehProlog4 and sehEpilog4 (218 rows / 651 bytes). Ten additional original C/ASM pairs contain 298 rows / 959 bytes. Original PE bytes, catalog/C paths and hashes, ASM line numbers and body extents are checked. Reconstructed C is explanatory, including Ghidra's SEH injection warnings; original x86 rows are authoritative.

The two readonly EH4 scopes are 206e8e90 and 206e8e70, each 28 bytes. Separate 14 PE-only bytes at 20474528–20474536 preserve genuine original C ENTRY/catalog/ASM gaps. No recovered C or original ASM is fabricated. Manual opcode interpretations are explicitly labeled inference and grant no runtime admission.

instructionPoints preserves native caller/prolog/epilog and ioInit PUSH/CALL/RET PCs. frameLayout is source context: EBP=S-4, returned prolog ESP=EBP-0x74, FS registration=EBP-0x10, STARTUPINFOA=EBP-0x64/68B. The prolog returns to 2047430b; the epilog returns to 2047453e; final ioInit RET must still consume the caller slot 204678d3. Local-frame retirement cannot retire that incoming slot early. Current cookie/stack/XOR relations and published FS state need actual owners; unknown interruption is not a native exception or permission to unwind/replay.

I/O cells, old cookie/cache aliases, all exception closure bodies, dynamic module/procedure context and imports remain source context until a connected consumer is implemented. Cold loader bytes do not establish current live values or API output. Capturing ioInit or its handler does not complete IO, EH dispatch, module attach, or CRT table traversal. Additional exception edges include local-unwind handler 2047643c, callee 2046f8b0, callback 207d2b54, NLG globals 207b2c40, RtlUnwind and report-GS-failure context/callee 2047e694.

The manifest pins this final producer, every actually loaded local helper, prior Game CRT/continuation dependencies, reused C/ASM artifacts, original PE/ASM/catalog/symbols and the entire C ENTRY corpus used to prove the genuine gaps. No external draft files or output self hash are dependencies. Earlier packages are read-only and are not regenerated.
'''
    (output/'README.md').write_text(readme,encoding='utf8',newline='\n')
    producer = Path(__file__).resolve()
    helpers = sorted({Path(module.__file__).resolve() for module in sys.modules.values()
        if getattr(module,'__file__',None) and Path(module.__file__).resolve().is_relative_to(repo/'tools/gothic3')})
    manifest = []
    def record(path, location, relative):
        manifest.append(dict(path=relative,location=location,bytes=path.stat().st_size,sha256=SHA(path.read_bytes())))
    for path in sorted(output.rglob('*')):
        if path.is_file() and path.name != 'source-manifest.json': record(path,'output',path.relative_to(output).as_posix())
    repo_files = {producer,*helpers,*all_refs}
    repo_files.update(repo / dep['path'] for group in dependencies.values() for dep in group.values())
    for path in sorted(repo_files): record(path,'repo',path.relative_to(repo).as_posix())
    originals = {study/'00_Original_Runtime/Game.dll',base/'functions.csv',base/'symbols.csv',base/'full_disassembly.asm'}
    originals.update(study / item['path'] for item in c_corpus)
    for path in sorted(originals): record(path,'originalStudy',path.relative_to(study).as_posix())
    assert len(manifest) == len({(r['location'],r['path']) for r in manifest})
    manifest_document = dict(schema='gothic3-game-io-startup-source-manifest-v1',inputs={'Game':GAME},
        manifestSelfReferenceExcluded=True,producerPath=producer.relative_to(repo).as_posix(),
        helperPaths=[path.relative_to(repo).as_posix() for path in helpers],
        files=sorted(manifest,key=lambda r:(r['location'],r['path'])),**flags)
    (output/'source-manifest.json').write_text(json.dumps(manifest_document,separators=(',',':'))+'\n',encoding='utf8',newline='\n')
    print(json.dumps(dict(methods=13,instructions=516,bodyBytes=1610,reusedMethods=3,newMethods=10,
        peOnlyGapBytes=14,imports=len(imports),instructionPoints=len(instruction_points),
        manifestRecords=len(manifest),producerSha256=SHA(producer.read_bytes()),
        runtimeRulesSha256=SHA((output/'runtime-rules.json').read_bytes())),indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',required=True,type=Path)
    parser.add_argument('--repo',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path)
    arguments = parser.parse_args()
    capture(arguments.study.resolve(),arguments.repo.resolve(),arguments.output.resolve())
