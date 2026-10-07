"""Audit original Game CRT storage, algorithms and selected initializer order.

Offline receipts only. No native code is executed and no live state is captured.
Game owns distinct CRT globals even when algorithms correspond to Engine.
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
from prepare_runtime_admin_source import image_bytes, source_excerpt
from prepare_crt_undname_source import encode, instruction, verify_extents

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/gothic3/game-crt'
GAME_SHA = 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'
NORMALIZATION = 'rstrip-line-whitespace; LF line endings; final newline'

# Every mapping comes from the Game catalog, its selected C/ASM or a direct
# original operand. No Engine address delta is used to select Game routines.
TARGETS = {
    'unDName': 0x2047cca1, 'unDNameCleanup': 0x2047cd3b,
    'ensureLock': 0x204736e9, 'mtInitLocks': 0x2047361e,
    'mtDeleteLocks': 0x20473667, 'lock': 0x204737ac,
    'unlock': 0x204736bc, 'ensureLockCleanup': 0x204737a3,
    'mallocCrt': 0x2046838e, 'errno': 0x2046a282,
    'initCritSecAndSpinCount': 0x204741c7, 'initCritSecFallback': 0x204741b7,
    'heapInit': 0x204769c5, 'heapSelect': 0x2047696a,
    'getOsPlatform': 0x2046645f, 'getWinMajor': 0x2046650e,
    'mtInit': 0x204681d9, 'crtAttach': 0x204677e4,
    'unDecoratorConstructor': 0x20478eb0, 'unDecoratorToString': 0x2047c9ee,
    'getDecoratedName': 0x2047bd2d, 'getDataType': 0x2047d2ac,
    'getDataIndirectType': 0x2047c50a, 'getPrimaryDataType': 0x2047d16e,
    'getSimpleDataType': 0x2047cde7, 'getECSUDataType': 0x2047b013,
    'getScopedName': 0x2047af20, 'getZName': 0x2047ad36,
    'dnameDelimitedConstructor': 0x2047913f, 'dnameDoPchar': 0x20479042,
    'heapGetMemory': 0x20478626, 'heapDestructor': 0x2047803c,
    'replicatorConstructor': 0x20478cee, 'replicatorAppend': 0x20478d0c,
    'replicatorLookup': 0x20478863, 'dnameCopyConstructor': 0x204786c9,
    'dnameAssign': 0x204787df, 'dnameNodeConcat': 0x20478899,
    'dnameIndirectNodeConstructor': 0x204788ff, 'dnamePointerConstructor': 0x20478a31,
    'dnameStatusConstructor': 0x20478a87, 'dnameStatusNodeConstructor': 0x2047892e,
    'dnameIsValid': 0x20478ae8, 'dnameIsEmpty': 0x20478aff,
    'dnameLength': 0x20478b4a, 'dnameGetString': 0x20478ba7,
    'dnameAssignStatus': 0x20478c6d, 'dnameCloneNode': 0x20478d53,
    'dnameTextNodeConstructor': 0x20478d9a, 'undStrncpy': 0x20478972,
    'dnameTextNodeGetString': 0x20478e11, 'dnameIndirectNodeLength': 0x20478e42,
    'dnameIndirectNodeGetString': 0x20478e60, 'dnameConcatStatus': 0x20478f61,
    'dnameAssignPointer': 0x20478fda, 'dnameCharConstructor': 0x204790e8,
    'dnameTextConstructor': 0x2047910e, 'dnameConcat': 0x2047933c,
    'dnamePointerConcat': 0x2047939e, 'dnameAssignText': 0x20479445,
    'dnamePlus': 0x2047954c, 'heapTerm': 0x20476a1f,
    'malloc': 0x20467ba7, 'free': 0x20467c6a, 'freeCleanup': 0x20467cc0,
    'callNewHandler': 0x204742dd, 'osErrorToErrno': 0x2046a247,
    'encodePointer': 0x20467d64, 'decodePointer': 0x20467ddb,
    'pointerEncodingAvailability': 0x20467cf8, 'dnameLastChar': 0x20478b6f,
    'dnameCharNodeLength': 0x204788d8, 'dnameCharNodeLastChar': 0x204788dc,
    'dnameCharNodeGetString': 0x204788e0, 'dnameTextNodeLength': 0x204788fb,
    'dnameTextNodeLastChar': 0x20478dff, 'dnameIndirectNodeLastChar': 0x20478e51,
    'dnameStatusNodeLength': 0x20478953, 'dnameStatusNodeLastChar': 0x20478957,
    'dnameStatusNodeGetString': 0x20478e7d,
    'entry': 0x20467ab3, 'securityInitCookie': 0x20476a99,
    'dllMainCrtStartup': 0x204679bd, 'initPointers': 0x204667a8,
    'encodedNull': 0x20467dd2, 'initNewHandler': 0x2047428c,
    'initSectionInitializer': 0x204741ad, 'initInvalidParameter': 0x2046a0cc,
    'initCrtReportHook': 0x20469b83, 'initUnhandledException': 0x2047409f,
    'initWinSignalPointers': 0x20473bab, 'initDebugReportNoop': 0x204739ff,
    'initEhHooks': 0x204739ee, 'exitPointerTarget': 0x20466779,
    'callocCrt': 0x204683ce, 'callocImpl': 0x20477c2a,
    'initPtd': 0x20467ef5, 'addLocaleRef': 0x2046be69,
    'getCachedPtdGetter': 0x20467e6d, 'mtTerm': 0x20467eb8,
    'freePtd': 0x20468164, 'freePtdCallback': 0x20468043,
    'removeLocaleRef': 0x2046beef, 'localeFree': 0x2046bd29,
    'preCInit': 0x204737dd, 'callocCleanup': 0x20477d26,
    'unlockInitPtd': 0x20467fab, 'getPtdNoExit': 0x20467fb4,
    'unlockFreePtdMbc': 0x2046814f, 'unlockFreePtdLocale': 0x2046815b,
    'navigationClassName': 0x2001328c, 'scriptAdminClassName': 0x20021346,
    'navigationPropertyObjectTypeSingleton': 0x20022c3c,
    'typeInfoNameWrapper': 0x204637e0, 'typeInfoNameBody': 0x20468806,
    'typeInfoNameCleanup': 0x204688f2, 'strlen': 0x2046dbd0,
    'strcpyS': 0x20475b80, 'cinit': 0x204665f4, 'inittermE': 0x2046643f,
    'atexit': 0x204637ce, 'onexit': 0x20463792, 'onexitAppend': 0x204636aa,
    'onexitLock8': 0x20466415, 'onexitUnlock8': 0x2046641e,
    'onexitCleanup': 0x204637c8, 'reallocCrt': 0x20468416, 'msize': 0x204684cd,
    'exitTraversal': 0x20466686, 'typeInfoDtorOtherList': 0x20468796,
    'scriptAdminPropertyIdInitializer': 0x2051dcf0, 'scriptAdminTypeCleanup': 0x20561900,
}
MANUAL = {
    'navigationClassNameInitializer': (0x204b1840, 0x204b1840, '204b1840-204b184a'),
    'navigationClassNameDestructor': (0x20003904, 0x205496d0, '205496d0-205496da'),
    'scriptAdminClassNameDestructor': (0x20013971, 0x205491a0, '205491a0-205491aa'),
    'onexitColdInitializer': (0x20463763, 0x20463763, '20463763-20463791'),
    'terminatePointerTarget': (0x2047396b, 0x2047396b, '2047396b-204739a3'),
    'tlsAllocFallback': (0x20467e49, 0x20467e49, '20467e49-20467e51'),
    'scriptAdminPropertyIdCleanup': (0x205618e0, 0x205618e0, '205618e0-205618ea'),
}
TERMINATE_RECOVERY = {
    0x2047398b: ('33c0', 'XOR EAX,EAX'),
    0x2047398d: ('40', 'INC EAX'),
    0x2047398e: ('c3', 'RET'),
    0x2047398f: ('8b65e8', 'MOV ESP,dword ptr [EBP + -0x18]'),
    0x2047399e: ('e8124cffff', 'CALL 0x204685b5'),
    0x204739a3: ('c3', 'RET'),
}
SECTION_SEH = {
    0x2047424d: ('8b45ec', 'MOV EAX,dword ptr [EBP + -0x14]'),
    0x20474250: ('8b00', 'MOV EAX,dword ptr [EAX]'),
    0x20474252: ('8b00', 'MOV EAX,dword ptr [EAX]'),
    0x20474254: ('8945dc', 'MOV dword ptr [EBP + -0x24],EAX'),
    0x20474257: ('33c9', 'XOR ECX,ECX'),
    0x20474259: ('3d170000c0', 'CMP EAX,0xc0000017'),
    0x2047425e: ('0f94c1', 'SETZ CL'),
    0x20474261: ('8bc1', 'MOV EAX,ECX'),
    0x20474263: ('c3', 'RET'),
    0x20474264: ('8b65e8', 'MOV ESP,dword ptr [EBP + -0x18]'),
    0x20474267: ('817ddc170000c0', 'CMP dword ptr [EBP + -0x24],0xc0000017'),
    0x2047426e: ('7508', 'JNZ 0x20474278'),
    0x20474270: ('6a08', 'PUSH 0x8'),
    0x20474272: ('ff15a07b7d20', 'CALL dword ptr [0x207d7ba0]'),
    0x20474278: ('8365e000', 'AND dword ptr [EBP + -0x20],0x0'),
}
COLD = {
    'navigationClassName': (0x207b4964, 12), 'navigationInitializerResult': (0x207b4ea8, 4),
    'navigationTypeInfoDescriptor': (0x20796ce4, 30),
    'scriptAdminClassName': (0x207b47a0, 12), 'scriptAdminInitializerResult': (0x207b4f3c, 4),
    'scriptAdminTypeInfoDescriptor': (0x207966e0, 30), 'scriptAdminLookupCacheGuard': (0x207b6028, 8),
    'scriptAdminStartupObjects': (0x207cbf04, 40),
    'scriptAdminPropertyTypeAndGuard': (0x207cbe78, 64),
    'scriptAdminRootLookupCacheGuard': (0x207cbe68, 8),
    'crtTypeInfoList': (0x207d0a18, 8),
    'navigationPropertyObjectTypeAndGuard': (0x207bf7e4, 64),
    'crtHeapHandle': (0x207d11b4, 4), 'crtHeapMode': (0x207d1658, 4),
    'crtLockTable': (0x207b2c70, 288), 'crtStaticSections': (0x207d0f30, 336),
    'crtOsFields': (0x207d0a2c, 20), 'demanglerGlobals': (0x207d14e4, 60),
    'crtSectionInitializer': (0x207d109c, 4), 'crtTlsIndexes': (0x207b231c, 8),
    'procedureSlots': (0x207d0a84, 16), 'crtExitBegin': (0x207d2b80, 4),
    'crtExitEnd': (0x207d2b7c, 4), 'crtMallocRetry': (0x207d0a94, 4),
    'newMode': (0x207d14e0, 4), 'otherTypeInfoDtorList': (0x207d0a98, 8),
    'securityCookie': (0x207b2314, 4), 'securityCookieComplement': (0x207b2318, 4),
    'exitHandler': (0x207b2310, 4), 'attachCount': (0x207d0a70, 4),
    'newHandler': (0x207d10a0, 4), 'sectionInitializer': (0x207d109c, 4),
    'invalidParameter': (0x207d0dc0, 4), 'exceptionFilter': (0x207d0dbc, 4),
    'mathError': (0x207d1098, 4), 'winSignalPointers': (0x207d1084, 16),
    'terminateHandler': (0x207d1080, 4), 'defaultLocale': (0x207b2b50, 216),
    'currentLocale': (0x207b2c28, 4), 'mbcObject': (0x207b2620, 544),
    'mbcRefCounter': (0x207b2620, 4), 'timeLocale': (0x207b33c8, 188),
    'timeLocaleRefCounter': (0x207b347c, 4), 'fallbackErrors': (0x207b2588, 8),
    'exceptionData': (0x207b2d90, 120), 'exceptionTableMetadata': (0x207b2e08, 16),
    'localeEmptyString': (0x207d1544, 1),
}
CONSTANTS = {
    'sectionInitExceptionTable': (0x206e8e70, 28),
    'navigationInitializerSlot': (0x2056c220, 4), 'onexitInitializerSlot': (0x20655618, 4),
    'attachCallback': (0x206b6484, 4), 'preCInitializerTable': (0x206e84d8, 256),
    'localeSentinel': (0x207b2b48, 4), 'localeConventions': (0x207b3488, 48),
    'ctypeTable': (0x206bf170, 514), 'lowerCaseTable': (0x206bf5f8, 256),
    'upperCaseTable': (0x206bf778, 256),
    'charNodeVtable': (0x206bec94, 12), 'indirectNodeVtable': (0x206beca4, 12),
    'statusNodeVtable': (0x206becb4, 12), 'textNodeVtable': (0x206becc4, 12),
    'localeDecimalPoint': (0x207b3484, 2),
    'scriptAdminRootInitializerSlot': (0x205faf54, 4),
    'scriptAdminPropertyIdInitializerSlot': (0x205faf58, 4),
    'scriptAdminAccessorInitializerSlot': (0x205faf5c, 4),
    'scriptAdminPropertyIdLiteral': (0x2069c090, 39),
}
STRINGS = {
    'kernel32Module': 0x206be548,
    'initializeCriticalSectionAndSpinCountName': 0x206be520,
    'pointerKernel32Module': 0x206b64a0, 'encodePointerName': 0x206b6490,
    'decodePointerName': 0x206b64b0, 'mixedCrtSectionName': 0x206b6488,
    'literal206b6488': 0x206b6488,
    'classKeyword': 0x206bee10, 'truncatedNameText': 0x206becd0,
    'templateParameterPrefix': 0x206bedd8, 'genericTypePrefix': 0x206bedc8,
    'flsAllocName': 0x206b64e0, 'flsGetValueName': 0x206b64d4,
    'flsSetValueName': 0x206b64c8, 'flsFreeName': 0x206b64c0,
}
TLS_PE = {
    'tlsGetterDispatcher': (0x20467e52, 0x20467e66, {
        0x20467e52: ('ff742404', 'PUSH dword ptr [ESP + 0x4]'),
        0x20467e56: ('ff3520237b20', 'PUSH dword ptr [0x207b2320]'),
        0x20467e5c: ('ff158c7b7d20', 'CALL dword ptr [0x207d7b8c]'),
        0x20467e62: ('ffd0', 'CALL EAX'),
        0x20467e64: ('c20400', 'RET 0x4'),
    }),
    'getFlsIndex': (0x20467e67, 0x20467e6c, {
        0x20467e67: ('a11c237b20', 'MOV EAX,[0x207b231c]'),
        0x20467e6c: ('c3', 'RET'),
    }),
}

# These four exact bodies are absent from both the catalog and study ASM.
# Keep their PE-only provenance distinct from existing ASM-only cleanup rows.
SCRIPT_ADMIN_PE = {
    'scriptAdminRootInitializer': (0x2051dc90, 0x2051dcda, {
        0x2051dc90: ('b904bf7c20', 'MOV ECX,0x207cbf04'),
        0x2051dc95: ('ff15b8877d20', 'CALL dword ptr [0x207d87b8]'),
        0x2051dc9b: ('c7050cbf7c2000000000', 'MOV dword ptr [0x207cbf0c],0x0'),
        0x2051dca5: ('c70504bf7c2034b76920', 'MOV dword ptr [0x207cbf04],0x2069b734'),
        0x2051dcaf: ('e85dc6afff', 'CALL 0x2001a311'),
        0x2051dcb4: ('6a01', 'PUSH 0x1'),
        0x2051dcb6: ('b904bf7c20', 'MOV ECX,0x207cbf04'),
        0x2051dcbb: ('a310bf7c20', 'MOV [0x207cbf10],EAX'),
        0x2051dcc0: ('c7050cbf7c2000000000', 'MOV dword ptr [0x207cbf0c],0x0'),
        0x2051dcca: ('e8309bb0ff', 'CALL 0x200277ff'),
        0x2051dccf: ('6840195620', 'PUSH 0x20561940'),
        0x2051dcd4: ('e8f55af4ff', 'CALL 0x204637ce'),
        0x2051dcd9: ('59', 'POP ECX'), 0x2051dcda: ('c3', 'RET'),
    }),
    'scriptAdminAccessorInitializer': (0x2051dd50, 0x2051dd71, {
        0x2051dd50: ('e8f135b0ff', 'CALL 0x20021346'),
        0x2051dd55: ('50', 'PUSH EAX'),
        0x2051dd56: ('6814bf7c20', 'PUSH 0x207cbf14'),
        0x2051dd5b: ('b928bf7c20', 'MOV ECX,0x207cbf28'),
        0x2051dd60: ('ff15b4867d20', 'CALL dword ptr [0x207d86b4]'),
        0x2051dd66: ('6830195620', 'PUSH 0x20561930'),
        0x2051dd6b: ('e85e5af4ff', 'CALL 0x204637ce'),
        0x2051dd70: ('59', 'POP ECX'), 0x2051dd71: ('c3', 'RET'),
    }),
    'scriptAdminAccessorCleanup': (0x20561930, 0x2056193a, {
        0x20561930: ('b928bf7c20', 'MOV ECX,0x207cbf28'),
        0x20561935: ('ff25d0887d20', 'JMP dword ptr [0x207d88d0]'),
    }),
    'scriptAdminRootCleanup': (0x20561940, 0x2056195d, {
        0x20561940: ('b904bf7c20', 'MOV ECX,0x207cbf04'),
        0x20561945: ('c70504bf7c2034b76920', 'MOV dword ptr [0x207cbf04],0x2069b734'),
        0x2056194f: ('e8353baaff', 'CALL 0x20005489'),
        0x20561954: ('b904bf7c20', 'MOV ECX,0x207cbf04'),
        0x20561959: ('e9e820adff', 'JMP 0x20033a46'),
    }),
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def ranges(text: str) -> list[tuple[int, int]]:
    return [(int(a, 16), int(b, 16)) for a, b in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})', text)]


def manual_methods(study: Path, pe: native.PE) -> list[dict]:
    selected = []
    with (study / '01_Decompiled_Code/Game_dll/functions.csv').open(encoding='utf-8-sig', newline='') as stream:
        catalog_entries = {row['address'] for row in csv.DictReader(stream)}
    require(not {f'{begin:08x}' for begin, _, _ in SCRIPT_ADMIN_PE.values()} & catalog_entries,
            'ScriptAdmin PE-only selection now has catalog provenance')
    for label, (entry, body, extent) in MANUAL.items():
        chain = []
        current = entry
        while pe.bytes(current, 5)[0] == 0xe9:
            raw = pe.bytes(current, 5)
            target = current + 5 + struct.unpack('<i', raw[1:])[0]
            chain.append(dict(va=f'{current:08x}', bytes=raw.hex(), targetVA=f'{target:08x}'))
            current = target
            require(len(chain) < 12, 'Manual thunk chain exceeds limit')
        require(current == body, 'Manual body entry differs: ' + label)
        selected.append(dict(label=label, entryVA=f'0x{entry:08x}', bodyVA=f'0x{body:08x}',
            bodyRanges=extent, entryChain=chain, instructions=[], sourceCGap=True,
            selection='Original ASM-only extent; no fabricated CSV row'))
    pattern = re.compile(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)')
    path = study / '01_Decompiled_Code/Game_dll/full_disassembly.asm'
    with path.open('rb') as stream:
        for number, line in enumerate(stream, 1):
            match = pattern.fullmatch(line.rstrip(b'\r\n'))
            if not match:
                continue
            address = int(match[1], 16)
            require(not any(begin <= address <= end for begin, end, _ in SCRIPT_ADMIN_PE.values()),
                    'ScriptAdmin PE-only selection now has study ASM; preserve original provenance')
            for method in selected:
                if any(start <= address <= end for start, end in ranges(method['bodyRanges'])):
                    raw = bytes.fromhex(match[2].decode())
                    require(pe.bytes(address, len(raw)) == raw, 'Manual ASM/PE mismatch')
                    method['instructions'].append(dict(va=f'{address:08x}', rva=f'{address-pe.base:x}',
                        fileOffset=pe.offset(address, len(raw)), bytes=raw.hex(),
                        instruction=match[3].decode('utf8'), assemblyLine=number))
    terminate = next(method for method in selected if method['label'] == 'terminatePointerTarget')
    require(not {row['va'] for row in terminate['instructions']} &
            {f'{address:08x}' for address in TERMINATE_RECOVERY}, 'Terminate recovery duplicates analyzed ASM')
    terminate['instructions'].extend(instruction(pe, address, raw, text)
        for address, (raw, text) in TERMINATE_RECOVERY.items())
    terminate['instructions'].sort(key=lambda row: row['va'])
    terminate.update(sourceASMGap=True,
        originalAnalyzedAssemblyRanges='2047396b-2047398a;20473992-2047399d',
        recovery='Explicit original PE SEH/epilogue continuation omitted after noreturn annotation; full 57-byte extent')
    for label, begin, end in [('initCritSecExceptionFilter', 0x2047424d, 0x20474263),
                              ('initCritSecExceptionHandler', 0x20474264, 0x2047427b)]:
        selected.append(dict(label=label, entryVA=f'0x{begin:08x}', bodyVA=f'0x{begin:08x}',
            entryChain=[], bodyRanges=f'{begin:08x}-{end:08x}', sourceCGap=True, sourceASMGap=True,
            recovery='Original PE scope-table entries in 206e8e70 omitted from catalog and ASM',
            instructions=[instruction(pe, address, raw, text) for address, (raw, text) in SECTION_SEH.items()
                          if begin <= address <= end]))
    for label, (begin, end, rows) in TLS_PE.items():
        selected.append(dict(label=label, entryVA=f'0x{begin:08x}', bodyVA=f'0x{begin:08x}',
            entryChain=[], bodyRanges=f'{begin:08x}-{end:08x}', sourceCGap=True, sourceASMGap=True,
            recovery='Explicit original PE compiler thunk; no fabricated CSV row',
            instructions=[instruction(pe, address, raw, text) for address, (raw, text) in rows.items()]))
    for label, (begin, end, rows) in SCRIPT_ADMIN_PE.items():
        selected.append(dict(label=label, entryVA=f'0x{begin:08x}', bodyVA=f'0x{begin:08x}',
            entryChain=[], bodyRanges=f'{begin:08x}-{end:08x}', sourceCGap=True, sourceASMGap=True,
            recovery='Explicit original Game PE static initializer/cleanup; no recovered C or fabricated catalog row',
            instructions=[instruction(pe, address, raw, text) for address, (raw, text) in rows.items()]))
    next(method for method in selected if method['label'] == 'scriptAdminPropertyIdCleanup').update(sourceASMGap=False)
    return selected


def emit_method(study: Path, pe: native.PE, method: dict) -> dict:
    verify_extents(pe, method)
    rows = method['instructions']
    raw = b''.join(bytes.fromhex(row['bytes']) for row in rows)
    method.update(module='Game', instructionCount=len(rows), bodyByteCount=len(raw),
                  bodyInstructionBytesSha256=sha(raw))
    folder = OUT / 'sources/Game'
    folder.mkdir(parents=True, exist_ok=True)
    address = method['bodyVA'][2:]
    asm_path = folder / (address + '.asm.txt')
    asm_path.write_text('\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction']
                                 for row in rows) + '\n', encoding='utf8', newline='\n')
    refs = dict(assembly=asm_path.relative_to(OUT).as_posix(), assemblySha256=sha(asm_path.read_bytes()))
    if 'reconstructedC' in method:
        c_path = folder / (address + '.c.txt')
        normalized = '\n'.join(line.rstrip() for line in source_excerpt(study, method).splitlines()) + '\n'
        c_path.write_text(normalized, encoding='utf8', newline='\n')
        refs.update(c=c_path.relative_to(OUT).as_posix(), cSha256=sha(c_path.read_bytes()),
                    cNormalization=NORMALIZATION)
    method['sourceRefs'] = refs
    result = dict(module='Game', entry=method['entryVA'][2:], body=address,
        bodyRanges=method['bodyRanges'], instructionCount=len(rows), bodyBytes=len(raw),
        bodyInstructionBytesSha256=sha(raw), entryChain=method['entryChain'], sourceRefs=refs)
    for key in ['sourceCGap', 'sourceASMGap', 'recovery', 'selection', 'originalCatalogBodyRanges',
                'originalAnalyzedAssemblyRanges']:
        if key in method:
            result[key] = method[key]
    return result


def storage(pe: native.PE, address: int, size: int, constant: bool = False) -> dict:
    raw, section = image_bytes(pe, address, size)
    require(not constant or section['loaderZeroFillBytes'] == 0, 'Constant storage must be file-backed')
    return dict(module='Game', address=f'{address:08x}', bytes=size, raw=raw.hex(), knownMask='ff' * size,
        sha256=sha(raw), section=section, allZero=not any(raw),
        scope='original-file-backed-constant' if constant else 'cold-original-image', liveValueCaptured=False)


def initializer_table(pe: native.PE, begin: int, end: int) -> dict:
    require(end >= begin and (end - begin) % 4 == 0, 'Initializer extent differs')
    receipt = storage(pe, begin, end - begin, constant=True)
    callbacks = [dict(index=index, slot=f'{begin+index*4:08x}', target=f'{value:08x}')
        for index, value in enumerate(struct.unpack('<' + 'I' * ((end - begin) // 4), bytes.fromhex(receipt['raw'])))
        if value]
    receipt.update(exclusiveEnd=f'{end:08x}', elementBytes=4, slots=(end-begin)//4,
                   nonNullCallbacks=callbacks, nonNullCount=len(callbacks), wholeTableExecuted=False)
    return receipt


def emit_initializer_table(label: str, table: dict) -> dict:
    path = OUT / 'tables' / (label + '.json')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encode(table))
    keys = ['module', 'address', 'bytes', 'sha256', 'scope', 'liveValueCaptured',
            'exclusiveEnd', 'elementBytes', 'slots', 'nonNullCount', 'wholeTableExecuted',
            'selectedNavigationInitializer', 'selectedScriptAdminInitializers']
    summary = {key: table[key] for key in keys if key in table}
    summary['sourceRef'] = dict(path=path.relative_to(OUT).as_posix(), bytes=path.stat().st_size,
                               sha256=sha(path.read_bytes()))
    summary['firstNonNullCallbacks'] = table['nonNullCallbacks'][:5]
    return summary


def layouts() -> dict:
    """Game physical fields selected by actual Game instruction operands."""
    return dict(
        crtHeap=dict(handleAddress='207d11b4', selectorAddress='207d1658', retryAddress='207d0a94',
            newModeAddress='207d14e0', processAttachArgument=1, createFlags=0, initialBytes=4096,
            maximumBytes=0, selectedHeapMode=1, selectedOsPlatform=2, selectedMinimumWinMajor=5),
        crtOsFields=dict(storage='crtOsFields', bytes=20,
            offsets=dict(platform=0, build=4, packedMajorMinor=8, major=12, minor=16)),
        crtLocks=dict(tableStorage='crtLockTable', staticStorage='crtStaticSections', recordBytes=8,
            records=36, offsets=dict(sectionPointer=0, staticFlag=4), sectionBytes=24, staticSections=14,
            spinCount=4000, demanglerLock=5, creationLock=10, typeInfoLock=14, onexitLock=8),
        pointerEncoding=dict(tlsIndexStorage='crtTlsIndexes', bytes=8,
            offsets=dict(flsIndex=0, tlsIndex=4), coldIndex=0xffffffff, threadDataBytes=0x214,
            threadEncodePointerOffset=0x1f8, threadDecodePointerOffset=0x1fc,
            initializerCacheStorage='crtSectionInitializer', noSectionScanMinimumMajor=6),
        procedures=dict(storage='procedureSlots', bytes=16,
            offsets=dict(flsAlloc=0, flsGetValue=4, flsSetValue=8, flsFree=12),
            fallback=dict(flsAlloc='tlsAllocFallback', flsGetValue='TlsGetValue',
                          flsSetValue='TlsSetValue', flsFree='TlsFree')),
        ptd=dict(bytes=0x214, allocation=dict(count=1, elementBytes=0x214, heapFlags=8),
            offsets=dict(threadId=0, threadHandle=4, errno=8, dosErrno=12, randomSeed=20,
                exceptionData=92, mbcInfo=104, localeInfo=108, ownLocale=112,
                localeChar=200, localeWideChar=331, encodePointer=504, decodePointer=508),
            freedBufferOffsets=[36, 44, 52, 60, 68, 72], destructor='freePtdCallback',
            mbcLock=13, localeLock=12),
        locale=dict(storage='defaultLocale', bytes=216,
            offsets=dict(refCount=0, categoryRecords=72, categoryRecordBytes=16, categoryCount=6,
                lconvRef0=176, lconvRef1=180, lconvRef2=184, localeConventions=188, ctypeRef=192,
                ctype=200, lowerCase=204, upperCase=208, timeLocale=212),
            categoryRefOffsets=[80, 96, 112, 128, 144, 160], optionalRefOffsets=[176, 184, 180, 192],
            categorySentinel='localeSentinel'),
        timeLocale=dict(storage='timeLocale', bytes=188, refCountOffset=180, selfPointerOffset=184),
        mbc=dict(storage='mbcObject', bytes=544, refCountOffset=0),
        exceptionTable=dict(storage='exceptionData', bytes=120, recordBytes=12, records=10,
            offsets=dict(exceptionCode=0, signal=4, action=8), metadataStorage='exceptionTableMetadata'),
        storageAliases=dict(sectionInitializer=dict(storage='crtSectionInitializer', offset=0, bytes=4),
            mbcRefCounter=dict(storage='mbcObject', offset=0, bytes=4),
            timeLocaleRefCounter=dict(storage='timeLocale', offset=180, bytes=4)),
        originalPointerBindings=[
            dict(storage='currentLocale', offset=0, target='defaultLocale', targetOffset=0),
            dict(storage='defaultLocale', offset=188, target='localeConventions', targetOffset=0),
            dict(storage='defaultLocale', offset=200, target='ctypeTable', targetOffset=0),
            dict(storage='defaultLocale', offset=204, target='lowerCaseTable', targetOffset=0),
            dict(storage='defaultLocale', offset=208, target='upperCaseTable', targetOffset=0),
            dict(storage='defaultLocale', offset=212, target='timeLocale', targetOffset=0),
            dict(storage='timeLocale', offset=184, target='timeLocale', targetOffset=0),
            dict(storage='localeConventions', offset=0, target='localeDecimalPoint', targetOffset=0),
            *[dict(storage='localeConventions', offset=offset, target='localeEmptyString', targetOffset=0)
              for offset in range(4, 40, 4)],
        ],
        demanglerGlobals=dict(storage='demanglerGlobals', bytes=60,
            offsets=dict(allocator=0, free=4, firstBlock=8, tailBlock=12, remaining=16,
                firstReplicator=20, secondReplicator=24, reserved=28, cursor=32, originalInput=36,
                output=40, outputCapacity=44, flags=48, parameterFunction=52, specialStateByte=56)),
        heapManager=dict(globalAddress='207d14e4', bytes=20,
            offsets=dict(allocator=0, free=4, firstBlock=8, tailBlock=12, remaining=16), alignment=8,
            scratchRequestBytes=4100, scratchAllocationBytes=4104, headerBytes=4, payloadBytes=4096,
            maximumArenaRequestBytes=4096, zeroArenaRequestBytes=8, directZeroRequestBytes=0),
        dname=dict(bytes=8, offsets=dict(head=0, status=4), statusMask=15, flagMask=0xff0,
            status=dict(valid=0, invalid=1, truncated=2, error=3), validStatuses=[0, 2],
            copyFlagMask=0xff0, assignFlagMask=0x8f0, allocationPaddingKnown=False),
        replicator=dict(bytes=60, offsets=dict(count=0, records=4, errorName=44, invalidName=52),
            maximumRecords=10, initialCount=-1, recordBytes=8, invalidNameStatus=1, errorNameStatus=3),
        nodes=dict(common=dict(vtableOffset=0, nextOffset=4),
            char=dict(bytes=12, alignedBytes=16, vtable='206bec94', characterOffset=8),
            text=dict(bytes=16, alignedBytes=16, vtable='206becc4', pointerOffset=8, lengthOffset=12),
            indirect=dict(bytes=12, alignedBytes=16, vtable='206beca4', dnamePointerOffset=8),
            status=dict(bytes=16, alignedBytes=16, vtable='206becb4', statusOffset=8, lengthOffset=12)),
        navigationClassName=dict(storage='navigationClassName', bytes=12,
            offsets=dict(string=0, initializerResult=4, guard=8), initializerResultStorage='navigationInitializerResult',
            typeInfoDescriptorStorage='navigationTypeInfoDescriptor', typeInfoListStorage='crtTypeInfoList',
            destructor='navigationClassNameDestructor', selectedInitializer='navigationClassNameInitializer',
            nativeClassNameConstructed=False, nativePropertyTypeRegistered=False),
        scriptAdminClassName=dict(storage='scriptAdminClassName', bytes=12,
            offsets=dict(string=0, initializerResult=4, guard=8), initializerResultStorage='scriptAdminInitializerResult',
            typeInfoDescriptorStorage='scriptAdminTypeInfoDescriptor', typeInfoListStorage='crtTypeInfoList',
            destructor='scriptAdminClassNameDestructor', nativeClassNameConstructed=False,
            nativePropertyTypeRegistered=False),
        scriptAdminLookup=dict(storage='scriptAdminLookupCacheGuard', bytes=8,
            offsets=dict(cachedInstance=0, guard=4), getterEntry='2001afbe', getterBody='200a4bb0'),
        scriptAdminStartup=dict(storage='scriptAdminStartupObjects', bytes=40,
            offsets=dict(rootWrapper=0, propertyId=16, accessor=36),
            objectBytes=dict(rootWrapper=16, propertyId=20, accessor=4),
            wrapperOffsets=dict(vtable=0, flags=4, nativePointer=8, typePointer=12),
            propertyTypeStorage='scriptAdminPropertyTypeAndGuard', propertyTypeBytes=24,
            factoryOffset=24, factoryAccessedExtentBytes=24, factorySpanToGuard=36,
            factoryUnclassifiedTailBytes=12,
            factoryExtentScope='Selected original factory constructor/destructor accessed prefix; sizeof unproven',
            typeGuardOffset=60,
            rootLookupStorage='scriptAdminRootLookupCacheGuard', rootLookupOffsets=dict(cachedRoot=0, guard=4),
            propertyIdLiteralStorage='scriptAdminPropertyIdLiteral',
            callbacks=['scriptAdminRootInitializer', 'scriptAdminPropertyIdInitializer', 'scriptAdminAccessorInitializer'],
            nativeStartupExecuted=False),
        exitTables=dict(beginStorage='crtExitBegin', endStorage='crtExitEnd', lock=8,
            initialCells=32, cellBytes=4, encodedPointers=True, callbacksTraversedInReverse=True,
            actualExitTableInitialized=False),
        bootstrap=dict(entry='entry', attachReason=1, ptdBytes=532,
            preCTableStorage='preCInitializerTable', preCTableSlots=64, attachCallbackStorage='attachCallback',
            nextBoundary='GetCommandLineA', fullGameStartupCompleted=False),
    )


def prepare(study: Path) -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    pe = native.PE((study / '00_Original_Runtime/Game.dll').read_bytes())
    require(sha(pe.data) == GAME_SHA, 'Original Game input differs')
    native.EXPECTED_INPUTS['Game.dll'] = GAME_SHA
    require(len(set(TARGETS.values())) == len(TARGETS), 'Duplicate catalog targets')
    audit = native.audit_module(study, 'Game_dll', 'Game.dll', {value: key for key, value in TARGETS.items()})
    # The generic dialogue auditor also emits unrelated dialogue constants and
    # tables for Game; they are outside this CRT package's selected scope.
    audit.pop('constants', None)
    audit.pop('tables', None)
    methods = audit['methods'] + manual_methods(study, pe)
    rules_methods = {method['label']: emit_method(study, pe, method) for method in methods}
    module_header = dict(imageBase=f'{pe.base:08x}',
        entryPoint=f'{pe.base + struct.unpack_from("<I", pe.data, pe.optional + 16)[0]:08x}',
        imageBytes=struct.unpack_from('<I', pe.data, pe.optional + 56)[0], format='PE32')
    require(module_header['entryPoint'] == rules_methods['entry']['entry'], 'Original Game PE entry differs')
    cold = {label: storage(pe, address, size) for label, (address, size) in COLD.items()}
    constants = {label: storage(pe, address, size, constant=True) for label, (address, size) in CONSTANTS.items()}
    for label, address in STRINGS.items():
        value = pe.string(address)
        constants[label] = storage(pe, address, len(value) + 1, constant=True) | dict(ascii=value)
    require(constants['sectionInitExceptionTable']['raw'][-16:] == '4d42472064424720', 'Section SEH entries differ')
    require(cold['crtTlsIndexes']['raw'] == 'ffffffffffffffff', 'Cold Game TLS indexes differ')
    require(cold['navigationTypeInfoDescriptor']['raw'] ==
        '74636b20000000002e3f415667434e617669676174696f6e5f5053404000', 'Navigation RTTI descriptor differs')
    require(cold['scriptAdminTypeInfoDescriptor']['raw'] ==
        '74636b20000000002e3f4156674353637269707441646d696e4040000000', 'ScriptAdmin RTTI descriptor differs')
    require(cold['scriptAdminClassName']['raw'] == '00' * 12 and
        cold['scriptAdminInitializerResult']['raw'] == '00' * 4, 'Cold ScriptAdmin class-name storage differs')
    require(cold['scriptAdminLookupCacheGuard']['raw'] == '00' * 8, 'Cold ScriptAdmin lookup storage differs')
    require(all(cold[label]['allZero'] for label in ['scriptAdminStartupObjects',
        'scriptAdminPropertyTypeAndGuard', 'scriptAdminRootLookupCacheGuard']),
        'Cold ScriptAdmin canonical startup storage differs')
    require(constants['scriptAdminPropertyIdLiteral']['raw'] ==
        '7b34394130323442412d393730412d343161362d393933432d3435384133394446314236317d00',
        'Original ScriptAdmin PropertyID literal differs')
    require(constants['classKeyword']['raw'] == '636c6173732000', 'Game class keyword differs')
    require(constants['truncatedNameText']['raw'] == '203f3f2000', 'Game truncated-name text differs')
    physical_layouts = layouts()
    for binding in physical_layouts['originalPointerBindings']:
        source = cold.get(binding['storage']) or constants[binding['storage']]
        target = cold.get(binding['target']) or constants[binding['target']]
        actual = struct.unpack_from('<I', bytes.fromhex(source['raw']), binding['offset'])[0]
        require(actual == int(target['address'], 16) + binding['targetOffset'],
                'Original Game pointer binding differs: ' + binding['storage'])
    table = bytes.fromhex(cold['crtLockTable']['raw'])
    locks, static_index = [], 0
    for index in range(36):
        pointer, flag = struct.unpack_from('<II', table, index * 8)
        require(pointer == 0 and flag in (0, 1), 'Cold Game lock record differs')
        record = dict(index=index, address=f'{0x207b2c70+index*8:08x}', pointer=pointer, staticFlag=flag)
        if flag == 1:
            record.update(staticSectionIndex=static_index, staticSectionAddress=f'{0x207d0f30+static_index*24:08x}')
            static_index += 1
        locks.append(record)
    require(static_index == 14, 'Cold Game static lock count differs')
    require([record['index'] for record in locks if record['staticFlag']] ==
        [0, 1, 3, 4, 6, 7, 8, 10, 12, 13, 14, 16, 17, 18], 'Actual Game static lock IDs differ')
    init_tables = dict(cInitializers=initializer_table(pe, 0x20655514, 0x20655730),
                       cppInitializers=initializer_table(pe, 0x2056c000, 0x20655410))
    cinit_rows = {row['va']: row['instruction'] for method in methods if method['label'] == 'cinit'
                  for row in method['instructions']}
    require(cinit_rows['2046661c'] == 'PUSH 0x20655730' and cinit_rows['20466621'] == 'PUSH 0x20655514' and
            cinit_rows['20466626'] == 'CALL 0x2046643f' and cinit_rows['20466633'] == 'PUSH 0x20473801' and
            cinit_rows['20466638'] == 'CALL 0x204637ce' and cinit_rows['2046663d'] == 'MOV ESI,0x2056c000' and
            cinit_rows['20466644'] == 'MOV EDI,0x20655410', 'Game C/C++ table operands/order differ')
    cpp = init_tables['cppInitializers']['nonNullCallbacks']
    nav_index = next(index for index, row in enumerate(cpp) if row['slot'] == '2056c220')
    require(nav_index == 71 and cpp[nav_index]['index'] == 136 and cpp[nav_index]['target'] == '204b1840',
            'Selected Navigation initializer order differs')
    require(init_tables['cInitializers']['nonNullCallbacks'][0]['target'] == '20463763',
            'Onexit C initializer order differs')
    init_tables['cppInitializers']['selectedNavigationInitializer'] = dict(cpp[nav_index],
        nonNullOrdinal=nav_index + 1, precedingNonNullCallbacks=nav_index, selectedCallbackExecuted=False)
    startup_slots = [('scriptAdminRootInitializerSlot', 'scriptAdminRootInitializer', 146389, 1673),
                     ('scriptAdminPropertyIdInitializerSlot', 'scriptAdminPropertyIdInitializer', 146390, 1674),
                     ('scriptAdminAccessorInitializerSlot', 'scriptAdminAccessorInitializer', 146391, 1675)]
    selected_startup = []
    for slot_label, method_label, expected_index, expected_ordinal in startup_slots:
        slot = constants[slot_label]
        ordinal = next(index + 1 for index, row in enumerate(cpp) if row['slot'] == slot['address'])
        row = cpp[ordinal - 1]
        target = struct.unpack('<I', bytes.fromhex(slot['raw']))[0]
        require(row['index'] == expected_index and ordinal == expected_ordinal and
                row['target'] == f'{target:08x}' == rules_methods[method_label]['entry'],
                'Original ScriptAdmin callback slot/order differs: ' + method_label)
        selected_startup.append(dict(row, method=method_label, slotStorage=slot_label,
            nonNullOrdinal=ordinal, precedingNonNullCallbacks=ordinal - 1, selectedCallbackExecuted=False))
    init_tables['cppInitializers']['selectedScriptAdminInitializers'] = selected_startup
    table_summaries = {label: emit_initializer_table(label, table) for label, table in init_tables.items()}
    used_iats = {f'0x{value}' for method in methods for row in method['instructions']
        for value in re.findall(r'\[0x([0-9a-f]{8})\]', row['instruction'])}
    imports = [row for row in pe.imports() if row['iatVA'] in used_iats]
    calls = {method['label']: [dict(va=row['va'], instruction=row['instruction']) for row in method['instructions']
        if row['instruction'].startswith('CALL ')] for method in methods}
    summary = dict(selectedMethods=len(methods), instructions=sum(method['instructionCount'] for method in methods),
        byteMismatchCount=0, completeSelectedBodyExtents=True, allSelectedInstructionBytesMatchOriginalPE=True,
        recoveredPEInstructions=sum(bool(row.get('originalPERecovered')) for method in methods for row in method['instructions']),
        sourceExcerptNormalization=NORMALIZATION,
        nativeCodeExecuted=False, liveProcessStateCaptured=False)
    rules = dict(schema='gothic3-game-crt-rules-v1', inputs=dict(Game=GAME_SHA), moduleHeader=module_header,
        methods=rules_methods,
        coldGlobals=cold, constBytes=constants, imports=dict(Game=imports), callInventory=calls,
        lockRecords=locks, initializerTables=table_summaries, layouts=physical_layouts,
        scope='Offline Game-specific source receipts; actual Game module/platform owners remain required')
    evidence = dict(schema='gothic3-game-crt-evidence-v1', inputs=dict(Game=GAME_SHA), moduleHeader=module_header,
        modules=dict(Game={key: value for key, value in audit.items() if key != 'methods'}),
        methods=methods, coldGlobals=cold, constBytes=constants, imports=dict(Game=imports),
        lockRecords=locks, initializerTables=table_summaries, layouts=physical_layouts, audit=summary)
    (OUT / 'runtime-rules.json').write_bytes(encode(rules))
    (OUT / 'native-evidence.json').write_bytes(encode(evidence))
    files = [file for file in OUT.rglob('*') if file.is_file() and file.name != 'source-manifest.json']
    files.append(Path(__file__).resolve())
    for module in list(sys.modules.values()):
        path = getattr(module, '__file__', None)
        if path:
            dependency = Path(path).resolve()
            if dependency.parent == ROOT / 'tools/gothic3' and dependency.suffix == '.py':
                files.append(dependency)
    manifest = dict(schema='gothic3-game-crt-source-manifest-v1', inputs=dict(Game=GAME_SHA), audit=summary,
        checksActuallyPerformed=['Original Game DLL/CSV/assembly/C hashes and selected instruction/extents audit',
                                'Original Game storage/initializer order and import operand audit'],
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
