"""Recover application timing and entity/property processing from original PE bytes.

Python 3.10+: python -B tools/gothic3/research_application_process.py --study STUDY
Offline PE/source audit only. No Gothic executable, DLL, or recovered code runs.
"""
from __future__ import annotations

import argparse
import struct
from pathlib import Path

from research_native_clock import collect
from research_native_combat import PE, save_json, sha
from research_native_inventory import directory, native_imports

ROOT = Path(__file__).resolve().parents[2]
MODULES = {
    'Engine': ('Engine_dll', '00_Original_Runtime/Engine.dll',
               'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3',
               '''30020a4f 3000504c 300309b8 3002fd9c 3001da89 300365f7
               30047afa 3002d434 30003d37 30030f3f 30028de9 300309ef 3003ddbb
               3003f94f 300460ab 3002bad0 3003e595 3002b94a
               3002d0bf 3002409b 3003125f 300210a8
               30009ef8 3000bc17 30028524 3003dd75 3002943d 30023e93
               3000f61e 3003bbf6 3002f487 30029870 3003507b 3002a25c 3003f98b 30004318
               30009633 30016194 300369fd 3003fc8d 30023ef2 30014754 3000bf14
               3003b039 300261d9 30033b4f 3000e6f1'''),
    'Game': ('Game_dll', '00_Original_Runtime/Game.dll',
             'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f',
             '''20461cdc 20461eaa 20461f5e 20461fb2 20025a13 2000dd50
             2001e5e7 2000a745 20027809 20021643 2001fa41 200047e1 2003300f
             20462888 2046288e 20462894'''),
    'SharedBase': ('SharedBase_dll', '00_Original_Runtime/SharedBase.dll',
                   '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214',
                   '100032bf 1000130c 10004d54 100085b7 10006d2a 1000424b 10004d6d'),
}


