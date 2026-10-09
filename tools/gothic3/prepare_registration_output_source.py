"""Verify the original registration formatter entry and pending locale call."""
import argparse
import hashlib
import json
from pathlib import Path
from read_dialogue_native_evidence import audit_module, EXPECTED_INPUTS

def capture(study):
    EXPECTED_INPUTS['SharedBase.dll'] = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'
    module = audit_module(study, 'SharedBase_dll', 'SharedBase.dll', {
        0x100b5355: 'outputFormatter', 0x100a74b6: 'localeUpdate'})
    formatter = module['methods'][0]
    assert formatter['bodyInstructionBytesSha256'] == 'b4cea1685c86d396c8b2298308b5b521c8185f73d5c2d9eda5a92aa7c9ef686b'
    boundary = next(index for index, row in enumerate(formatter['instructions'])
                    if row['va'] == '100b53ab')
    selected = formatter['instructions'][:boundary + 1]
    assert selected[-1]['instruction'] == 'CALL 0x100a74b6'
    for method in module['methods']:
        method.pop('instructions')
    return dict(schema='gothic3-registration-output-entry-v1', module=module,
                selectedPrefix=selected, pendingCall='100b53ab', sourceOnly=True,
                formatterReturned=False, fullCampaignCompleted=False,
                producerSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest())

def runtime(source, path):
    payload = json.dumps(source, indent=2) + '\n'
    path.write_text("import text from '../../assets/gothic3/registration-output/source.json?raw';\n"
        + "import source from '../../assets/gothic3/registration-output/source.json';\n"
        + 'const expectedText=' + json.dumps(payload) + ';\n'
        + "export function admitRegistrationOutputSource():void { if(text!==expectedText)throw new Error('Original registration output source differs'); }\n"
        + "function freeze(value:unknown):void {if(value!==null&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}}\n"
        + "admitRegistrationOutputSource();freeze(source);\n"
        + "export const registrationOutputPrefix=source.selectedPrefix;\n", encoding='utf-8', newline='\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--runtime-output', type=Path, required=True)
    args = parser.parse_args()
    source = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(source, indent=2) + '\n', encoding='utf-8', newline='\n')
    runtime(source, args.runtime_output)
    print('Verified', len(source['selectedPrefix']), 'formatter entry instructions')
