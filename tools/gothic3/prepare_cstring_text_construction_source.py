"""Produce offline original-PE receipts for fresh CString text construction.

Reconstructed C is explanatory; byte-checked original assembly is authoritative.
This producer executes no native code and captures no live process state.
"""
# SPDX-License-Identifier: GPL-3.0-only
from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import sys
from pathlib import Path

import read_dialogue_native_evidence as native
from prepare_runtime_admin_source import image_bytes, source_excerpt
from prepare_crt_undname_source import encode, verify_extents

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/gothic3/cstring-text-construction'
INPUT_SHA = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'
NORMALIZATION = 'rstrip-line-whitespace; LF line endings; final newline'
TARGETS = {
    'textConstructor': 0x10003ba7,
    'alloc': 0x10007d65,
    'memcpy': 0x100a7a00,
    'strstr': 0x100a7430,
    'strchr': 0x100a7300,
    'classNameUnMangle': 0x100088cd,
}
EXPECTED_METHODS = {
    'textConstructor': (0x100135f0, 42, 91, '1bb0b6450709549da4589f055cb6f9780becea05ea8cefcd75e37701a22d0be5'),
    'alloc': (0x10013240, 23, 57, 'dc8a43b75e1dccffc84e53f09fff8d1d25e6ce0e0485cfa4722de0f09887fd04'),
    'memcpy': (0x100a7a00, 247, 711, 'ada0fafd69940490a3c1ac706772420ce32760254cc28aff588c401ed09f1c44'),
    'strstr': (0x100a7430, 66, 134, 'b9ed1ff8cb9f134bc493b1a93c251e88d6279640f682edaddb28ee2a7bbe6fa9'),
    'strchr': (0x100a7300, 89, 195, '22f27502570ab4aa937590c5aebf8c378db90379f04e561945d1db27bff36e8e'),
    'classNameUnMangle': (0x10091550, 23, 62, 'c639bbe65ad604674090c003628ac46ba8914554f1b413c41e6285ceffccd134'),
}
TABLES = {
    'memcpyForwardAlignment': (0x100a7a8c, [0x100a7a98, 0x100a7ac4, 0x100a7ae8]),
    'memcpyForwardDwordCount': (0x100a7b08, [0x100a7b6b, 0x100a7b58, 0x100a7b50, 0x100a7b48,
                                        0x100a7b40, 0x100a7b38, 0x100a7b30, 0x100a7b28]),
    'memcpyForwardRemainder': (0x100a7b74, [0x100a7b84, 0x100a7b8c, 0x100a7b98, 0x100a7bac]),
    'memcpyBackwardAlignment': (0x100a7c18, [0x100a7c24, 0x100a7c48, 0x100a7c70]),
    'memcpyBackwardDwordCount': (0x100a7ca4, [0x100a7cc4, 0x100a7ccc, 0x100a7cd4, 0x100a7cdc,
                                         0x100a7ce4, 0x100a7cec, 0x100a7cf4, 0x100a7d07]),
    'memcpyBackwardRemainder': (0x100a7d10, [0x100a7d20, 0x100a7d28, 0x100a7d38, 0x100a7d4c]),
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def emit_assembly(method: dict, filename: str) -> tuple[str, str]:
    path = OUT / 'sources/SharedBase' / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction']
                             for row in method['instructions']) + '\n', encoding='utf8', newline='\n')
    return path.relative_to(OUT).as_posix(), digest(path.read_bytes())


def emit_method(study: Path, method: dict) -> dict:
    address = method['bodyVA'][2:]
    asm_path, asm_sha = emit_assembly(method, address + '.asm.txt')
    c_path = OUT / 'sources/SharedBase' / (address + '.c.txt')
    normalized = '\n'.join(line.rstrip() for line in source_excerpt(study, method).splitlines()) + '\n'
    c_path.write_text(normalized, encoding='utf8', newline='\n')
    method['sourceRefs'] = dict(assembly=asm_path, assemblySha256=asm_sha,
        c=c_path.relative_to(OUT).as_posix(), cSha256=digest(c_path.read_bytes()),
        cNormalization=NORMALIZATION)
    return dict(module='SharedBase', entry=method['entryVA'][2:], body=address,
        bodyRanges=method['bodyRanges'], instructionCount=method['instructionCount'],
        bodyBytes=method['bodyByteCount'], bodyInstructionBytesSha256=method['bodyInstructionBytesSha256'],
        entryChain=method['entryChain'], sourceRefs=method['sourceRefs'])


