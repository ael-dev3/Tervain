"""Freeze live startup, reflection, movement and animation source evidence.

Reads local Git/source hashes and offline receipts only. No tests, native code,
build, browser, deployment or remote action. Older receipts remain historical.
"""
from __future__ import annotations

import hashlib
import json
import subprocess

from freeze_session_checkpoint import ROOT, file_path, read, record, require, verify
from freeze_lifecycle_checkpoint import audit, verify_receipt_records

BASE = '48c7ee731e96a37cb332d881e912ec5279d5262f'
BASE_RECEIPT = 'assets/gothic3/processing-checkpoint.json'
BASE_RECEIPT_SHA256 = '20ba6f3b0a8d612a3c223db6680ad2b4e3c9ead57ed92e66a2f714dd2d07d299'
OUTPUT = 'assets/gothic3/activation-checkpoint.json'
NAMESPACES = ('startup-controller', 'entity-reflection', 'movement-state', 'animation-state')
UPDATED = {'.gitattributes', 'docs/engineering/gothic3-rebuilding-process.md',
           'src/gothic3/player-state.ts', 'src/gothic3/native-motion.ts'}


def audit_namespace(namespace):
    if namespace != 'movement-state':
        return audit(namespace)
    evidence = read('assets/gothic3/movement-state/native-evidence.json')
    instructions = [row for rows in evidence['instructions'].values() for row in rows]
    expected_assembly = {
        'Script_Game:100029f5': '100029f5-100029f9',
        'Script_Game:100d07c0': '100d07c0-100d0cad',
        'Script_Game:101720d0': '101720d0-10172121',
    }
    found_assembly = set()
    for function in evidence['functions']:
        verify('assets/gothic3/movement-state/' + function['assemblyExcerpt'],
               {'sha256': function['assemblyExcerptSha256']})
        if 'cExcerpt' in function:
            verify('assets/gothic3/movement-state/' + function['cExcerpt'],
                   {'sha256': function['cExcerptSha256']})
        else:
            require(expected_assembly.get(function['id']) == function['bodyRanges'] and
                    function['catalogStatus'] == 'absent from functions.csv; assembly-only, no C claim',
                    'Unexpected assembly-only movement body')
            require(function['id'] not in found_assembly, 'Duplicate assembly-only body')
            found_assembly.add(function['id'])
        require(function.get('allInstructionBytesMatchOriginalPE') is True,
                'Incomplete original-byte audit: ' + function['id'])
    require(found_assembly == set(expected_assembly) and evidence['nativeCodeExecuted'] is False and
            evidence['testsRun'] is False,
            'Movement evidence scope differs')
    return {'entries': len(evidence['functions']), 'instructions': len(instructions),
            'originalInstructionBytes': sum(len(bytes.fromhex(row['bytes'])) for row in instructions),
            'assemblyOnlyEntries': len(found_assembly),
            'sourceExcerptHashesVerifiedByThisTool': True,
            'originalPEByteComparisonPerformedByThisTool': False}


def historical_records(paths):
    paths = sorted(set(paths))
    request = ''.join(BASE + ':' + path + '\n' for path in paths).encode('utf8')
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


def main():
    subprocess.run(['git', 'merge-base', '--is-ancestor', BASE, 'HEAD'], cwd=ROOT,
                   check=True, capture_output=True)
    base_bytes = subprocess.check_output(['git', 'show', BASE + ':' + BASE_RECEIPT], cwd=ROOT)
    require(hashlib.sha256(base_bytes).hexdigest() == BASE_RECEIPT_SHA256,
            'Historical processing receipt changed')
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
            files.update(path.relative_to(ROOT).as_posix() for path in directory.rglob('*') if path.is_file())
        candidates = [path for path in file_path('assets/gothic3/' + namespace).glob('*.json')
                      if path.name in ('implementation-receipt.json', 'output-receipt.json', 'final-audit.json')]
        require(candidates, 'Implementation receipt missing: ' + namespace)
        pins = set()
        for path in candidates:
            relative = path.relative_to(ROOT).as_posix()
            pins.update(verify_receipt_records(read(relative)))
            receipts[relative] = record(relative)
        require(implementation in pins and producer in pins, 'Current source/producer not pinned: ' + namespace)
        files.update(pins)
    files.add('tools/gothic3/freeze_activation_checkpoint.py')
    require(OUTPUT not in files, 'Checkpoint cannot hash itself')
    records = [record(path) for path in sorted(files)]
    result = {
        'schema': 'gothic3-runtime-activation-checkpoint-v1', 'baseCommit': BASE,
        'scope': 'live-ordered-startup-callbacks-captured-reflection-objects-shared-movement-native-animation-descriptors',
        'gameplayReady': False,
        'baseline': {'receiptPath': BASE_RECEIPT, 'receiptSha256': BASE_RECEIPT_SHA256,
                     'retainedFilesVerified': retained,
                     'intentionalChanges': [{'before': old[path], 'after': record(path)} for path in sorted(UPDATED)],
                     'historicalReceiptsRemainAtTheirRecordedCommits': True},
        'auditsFromOfflineResearch': audits, 'currentReceipts': receipts,
        'checksPerformedByThisTool': ['base ancestry and historical Git blob/hash comparison',
            'unchanged baseline file bytes', 'current source/producer receipt pins',
            'C/assembly excerpt hashes', 'current complete file list/bytes/SHA256'],
        'validationNotPerformedByThisTool': ['fresh original PE byte comparison', 'typecheck', 'production build',
            'tests', 'browser review', 'native execution', 'deployment', 'playthrough'],
        'nativeCodeExecutedByThisTool': False, 'testsExecutedByThisTool': False,
        'publicationIntent': {'kind': 'source-only-checkpoint', 'branch': 'codex/gothic3-gameplay-initialization',
                              'remoteActionsPerformedByThisTool': False},
        'remaining': ['complete actual property factories/templates and class-specific reflective/native reads',
            'actual world activation/cache/physics/PVS/processing-range membership',
            'bind startup host to actual native wrapper/helper/navigation/enclave/quest/stat/inventory services',
            'complete native collision/rigidbody/contact services and VisualAnimation layer/blending processing',
            'bind one live browser application/session/render/input/script owner registry',
            'combat/equipment/spells/dialogue/quest/save restoration integration',
            'online full original-game progression and endings'],
        'files': records, 'publicBytes': sum(row['bytes'] for row in records if row['path'].startswith('public/')),
    }
    file_path(OUTPUT).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf8', newline='\n')
    print(json.dumps({'files': len(records), 'baselineRetained': retained,
                      'publicBytes': result['publicBytes'], 'audits': audits,
                      'sha256': record(OUTPUT)['sha256']}))


if __name__ == '__main__':
    main()
