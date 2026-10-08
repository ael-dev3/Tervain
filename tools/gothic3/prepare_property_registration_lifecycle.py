"""Capture original property singleton registration and descriptor lifecycle dependencies without executing native code."""
import argparse
import hashlib
import json
from pathlib import Path
import read_dialogue_native_evidence as native
from prepare_runtime_admin_source import INPUT_SHA, source_excerpt, image_bytes

def capture(study, output):
    native.EXPECTED_INPUTS['SharedBase.dll'] = INPUT_SHA
    audit = native.audit_module(study, 'SharedBase_dll', 'SharedBase.dll',
                               {0x1000191f: 'registerType', 0x1000206d: 'unregisterProperty',
                                0x100035ee: 'destroyProperty', 0x10090e30: 'lookupTypeSlot',
                                0x10088610: 'removePropertySlot', 0x10008cd3: 'findTypeSlot',
                                0x10002c7a: 'hashCString', 0x10004638: 'assignCString',
                                0x10004fd4: 'getPropertySingleton', 0x10004aac: 'constructPropertySingleton',
                                0x10001c49: 'constructTypeTable', 0x10005cdb: 'clearTypeTable',
                                0x1000799b: 'reserveTypeTable', 0x10006654: 'destroyPropertySingleton',
                                0x10091230: 'destroyTypeTable'})
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
    pe = native.PE((study / '00_Original_Runtime/SharedBase.dll').read_bytes())
    raw, section = image_bytes(pe, 0x102f48c0, 40)
    assert raw == bytes(40)
    callback = pe.bytes(0x100e30a0, 10)
    assert callback.hex() == 'b9c0482f10e9aa35f2ff'
    images = {'propertySingleton': {'address': '102f48c0', 'bytes': 40,
        'raw': raw.hex(), 'knownMask': 'ff' * 40, 'sha256': hashlib.sha256(raw).hexdigest(),
        'scope': 'cold-original-image', 'liveValueCaptured': False, 'section': section}}
    exit_callback = {'entry': '100e30a0', 'raw': callback.hex(), 'bytes': 10,
        'sha256': hashlib.sha256(callback).hexdigest(), 'receiver': '102f48c0',
        'targetEntry': '10006654', 'instructions': [
            {'va': '100e30a0', 'bytes': 'b9c0482f10', 'instruction': 'MOV ECX,0x102f48c0'},
            {'va': '100e30a5', 'bytes': 'e9aa35f2ff', 'instruction': 'JMP 0x10006654'}]}
    (output / 'source.json').write_bytes((json.dumps({'schema': 'gothic3-property-registration-lifecycle-v1',
        'sharedBaseSha256': INPUT_SHA, 'methods': methods, 'runtimeRegistrationCompleted': False, 'imageReceipts': images, 'exitCallback': exit_callback,
        'sourceOnly': True, 'wholeCrtTraversalCompleted': False}, indent=2) + '\n').encode())

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    capture(args.study, args.output)
