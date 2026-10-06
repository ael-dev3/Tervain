"""Recover original SPU task/state dispatch without executing native code.

Run from the repository root with Python 3.10+:
  python tools/gothic3/research_native_routines.py --study <completed study>
The recorded methods are bounded runtime ports, not a complete AI scheduler.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import struct

from research_native_combat import (
    PE, INPUTS, SUPPORTED_SHA256, collect_module, save_json, sha,
)

SELECTED = '''
20002383 20034d60 20024ffa 2003140d 20006776 2001aa4b
20025536 2003290c 2000fa5b 2001fa41 20007c75 20034e69
20001127 20012e77 2002dff6 2000170d 20003265 203502c0 20352660
'''.split()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    root = Path.cwd().resolve()
    if not (root / 'src/gothic3').is_dir():
        raise ValueError('Run from the Tervain repository root')
    binary = args.study / INPUTS['Game_dll']
    input_sha = sha(binary)
    if input_sha != SUPPORTED_SHA256['Game']:
        raise ValueError('Unsupported original Game.dll')
    out = root / 'assets/gothic3/routines'
    out.mkdir(parents=True, exist_ok=True)
    bodies, instructions, registrations = collect_module(
        args.study, 'Game_dll', set(SELECTED), PE(binary), out)
    engine_binary = args.study / INPUTS['Engine_dll']
    if sha(engine_binary) != SUPPORTED_SHA256['Engine']:
        raise ValueError('Unsupported original Engine.dll')
    engine_bodies, engine_instructions, engine_registrations = collect_module(
        args.study, 'Engine_dll', {'3003b5bb', '3001a091', '3002ad10', '30037ca4'},
        PE(engine_binary), out)
    bodies += engine_bodies
    instructions.update(engine_instructions)
    registrations += engine_registrations
    pe = PE(binary)
    multiplier_raw = pe.at(0x2065bfa0, 8)
    multiplier = struct.unpack('<d', multiplier_raw)[0]
    if multiplier != 1000:
        raise ValueError('Original SPU time multiplier differs')
    instruction_pointers = ['2002d3b2', '2002b940', '2001fe51', '2001c76f',
                            '2001ba9a', '20027f3e', '2001fbbd', '20034dec']
    stop_body = instructions['Game:2036eec0']
    for pointer in instruction_pointers:
        expected = '3d' + struct.pack('<I', int(pointer, 16)).hex()
        if not any(row['bytes'] == expected for row in stop_body):
            raise ValueError('Original instruction comparison differs: ' + pointer)
    stop_switch = pe.at(0x2036ef1c, 32)
    if stop_switch.hex() != 'daee3620e1ee3620e8ee3620efee3620f6ee3620fdee362004ef36200bef3620':
        raise ValueError('Original FullStop switch table differs')
    vtable_raw = pe.at(0x2069c754 + 0x58, 8)
    if struct.unpack('<II', vtable_raw) != (0x20461e8c, 0x20461e92):
        raise ValueError('Concrete ScriptRoutine property vtable differs')
    audit = {
        'entries': len(bodies),
        'instructions': sum(len(rows) for rows in instructions.values()),
        'matchedBytes': sum(len(bytes.fromhex(row['bytes']))
                            for rows in instructions.values() for row in rows),
        'allListedInstructionBytesMatchOriginalPE': True,
        'nativeCodeExecuted': False,
    }
    evidence = {
        'schema': 'gothic3-native-routines-evidence-v1',
        'input': {'path': INPUTS['Game_dll'], 'sha256': input_sha},
        'engineInput': {'path': INPUTS['Engine_dll'], 'sha256': sha(engine_binary)},
        'functions': bodies, 'instructions': instructions,
        'registrations': registrations, 'audit': audit,
        'data': {'timeMultiplier': {'address': '2065bfa0', 'bytes': multiplier_raw.hex(), 'value': multiplier},
                 'fullStopSwitch': {'address': '2036ef1c', 'bytes': stop_switch.hex(),
                                    'selector1To8Targets': [f'{target:08x}' for target in struct.unpack('<8I', stop_switch)]},
                 'propertyVtable': {'address': '2069c7ac', 'bytes': vtable_raw.hex(),
                                    'enter': '20461e8c', 'exit': '20461e92'}},
    }
    save_json(out / 'native-evidence.json', evidence)
    rules = {
        'schema': 'gothic3-native-routines-rules-v1', 'inputSha256': input_sha,
        'bodies': {'fullStop': '2036eec0', 'continueRoutine': '20356cb0',
                   'detectDailyRoutine': '2036b6a0', 'setTask': '2036e910',
                   'setState': '2036bdb0', 'taskTime': '20367b60',
                   'stateTime': '20367c90'},
        'instructionSelectors': {'1': 'wait', '2': 'goto', '3': 'output',
                                '4': 'play-animation', '5': 'combat-move',
                                '6': 'prepare-aim', '7': 'play-aim', '8': 'hud-wait'},
        'instructionPointers': instruction_pointers,
        'timeMultiplier': multiplier,
        'propertyHooks': 'Engine notifiers first call owning entity vtable+0x118 when present, then SharedBase object-reference notifier; host required',
        'fullStopDefault': 'abort any non-null active instruction; no implicit task/stack clear',
        'setTaskTrueFlag': 'no ordinary task mutation; detection-mode branch takes precedence',
        'detectDailyTask': 'Routine is ScriptRoutine_PS script name, not Navigation_PS routine label',
        'limits': ['native instruction implementations and complete script linker remain host boundaries',
                   'property Enter/Exit callbacks must be implemented by the host',
                   'state stack allocation represented structurally; allocation failure not emulated',
                   'daily detection excludes missing/None Self pointer profile',
                   'SPU process scheduler, instruction execution, combat/perception/pathfinding remain'],
        'evidence': {'path': 'native-evidence.json', 'sha256': sha(out / 'native-evidence.json')},
    }
    save_json(out / 'runtime-rules.json', rules)
    (out / 'README.txt').write_text(
        'Original-PE evidence for SPU task/state/routine API dispatch.\n'
        'This does not prove a complete AI scheduler, script linker or native instruction host.\n'
        'FullStop aborts the active instruction; it does not itself clear task or state.\n'
        'ScriptRoutine_PS.Routine and Navigation_PS.Routine are separate properties.\n',
        encoding='utf8', newline='\n')
    print(audit)


if __name__ == '__main__':
    main()
