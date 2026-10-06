"""Audit installed live startup callback order without executing native code.

Python3.10+: python -B tools/gothic3/research_startup_controller.py --study STUDY
Only this new namespace is written. Older startup and player-state receipts
remain historical at their recorded commits. No tests or browser are run.
"""
from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path

from research_native_clock import collect
from research_native_combat import PE, save_json, sha
from research_native_inventory import native_imports, native_exports
from research_application_process import native_exports as extended_exports

ROOT = Path(__file__).resolve().parents[2]
MODULES = {
    'Script_Game': ('scripts__Script_Game_dll', '00_Original_Runtime/scripts/Script_Game.dll',
        '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1',
        '''100d0470 100cfb70 100cfa10 10009400 10009680 1000e380 1000ebc0
        1000a6f0 1000ed50 1000a800 1000ee40 1000a9a0 1000adc0 1000b3e0 1000b4a0
        100158f0 100158a0 10015990 10016160 10045c90 10045b20 100462a0 100461d0
        10046960 100467f0 100443c0 10044490 10044560 10044700 100447d0 10044630
        10044f00 10044fd0 100450a0 10045170 10045240 10045310'''),
    'Game': ('Game_dll', '00_Original_Runtime/Game.dll',
        'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f',
        '20035c06 20032e98'),
}
STATS = [
    ('SetHitPointsMax', 200, '10045c90'), ('SetHitPoints', 200, '10045b20'),
    ('SetManaPointsMax', 100, '100462a0'), ('SetManaPoints', 100, '100461d0'),
    ('SetStaminaPointsMax', 100, '10046960'), ('SetStaminaPoints', 100, '100467f0'),
    ('SetStrength', 100, '100443c0'), ('SetDexterity', 100, '10044490'),
    ('SetIntelligence', 0, '10044560'), ('SetSmithing', 10, '10044700'),
    ('SetAlchemy', 10, '100447d0'), ('SetTheft', 10, '10044630'),
    ('SetProtectionBlades', 0, '10044f00'), ('SetProtectionImpact', 0, '10044fd0'),
    ('SetProtectionMissile', 0, '100450a0'), ('SetProtectionFire', 0, '10045170'),
    ('SetProtectionIce', 0, '10045240'), ('SetProtectionLightning', 0, '10045310'),
]
HELPERS = [
    ('102203d8', '10009400'), ('102203dc', '10009680'), ('102203e4', '1000e380'),
    ('102203fc', '1000ebc0'), ('102203d9', '1000a6f0'), ('10220420', '1000ed50'),
    ('10220640', '1000a800'), ('10220650', '1000ee40'), ('10220678', '1000a9a0'),
    ('102203da', '1000adc0'), ('102203db', '1000b3e0'), ('10220e84', '1000b4a0'),
]


