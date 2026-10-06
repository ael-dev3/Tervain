"""Verify source receipts and freeze the next Gothic 3 runtime checkpoint.

Reads historical Git objects, current files and offline research receipts.
Does not execute native code, tests, a build, a browser or remote actions.
"""
from __future__ import annotations

import gzip
import hashlib
import json
import subprocess

from freeze_session_checkpoint import ROOT, file_path, record, verify, read, require

BASE = '864422dbcbb8daea87516b8154e8a63cf661c320'
BASE_RECEIPT = 'assets/gothic3/session-checkpoint.json'
BASE_RECEIPT_SHA256 = '9de721d32dc96fc14f200c23bd633b7d2832bbfbb051c6cf7cb6fcdefdc58648'
OUTPUT = 'assets/gothic3/dispatch-checkpoint.json'
NAMESPACES = ('properties', 'hud', 'instructions', 'navigation-scene')
UPDATED = {'.gitattributes', 'docs/engineering/gothic3-rebuilding-process.md',
           'src/gothic3/script-routine.ts', 'src/gothic3/resource.ts'}
IMPLEMENTATIONS = ('native-properties', 'hud-runtime', 'script-instructions', 'navigation-scene')
PRODUCERS = ('research_native_properties', 'research_native_hud',
             'research_spu_instructions', 'research_navigation_scene')
HISTORICAL = {}


def git_bytes(relative):
    return subprocess.check_output(['git', 'show', BASE + ':' + relative], cwd=ROOT)


def historical_record(relative):
    return HISTORICAL[relative]


def load_historical_records(paths):
    paths = sorted(set(paths))
    requests = ''.join(BASE + ':' + p + '\n' for p in paths).encode('utf8')
    result = subprocess.run(['git', 'cat-file', '--batch'], input=requests,
                            cwd=ROOT, check=True, capture_output=True).stdout
    offset = 0
    for relative in paths:
        end = result.index(b'\n', offset)
        header = result[offset:end].split()
        require(len(header) == 3 and header[1] == b'blob',
                'Historical path is not a Git blob: ' + relative)
        size = int(header[2])
        data = result[end + 1:end + 1 + size]
        offset = end + 1 + size
        require(len(data) == size and result[offset:offset + 1] == b'\n',
                'Historical Git blob response is incomplete: ' + relative)
        offset += 1
        HISTORICAL[relative] = {'path': relative, 'bytes': size,
                                'sha256': hashlib.sha256(data).hexdigest()}
    require(offset == len(result), 'Unexpected historical Git batch bytes')


def native_evidence(namespace, filename):
    data = read('assets/gothic3/' + namespace + '/' + filename)
    rows = [r for values in data['instructions'].values() for r in values]
    for fn in data['functions']:
        for field in ('cExcerpt', 'assemblyExcerpt'):
            verify('assets/gothic3/' + namespace + '/' + fn[field],
                   {'sha256': fn[field + 'Sha256']})
        require(fn.get('allInstructionBytesMatch',
                       fn.get('allInstructionBytesMatchOriginalPE')) is True,
                'Offline instruction audit is not complete: ' + fn['entry'])
    require(data.get('nativeCodeExecuted', data.get('nativeExecution', False)) is False,
            'Evidence reports native execution: ' + namespace)
    return {'entries': len(data['functions']), 'instructions': len(rows),
            'matchedBytes': sum(len(bytes.fromhex(r['bytes'])) for r in rows),
            'sourceExcerptsHashVerifiedByThisTool': True,
            'originalPEByteComparisonPerformedByThisTool': False}


def verify_files(receipt):
    for item in receipt['files']:
        verify(item['path'], item)


def compressed_output(item):
    relative = 'public/gothic3/navigation-scene/' + item['path']
    verify(relative, item)
    data = gzip.decompress(file_path(relative).read_bytes())
    require(len(data) == item['uncompressedBytes'] and
            hashlib.sha256(data).hexdigest() == item['uncompressedSha256'],
            'Decoded navigation output differs: ' + relative)


