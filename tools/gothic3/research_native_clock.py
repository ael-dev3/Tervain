"""Recover the installed world clock offline, including exact original PE bytes.

Python 3.10+, no additional packages. Run from the Tervain repository root:
  python -B tools/gothic3/research_native_clock.py --study <completed study>
This reads original PEs, exported assembly/C, and the existing world-clock seed.
It never loads a DLL or executes Gothic 3. Outputs stay in the clock namespaces.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import struct
from pathlib import Path

from research_native_combat import PE, audit_assembly, cblocks, save_json, sha

ROOT = Path(__file__).resolve().parents[2]
MODULES = {
    'SharedBase': ('SharedBase_dll', '00_Original_Runtime/SharedBase.dll',
                   '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214',
                   '100052ea 100040ca 1000849a 10001b40 100057f9 100048f9 '
                   '10008670 10004d54 10004d6d 10003882 1000720c 1000391d '
                   '10004142 10005d71 1000382d'),
    'Game': ('Game_dll', '00_Original_Runtime/Game.dll',
             'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f',
             '2000ad8a 20023e7a 20007090 20025a13 2000a77c 2001c409 '
             '2000f259 2000e2e1 2002f6b7 20007f04 2002d1dc 20009b24 '
             '20028abf 2001865b 2001a519'),
}
CONSTANTS = [
    (0x100e71bc, 'f', 1.0, 'constructorFactor'),
    (0x100e71d0, 'f', -1.0, 'pendingBaselineSentinel'),
    (0x100e7210, 'd', -1.0, 'baselineSentinelComparison'),
    (0x100e8184, 'f', 4294967296.0, 'unsigned32ConversionBias'),
    (0x100e8178, 'd', 0.0010000000474974513, 'millisecondsToSeconds'),
]
PINS = {
    '1004bee2': '894618',        # baseline is raw DWORD, not a float.
    '1004bef5': '2b4618',        # unsigned wrap through 32-bit subtraction.
    '1004bf0c': 'dc0d78810e10',  # exact promoted-f32 coefficient.
    '1004bf12': 'd95c2408',      # first delta float32 store.
    '1004bf1d': 'd95e1c',        # pending float32 store.
    '1004bf3b': 'd95e14',        # accumulated seconds float32 store.
    '1004bf54': '0d000c0000',    # RC=truncate before FISTP.
    '1004bf61': 'df7c240c',      # signed64 conversion.
    '1004bf65': '8b44240c',      # low32 only feeds unsigned day DIV.
    '1004bf69': 'f7f1',
    '1004bf93': 'f7f1',
    '1004bf98': '01460c',        # wrapping uint32 year ADD.
}


def collect(study: Path, short: str, module: str, selected: str, pe: PE, out: Path):
    directory = study / '01_Decompiled_Code' / module
    csv_path = directory / 'functions.csv'
    with csv_path.open(encoding='utf-8-sig', newline='') as file:
        rows = list(csv.DictReader(file))
    by_entry = {row['address']: row for row in rows}
    entries = set(selected.split())
    for entry in list(entries):
        row = by_entry[entry]
        raw = pe.at(int(entry, 16), 5)
        if row['body_bytes'] == '5' and raw[0] == 0xe9:
            entries.add(f'{int(entry, 16) + 5 + struct.unpack_from("<i", raw, 1)[0]:08x}')
    ordered = sorted(rows, key=lambda row: int(row['assembly_entry_line']))
    end = {row['address']: int(ordered[i + 1]['assembly_entry_line']) - 1
           if i + 1 < len(ordered) else None for i, row in enumerate(ordered)}
    starts = {int(by_entry[entry]['assembly_entry_line']) - 1: entry for entry in entries}
    excerpts, active, lines = {}, None, []
    asm_path = directory / 'full_disassembly.asm'
    with asm_path.open(encoding='utf8') as file:
        for line_number, line in enumerate(file, 1):
            if active and end[active] == line_number:
                excerpts[active], active, lines = ''.join(lines), None, []
            if line_number in starts:
                if active:
                    raise ValueError('Overlapping assembly selection')
                active = starts[line_number]
                if not line.startswith('; ' + active + ' '):
                    raise ValueError('Assembly header mismatch')
            if active:
                lines.append(line)
    if active:
        excerpts[active] = ''.join(lines)
    c = {}
    paths = {directory / by_entry[entry]['pseudocode_file'] for entry in entries}
    c_hashes = {path: sha(path) for path in paths}
    for path in paths:
        for entry, block, line in cblocks(path):
            if entry in entries:
                c[entry] = (block, line)
    receipts, instructions = [], {}
    asm_hash, csv_hash = sha(asm_path), sha(csv_path)
    for entry in sorted(entries):
        row = by_entry[entry]
        if row['status'] != 'decompiled':
            raise ValueError('Missing decompilation for ' + short + ':' + entry)
        records = audit_assembly(excerpts[entry], pe)
        block, line = c[entry]
        destination = out / 'sources' / short
        destination.mkdir(parents=True, exist_ok=True)
        c_path, asm_excerpt = destination / (entry + '.c.txt'), destination / (entry + '.asm.txt')
        c_path.write_text(block, encoding='utf8', newline='\n')
        asm_excerpt.write_text(excerpts[entry], encoding='utf8', newline='\n')
        instructions[short + ':' + entry] = records
        receipts.append({'id': short + ':' + entry, 'entry': entry, 'name': row['qualified_name'],
                         'bodyRanges': row['body_ranges'], 'bodyBytes': int(row['body_bytes']),
                         'studyCsvSha256': csv_hash, 'studyAssemblySha256': asm_hash,
                         'studyAssemblyLine': int(row['assembly_entry_line']) - 1,
                         'studyCPath': row['pseudocode_file'], 'studyCLine': line,
                         'studyCSha256': c_hashes[directory / row['pseudocode_file']],
                         'cExcerpt': c_path.relative_to(out).as_posix(), 'cExcerptSha256': sha(c_path),
                         'assemblyExcerpt': asm_excerpt.relative_to(out).as_posix(),
                         'assemblyExcerptSha256': sha(asm_excerpt),
                         'instructionCount': len(records),
                         'instructionBytes': sum(len(bytes.fromhex(record['bytes'])) for record in records),
                         'allInstructionBytesMatchOriginalPE': True})
    return receipts, instructions


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    study = args.study.resolve()
    out, public = ROOT / 'assets/gothic3/clock', ROOT / 'public/gothic3/clock'
    out.mkdir(parents=True, exist_ok=True)
    public.mkdir(parents=True, exist_ok=True)
    inputs, functions, instructions = {}, [], {}
    for short, (module, path, expected_sha, selected) in MODULES.items():
        binary = study / path
        actual_sha = sha(binary)
        if actual_sha != expected_sha:
            raise ValueError('Unsupported original build: ' + short)
        inputs[short] = {'studyPath': path, 'sha256': actual_sha, 'bytes': binary.stat().st_size}
        bodies, records = collect(study, short, module, selected, PE(binary), out)
        functions += bodies
        instructions.update(records)
    pe = PE(study / MODULES['SharedBase'][1])
    constants = []
    for address, fmt, expected, name in CONSTANTS:
        raw = pe.at(address, struct.calcsize('<' + fmt))
        value = struct.unpack('<' + fmt, raw)[0]
        if value != expected:
            raise ValueError('Clock constant differs: ' + name)
        constants.append({'name': name, 'address': f'{address:08x}', 'bytes': raw.hex(), 'value': value})
    game_pe = PE(study / MODULES['Game'][1])
    for address, fmt, expected, name in [
        (0x20685cb0, 'd', 86400.0, 'weatherSecondsPerDay'),
        (0x20685ca0, 'd', 365.0, 'weatherDaysPerYear'),
        (0x2065d8f8, 'f', 4294967296.0, 'weatherUnsignedBias'),
    ]:
        raw = game_pe.at(address, struct.calcsize('<' + fmt))
        value = struct.unpack('<' + fmt, raw)[0]
        if value != expected:
            raise ValueError('Weather clock constant differs')
        constants.append({'module': 'Game', 'name': name, 'address': f'{address:08x}', 'bytes': raw.hex(), 'value': value})
    ambient_raw = game_pe.at(0x206857d0, 16)
    if struct.unpack('<4I', ambient_raw) != (0, 1, 2, 3):
        raise ValueError('Native ambient daytime table differs')
    lookup = {record['address']: record for record in instructions['SharedBase:1004bec0']}
    for address, expected in PINS.items():
        if lookup[address]['bytes'] != expected:
            raise ValueError('Clock decision instruction differs: ' + address)
    seed_path = ROOT / 'public/gothic3/gameplay/initial/world-clock.json'
    seed = json.loads(seed_path.read_text(encoding='utf8'))
    manifest = json.loads((ROOT / 'public/gothic3/gameplay/manifest.json').read_text(encoding='utf8'))
    seed_receipt = next(record for record in manifest['outputs'] if record['path'] == 'initial/world-clock.json')
    if sha(seed_path) != seed_receipt['sha256'] or seed_path.stat().st_size != seed_receipt['bytes']:
        raise ValueError('World clock seed receipt differs')
    record = next(record for record in seed['records'] if record['entityKey'] == seed['selectedEntityKey'])
    source = record['source']
    original = study / '02_Unpacked_Data/Archives' / source['archive'] / source['path']
    if sha(original) != source['sha256'] or source != seed['source']:
        raise ValueError('Original clock world source differs')
    data = original.read_bytes()
    for field in record['propertyEvidence']:
        offset, size = field['sourceOffset'], field['byteLength']
        if data[offset:offset + size].hex() != field['raw']:
            raise ValueError('Serialized clock field bytes differ: ' + field['name'])
    expected_calendar = {'year': 0, 'day': 0, 'hour': 12, 'minute': 0, 'second': 0}
    if seed['calendar'] != expected_calendar or seed['factor'] != 12 or seed['adjustment'] != {'secondsPerDay': 86400, 'daysPerYear': 365}:
        raise ValueError('Unexpected original world initialization')
    evidence = {'schema': 'gothic3-native-clock-evidence-v1', 'inputs': inputs,
                'functions': functions, 'instructions': instructions, 'constants': constants,
                'decisionInstructions': [lookup[address] for address in PINS],
                'sourceSeed': {'url': 'gameplay/initial/world-clock.json', **seed_receipt},
                'serializedProperties': record['propertyEvidence'],
                'audit': {'functionEntries': len(functions),
                          'instructionRecords': sum(len(records) for records in instructions.values()),
                          'instructionBytes': sum(len(bytes.fromhex(record['bytes'])) for records in instructions.values() for record in records),
                          'allInstructionBytesMatchOriginalPE': True, 'allSerializedClockPropertyBytesMatch': True,
                          'nativeCodeExecuted': False}}
    save_json(out / 'native-source-evidence.json', evidence)
    document = {
        'schema': 'gothic3-native-world-clock-v1', 'schemaVersion': 1,
        'scope': 'mutable-native-clock-arithmetic-with-explicit-host-timestamp-and-precision-profile',
        'sourceSeed': {'url': 'gameplay/initial/world-clock.json', 'sha256': seed_receipt['sha256'], 'bytes': seed_receipt['bytes']},
        'source': source, 'calendar': expected_calendar, 'factor': 12,
        'constructor': {'factor': 1, 'secondsPerDay': 86400, 'daysPerYear': 365,
                        'years': 0, 'days': 0, 'seconds': 0, 'lastTimestamp': 0,
                        'pendingSeconds': -1, 'paused': True},
        'adjustment': seed['adjustment'], 'millisecondsToSeconds': CONSTANTS[-1][2],
        'layout': {'factor': 0, 'secondsPerDay': 4, 'daysPerYear': 8, 'years': 12,
                   'days': 16, 'seconds': 20, 'lastTimestampU32': 24, 'pendingSecondsF32': 28, 'pausedByte': 32},
        'operations': {
            'Adjust': 'Copy factor(float32), secondsPerDay(uint32), daysPerYear(uint32); no elapsed flush or baseline reset.',
            'Set': 'Copy years/day uint32 and seconds float32; pendingSeconds=-1. No immediate calendar normalization or timer read.',
            'Pause': 'paused=true; pendingSeconds=-1; no timer read or elapsed accumulation.',
            'Resume': 'paused=false only. The sentinel from Pause/Set is handled lazily; redundant Resume retains baseline.',
            'GetTimeAndDate': 'When sentinel -1, sample raw u32 timestamp then pending=0. If running, read timestamp, subtract baseline modulo2^32, multiply exact factor/coefficient with float32 delta/pending stores, then read timestamp again into baseline. Add pending into seconds(float32), clear pending, truncate signed64 and use low32 for unsigned day/year division. Subtract whole-day seconds and store float32; uint32 year/day arithmetic wraps.',
            'Process': 'Advance GetTimeAndDate; truncate seconds to signed64 low32 and publish Year/Day/Hour/Minute/Second. Weather notification precedes changed-daytime music then ambient notifications.',
            'QuestClock': 'Copy last process-synchronized property Year/Day/Hour uint32 DWORDs. No advancing read, float conversion or fractional hours.',
        },
        'dayTime': {'0': '06:00–07:59', '1': '08:00–19:59', '2': '20:00–21:59', '3': '22:00–05:59'},
        'ambientDayTimeTable': {'address': '206857d0', 'bytes': ambient_raw.hex(), 'values': [0, 1, 2, 3]},
        'arithmeticProfiles': {'precisionBits': [24, 53, 64], 'rounding': 'nearest-even',
                               'selectionRequired': True, 'capturedNativeControlWord': False,
                               'nativeFPUAdminDefaultPrecisionBits': 24,
                               'nativeFPUAdminDefaultIsNotProofOfActiveClockPrecision': True},
        'precision': ['Float32 storage and exact PE coefficient, uint32 wrap and FISTP truncation are retained.',
                      'Finite clock arithmetic uses exact dyadic operands and explicitly selected24/53/64bit nearest-even intermediate rounding, including float32 stores and subnormals. This avoids substituting JS multiplication for extended x87 intermediates.',
                      'The active native x87 precision/rounding/control word and exception flags were not captured. Native FPU helpers support multiple precisions and default to24bits; a caller must select a profile and may not claim captured native equivalence.',
                      'Nonfinite float32 values, zero calendar divisors and signed64 FISTP overflow are explicit unsupported native exception domains, not silently clamped.',
                      'The host must supply monotonic u32 millisecond samples, with fewer than2^32ms between related reads. Browser timestamp origin/quantization is a selected host profile, not the original QPC timer.'],
        'unresolvedConsumers': ['weather integration', 'music/ambient daytime callbacks', 'native property observers and session scheduling', 'native savegame pause/timer restoration', 'captured native global x87 environment'],
        'evidence': {'path': 'assets/gothic3/clock/native-source-evidence.json', 'sha256': sha(out / 'native-source-evidence.json')},
    }
    save_json(public / 'native-clock.json', document)
    outputs = [{'url': 'native-clock.json', 'bytes': (public / 'native-clock.json').stat().st_size,
                'sha256': sha(public / 'native-clock.json')}]
    receipt = {'schema': 'gothic3-native-clock-output-v1', 'outputs': outputs,
               'producer': {'path': 'tools/gothic3/research_native_clock.py', 'sha256': sha(Path(__file__))},
               'helper': {'path': 'tools/gothic3/research_native_combat.py', 'sha256': sha(ROOT / 'tools/gothic3/research_native_combat.py')},
               'runtime': {'path': 'src/gothic3/world-clock.ts', 'sha256': sha(ROOT / 'src/gothic3/world-clock.ts')},
               'audit': evidence['audit'], 'nativeCodeExecuted': False}
    save_json(out / 'output-receipt.json', receipt)
    (out / 'README.txt').write_text(
        'Original-PE clock byte/control-flow evidence; C reconstructions are navigation aids, not original source.\n'
        'Native clock reads advance time; snapshot/calendar/quest adapters do not. Quest time uses property Year/Day/Hour only.\n'
        'Host-selected24/53/64bit nearest-even arithmetic and monotonic timestamps are explicit profiles, not a captured native environment.\n'
        'Clock arithmetic works independently of unresolved weather/music/ambient/session consumers.\n'
        'No installed binary was executed. Reproduce with Python3.10+: research_native_clock.py --study <study>.\n',
        encoding='utf8', newline='\n')
    files = [path for path in out.rglob('*') if path.is_file() and path.name != 'implementation-receipt.json']
    files += list(public.glob('*.json'))
    files += [Path(__file__), ROOT / 'tools/gothic3/research_native_combat.py', ROOT / 'src/gothic3/world-clock.ts']
    save_json(out / 'implementation-receipt.json', {
        'schema': 'gothic3-native-clock-implementation-v1',
        'scope': 'working-mutable-clock-under-explicit-host-timestamp-and-nearest-even-precision-profile',
        'audit': evidence['audit'], 'nativeCodeExecuted': False,
        'checksNotPerformed': ['native execution', 'runtime tests', 'native session scheduling', 'visual equivalence'],
        'files': [{'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': sha(path)}
                  for path in sorted(set(files))],
    })
    print(json.dumps({'audit': evidence['audit'], 'outputs': outputs}))


if __name__ == '__main__':
    main()
