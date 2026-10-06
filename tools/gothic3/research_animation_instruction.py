"""Audit original PlayAni Start/ItlLoop and their concrete imported callees.

Python3.10+, standard library. Reads original PEs and preserved C/assembly; no
Gothic DLL, executable or recovered code runs. Outputs are this namespace only.
"""
from __future__ import annotations
import argparse
import json
import struct
from pathlib import Path
from research_native_clock import collect
from research_native_combat import PE, save_json, sha
from research_native_inventory import native_imports
from research_application_process import native_exports

ROOT = Path(__file__).resolve().parents[2]
INPUTS = {
    'Game': ('Game_dll', '00_Original_Runtime/Game.dll', 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'),
    'Engine': ('Engine_dll', '00_Original_Runtime/Engine.dll', 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'),
    'SharedBase': ('SharedBase_dll', '00_Original_Runtime/SharedBase.dll', '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'),
    'Script_Game': ('scripts__Script_Game_dll', '00_Original_Runtime/scripts/Script_Game.dll', '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1'),
}
SELECTION = {
    'Game': '203685b0 2036a1d0 200071a3 2001afbe 200294b0 2000c9af 2036c270 2036bf90',
    'Script_Game': '1016b1e0 100cd200',
    'SharedBase': '10004bf6 100043d6 10006f3c 10001262 100041ab 10004b10 100086d4 10002f5e',
}

def receipt(path):
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': sha(path)}

def main():
    ap = argparse.ArgumentParser(description=__doc__); ap.add_argument('--study', type=Path, required=True)
    args = ap.parse_args(); out = ROOT / 'assets/gothic3/animation-instruction'; public = ROOT / 'public/gothic3/animation-instruction'
    pes, inputs = {}, {}
    for name, (directory, relative, expected) in INPUTS.items():
        path = args.study / relative
        if sha(path) != expected: raise ValueError('Original animation PE differs: ' + name)
        pes[name] = PE(path); inputs[name] = {'studyPath': relative, 'bytes': path.stat().st_size, 'sha256': expected}
    functions, instructions = [], {}
    for name in ('Game', 'Script_Game', 'SharedBase'):
        body, records = collect(args.study, name, INPUTS[name][0], SELECTION[name], pes[name], out)
        functions.extend(body); instructions.update(records)
    imports = native_imports(pes['Game']); exports = native_exports(pes['Engine'])
    targets, bindings = set(), []
    for entry in ('203685b0', '2036a1d0'):
        for row in instructions['Game:' + entry]:
            import re
            match = re.fullmatch(r'CALL dword ptr \[0x([0-9a-f]+)\]', row['assembly'])
            if not match: continue
            address = int(match[1], 16); imported = imports[address]
            if imported['library'].lower() != 'engine.dll': continue
            target = exports.get(imported['decoratedName'])
            if target is None: raise ValueError('Original Engine import has no matching export')
            targets.add(f'{target:08x}')
            bindings.append({'caller': entry, 'instruction': row, 'iatAddress': f'{address:08x}',
                             'import': imported, 'engineEntry': f'{target:08x}'})
    body, records = collect(args.study, 'Engine', INPUTS['Engine'][0], ' '.join(sorted(targets)), pes['Engine'], out)
    functions.extend(body); instructions.update(records)
    constants = []
    for address, kind, width in ((0x2069e184, 'float32', 4), (0x2065b1a8, 'float64', 8),
                                (0x2065d8f8, 'float32', 4), (0x2065b1c4, 'float32', 4)):
        raw = pes['Game'].at(address, width)
        constants.append({'module': 'Game', 'address': f'{address:08x}', 'bytes': raw.hex(), 'type': kind,
                          'value': struct.unpack('<f' if width == 4 else '<d', raw)[0]})
    save_json(out / 'native-evidence.json', {'schema': 'gothic3-animation-instruction-native-evidence-v1',
        'inputs': inputs, 'functions': functions, 'instructions': instructions, 'dispatchBindings': bindings,
        'constants': constants, 'nativeCodeExecuted': False, 'testsExecuted': False})
    naming_path = ROOT / 'public/gothic3/animation-state/rules.json'
    if sha(naming_path) != '4c09a3f20057072a7ba6a8d68ac461bd550427bc9561346f03757dda631ed230':
        raise ValueError('Original naming table receipt differs')
    naming = json.loads(naming_path.read_text(encoding='utf-8'))
    rules = {'schema': 'gothic3-animation-instruction-rules-v1',
        'source': receipt(out / 'native-evidence.json'),
        'namingSource': receipt(naming_path), 'actionStrings': naming['tables']['actions'],
        'start': 'Game203685b0', 'loop': 'Game2036a1d0', 'constants': constants,
        'descriptorOffsets': {'fadeIn': 0x134, 'mode': 0x138, 'playSpeed': 0x13c,
            'loops': 0x140, 'weight': 0x144, 'fadeOut': 0x148, 'blendMode': 0x14c},
        'remainingBoundaries': ['actual retained resource-admin query/load/refcounts',
            'actual VisualAnimation assembled actor and native motion-layer/effect operations',
            'script-admin registration/lookup, shared property notification and movement hooks',
            'native CString/container allocator/refcount/fault behavior outside successful value-operation profile'],
        'numerics': 'JavaScript double with explicit native float32 stores; not captured x87 equivalence'}
    save_json(public / 'runtime-rules.json', rules); save_json(out / 'runtime-rules.json', rules)
    runtime = ROOT / 'src/gothic3/animation-instruction.ts'
    if runtime.exists():
        helpers = [Path(__file__), ROOT / 'tools/gothic3/research_native_clock.py', ROOT / 'tools/gothic3/research_native_combat.py',
            ROOT / 'tools/gothic3/research_native_inventory.py', ROOT / 'tools/gothic3/research_application_process.py',
            ROOT / 'src/gothic3/animation-state.ts', ROOT / 'src/gothic3/resource.ts',
            ROOT / 'public/gothic3/animation-state/manifest.json', ROOT / 'public/gothic3/animation-state/rules.json']
        files = [p for directory in (out, public) for p in directory.rglob('*') if p.is_file()
                 and p.name != 'implementation-receipt.json'] + helpers + [runtime]
        save_json(out / 'implementation-receipt.json', {'schema': 'gothic3-animation-instruction-implementation-receipt-v1',
            'runtime': receipt(runtime), 'producer': receipt(Path(__file__)),
            'helpers': [receipt(p) for p in helpers if p != Path(__file__)],
            'files': [receipt(p) for p in sorted(set(files))],
            'counts': {'entries': len(functions), 'instructions': sum(map(len, instructions.values())),
                       'matchedInstructionBytes': sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows)},
            'nativeCodeExecuted': False, 'testsExecuted': False})
    print({'entries': len(functions), 'instructions': sum(map(len, instructions.values())), 'rules': receipt(public / 'runtime-rules.json')})

if __name__ == '__main__': main()
