"""Freeze entity reading, physical clock, Hero states and processing evidence.

Checks local source/Git hashes and offline receipts. Does not run tests, native
code, a build, a browser or remote actions. Prior receipts remain historical.
"""
from __future__ import annotations

import hashlib
import json
import subprocess

from freeze_session_checkpoint import ROOT, file_path, read, record, require, verify
from freeze_lifecycle_checkpoint import audit, verify_receipt_records

BASE = '08cf0580a0ef02ad3bef43e3f6f8601d35d62f2a'
BASE_RECEIPT = 'assets/gothic3/lifecycle-checkpoint.json'
BASE_RECEIPT_SHA256 = '8efbdc00ba4b13551dfb12f8a231edc4afdf8ecdc7c780afc94da8c14c9e9f6d'
OUTPUT = 'assets/gothic3/processing-checkpoint.json'
NAMESPACES = ('entity-reading', 'clock-properties', 'player-state', 'application-process')
UPDATED = {'.gitattributes', 'docs/README.md', 'docs/engineering/gothic3-rebuilding-process.md',
           'src/gothic3/world-clock.ts', 'src/gothic3/routine-scripts.ts',
           'src/gothic3/session-runtime.ts'}


def historical_records(paths):
    paths = sorted(set(paths))
    request = ''.join(BASE + ':' + p + '\n' for p in paths).encode('utf8')
    raw = subprocess.run(['git', 'cat-file', '--batch'], input=request, cwd=ROOT,
                         check=True, capture_output=True).stdout
    records, offset = {}, 0
    for path in paths:
        end = raw.index(b'\n', offset)
        header = raw[offset:end].split()
        require(len(header) == 3 and header[1] == b'blob', 'Historical blob missing: ' + path)
        size = int(header[2])
        data = raw[end + 1:end + 1 + size]
        offset = end + 1 + size
        require(len(data) == size and raw[offset:offset + 1] == b'\n', 'Incomplete Git blob')
        offset += 1
        records[path] = {'path': path, 'bytes': size, 'sha256': hashlib.sha256(data).hexdigest()}
    require(offset == len(raw), 'Extra Git batch output')
    return records


def audit_namespace(namespace):
    if namespace != 'player-state':
        return audit(namespace)
    evidence = read('assets/gothic3/player-state/native-evidence.json')
    instructions = [r for rows in evidence['instructions'].values() for r in rows]
    assembly_only = 0
    for function in evidence['functions']:
        verify('assets/gothic3/player-state/' + function['assemblyExcerpt'],
               {'sha256': function['assemblyExcerptSha256']})
        if 'cExcerpt' in function:
            verify('assets/gothic3/player-state/' + function['cExcerpt'],
                   {'sha256': function['cExcerptSha256']})
        else:
            require(function['id'] == 'Script_Game:1009a660' and
                    function['catalogStatus'] == 'absent from functions.csv; no decompiled C claim' and
                    function['bodyRanges'] == '1009a660-1009aba2',
                    'Unexpected assembly-only body')
            assembly_only += 1
        require(function.get('allInstructionBytesMatchOriginalPE') is True,
                'Incomplete original-byte audit: ' + function['id'])
    require(assembly_only == 1 and evidence['nativeCodeExecuted'] is False and
            evidence['testsRun'] is False, 'Player evidence scope differs')
    return {'entries': len(evidence['functions']), 'instructions': len(instructions),
            'originalInstructionBytes': sum(len(bytes.fromhex(r['bytes'])) for r in instructions),
            'assemblyOnlyEntries': assembly_only,
            'sourceExcerptHashesVerifiedByThisTool': True,
            'originalPEByteComparisonPerformedByThisTool': False}


