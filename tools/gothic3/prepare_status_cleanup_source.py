"""Verify the original Game Arena Status cleanup callback bytes."""
import argparse
import json
from pathlib import Path
from read_dialogue_native_evidence import audit_module

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    source = {'schema': 'gothic3-status-cleanup-source-v1',
              'module': audit_module(args.study, 'Game_dll', 'Game.dll', {
                  0x205499a0: 'arenaStatusCleanup'}), 'sourceOnly': True}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(source, indent=2) + '\n', encoding='utf-8', newline='\n')
    method = source['module']['methods'][0]
    print(method['instructionCount'], method['bodyInstructionBytesSha256'])
