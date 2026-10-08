"""Capture original SharedBase CRT startup dependencies without executing native code."""
import argparse
import hashlib
import json
from pathlib import Path
import read_dialogue_native_evidence as native
from prepare_runtime_admin_source import INPUT_SHA, image_bytes, source_excerpt

def capture(study, output):
    native.EXPECTED_INPUTS['SharedBase.dll'] = INPUT_SHA
    audit = native.audit_module(study, 'SharedBase_dll', 'SharedBase.dll',
                               {0x100bbf27:'initCritSecAndSpinCount', 0x100bbf17:'initCritSecFallback',
                                0x100bb74d:'mtDeleteLocks', 0x100ae2f2:'decodeThreadPointer', 0x100ae2e9:'encodedNull', 0x100ae20f:'pointerEncodingAvailable',
                                0x100bbfec:'setPointer6ac4', 0x100bbf0d:'setPointer6ac0',
                                0x100ae094:'setPointer64a0', 0x100b10cc:'setPointer690c',
                                0x100bbdff:'setPointer6abc', 0x100bb90b:'initSignalPointers',
                                0x100ae9bb:'initPointersNoop', 0x100b025a:'initEhHooks',
                                0x100b01d7:'terminate', 0x100aa7b7:'exit', 0x100aa49d:'getOsPlatform', 0x100aa54c:'getWinMajor', 0x100add1b:'dllEntry', 0x100ada4c:'crtAttach', 0x100adc25:'dllMainCrtStartup',
                                0x100c0d95:'securityInitCookie', 0x100bc0ba:'heapInit',
                                0x100bc05f:'heapSelect', 0x100bc114:'heapTerm',
                                0x100ae6f0:'mtInit', 0x100ae3cf:'mtTerm',
                                0x100aa7e6:'initPointers', 0x100ae27b:'encodeThreadPointer',
                                0x100bb704:'mtInitLocks', 0x100ae55a:'freeThreadData',
                                0x100b19be:'addLocaleRef'})
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
    pe = native.PE((study / '00_Original_Runtime/SharedBase.dll').read_bytes())
    fallback = pe.bytes(0x100ae360,9)
    assert fallback.hex() == 'ff15bc972f10c20400'
    section_filter = pe.bytes(0x100bbfad,23)
    section_handler = pe.bytes(0x100bbfc4,24)
    section_scope = pe.bytes(0x100f8d18,28)
    assert section_filter.hex() == '8b45ec8b008b008945dc33c93d170000c00f94c18bc1c3'
    assert section_handler.hex() == '8b65e8817ddc170000c075086a08ff157c972f108365e000'
    assert section_scope.hex() == 'feffffff00000000ccffffff00000000feffffffadbf0b10c4bf0b10'
    section_exception = {label:{'address':f'{address:08x}', 'raw':raw.hex(), 'sha256':hashlib.sha256(raw).hexdigest()}
                         for label,address,raw in [('filter',0x100bbfad,section_filter),('handler',0x100bbfc4,section_handler),('scopeTable',0x100f8d18,section_scope)]}
    cold = {}
    for label,address,size in [('securityCookie',0x10140d6c,4), ('securityCookieComplement',0x10140d70,4), ('tlsGetterIndex',0x10140b48,4),
                               ('threadDataIndex',0x10140b44,4), ('procedureSlots',0x102f64a4,16),
                               ('osFields',0x102f642c,20), ('heapHandle',0x102f6ac8,4), ('heapSelection',0x102f8530,4),
                               ('localePointer',0x10141468,4), ('multibytePointer',0x10141288,4),
                               ('threadLocaleMask',0x10141384,4), ('pointer6ac4',0x102f6ac4,4),
                               ('pointer6ac0',0x102f6ac0,4), ('pointer64a0',0x102f64a0,4),
                               ('pointer690c',0x102f690c,4), ('pointer6abc',0x102f6abc,4),
                               ('signalPointers',0x102f6aa8,16), ('ehHook',0x102f64b8,4),
                               ('exitPointer',0x10140a60,4), ('lockTable',0x101414b8,288),
                               ('staticSections',0x102f6958,336)]:
        raw, section = image_bytes(pe,address,size)
        cold[label] = {'address':f'{address:08x}', 'bytes':size, 'raw':raw.hex(),
                       'knownMask':'ff'*size, 'section':section,
                       'scope':'cold-original-image', 'liveValueCaptured':False}
    (output / 'source.json').write_bytes((json.dumps({'schema': 'gothic3-shared-crt-bootstrap-v1',
        'sharedBaseSha256': INPUT_SHA, 'methods': methods, 'coldGlobals':cold,
        'sectionException':section_exception,
        'tlsFallbackAllocator': {'address':'100ae360', 'raw':fallback.hex(), 'sha256':hashlib.sha256(fallback).hexdigest()},
        'sourceOnly': True, 'wholeCrtTraversalCompleted': False}, indent=2) + '\n').encode())

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    capture(args.study, args.output)
