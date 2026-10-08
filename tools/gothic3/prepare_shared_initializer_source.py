"""Capture SharedBase initializer tables and their original callback bodies.

Read-only PE/disassembly audit. Capturing a callback does not execute it.
"""
import argparse
import csv
import hashlib
import json
import re
import struct
import sys
from pathlib import Path

import read_dialogue_native_evidence as native
from prepare_runtime_admin_source import INPUT_SHA, image_bytes, source_excerpt


def capture(study, output):
    native.EXPECTED_INPUTS['SharedBase.dll'] = INPUT_SHA
    binary = (study / '00_Original_Runtime/SharedBase.dll').read_bytes()
    if hashlib.sha256(binary).hexdigest() != INPUT_SHA:
        raise ValueError('Unsupported SharedBase module')
    pe = native.PE(binary)
    tables = {}
    targets = {
        0x100ada4c: 'crtAttachCaller', 0x1000619f: 'initializer142Getter', 0x10005e5c: 'initializer143Getter',
        0x10048ff0:'pool1792Dispatch',0x1000322e:'pool1792Allocate',0x1000717b:'pool1792Initialize',
        0x10048050: 'pool24Dispatch', 0x10002b3f: 'pool24Initialize', 0x10004557: 'pool24Allocate',
        0x100a7300: 'classNameStrchr', 0x100c0e29: 'typeInfoCopyName', 0x100b09ee: 'typeInfoUnlockCleanup', 0x100b2a80: 'typeInfoOutputLength', 0x100c14dd: 'demanglerHeapDestructor', 0x100c61dc: 'demanglerUnlockCleanup', 0x100aa9a4: 'crtFree',
        0x100c2048: 'demanglerDnameGetString', 0x100c2301: 'demanglerIndirectGetString', 0x100c22b2: 'demanglerTextGetString',
        0x100c1feb: 'demanglerDnameLength', 0x100c22e3: 'demanglerIndirectNodeLength', 0x100c1d9c: 'demanglerTextNodeLength',
        0x100c27dd: 'demanglerDnameConcat', 0x100c21f4: 'demanglerCloneNode',
        0x100c1d3a: 'demanglerNodeConcat', 0x100c1da0: 'demanglerIndirectNodeConstructor',
        0x100c43c1: 'demanglerScopedName', 0x100c41d7: 'demanglerZName',
        0x100c25e0: 'demanglerDelimitedConstructor', 0x100c21ad: 'demanglerReplicatorAppend',
        0x100c1f89: 'demanglerDnameIsEmpty', 0x100b01c8: 'demanglerSecurityCookieCheck',
        0x100c28e6: 'demanglerTextConstructor', 0x100c24e3: 'demanglerDoPchar',
        0x100c223b: 'demanglerTextNodeConstructor', 0x100c1e13: 'demanglerBoundedTextCopy',
        0x100c44b4: 'demanglerEcsuDataType', 0x100c6288: 'demanglerSimpleDataType', 0x100c1c80: 'demanglerDnameAppend', 0x100c29ed: 'demanglerTypeEncodingAppend', 0x100c1b6a: 'demanglerDnameCopy',
        0x100c1fa0: 'demanglerDnameValid', 0x100c59ab: 'demanglerTypeEncoding', 0x100c2589: 'demanglerTypeEncodingDname',
        0x100c51ce: 'demanglerDeclaration', 0x100c674d: 'demanglerDataType',
        0x100c1ed2: 'demanglerDnameConstructor', 0x100c660f: 'demanglerPrimaryType',
        0x100c5e8f: 'unDecoratorToString', 0x100c2351: 'unDecoratorConstructor', 0x100c218f: 'replicatorConstructor',
        0x100c1f28: 'replicatorListConstructor', 0x100c1ac7: 'demanglerScratchAllocate',
        0x100c1dcf: 'dnameNodeConstructor',
        0x100bb892: 'crtLock', 0x100bb7a2: 'crtUnlock',
        0x100bb889: 'initializeLockCleanup', 0x100bbf27: 'initializeCriticalSection',
        0x100bb7cf: 'crtInitializeLock', 0x100aeed0: 'mallocWrapper',
        0x100c6142: 'sharedUnDName',
        0x100a7099: 'typeInfoName', 0x100b0902: 'typeInfoNameBase',
        0x100088cd: 'classNameUnMangle', 0x100a7430: 'strstr',
        0x100a7a00: 'memcpy', 0x100a7980: 'memset', 0x100012e4: 'heapAddPointerArea',
        0x100aabd2: 'crtOperatorNew', 0x100aaaf6: 'crtMalloc',
        0x10001028: 'heapAllocate', 0x10047f10: 'pool16Dispatch',
        0x100061cc: 'pool16Initialize', 0x1000605a: 'pool16Allocate',
        0x10003cd8: 'memoryMalloc',
        0x10002aae: 'memoryGetInstance',
        0x1000779d: 'emptyStringConstructor', 0x10003ba7: 'rootTextConstructor', 0x10007d65: 'rootTextAlloc',
        0x100aa632: 'cinit', 0x100ae900: 'isNonwritableInCurrentImage',
        0x100b4407: 'initializeFloatConversions', 0x100aa47d: 'inittermError',
        0x100a72d0: 'atexit', 0x100a7294: 'onexit',
        0x100ae2f2: 'decodePointer', 0x100b10d6: 'allocationSize',
        0x100aa453: 'lockExitTable', 0x100aa45c: 'unlockExitTable',
        0x100a72ca: 'releaseExitTable', 0x100aef10: 'callocWrapper',
        0x100a788e: 'installFloatConversions', 0x100b448b: 'queryFloatDivisionErratum',
        0x100b4426: 'setDefaultPrecision', 0x100ae27b: 'encodePointer',
        0x100ae20f: 'pointerEncodingAvailable',
        0x100aeb68: 'exceptionFrameEnter', 0x100aebad: 'exceptionFrameLeave',
        0x100ce062: 'processorProbeExceptionFilter',
        0x100ce07e: 'processorProbeExceptionHandler',
        0x100a71ac: 'appendExitCallback', 0x100ce095: 'queryProcessorFeature',
        0x100ae880: 'validateImageHeader', 0x100ae8b0: 'findImageSection',
        0x100b444f: 'queryFloatDivisionFallback', 0x100ce045: 'processorFeatureProbe',
    }
    for label, address, size in [
        ('floatingPointHook', 0x100ed568, 4),
        ('errorInitializers', 0x100e545c, 0x21c),
        ('voidInitializers', 0x100e5000, 0x358),
        ('dynamicTlsHook', 0x102f858c, 4),
    ]:
        raw, section = image_bytes(pe, address, size)
        entries = struct.unpack('<' + 'I' * (size // 4), raw)
        callbacks = [dict(index=index, slotVA=f'{address + index * 4:08x}',
                          targetVA=f'{target:08x}')
                     for index, target in enumerate(entries) if target]
        tables[label] = dict(address=f'{address:08x}', endExclusive=f'{address+size:08x}',
                             raw=raw.hex(), sha256=hashlib.sha256(raw).hexdigest(),
                             entryCount=len(entries), callbacks=callbacks, section=section,
                             scope='cold-original-image', liveValueCaptured=False)
        for callback in callbacks:
            target = int(callback['targetVA'], 16)
            targets.setdefault(target, label + '_' + str(callback['index']))
    cold = {}
    for label, address, size in [('floatConversionTable',0x10141480,40),
        ('crtAttachCount',0x102f648c,4), ('floatDivisionErratum',0x102f6424,4), ('exitTableBegin',0x102f8580,4),
        ('exitTableEnd',0x102f8584,4), ('rtcTerminators',0x100f7ef4,256),
        ('processorFeature',0x102f853c,4), ('memcpySseEnabled',0x102f854c,4),
        ('stdioCount',0x102f8500,4), ('stdioVector',0x102f71c0,4),
        ('stdioFiles',0x10141790,640),
        ('className142State',0x102f47e4,12), ('className142Published',0x102f48bc,4),
        ('emptyString144',0x102f48e8,4), ('className143State',0x102f47f0,12), ('className143Published',0x102f48b8,4),
        ('className142TypeInfo',0x10140148,32), ('className143TypeInfo',0x1013f1a8,32),
        ('typeInfoNode',0x102f6484,8), ('typeInfoNameScope',0x100f8b20,28), ('sharedUnDNameScope',0x100f8e80,28), ('crtInitializeLockScope',0x100f8c98,28), ('sharedDemanglerHeap',0x102f6f1c,60), ('demanglerClassKeyword',0x100f2b10,7),
        ('crtFreeScope',0x100f8670,28), ('crtHeapFreeImport',0x102f9674,4),
        ('demanglerIndirectVtable',0x100f299c,12), ('demanglerTextVtable',0x100f29bc,12),
        ('demanglerTemplatePrefix',0x100f2ad8,20), ('demanglerGenericPrefix',0x100f2ac8,14), ('demanglerScopeSeparator',0x100f2aec,3),
        ('underscoreRootLiteral',0x100ea340,6), ('underscoreRootString',0x102f47d0,4),
        ('pool1792State',0x102ffe9c,12),('pool1792Descriptor',0x102fff5c,4),('pool1792Geometry',0x100e7b80,8),
        ('pool24State',0x102ffd70,12), ('pool24Descriptor',0x102ffef8,4), ('pool24Geometry',0x100e7ab8,8),
        ('classNameSeparator',0x100e6f44,2), ('rootStaticObject',0x102f4618,40),
        ('memcpyForwardDwords',0x100a7b08,32), ('memcpyForwardTail',0x100a7b74,16),
        ('heapPointerAreaCount',0x102fb030,4), ('heapPointerAreas',0x10149a18,0x40000),
        ('heapDispatchTable',0x102fb050,4097*4), ('pool16State',0x102ffd58,12),
        ('pool16Descriptor',0x102ffef0,4), ('poolDescriptorList',0x102fb004,4),
        ('poolHeapAllocImport',0x102f9684,4), ('pool16Geometry',0x100e7aa8,8), ('poolVirtualAllocImport',0x102f9680,4),
        ('memoryMallocScope',0x100f8318,12), ('memoryHeapSection',0x10189a18,24),
        ('memoryHeapSectionInitialized',0x102fb000,1),
        ('memoryHeapSectionInitializeImport',0x102f966c,4),
        ('memoryHeapSectionEnterImport',0x102f9604,4),
        ('memoryHeapSectionLeaveImport',0x102f9608,4), ('memoryAdminState',0x10142798,16), ('rootTextLiteral',0x100e9b5c,5),
        ('staticValueSource',0x100ebb28,16), ('staticValueDestination',0x101ab150,16),
        ('staticCriticalSection',0x10197da0,24), ('initializeSectionImportSlot',0x102f95f4,4),
        ('onexitScope',0x100f8630,28), ('allocationSizeScope',0x100f8ba0,28),
        ('heapSizeImportSlot',0x102f9678,4),
        ('pointerDecodeProcedureName',0x100ed6e0,len(b'DecodePointer\0')),
        ('processorModuleName',0x100ede4c,len(b'KERNEL32\0')),
        ('processorProcedureName',0x100ede30,len(b'IsProcessorFeaturePresent\0')),
        ('pointerModuleName',0x100ed284,len(b'KERNEL32.DLL\0')),
        ('pointerEncodeProcedureName',0x100ed6d0,len(b'EncodePointer\0')),
        ('tlsGetterIndex',0x10140b48,4), ('threadDataIndex',0x10140b44,4),
        ('tlsGetValueImportSlot',0x102f97b8,4),
        ('processorProbeScope',0x100f8ec0,28),
        ('moduleHandleImportSlot',0x102f9768,4), ('procedureLookupImportSlot',0x102f9648,4)]:
        raw, section = image_bytes(pe,address,size)
        cold[label] = dict(address=f'{address:08x}',raw=raw.hex(),bytes=size,
            sha256=hashlib.sha256(raw).hexdigest(),section=section,
            scope='cold-original-image',liveValueCaptured=False)
    section_start = pe.optional + struct.unpack_from('<H', binary, pe.optional - 4)[0]
    section_headers = []
    for index in range(len(pe.sections)):
        raw = binary[section_start + index * 40:section_start + (index + 1) * 40]
        section_headers.append(dict(name=raw[:8].rstrip(b'\0').decode('ascii'), raw=raw.hex(),
            virtualAddress=f'{pe.base + struct.unpack_from("<I",raw,12)[0]:08x}',
            virtualSize=struct.unpack_from('<I',raw,8)[0],
            characteristics=f'{struct.unpack_from("<I",raw,36)[0]:08x}'))
    header = binary[:section_start + len(pe.sections)*40]
    records = list(csv.DictReader((study / '01_Decompiled_Code/SharedBase_dll/functions.csv')
                                  .read_text(encoding='utf-8').splitlines()))
    admitted_targets = {}
    entries = {}
    offline = {}
    assembly_only = {0x10048ff0:0x1004906f,0x10048050: 0x100480cf, 0x10047f10: 0x10047f8f, 0x100a7265: 0x100a7293, 0x100bb8e7: 0x100bb90a,
                     0x100b4b6b: 0x100b4b7e, 0x100bef05: 0x100befb5,
                     0x100ce0f5: 0x100ce101}
    targets[0x100bb8e7] = 'rtcTerminate'
    for address, label in targets.items():
        if address in assembly_only:
            entries[f'{address:08x}'] = dict(containingEntry=f'{address:08x}', methodLabel=label)
            continue
        containing = next((record for record in records if record['address'] == f'{address:08x}'), None)
        containing = containing or next((record for record in records if any(
            int(start, 16) <= address <= int(end, 16) for start, end in
            re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})', record['body_ranges']))), None)
        if containing is None:
            offline[address] = label
            entries[f'{address:08x}'] = dict(containingEntry=f'{address:08x}', methodLabel=label)
            continue
        owner = int(containing['address'], 16)
        admitted_targets.setdefault(owner, label)
        entries[f'{address:08x}'] = dict(containingEntry=f'{owner:08x}',
                                        methodLabel=admitted_targets[owner])
    audit = native.audit_module(study, 'SharedBase_dll', 'SharedBase.dll', admitted_targets)
    output.mkdir(parents=True, exist_ok=True)
    methods = {}
    for method in audit['methods']:
        address = method['bodyVA'][2:]
        asm = ('\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction']
                         for row in method['instructions']) + '\n').encode()
        c = source_excerpt(study, method).encode()
        (output / (address + '.asm.txt')).write_bytes(asm)
        (output / (address + '.c.txt')).write_bytes(c)
        methods[method['label']] = {key: method[key] for key in
            ['entryVA', 'bodyVA', 'bodyRanges', 'instructionCount', 'bodyByteCount',
             'bodyInstructionBytesSha256', 'entryChain']}
        methods[method['label']].update(assemblySha256=hashlib.sha256(asm).hexdigest(),
                                       cSha256=hashlib.sha256(c).hexdigest())
    assembly_lines = (study / '01_Decompiled_Code/SharedBase_dll/full_disassembly.asm').read_text(encoding='utf-8').splitlines()
    for start, end in assembly_only.items():
        rows = []
        for line in assembly_lines:
            match = re.fullmatch(r'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', line)
            if match and start <= int(match[1],16) <= end:
                raw = bytes.fromhex(match[2])
                if pe.bytes(int(match[1],16),len(raw)) != raw:
                    raise ValueError('Assembly/PE disagreement: ' + match[1])
                rows.append(line)
        if not rows or int(rows[-1].split(' | ')[0],16) != end:
            raise ValueError('Incomplete assembly-only callback')
        asm = ('\n'.join(rows) + '\n').encode()
        raw = b''.join(bytes.fromhex(row.split(' | ')[1]) for row in rows)
        (output / f'{start:08x}.asm.txt').write_bytes(asm)
        methods[targets[start]] = dict(entryVA=f'0x{start:08x}', bodyVA=f'0x{start:08x}',
            bodyRanges=f'{start:08x}-{end:08x}', instructionCount=len(rows), bodyByteCount=len(raw),
            bodyInstructionBytesSha256=hashlib.sha256(raw).hexdigest(), entryChain=[],
            assemblySha256=hashlib.sha256(asm).hexdigest(), cSha256=None,
            reconstructedCUnavailable=True)
    large_thunk=pe.bytes(0x10007be9,5)
    if large_thunk != bytes.fromhex('e902140400'):
        raise ValueError('Original 1792-byte pool entry thunk differs')
    methods['pool1792Dispatch']['entryVA']='0x10007be9'
    methods['pool1792Dispatch']['entryChain']=[dict(va='10007be9',bytes=large_thunk.hex(),targetVA='10048ff0')]
    entries['10007be9']=dict(containingEntry='10048ff0',methodLabel='pool1792Dispatch')
    pool_thunk = pe.bytes(0x10002d97,5)
    if pool_thunk[0] != 0xe9 or 0x10002d97 + 5 + struct.unpack_from('<i',pool_thunk,1)[0] != 0x10047f10:
        raise ValueError('Original 16-byte pool entry thunk differs')
    methods['pool16Dispatch']['entryVA'] = '0x10002d97'
    methods['pool16Dispatch']['entryChain'] = [dict(va='10002d97',bytes=pool_thunk.hex(),targetVA='10047f10')]
    entries['10002d97'] = dict(containingEntry='10047f10',methodLabel='pool16Dispatch')
    pool24_thunk = pe.bytes(0x10004214,5)
    if pool24_thunk.hex() != 'e9373e0400':
        raise ValueError('Original 24-byte pool entry thunk differs')
    methods['pool24Dispatch']['entryVA'] = '0x10004214'
    methods['pool24Dispatch']['entryChain'] = [dict(va='10004214',bytes=pool24_thunk.hex(),targetVA='10048050')]
    entries['10004214'] = dict(containingEntry='10048050',methodLabel='pool24Dispatch')
    if offline:
        import capstone
        decoder = capstone.Cs(capstone.CS_ARCH_X86, capstone.CS_MODE_32)
        decoder.detail = True
        for start, label in offline.items():
            pending, decoded = [start], {}
            while pending:
                address = pending.pop()
                if address in decoded:
                    continue
                if not start <= address < start + 4096:
                    raise ValueError('Callback branch leaves bounded recovery window')
                instruction = next(decoder.disasm(pe.bytes(address, 15), address, count=1), None)
                if instruction is None:
                    raise ValueError('Undecodable callback instruction')
                decoded[address] = instruction
                if instruction.group(capstone.CS_GRP_RET):
                    continue
                if instruction.group(capstone.CS_GRP_JUMP):
                    if instruction.operands[0].type != capstone.x86.X86_OP_IMM:
                        raise ValueError('Unresolved indirect callback branch')
                    pending.append(instruction.operands[0].imm)
                    if instruction.mnemonic == 'jmp':
                        continue
                pending.append(address + instruction.size)
            rows = [f'{address:08x} | {instruction.bytes.hex()} | {instruction.mnemonic} {instruction.op_str}'.rstrip()
                    for address, instruction in sorted(decoded.items())]
            asm = ('\n'.join(rows) + '\n').encode()
            raw = b''.join(bytes(instruction.bytes) for _, instruction in sorted(decoded.items()))
            # A branch into an instruction interior must never grant a second decoding.
            occupied = set()
            for address, instruction in sorted(decoded.items()):
                span = set(range(address, address + instruction.size))
                if occupied & span:
                    raise ValueError('Overlapping callback instructions')
                occupied |= span
            (output / f'{start:08x}.asm.txt').write_bytes(asm)
            methods[label] = dict(entryVA=f'0x{start:08x}', bodyVA=f'0x{start:08x}',
                instructionCount=len(rows), bodyByteCount=len(raw),
                bodyRanges=[dict(start=f'{address:08x}', bytes=instruction.size)
                            for address, instruction in sorted(decoded.items())],
                bodyInstructionBytesSha256=hashlib.sha256(raw).hexdigest(), entryChain=[],
                assemblySha256=hashlib.sha256(asm).hexdigest(), cSha256=None,
                reconstructedCUnavailable=True, decoder=f'capstone {capstone.__version__}',
                allDirectBranchesRecovered=True)
    imports = {entry['iatVA'][2:]:entry for entry in pe.imports()}
    cold['poolVirtualAllocImport']['importEntry'] = imports['102f9680']
    cold['poolHeapAllocImport']['importEntry'] = imports['102f9684']
    calls = []
    for label, method in methods.items():
        for row in (output / (method['bodyVA'][2:] + '.asm.txt')).read_text(encoding='utf-8').splitlines():
            address, raw, instruction = row.split(' | ')
            if not instruction.lower().startswith('call '):
                continue
            data = bytes.fromhex(raw)
            call = dict(method=label, address=address, raw=raw, instruction=instruction)
            if data[0] == 0xe8:
                call.update(kind='direct',targetVA=f'{int(address,16)+5+struct.unpack_from("<i",data,1)[0]:08x}')
            elif data[:2] == b'\xff\x15':
                slot = f'{struct.unpack_from("<I",data,2)[0]:08x}'
                call.update(kind='image-indirect',slotVA=slot,importEntry=imports.get(slot))
            else:
                call.update(kind='register-or-memory-indirect')
            calls.append(call)
    (output / 'source.json').write_text(json.dumps(dict(
        schema='gothic3-shared-initializer-source-v1', sharedBaseSha256=INPUT_SHA,
        methods=methods, tables=tables, entries=entries, coldGlobals=cold,
        sectionHeaders=section_headers, sourceOnly=True,
        imageHeader=dict(address='10000000',raw=header.hex(),bytes=len(header),
            sha256=hashlib.sha256(header).hexdigest(),scope='cold-original-image',liveValueCaptured=False),
        calls=calls,
        initializerExecutionCompleted=False,
        rtcTerminationEntry='100bb8e7',
        verifiedAgainstOriginalPE=True), indent=2) + '\n', encoding='utf-8', newline='\n')


def initializer_runtime(output, destination):
    rows = []
    for body in ['10048ff0','1003f320','10047730','100ada4c','100aa632','100ae900','100ae880','100ae8b0','100a78fe','100a788e','100b4407','100b448b','100b444f','100ae27b','100aa47d','100a7265','100aef10','100b1854','100b4b6b','100ce095','100ce045','100aeb68','100aebad','100bef05','100ce0f5','100a72d0','100a7294','100a71ac','100ae2f2','100b10d6','100aa453','100aa45c','100a72ca','100e1660','100e1440','100e1450','100e1470','100e14b0','100e14c0','100e14d0','100e14e0','100e14f0','100e1500','100e1510','100e15d0','100e1600','100e1610','100e1630','100e1670','100e1680','10012d20','1008e970','1008e900','100a7099','100b0902','100c6142','100bb7cf','100aeed0','100bb892','100bb7a2','100bb889','10048050','10045f80','1003e1f0','10091550','100a7430','100a7300','100c0e29','100b09ee','100b2a80','100c14dd','100c61dc','100aa9a4','100c2048','100c2301','100c22b2','100c1feb','100c22e3','100c1d9c','100c27dd','100c21f4','100c1d3a','100c1da0','100c43c1','100c41d7','100c25e0','100c21ad','100c1f89','100b01c8','100c28e6','100c24e3','100c223b','100c1e13','100c44b4','100c6288','100c1c80','100c29ed','100c1b6a','100c1fa0','100c59ab','100c2589','100c51ce','100c674d','100c1ed2','100c660f','100c5e8f','100c2351','100c218f','100c1f28','100c1ac7','100c1dcf','100135f0','10013240','10020bf0','1003d410','1003d2f0','10047f10','10045da0','100aabd2','100aaaf6','100a7980','1003c650','1003e090','100a7a00']:
        for line in (output / (body + '.asm.txt')).read_text(encoding='utf-8').splitlines():
            rows.append(line.split(' | '))
    source=json.loads((output/'source.json').read_text(encoding='utf-8'))
    for label in ['pool1792Dispatch','pool1792Allocate','pool1792Initialize','pool24Dispatch','pool24Initialize','pool24Allocate','emptyStringConstructor','classNameUnMangle','initializer143Getter','initializer142Getter','rootTextConstructor','rootTextAlloc','memoryGetInstance','memoryMalloc','heapAllocate','pool16Dispatch','pool16Initialize','heapAddPointerArea','pool16Allocate']:
        for entry in source['methods'][label]['entryChain']:
            rows.append([entry['va'],entry['bytes'],'JMP 0x'+entry['targetVA']])
    header=json.loads((output/'source.json').read_text(encoding='utf-8'))['imageHeader']
    destination.write_text('''/** Original admitted SharedBase initializer syntax; no runtime authority. */
export const sharedInitializerHeader=Object.freeze(''' + json.dumps(header) + ''');
export interface SharedInitializerInstruction {readonly address:string;readonly bytes:string;readonly instruction:string;}
const rows:readonly (readonly string[])[] = ''' + json.dumps(rows,indent=2) + ''';
const instructions=new Map<string,SharedInitializerInstruction>(rows.map(([address,bytes,instruction])=>
  [address!,Object.freeze({address:address!,bytes:bytes!,instruction:instruction!})]));
export function sharedInitializerInstruction(address:string):SharedInitializerInstruction {
  const row=instructions.get(address);if(!row)throw new Error('Unowned SharedBase initializer instruction '+address);return row;
}
''', encoding='utf-8',newline='\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--capstone-path', type=Path)
    parser.add_argument('--runtime-output', type=Path)
    args = parser.parse_args()
    if args.capstone_path:
        sys.path.insert(0, str(args.capstone_path.resolve()))
    capture(args.study, args.output)
    if args.runtime_output:
        initializer_runtime(args.output,args.runtime_output)
