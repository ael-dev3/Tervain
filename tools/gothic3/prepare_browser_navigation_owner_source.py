"""Audit the original application cache, area registry and Navigation notifications.

Offline receipts only. This never runs native code or treats source geometry as
a constructed resident. Platform module lookup remains an explicit boundary.
"""
# SPDX-License-Identifier: GPL-3.0-only
from __future__ import annotations
import argparse
import hashlib
import json
import sys
from pathlib import Path

import read_dialogue_native_evidence as native
from prepare_runtime_admin_source import source_excerpt, image_bytes
from prepare_crt_undname_source import encode, verify_extents

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/gothic3/browser-navigation-owner'
MODULES = {
    'Game': ('Game_dll', 'Game.dll', 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f', {
        'appGameRunning': 0x20002ecd, 'cachedSession': 0x200207de,
        'sessionGameRunning': 0x20023cef, 'zoneRegister': 0x20024d2f,
        'sessionInvalidate': 0x2002d510,
        'zoneDeregister': 0x200232c2, 'zoneOnAdded': 0x2002c5d9,
        'zoneOnRemoved': 0x20001898, 'zonePropertyType': 0x20008724,
        'navigationNotifyEnter': 0x200328bc, 'navigationNotifyExit': 0x2002bb11,
        'contactEnabled': 0x200218a0, 'scriptAdmin': 0x2001afbe,
        'zoneDccDeregister': 0x2000c630, 'zoneDccRegister': 0x20010f19,
        'pathDccDeregister': 0x2001e5fb, 'pathDccRegister': 0x20026bb6,
    }),
    'Engine': ('Engine_dll', 'Engine.dll', 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3', {
        'engineIsInitialized': 0x30025cd4, 'proxyGetEntity': 0x3001e8da,
        'proxySetEntityPointer': 0x30017e77, 'proxyConstructor': 0x3001d7b9,
        'proxyAssignment': 0x300021c1, 'proxyDestructor': 0x300150a5,
        'notifyEnter': 0x3003b5bb, 'notifyExit': 0x3001a091,
        'inheritedNotifyEnter': 0x3002ad10, 'inheritedNotifyExit': 0x30037ca4,
    }),
    'SharedBase': ('SharedBase_dll', 'SharedBase.dll', '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214', {
        'stringConstructor': 0x10003ba7, 'stringDestructor': 0x100060c3,
        'stringEqualsString': 0x10002eb9, 'stringEqualsChars': 0x10005ffb,
    }),
}
COLD = {
    'Game': {'sessionCache': (0x207b4d58, 8), 'scriptCache': (0x207b6028, 8),
             'contactMask': (0x207b8588, 8)},
    'Engine': {'engineInitialized': (0x30ad989c, 1)},
}

def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def prepare(study: Path) -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    audits, methods, cold = {}, {}, {}
    for short, (directory, binary, expected, targets) in MODULES.items():
        data = (study / '00_Original_Runtime' / binary).read_bytes()
        if digest(data) != expected:
            raise ValueError('Original module differs: ' + short)
        native.EXPECTED_INPUTS[binary] = expected
        pe = native.PE(data)
        audit = native.audit_module(study, directory, binary, {value: key for key, value in targets.items()})
        for method in audit['methods']:
            verify_extents(pe, method)
            destination = OUT / 'sources' / short
            destination.mkdir(parents=True, exist_ok=True)
            address = method['bodyVA'][2:]
            asm_path = destination / (address + '.asm.txt')
            asm_path.write_text('\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction']
                for row in method['instructions']) + '\n', encoding='utf8', newline='\n')
            c_path = destination / (address + '.c.txt')
            excerpt = source_excerpt(study, method)
            normalized_excerpt = '\n'.join(line.rstrip() for line in excerpt.splitlines()) + '\n'
            c_path.write_text(normalized_excerpt, encoding='utf8', newline='\n')
            method['sourceRefs'] = {
                'assembly': asm_path.relative_to(OUT).as_posix(), 'assemblySha256': digest(asm_path.read_bytes()),
                'c': c_path.relative_to(OUT).as_posix(), 'cSha256': digest(c_path.read_bytes()),
                'cNormalization': 'rstrip-line-whitespace; LF line endings; final newline',
            }
            methods[method['label']] = dict(module=short, entry=method['entryVA'][2:],
                body=method['bodyVA'][2:], bodyRanges=method['bodyRanges'],
                instructionCount=method['instructionCount'], bodyBytes=method['bodyByteCount'],
                bodyInstructionBytesSha256=method['bodyInstructionBytesSha256'],
                entryChain=method['entryChain'], sourceRefs=method['sourceRefs'])
        for label, (address, size) in COLD.get(short, {}).items():
            raw, section = image_bytes(pe, address, size)
            if any(raw):
                raise ValueError('Expected cold zero module storage differs: ' + label)
            cold[label] = dict(module=short, address=f'{address:08x}', bytes=size,
                raw=raw.hex(), knownMask='ff' * size, sha256=digest(raw), section=section,
                scope='cold-original-image', liveValueCaptured=False)
        audits[short] = audit
    instructions = sum(method['instructionCount'] for audit in audits.values() for method in audit['methods'])
    audit_summary = dict(selectedMethods=len(methods), instructions=instructions,
        allSelectedInstructionBytesMatchOriginalPE=True, completeSelectedBodyExtents=True,
        nativeCodeExecuted=False, liveProcessStateCaptured=False)
    rules = dict(schema='gothic3-browser-navigation-owner-rules-v1',
        inputs={short: item[2] for short, item in MODULES.items()}, methods=methods, coldGlobals=cold,
        profile='Original algorithms with explicit browser module bridge; actual constructed area admission required',
        gaps=['Full native module/application/session construction and shutdown',
              'Full NavZone/NavPath entity construction and reflective Read',
              'Original proxy/internal ownership, CString/contact/script services required by notification hosts'])
    evidence = dict(schema='gothic3-browser-navigation-owner-evidence-v1', audit=audit_summary, modules=audits)
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
    manifest = dict(schema='gothic3-browser-navigation-owner-source-manifest-v1', audit=audit_summary,
        checksActuallyPerformed=['Offline original PE SHA/instruction/extents/cold-storage audit',
                                'Offline CSV-mapped decompiler/assembly source audit'],
        noTestsOrBuildRunByProducer=True,
        files=[dict(path=file.relative_to(ROOT).as_posix(), bytes=file.stat().st_size,
                    sha256=digest(file.read_bytes())) for file in sorted(set(files))])
    (OUT / 'source-manifest.json').write_bytes(encode(manifest))
    return audit_summary

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.study.resolve())))