def emit_data(pe: native.PE, label: str, address: int, size: int, *, cold: bool = False) -> dict:
    raw, section = image_bytes(pe, address, size)
    require(cold or section['loaderZeroFillBytes'] == 0, 'Constant data must be file-backed: ' + label)
    path = OUT / 'data' / (label + '.hex.txt')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(raw.hex() + '\n', encoding='ascii', newline='\n')
    return dict(module='SharedBase', address=f'{address:08x}', bytes=size, raw=raw.hex(),
        knownMask='ff' * size, sha256=digest(raw), section=section,
        sourceRefs=dict(hex=path.relative_to(OUT).as_posix(), hexSha256=digest(path.read_bytes())),
        scope='cold-original-image' if cold else 'original-file-backed-constant', liveValueCaptured=False)


def prepare(study: Path) -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    data = (study / '00_Original_Runtime/SharedBase.dll').read_bytes()
    require(digest(data) == INPUT_SHA, 'Original SharedBase.dll differs')
    native.EXPECTED_INPUTS['SharedBase.dll'] = INPUT_SHA
    pe = native.PE(data)
    audit = native.audit_module(study, 'SharedBase_dll', 'SharedBase.dll',
                                {value: key for key, value in TARGETS.items()})
    methods = {}
    for method in audit['methods']:
        verify_extents(pe, method)
        if method['label'] in EXPECTED_METHODS:
            body, count, size, sha = EXPECTED_METHODS[method['label']]
            require((int(method['bodyVA'], 16), method['instructionCount'], method['bodyByteCount'],
                     method['bodyInstructionBytesSha256']) == (body, count, size, sha),
                    'Selected method receipt differs: ' + method['label'])
        methods[method['label']] = emit_method(study, method)
    by_name = {method['label']: method for method in audit['methods']}
    strchr = by_name['strchr']
    ranges = '100a72f0-100a72f4;100a7306-100a73bd'
    intervals = [(int(a, 16), int(b, 16)) for a, b in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})', ranges)]
    rows = [row for row in strchr['instructions']
            if any(start <= int(row['va'], 16) <= end for start, end in intervals)]
    raw = b''.join(bytes.fromhex(row['bytes']) for row in rows)
    tail = dict(label='strchrAlignedTail', entryVA='0x100a7306', bodyVA='0x100a7306',
        bodyRanges=ranges, entryChain=[], instructions=rows, instructionCount=len(rows),
        bodyByteCount=len(raw), bodyInstructionBytesSha256=digest(raw),
        derivedFromMethod='strchr', derivedFromCatalogBody='100a7300',
        sourceSelection='Exact instruction subset of the audited strchr CSV body; no separate CSV row')
    require((len(rows), len(raw), digest(raw)) == (87, 189,
        '677282408ab09f5808d244ec6d645e674231066e023bdbd8cec4afff86fca318'), 'strchr tail differs')
    verify_extents(pe, tail)
    asm_path, asm_sha = emit_assembly(tail, '100a7306.derived.asm.txt')
    tail['sourceRefs'] = dict(assembly=asm_path, assemblySha256=asm_sha,
        parentC=strchr['sourceRefs']['c'], parentCSha256=strchr['sourceRefs']['cSha256'],
        parentReconstructedC=strchr['reconstructedC'])
    derived_entries = dict(strchrAlignedTail=dict(module='SharedBase', entry='100a7306', body='100a7306',
        bodyRanges=ranges, instructionCount=len(rows), bodyBytes=len(raw),
        bodyInstructionBytesSha256=digest(raw), derivedFromMethod='strchr',
        derivedFromCatalogBody='100a7300', sourceSelection=tail['sourceSelection'], sourceRefs=tail['sourceRefs']))
    strstr_rows = {int(row['va'], 16): row for row in by_name['strstr']['instructions']}
    require(strstr_rows[0x100a74a4]['bytes'] == 'e95dfeffff' and
            strstr_rows[0x100a74a4]['instruction'] == 'JMP 0x100a7306', 'strstr tail dispatch differs')
    tables = {}
    memcpy_addresses = {int(row['va'], 16) for row in by_name['memcpy']['instructions']}
    for label, (address, expected_targets) in TABLES.items():
        table = emit_data(pe, label, address, len(expected_targets) * 4)
        actual_targets = list(struct.unpack('<' + 'I' * len(expected_targets), bytes.fromhex(table['raw'])))
        require(actual_targets == expected_targets, 'Reachable memcpy jump table differs: ' + label)
        require(all(target in memcpy_addresses for target in actual_targets),
                'Reachable memcpy table target is not an audited instruction: ' + label)
        table.update(elementBytes=4, targets=[f'{target:08x}' for target in actual_targets],
                     allTargetsWithinAuditedMemcpy=True)
        if label.endswith('Alignment'):
            table.update(dispatchBase=f'{address - 4:08x}', firstIndex=1, lastIndex=3)
        elif label == 'memcpyBackwardDwordCount':
            table.update(dispatchBase='100a7cc0', firstIndex=-7, lastIndex=0)
        else:
            table.update(dispatchBase=f'{address:08x}', firstIndex=0, lastIndex=len(actual_targets) - 1)
        tables[label] = table
    space = emit_data(pe, 'spaceLiteral', 0x100e6f44, 2)
    require(space['raw'] == '2000' and space['sha256'] ==
            '869f1dfb999a452f497a4cf7f44db2d6ee661f74a9e7e05251bc1420e50672d4', 'Space literal differs')
    un_mangle_rows = {int(row['va'], 16): row for row in by_name['classNameUnMangle']['instructions']}
    require(un_mangle_rows[0x10091555]['bytes'] == '68446f0e10', 'UnMangle literal operand differs')
    vector_flag = emit_data(pe, 'vectorCopyEnabled', 0x102f854c, 4, cold=True)
    require(vector_flag['raw'] == '00000000', 'Expected cold vector flag differs')
    audit_summary = dict(selectedMethods=len(methods),
        instructions=sum(method['instructionCount'] for method in audit['methods']),
        derivedEntries=len(derived_entries), derivedInstructionsAlreadyIncludedInSelectedMethods=len(rows),
        reachableJumpTables=len(tables), reachableJumpTargets=sum(len(row['targets']) for row in tables.values()),
        allSelectedInstructionBytesMatchOriginalPE=True, completeSelectedBodyExtents=True,
        allReachableJumpTableTargetsWithinAuditedMemcpy=True,
        sourceExcerptNormalization=NORMALIZATION, nativeCodeExecuted=False, liveProcessStateCaptured=False)
    rules = dict(schema='gothic3-cstring-text-construction-rules-v1', inputs=dict(SharedBase=INPUT_SHA),
        methods=methods, derivedEntries=derived_entries, tables=tables,
        constBytes=dict(spaceLiteral=space), coldGlobals=dict(vectorCopyEnabled=vector_flag),
        tableSelectionNotes=[
            'Alignment index zero at 100a7a88 and 100a7c14 overlaps instructions and is unreachable; excluded.',
            'Backward DWORD dispatch uses base 100a7cc0 and negated count; recorded reachable slots are 100a7ca4..100a7cc0.',
        ],
        profile='Original source algorithms; live allocator-owned pointer geometry and lower services required',
        gaps=['No native execution or process-state capture',
              'Copy sizes at least 256 require an owned live vector flag and may enter unowned vector code 100b4c1a',
              'Source receipts do not establish runtime allocation capacity, alignment, native address order or lifetimes',
              'Full SharedBase/Engine/Game startup and actual module class-name/type owners remain separate'])
    evidence = dict(schema='gothic3-cstring-text-construction-evidence-v1', audit=audit_summary,
        modules=dict(SharedBase=audit), derivedEntries=dict(strchrAlignedTail=tail),
        tables=tables, constBytes=dict(spaceLiteral=space), coldGlobals=dict(vectorCopyEnabled=vector_flag))
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
    manifest = dict(schema='gothic3-cstring-text-construction-source-manifest-v1', audit=audit_summary,
        checksActuallyPerformed=['Offline original DLL/CSV/assembly SHA and complete selected instruction/extents audit',
                                'Offline reachable memcpy jump-table data/targets and exact space literal audit'],
        noTestsOrBuildRunByProducer=True, manifestSelfReferenceExcluded=True,
        files=[dict(path=file.relative_to(ROOT).as_posix(), bytes=file.stat().st_size,
                    sha256=digest(file.read_bytes())) for file in sorted(set(files))])
    (OUT / 'source-manifest.json').write_bytes(encode(manifest))
    return audit_summary


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.study.resolve())))
