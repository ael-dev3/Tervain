"""Capture exact original registration Debug getter and OnMessage bodies."""
import argparse
import hashlib
import json
from pathlib import Path
from read_dialogue_native_evidence import audit_module, EXPECTED_INPUTS


def capture(study):
    EXPECTED_INPUTS['SharedBase.dll'] = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'
    module = audit_module(study, 'SharedBase_dll', 'SharedBase.dll', {
        0x100498f0: 'messageDebug',
        0x100088b4: 'messageGetInstance',
        0x10005560: 'messageOnMessage',
    })
    return {
        'schema': 'gothic3-registration-dispatch-source-v1',
        'module': module,
        'sourceOnly': True,
        'messageDispatched': False,
        'fullCampaignCompleted': False,
        'producerSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    source = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(source, indent=2) + '\n', encoding='utf-8', newline='\n')
    for method in source['module']['methods']:
        print(method['label'], method['bodyVA'], method['instructionCount'], 'verified instructions')
