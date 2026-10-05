"""Freeze shared animation instructions and physical Hero property readers.

Reads historical Git blobs, local source hashes and offline evidence only.
Does not execute native code, tests, a build, a browser or remote actions.
Older receipts remain historical at their recorded source commits.
"""
from __future__ import annotations

import hashlib
import json
import subprocess

from freeze_session_checkpoint import ROOT, file_path, read, record, require, verify
from freeze_lifecycle_checkpoint import audit, verify_receipt_records

BASE = '4252aa9a8ebeb754ba3676dd356df3483122a5ca'
BASE_RECEIPT = 'assets/gothic3/activation-checkpoint.json'
BASE_RECEIPT_SHA256 = '3dc900777fe99de0c52d36b3a812f36c4b51e80730357d9fdd4956557112ca8a'
OUTPUT = 'assets/gothic3/actor-reading-checkpoint.json'
NAMESPACES = ('animation-spu', 'animation-instruction', 'navigation-reading', 'movement-reading')
UPDATED = {'.gitattributes', 'docs/engineering/gothic3-rebuilding-process.md',
           'src/gothic3/animation-state.ts', 'src/gothic3/entity-reflection.ts',
           'src/gothic3/movement-state.ts', 'src/gothic3/player-state.ts',
           'src/gothic3/script-routine.ts', 'src/gothic3/script-instructions.ts'}


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


def audit_namespace(namespace):
    evidence = read('assets/gothic3/' + namespace + '/native-evidence.json')
    identities = [function['id'] for function in evidence['functions']]
    require(len(set(identities)) == len(identities) and
            set(identities) == set(evidence['instructions']),
            'Selected function/instruction identities differ: ' + namespace)
    for function in evidence['functions']:
        rows = evidence['instructions'][function['id']]
        require(len(rows) == function['instructionCount'] and
                sum(len(bytes.fromhex(row['bytes'])) for row in rows) == function['instructionBytes'],
                'Selected instruction metadata differs: ' + function['id'])
    result = audit(namespace)
    result['uniqueFunctionAndInstructionMetadataVerifiedByThisTool'] = True
    return result


def main():
    subprocess.run(['git', 'merge-base', '--is-ancestor', BASE, 'HEAD'], cwd=ROOT,
                   check=True, capture_output=True)
    base_bytes = subprocess.check_output(['git', 'show', BASE + ':' + BASE_RECEIPT], cwd=ROOT)
    require(hashlib.sha256(base_bytes).hexdigest() == BASE_RECEIPT_SHA256,
            'Historical activation receipt changed')
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
    files.add('tools/gothic3/freeze_actor_checkpoint.py')
    require(OUTPUT not in files, 'Checkpoint cannot hash itself')
    records = [record(path) for path in sorted(files)]
    result = {
        'schema': 'gothic3-runtime-actor-reading-checkpoint-v1', 'baseCommit': BASE,
        'scope': 'same-SPU-animation-instruction-storage-and-physical-Hero-Navigation-CharacterMovement-readers',
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
        'remaining': ['complete the intervening Hero RigidBody and CollisionShape factories and all nineteen property sets',
            'actual world activation/cache/physics/PVS/processing-range membership and property lifecycle',
            'bind startup host to actual native wrapper/helper/navigation/enclave/quest/stat/inventory services',
            'actual GUID/application/effect-module services and actor/layer/resource-cache ownership',
            'complete native collision/rigidbody/contact services and animation blending processing',
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
