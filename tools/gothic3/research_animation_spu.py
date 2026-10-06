"""Reproduce original shared-SPU animation fields, proxy and Hero jump evidence.

Python 3.10+, stdlib. Reads preserved PEs/study text; does not execute native
code, tests, a build or a browser. Only animation-spu outputs are written.
"""
from __future__ import annotations

import argparse
import json
import shutil
import struct
from pathlib import Path

from research_native_combat import PE, save_json, sha
from research_native_clock import collect
from research_application_process import native_exports

ROOT = Path(__file__).resolve().parents[2]
MODULES = {
    'Game': ('Game_dll', '00_Original_Runtime/Game.dll',
             'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f',
             '2002c313 200295f5 2001c76f 200047e1 2003140d 20027a9d 2001fa41 2002eb72'),
    'Engine': ('Engine_dll', '00_Original_Runtime/Engine.dll',
               'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3',
               '3001e8da 30027746 30037eca 30006532 30017e77 300460ab 3000392c 30027106'),
    'Script': ('Script_dll', '00_Original_Runtime/Script.dll',
               '9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08',
               '100047a5 10001c99 10004b01 100037ba 10004935 10004039'),
    'Script_Game': ('scripts__Script_Game_dll', '00_Original_Runtime/scripts/Script_Game.dll',
                    '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1',
                    '10059d80'),
}


