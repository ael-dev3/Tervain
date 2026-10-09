"""Capture original Arena property-object startup and its immediate continuations."""
import argparse
import hashlib
import json
from pathlib import Path

from read_dialogue_native_evidence import audit_module, PE, EXPECTED_INPUTS


def capture(study):
    EXPECTED_INPUTS['SharedBase.dll'] = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'
    module = audit_module(study, 'Game_dll', 'Game.dll', {
        0x204b1d70: 'arenaRootInitializer',
        0x2000d152: 'arenaTypeSingleton',
        0x200021d5: 'arenaInitializeWrapper',
        0x2002dc8b: 'arenaReplaceWrappedObject',
        0x20549970: 'arenaRootCleanup',
    })
    shared = audit_module(study, 'SharedBase_dll', 'SharedBase.dll', {
        0x10007130: 'propertyWrapperConstructor',
    })
    pe = PE((study / '00_Original_Runtime/Game.dll').read_bytes())
    images = []
    for label, address, size in [
        ('arenaRootWrapper', 0x207b5028, 16),
        ('arenaRootVtable', 0x206595dc, 68),
        ('arenaRootInitializerSlot', 0x2056c36c, 4),
    ]:
        scope = 'original-file-backed-constant'
        if label == 'arenaRootWrapper':
            rva = address - pe.base
            section = next((entry for entry in pe.sections
                            if entry[1] + entry[2] <= rva
                            and rva + size <= entry[1] + entry[0]), None)
            assert section is not None, 'Wrapper must lie wholly in PE zero-fill extent'
            raw = bytes(size)
            scope = 'original-loader-zero-fill'
        else:
            raw = pe.bytes(address, size)
        if label == 'arenaRootInitializerSlot':
            assert int.from_bytes(raw, 'little') == 0x204b1d70
        images.append(dict(label=label, address=f'{address:08x}', bytes=size,
                           raw=raw.hex(), sha256=hashlib.sha256(raw).hexdigest(),
                           scope=scope, liveValueCaptured=False))
    return dict(schema='gothic3-game-arena-root-source-v1', module=module,
                shared=shared, images=images,
                producerSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                sourceOnly=True, initializerImplemented=False,
                wholeCrtTraversalCompleted=False, fullCampaignCompleted=False)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    source = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(source, indent=2) + '\n', encoding='utf-8', newline='\n')
    print('Verified', sum(method['instructionCount'] for key in ['module', 'shared']
                          for method in source[key]['methods']), 'Arena startup instructions')
