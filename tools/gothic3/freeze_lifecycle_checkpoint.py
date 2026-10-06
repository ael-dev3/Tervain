"""Freeze current lifecycle/routine source without rewriting historical receipts.

Checks local Git object bytes, source hashes and offline evidence. Does not run
tests, native code, a build, a browser or remote actions.
"""
from __future__ import annotations

import hashlib
import json
import subprocess

from freeze_session_checkpoint import ROOT, file_path, read, record, require, verify

BASE = '2637d1eb83cf0814648151d812f6f8623aaa331d'
BASE_RECEIPT = 'assets/gothic3/dispatch-checkpoint.json'
BASE_RECEIPT_SHA256 = '4d5b02f406d1e690f1791541ff3a485ddcfeb45dcd53117a685d3c6173915f40'
OUTPUT = 'assets/gothic3/lifecycle-checkpoint.json'
NAMESPACES = ('entity-lifecycle', 'player-properties', 'routine-scripts', 'session-runtime')
UPDATED = {'.gitattributes', 'docs/engineering/gothic3-rebuilding-process.md',
           'src/gothic3/script-routine.ts', 'src/gothic3/native-properties.ts'}


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


def verify_receipt_records(value):
    """Verify current repo-qualified file pins in new receipts, never old ones."""
    verified = set()
    if isinstance(value, dict):
        if isinstance(value.get('path'), str) and value['path'].startswith(('assets/', 'public/', 'src/', 'tools/')) and 'sha256' in value:
            verify(value['path'], value)
            verified.add(value['path'])
        for child in value.values():
            verified.update(verify_receipt_records(child))
    elif isinstance(value, list):
        for child in value:
            verified.update(verify_receipt_records(child))
    return verified


def audit(namespace):
    evidence = read('assets/gothic3/' + namespace + '/native-evidence.json')
    instructions = [r for rows in evidence['instructions'].values() for r in rows]
    for function in evidence['functions']:
        for key in ('cExcerpt', 'assemblyExcerpt'):
            verify('assets/gothic3/' + namespace + '/' + function[key],
                   {'sha256': function[key + 'Sha256']})
        require(function.get('allInstructionBytesMatchOriginalPE',
                             function.get('allInstructionBytesMatch')) is True,
                'Incomplete instruction byte audit: ' + function['id'])
    declarations = [source[name] for source in (evidence, evidence.get('audit', {}))
                    for name in ('nativeCodeExecuted', 'nativeExecution', 'executedNativeCode')
                    if name in source]
    require(declarations and all(value is False for value in declarations),
            'Native execution scope is absent or changed')
    return {'entries': len(evidence['functions']), 'instructions': len(instructions),
            'originalInstructionBytes': sum(len(bytes.fromhex(r['bytes'])) for r in instructions),
            'sourceExcerptHashesVerifiedByThisTool': True,
            'originalPEByteComparisonPerformedByThisTool': False}


def main():
    subprocess.run(['git', 'merge-base', '--is-ancestor', BASE, 'HEAD'], cwd=ROOT,
                   check=True, capture_output=True)
    base_bytes = subprocess.check_output(['git', 'show', BASE + ':' + BASE_RECEIPT], cwd=ROOT)
    require(hashlib.sha256(base_bytes).hexdigest() == BASE_RECEIPT_SHA256,
            'Historical dispatch receipt changed')
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
        audits[namespace] = audit(namespace)
        implementation = 'src/gothic3/' + namespace + '.ts'
        producer = 'tools/gothic3/research_' + namespace.replace('-', '_') + '.py'
        files.update((implementation, producer))
        for category in ('assets', 'public'):
            directory = file_path(category + '/gothic3/' + namespace)
            require(directory.is_dir(), 'Namespace directory missing: ' + str(directory))
            files.update(p.relative_to(ROOT).as_posix() for p in directory.rglob('*') if p.is_file())
        candidates = [p for p in file_path('assets/gothic3/' + namespace).glob('*.json')
                      if p.name in ('implementation-receipt.json', 'output-receipt.json', 'final-audit.json')]
        require(len(candidates) >= 1, 'Implementation receipt missing: ' + namespace)
        pins = set()
        for path in candidates:
            relative = path.relative_to(ROOT).as_posix()
            pins.update(verify_receipt_records(read(relative)))
            receipts[relative] = record(relative)
        require(implementation in pins and producer in pins,
                'Current implementation/producer not pinned: ' + namespace)
    files.add('tools/gothic3/freeze_lifecycle_checkpoint.py')
    require(OUTPUT not in files, 'Checkpoint cannot hash itself')
    records = [record(path) for path in sorted(files)]
    result = {
        'schema': 'gothic3-runtime-lifecycle-checkpoint-v1', 'baseCommit': BASE,
        'scope': 'entity-property-lifecycle-player-storage-original-routine-prefixes-session-application-order',
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
        'remaining': ['complete original world/sector activation and reflective patching',
            'navigation full compile/binding and movement/contact/physics',
            'concrete browser engine host for original startup/routine/HUD subcalls',
            'remaining AI/player states, animations, equipment and spells',
            'integrated combat/dialogue/quests/enclaves/save restoration',
            'online full original-game playthrough including endings'],
        'files': records,
        'publicBytes': sum(r['bytes'] for r in records if r['path'].startswith('public/')),
    }
    file_path(OUTPUT).write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf8', newline='\n')
    print({'files': len(records), 'retainedBaselineFiles': retained,
           'publicBytes': result['publicBytes'], 'receiptSha256': record(OUTPUT)['sha256']})


if __name__ == '__main__':
    main()
