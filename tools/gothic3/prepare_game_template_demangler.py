"""Capture original Game template name demangler dependencies without executing native code."""
import argparse
import hashlib
import json
from pathlib import Path
import read_dialogue_native_evidence as native
from prepare_runtime_admin_source import source_excerpt
from prepare_arena_type_source import GAME_SHA as INPUT_SHA

def capture(study, output):
    native.EXPECTED_INPUTS['Game.dll'] = INPUT_SHA
    audit = native.audit_module(study, 'Game_dll', 'Game.dll',
                               {0x2047abe3: 'getTemplateName', 0x2047a4bc: 'getTemplateArgumentList', 0x2047ad36: 'getZName', 0x2047b013: 'getECSUDataType'})
    output.mkdir(parents=True, exist_ok=True)
    methods = {}
    for method in audit['methods']:
        address = method['bodyVA'][2:]
        asm = ('\n'.join(row['va'] + ' | ' + row['bytes'] + ' | ' + row['instruction']
                         for row in method['instructions']) + '\n').encode()
        c = source_excerpt(study, method).encode()
        (output / (address + '.asm.txt')).write_bytes(asm)
        (output / (address + '.c.txt')).write_bytes(c)
        methods[method['label']] = {key: method[key] for key in
            ['entryVA', 'bodyVA', 'bodyRanges', 'instructionCount', 'bodyByteCount',
             'bodyInstructionBytesSha256', 'entryChain']}
        methods[method['label']].update(assemblySha256=hashlib.sha256(asm).hexdigest(),
                                       cSha256=hashlib.sha256(c).hexdigest())
    (output / 'source.json').write_bytes((json.dumps({'schema': 'gothic3-game-template-demangler-v1',
        'gameSha256': INPUT_SHA, 'methods': methods,
        'sourceOnly': True, 'wholeCrtTraversalCompleted': False}, indent=2) + '\n').encode())

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    capture(args.study, args.output)