def native_exports(pe):
    # Export names in Engine exceed the inventory reader's 256B name bound.
    def text(address):
        for length in range(4096):
            if pe.at(address + length, 1) == b'\0':
                return pe.at(address, length).decode('ascii')
        raise ValueError('Unterminated original export name')
    rva, _ = directory(pe, 0)
    fields = struct.unpack('<IIHHIIIIIII', pe.at(pe.base + rva, 40))
    count, name_count, functions, names, ordinals = fields[6:11]
    if max(count, name_count) > 65536:
        raise ValueError('Unbounded export table')
    result = {}
    for i in range(name_count):
        name = struct.unpack('<I', pe.at(pe.base + names + i * 4, 4))[0]
        ordinal = struct.unpack('<H', pe.at(pe.base + ordinals + i * 2, 2))[0]
        if ordinal >= count:
            raise ValueError('Invalid export ordinal')
        target = struct.unpack('<I', pe.at(pe.base + functions + ordinal * 4, 4))[0]
        result[text(pe.base + name)] = pe.base + target
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    out = ROOT / 'assets/gothic3/application-process'
    public = ROOT / 'public/gothic3/application-process'
    inputs, functions, instructions, pes = {}, [], {}, {}
    for short, (module, relative, expected, selected) in MODULES.items():
        path = args.study / relative
        if sha(path) != expected:
            raise ValueError('Unsupported original PE: ' + short)
        inputs[short] = {'studyPath': relative, 'bytes': path.stat().st_size, 'sha256': expected}
        pes[short] = PE(path)
        bodies, records = collect(args.study, short, module, selected, pes[short], out)
        functions += bodies
        instructions.update(records)
    vtables = []
    for name, base, pairs in [
        ('gCGameApp', 0x2065761c, [(0x2c4, 0x20461cdc)]),
        ('gCEntity', 0x2066813c, [(0x130, 0x20462888), (0x134, 0x2046288e), (0x138, 0x20462894)]),
        ('gCClock_PS', 0x206858fc, [(0x70, 0x20461eaa), (0x84, 0x2001e5e7),
         (0xec, 0x20461f5e), (0x120, 0x20025a13), (0x124, 0x2000dd50), (0x128, 0x20461fb2)]),
        ('gCScriptRoutine_PS', 0x2069c754, [(0x70, 0x20461eaa), (0x84, 0x20021643),
         (0xec, 0x20461f5e), (0x120, 0x2000a745), (0x124, 0x20027809), (0x128, 0x20461fb2)]),
    ]:
        entries = []
        for offset, expected in pairs:
            raw = pes['Game'].at(base + offset, 4)
            if struct.unpack('<I', raw)[0] != expected:
                raise ValueError('Concrete virtual target mismatch: ' + name)
            entries.append({'offset': offset, 'bytes': raw.hex(), 'target': f'{expected:08x}'})
        vtables.append({'module': 'Game', 'class': name, 'address': f'{base:08x}', 'entries': entries})
    import_tables = {short: native_imports(pe) for short, pe in pes.items()}
    export_tables = {short: native_exports(pe) for short, pe in pes.items()}
    links = []
    for alias, expected in [(0x20461cdc, 0x300309b8), (0x20461eaa, 0x30029870),
                            (0x20461f5e, 0x3003507b), (0x20461fb2, 0x30004318),
                            (0x20462888, 0x3003dd75), (0x2046288e, 0x3002943d),
                            (0x20462894, 0x30023e93)]:
        raw = pes['Game'].at(alias, 6)
        if raw[:2] != b'\xff\x25':
            raise ValueError('Not an exact original imported virtual forwarding stub')
        iat = struct.unpack_from('<I', raw, 2)[0]
        imported = import_tables['Game'][iat]
        if imported['library'].lower() != 'engine.dll' or export_tables['Engine'][imported['decoratedName']] != expected:
            raise ValueError('Imported virtual dispatch does not resolve to expected original Engine export')
        links.append({'module': 'Game', 'address': f'{alias:08x}', 'bytes': raw.hex(),
                      'iat': f'{iat:08x}', 'import': imported, 'exportModule': 'Engine', 'export': f'{expected:08x}'})
    for iat, expected in [(0x30afdab4, 0x10004d54), (0x30afdab8, 0x100032bf), (0x30afdabc, 0x1000130c)]:
        imported = import_tables['Engine'][iat]
        if imported['library'].lower() != 'sharedbase.dll' or export_tables['SharedBase'][imported['decoratedName']] != expected:
            raise ValueError('UpdateTick timer import is not the expected SharedBase implementation')
        links.append({'module': 'Engine', 'iat': f'{iat:08x}', 'import': imported,
                      'exportModule': 'SharedBase', 'export': f'{expected:08x}'})
    sleep = import_tables['Engine'][0x30afc828]
    if sleep['library'].lower() != 'kernel32.dll' or sleep['decoratedName'] != 'Sleep':
        raise ValueError('UpdateTick sleep boundary changed')
    links.append({'module': 'Engine', 'iat': '30afc828', 'import': sleep, 'hostBoundary': True})
    constants = []
    for address, fmt, name, expected in [
        (0x30819638, 'd', 'smoothVarianceDivisor', 100000),
        (0x30819628, 'd', 'smoothNumeratorMultiplier', 4),
        (0x30819608, 'd', 'smoothFrameWeightDivisor', 0.12500000186264515),
        (0x30819590, 'd', 'millisecondsPerSecond', 1000),
        (0x30819db4, 'f', 'elapsedEpsilon', 9.999999747378752e-6),
        (0x308193d4, 'f', 'singleStepResetSentinel', -1),
        (0x30819da0, 'f', 'uint32Bias', 4294967296),
    ]:
        raw = pes['Engine'].at(address, struct.calcsize(fmt))
        actual = struct.unpack('<' + fmt, raw)[0]
        if actual != expected:
            raise ValueError('Original timing constant changed: ' + name)
        constants.append({'module': 'Engine', 'address': f'{address:08x}', 'name': name,
                          'bytes': raw.hex(), 'value': actual})
    pins = {
        '300647ce': '3c01',              # duplicate gate AL==1
        '300648c2': 'c6863205000000',    # pause override cleared on normal tick
        '30064924': 'db5c2408',          # native current-CW signed32 FISTP Sleep
        '30064966': 'db5c2408',
        '30064a01': 'd996e0040000',      # stored frame seconds
        '30064a29': 'd996e8040000',      # stored scaled seconds
        '30064a51': 'd99ef4040000',      # copy same inverse frame seconds
        '304c914a': '80be8800000001',    # physical admin enabled byte==1
        '304c91d8': '8b4220',           # retain every snapshot member before processing
        '304c9240': '3c01',             # IsKilled skips only native true1
        '304c929d': '8b4224',           # release after processing all snapshot members
        '304bdd93': 'e84184b6ff',        # capture OnProcess PS before pause getter
        '304bddce': '8b5500',           # decay getter on same captured PS
    }
    instruction_pins = []
    all_engine = {r['address']: r for k, records in instructions.items() if k.startswith('Engine:') for r in records}
    for address, expected in pins.items():
        raw = pes['Engine'].at(int(address, 16), len(bytes.fromhex(expected)))
        if raw.hex() != expected or all_engine[address]['bytes'] != expected:
            raise ValueError('Native processing instruction pin mismatch: ' + address)
        instruction_pins.append({'module': 'Engine', 'address': address, **all_engine[address]})
    evidence = {'schema': 'gothic3-native-application-process-evidence-v1',
                'inputs': inputs, 'functions': functions, 'instructions': instructions,
                'vtables': vtables, 'importExportDispatch': links, 'constants': constants,
                'instructionPins': instruction_pins, 'nativeCodeExecuted': False, 'testsExecuted': False}
    save_json(out / 'native-evidence.json', evidence)
    rules = {'schema': 'gothic3-native-application-process-rules-v1',
             'inputs': {name: value['sha256'] for name, value in inputs.items()},
             'timingPublication': 'UpdateTick at successful DoRender tail; Process consumes previous stored values',
             'onProcess': 'Concrete gCGameApp inherits empty eCApplication::OnProcess',
             'applicationOffsets': {'frameMilliseconds': 0x4d8, 'smoothMilliseconds': 0x4dc,
                 'frameSeconds': 0x4e0, 'scaledMilliseconds': 0x4e4, 'scaledSeconds': 0x4e8,
                 'timestamp': 0x510, 'frameCounter': 0x518, 'lastUpdatedCounter': 0x51c,
                 'smooth': 0x530, 'paused': 0x531, 'pauseOverride': 0x532, 'warmup': 0x1041},
             'constants': {item['name']: item['value'] for item in constants},
             'arithmetic': {'precisionBits': [24, 53, 64], 'rounding': 'nearest-even',
                            'capturedNativeEnvironment': False, 'sleepConversion': 'current-CW signed32 FISTP'},
             'entityAdmin': {'processingEnabledOffset': 0x88, 'processingEnabledConstructor': 0,
                 'rangeCountOffset': 0xaa, 'rangePointerOffset': 0xac, 'rangeUpdatesWhileDisabled': True,
                 'snapshotOrder': 'copy ordered native range array; AddReference all; dispatch all; ReleaseReference all'},
             'propertyVirtualSlots': {'CanBePaused': 0x70, 'GetDecayState': 0xec,
                                     'OnProcess': 0x120, 'OnPreProcess': 0x124, 'OnPostProcess': 0x128},
             'remainingDependencies': [
                 'Actual live sector residency/context/cache-in/PVS and native ordered processing-range membership.',
                 'The original EntityAdmin ROI/hysteresis/dirty update and exit/enter queues before the supported dispatch tail.',
                 'Render tail reachability and native renderer early-return state; browser graphics are a separate implementation.',
                 'Original Win32 timer source and Sleep scheduling/FPU control word; host/profile selection is explicit.',
                 'Physics object processing, actual subclass/PS virtual overrides, refcount destruction and native SEH.',
                 'Clock weather/music/ambient consumer implementations and actual ScriptAdmin/SPU owner registries.',
                 'CreateEngine uses actual concrete OnInitializeEngine eSSetupEngine byte+0xc6 for EnableProcessing; setup construction remains a host boundary.',
             ],
             'nativeCodeExecuted': False, 'testsExecuted': False}
    save_json(out / 'runtime-rules.json', rules)
    save_json(public / 'runtime-rules.json', rules)
    notes = '''APPLICATION PROCESSING SOURCE PROFILE

Concrete GameApp OnProcess is empty. Engine Process increments frameCounter,
then keyboard, mouse, modules, OnProcess, EntityAdmin, module PostProcess,
physics Simulate, KillEntities. DoRender publishes UpdateTick only at its
successful tail after OnPostRender/fog disable. Thus SPUs consume prior latched
scaledSeconds. Warmup calls the same ordinary OnRun; no timing override is
introduced here. CreateEngine resumes the application timer before OnEngineCreated.

UpdateTick's ordinary branch clears pauseOverride. Single-step changes paused
and override fields at its setter. Duplicate update skips only IsGameRunning
AL==1 and matching counters. RelaxTick uses original double0.12500000186264515,
not the rounded decompiler literal. All recovered f32 spills are reconstructed
under an explicitly selected uncaptured x87 precision/nearest-even profile.

EntityAdmin dispatch requires its actual enabled byte and ordered native range
array. Range construction remains a mandatory host boundary. Snapshot retain,
eligibility tests, dynamic PS traversal and snapshot release preserve native
order. Processing-disabled parent skips its recursive descendants. Pause is
queried per PS; CanBePaused may use a newly reloaded PS, while OnProcess and its
decay getter retain the earlier captured pointer. Pre/Post instead reacquire
the invocation PS after the pause gate. A nonempty all-decayed array kills owner.

Clock adapter delegates to the existing physical OriginalClockProperties,
including its actual scratch/calendar stores and weather notification. At a phase change Ambient is captured before
Music; Music is notified before Ambient. Routine PreProcess and OnProcess both
SetSelfEntity. OnProcess profiles timestamp delta around ProcessScript and adds
that uint32 delta to the actual shared ScriptAdmin accumulator. Unsupported
callbacks preserve attempted/partial prefixes and block automatic replay.

No source definition or rendered entity is asserted resident, registered,
processing, or gameplay-ready. No native code, tests or game execution occurs.

API integration: construct NativeApplicationTiming while the same physical
application's frameCounter/frameSeconds/scaledSeconds still have constructor
values0. Restore of already-running timer state is not implemented. Resume
NativeApplicationTimer at the actual successful CreateEngine boundary; do not
infer a Win32 elapsed timer from requestAnimationFrame dt. Entity processing
re-fetches the actual application singleton each PS iteration. Both PS count
and pointer getters must execute their original OnReadContent callbacks.
'''
    (out / 'SOURCE_PROFILE.txt').write_text(notes, encoding='utf8', newline='\n')
    files = [p for p in out.rglob('*') if p.is_file() and p.name != 'implementation-receipt.json']
    files += [p for p in public.rglob('*') if p.is_file()]
    for relative in ['src/gothic3/application-process.ts', 'tools/gothic3/research_application_process.py',
                     'tools/gothic3/research_native_clock.py', 'tools/gothic3/research_native_combat.py',
                     'tools/gothic3/research_native_inventory.py',
                     'src/gothic3/session-runtime.ts', 'src/gothic3/world-clock.ts',
                     'src/gothic3/clock-properties.ts', 'assets/gothic3/clock-properties/runtime-rules.json',
                     'assets/gothic3/clock-properties/manifest.json', 'src/gothic3/native-properties.ts',
                     'assets/gothic3/instructions/runtime-rules.json', 'assets/gothic3/routines/runtime-rules.json',
                     'src/gothic3/script-instructions.ts', 'src/gothic3/script-routine.ts']:
        path = ROOT / relative
        if path.is_file():
            files.append(path)
    save_json(out / 'implementation-receipt.json', {
        'schema': 'gothic3-native-application-process-receipt-v1', 'inputs': inputs,
        'coverage': {'entries': len(functions), 'instructions': sum(len(r) for r in instructions.values()),
                     'originalInstructionBytes': sum(len(bytes.fromhex(i['bytes'])) for r in instructions.values() for i in r)},
        'files': [{'path': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)}
                  for p in sorted(set(files))],
        'nativeCodeExecuted': False, 'testsExecuted': False, 'gameplayReady': False})
    print('Application processing source receipts:', len(functions))


if __name__ == '__main__':
    main()
