"""Recover original Entity ReadV83 stream/control order without native execution."""
from __future__ import annotations

import argparse
from pathlib import Path
import struct

from research_native_clock import collect
from research_native_combat import PE, save_json, sha
from research_native_inventory import native_imports
from research_entity_lifecycle import exports

ROOT = Path(__file__).resolve().parents[2]
MODULES = {
    'Engine': ('Engine_dll', '00_Original_Runtime/Engine.dll',
               'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3',
               '30015e1a 30020347 300427c1 300416cd 300164cd 30040bb5 '
               '3000595c 3001474f 3003fc15 30025897 3003544f 3003f017 '
               '300253e2 3002f603 300200ef 3002fdba 300451e2 3003431a '
               '304d0260 30327330 304ce450 304cfd00 30033519 3001e55b 30006f32'),
    'SharedBase': ('SharedBase_dll', '00_Original_Runtime/SharedBase.dll',
                   '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214',
                   '10002e19 10007aae 10003ba2 100ab010 100bd9a8 100ab02d '
                   '10003111 10003eb3 10007e23 10002eb9'),
    'Game': ('Game_dll', '00_Original_Runtime/Game.dll',
             'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f',
             '204627aa'),
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    out = ROOT / 'assets/gothic3/entity-reading'
    public = ROOT / 'public/gothic3/entity-reading'
    inputs, functions, instructions, pes = {}, [], {}, {}
    for name, (module, relative, expected, selected) in MODULES.items():
        path = args.study / relative
        if sha(path) != expected:
            raise ValueError('Unsupported original PE: ' + name)
        inputs[name] = {'studyPath': relative, 'bytes': path.stat().st_size, 'sha256': expected}
        pes[name] = PE(path)
        bodies, records = collect(args.study, name, module, selected, pes[name], out)
        functions += bodies
        instructions.update(records)
    imports = native_imports(pes['Engine'])
    table = exports(pes['SharedBase'])
    bindings = []
    for iat, name, target in [
        (0x30afcb80, '?IsValid@bCBox@@QBE_NXZ', 0x10002e19),
        (0x30afd820, '?GetPureScaling@bCMatrix@@QBE?AVbCVector@@XZ', 0x10007aae),
        (0x30afdad0, '?GetX@bCVector@@QBEMXZ', 0x10003ba2),
        (0x30afcb70, '??6bCBox@@QAEAAVbCIStream@@AAV1@@Z', 0x10003111),
        (0x30afcbcc, '??6bCMatrix@@QAEAAVbCIStream@@AAV1@@Z', 0x10003eb3),
        (0x30afd5ec, '??6bCSphere@@QAEAAVbCIStream@@AAV1@@Z', 0x10007e23),
        (0x30afda9c, '??8bCString@@QBE_NABV0@@Z', 0x10002eb9),
    ]:
        if imports[iat]['decoratedName'] != name or table.get(name) != target:
            raise ValueError('Entity read helper dispatch differs')
        bindings.append({'iat': f'{iat:08x}', 'bytes': pes['Engine'].at(iat, 4).hex(),
                         'decoratedName': name, 'target': f'{target:08x}'})
    constants = []
    for address, expected in [(0x100e5df0, 0x7f7fffff), (0x100e5df4, 0xff7fffff)]:
        raw = pes['SharedBase'].at(address, 4)
        if struct.unpack('<I', raw)[0] != expected:
            raise ValueError('Original box validity sentinel differs')
        constants.append({'module': 'SharedBase', 'address': f'{address:08x}',
                          'bytes': raw.hex(), 'value': struct.unpack('<f', raw)[0]})
    game = pes['Game']
    slot = game.at(0x2066813c + 0x90, 4)
    stub = game.at(0x204627aa, 6)
    imported = native_imports(game).get(0x207d6a50)
    if (struct.unpack('<I', slot)[0] != 0x204627aa or stub != bytes.fromhex('ff25506a7d20') or
            imported['decoratedName'] != '?SetName@eCEntity@@UAEXABVbCString@@@Z' or
            exports(pes['Engine'])[imported['decoratedName']] != 0x30025897):
        raise ValueError('Concrete gCEntity inherited SetName dispatch differs')
    name_dispatch = {'table': '2066813c', 'offset': 0x90, 'bytes': slot.hex(),
                     'target': '204627aa', 'stubBytes': stub.hex(), 'import': imported,
                     'engineExport': '30025897'}
    boundaries = []
    for getter, body, name, offset in [
        (0x30033519, 0x304b3ac0, 'localBox', 0x110),
        (0x3001e55b, 0x304b39b0, 'worldBox', 0xe8),
        (0x30006f32, 0x304b39a0, 'treeBox', 0xc0),
    ]:
        expected = bytes.fromhex('8d81') + struct.pack('<I', offset) + b'\xc3'
        actual = pes['Engine'].at(body, len(expected))
        if actual != expected:
            raise ValueError('Named entity boundary getter differs: ' + name)
        boundaries.append({'export': f'{getter:08x}', 'body': f'{body:08x}',
                           'name': name, 'offset': offset, 'bodyBytes': actual.hex()})
    source_order = [
        'Node.Read', 'Enable', 'EnableRendering', 'DisableProcessing',
        'flag bit5', 'flag bit10 and Modified', 'EnablePicking(false)',
        'EnableCollision', 'SetRenderAlphaValue(recursive=true)',
        'insertType bits14..17 and Modified', 'lastRenderPriority and Modified',
        'Lock', 'flags bit25/bit13', 'SetName',
        'world/local matrices; tree/local/world boxes; two spheres',
        'LOD factor; flagbit22; cull factor; timestamp scratch; scaling; flags27/28',
        'RemoveAllPropertySets', 'signed-count accessor loop with DEADC0DE sentinel',
        'local/world/tree box validity bits19/20/21', 'virtual OnPostRead',
        'restore source timestamp DWORD130', 'overwrite scaling DWORD134 from world matrix',
    ]
    evidence = {'schema': 'gothic3-entity-reading-native-evidence-v1',
                'inputs': inputs, 'functions': functions, 'instructions': instructions,
                'helperDispatch': bindings, 'constants': constants,
                'gCEntitySetNameDispatch': name_dispatch,
                'namedBoundaryGetters': boundaries,
                'nativeCodeExecuted': False, 'testsRun': False}
    save_json(out / 'native-evidence.json', evidence)
    rules = {'schema': 'gothic3-entity-reading-rules-v1',
             'inputs': {n: i['sha256'] for n, i in inputs.items()},
             'entityVersion': 83, 'sentinel': 0xdeadc0de, 'sourceOrder': source_order,
             'rawOffsets': {'flags': 0x3c, 'worldMatrix': 0x40, 'localMatrix': 0x80,
                            'treeBox': 0xc0, 'localBox': 0x110, 'worldBox': 0xe8,
                            'worldSphere': 0xd8, 'localSphere': 0x100,
                            'visualLodFactor': 0x128, 'objectCullFactor': 0x12c,
                            'modifiedWord': 0x130, 'uniformScaling': 0x134, 'name': 0x138},
             'scope': 'Exact ReadV83 controller over one live entity and ordered native accessor host',
             'remaining': ['reflective class factory/constructor/Create/Read implementations',
                           'dynamic/spatial read wrapper and template patching',
                           'native rendering/cache/collision effects of entity setters',
                           'class-specific PostRead and active world-context residency']}
    save_json(out / 'runtime-rules.json', rules)
    save_json(public / 'runtime-rules.json', rules)
    files = [p for p in out.rglob('*') if p.is_file() and p.name != 'output-receipt.json']
    files += list(public.rglob('*.json'))
    files += [ROOT / 'tools/gothic3/research_entity_reading.py', ROOT / 'src/gothic3/entity-reading.ts',
              ROOT / 'src/gothic3/entity-setters.ts',
              ROOT / 'src/gothic3/entity-lifecycle.ts', ROOT / 'src/gothic3/native-properties.ts']
    save_json(out / 'output-receipt.json', {
        'schema': 'gothic3-entity-reading-output-receipt-v1', 'inputs': inputs,
        'coverage': {'entries': len(functions), 'instructions': sum(map(len, instructions.values())),
                     'originalInstructionBytes': sum(len(bytes.fromhex(r['bytes']))
                         for rows in instructions.values() for r in rows)},
        'files': [{'path': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)}
                  for p in sorted(files) if p.is_file()],
        'nativeCodeExecuted': False, 'testsRun': False, 'gameplayReady': False,
    })
    print('Recovered entity read entries:', len(functions))


if __name__ == '__main__':
    main()
