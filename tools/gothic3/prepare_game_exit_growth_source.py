"""Capture original Game exit-table growth and realloc callees for translation.

This produces source evidence only. It neither executes native code nor grants
heap relocation authority to the browser runtime.
"""
import argparse
import hashlib
import json
from pathlib import Path
from read_dialogue_native_evidence import audit_module


def capture(study):
    module = audit_module(study, 'Game_dll', 'Game.dll', {
        0x204636aa: 'exitTableAppend',
        0x20468416: 'reallocCrt',
        0x20477d87: 'realloc',
        0x20477ecb: 'reallocSmallBlockCleanup',
    })
    return {
        'schema': 'gothic3-game-exit-growth-source-v1',
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
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(source, indent=2) + '\n', encoding='utf-8', newline='\n')
    if args.runtime_output:
        expected = json.dumps(json.dumps(source, indent=2) + '\n')
        args.runtime_output.write_text(
            "import sourceText from '../../assets/gothic3/game-exit-growth/source.json?raw';\n"
            + 'const expectedText = ' + expected + ';\n'
            + 'export function admitGameExitGrowthSource(): void {\n'
            + "  if (sourceText !== expectedText) throw new Error('Original Game exit growth source differs');\n}\n",
            encoding='utf-8', newline='\n')
    print('Verified', sum(method['instructionCount'] for method in source['module']['methods']),
          'original instructions across', len(source['module']['methods']), 'methods')