def main():
    subprocess.run(['git', 'merge-base', '--is-ancestor', BASE, 'HEAD'],
                   cwd=ROOT, check=True, capture_output=True)
    baseline_bytes = git_bytes(BASE_RECEIPT)
    require(hashlib.sha256(baseline_bytes).hexdigest() == BASE_RECEIPT_SHA256,
            'Historical session receipt differs')
    verify(BASE_RECEIPT, {'sha256': BASE_RECEIPT_SHA256})
    baseline = json.loads(baseline_bytes)
    load_historical_records({item['path'] for item in baseline['files']} | UPDATED)
    retained = 0
    for item in baseline['files']:
        require(historical_record(item['path']) == item,
                'Historical session receipt differs from its Git object: ' + item['path'])
        if item['path'] not in UPDATED:
            verify(item['path'], item)
            retained += 1

    properties = read('assets/gothic3/properties/output-receipt.json')
    require(properties['nativeCodeExecuted'] is False, 'Property evidence scope differs')
    for key in ('runtime', 'producer', 'helper', 'publicRules'):
        verify(properties[key]['path'], properties[key])
    property_rules = read('assets/gothic3/properties/runtime-rules.json')
    verify('assets/gothic3/properties/' + property_rules['evidence']['path'], property_rules['evidence'])
    verify('public/gothic3/properties/runtime-rules.json',
           record('assets/gothic3/properties/runtime-rules.json'))

    hud = read('assets/gothic3/hud/implementation-receipt.json')
    require(hud['nativeCodeExecuted'] is False and
            hud['externalRegistryCompletenessProven'] is False,
            'HUD evidence scope differs')
    verify_files(hud)
    for key in ('implementation', 'producer'):
        verify(hud[key]['path'], hud[key])

    instructions = read('assets/gothic3/instructions/implementation-receipt.json')
    verify_files(instructions)

    navigation = read('public/gothic3/navigation-scene/final-audit.json')
    verify_files(navigation)
    nav_manifest = read('public/gothic3/navigation-scene/manifest.json')
    for key in ('queryMap', 'definitions', 'storedLists'):
        compressed_output(nav_manifest[key])
    require(nav_manifest['counts']['sourceEntities'] == 5385 and
            nav_manifest['counts']['unresolvedMapPropertyIds16'] == 0 and
            nav_manifest['counts']['duplicateGuidCandidates'] == 0,
            'Original stored-map entity source resolution differs')

    audits = {name: native_evidence(name, filename) for name, filename in (
        ('properties', 'native-evidence.json'), ('hud', 'native-evidence.json'),
        ('instructions', 'native-evidence.json'), ('navigation-scene', 'native-source-evidence.json'))}
    files = {item['path'] for item in baseline['files']} | {BASE_RECEIPT} | UPDATED
    files.update(item['path'] for receipt in (hud, instructions, navigation)
                 for item in receipt['files'])
    files.update(properties[key]['path'] for key in ('runtime', 'producer', 'helper', 'publicRules'))
    for namespace in NAMESPACES:
        for category in ('assets', 'public'):
            directory = file_path(category + '/gothic3/' + namespace)
            files.update(p.relative_to(ROOT).as_posix() for p in directory.rglob('*') if p.is_file())
    files.update('src/gothic3/' + name + '.ts' for name in IMPLEMENTATIONS)
    files.update('tools/gothic3/' + name + '.py' for name in PRODUCERS)
    files.add('tools/gothic3/freeze_dispatch_checkpoint.py')
    require(OUTPUT not in files, 'Checkpoint must exclude its own hash')
    records = [record(relative) for relative in sorted(files)]
    result = {
        'schema': 'gothic3-runtime-dispatch-checkpoint-v1',
        'baseCommit': BASE, 'gameplayReady': False,
        'scope': 'stored-navigation-queries-HUD-composition-property-notifications-SPU-process-and-WAIT',
        'baseline': {'receiptPath': BASE_RECEIPT, 'receiptSha256': BASE_RECEIPT_SHA256,
                     'retainedFilesVerified': retained,
                     'intentionalChanges': [{'before': historical_record(p), 'after': record(p)}
                                            for p in sorted(UPDATED)]},
        'auditsFromOfflineResearch': audits,
        'checksPerformedByThisTool': [
            'base ancestry and historical session receipt against original Git object bytes',
            'retained baseline file bytes and SHA256 hashes',
            'current implementation and producer receipt pins',
            'native C and assembly source excerpt hashes',
            'navigation compressed and decoded resource hashes',
            'stored navigation entity resolution counts',
            'current checkpoint file bytes and SHA256 hashes'],
        'validationNotPerformedByThisTool': [
            'fresh original PE byte comparison', 'typecheck', 'production build',
            'runtime tests', 'browser inspection', 'native game execution',
            'native visual or behavior equivalence', 'complete-game playthrough'],
        'nativeCodeExecutedByThisTool': False, 'testsExecutedByThisTool': False,
        'publicationIntent': {'kind': 'source-only-checkpoint',
                              'branch': 'codex/gothic3-gameplay-initialization',
                              'remoteActionsPerformedByThisTool': False},
        'remaining': ['full original session/entity and property-set lifecycles',
                      'navigation recompile, AIZone/door binding, sector/PVS and physics',
                      'concrete original script bodies, movement and full AI execution',
                      'complete external inventory observers and physical equipment effects',
                      'integrated combat, spells, dialogue, quests and enclave event chains',
                      'native save restoration and complete-game playthrough verification'],
        'files': records,
        'publicBytes': sum(item['bytes'] for item in records if item['path'].startswith('public/')),
    }
    file_path(OUTPUT).write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n',
                                 encoding='utf8', newline='\n')
    print({'files': len(records), 'retainedBaselineFiles': retained,
           'publicBytes': result['publicBytes'], 'receiptSha256': record(OUTPUT)['sha256']})


if __name__ == '__main__':
    main()
