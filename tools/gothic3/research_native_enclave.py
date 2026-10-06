"""Recover the installed build's bounded NotifyEnclave event2 evidence.

Reads immutable PE/study files offline. No DLL is loaded or executed. The
export describes the raid-entry branch, not an implemented AI/task engine.
Run from the repository root with Python3.10+ and pefile:
  python tools/gothic3/research_native_enclave.py --study <study directory>
"""
from __future__ import annotations

import argparse
import hashlib
from pathlib import Path
import re
import struct

import pefile

from research_native_combat import (
    PE, INPUTS, SHORT, SUPPORTED_SHA256, collect_module, save_json, sha,
)

SELECTED = {
    'scripts__Script_Game_dll': ['100755e0', '10075220', '100183e0', '10016480'],
    'Script_dll': ['100018cf', '100019bf', '10002194', '10002f81', '10001b77'],
    'Game_dll': ['20023f4c', '20003486', '2001a85c'],
}

# These checks pin decision-bearing instructions, including blocks which the
# original decompiler incorrectly removed as unreachable.
PINS = {
    '10075b39': 'e8bdd7f8ff',  # GetPoliticalAttitude(Other,Other.Enclave,0).
    '10075b3e': '83f801',
    '10075adf': '83f806',
    '10075c52': '83f809',
    '10075c67': '83f808',
    '10075c8c': '017c2418',
    '10075c90': '83c501',
    '10075cae': '017c2418',
    '10075cb7': '83c501',
    '10075d17': '8d0cbf',
    '10075d1a': '3bcd',
    '10075d31': '7c04',
    '10075d33': '6a01',
    '10075d37': '6a02',
    '10075df1': 'bf0a000000',
    '10075df6': '2b7c243c',
    '10075e5b': 'c744242002000000',
    '10075e69': '6a03',
    '10075ea1': 'bf0a000000',
    '10075ea6': '2b7c2448',
    '10075f14': 'c744242002000000',
    '10075f22': '6a03',
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    study = args.study.resolve()
    root = Path.cwd().resolve()
    if not (root / 'src/gothic3').is_dir():
        raise ValueError('Run from the Tervain repository root')
    out = root / 'assets/gothic3/enclave'
    out.mkdir(parents=True, exist_ok=True)
    bodies, instructions, registrations, inputs = [], {}, [], {}
    for module, selected in SELECTED.items():
        binary = study / INPUTS[module]
        input_sha = sha(binary)
        if input_sha != SUPPORTED_SHA256[SHORT[module]]:
            raise ValueError('Unsupported installed build: ' + module)
        inputs[SHORT[module]] = {'path': INPUTS[module], 'sha256': input_sha}
        receipts, records, regs = collect_module(study, module, set(selected), PE(binary), out)
        bodies += receipts
        instructions.update(records)
        registrations += regs
    script = PE(study / INPUTS['scripts__Script_Game_dll'])
    lookup = {r['address']: r for r in instructions['Script_Game:100755e0']}
    pins = []
    for address, expected in PINS.items():
        row = lookup[address]
        if row['bytes'] != expected or script.at(int(address, 16), len(bytes.fromhex(expected))).hex() != expected:
            raise ValueError('Raid instruction differs: ' + address)
        pins.append(row)
    parsed = pefile.PE(str(study / INPUTS['scripts__Script_Game_dll']), fast_load=False)
    imports = {entry.address: {'dll': dll.dll.decode('ascii'),
                             'name': entry.name.decode('ascii') if entry.name else str(entry.ordinal)}
               for dll in parsed.DIRECTORY_ENTRY_IMPORT for entry in dll.imports}
    references = {}
    for row in instructions['Script_Game:100755e0']:
        for literal in re.findall(r'\[0x([0-9a-f]+)\]', row['assembly']):
            address = int(literal, 16)
            if address in imports:
                references[literal] = imports[address]
    strings = {f'{address:08x}': script.cstring(address).decode('cp1252')
               for address in [0x10208ab0, 0x1020ed00, 0x1020ecf0, 0x1020ecdc, 0x1020ed34, 0x1020ed18]}
    if strings['10208ab0'] != 'Faring' or strings['1020ed34'] != 'Nrd_BigMine':
        raise ValueError('Enclave exception string differs')
    switch_raw = script.at(0x100186b0, 256)
    switch_tables = []
    for alignment in range(1, 9):
        offset = (alignment - 1) * 32
        switch_tables.append({'selfAlignment': alignment, 'address': f'{0x100186b0 + offset:08x}',
                              'bytes': switch_raw[offset:offset + 32].hex(),
                              'otherAlignment1To8Targets': [f'{target:08x}' for target in
                                                            struct.unpack_from('<8I', switch_raw, offset)]})
    evidence = {
        'schema': 'gothic3-native-enclave-evidence-v1',
        'inputs': inputs, 'functions': bodies, 'registrations': registrations,
        'instructions': instructions, 'decisionInstructions': pins,
        'callbackImports': references, 'strings': strings,
        'politicalAttitudeSwitchData': {'address': '100186b0', 'bytes': switch_raw.hex(),
                                       'byteCount': len(switch_raw), 'sha256': hashlib.sha256(switch_raw).hexdigest(),
                                       'tables': switch_tables, 'source': 'original Script_Game PE',
                                       'consumer': 'Script_Game:100183e0'},
        'audit': {'bodyCount': len(bodies),
                  'instructionCount': sum(len(rs) for rs in instructions.values()),
                  'matchedBytes': sum(len(bytes.fromhex(r['bytes'])) for rs in instructions.values() for r in rs),
                  'allInstructionBytesMatchOriginalPE': True, 'nativeCodeExecuted': False},
    }
    save_json(out / 'native-source-evidence.json', evidence)
    rules = {
        'schema': 'gothic3-enclave-runtime-rules-v1',
        'inputSha256': SUPPORTED_SHA256['Script_Game'],
        'callback': {'name': 'NotifyEnclave', 'body': '100755e0', 'event': 2},
        'statusCallback': {'name': 'ChangeEnclaveStatus', 'body': '10075220'},
        'attitudeCallback': {'name': 'GetPoliticalAttitude', 'body': '100183e0'},
        'scope': 'raid-entry-planner-with-required-native-membership-and-task-host',
        'gate': ['Other.Enclave exists', 'Faring special-NPC exclusion', 'Status !=2',
                 'Raid=true', 'Status=0', 'GetPoliticalAttitude(Other,Enclave)=1'],
        'excludedAIModes': [6, 9, 8],
        'memberLists': {'1': 'same-side defenders', '4': 'opponents'},
        'status': {'liberated': 'eligibleDefenders *5 < allDefenders',
                   'raid': 'eligibleDefenders *5 >= allDefenders',
                   'equalityAtTwentyPercent': 1, 'zeroDefenders': 1},
        'recruitment': {'perSideTarget': 10, 'animationState': 2, 'walkMode': 3,
                        'target': 'Player', 'order': ['FullStop', 'SetGroundBias(None)',
                                                    'AniState=2', 'StartGoto(Player,3)'],
                        'sorting': 'native squared world distance; native CRT qsort tie order unresolved'},
        'party': ['detach member whose PartyLeader is Player; Waiting=false; PartyMemberType=0',
                  'clear Player.PartyLeader if it equals this member'],
        'membership': 'gCEnclave_PS cached proxies; empty cache builds from NavigationAdmin registered PS list with matching NPC.Enclave ID',
        'processingRange': 'live gCNavigation_PS byte+0x1e1; not inferred from rendered distance',
        'unimplemented': ['liberation/status2 callback chain', 'events0/1/3',
                          'sector/navigation registration and activation', 'physical AI task execution',
                          'party/property observer execution', 'native distance arithmetic and CRT tie ordering'],
        'evidence': {'path': 'native-source-evidence.json', 'sha256': sha(out / 'native-source-evidence.json')},
    }
    save_json(out / 'runtime-rules.json', rules)
    (out / 'README.txt').write_text(
        'Offline original-PE evidence for NotifyEnclave event2. All selected instruction bytes are verified.\n'
        'Decompiler float status types and removed reachable blocks are not authoritative.\n'
        'The TS planner requires live membership/processing facts and a complete ordered task host.\n'
        'Static scene membership or a raid flag alone cannot establish a playable native raid.\n'
        'No original game binary is executed or included here. Reproduce using research_native_enclave.py.\n',
        encoding='utf8', newline='\n')
    print(evidence['audit'])


if __name__ == '__main__':
    main()