def receipt(path):
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': sha(path)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    out = ROOT / 'assets/gothic3/startup-controller'
    public = ROOT / 'public/gothic3/startup-controller'
    inputs, functions, instructions, pes = {}, [], {}, {}
    for short, (module, relative, expected, selected) in MODULES.items():
        path = args.study / relative
        if sha(path) != expected:
            raise ValueError('Unsupported original startup binary: ' + short)
        inputs[short] = {'studyPath': relative, 'bytes': path.stat().st_size, 'sha256': expected}
        pes[short] = PE(path)
        bodies, records = collect(args.study, short, module, selected, pes[short], out)
        functions += bodies
        instructions.update(records)
    pe = pes['Script_Game']

    def target(row):
        raw = bytes.fromhex(row['bytes'])
        if len(raw) != 5 or raw[0] != 0xe8:
            return None
        alias = int(row['address'], 16) + 5 + struct.unpack_from('<i', raw, 1)[0]
        jump = pe.at(alias, 5)
        body = alias + 5 + struct.unpack_from('<i', jump, 1)[0] if jump[0] == 0xe9 else alias
        return f'{body:08x}'

    helper_calls = []
    rows = instructions['Script_Game:100d0470']
    for i, row in enumerate(rows):
        body = target(row)
        if body not in {body for _, body in HELPERS}:
            continue
        previous = bytes.fromhex(rows[i - 1]['bytes'])
        if len(previous) != 5 or previous[0] != 0xb9:
            raise ValueError('Original helper receiver is not MOV ECX')
        helper_calls.append({'receiver': f'{struct.unpack_from("<I", previous, 1)[0]:08x}',
                             'body': body, 'call': row['address']})
    if [(r['receiver'], r['body']) for r in helper_calls] != HELPERS:
        raise ValueError('Original OnInit helper order changed')
    rows = instructions['Script_Game:100cfb70']
    calls = [r for r in rows if target(r) in {body for _, _, body in STATS}]
    if [target(r) for r in calls] != [body for _, _, body in STATS]:
        raise ValueError('Original eighteen startup setter calls changed')
    stats = [{'setter': name, 'value': value, 'body': body, 'call': row['address']}
             for (name, value, body), row in zip(STATS, calls)]
    pins = {
        '100cfda0': '6a02',         # NotifyEnclave fourth argument event2
        '100cfe50': '8d542420',    # explicit captured Player after two PUSHes
        '100cffd7': '8d8c2410020000', # destructor order: Gorn
        '100cffe0': '8d8c24c0000000', # Ardea
        '100cffe9': '8d8c2408040000', # Orkboss
        '100cfff2': '8d8c24b0040000', # Larson
        '100cfffb': '8d4c2418',       # Player
        '100d0001': '8d8c24b8020000', # Other
        '100d000a': '8d8c2460030000', # Self
        '100cfa90': 'd900', '100cfa92': 'dc2560d32010', '100cfaa4': 'd918',
        '100cfb1d': 'c744241407000000', # Yepas alignment7
    }
    pin_rows = []
    for address, expected in pins.items():
        if pe.at(int(address, 16), len(bytes.fromhex(expected))).hex() != expected:
            raise ValueError('Original startup operand changed: ' + address)
        pin_rows.append({'module': 'Script_Game', 'address': address, 'bytes': expected})
    raw50 = pe.at(0x1020d360, 8)
    if struct.unpack('<d', raw50)[0] != 50:
        raise ValueError('Original door translation constant changed')
    warning = pe.cstring(0x10212f80).decode('cp1252')
    imports = native_imports(pe)
    import_calls = [{'iat': f'{iat:08x}', **entry} for iat, entry in sorted(imports.items())
                    if iat in {0x10226e90, 0x10226b60, 0x10227304, 0x10227300,
                               0x102264fc, 0x10226514, 0x10226524, 0x10226b74,
                               0x102266e8, 0x10226584, 0x10226580, 0x10226670, 0x10226f90}]
    if len(import_calls) != 13:
        raise ValueError('Original selected startup import table changed')
    script_path = args.study / '00_Original_Runtime/Script.dll'
    script_sha = '9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08'
    if sha(script_path) != script_sha:
        raise ValueError('Unsupported original Script wrapper binary')
    inputs['Script'] = {'studyPath': '00_Original_Runtime/Script.dll',
                        'bytes': script_path.stat().st_size, 'sha256': script_sha}
    script_pe = PE(script_path)
    script_exports = native_exports(script_pe)
    selected = set()
    for row in import_calls:
        if row['library'].lower() == 'script.dll':
            address = script_exports[row['decoratedName']]
            row['resolvedExport'] = f'{address:08x}'
            selected.add(f'{address:08x}')
    bodies, records = collect(args.study, 'Script', 'Script_dll', ' '.join(sorted(selected)), script_pe, out)
    functions += bodies
    instructions.update(records)
    destructor = next(r for r in import_calls if r['iat'] == '10226f90')
    entry = int(destructor['resolvedExport'], 16)
    raw = script_pe.at(entry, 5)
    body = entry + 5 + struct.unpack_from('<i', raw, 1)[0] if raw[0] == 0xe9 else entry
    if script_pe.at(body, 1) != b'\xc3':
        raise ValueError('Captured nonowning Entity destructor is not the original RET')
    shared_path = args.study / '00_Original_Runtime/SharedBase.dll'
    shared_sha = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'
    if sha(shared_path) != shared_sha:
        raise ValueError('Unsupported original matrix/vector binary')
    shared_pe = PE(shared_path)
    inputs['SharedBase'] = {'studyPath': '00_Original_Runtime/SharedBase.dll',
                           'bytes': shared_path.stat().st_size, 'sha256': shared_sha}
    shared_exports = extended_exports(shared_pe)
    intrinsic_links = []
    for iat in (0x10227210, 0x10227254, 0x102272b0):
        entry = imports[iat]
        if entry['library'].lower() != 'sharedbase.dll':
            raise ValueError('Original door matrix accessor library changed')
        intrinsic_links.append({'iat': f'{iat:08x}', **entry,
                                'resolvedExport': f"{shared_exports[entry['decoratedName']]:08x}"})
    bodies, records = collect(args.study, 'SharedBase', 'SharedBase_dll',
        ' '.join(row['resolvedExport'] for row in intrinsic_links), shared_pe, out)
    functions += bodies
    instructions.update(records)
    audit = {'entries': len(functions), 'instructions': sum(len(rows) for rows in instructions.values()),
             'originalInstructionBytes': sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows),
             'allListedInstructionBytesMatchOriginalPE': True, 'nativeCodeExecuted': False, 'testsRun': False}
    save_json(out / 'native-evidence.json', {'schema': 'gothic3-live-startup-evidence-v1', 'inputs': inputs,
        'functions': functions, 'instructions': instructions, 'instructionPins': pin_rows,
        'imports': import_calls, 'matrixAccessorImports': intrinsic_links,
        'constants': [{'address': '1020d360', 'bytes': raw50.hex(), 'value': 50}],
        'audit': audit, 'nativeCodeExecuted': False, 'testsRun': False})
    rules = {'schema': 'gothic3-live-startup-rules-v1',
        'inputs': {name: value['sha256'] for name, value in inputs.items()},
        'helpers': helper_calls, 'stats': stats, 'dirtyHackWarning': warning,
        'doorTranslationDeltaCm': -50, 'pendingResetByOnInit': False,
        'arithmeticProfile': 'finite float32 door matrix, nearest-even final float32 subtraction; active native FPU not captured',
        'lifetimeProfile': 'captured168B nonowning Entity wrappers; destructor RET; constructors/AttachTo/PS capture require original host implementation',
        'execution': 'live sequential native calls; preserve already-applied prefix on unknown/throw; no atomic transaction or automatic replay',
        'queue': 'same control movement7, queue3 and array; original storage destruction/free conditional on nonNULL; pending164/168/16c untouched',
        'destructorOrder': ['Gorn', 'Ardea', 'Ardea_Orkboss', 'Larson', 'Player', 'Other', 'Self'],
        'remaining': ['native allocation/array metadata and other helper bodies', 'concrete Entity wrapper constructor/AttachTo/lookup validity',
            'complete world matrix/cache/physics effect path', 'actual navigation routine, enclave property/NotifyEnclave, quest and inventory services',
            'full direct stat wrapper branches including invalid/transformed/DamageReceiver cases',
            'browser ScriptAdmin/session binding, full resident world, rendering, playable progression/endings'], 'audit': audit}
    save_json(out / 'runtime-rules.json', rules)
    save_json(public / 'runtime-rules.json', rules)
    (out / 'README.txt').write_text(
        'OnInit and OnGameStartUp execute ordered live calls and preserve failed prefixes.\n'
        'Original PlayerMemory scalar adapter retains the captured physical PS and original notifications.\n'
        'The same shared player controls are reset. Pending queue fields are never zeroed by OnInit.\n'
        'All unported wrapper/helper/allocator/navigation/enclave/quest/stat/inventory calls remain explicit host boundaries.\n'
        'No native code, tests, browser review, deployment or game completion is claimed.\n', encoding='utf8', newline='\n')
    files = [ROOT / 'src/gothic3/startup-controller.ts', ROOT / 'src/gothic3/player-state.ts',
             ROOT / 'src/gothic3/player-properties.ts', ROOT / 'src/gothic3/native-properties.ts', Path(__file__).resolve(),
             ROOT / 'tools/gothic3/research_native_clock.py', ROOT / 'tools/gothic3/research_native_combat.py',
             ROOT / 'tools/gothic3/research_native_inventory.py', ROOT / 'tools/gothic3/research_application_process.py']
    outputs = [p for base in (out, public) for p in base.rglob('*') if p.is_file() and p.name != 'implementation-receipt.json']
    save_json(out / 'implementation-receipt.json', {'schema': 'gothic3-live-startup-implementation-receipt-v1',
        'implementationAndProducer': [receipt(p) for p in files], 'outputs': [receipt(p) for p in sorted(outputs)],
        'audit': audit, 'gameplayReady': False, 'historicalReceiptsRemainUnchanged': True,
        'checksNotPerformedByProducer': ['typecheck', 'production build', 'tests', 'browser', 'native execution', 'deployment', 'playthrough']})
    print(json.dumps(audit))


if __name__ == '__main__':
    main()
