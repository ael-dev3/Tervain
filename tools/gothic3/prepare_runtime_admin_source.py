"""Pin the cold SharedBase admin/bootstrap methods and owned heap constants.

Offline original-PE/source audit only. Source excerpts are reconstructed
decompiler output, not original buildable C++. Platform services remain explicit;
auditing a complete function does not claim every branch is implemented.
"""
# SPDX-License-Identifier: GPL-3.0-only
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import struct
from pathlib import Path

import read_dialogue_native_evidence as native

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/gothic3/runtime-admin'
INPUT_SHA = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'

# Entry aliases are retained separately from their concrete bodies.
TARGETS = {
    'errorGetInstance': 0x10006c1c, 'errorConstructor': 0x10003107,
    'errorInvalidate': 0x10002ef0, 'errorCreate': 0x10001db1,
    'errorDestroy': 0x100032c4, 'errorIsInPanicState': 0x100075ae,
    'errorAddHistory': 0x1000102d,
    'errorHistoryPop': 0x10023050, 'errorHistoryPush': 0x100233e0,
    'accessorCreatorDestructor': 0x10007356,
    'messageGetInstance': 0x100088b4, 'messageCreate': 0x10006b7c,
    'messageDestroy': 0x1000247d, 'messageRegister': 0x10007cac,
    'messageUnregister': 0x10001c21, 'messageArrayGrow': 0x1000631b,
    'messageArrayErase': 0x10004822, 'messageArrayDelete': 0x10002ba3,
    'messageHolderNew': 0x100010e1,
    'spyGetInstance': 0x10008b11, 'spyCreate': 0x100089e5,
    'spyDestroy': 0x100081d9, 'spyMessageCallback': 0x10008c06,
    'spieGetInstance': 0x10001334, 'spieCreate': 0x10008887,
    'spieDestroy': 0x10002fe5, 'spieMessageCallback': 0x10005722,
    'memoryGetInstance': 0x10002aae, 'memoryTaggedNew': 0x100010e1,
    'memoryRealloc': 0x10004133, 'memoryFree': 0x10002112,
    'memoryDeleteObject': 0x10004c3c,
    'heapReallocUnsynced': 0x100052fe, 'heapMediumRealloc': 0x1003d6b0,
    'heapFreeUnsynced': 0x10002e46,
    'memoryCStringClear': 0x10003d28,
    'heapAlloc': 0x10008080, 'heapAllocUnsynced': 0x10001028,
    'heapMediumAlloc': 0x1003d1f0, 'heapMediumRegion': 0x1003d120,
    'heap12BitmapAlloc': 0x10006a19, 'heap12BlockInitialize': 0x10004683,
    'heap112BitmapAlloc': 0x10005731, 'heap112BlockInitialize': 0x10001951,
    'heap16BitmapAlloc': 0x1000605a, 'heap16BlockInitialize': 0x100061cc,
    'heap448BitmapAlloc': 0x10001b6d, 'heap448BlockInitialize': 0x10006a64,
    'heap768BitmapAlloc': 0x10007900, 'heap768BlockInitialize': 0x100075cc,
    'heap28BitmapAlloc': 0x10001b72, 'heap28BlockInitialize': 0x100039db,
    'heap192BitmapAlloc': 0x10004abb, 'heap192BlockInitialize': 0x1000531c,
    'heap224BitmapAlloc': 0x10003508, 'heap224BlockInitialize': 0x1000504c,
    'heapAddPointerArea': 0x100012e4, 'heapGetPointerArea': 0x10005b37,
    'heapMediumInsert': 0x1003c760, 'heapMediumUnlink': 0x1003c7a0,
    'heapMediumSplit': 0x1003c7e0, 'heapMediumMerge': 0x1003c850,
    'heapMediumCoalesce': 0x1003c8b0, 'heapMediumFreeLookup': 0x1003c920,
    'heap12InlineFree': 0x10043190, 'heap12Realloc': 0x100072a7,
    'heap112InlineFree': 0x100080f3, 'heap448InlineFree': 0x10005015,
    'heap768InlineFree': 0x10005b78, 'heap28InlineFree': 0x100025cc,
    'heap192InlineFree': 0x1000817a,
    'heap224InlineFree': 0x10005024,
    'crtOperatorNew': 0x100aabd2, 'crtAtexit': 0x100a72d0,
    'crtOnExit': 0x100a7294, 'crtCallbackAppend': 0x100a71ac,
    'crtNormalTermination': 0x100aa6c4,
}
ASM_ONLY = {
    'errorMessageCallback': [(0x10022590, 0x10022696)],
    'heap12PoolDispatch': [(0x10047e70, 0x10047e99), (0x10047ea0, 0x10047eef)],
    'heap112PoolDispatch': [(0x100485f0, 0x10048619), (0x10048620, 0x1004866f)],
    'heap16PoolDispatch': [(0x10047f10, 0x10047f39), (0x10047f40, 0x10047f8f)],
    'heap448PoolDispatch': [(0x10048af0, 0x10048b19), (0x10048b20, 0x10048b6f)],
    'heap768PoolDispatch': [(0x10048cd0, 0x10048cf9), (0x10048d00, 0x10048d4f)],
    'heap28PoolDispatch': [(0x100480f0, 0x10048119), (0x10048120, 0x1004816f)],
    'heap192PoolDispatch': [(0x100487d0, 0x100487f9), (0x10048800, 0x1004884f)],
    'heap224PoolDispatch': [(0x10048870, 0x10048899), (0x100488a0, 0x100488ef)],
    'heap12Free': [(0x10043ff0, 0x10044034)],
    'heap112Free': [(0x10044980, 0x100449ca)],
    'heap112Realloc': [(0x100449e0, 0x10044a23)],
    'heap16Free': [(0x100440b0, 0x100440ed)],
    'heap16Realloc': [(0x10044100, 0x10044177)],
    'heap448Free': [(0x10044fc0, 0x1004500a)],
    'heap448Realloc': [(0x10045020, 0x10045065)],
    'heap768Free': [(0x10045220, 0x10045264)],
    'heap768Realloc': [(0x10045280, 0x100452c5)],
    'heap28Free': [(0x10044340, 0x1004438a)],
    'heap28Realloc': [(0x100443a0, 0x100443e3)],
    'heap192Free': [(0x10044be0, 0x10044c24)],
    'heap192Realloc': [(0x10044c40, 0x10044c85)],
    'heap224Free': [(0x10044ca0, 0x10044cea)],
    'heap224Realloc': [(0x10044d00, 0x10044d45)],
    'memoryShutdown': [(0x100e2710, 0x100e274e)],
    'errorShutdown': [(0x100e2770, 0x100e2785)],
    'messageShutdown': [(0x100e27d0, 0x100e2802)],
    'spyShutdown': [(0x100e2890, 0x100e28b8)],
    'spieShutdown': [(0x100e2830, 0x100e2876)],
}
ASM_ALIASES = {
    'errorMessageCallback': 0x10002df6,
    'heap12PoolDispatch': 0x100028f6, 'heap112PoolDispatch': 0x10003102,
    'heap16PoolDispatch': 0x10002d97, 'heap448PoolDispatch': 0x10003012,
    'heap768PoolDispatch': 0x10006b9f,
    'heap28PoolDispatch': 0x10005966, 'heap192PoolDispatch': 0x10006be5,
    'heap224PoolDispatch': 0x100070c7,
    'heap12Free': 0x10003e86, 'heap112Free': 0x10001587,
    'heap112Realloc': 0x10006988, 'heap16Free': 0x10008855, 'heap16Realloc': 0x10006640,
    'heap448Free': 0x10004575, 'heap448Realloc': 0x10001a46,
    'heap768Free': 0x100031b1, 'heap768Realloc': 0x10005a60,
    'heap28Free': 0x1000436d, 'heap28Realloc': 0x10002a59,
    'heap192Free': 0x10008ac6, 'heap192Realloc': 0x100063f2,
    'heap224Free': 0x1000794b, 'heap224Realloc': 0x10006e8d,
}
COLD = {
    'errorAdmin': (0x10142a58, 44), 'errorAdminGuard': (0x10142a8c, 4),
    'messageAdmin': (0x10197d6c, 32), 'messageAdminGuard': (0x10197d94, 4),
    'spyAdmin': (0x101ab11c, 32), 'spyAdminGuard': (0x101ab144, 4),
    'spieAdmin': (0x10197dc0, 28), 'spieAdminGuard': (0x10197de4, 4),
    'spieEnabled': (0x10197dbc, 4),
    'memoryAdminGlobals': (0x10142798, 16), 'memoryAdminSingleton': (0x101427a0, 3),
    'memoryAdminGuard': (0x101427a4, 4),
    'memHeapCriticalSection': (0x10189a18, 24), 'memHeapCriticalSectionFlag': (0x102fb000, 1),
    'heapLock': (0x102fb002, 2), 'heapFirstPool': (0x102fb004, 4),
    'heapPointerAreaCount': (0x102fb030, 4),
    'heap12PoolGlobals': (0x102ffd4c, 12), 'heap112PoolGlobals': (0x102ffddc, 12),
    'heap16PoolGlobals': (0x102ffd58, 12), 'heap448PoolGlobals': (0x102ffe3c, 12),
    'heap768PoolGlobals': (0x102ffe60, 12),
    'heap28PoolGlobals': (0x102ffd7c, 12), 'heap192PoolGlobals': (0x102ffe00, 12),
    'heap224PoolGlobals': (0x102ffe0c, 12),
    'heapMediumBuckets': (0x10144214, 4097 * 4),
    'heapMediumRegionList': (0x10148218, 512 * 4), 'heapMediumRegionCount': (0x102fb04c, 4),
    # Only the selected first eight pointer-area records are admitted. No table
    # maximum is inferred from proximity to another static variable.
    'heapPointerAreasSelected': (0x10149a18, 8 * 16),
    'heap12DescriptorSlot': (0x102ffeec, 4), 'heap112DescriptorSlot': (0x102fff1c, 4),
    'heap16DescriptorSlot': (0x102ffef0, 4), 'heap448DescriptorSlot': (0x102fff3c, 4),
    'heap768DescriptorSlot': (0x102fff48, 4),
    'heap28DescriptorSlot': (0x102ffefc, 4), 'heap192DescriptorSlot': (0x102fff28, 4),
    'heap224DescriptorSlot': (0x102fff2c, 4),
    'errorHistoryPopScratch': (0x10144028, 250), 'errorHistoryPushScratch': (0x10143ef8, 250),
}
CONST_STRINGS = {
    '100e70d0': 0x100e70d0, '100e70e0': 0x100e70e0,
    '100e70e4': 0x100e70e4, '100e7104': 0x100e7104,
    '100e8114': 0x100e8114, '100e8088': 0x100e8088,
    '100e8104': 0x100e8104, '100e80fc': 0x100e80fc,
    '100e80f4': 0x100e80f4, '100e807c': 0x100e807c,
    '100e7dd0': 0x100e7dd0, '100e7d70': 0x100e7d70,
    '100e8094': 0x100e8094,
}
CONST_WORDS = {
    'heap12Stride': (0x100e7aa0, 12), 'heap12Capacity': (0x100e7aa4, 0xfffe),
    'heap16Stride': (0x100e7aa8, 16), 'heap16Capacity': (0x100e7aac, 0xffff),
    'heap112Stride': (0x100e7b00, 112), 'heap112Capacity': (0x100e7b04, 0xffb6),
    'heap448Stride': (0x100e7b40, 448), 'heap448Capacity': (0x100e7b44, 0x7ff6),
    'heap768Stride': (0x100e7b58, 768), 'heap768Capacity': (0x100e7b5c, 0xfff),
    'heap28Stride': (0x100e7ac0, 28), 'heap28Capacity': (0x100e7ac4, 0xfedc),
    'heap192Stride': (0x100e7b18, 192), 'heap192Capacity': (0x100e7b1c, 0xffd5),
    'heap224Stride': (0x100e7b20, 224), 'heap224Capacity': (0x100e7b24, 0x7fed),
}
POINTER_TABLES = {
    'heap12DispatchSlot': (0x102fb080, 4), 'heap12FallbackSlot': (0x102fb084, 4),
    'heap108DispatchSlot': (0x102fb200, 4), 'heap112DispatchSlot': (0x102fb210, 4),
    'heapDispatchTable': (0x102fb050, 4097 * 4),
}

