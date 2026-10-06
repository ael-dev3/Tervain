"""Freeze the concrete Hero Attribute/Stat and PlayerMemory factories.

The producer receipts and the original installed PE/world data are verified
read-only. This tool does not execute native code, tests, builds or a browser.
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path

from freeze_session_checkpoint import ROOT, file_path, read, record, require, verify
from freeze_lifecycle_checkpoint import verify_receipt_records
from research_native_combat import PE, sha
from research_entity_reflection import WORLD_PATH, WORLD_SHA

BASE = '28f3ca1269a4fa08002f8da35f73bcb5cb3794d6'
BASE_RECEIPT = 'assets/gothic3/visual-properties-checkpoint.json'
BASE_RECEIPT_SHA256 = 'a48b49ad5709a3cf1fe44ddee23c71f66d30f6e92fc96ddd1af81ecef136894a'
OUTPUT = 'assets/gothic3/player-attributes-checkpoint.json'
NAMESPACES = ('attribute-reading', 'player-memory-reading')
UPDATED = {'docs/engineering/gothic3-rebuilding-process.md', 'src/gothic3/player-properties.ts'}
INPUTS = {
    'Game': ('Game_dll', 'Game.dll', 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'),
    'Engine': ('Engine_dll', 'Engine.dll', 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'),
    'SharedBase': ('SharedBase_dll', 'SharedBase.dll', '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'),
}


def historical_records(paths: set[str]) -> dict[str, dict[str, object]]:
    paths = sorted(paths)
    request = ''.join(BASE + ':' + path + '\n' for path in paths).encode('utf8')
    raw = subprocess.run(['git', 'cat-file', '--batch'], input=request, cwd=ROOT,
                         check=True, capture_output=True).stdout
    records: dict[str, dict[str, object]] = {}
    offset = 0
    for path in paths:
        end = raw.index(b'\n', offset)
        header = raw[offset:end].split()
        require(len(header) == 3 and header[1] == b'blob', 'Historical file absent: ' + path)
        size = int(header[2])
        data = raw[end + 1:end + 1 + size]
        offset = end + 1 + size
        require(len(data) == size and raw[offset:offset + 1] == b'\n',
                'Historical blob truncated: ' + path)
        offset += 1
        records[path] = {'path': path, 'bytes': size, 'sha256': hashlib.sha256(data).hexdigest()}
    require(offset == len(raw), 'Historical blob batch has extra bytes')
    return records


def audit_evidence(namespace: str, pes: dict[str, PE]) -> dict[str, object]:
    evidence = read('assets/gothic3/' + namespace + '/native-evidence.json')
    require(evidence.get('nativeCodeExecuted') is False, 'Native execution claim differs: ' + namespace)
    functions = evidence['functions']
    instructions = evidence['instructions']
    identities = [function['id'] for function in functions]
    require(len(identities) == len(set(identities)) and set(identities) == set(instructions),
            'Function/instruction identities differ: ' + namespace)
    instruction_count = instruction_bytes = 0
    for function in functions:
        identity = function['id']
        module, _ = identity.split(':', 1)
        rows = instructions[identity]
        require(function.get('allInstructionBytesMatchOriginalPE') is True and
                function.get('allInstructionsInsideOriginalPEBodyRanges') is True and
                function.get('completeOriginalPEBodyRangesCovered') is True,
                'Native instruction audit missing: ' + identity)
        require(len(rows) == function['instructionCount'] and
                sum(len(bytes.fromhex(row['bytes'])) for row in rows) == function['instructionBytes'] == function['bodyBytes'],
                'Instruction count/body extent differs: ' + identity)
        ranges = function['originalPEBodyRanges']
        require(sum(item['bytes'] for item in ranges) == function['bodyBytes'],
                'Inclusive original body range extent differs: ' + identity)
        for body in ranges:
            start = int(body['startVA'], 16)
            raw = pes[module].at(start, body['bytes'])
            require(hashlib.sha256(raw).hexdigest() == body['sha256'],
                    'Original PE body-range hash differs: ' + identity)
            body_rows = sorted((row for row in rows if start <= int(row['address'], 16) < start + body['bytes']),
                               key=lambda row: int(row['address'], 16))
            cursor = start
            for row in body_rows:
                address = int(row['address'], 16)
                encoded = bytes.fromhex(row['bytes'])
                require(address == cursor and pes[module].at(address, len(encoded)) == encoded,
                        'Gap or original PE instruction-byte mismatch: ' + identity)
                cursor += len(encoded)
            require(cursor == start + body['bytes'], 'Incomplete inclusive body range: ' + identity)
        for key in ('cExcerpt', 'assemblyExcerpt'):
            verify('assets/gothic3/' + namespace + '/' + function[key],
                   {'sha256': function[key + 'Sha256']})
        instruction_count += len(rows)
        instruction_bytes += function['instructionBytes']

    bootstrap_bytes = 0
    if namespace == 'attribute-reading':
        bootstrap = evidence['statBootstrapOriginalPEOnly']
        raw = bytes.fromhex(bootstrap['raw'])
        require(bootstrap['entry'] == '20526910' and bootstrap['bytes'] == 75 and len(raw) == 75 and
                hashlib.sha256(raw).hexdigest() == bootstrap['sha256'] ==
                'd2ac58943f13166d44cc6b699a067e12e2882460c357d74ba622feb061ad1d8b' and
                bootstrap['catalogBody'] is False and bootstrap['decompiledBody'] is False and
                bootstrap['sourceBodyInvented'] is False and pes['Game'].at(0x20526910, 75) == raw,
                'Stat PE-only bootstrap proof differs')
        bootstrap_bytes = 75
        relation = evidence['reflectionBaseRootRelation']
        require(relation['gCAttribute']['result'] is None and
                relation['gCStat']['result'] == 'actual gCAttribute registered root',
                'Actual Attribute metadata base-root relation differs')
    else:
        profile = evidence['freshConstruction']
        require(profile['nativeBytes'] == 184 and profile['allocationTag'] == 0xc4 and
                profile['wrapperVtable'] == '20697d2c' and profile['nativeObjectVersion'] == 6 and
                profile['nativeReadVersion'] == 5 and profile['getVersion'] == 6 and
                profile['copyConstructorIsFresh'] is False,
                'Current PlayerMemory version/construction profile differs')
        hero = evidence['originalHero']
        require(hero['allFocusedSerializedBytesMatchOriginal'] is True and
                len(hero['focusedByteChecks']) == 197 and hero['stringTableIndependentlyDecoded'] is True and
                len(hero['packet']['properties']) == 24 and
                hashlib.sha256(bytes.fromhex(hero['packet']['serializedRaw'])).hexdigest() ==
                hero['packet']['serializedSha256'] and
                hero['packet']['serializedSha256'] == evidence['freshConstruction']['heroSerialized']['serializedSha256'] and
                hero['attributeCount'] == 15 and
                len(bytes.fromhex(hero['packet']['serializedRaw'])) == 1617 and
                hero['nativeReadBytes'] == 1125,
                'Original Hero PlayerMemory byte/string audit differs')
        require(len(evidence['nativePropertyRegistrars']) == 25 and
                len(evidence['freshConstruction']['fields']) == 25 and
                len(evidence['freshConstruction']['heroSerialized']['properties']) == 24,
                'PlayerMemory registrar/serialized field counts differ')
    summary = evidence['audit']
    require(summary['selectedNativeBodies'] == len(functions) and
            summary['instructions'] == instruction_count and
            summary['instructionBytes'] == instruction_bytes and
            summary['allSelectedInstructionBytesMatchOriginalPE'] is True and
            summary['allOriginalBodyBytesCoveredByInstructions'] is True and
            summary['capturedBodyCountIsImplementedFeatureCount'] is False,
            'Source audit summary differs: ' + namespace)
    return {'entries': len(functions), 'instructions': instruction_count,
            'originalPEInstructionBytes': instruction_bytes,
            'completeInclusiveBodyRangesComparedToOriginalPE': True,
            'separatePEOnlyBootstrapBytes': bootstrap_bytes,
            'implementedFeatureCountInferredFromBodies': False}


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    study = parser.parse_args().study.resolve()
    subprocess.run(['git', 'merge-base', '--is-ancestor', BASE, 'HEAD'], cwd=ROOT,
                   check=True, capture_output=True)
    raw = subprocess.check_output(['git', 'show', BASE + ':' + BASE_RECEIPT], cwd=ROOT)
    require(hashlib.sha256(raw).hexdigest() == BASE_RECEIPT_SHA256, 'Historical Visual receipt differs')
    verify(BASE_RECEIPT, {'sha256': BASE_RECEIPT_SHA256})
    baseline = json.loads(raw)
    old = historical_records({item['path'] for item in baseline['files']} | UPDATED)
    retained = 0
    for item in baseline['files']:
        require(old[item['path']] == item, 'Historical checkpoint/Git blob mismatch: ' + item['path'])
        if item['path'] not in UPDATED:
            verify(item['path'], item)
            retained += 1

    pes: dict[str, PE] = {}
    for module, (directory, filename, expected) in INPUTS.items():
        path = study / '00_Original_Runtime' / filename
        require(path.is_file() and sha(path) == expected, 'Original runtime PE hash differs: ' + module)
        pes[module] = PE(path)
    audits: dict[str, dict[str, object]] = {}
    receipts: dict[str, dict[str, object]] = {}
    files = {item['path'] for item in baseline['files']} | UPDATED | {BASE_RECEIPT}
    for namespace in NAMESPACES:
        audits[namespace] = audit_evidence(namespace, pes)
        implementation = 'src/gothic3/' + namespace + '.ts'
        producer = 'tools/gothic3/research_' + namespace.replace('-', '_') + '.py'
        files.update((implementation, producer))
        for category in ('assets', 'public'):
            directory = file_path(category + '/gothic3/' + namespace)
            require(directory.is_dir(), 'Evidence namespace missing: ' + str(directory))
            files.update(path.relative_to(ROOT).as_posix() for path in directory.rglob('*') if path.is_file())
        receipt_path = 'assets/gothic3/' + namespace + '/implementation-receipt.json'
        receipt = read(receipt_path)
        pins = verify_receipt_records(receipt)
        require(implementation in pins and producer in pins and receipt['nativeCodeExecuted'] is False and
                receipt['testsExecuted'] is False and receipt['buildExecuted'] is False,
                'Implementation receipt/scope differs: ' + namespace)
        files.update(pins)
        receipts[receipt_path] = record(receipt_path)

    loading_receipt = 'assets/gothic3/player-memory-loading/evidence-receipt.json'
    old_loading = read(loading_receipt)
    require(old_loading.get('factoryImplemented') is False, 'Historical evidence cannot claim a factory')
    for item in old_loading['files']:
        verify(item['path'], item)
        files.add(item['path'])
    for category in ('assets', 'public'):
        directory = file_path(category + '/gothic3/player-memory-loading')
        files.update(path.relative_to(ROOT).as_posix() for path in directory.rglob('*') if path.is_file())
    receipts[loading_receipt] = record(loading_receipt)

    files.update({'tools/gothic3/freeze_player_attributes_checkpoint.py'})
    require(OUTPUT not in files, 'Checkpoint must not hash itself')
    records = [record(path) for path in sorted(files)]
    result = {
        'schema': 'gothic3-player-attribute-runtime-checkpoint-v1',
        'baseCommit': BASE,
        'parentCheckpoint': {'path': BASE_RECEIPT, 'sha256': BASE_RECEIPT_SHA256},
        'scope': 'Hero-gCAttribute-gCStat-and-gCPlayerMemory-construction-defaults-current-read-and-consumers',
        'gameplayReady': False,
        'baseline': {'retainedFilesVerified': retained,
                     'intentionalChanges': [{'before': old[path], 'after': record(path)} for path in sorted(UPDATED)],
                     'historicalReceiptsRemainAtTheirRecordedCommits': True},
        'auditsAgainstOriginalOfflineInputs': audits,
        'currentReceipts': receipts,
        'nativeCodeExecutedByThisTool': False,
        'testsExecutedByThisTool': False,
        'checksPerformedByThisTool': ['parent checkpoint and unchanged historical Git blobs',
            'original runtime PE input hashes', 'complete inclusive PE function ranges and every instruction byte',
            'separate PE-only Stat bootstrap bytes', 'current runtime/producer/dependency receipt pins',
            'historical evidence receipt pins', 'every current path/byte-count/SHA256'],
        'validationNotPerformedByThisTool': ['TypeScript build', 'tests', 'browser runtime',
            'world activation', 'deployment', 'complete playthrough'],
        'heroPropertyFactories': {'boundedImplemented': 19, 'total': 19,
            'connectedToEnclosingEntityReader': False, 'connectedToLiveBrowserScene': False},
        'remaining': ['actual allocation, CString, localization, logging, mutable enum and native lifetime services',
            'legacy PlayerMemory V3/V4 and unsupported foreign RTTI branches',
            'connect all19 factories to the enclosing original entity/template/child/layer/context pipeline',
            'world cache, physics, PVS and original processing activation',
            'live controls, full combat, NPC interaction, quests and save/load',
            'deployed progression through all endings'],
        'publicationIntent': {'kind': 'source-only-checkpoint',
            'branch': 'codex/gothic3-gameplay-initialization', 'remoteActionsPerformedByThisTool': False},
        'files': records,
        'publicBytes': sum(item['bytes'] for item in records if item['path'].startswith('public/')),
    }
    file_path(OUTPUT).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n',
                                 encoding='utf8', newline='\n')
    print(json.dumps({'files': len(records), 'baselineRetained': retained,
        'audits': audits, 'publicBytes': result['publicBytes'], 'sha256': record(OUTPUT)['sha256']}))


if __name__ == '__main__':
    main()
