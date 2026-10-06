"""Offline original-PE receipts for SPU scheduling and WAIT (Python 3.10+).

Run from this checkout: python -B tools/gothic3/research_spu_instructions.py
  --study <LOCAL_DESKTOP_STUDY>
No DLL loading, game execution or tests. Only the instructions namespaces are written.
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
             '200047e1 20004395 2000675d 2001154f 200190ce 2002fa31 20030521 '
             '2002f2e3 2002d3b2 200295f5 2002c313 2002be1d 2002be45 2001fa41 '
             '20027a9d 2002eb72 20025c2f 20022705 20016f72 2001e443 200164d2 '
             '2001737d 20010064 200160e0 2002a29d 2000d698 2002aa9f 200364da '
             '2001d93f 20003ec2 20020469 2000a745 200358be 20357cc0 203502c0 '
             '20352660 2002aa6d 20029ad7 2002e181 2000170d 20003265 2003140d '
             '20025536 2003290c 20030f80 2000967e 20010a1e'),
    'SharedBase': ('SharedBase_dll', '00_Original_Runtime/SharedBase.dll',
                   '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214',
                   '10001f05 100059ed 10002eb9 100083c3 10002f5e'),
    'Engine': ('Engine_dll', '00_Original_Runtime/Engine.dll',
               'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3',
               '300460ab 30017e77 3002d844 30003d55 30027106 30005466 3000392c 3000b9c9'),
}


def zero_fill(pe: PE, address: int, size: int):
    """Prove that these globals start in PE virtual bytes absent from the file."""
    data = pe.data
    header = struct.unpack_from('<I', data, 0x3c)[0]
    count = struct.unpack_from('<H', data, header + 6)[0]
    optional_size = struct.unpack_from('<H', data, header + 20)[0]
    rva = address - pe.base
    for i in range(count):
        offset = header + 24 + optional_size + i * 40
        section = data[offset:offset + 40]
        virtual_size, section_rva, raw_size = struct.unpack_from('<III', section, 8)
        if section_rva + raw_size <= rva and rva + size <= section_rva + virtual_size:
            return {'address': f'{address:08x}', 'bytes': size,
                    'initialHex': '00' * size, 'backing': 'PE-loader-zero-filled-virtual-range',
                    'sectionName': section[:8].rstrip(b'\0').decode('ascii'),
                    'sectionHeaderFileOffset': offset, 'sectionHeaderBytes': section.hex(),
                    'virtualSize': virtual_size, 'sectionRva': section_rva, 'rawSize': raw_size,
                    'scope': 'Loader initial bytes before application/global runtime writes; not captured live state.'}
    raise ValueError('Not a proven zero-fill range')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    study = args.study.resolve()
    out = ROOT / 'assets/gothic3/instructions'
    public = ROOT / 'public/gothic3/instructions'
    out.mkdir(parents=True, exist_ok=True)
    public.mkdir(parents=True, exist_ok=True)
    inputs, functions, instructions, pes = {}, [], {}, {}
    for name, (module, relative, expected, selection) in MODULES.items():
        path = study / relative
        if sha(path) != expected:
            raise ValueError('Unsupported original PE: ' + name)
        inputs[name] = {'studyPath': relative, 'sha256': expected, 'bytes': path.stat().st_size}
        pes[name] = PE(path)
        if selection:
            collected, records = collect(study, name, module, selection, pes[name], out)
            functions += collected
            instructions.update(records)
    constants = []
    for module, address, fmt, expected, name in [
        ('SharedBase', 0x100e5de8, 'f', 9.999999747378752e-06, 'localScaleEpsilon'),
        ('Game', 0x2065bfa0, 'd', 1000.0, 'millisecondsPerSecond'),
        ('Game', 0x2065d8f8, 'f', 4294967296.0, 'unsigned32Bias'),
        ('Game', 0x2065cf50, 'd', 2000.0, 'forcedTaskCallbackMilliseconds'),
        ('Game', 0x20684ec0, 'f', 1000.0, 'taskCallbackSetterMilliseconds'),
        ('Game', 0x2065c05c, 'f', 100.0, 'localCallbackSetterMilliseconds'),
    ]:
        raw = pes[module].at(address, struct.calcsize('<' + fmt))
        value = struct.unpack('<' + fmt, raw)[0]
        if value != expected:
            raise ValueError('Instruction constant differs: ' + name)
        constants.append({'module': module, 'address': f'{address:08x}', 'name': name,
                          'bytes': raw.hex(), 'value': value})
    evidence = {'schema': 'gothic3-native-instructions-evidence-v1', 'schemaVersion': 1,
                'inputs': inputs, 'functions': functions, 'instructions': instructions,
                'constants': constants,
                'zeroFilledGlobals': [zero_fill(pes['Game'], 0x207cc45c, 28),
                                      zero_fill(pes['Game'], 0x207cc478, 4)],
                'nativeExecution': False, 'testsRun': False}
    save_json(out / 'native-evidence.json', evidence)
    rules = {'schema': 'gothic3-native-instructions-rules-v1', 'schemaVersion': 1,
             'gameSha256': inputs['Game']['sha256'], 'waitPointer': '2002d3b2',
             'epsilon': 9.999999747378752e-06, 'millisecondsPerSecond': 1000,
             'callbackForceMilliseconds': 2000,
             'dailyRoutineFallback': {'propertySetSelector': 30, 'propertySet': 'gCNPC_PS',
                                      'branch': '2036b75e-2036b764',
                                      'selectorMethod': '20010a1e', 'requiresExplicitNpcPresent': True,
                                      'navigationPresenceIsNotDispatchInput': True},
             'arithmeticProfiles': {'precisionBits': [24, 53, 64], 'rounding': 'nearest-even',
                                    'capturedNativeEnvironment': False, 'selectionRequired': True},
             'factory': {'frameCapacity': 5, 'frameCount': 1, 'frameTimeMilliseconds': 1000,
                         'taskMilliseconds': 0, 'stateMilliseconds': 0, 'waitElapsedMilliseconds': 0,
                         'waitDurationMilliseconds': None, 'taskCallbackMilliseconds': None,
                         'localCallbackMilliseconds': None, 'localTimeScale': 1,
                         'lastFrameTimestamp': 0, 'audioChannel': None, 'self': None,
                         'instructionEntity': None, 'instructionTarget': None},
             'entrypoints': {'process': '200047e1', 'wait': '2002d3b2', 'newFrame': '200190ce',
                            'fullStop': '2003140d', 'stopWait': '20003ec2', 'routineProcess': '2000a745'},
             'unsupported': [
                 'Compiled state/function/callback bodies not yet ported and identified by original source.',
                 'Goto/output/animation/combat/aim/HUD-wait instruction bodies.',
                 'Nonnull audio-channel dependencies and engine audio effects.',
                 'Native entity destruction, allocator callback effects, unknown proxy references and reference overflow.',
                 'Nonfinite x87 values/exceptions, non-nearest rounding and a captured live FPU environment.',
                 'Invalid/dangling native frame addresses, freed stack allocations and reentrant ProcessScript.',
                 'Complete browser application/EntityAdmin gates and actor dispatch ordering are selected host inputs.',
             ]}
    save_json(out / 'runtime-rules.json', rules)
    document = {'schema': 'gothic3-native-instructions-v1', 'schemaVersion': 1,
                'inputs': inputs, 'rules': rules,
                'coverage': {'entries': len(functions), 'instructions': sum(len(v) for v in instructions.values()),
                             'instructionBytes': sum(sum(len(bytes.fromhex(r['bytes'])) for r in v) for v in instructions.values())},
                'behavior': [
                    'ProcessScript application gate false returns1 before timer writes.',
                    'Stored scaled application seconds multiply local max(epsilon,scale), first store float32, then multiply1000 in selected x87 precision.',
                    'Task/state/WAIT elapsed float32 stores precede task synchronization and active instruction poll.',
                    'WAIT consumes entity/u32 milliseconds only on nonnull input; pending is target>elapsed; descriptor is not retained.',
                    'Completion/abort clears descriptor proxy+78, proxy+108, then active callback. Duration/elapsed remain.',
                    'Active pointer reread determines pending; instruction AL is ignored by ProcessScript.',
                    'Pending instruction path runs local callback, task callback, task/state publication, then returns without audio update.',
                    'Completed state with prior positive position runs a second state call after intermediate time publication.',
                    'Registered AI function AL==1 removes live top frame; unknown registration is unsupported instead of emulating native error-dialog success.',
                    'Empty/exhausted frame stack calls DetectDailyRoutineTask(false), which requires valid Self before its missing-PS guard.',
                    'Frame callback has no scheduler budget guard; task callback is budgeted globally with1000/2000millisecond thresholds.',
                    'Task/state publication divides captured milliseconds by1000 and stores float32 before each EnterEx callback.',
                    'Callback setter uses native null-storage CString sentinel, distinct from an allocated zero-length CString.',
                ], 'baselineChange': {
                    'path': 'src/gothic3/script-routine.ts',
                    'changes': ['Add scoped shared-state scheduler fields/dispatch with existing revision/trace/failure handling.',
                                'Require distinct native frame-slot identities and reject freed/replaced captured frame allocations.',
                                'Correct ContinueRoutine fallback to explicit NPC_PS selector0x1e presence and preserve live Self rereads.'],
                    'historicalSessionCheckpoint': '864422d',
                    'historicalSourceAndReceiptsPreserved': True,
                    'historicalCheckpointDoesNotAttestUpdatedRuntime': True,
                }, 'scope': 'Source-supported scheduler/WAIT transitions, not complete native scripts, all instruction implementations, actor AI or full game execution.'}
    save_json(public / 'native-instructions.json', document)
    save_json(out / 'output-receipt.json', {
        'schema': 'gothic3-native-instructions-output-receipt-v1', 'schemaVersion': 1,
        'nativeExecution': False, 'testsRun': False,
        'runtimeRules': {'path': 'assets/gothic3/instructions/runtime-rules.json', 'sha256': sha(out / 'runtime-rules.json')},
        'document': {'url': 'gothic3/instructions/native-instructions.json', 'bytes': (public / 'native-instructions.json').stat().st_size,
                     'sha256': sha(public / 'native-instructions.json')},
        'nativeEvidence': {'path': 'assets/gothic3/instructions/native-evidence.json', 'bytes': (out / 'native-evidence.json').stat().st_size,
                           'sha256': sha(out / 'native-evidence.json')},
    })
    # This receipt is reproducible without falsely claiming this producer ran
    # TypeScript/browser checks. Those are separate parent checkpoint evidence.
    paths = [ROOT / relative for relative in [
        'src/gothic3/script-instructions.ts', 'src/gothic3/script-routine.ts',
        'tools/gothic3/research_spu_instructions.py',
        'tools/gothic3/research_native_clock.py', 'tools/gothic3/research_native_combat.py',
    ]]
    paths += [path for path in out.rglob('*') if path.is_file() and path.name != 'implementation-receipt.json']
    paths += [path for path in public.rglob('*') if path.is_file()]
    files = [{'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': sha(path)}
             for path in sorted(paths)]
    save_json(out / 'implementation-receipt.json', {
        'schema': 'gothic3-native-instructions-implementation-receipt-v1', 'schemaVersion': 1,
        'scope': document['scope'], 'inputs': inputs, 'files': files,
        'totalBytes': sum(file['bytes'] for file in files), 'coverage': document['coverage'],
        'allListedInstructionBytesVerifiedAgainstOriginalPE': True,
        'intentionalBaselineChange': document['baselineChange'],
        'validation': {'producerOriginalByteAndHashAudit': 'passed in this producer invocation',
                       'typecheck': 'not executed by this producer; separate checkpoint evidence',
                       'browser': 'not executed by this producer', 'testsRun': False,
                       'nativeExecution': False, 'remoteActions': False},
        'reproduction': 'python -B tools/gothic3/research_spu_instructions.py --study <LOCAL_DESKTOP_STUDY>',
    })
    print(f'Collected {len(functions)} entries / {sum(len(v) for v in instructions.values())} byte-verified instructions')


if __name__ == '__main__':
    main()