# Constants are specific source constructor/dispatch operands. These are not
# extrapolated from a general stride formula, and the full dispatch table pins
# every admitted request range including native Navigation's request688.
BUCKETS = {
    '224': dict(stride=224, minimumRequest=193, maximumRequest=224, regionBytes=0x700000,
        capacity=0x7fed, bitmapOffset=0x6fef70, bitmapBytes=0x1000,
        lastBitmapMask=0x1fff, payloadBytes=0x6fef60,
        globals=dict(count='102ffe0c', list='102ffe10', peak='102ffe14', descriptor='102fff2c'),
        callbacks=['1000794b', '10006e8d', '10004593', '10005ad3']),
    '28': dict(stride=28, minimumRequest=25, maximumRequest=28, regionBytes=0x1c0000,
        capacity=0xfedc, bitmapOffset=0x1be020, bitmapBytes=0x1fdc,
        lastBitmapMask=0xfffffff, payloadBytes=0x1be010,
        globals=dict(count='102ffd7c', list='102ffd80', peak='102ffd84', descriptor='102ffefc'),
        callbacks=['1000436d', '10002a59', '10001e5b', '100043b3']),
    '192': dict(stride=192, minimumRequest=161, maximumRequest=192, regionBytes=0xc00000,
        capacity=0xffd5, bitmapOffset=0xbfdfd0, bitmapBytes=0x1ffc,
        lastBitmapMask=0x1fffff, payloadBytes=0xbfdfc0,
        globals=dict(count='102ffe00', list='102ffe04', peak='102ffe08', descriptor='102fff28'),
        callbacks=['10008ac6', '100063f2', '10007f5e', '1000488b']),
    '12': dict(stride=12, minimumRequest=9, maximumRequest=12, regionBytes=0xc2000,
        capacity=0xfffe, bitmapOffset=0xbfff8, bitmapBytes=0x2000,
        lastBitmapMask=0x3fffffff, payloadBytes=0xbffe8,
        globals=dict(count='102ffd4c', list='102ffd50', peak='102ffd54', descriptor='102ffeec'),
        callbacks=['10003e86', '100072a7', '10006735', '10004c50']),
    '112': dict(stride=112, minimumRequest=97, maximumRequest=112, regionBytes=0x700000,
        capacity=0xffb6, bitmapOffset=0x6fdfb0, bitmapBytes=0x1ff8,
        lastBitmapMask=0x3fffff, payloadBytes=0x6fdfa0,
        globals=dict(count='102ffddc', list='102ffde0', peak='102ffde4', descriptor='102fff1c'),
        callbacks=['10001587', '10006988', '10008a21', '100049c1']),
    '16': dict(stride=16, minimumRequest=13, maximumRequest=16, regionBytes=0x102000,
        capacity=0xffff, bitmapOffset=0x100000, bitmapBytes=0x2000,
        lastBitmapMask=0x7fffffff, payloadBytes=0xffff0,
        globals=dict(count='102ffd58', list='102ffd5c', peak='102ffd60', descriptor='102ffef0'),
        callbacks=['10008855', '10006640', '100013e3', '10007b9e']),
    '448': dict(stride=448, minimumRequest=385, maximumRequest=448, regionBytes=0xe00000,
        capacity=0x7ff6, bitmapOffset=0xdfee90, bitmapBytes=0x1000,
        lastBitmapMask=0x3fffff, payloadBytes=0xdfee80,
        globals=dict(count='102ffe3c', list='102ffe40', peak='102ffe44', descriptor='102fff3c'),
        callbacks=['10004575', '10001a46', '100089db', '10005420']),
    '768': dict(stride=768, minimumRequest=641, maximumRequest=768, regionBytes=0x300000,
        capacity=0xfff, bitmapOffset=0x2ffd10, bitmapBytes=0x200,
        lastBitmapMask=0x7fffffff, payloadBytes=0x2ffd00,
        globals=dict(count='102ffe60', list='102ffe64', peak='102ffe68', descriptor='102fff48'),
        callbacks=['100031b1', '10005a60', '100046d3', '10002a5e']),
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf8')


def image_bytes(pe: native.PE, address: int, size: int) -> tuple[bytes, dict]:
    """Preserve file-backed bytes or prove PE loader zero-fill, never live data."""
    rva = address - pe.base
    for virtual_size, start, raw_size, offset in pe.sections:
        if start <= rva and rva + size <= start + virtual_size:
            backed = max(0, min(size, start + raw_size - rva))
            raw = pe.data[offset + rva - start:offset + rva - start + backed]
            raw += b'\0' * (size - backed)
            require(len(raw) == size, 'Cold image range extent differs')
            return raw, {'virtualAddress': start, 'virtualSize': virtual_size,
                         'rawSize': raw_size, 'rawOffset': offset,
                         'fileBackedBytes': backed, 'loaderZeroFillBytes': size - backed}
    raise ValueError(f'Cold image range absent: {address:08x}/{size}')


def source_excerpt(study: Path, method: dict) -> str:
    path = study / method['reconstructedC']['path']
    text = path.read_text(encoding='utf8')
    address = method['bodyVA'][2:]
    start = text.index('/* ENTRY ' + address + ' |')
    end = text.find('/* ENTRY ', start + 1)
    return text[start:end if end >= 0 else len(text)].rstrip() + '\n'


def emit_source_refs(study: Path, method: dict, module: str) -> dict:
    rows = method['instructions']
    address = method['bodyVA'][2:]
    folder = OUT / 'sources' / module; folder.mkdir(parents=True, exist_ok=True)
    asm_path = folder / (address + '.asm.txt')
    asm_path.write_text('\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction'] for row in rows) + '\n', encoding='utf8', newline='\n')
    refs = {'assemblyExcerpt': asm_path.relative_to(OUT).as_posix(), 'assemblyExcerptSha256': sha(asm_path.read_bytes())}
    if 'reconstructedC' in method:
        c_path = folder / (address + '.c.txt')
        c_path.write_text(source_excerpt(study, method), encoding='utf8', newline='\n')
        refs.update(cExcerpt=c_path.relative_to(OUT).as_posix(), cExcerptSha256=sha(c_path.read_bytes()),
                    reconstructedC=method['reconstructedC'])
    return refs


