"""Check frozen initialization outputs and record this source-only checkpoint.

This performs file/hash/provenance checks. It runs no runtime tests or native
game code and does not establish build or browser success. Run after the four
separate research tools, from the repo root.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative):
    return json.loads((ROOT / relative).read_text(encoding='utf8'))


def receipt(path):
    data = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest()}


def verify(path, expected):
    actual = receipt(path)
    if actual['sha256'] != expected['sha256'] or actual['bytes'] != expected['bytes']:
        raise ValueError('Frozen source/output changed: ' + actual['path'])
    return actual


def main():
    inventory = read('assets/gothic3/inventory/audit.json')
    inventory_final = read('assets/gothic3/inventory/final-audit.json')
    for relative, key in [
        ('public/gothic3/inventory/manifest.json', 'manifestSha256'),
        ('src/gothic3/inventory.ts', 'runtimeSha256'),
        ('tools/gothic3/research_native_inventory.py', 'producerSha256'),
    ]:
        if receipt(ROOT / relative)['sha256'] != inventory_final[key]:
            raise ValueError('Final inventory receipt differs: ' + relative)
    for output in inventory['outputs']:
        verify(ROOT / 'public/gothic3/inventory' / output['url'], output)
    if inventory['startingCounts'] != {'stacks': 121, 'intrinsicLearnedTrue': 5,
                                      'intrinsicLearnedFalse': 116, 'serializedEquipment': 2}:
        raise ValueError('Starting inventory scope changed')
    startup = read('assets/gothic3/startup/source-manifest.json')
    verify(ROOT / 'public/gothic3' / startup['nativeDocument']['url'], startup['nativeDocument'])
    for item in startup['evidenceFiles']:
        verify(ROOT / 'assets/gothic3/startup' / item['path'], item)
    verify(ROOT / startup['researchTool']['path'],
           {**startup['researchTool'], 'bytes': (ROOT / startup['researchTool']['path']).stat().st_size})
    info = read('assets/gothic3/info-state/implementation-receipt.json')
    for item in info['files']:
        verify(ROOT / item['path'], item)
    provider = read('public/gothic3/info-state/providers/ini.json')
    catalog = read('public/gothic3/gameplay/infos.json')
    provider_identities = {
        record['id']: tuple(provider['sources'][record['sourceIndex']][key]
                            for key in ['archive', 'path', 'sha256'])
        for record in provider['records']
    }
    catalog_identities = {
        record['id']: tuple(record['source'][key] for key in ['archive', 'path', 'sha256'])
        for record in catalog
    }
    if (len(provider_identities) != len(provider['records']) or
            len(catalog_identities) != len(catalog) or
            provider_identities != catalog_identities):
        raise ValueError('Fresh INI identities differ from the current gameplay catalog')
    enclave = read('assets/gothic3/enclave/native-source-evidence.json')
    switch = enclave['politicalAttitudeSwitchData']
    if switch['sha256'] != 'd4de208923cc9a7e9fcb692b18aa8039a89494be311a0e55e2f7226ad44efdf3' or switch['byteCount'] != 256:
        raise ValueError('Original political switch bytes differ')
    if not enclave['audit']['allInstructionBytesMatchOriginalPE'] or enclave['audit']['nativeCodeExecuted']:
        raise ValueError('Enclave proof scope differs')
    files = set()
    for namespace in ['inventory', 'startup', 'info-state', 'enclave']:
        for category in ['assets', 'public']:
            directory = ROOT / category / 'gothic3' / namespace
            files.update(path for path in directory.rglob('*') if path.is_file())
    for relative in [
        '.gitattributes', 'docs/engineering/gothic3-rebuilding-process.md',
        'src/gothic3/inventory.ts', 'src/gothic3/inventory-source.ts',
        'src/gothic3/startup.ts', 'src/gothic3/enclave.ts', 'src/gothic3/info-state.ts',
        'src/gothic3/initial-state.ts', 'src/gothic3/initial-state-view.ts', 'src/gothic3/catalog-view.ts',
        'tools/gothic3/research_native_inventory.py', 'tools/gothic3/research_native_startup.py',
        'tools/gothic3/research_native_enclave.py', 'tools/gothic3/research_info_runtime.py',
        'tools/gothic3/freeze_info_state.py', 'tools/gothic3/freeze_initialization_checkpoint.py',
    ]:
        files.add(ROOT / relative)
    records = [receipt(path) for path in sorted(files)]
    result = {
        'schema': 'gothic3-initialization-checkpoint-v1',
        'scope': 'source-backed-initialization-foundations-and-read-only-inspection',
        'baseCommit': 'd1f3ba6fcc612bd9b8e1e15a095739a590a192ca',
        'gameplayReady': False, 'nativeCodeExecuted': False, 'testsExecutedByThisCheckpoint': False,
        'audits': {'inventory': inventory['audit'], 'enclave': enclave['audit'],
                   'infoState': info['integrityAudit']},
        'infoSourceIdentityCoverage': {'catalogCount': len(catalog),
                                      'freshINIRecords': len(provider['records']),
                                      'exactSourceMatches': len(catalog_identities)},
        'checksPerformedByThisTool': ['frozen source/output byte counts and hashes',
                                      'final inventory implementation/producer/manifest hashes',
                                      'starting inventory counts',
                                      'fresh INI/catalog source identity equality',
                                      'enclave original-byte evidence scope'],
        'validationNotPerformedByThisTool': ['typecheck', 'production build',
                                             'runtime tests', 'browser inspection',
                                             'native game execution or visual equivalence'],
        'publication': {'kind': 'source-only-checkpoint', 'branch': 'codex/gothic3-gameplay-initialization',
                        'liveDeploymentChanged': False,
                        'reason': 'Historical PR checks did not execute workflow steps; this source checkpoint did not establish release or deployment acceptance.'},
        'files': records, 'publicBytes': sum(r['bytes'] for r in records if r['path'].startswith('public/')),
        'remaining': ['native inventory observers and physical equip effects', 'complete new-game session host',
                      'sector/navigation activation and registry', 'NPC AI/tasks/ROI/contact scheduling',
                      'enclave liberation and quest-event chain', 'complete dialogue/quest execution',
                      'native save-state restoration', 'finishable original game verification'],
    }
    path = ROOT / 'assets/gothic3/initialization-checkpoint.json'
    path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf8', newline='\n')
    print({'files': len(records), 'publicBytes': result['publicBytes'], 'receiptSha256': receipt(path)['sha256']})


if __name__ == '__main__':
    main()
