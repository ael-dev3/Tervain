"""Capture original Arena property registration dependencies without executing native code."""
import argparse
import hashlib
import json
from pathlib import Path
import read_dialogue_native_evidence as native
from prepare_runtime_admin_source import INPUT_SHA, source_excerpt

def capture(study, output):
    native.EXPECTED_INPUTS['SharedBase.dll'] = INPUT_SHA
    audit = native.audit_module(study, 'SharedBase_dll', 'SharedBase.dll',
                               {0x100042e6: 'getPropertyTemplateIndex', 0x10006feb: 'registerPropertyTemplate', 0x1000206d: 'unregisterPropertyTemplate', 0x1000349f: 'createProperty', 0x100035ee: 'destroyProperty', 0x10006e83: 'getPropertyName'})
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
    (output / 'source.json').write_bytes((json.dumps({'schema': 'gothic3-arena-property-registration-v1',
        'sharedBaseSha256': INPUT_SHA, 'methods': methods,
        'sourceOnly': True, 'wholeCrtTraversalCompleted': False}, indent=2) + '\n').encode())

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    capture(args.study, args.output)