def prior_startup(study: Path) -> dict:
    """Bounded prerequisite inventory, not an executed SceneAdmin capability."""
    native.EXPECTED_INPUTS['Game.dll'] = 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'
    native.EXPECTED_INPUTS['Engine.dll'] = 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'
    game = native.audit_module(study, 'Game_dll', 'Game.dll', {
        0x201d4cb0: 'entityFactory', 0x20292300: 'navigationWrapperClone',
        0x20291510: 'navigationDefaultCreate'})
    engine = native.audit_module(study, 'Engine_dll', 'Engine.dll', {
        0x30005227: 'sceneRegisterEntity', 0x300120a3: 'sceneUnregisterEntity',
        0x304d13a0: 'registeredMapConstructor', 0x304ce950: 'registeredMapGrow',
        0x304cfc00: 'registeredMapSlot', 0x304ce740: 'registeredMapLookup',
        0x304d0490: 'registeredMapErase', 0x304cfc80: 'registeredMapDeleteEntry',
        0x30025897: 'entitySetName', 0x3002f603: 'sceneRegisterNameInfo',
        0x304d1480: 'nameMapConstructor', 0x304cea00: 'nameMapGrow',
        0x304ce450: 'nameMapLookup', 0x304d0f60: 'nameMapSlot',
        0x30073b10: 'namePointerArrayGrow', 0x3007ef40: 'namePointerArrayAssign',
        0x304d01a0: 'nameTemporaryArrayDelete', 0x304cc660: 'sceneConstructorCallInventory'})
    for document in [game, engine]:
        for method in document['methods']:
            raw = b''.join(bytes.fromhex(row['bytes']) for row in method['instructions'])
            method.update(sourceRefs=emit_source_refs(study, method, document['module'].removesuffix('.dll')),
                          bodyInstructionBytesSha256=sha(raw), bodyByteCount=len(raw),
                          instructionCount=len(method['instructions']))
    game_allocator = next(row for row in game['imports'] if row['iatVA'] == '0x207d88f8')
    require(game_allocator['module'].lower() == 'sharedbase.dll' and game_allocator['name'] == '_new@8',
            'Prior Game allocation no longer calls SharedBase tagged-new')
    return {'schema': 'gothic3-runtime-admin-prior-startup-v1',
        'scope': 'Read-only byte-audited prerequisite inventory. These prior browser owners do not yet route their backing through the standalone native admin module. Full SceneAdmin/module startup is not admitted by this bounded table inventory.',
        'inputs': {'Game': game['inputSha256'], 'Engine': engine['inputSha256'], 'SharedBase': INPUT_SHA},
        'modules': {'Game': game, 'Engine': engine}, 'sharedTaggedNewImport': game_allocator,
        'allocationInventory': [
            {'path': 'gCEntity factory', 'module': 'Game', 'callVA': '201d4cbb', 'requestedBytes': 448,
             'tag': 0x170, 'allocator': 'SharedBase:100010e1->10020c40', 'bucket': '448'},
            {'path': 'Navigation wrapper clone', 'module': 'Game', 'callVA': '2029230b', 'requestedBytes': 16,
             'tag': 0x190, 'allocator': 'SharedBase:100010e1->10020c40', 'bucket': '16'},
            {'path': 'Navigation native default Create', 'module': 'Game', 'callVA': '20291587', 'requestedBytes': 688,
             'tag': 0xc4, 'allocator': 'SharedBase:100010e1->10020c40', 'bucket': '768'},
            {'path': 'Registered table constructor -> Grow(43,0)', 'module': 'Engine',
             'requestedLogicalBuckets': 43, 'coldDefaultGrowthBuckets': 8, 'actualCapacityBuckets': 51,
             'requestedBytes': 204, 'allocator': 'MemoryAdmin.GetInstance->Realloc(NULL,204)', 'bucket': '224',
             'sourceMethods': ['registeredMapConstructor', 'registeredMapGrow']},
            {'path': 'Register a new ID -> map slot miss', 'module': 'Engine', 'requestedBytes': 28,
             'tag': 0x199, 'allocator': 'SharedBase tagged-new', 'bucket': '28', 'sourceMethods': ['registeredMapSlot']},
            {'path': 'Node identity remap', 'module': 'Engine',
             'order': ['unregister old ID', 'PropertyID destructor', 'MemoryAdmin.DeleteObject old28B map entry',
                       'read serialized ID', 'register new ID', 'tagged-new fresh28B map entry on slot miss'],
             'sourceMethods': ['sceneUnregisterEntity', 'registeredMapErase', 'registeredMapDeleteEntry', 'sceneRegisterEntity', 'registeredMapSlot']},
            {'path': 'Nonempty Entity.SetName -> RegisterNameInfo, cold name slot miss', 'module': 'Engine',
             'nameMapObjectOffset': '0x44', 'nameMapInitialLogicalBuckets': 43,
             'nameMapInitialActualCapacityBuckets': 51, 'nameMapBackingBytes': 204,
             'order': [
                 {'effect': 'temporary pointer-array grow(1,0)', 'requestedBytes': 36,
                  'capacity': 9, 'allocator': 'MemoryAdmin.Realloc(NULL,36)'},
                 {'effect': 'name map entry slot miss', 'requestedBytes': 20, 'tag': 0x199,
                  'allocator': 'SharedBase tagged-new'},
                 {'effect': 'name map key CString assignment',
                  'boundary': 'Actual source CString holder/share/refcount capability must be owned; a browser string is not native pointer storage.'},
                 {'effect': 'assign temporary list into new resident pointer array', 'requestedBytes': 36,
                  'capacity': 9, 'allocator': 'MemoryAdmin.Realloc(NULL,36)'},
                 {'effect': 'free temporary36B pointer-array backing', 'allocator': 'MemoryAdmin.Free'}],
             'sourceMethods': ['entitySetName', 'sceneRegisterNameInfo', 'nameMapConstructor', 'nameMapGrow',
                               'nameMapLookup', 'nameMapSlot', 'namePointerArrayGrow', 'namePointerArrayAssign',
                               'nameTemporaryArrayDelete'],
             'unsupportedHere': 'Buckets20 and36 and actual name-table/CString owners are not admitted by the standalone admin implementation; full allocator table bytes pin their dispatch pointers only.'}],
        'remainingPrerequisites': [
            'Original binary indexed-string table and CString lifetime/refcount ownership before Entity.SetName.',
            'Actual registered/name map backing and entries, critical-section host and allocation ordering.',
            'The complete SceneAdmin constructor, EntityAdmin, ModuleAdmin/GetInstance and application initialization path; the supplied browser table service is a selected subservice.',
            'All earlier entity, reflection wrapper and native Navigation allocations must use the same native MemoryAdmin before connecting this standalone cold owner.'],
        'audit': {'methodCount': sum(len(document['methods']) for document in [game, engine]),
                  'instructionCount': sum(len(method['instructions']) for document in [game, engine] for method in document['methods']),
                  'byteMismatchCount': 0, 'nativeCodeExecuted': False}}