def main():
    subprocess.run(['git', 'merge-base', '--is-ancestor', BASE, 'HEAD'], cwd=ROOT,
                   check=True, capture_output=True)
    base_bytes = subprocess.check_output(['git', 'show', BASE + ':' + BASE_RECEIPT], cwd=ROOT)
    require(hashlib.sha256(base_bytes).hexdigest() == BASE_RECEIPT_SHA256,
            'Historical lifecycle receipt changed')
    verify(BASE_RECEIPT, {'sha256': BASE_RECEIPT_SHA256})
    baseline = json.loads(base_bytes)
    old = historical_records({item['path'] for item in baseline['files']} | UPDATED)
    retained = 0
    for item in baseline['files']:
        require(old[item['path']] == item, 'Historical receipt/Git mismatch: ' + item['path'])
        if item['path'] not in UPDATED:
            verify(item['path'], item)
            retained += 1
    files = {item['path'] for item in baseline['files']} | UPDATED | {BASE_RECEIPT}
    audits, receipts = {}, {}
    for namespace in NAMESPACES:
        audits[namespace] = audit_namespace(namespace)
        implementation = 'src/gothic3/' + namespace + '.ts'
        producer = 'tools/gothic3/research_' + namespace.replace('-', '_') + '.py'
        files.update((implementation, producer))
        for category in ('assets', 'public'):
            directory = file_path(category + '/gothic3/' + namespace)
            require(directory.is_dir(), 'Namespace directory missing: ' + str(directory))
            files.update(p.relative_to(ROOT).as_posix() for p in directory.rglob('*') if p.is_file())
        candidates = [p for p in file_path('assets/gothic3/' + namespace).glob('*.json')
                      if p.name in ('implementation-receipt.json', 'output-receipt.json', 'final-audit.json')]
        require(candidates, 'Implementation receipt missing: ' + namespace)
        pins = set()
        for path in candidates:
            relative = path.relative_to(ROOT).as_posix()
            pins.update(verify_receipt_records(read(relative)))
            receipts[relative] = record(relative)
        require(implementation in pins and producer in pins,
                'Current implementation/producer not pinned: ' + namespace)
        files.update(pins)
    files.update(('src/gothic3/entity-setters.ts', 'tools/gothic3/freeze_processing_checkpoint.py'))
    require(OUTPUT not in files, 'Checkpoint cannot hash itself')
    records = [record(path) for path in sorted(files)]
    result = {
        'schema': 'gothic3-runtime-processing-checkpoint-v1', 'baseCommit': BASE,
        'scope': 'base-entity-read-setters-physical-clock-hero-input-script-prefixes-render-tail-timing-entity-processing',
        'gameplayReady': False,
        'baseline': {'receiptPath': BASE_RECEIPT, 'receiptSha256': BASE_RECEIPT_SHA256,
                     'retainedFilesVerified': retained,
                     'intentionalChanges': [{'before': old[p], 'after': record(p)} for p in sorted(UPDATED)],
                     'historicalReceiptsRemainAtTheirRecordedCommits': True},
        'auditsFromOfflineResearch': audits,
        'currentReceipts': receipts,
        'checksPerformedByThisTool': ['base ancestry and Git blob/hash comparison',
            'unchanged baseline file bytes', 'current implementation/producer receipt pins',
            'original C/assembly excerpt hashes', 'current complete file list/bytes/SHA256'],
        'validationNotPerformedByThisTool': ['fresh original PE byte comparison', 'typecheck',
            'production build', 'tests', 'browser review', 'native execution', 'deployment', 'playthrough'],
        'nativeCodeExecutedByThisTool': False, 'testsExecutedByThisTool': False,
        'publicationIntent': {'kind': 'source-only-checkpoint',
            'branch': 'codex/gothic3-gameplay-initialization', 'remoteActionsPerformedByThisTool': False},
        'remaining': ['complete reflective class construction/property reads/dynamic-spatial wrappers/template patching',
            'actual world-context activation, cache/physics residency and processing-range/PVS updates',
            'concrete browser application host and successful render-tail/scheduling integration',
            'physical movement/contact, animation, focus and remaining player/AI states',
            'combat/equipment/spells/dialogue/quest/enclave/save restoration integration',
            'online full original-game playthrough including endings'],
        'files': records,
        'publicBytes': sum(r['bytes'] for r in records if r['path'].startswith('public/')),
    }
    file_path(OUTPUT).write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf8', newline='\n')
    print({'files': len(records), 'retainedBaselineFiles': retained,
           'publicBytes': result['publicBytes'], 'receiptSha256': record(OUTPUT)['sha256']})


if __name__ == '__main__':
    main()
