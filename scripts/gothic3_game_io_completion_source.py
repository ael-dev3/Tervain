"""Capture bounded original Game standard-I/O/section/final-return source.

Offline data only. Source receipts and declared virtual ABI grant no current
handle, PTD, section, stack-frame, import invocation or native execution.
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
ASM = 'fd23430904ab84b03e395bc4a705f5a475cc5816094603350a68e1bc2798f4dc'
CAT = '7683e99c3c22688b26c77eafc830f43abab471b9e9d3ca241e3157007c714018'
SYMBOLS = '4e92a5cb597f91d1c2eb661f171a1bb097175094dc32778bd6058676afea3eac'
TARGETS = {0x204742ff:'ioInit', 0x20468570:'sehProlog4', 0x204685b5:'sehEpilog4',
    0x204741c7:'sectionHelper', 0x20467ddb:'decodePointer', 0x204741b7:'sectionFallback',
    0x20467d64:'encodePointer', 0x2046645f:'getOsPlatform', 0x2046650e:'getWinMajor',
    0x20467cf8:'pointerEncodingAvailability', 0x204677e4:'callerAttach', 0x204681d9:'mtInit'}
ACTIVE = ('ioInit','sehProlog4','sehEpilog4','sectionHelper','decodePointer')
OLD_LABELS = {'sectionHelper':'initCritSecAndSpinCount','sectionFallback':'initCritSecFallback',
              'callerAttach':'crtAttach'}
RECOVERED = {'sectionFilter':('initCritSecExceptionFilter',0x2047424d,0x20474263),
    'sectionHandler':('initCritSecExceptionHandler',0x20474264,0x2047427b),
    'tlsGetterDispatcher':('tlsGetterDispatcher',0x20467e52,0x20467e66)}


def capture(study, repo, output):
    sys.path.insert(0, str(repo / 'tools/gothic3'))
    import read_dialogue_native_evidence as native
    from prepare_runtime_admin_source import image_bytes, source_excerpt
    from prepare_crt_undname_source import verify_extents
    base = study / '01_Decompiled_Code/Game_dll'
    original = (study / '00_Original_Runtime/Game.dll').read_bytes()
    cat_raw, sym_raw = (base / 'functions.csv').read_bytes(), (base / 'symbols.csv').read_bytes()
    assert SHA(original)==GAME and SHA(cat_raw)==CAT and SHA(sym_raw)==SYMBOLS
    catalog = {r['address']:dict(r,csvLine=i) for i,r in enumerate(csv.DictReader(cat_raw.decode('utf-8-sig').splitlines()),2)}
    pe = native.PE(original)
    assert pe.base==0x20000000
    roots = {name:repo/'assets/gothic3'/folder for name,folder in [('gameCrt','game-crt'),
        ('continuation','game-attach-continuation'),('ioAllocation','game-io-allocation')]}
    prior = {name:json.loads((root/'runtime-rules.json').read_bytes()) for name,root in roots.items()}
    schemas = {'gameCrt':'gothic3-game-crt-rules-v1', 'continuation':'gothic3-game-attach-continuation-rules-v1',
               'ioAllocation':'gothic3-game-io-allocation-rules-v1'}
    for name,rules in prior.items(): assert rules['schema']==schemas[name] and rules['inputs']['Game']==GAME
    dependencies = {name:{file:dict(path=(root/file).relative_to(repo).as_posix(),
        bytes=(root/file).stat().st_size,sha256=SHA((root/file).read_bytes()))
        for file in ('runtime-rules.json','native-evidence.json','source-manifest.json')} for name,root in roots.items()}
    audit = native.audit_module(study,'Game_dll','Game.dll',TARGETS)
    assert audit['assemblySha256']==ASM and audit['functionsCsvSha256']==CAT
    audit.pop('constants',None); audit.pop('tables',None)
    assert (len(audit['methods']),sum(m['instructionCount'] for m in audit['methods']),
            sum(m['bodyByteCount'] for m in audit['methods']))==(12,703,2118)
    originals = {study/'00_Original_Runtime/Game.dll',base/'functions.csv',base/'symbols.csv',base/'full_disassembly.asm'}
    refs, methods, contexts, all_points = set(), {}, {}, {}
    for method in audit['methods']:
        verify_extents(pe,method)
        label,entry = method['label'],method['bodyVA'][2:]
        package = 'continuation' if label in ('ioInit','sehProlog4','sehEpilog4') else 'gameCrt'
        old = prior[package]['methods'][OLD_LABELS.get(label,label)]
        assert (old['entry'],old['body'],old['instructionCount'],old['bodyBytes'],old['bodyInstructionBytesSha256'])==(
            entry,entry,method['instructionCount'],method['bodyByteCount'],method['bodyInstructionBytesSha256'])
        old_root = old.get('sourceRefsRoot',roots[package].relative_to(repo).as_posix())
        asm_text = '\n'.join(r['va']+' | '+r['bytes']+' | '+r['instruction'] for r in method['instructions'])+'\n'
        c_text = '\n'.join(line.rstrip() for line in source_excerpt(study,method).splitlines())+'\n'
        for kind,text in [('assembly',asm_text),('c',c_text)]:
            path=repo/old_root/old['sourceRefs'][kind]
            assert path.read_bytes()==text.encode() and SHA(path.read_bytes())==old['sourceRefs'][kind+'Sha256']
            refs.add(path)
        originals.add(study/method['reconstructedC']['path'])
        flags=dict(sourceOnly=True,runtimeOwnerAdmitted=False,currentLiveValueCaptured=False,
                   sourceCGap=False,sourceASMGap=False,originalCatalogGap=False,executionAdmitted=False)
        method.update(originalCatalog=catalog[entry],sourceRefs=old['sourceRefs'],sourceRefsRoot=old_root,**flags)
        context=dict(module='Game',entry=entry,body=entry,bodyRanges=method['bodyRanges'],
            instructionCount=method['instructionCount'],bodyBytes=method['bodyByteCount'],bodyByteCount=method['bodyByteCount'],
            bodyInstructionBytesSha256=method['bodyInstructionBytesSha256'],entryChain=method['entryChain'],
            sourceRefs=old['sourceRefs'],sourceRefsRoot=old_root,originalCatalog=catalog[entry],
            reconstructedC=method['reconstructedC'],listingOrigin='cataloged-original-C-and-ASM-body',**flags)
        contexts[label]=context
        if label in ACTIVE: methods[label]=context
        for row in method['instructions']:
            assert row['va'] not in all_points
            all_points[row['va']]=row
    all_points=dict(sorted(all_points.items()))
    points={row['va']:row for m in audit['methods'] if m['label'] in ACTIVE for row in m['instructions']}
    points=dict(sorted(points.items()))
    assert (len(methods),len(points),sum(m['bodyByteCount'] for m in methods.values()))==(5,304,908)
    recovered = {}
    for label,(old_label,first,last) in RECOVERED.items():
        assert f'{first:08x}' not in catalog
        old=prior['gameCrt']['methods'][old_label]
        assert old['sourceCGap'] and old['sourceASMGap'] and old['entry']==f'{first:08x}'
        path=roots['gameCrt']/old['sourceRefs']['assembly']
        assert SHA(path.read_bytes())==old['sourceRefs']['assemblySha256']
        rows=[]
        for line in path.read_text().splitlines():
            match=re.fullmatch(r'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)',line)
            assert match
            va,data,ins=match.groups(); data=bytes.fromhex(data)
            assert pe.bytes(int(va,16),len(data))==data
            rows.append(dict(va=va,rva=f'{int(va,16)-pe.base:x}',fileOffset=pe.offset(int(va,16),len(data)),
                             bytes=data.hex(),instruction=ins,assemblyLine=None))
        assert rows[0]['va']==f'{first:08x}' and int(rows[-1]['va'],16)+len(bytes.fromhex(rows[-1]['bytes']))==last+1
        raw=b''.join(bytes.fromhex(r['bytes']) for r in rows)
        assert (len(rows),len(raw),SHA(raw))==(old['instructionCount'],old['bodyBytes'],old['bodyInstructionBytesSha256'])
        refs.add(path)
        context=dict(module='Game',entry=f'{first:08x}',body=f'{first:08x}',bodyRanges=f'{first:08x}-{last:08x}',
            instructionCount=len(rows),bodyBytes=len(raw),bodyByteCount=len(raw),bodyInstructionBytesSha256=SHA(raw),
            sourceRefs=old['sourceRefs'],sourceRefsRoot=roots['gameCrt'].relative_to(repo).as_posix(),
            listingOrigin='PE-recovered-decode-context',decodedInstructions=rows,originalInstructions=[],
            reconstructedC=None,originalCatalog=None,sourceOnly=True,runtimeOwnerAdmitted=False,
            currentLiveValueCaptured=False,sourceCGap=True,sourceASMGap=True,originalCatalogGap=True,
            contextOnly=True,executionAdmitted=False,runtimeCallable=False,decodeIsInference=True,
            recovery=old['recovery'],sourceDependency=dict(package='assets/gothic3/game-crt',method=old_label))
        contexts[label]=context; recovered[label]=context
    c_corpus=[]
    for path in sorted((base/'pseudocode').glob('*.c')):
        data=path.read_bytes()
        for _,first,_ in RECOVERED.values(): assert '/* ENTRY '+f'{first:08x}'+' |' not in data.decode('utf8')
        originals.add(path)
        c_corpus.append(dict(path=path.relative_to(study).as_posix(),bytes=len(data),sha256=SHA(data)))
    assert len(c_corpus)==130
    asm_hash, gap_rows = hashlib.sha256(), {label:[] for label in RECOVERED}
    with (base/'full_disassembly.asm').open('rb') as stream:
        for line in stream:
            asm_hash.update(line)
            match=re.fullmatch(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)',line.rstrip(b'\r\n'))
            if match:
                va=int(match[1],16)
                for label,(_,first,last) in RECOVERED.items():
                    if first<=va<=last: gap_rows[label].append(line.decode())
    assert asm_hash.hexdigest()==ASM and not any(gap_rows.values())
    gap_summary=dict(sourceOnly=True,catalogEntriesFound=0,originalCEntriesFound=0,originalASMRowsFound=0,
        searchedEntries=[f'{first:08x}' for _,first,_ in RECOVERED.values()],
        searchedInclusiveExtents=[f'{first:08x}-{last:08x}' for _,first,last in RECOVERED.values()],
        corpusFiles=c_corpus,corpusRecordSha256=SHA((json.dumps(c_corpus,separators=(',',':'))+'\n').encode()))

    def image(label,address,size,group,package):
        data,section=image_bytes(pe,address,size)
        sb=pe.optional+struct.unpack_from('<H',original,pe.optional-4)[0]
        index=next(i for i,s in enumerate(pe.sections) if s[1]<=address-pe.base and address-pe.base+size<=s[1]+s[0])
        header=sb+40*index; bits=struct.unpack_from('<I',original,header+36)[0]
        old=prior[package][group][label]
        assert old['address']==f'{address:08x}' and old['bytes']==size and old['raw']==data.hex()
        assert old['knownMask']=='ff'*size and old['sha256']==SHA(data) and not old['liveValueCaptured']
        return dict(module='Game',address=f'{address:08x}',rva=f'{address-pe.base:x}',bytes=size,
            raw=data.hex(),knownMask='ff'*size,sha256=SHA(data),section=section,
            originalPESection=dict(name=original[header:header+8].rstrip(b'\0').decode(),headerFileOffset=header,
                characteristics=f'{bits:08x}',readable=bool(bits&0x40000000),writable=bool(bits&0x80000000),executable=bool(bits&0x20000000)),
            fileOffset=pe.offset(address,size) if section['fileBackedBytes']==size else None,
            scope='cold-original-image' if group=='coldGlobals' else 'original-file-backed-constant',
            sourceOnly=True,runtimeOwnerAdmitted=False,liveValueCaptured=False,currentLiveValueCaptured=False,
            canonicalImageLabel=label,sourceDependency=dict(package=roots[package].relative_to(repo).as_posix(),group=group,label=label),
            initializationScope='Reuses already admitted canonical Game image; never a current-value capture or later reseed')
    cold={label:image(label,address,size,'coldGlobals',package) for label,address,size,package in [
        ('crtSectionInitializer',0x207d109c,4,'gameCrt'),('crtTlsIndexes',0x207b231c,8,'gameCrt'),
        ('securityCookie',0x207b2314,4,'gameCrt'),('ioBlocks',0x207d2a20,256,'ioAllocation'),
        ('ioHandleCount',0x207d29c4,4,'ioAllocation')]}
    constants={'sectionInitExceptionTable':image('sectionInitExceptionTable',0x206e8e70,28,'constBytes','gameCrt')}
    constants['sectionInitExceptionTable']['decodedDwords']=[f'{v:08x}' for v in struct.unpack('<7I',bytes.fromhex(constants['sectionInitExceptionTable']['raw']))]
    assert constants['sectionInitExceptionTable']['sha256']=='36dc118036177a0d603ac06396ff6ab04814298829c3132fe7afc883ebc03901'
    assert cold['crtSectionInitializer']['fileOffset'] is None and cold['crtSectionInitializer']['section']['loaderZeroFillBytes']==4
    selected_iats={'0x207d7bbc':'GetStdHandle','0x207d7c18':'GetFileType','0x207d7c14':'SetHandleCount',
        '0x207d7b8c':'TlsGetValue','0x207d7b5c':'GetModuleHandleA','0x207d7c94':'GetProcAddress',
        '0x207d7c10':'InitializeCriticalSection','0x207d7ba0':'SetLastError'}
    imports=[r for r in pe.imports() if r['iatVA'] in selected_iats]
    assert len(imports)==8
    for r in imports: assert r['module']=='KERNEL32.dll' and r['name']==selected_iats[r['iatVA']] and r['ordinal'] is None
    call_names={'standardHandleCall':'204744b4','fileTypeCall':'204744c6','sectionCall':'204744f4',
        'sectionPrologCall':'204741ce','decodeWrapperCall':'204741de','tlsGetterCall':'20467de8',
        'tlsDispatchCall':'20467dff','flsGetterCall':'20467e01','decodeEndpointCall':'20467e3d',
        'spinEndpointCall':'20474246','sectionEpilogCall':'20474286','sectionFinalReturn':'2047428b',
        'setHandleCountCall':'2047451e','outerEpilogCall':'20474539','outerFinalReturn':'2047453e'}
    call_sites={label:points[pc] for label,pc in call_names.items()}
    source_context_points={'204678d3':all_points['204678d3']}
    captured={m[field][2:] for m in audit['methods'] for field in ('entryVA','bodyVA')}
    edges=[]
    for method in audit['methods']:
        if method['label'] not in ACTIVE: continue
        for row in method['instructions']:
            match=re.fullmatch(r'(CALL|JMP) 0x([0-9a-f]{8})',row['instruction'])
            if match:
                target=match[2]
                edges.append(dict(caller=method['label'],row=row,target=target,originalCatalog=catalog.get(target),
                    originalBodyCaptured=target in captured,sourceOnly=True,runtimeOwnerAdmitted=False))
    span=lambda a,b:[pc for pc in points if a<=pc<=b]
    decode=span('20467ddb','20467e0d')+span('20467e35','20467e48')
    section=span('204741c7','204741ce')+span('20468570','204685b4')+span('204741d3','204741de')+decode+\
        span('204741e3','204741e8')+span('2047423d','2047424b')+span('2047427c','20474286')+span('204685b5','204685c8')+['2047428b']
    prefix=[pc for pc in span('2047447f','204744a2') if not '20474491'<=pc<='2047449a']
    identifier=span('204744a9','204744b3')
    slot=span('204744b4','204744da')+['204744dc','204744e0']+span('204744eb','204744f4')+section+\
        span('204744f9','20474502')+span('2047450e','20474512')
    finish=span('20474518','20474526')+['20474539']+span('204685b5','204685c8')+['2047453e']
    normal=slot+2*(prefix+identifier+slot)+finish
    null_slot=span('204744b4','204744c3')+span('20474504','20474512')
    headless=null_slot+2*(prefix+identifier+null_slot)+finish
    assert (len(decode),len(section),len(normal),len(headless))==(25,78,368,80)
    def ledger(addresses,total,scope):
        return dict(sourceOnly=True,runtimeOwnerAdmitted=False,currentLiveValueCaptured=False,
            scope=scope,priorOperations=531,addedOperations=len(addresses),totalOperations=total,
            instructionAddresses=addresses,instructionRowsSha256=SHA((json.dumps([points[pc] for pc in addresses],separators=(',',':'))+'\n').encode()),
            nextBoundaryPC='204678d3',nextBoundaryExecuted=False,ioInitFinalReturnPC='2047453e',
            completedRuntimeExecutionCaptured=False,sourceBranchesForced=False)
    frame=dict(sourceOnly=True,currentLiveValueCaptured=False,outerEBPRelativeToInitialESP=-8,
        entryESPRelativeToOuterEBP=-120,standardImportReturnRelativeToOuterEBP=-124,
        standardImportNormalESPRelativeToOuterEBP=-116,sectionEBPRelativeToOuterEBP=-132,
        sectionESPAfterPrologRelativeToSectionEBP=-52,sectionRegistrationRelativeToSectionEBP=-16,
        sectionSavedOuterFsRelativeToSectionEBP=-16,sectionSavedESPRelativeToSectionEBP=-24,
        sectionSavedRegisters={'EBX':-40,'ESI':-44,'EDI':-48,'EBP':0},
        sectionReturnRelativeToSectionEBP=4,sectionPointerArgumentRelativeToSectionEBP=8,
        sectionSpinArgumentRelativeToSectionEBP=12,sectionSpinArgument=4000,
        decodeWrapperReturnRelativeToSectionEBP=-60,decodeArgumentRelativeToSectionEBP=-56,
        decodeSavedESIRelativeToSectionEBP=-64,deepestDecodeTLSCallRelativeToSectionEBP=-76,
        spinReturnRelativeToSectionEBP=-64,spinNormalESPRelativeToSectionEBP=-52,
        selectedTailDeepestStackBytes=216,wholeIoExistingAllocatorDepthBytes=224,
        outerRegistrationRelativeToOuterEBP=-16,outerCallerReturnRelativeToOuterEBP=4,
        outerCallerReturnPC='204678d3',outerFinalReturnPC='2047453e',finalESPRelativeToInitialESP=0,
        finalReturnConsumesOriginalCallerWord=True,returnedFrameGrantsOperations=False,
        originalHandlerExecutionOwned=False,sourceCookieAddress='207b2314',sourceScopeAddress='206e8e70')
    abi=dict(sourceOnly=True,originalWindowsCalleesCaptured=False,nativeEndpointsExecuted=False,
        scope='Explicit virtual Win32 contract; actual private Runtime normal outcome and physical CALL proof required',
        standardHandle={'callPC':'204744b4','iat':'207d7bbc','returnPC':'204744ba','callingConvention':'stdcall','argumentBytes':4},
        fileType={'callPC':'204744c6','iat':'207d7c18','returnPC':'204744cc','callingConvention':'stdcall','argumentBytes':4},
        setHandleCount={'callPC':'2047451e','iat':'207d7c14','returnPC':'20474524','callingConvention':'stdcall','argumentBytes':4},
        tlsCalls=[{'callPC':pc,'returnPC':ret,'iat':'207d7b8c','callingConvention':'stdcall','argumentBytes':4} for pc,ret in [('20467de8','20467dea'),('20467dff','20467e01')]],
        flsGet={'callPC':'20467e01','returnPC':'20467e03','callingConvention':'stdcall','argumentBytes':4,'indirectCurrentProcedure':True,'nativeDispatcher20467e52Entered':False},
        decode={'callPC':'20467e3d','returnPC':'20467e3f','callingConvention':'stdcall','argumentBytes':4,'indirectCurrentProcedure':True},
        spin={'callPC':'20474246','returnPC':'20474248','callingConvention':'stdcall','argumentBytes':8,'indirectCurrentProcedure':True},
        sourceSection={'callPC':'204744f4','returnPC':'204744f9','callingConvention':'cdecl','callerArgumentBytes':8},
        sourceDecode={'callPC':'204741de','returnPC':'204741e3','callingConvention':'cdecl','callerArgumentBytes':4},
        normalPreservedRegisters=['EBX','ESI','EDI','EBP'],normalPreservedFS=True,
        normalUnknownRegisters=['ECX','EDX'],normalArithmeticFlags='unknown',
        unknownOutcomeGrantsCleanup=False,escapedHostErrorIsNativeException=False,
        copiedHandleLabelsMintCapabilities=False,hostWindowsHandlesObserved=False)
    counts=dict(activeBodies=5,activeOriginalRows=304,activeOriginalBodyBytes=908,sourceContextInstructionPoints=1,
        catalogedOriginalBodies=12,catalogedOriginalRows=703,catalogedOriginalBodyBytes=2118,
        peRecoveredContextListings=3,peRecoveredContextRows=20,peRecoveredContextBytes=68,
        totalContextListings=15,totalContextRows=723,totalContextBodyBytes=2186,
        cachedDecodeOperations=25,fullCachedSectionOperations=78,normalTailOperations=368,normalTotalOperations=899,
        headlessTailOperations=80,headlessTotalOperations=611)
    flags=dict(sourceOnly=True,runtimeOwnersImplemented=False,currentLiveValuesCaptured=False,
        wholeIoInitImplemented=False,wholeExceptionDispatchImplemented=False,
        wholeGameAttachOrCrtTraversalImplemented=False,sourceMetadataGrantsExecution=False)
    common=dict(methods=methods,instructionPoints=points,sourceContextInstructionPoints=source_context_points,
        callSites=call_sites,coldGlobals=cold,constBytes=constants,sourceContext=contexts,
        imports={'Game':imports},sourceDependencies=dependencies,counts=counts,
        selectedNormalPath=ledger(normal,899,'Static expected three valid virtual CHAR handles/current cached spin/current PTD path; no observed execution'),
        selectedHeadlessNullPath=ledger(headless,611,'Static expected three genuinely normal NULL standard handles; no console initialization claim'),
        frameLayout=frame,declaredCompatibilityABI=abi,
        currentDependencyRequirements=['Current canonical207d109c encoded procedure, never cold zero or reseed',
            'Current207b231c/207b2320 and actual retained same-CRT532B PTD membership/backing',
            'Current PTD+1fc private DecodePointer and current private spin procedure',
            'Same returned1792B backing/current ioBlocks; true24B record+0xc aliases and physical section registration',
            'Actual current flags/words/masks and per-call private grants; unknown preserves effects without return',
            'Final RET consumes original204678d3 word; expired IO frame cannot replay writer or authorize caller'],
        **flags)
    evidence=dict(schema='gothic3-game-io-completion-evidence-v1',inputs={'Game.dll':GAME},
        originalModuleAudit=audit,originalCatalogSha256=CAT,originalAssemblySha256=ASM,originalSymbolsSha256=SYMBOLS,
        originalGapSearch=gap_summary,directCallAndTailEdges=edges,
        directCallCaptureScope='Membership in twelve cataloged original entry/body source captures; no runtime execution claim',**common)
    rules=dict(schema='gothic3-game-io-completion-rules-v1',inputs={'Game':GAME},
        originalGapSearchSummary={k:v for k,v in gap_summary.items() if k!='corpusFiles'},**common)
    output.mkdir(parents=True,exist_ok=True)
    for name,doc in [('runtime-rules.json',rules),('native-evidence.json',evidence)]:
        (output/name).write_text(json.dumps(doc,separators=(',',':'))+'\n',encoding='utf8',newline='\n')
    readme='''# Original Game standard-I/O and final ioInit return source

Reproduce from the repository root with the unchanged original readonly study:

    python -B scripts/gothic3_game_io_completion_source.py --study "STUDY" --repo . --output assets/gothic3/game-io-completion

This four-output supplement reuses five full original C/ASM bodies: ioInit, SEH prolog/epilog, section helper and DecodePointer wrapper (304 rows/908 B). One separate original caller TEST204678d3 receipt is an unexecuted boundary. No source listing is duplicated. Original PE, catalog, C ENTRY/excerpt, ASM line/extents, source hashes and exact eight IATs are checked; earlier packages are read-only.

Retained context is 12 cataloged original C/ASM bodies703 rows/2118 B plus three PE-recovered decode listings20 rows/68 B (aggregate15/723/2186). Exception filter2047424d, handler20474264 and TLS compiler thunk20467e52 preserve genuine catalog/C/ASM gaps, inferred decode scope, and noncallable context. They never enter the active instruction getter. The full130-file C corpus and original ASM/catalog hashes prove the missing entries; no fabricated C, catalog records or native EH dispatch are supplied.

The static selected character-handle path adds368 operations to531, reaching899: three real source section calls, each with21 own rows,21 prolog,25 DecodePointer wrapper and11 epilog rows; actual TLS/FLS/Decode/spin calls; original argument cleanup, SetHandleCount, outer epilog and final RET. Three explicitly normal NULL handles follow a separate80/611 ledger. These are expected source paths, not observed runtime execution or permission to force branches. Normal/failure/unknown outcomes remain distinct.

Existing canonical sectionInitExceptionTable206e8e70/28 B is reused readonly, and crtSectionInitializer207d109c/4 B retains loader-zero provenance. Existing TLS indices, cookie and107 IO globals are reused aliases. No source receipt captures a live cache, PTD, handle, allocation, current Windows output or grants reseeding. Each reached runtime call must prove current private procedure/PTD/heap/section/frame authority. Direct Runtime FlsGetValue at20467e01 does not execute native thunk20467e52.

The actual section frame EBP=outerEBP-0x84 and deepest selected tail216 B preserve107's larger224 B allocator requirement. Three24 B sections alias record+0xc in the same1792 B backing; opaque initialization requires real physical registration and overlap invalidation, not copied zero storage. Unknown calls retain pending returns/current FS/applied stores with no invented unwind, cleanup or replay. Normal IO0 requires final RET2047453e consuming the original incoming204678d3 return word; returned stack-frame descriptions grant no writer or caller continuation.

The virtual stdcall4/stdcall8 policy is explicit compatibility, not captured native Windows callee code or host HANDLE numbers. Old provider omissions still require missing endpoints. Resolver/fallback/exception branches remain source-only until independently owned when reached. These receipts do not complete caller TEST/JGE, CRT/module startup, native NPC activation, console I/O or the campaign.

The manifest pins this final producer, actually loaded helpers, nine unchanged prior dependency JSON documents,27 reused C/ASM receipts and original PE/catalog/ASM/symbols/C corpus. No outside design/draft dependency, output self hash or dependency cycle is introduced. All four outputs regenerate deterministically.
'''
    (output/'README.md').write_text(readme,encoding='utf8',newline='\n')
    producer=Path(__file__).resolve()
    helpers=sorted({Path(m.__file__).resolve() for m in sys.modules.values() if getattr(m,'__file__',None)
                    and Path(m.__file__).resolve().is_relative_to(repo/'tools/gothic3')})
    manifest=[]
    def record(path,location,relative):
        manifest.append(dict(location=location,path=relative,bytes=path.stat().st_size,sha256=SHA(path.read_bytes())))
    for path in sorted(output.rglob('*')):
        if path.is_file() and path.name!='source-manifest.json':record(path,'output',path.relative_to(output).as_posix())
    repo_files={producer,*helpers,*refs}
    repo_files.update(repo/d['path'] for group in dependencies.values() for d in group.values())
    for path in sorted(repo_files):record(path,'repo',path.relative_to(repo).as_posix())
    for path in sorted(originals):record(path,'originalStudy',path.relative_to(study).as_posix())
    assert len(manifest)==len({(r['location'],r['path']) for r in manifest})
    doc=dict(schema='gothic3-game-io-completion-source-manifest-v1',inputs={'Game':GAME},
        manifestSelfReferenceExcluded=True,producerPath=producer.relative_to(repo).as_posix(),
        helperPaths=[p.relative_to(repo).as_posix() for p in helpers],
        files=sorted(manifest,key=lambda r:(r['location'],r['path'])),**flags)
    (output/'source-manifest.json').write_text(json.dumps(doc,separators=(',',':'))+'\n',encoding='utf8',newline='\n')
    print(json.dumps(dict(**counts,manifestRecords=len(manifest),reusedSourceFiles=len(refs),outputFiles=4,
        producerSha256=SHA(producer.read_bytes()),runtimeRulesSha256=SHA((output/'runtime-rules.json').read_bytes())),indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',required=True,type=Path)
    parser.add_argument('--repo',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args()
    capture(args.study.resolve(),args.repo.resolve(),args.output.resolve())
