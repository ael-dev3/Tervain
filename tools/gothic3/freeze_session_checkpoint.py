"""Verify frozen session foundations and record a source-only checkpoint.

Reads files, hashes and prior offline evidence only. This tool neither executes
native code nor runs tests, builds, browser checks or GitHub actions. It does not
publish a branch or certify a playable game. Run from the repository checkout.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = 'a2c3ce33c75060528ea3f3c36b3732939ee0b4f6'
BASE_RECEIPT = 'assets/gothic3/initialization-checkpoint.json'
BASE_RECEIPT_SHA256 = '2202c82560110a81bfc37eb42427f5556943e9a895a71c229c456c8814b317e3'
OUTPUT = 'assets/gothic3/session-checkpoint.json'
NAMESPACES = ('clock', 'navigation', 'inventory-observers', 'routines')


def file_path(relative):
    path = (ROOT / relative).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError('Receipt path leaves this repository: ' + str(relative))
    return path


def record(relative):
    path = file_path(relative)
    data = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest()}


def verify(relative, expected):
    actual = record(relative)
    if actual['sha256'] != expected['sha256'] or (
            'bytes' in expected and actual['bytes'] != expected['bytes']):
        raise ValueError('Frozen source/output changed: ' + actual['path'])
    return actual


def read(relative):
    return json.loads(file_path(relative).read_text(encoding='utf8'))


def require(value, message):
    if not value:
        raise ValueError(message)


def main():
    subprocess.run(['git', 'merge-base', '--is-ancestor', BASE, 'HEAD'],
                   cwd=ROOT, check=True, capture_output=True)
    baseline_bytes = subprocess.check_output(['git', 'show', BASE + ':' + BASE_RECEIPT], cwd=ROOT)
    require(hashlib.sha256(baseline_bytes).hexdigest() == BASE_RECEIPT_SHA256,
            'Historical initialization receipt differs at the recorded commit')
    verify(BASE_RECEIPT, {'sha256': BASE_RECEIPT_SHA256})
    baseline = json.loads(baseline_bytes)
    changed_baseline_inputs = {'.gitattributes', 'docs/engineering/gothic3-rebuilding-process.md'}
    retained = 0
    for item in baseline['files']:
        if item['path'] not in changed_baseline_inputs:
            verify(item['path'], item)
            retained += 1

    clock_path = 'assets/gothic3/clock/implementation-receipt.json'
    clock = read(clock_path)
    verify(clock_path, {'sha256': '0e9554512b5a072033a1f072d2eee661c7702717d59074e0feecfbf4d87cefa2'})
    for item in clock['files']:
        verify(item['path'], item)
    require(clock['nativeCodeExecuted'] is False and
            clock['audit']['allInstructionBytesMatchOriginalPE'] is True,
            'Clock offline evidence scope differs')
    clock_outputs = read('assets/gothic3/clock/output-receipt.json')
    for key in ('producer', 'helper', 'runtime'):
        item = clock_outputs[key]
        verify(item['path'], item)
    for item in clock_outputs['outputs']:
        verify('public/gothic3/clock/' + item['url'], item)

    navigation_path = 'assets/gothic3/navigation/manifest.json'
    navigation = read(navigation_path)
    final_navigation = read('assets/gothic3/navigation/final-audit.json')
    verify(navigation_path, {'sha256': final_navigation['manifestSha256']})
    require(final_navigation['nativeCodeExecuted'] is False and
            final_navigation['testsExecuted'] is False and
            navigation['audit']['allInstructionBytesMatchOriginalPE'] is True,
            'Navigation offline evidence scope differs')
    for item in navigation['assets']:
        verify('assets/gothic3/navigation/' + item['path'], item)
    for key in ('producer', 'receiptHelper', 'sharedReceiptHelper', 'runtime'):
        item = navigation[key]
        verify(item['path'], item)
    verify('src/gothic3/navigation-runtime.ts', {'sha256': final_navigation['runtimeSha256']})
    verify('tools/gothic3/research_native_navigation.py', {'sha256': final_navigation['producerSha256']})
    item = navigation['hostedRules']
    verify('public/gothic3/navigation/' + item['path'], item)
    verify('public/gothic3/navigation/manifest.json', record(navigation_path))
    actual_navigation_assets = {
        p.relative_to(file_path('assets/gothic3/navigation')).as_posix()
        for p in file_path('assets/gothic3/navigation').rglob('*') if p.is_file()
    }
    require(actual_navigation_assets == {item['path'] for item in navigation['assets']} |
            {'manifest.json', 'final-audit.json'}, 'Navigation namespace membership differs')

    observers_path = 'assets/gothic3/inventory-observers/implementation-receipt.json'
    observers = read(observers_path)
    verify(observers_path, {'sha256': '8f4fc5054675641ec5b2761b84f8ec06fe1424531521ee66b56fb60b262e294e'})
    require(observers['nativeCodeExecuted'] is False and observers['testsRun'] is False and
            observers['runtimeRegistryCompletenessProven'] is False,
            'Inventory observer evidence scope differs')
    for item in observers['files']:
        verify(item['path'], item)
    for key in ('implementation', 'producer'):
        item = observers[key]
        verify(item['path'], item)

    routines_path = 'assets/gothic3/routines/native-evidence.json'
    routines = read(routines_path)
    rules = read('assets/gothic3/routines/runtime-rules.json')
    verify('assets/gothic3/routines/' + rules['evidence']['path'], rules['evidence'])
    require(routines['audit']['allListedInstructionBytesMatchOriginalPE'] is True and
            routines['audit']['nativeCodeExecuted'] is False,
            'Routine offline evidence scope differs')
    for function in routines['functions']:
        for key in ('cExcerpt', 'assemblyExcerpt'):
            verify('assets/gothic3/routines/' + function[key],
                   {'sha256': function[key + 'Sha256']})
    instructions = [item for values in routines['instructions'].values() for item in values]
    require(len(routines['functions']) == routines['audit']['entries'] and
            len(instructions) == routines['audit']['instructions'] and
            sum(len(bytes.fromhex(item['bytes'])) for item in instructions) == routines['audit']['matchedBytes'],
            'Routine instruction/count receipt differs')
    require(routines['data']['fullStopSwitch']['bytes'] ==
            'daee3620e1ee3620e8ee3620efee3620f6ee3620fdee362004ef36200bef3620',
            'FullStop switch data differs')

    files = set()
    for namespace in NAMESPACES:
        for category in ('assets', 'public'):
            directory = file_path(category + '/gothic3/' + namespace)
            files.update(p.relative_to(ROOT).as_posix() for p in directory.rglob('*') if p.is_file())
    for data in (clock, observers):
        files.update(item['path'] for item in data['files'])
    files.update([
        '.gitattributes', 'docs/engineering/gothic3-rebuilding-process.md', BASE_RECEIPT,
        'src/gothic3/main.ts', 'src/gothic3/world-clock.ts', 'src/gothic3/world-clock-view.ts',
        'src/gothic3/navigation-runtime.ts', 'src/gothic3/inventory-observers.ts',
        'src/gothic3/script-routine.ts', 'tools/gothic3/research_native_clock.py',
        'tools/gothic3/research_native_navigation.py', 'tools/gothic3/research_inventory_observers.py',
        'tools/gothic3/research_native_routines.py', 'tools/gothic3/freeze_session_checkpoint.py',
    ])
    require(OUTPUT not in files, 'Checkpoint must not hash itself')
    records = [record(relative) for relative in sorted(files)]
    result = {
        'schema': 'gothic3-session-foundations-checkpoint-v1',
        'baseCommit': BASE,
        'scope': 'bounded-clock-navigation-lifecycle-inventory-observers-and-SPU-task-controls',
        'gameplayReady': False,
        'nativeCodeExecutedByThisTool': False, 'testsExecutedByThisTool': False,
        'baseline': {'receiptPath': BASE_RECEIPT, 'receiptSha256': BASE_RECEIPT_SHA256,
                     'retainedFilesVerified': retained,
                     'updatedInputs': sorted(changed_baseline_inputs)},
        'checksPerformedByThisTool': [
            'base commit ancestry and historical initialization receipt hash',
            'retained baseline file byte counts and SHA256 hashes',
            'frozen clock and inventory-observer implementation receipts',
            'navigation manifest membership, public copies, implementation and producer pins',
            'routine source excerpt hashes, instruction counts and FullStop table pin',
            'current checkpoint file byte counts and SHA256 hashes',
        ],
        'auditsFromOfflineResearch': {
            'clock': clock['audit'], 'navigation': navigation['audit'], 'routines': routines['audit'],
            'inventoryObservers': {key: observers[key] for key in
                                   ('sourceFunctionCount', 'instructionCount', 'originalPEBytes',
                                    'nativeCodeExecuted', 'runtimeRegistryCompletenessProven')},
        },
        'validationNotPerformedByThisTool': [
            'fresh original PE byte comparison', 'typecheck', 'production build',
            'runtime tests', 'browser inspection', 'native game execution',
            'native visual/behavior equivalence or complete-game playthrough',
        ],
        'publicationIntent': {'kind': 'source-only-checkpoint',
                              'branch': 'codex/gothic3-gameplay-initialization',
                              'remoteActionsPerformedByThisTool': False},
        'remaining': [
            'complete session and original property/entity hosts',
            'navigation-scene compilation, sector/PVS traversal and floor/physics queries',
            'complete active HUD observer registration and physical equipment slot effects',
            'native instruction/script handlers and full SPU scheduler',
            'integrated combat, dialogue, quest execution and enclave event chain',
            'world saves and complete original-game playthrough verification',
        ],
        'files': records,
        'publicBytes': sum(item['bytes'] for item in records if item['path'].startswith('public/')),
    }
    path = file_path(OUTPUT)
    path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf8', newline='\n')
    print({'files': len(records), 'retainedBaselineFiles': retained,
           'publicBytes': result['publicBytes'], 'receiptSha256': record(OUTPUT)['sha256']})


if __name__ == '__main__':
    main()
