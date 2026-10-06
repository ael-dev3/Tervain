"""Recover Session Start/Stop/Pause/Resume and application frame order offline.

Run from this checkout with Python 3.10+: python -B
tools/gothic3/research_session_runtime.py --study <completed-local-study>.
Reads original PE bytes and existing disassembly only. No native code or tests.
"""
from __future__ import annotations

import argparse
import struct
from pathlib import Path

from research_native_clock import collect
from research_native_combat import PE, save_json, sha

ROOT = Path(__file__).resolve().parents[2]
MODULES = {
    'Game': ('Game_dll', '00_Original_Runtime/Game.dll',
             'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f',
             '200087ab 20033f78 2001ae97 20023344 2000d134 20033096 '
             '20023cef 200257b6 2002d510 20007c5c 20002ecd 2001d0c0 200367eb '
             '20461c94 20461cc4 20461cca 20461cd6 20461cdc'),
    'Engine': ('Engine_dll', '00_Original_Runtime/Engine.dll',
               'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3',
               '30019164 30016194 3002b94a 3000564b 30020a4f 3000504c '
               '300460ab 3003f94f 3002d434'),
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    out = ROOT / 'assets/gothic3/session-runtime'
    public = ROOT / 'public/gothic3/session-runtime'
    inputs, functions, instructions, pes = {}, [], {}, {}
    for name, (module, relative, expected, selected) in MODULES.items():
        path = args.study / relative
        if sha(path) != expected:
            raise ValueError('Unsupported original PE: ' + name)
        inputs[name] = {'studyPath': relative, 'sha256': expected, 'bytes': path.stat().st_size}
        pes[name] = PE(path)
        bodies, records = collect(args.study, name, module, selected, pes[name], out)
        functions += bodies
        instructions.update(records)
    vtable = []
    for offset, expected in [(0x26c, 0x20461c94), (0x270, 0x20002ecd),
                             (0x2b4, 0x20461cc4), (0x2b8, 0x20461cca),
                             (0x2c0, 0x20461cd6), (0x2c4, 0x20461cdc)]:
        raw = pes['Game'].at(0x2065761c + offset, 4)
        if struct.unpack('<I', raw)[0] != expected:
            raise ValueError('GameApp concrete virtual dispatch differs')
        vtable.append({'offset': offset, 'bytes': raw.hex(), 'target': f'{expected:08x}'})
    raw = pes['Game'].at(0x2069eb48, 4)
    if struct.unpack('<f', raw)[0] != 12.0:
        raise ValueError('Original startup clock factor differs')
    evidence = {'schema': 'gothic3-native-session-runtime-evidence-v1',
                'inputs': inputs, 'functions': functions, 'instructions': instructions,
                'vtable': {'module': 'Game', 'address': '2065761c', 'entries': vtable},
                'constants': [{'module': 'Game', 'address': '2069eb48',
                               'name': 'startupClockFactor', 'bytes': raw.hex(), 'value': 12}],
                'nativeExecution': False, 'testsRun': False}
    save_json(out / 'native-evidence.json', evidence)
    rules = {'schema': 'gothic3-native-session-runtime-rules-v1',
             'inputs': {name: item['sha256'] for name, item in inputs.items()},
             'warmupFrames': 20, 'warmupSleepMilliseconds': 100, 'startupClockFactor': 12,
             'applicationOffsets': {'paused': 0x531, 'pauseOverride': 0x532,
                                    'warmup': 0x1041, 'scaledSeconds': 0x4e8,
                                    'frameCounter': 0x518},
             'sessionOffsets': {'player': 0x1c, 'camera': 0x20, 'world': 0xc8,
                                'flags': 0xd0, 'gameRunning': 0xe8, 'gui': 0xf4},
             'gameRunningGate': 'GameApp virtual+270 -> Session byte+e8; not an independent AI toggle',
             'startupFailureSemantics': 'Compile result !=1 clears gameRunning but does not skip callbacks or warmup',
             'scope': 'Audited concrete GameApp dispatch, session controller fields and ordered host subcalls',
             'unsupported': [
                 'Complete world/sector residency, navigation compilation, script callback and GUI implementations.',
                 'Engine input/modules/entity traversal/physics/rendering bodies behind ordered frame subcalls.',
                 'Camera reflective property-object binding, video decode, localization and native threads.',
                 'Native SEH/allocator state, dangling pointers, nested Start/Stop and destruction.',
                 'Application-global replacement outside the selected single concrete GameApp profile.',
                 'Browser timer scheduling is selected host behavior, not an exact Win32 Sleep capture.',
             ]}
    save_json(out / 'runtime-rules.json', rules)
    save_json(public / 'runtime-rules.json', rules)
    files = [p for p in out.rglob('*') if p.is_file() and p.name != 'output-receipt.json']
    files += list(public.rglob('*.json'))
    files += [ROOT / 'tools/gothic3/research_session_runtime.py']
    implementation = ROOT / 'src/gothic3/session-runtime.ts'
    if implementation.exists():
        files += [implementation]
    save_json(out / 'output-receipt.json', {
        'schema': 'gothic3-native-session-runtime-output-receipt-v1',
        'inputs': inputs, 'coverage': {'entries': len(functions),
            'instructions': sum(len(rows) for rows in instructions.values()),
            'originalInstructionBytes': sum(len(bytes.fromhex(r['bytes']))
                                            for rows in instructions.values() for r in rows)},
        'files': [{'path': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size,
                   'sha256': sha(p)} for p in sorted(files)],
        'gameplayReady': False, 'nativeExecution': False, 'testsRun': False})
    print('Recovered session/application entries:', len(functions))


if __name__ == '__main__':
    main()