def pin(path):
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': sha(path)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    out, public = ROOT / 'assets/gothic3/animation-spu', ROOT / 'public/gothic3/animation-spu'
    out.mkdir(parents=True, exist_ok=True)
    public.mkdir(parents=True, exist_ok=True)
    functions, instructions, inputs, pes = [], {}, {}, {}
    for name, (module, relative, expected, selected) in MODULES.items():
        path = args.study / relative
        if sha(path) != expected:
            raise ValueError('Original module differs: ' + name)
        inputs[name] = {'studyPath': relative, 'bytes': path.stat().st_size, 'sha256': expected}
        pe = PE(path)
        pes[name] = pe
        rows, bodies = collect(args.study, name, module, selected, pe, out)
        functions.extend(rows)
        instructions.update(bodies)
    constructor = [r['assembly'] for r in instructions['Game:2036c270']]
    invalidate = [r['assembly'] for r in instructions['Game:2036bf90']]
    for expected in ['MOV dword ptr [ESI + 0x138],0x0',
                     'MOV dword ptr [ESI + 0x140],0xffffffff',
                     'MOV dword ptr [ESI + 0x14c],0x1',
                     'MOVSS dword ptr [ESI + 0x134],XMM0',
                     'MOVSS dword ptr [ESI + 0x13c],XMM0',
                     'MOVSS dword ptr [ESI + 0x144],XMM0',
                     'MOVSS dword ptr [ESI + 0x148],XMM0']:
        if expected not in constructor:
            raise ValueError('Constructor field store differs: ' + expected)
    for expected in ['MOV byte ptr [ESI + 0x94],BL',
                     'MOV dword ptr [ESI + 0x130],EBX',
                     'LEA ECX,[ESI + 0x150]']:
        if expected not in invalidate:
            raise ValueError('Invalidate field store differs: ' + expected)
    for offset in ('0x158', '0x15c', '0x164'):
        for assembly in constructor + invalidate:
            if assembly.startswith(('MOV ', 'MOVSS ', 'OR ', 'AND ', 'XOR ')) and offset in assembly.split(',', 1)[0]:
                raise ValueError('Claimed unknown scratch is initialized: ' + offset)
    constants = []
    for address, expected in [(0x20657aac, 0.30000001192092896), (0x2065b1c4, 1.0)]:
        raw = pes['Game'].at(address, 4)
        value = struct.unpack('<f', raw)[0]
        if value != expected:
            raise ValueError('Original animation default differs')
        constants.append({'address': f'{address:08x}', 'bytes': raw.hex(), 'value': value})
    exports = native_exports(pes['Engine'])
    for name, address in [
        ('?GetEntity@eCEntityProxy@@QAEPAVeCEntity@@XZ', 0x3001e8da),
        ('?GetEntity@eCEntityProxy@@QBEPBVeCEntity@@XZ', 0x30027746),
        ('?GetEntity@eCEntityProxyInternal@@QAEPAVeCEntity@@XZ', 0x30037eca),
        ('?GetEntity@eCEntityProxyInternal@@QBEPBVeCEntity@@XZ', 0x30006532),
    ]:
        if exports[name] != address:
            raise ValueError('Original proxy export differs')
    audit = {'entries': len(functions), 'instructions': sum(map(len, instructions.values())),
             'originalInstructionBytes': sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows),
             'allSelectedInstructionBytesMatchOriginalPE': True}
    evidence = {'schema': 'gothic3-animation-spu-native-evidence-v1',
                'inputBinaries': inputs, 'functions': functions, 'instructions': instructions,
                'constants': constants, 'audit': audit, 'nativeCodeExecuted': False, 'testsRun': False}
    save_json(out / 'native-evidence.json', evidence)
    rules = {
        'schema': 'gothic3-animation-spu-rules-v1', 'inputs': {name: item['sha256'] for name, item in inputs.items()},
        'instructionPointer': '2001c76f',
        'factoryAnimation': {'completedByte': 0, 'visualAnimation': None, 'name': '',
            'waitForFadeByte': None, 'phaseMode': None, 'phaseFinishedByte': None,
            'motionDescriptor': {'fadeIn': constants[0]['value'], 'mode': 0, 'playSpeed': 1,
                                 'loops': 0xffffffff, 'weight': 1, 'fadeOut': 0, 'blendMode': 1}},
        'fieldOffsets': {'completedByte': 0x94, 'visualAnimation': 0x130, 'name': 0x150,
                         'waitForFadeByte': 0x158, 'phaseMode': 0x15c, 'phaseFinishedByte': 0x164},
        'descriptorOffsets': {'fadeIn': 0x134, 'mode': 0x138, 'playSpeed': 0x13c,
                              'loops': 0x140, 'weight': 0x144, 'fadeOut': 0x148, 'blendMode': 0x14c},
        'sharedTimers': {'elapsed': 0x98, 'duration': 0x9c, 'activeInstruction': 0x74},
        'heroJumpCalls': [{'action': 54, 'useTypes': [0, 0], 'phase': 12, 'duration': 0},
                          {'action': 57, 'useTypes': [0, 0], 'phase': 5, 'duration': -1}],
        'profile': 'one-SPU-live-scoped-storage; finite float32; live-owner proxy internals; successful fresh factory state',
        'unknownIsNotZero': ['waitForFadeByte', 'phaseMode', 'phaseFinishedByte'],
        'remaining': ['actual loaded/resident Hero/NPC/VisualAnimation/actor capabilities',
            'full visual actor layer/resource/owner/blending services',
            'lazy nonzero proxy-ID EntityAdmin lookup and destroyed owners',
            'complete world/physics/browser session binding and progression'],
        'gameplayReady': False,
    }
    save_json(out / 'runtime-rules.json', rules)
    shutil.copyfile(out / 'runtime-rules.json', public / 'runtime-rules.json')
    (out / 'README.md').write_text(
        '# Shared SPU animation binding\n\n'
        'The same NativeScriptProcessingUnit owns timers, active pointer, completion '
        'byte, VisualAnimation pointer, descriptor, CString and flags. The adapter '
        'offers one persistent checked facade; every access needs its live same-SPU '
        'scheduler scope. Snapshots are diagnostic copies.\n\n'
        'ProcessScript polling and FullStop abort use the same PlayAni conductor '
        'and NativeInstructionProxyRegistry as initial invocation. Hero _AI_Jump '
        'now returns pending AL0 and resumes the actual Fall_Loop call through '
        'source GetAni services. Actor/cache/physics/world services are still '
        'required; no browser gameplay or native execution is claimed.\n\n'
        'Factory defaults are the recovered complete fresh-constructor state, '
        'not a replay of Invalidate on an existing processor. Uninitialized '
        'scratch remains unknown until an original write occurs.\n', encoding='utf8', newline='\n')
    files = [ROOT / 'src/gothic3' / name for name in ['animation-spu.ts', 'script-routine.ts',
             'script-instructions.ts', 'player-state.ts', 'animation-state.ts', 'animation-instruction.ts']]
    files += [Path(__file__).resolve(), ROOT / 'tools/gothic3/research_native_clock.py',
              ROOT / 'tools/gothic3/research_native_combat.py', ROOT / 'tools/gothic3/research_application_process.py']
    files += [ROOT / 'assets/gothic3/animation-instruction/runtime-rules.json']
    files += sorted(path for directory in (out, public) for path in directory.rglob('*')
                    if path.is_file() and path.name != 'implementation-receipt.json')
    receipt = {'schema': 'gothic3-animation-spu-implementation-receipt-v1', 'baseCommit': '4252aa9a8ebeb754ba3676dd356df3483122a5ca',
        'scope': 'current original-byte/source/output pins; no native/browser/test/build/deployment claim',
        'nativeCodeExecuted': False, 'testsRun': False, 'audit': audit,
        'files': [pin(path) for path in sorted(set(files))]}
    save_json(out / 'implementation-receipt.json', receipt)
    print(json.dumps({'audit': audit, 'receiptSha256': sha(out / 'implementation-receipt.json')}))


if __name__ == '__main__':
    main()