def prepare(study: Path) -> dict:
    binary = (study / '00_Original_Runtime/SharedBase.dll').read_bytes()
    require(sha(binary) == INPUT_SHA, 'Unreviewed original SharedBase build')
    pe = native.PE(binary)
    native.EXPECTED_INPUTS['SharedBase.dll'] = INPUT_SHA
    # audit_module's address-keyed input cannot carry duplicate aliases; labels
    # below preserve both names in the concise runtime rules without recounting.
    unique = {address: label for label, address in reversed(list(TARGETS.items()))}
    audit = native.audit_module(study, 'SharedBase_dll', 'SharedBase.dll', unique)
    base = study / '01_Decompiled_Code/SharedBase_dll'
    catalog = {row['address']: row for row in csv.DictReader((base / 'functions.csv').read_text(encoding='utf8').splitlines())}
    assembly = (base / 'full_disassembly.asm').read_text(encoding='utf8').splitlines()
    parsed = []
    for number, line in enumerate(assembly, 1):
        match = re.fullmatch(r'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', line)
        if match:
            parsed.append((int(match[1], 16), match[2], match[3], number))
    methods = audit['methods']
    for label, ranges in ASM_ONLY.items():
        first = ranges[0][0]
        # The assembly-only designation means no reconstructed C/catalog body.
        require(f'{first:08x}' not in catalog, 'Assembly-only catalog gap differs: ' + label)
        rows = []
        for address, raw, instruction, line in parsed:
            if any(start <= address <= end for start, end in ranges):
                decoded = bytes.fromhex(raw)
                require(pe.bytes(address, len(decoded)) == decoded, 'Assembly-only PE disagreement')
                rows.append({'va': f'{address:08x}', 'rva': f'{address - pe.base:x}',
                             'fileOffset': pe.offset(address, len(decoded)), 'bytes': raw,
                             'instruction': instruction, 'assemblyLine': line})
        require(rows, 'Missing assembly-only instructions: ' + label)
        for start, end in ranges:
            cursor = start
            for row in rows:
                address = int(row['va'], 16)
                if start <= address <= end:
                    require(address == cursor, 'Assembly-only instruction coverage gap: ' + label)
                    cursor += len(bytes.fromhex(row['bytes']))
            require(cursor == end + 1, 'Assembly-only instruction extent differs: ' + label)
        entry = ASM_ALIASES.get(label, first)
        chain = []
        if entry != first:
            raw = pe.bytes(entry, 5)
            require(raw[0] == 0xe9 and entry + 5 + struct.unpack('<i', raw[1:])[0] == first,
                    'Assembly-only callback alias differs')
            chain.append({'va': f'{entry:08x}', 'bytes': raw.hex(), 'targetVA': f'{first:08x}'})
        methods.append({'label': label, 'entryVA': f'0x{entry:08x}', 'bodyVA': f'0x{first:08x}',
                        'entryChain': chain, 'bodyRanges': ';'.join(f'{a:08x}-{b:08x}' for a, b in ranges),
                        'instructions': rows, 'sourceCGap': True, 'sourceASMGap': False})
    method_rules = {}
    for method in methods:
        rows = method['instructions']
        body = b''.join(bytes.fromhex(row['bytes']) for row in rows)
        method.update(instructionCount=len(rows), bodyByteCount=len(body), bodyInstructionBytesSha256=sha(body))
        address = method['bodyVA'][2:]
        refs = emit_source_refs(study, method, 'SharedBase')
        method['sourceRefs'] = refs
        method_rules[method['label']] = {'entry': method['entryVA'][2:], 'body': address,
            'bodyRanges': method['bodyRanges'], 'bodyInstructionBytesSha256': sha(body),
            'instructionCount': len(rows), 'bodyBytes': len(body), 'sourceRefs': refs}
    by_entry = {int(method['entryVA'], 16): method for method in methods}
    for label, entry in TARGETS.items():
        if label not in method_rules:
            original = by_entry[entry]
            method_rules[label] = dict(method_rules[original['label']])
    cold = {}
    for label, (address, size) in COLD.items():
        raw, section = image_bytes(pe, address, size)
        require(raw == b'\0' * size, 'Original cold zero bytes differ: ' + label)
        cold[label] = {'address': f'{address:08x}', 'bytes': size, 'raw': raw.hex(),
                      'sha256': sha(raw), 'knownMask': 'ff' * size,
                      'scope': 'cold-original-image', 'liveValueCaptured': False, 'section': section}
    strings = {}
    for label, address in CONST_STRINGS.items():
        offset = pe.offset(address, 1)
        raw = binary[offset:binary.index(b'\0', offset) + 1]
        value = raw[:-1].decode('cp1252')
        strings[label] = {'address': f'{address:08x}', 'text': value, 'raw': raw.hex(), 'sha256': sha(raw),
                          'textEncoding': 'windows-1252-display; original bytes authoritative'}
    const_words = {}
    for label, (address, value) in CONST_WORDS.items():
        raw = pe.bytes(address, 4)
        require(struct.unpack('<I', raw)[0] == value, 'Bucket constant DWORD differs: ' + label)
        const_words[label] = {'address': f'{address:08x}', 'value': value,
                              'raw': raw.hex(), 'sha256': sha(raw)}
    tables = {}
    for label, (address, size) in POINTER_TABLES.items():
        raw = pe.bytes(address, size)
        tables[label] = {'address': f'{address:08x}', 'bytes': size, 'raw': raw.hex(),
                         'sha256': sha(raw), 'values': [f'{value:08x}' for value in struct.unpack('<' + 'I' * (size // 4), raw)]}
    buckets = {}
    for name, values in BUCKETS.items():
        labels = ['heap' + name + suffix for suffix in ['PoolDispatch', 'BitmapAlloc', 'BlockInitialize']]
        concrete = [next(method for method in methods if method['label'] == label) for label in labels]
        instructions = [row for method in concrete for row in method['instructions']]
        code = b''.join(bytes.fromhex(row['bytes']) for row in instructions)
        dispatch = method_rules[labels[0]]['entry']
        for request in range(values['minimumRequest'], values['maximumRequest'] + 1):
            require(tables['heapDispatchTable']['values'][request] == dispatch,
                    f'Bucket {name} request {request} original dispatch differs')
        proofs = {}
        for field in ['regionBytes', 'bitmapOffset', 'bitmapBytes', 'lastBitmapMask', 'payloadBytes']:
            encoded = struct.pack('<I', values[field]).hex()
            rows = [row for row in instructions if encoded in row['bytes']]
            require(rows, f'Bucket {name} {field} audited operand absent')
            proofs[field] = [{'va': row['va'], 'bytes': row['bytes'], 'instruction': row['instruction']} for row in rows]
        for callback in values['callbacks']:
            require(struct.pack('<I', int(callback, 16)) in code, 'Descriptor callback operand absent: ' + callback)
        referenced_labels = labels + ['heap' + name + suffix for suffix in ['Free', 'Realloc', 'InlineFree']
                                     if 'heap' + name + suffix in method_rules]
        buckets[name] = dict(values, sourceRefs={label: method_rules[label] for label in referenced_labels},
                             operandProofs=proofs,
                             strideReceipt='heap' + name + 'Stride', capacityReceipt='heap' + name + 'Capacity',
                             dispatchTableReceipt='heapDispatchTable')
    shutdown = {}
    for method in methods:
        if method['label'].endswith('Shutdown'):
            body = b''.join(bytes.fromhex(row['bytes']) for row in method['instructions'])
            shutdown[method['bodyVA'][2:]] = {'address': method['bodyVA'][2:], 'raw': body.hex(),
                'sha256': sha(body), 'instructions': method['instructions'], 'sourceRefs': method['sourceRefs']}
    rules = {'schema': 'gothic3-runtime-admin-rules-v1', 'inputs': {'SharedBase': INPUT_SHA},
             'methods': method_rules, 'coldGlobals': cold, 'constStrings': strings,
             'constWords': const_words, 'pointerTables': tables, 'shutdown': shutdown,
             'buckets': buckets,
             'platformBoundaries': {
                 'criticalSection': 'Selected platform registration/lifetime; native opaque CS bytes become unknown after initialization.',
                 'virtualAllocation': 'Selected platform region/offset capability. Native pool metadata, masks, lists and counters remain owned separately.',
                 'crtAllocation': 'Selected successful bounded CRT allocation/free profile with retained bytes, masks and lifetimes; native failure/new-handler branches remain unsupported.',
                 'crtShutdown': 'Selected ordered retained callback registry; actual source callbacks execute on explicit disposal. Native CRT encoding/locks/process termination are not reconstructed.',
                 'diagnostics': 'Selected platform window/file/socket observations. Native singleton fields, filter and callback storage are not substitute no-ops.'},
             'scope': 'Cold original module image and byte-checked source methods. Admitted method receipts do not claim every native branch is implemented.'}
    count = sum(len(method['instructions']) for method in methods)
    unique_addresses = {row['va'] for method in methods for row in method['instructions']}
    # Include imported service references from the assembly-only callbacks as
    # well as catalog methods. A callback's DeleteCriticalSection is a real
    # shutdown dependency even where the saved reconstructed C is absent.
    all_instructions = '\n'.join(row['instruction'] for method in methods for row in method['instructions'])
    used_imports = [row for row in pe.imports() if row['iatVA'] in all_instructions]
    evidence = {'schema': 'gothic3-runtime-admin-evidence-v1', 'inputs': {'SharedBase': INPUT_SHA},
        'sourceRoot': '<LOCAL_DESKTOP_STUDY>', 'functionsCsvSha256': audit['functionsCsvSha256'],
        'assemblySha256': audit['assemblySha256'], 'methods': methods, 'imports': used_imports,
        'coldGlobals': cold, 'pointerTables': tables, 'constStrings': strings, 'constWords': const_words,
        'audit': {'methodCount': len(methods), 'instructionCount': count,
                  'uniqueInstructionCount': len(unique_addresses), 'byteMismatchCount': 0,
                  'nativeCodeExecuted': False}}
    OUT.mkdir(parents=True, exist_ok=True)
    output_receipts = {}
    prior = prior_startup(study)
    for filename, document in [('runtime-rules.json', rules), ('native-evidence.json', evidence),
                               ('prior-startup-allocations.json', prior)]:
        raw = json_bytes(document); (OUT / filename).write_bytes(raw)
        output_receipts[filename] = {'path': filename, 'bytes': len(raw), 'sha256': sha(raw)}
    manifest = {'schema': 'gothic3-runtime-admin-manifest-v1', 'inputs': {'SharedBase': INPUT_SHA},
                'outputs': output_receipts, 'audit': evidence['audit'], 'priorStartupAudit': prior['audit']}
    (OUT / 'manifest.json').write_bytes(json_bytes(manifest))
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(prepare(args.study)))


if __name__ == '__main__':
    main()
