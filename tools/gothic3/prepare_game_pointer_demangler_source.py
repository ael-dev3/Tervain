"""Verify original Game pointer RTTI parsing without executing native code."""
import argparse
import hashlib
import json
from pathlib import Path
from read_dialogue_native_evidence import audit_module

TARGETS = {
    0x2047cb3a: 'getPtrRefType',
    0x2047a3cf: 'getPtrRefDataType',
    0x2047b013: 'getECSUDataType',
    0x2047c50a: 'getDataIndirectType',
    0x2047d16e: 'getPrimaryDataType',
    0x2047cde7: 'getSimpleDataType',
}


def capture(study):
    module = audit_module(study, 'Game_dll', 'Game.dll', TARGETS)
    rows = {row['va']: row for method in module['methods'] for row in method['instructions']}
    # Actual '*' construction and pointer-qualification bit, not a guessed
    # string substitution over the encoded RTTI descriptor.
    for address, instruction in {
        '2047d11a': 'PUSH 0x2a',
        '2047d127': 'CALL 0x2047cb3a',
        '2047cbc8': 'CALL 0x2047c50a',
        '2047cbde': 'CALL 0x2047a3cf',
        '2047c956': 'OR dword ptr [EBP + -0x8],0x10',
    }.items():
        if rows[address]['instruction'] != instruction:
            raise ValueError('Original pointer-selection instruction differs: ' + address)
    return {
        'schema': 'gothic3-game-pointer-demangler-source-v1',
        'module': module,
        'producerSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'sourceOnly': True,
        'executionAdmitted': False,
        'wholeCrtTraversalCompleted': False,
        'fullCampaignCompleted': False,
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--runtime-output', type=Path)
    args = parser.parse_args()
    source = capture(args.study)
    payload = json.dumps(source, indent=2) + '\n'
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(payload, encoding='utf-8', newline='\n')
    if args.runtime_output:
        args.runtime_output.parent.mkdir(parents=True, exist_ok=True)
        args.runtime_output.write_text(
            "import sourceText from '../../assets/gothic3/game-pointer-demangler/source.json?raw';\n"
            + 'const expectedText = ' + json.dumps(payload) + ';\n'
            + 'export function admitGamePointerDemanglerSource(): void {\n'
            + "  if (sourceText !== expectedText) throw new Error('Original Game pointer demangler source differs');\n}\n",
            encoding='utf-8', newline='\n')
    print('Verified', sum(method['instructionCount'] for method in source['module']['methods']),
          'original instructions across', len(source['module']['methods']), 'methods')
