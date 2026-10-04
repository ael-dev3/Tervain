"""Freeze portable receipts for the separate dialogue/source-state checkpoint."""
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
FILES = [
    'src/gothic3/dialogue.ts',
    'src/gothic3/initial-state.ts',
    'src/gothic3/initial-state-view.ts',
    'src/gothic3/quest-state.ts',
    'tools/gothic3/read_dialogue_native_evidence.py',
    'tools/gothic3/read_info_defaults_evidence.py',
    'tools/gothic3/read_initial_quests.py',
    'tools/gothic3/freeze_dialogue_receipts.py',
    'assets/gothic3/dialogue/native-evidence.json',
    'assets/gothic3/dialogue/info-defaults-evidence.json',
    'assets/gothic3/dialogue/native-semantics-details.txt',
    'assets/gothic3/dialogue/initial-quests-details.txt',
    'assets/gothic3/dialogue/initial-quests-receipt.json',
    'assets/gothic3/dialogue/initial-quests-output.json',
    'public/gothic3/dialogue/initial-quests.json',
]


def receipt(path):
    data = (ROOT / path).read_bytes()
    return {'path': path, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def require(value, reason):
    if not value:
        raise ValueError(reason)


def main():
    native = read('assets/gothic3/dialogue/native-evidence.json')
    defaults = read('assets/gothic3/dialogue/info-defaults-evidence.json')
    quests = read('assets/gothic3/dialogue/initial-quests-receipt.json')
    compact = read('assets/gothic3/dialogue/initial-quests-output.json')
    seed = read('public/gothic3/dialogue/initial-quests.json')
    require(native['audit'] == {'methodCount': 51, 'instructionCount': 10819,
                                'byteMismatchCount': 0, 'executedGameCode': False}, 'Dialogue proof coverage differs')
    require(defaults['integrityAudit']['methodCount'] == 51 and
            defaults['integrityAudit']['instructionCount'] == 2749 and
            defaults['integrityAudit']['allRecordedInstructionBytesMatchSourcePE'] is True and
            defaults['integrityAudit']['nativeExecution'] is False, 'Fresh-info proof coverage differs')
    require(quests['audit']['questCount'] == 641 and quests['audit']['compiledPacketCount'] == 637 and
            quests['audit']['allDefinitionInputsMatchOriginalStudy'] is True and
            quests['audit']['allRuntimeTailBytesConsumed'] is True and quests['audit']['nativeExecution'] is False,
            'Quest initialization audit differs')
    for field in ('bytes', 'sha256'):
        actual = receipt('public/gothic3/dialogue/initial-quests.json')[field]
        require(quests['output'][field] == actual and compact['output'][field] == actual, 'Initial quest receipt differs')
    require(compact['details']['sha256'] == receipt(compact['details']['path'])['sha256'], 'Full quest proof hash differs')
    require(quests['generator']['sha256'] == receipt('tools/gothic3/read_initial_quests.py')['sha256'], 'Quest generator changed')
    require(seed['questCount'] == 641 and seed['runtimePacketCount'] == 637 and seed['startup']['applied'] is False,
            'Quest seed scope differs')
    require(len(seed['quests']) == 641 and len({q['id'] for q in seed['quests']}) == 641 and
            all(q['status'] == 0 and all(c == 0 for c in q['counters']) for q in seed['quests']), 'Quest seeds differ')
    pairs = [(q['id'], p['speakerKey'], p['textKey']) for q in seed['quests'] for p in q['logPairs']]
    require(pairs == [('KapDun_Hunter_Fur', '', 'SKALVERAM39')], 'Original quest journal pair differs')
    files = [receipt(path) for path in FILES]
    dependencies = [receipt('public/gothic3/gameplay/initial/' + name) for name in ('initialized-player.json', 'world-clock.json')]
    result = {
        'schema': 'gothic3-dialogue-implementation-receipt-v1',
        'scope': 'Bounded native dialogue planning/execution host API and read-only original source-state inspection. Ordinary play and remaining startup callbacks are not enabled by these modules.',
        'files': files,
        'sharedSourceDependencies': dependencies,
        'nativeAudit': native['audit'],
        'freshInfoDefaultsAudit': defaults['integrityAudit'],
        'initialQuestAudit': quests['audit'],
        'runtimeQuestOutput': compact['output'],
        'runtimeReceipt': 'assets/gothic3/dialogue/initial-quests-output.json',
        'commands': [
            'python -B tools/gothic3/read_dialogue_native_evidence.py --study <LOCAL_DESKTOP_STUDY>',
            'python -B tools/gothic3/read_info_defaults_evidence.py --study <LOCAL_DESKTOP_STUDY>',
            'python -B tools/gothic3/read_initial_quests.py --study <LOCAL_DESKTOP_STUDY>',
            'python -B tools/gothic3/freeze_dialogue_receipts.py',
        ],
        'validation': {'receiptHashesMatch': True, 'testsRun': False, 'nativeGameExecution': False},
    }
    output = ROOT / 'assets/gothic3/dialogue/implementation-receipt.json'
    output.write_text(json.dumps(result, separators=(',', ':')) + '\n', encoding='utf-8')
    print(json.dumps(receipt(str(output.relative_to(ROOT)).replace('\\', '/'))))


if __name__ == '__main__':
    main()
