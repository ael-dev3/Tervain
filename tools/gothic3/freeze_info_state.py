#!/usr/bin/env python3
"""Verify and freeze the separate offline InfoManager outputs; execute no game code."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def path_for(relative):
    path = Path(relative)
    if path.is_absolute() or '..' in path.parts:
        raise ValueError('Unsafe receipt path')
    return ROOT / path


def receipt(relative):
    path = path_for(relative)
    data = path.read_bytes()
    return {'path': relative, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def verify(expected, relative):
    actual = receipt(relative)
    if actual['bytes'] != expected['bytes'] or actual['sha256'] != expected['sha256']:
        raise ValueError('Changed InfoManager input/output: ' + relative)
    return actual


def main():
    output_path = 'assets/gothic3/info-state/output-receipt.json'
    output = json.loads(path_for(output_path).read_text(encoding='utf-8'))
    if output['schema'] != 'gothic3-info-state-output-v1':
        raise ValueError('Unreviewed output receipt')
    document_path = 'public/gothic3/' + output['output']['path']
    owned = [verify(output['output'], document_path)]
    for provider in output['providers']:
        owned.append(verify(provider, 'public/gothic3/' + provider['path']))
    owned.append(verify(output['details'], output['details']['path']))
    for support in output['reproductionSources']:
        verify(support, support['path'])
    document = json.loads(path_for(document_path).read_text(encoding='utf-8'))
    for provider in output['providers']:
        original = json.loads(path_for('public/gothic3/' + provider['path']).read_text(encoding='utf-8'))
        if original['infoCount'] != len(original['records']) or original['infoCount'] != provider['infoCount']:
            raise ValueError('Provider count changed')
    if document['worldManager']['classVersion'] != 4 or document['worldManager']['runtimeTailBytes'] != 0:
        raise ValueError('Ordinary-world overlay scope changed')
    native = json.loads(path_for(output['details']['path']).read_text(encoding='utf-8'))
    for relative in (output_path, 'tools/gothic3/research_info_runtime.py',
                     'tools/gothic3/freeze_info_state.py', 'src/gothic3/info-state.ts',
                     'assets/gothic3/info-state/native-semantics.txt'):
        owned.append(receipt(relative))
    result = {'schema': 'gothic3-info-state-implementation-receipt-v1',
              'scope': 'Separate source-backed initial Given/Permanent state; explicit browser profile; unsupported restores/callbacks remain unknown.',
              'files': sorted(owned, key=lambda item: item['path']),
              'integrityAudit': native['integrityAudit'],
              'publicBytes': sum(item['bytes'] for item in owned if item['path'].startswith('public/')),
              'nativeExecution': False, 'testsExecuted': False,
              'reproduction': [output['reproduction'], 'python -B tools/gothic3/freeze_info_state.py']}
    destination = path_for('assets/gothic3/info-state/implementation-receipt.json')
    destination.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(json.dumps({'receipt': receipt(destination.relative_to(ROOT).as_posix()),
                      'files': len(owned), 'publicBytes': result['publicBytes'], 'integrityAudit': result['integrityAudit']}))


if __name__ == '__main__':
    main()
