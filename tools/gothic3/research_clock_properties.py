"""Recover the physical original Clock_PS property and consumer ordering offline.

Run with Python3.10+ from the repository root:
  python -B tools/gothic3/research_clock_properties.py --study <completed study>
Only assets/public gothic3/clock-properties outputs are written. No original
binary is loaded/executed; no tests, build, browser or remote actions occur.
"""
from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path

from research_native_combat import PE, save_json, sha
from research_native_clock import collect, CONSTANTS, PINS
from research_native_inventory import directory, native_imports
from read_gameplay_properties import _read_native_world, decode_property

ROOT = Path(__file__).resolve().parents[2]
INPUTS = {
    'Game': ('Game_dll', '00_Original_Runtime/Game.dll',
             'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'),
    'Engine': ('Engine_dll', '00_Original_Runtime/Engine.dll',
               'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'),
    'SharedBase': ('SharedBase_dll', '00_Original_Runtime/SharedBase.dll',
                   '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'),
}
SELECTED = {
    'Game': set('''2000ad8a 20023e7a 20007090 20025a13 2000a77c 2001c409
        2000f259 2000e2e1 2002f6b7 20007f04 2002d1dc 20009b24 20028abf
        2002357e 2000f9bb 2002b094 2002c5a2 20032097 2002bfdf 200187fa
        20007130 20026049 2000dd50 2001e5e7 2002121f 2002d731
        20004f25 2001c436 200286c8 2002b873 20021fb7 2000f821
        2000d8af 20017b4d 2002f8a1 200268dc 20022b15'''.split()),
    'Engine': set('''300025bd 3001a091 3002ad10 30037ca4 3003b5bb
        3003544f 3003b863 3002a25c 3003f98b 3004070f'''.split()),
    'SharedBase': set('''100052ea 100040ca 1000849a 10001b40 100057f9 100048f9
        10008670 10004d54 10004d6d 10003882 1000720c 1000391d 10004142
        10005d71 1000382d 10008805 100027de 10001186 10005a65 100076f8
        100079fa 10007f81 10008143 10001d07 10003274'''.split()),
}
WORLD_PATH = ('G3_World_01/SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}/'
              'SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}.lrentdat')
WORLD_SHA = '28f7273b3d54415b84445651a3dfa962c1ff158e9183deba81ba47e4d5d57938'
GUID = '7d1ccbd0bc24884d8fcb75ce15a713c700000000'
VALUES = {'Year': 0, 'Day': 0, 'Hour': 12, 'Minute': 0, 'Second': 0, 'Factor': 12.0}
OFFSETS = {'Year': 0x14, 'Day': 0x18, 'Hour': 0x1c, 'Minute': 0x20, 'Second': 0x24, 'Factor': 0x28}


def exports(pe):
    def text(address):
        for size in range(4096):
            if pe.at(address + size, 1) == b'\0':
                return pe.at(address, size).decode('ascii')
        raise ValueError('Unterminated original export name')
    rva, _ = directory(pe, 0)
    fields = struct.unpack('<IIHHIIIIIII', pe.at(pe.base + rva, 40))
    count, names_count, functions, names, ordinals = fields[6:11]
    if max(count, names_count) > 65536:
        raise ValueError('Unbounded original export table')
    result = {}
    for i in range(names_count):
        name = struct.unpack('<I', pe.at(pe.base + names + i * 4, 4))[0]
        ordinal = struct.unpack('<H', pe.at(pe.base + ordinals + i * 2, 2))[0]
        if ordinal >= count:
            raise ValueError('Export ordinal outside original function table')
        target = struct.unpack('<I', pe.at(pe.base + functions + ordinal * 4, 4))[0]
        result[text(pe.base + name)] = pe.base + target
    return result


def source_bindings(pes, selected):
    game, imports = pes['Game'], native_imports(pes['Game'])
    export_tables = {name: exports(pe) for name, pe in pes.items()}
    bindings, vtable = [], []
    def bind(slot):
        row = imports[slot]
        short = row['library'].removesuffix('.dll')
        if short not in pes or row['decoratedName'] not in export_tables[short]:
            raise ValueError('Unresolved selected original IAT binding')
        target = export_tables[short][row['decoratedName']]
        selected[short].add(f'{target:08x}')
        result = {'slot': f'{slot:08x}', **row, 'targetModule': short, 'exportTarget': f'{target:08x}',
                  'iatFileBytes': game.at(slot, 4).hex()}
        if result not in bindings:
            bindings.append(result)
        return result
    expected = {0: 0x2002d731, 4: 0x2046031a, 0x10: 0x20023e7a, 0x18: 0x20007130,
                0x40: 0x200187fa, 0x4c: 0x20461e80, 0x50: 0x20007090,
                0x58: 0x20461e8c, 0x5c: 0x20461e92, 0x60: 0x2002121f,
                0x84: 0x2001e5e7, 0x120: 0x20025a13, 0x124: 0x2000dd50}
    for offset, expected_target in expected.items():
        raw = game.at(0x206858fc + offset, 4)
        target = struct.unpack('<I', raw)[0]
        if target != expected_target:
            raise ValueError('Original Clock_PS vtable differs')
        selected['Game'].add(f'{target:08x}')
        entry = {'offset': offset, 'address': f'{0x206858fc + offset:08x}', 'bytes': raw.hex(), 'target': f'{target:08x}'}
        if game.at(target, 2) == b'\xff\x25':
            slot = struct.unpack('<I', game.at(target + 2, 4))[0]
            entry['importBinding'] = bind(slot)
        vtable.append(entry)
    # Constructor, embedded clock, inherited processing and weather subcalls.
    for slot in [0x207d6df8, 0x207d806c, 0x207d8074, 0x207d7308, 0x207d8068,
                 0x207d651c, 0x207d8070, 0x207d8078, 0x207d807c, 0x207d8080, 0x207d7248]:
        bind(slot)
    for slot in [0x207d7234, 0x207d8808, 0x207d8898]:
        bind(slot)
    return bindings, vtable


def original_seed(study, out, public):
    source = study / '02_Unpacked_Data/Archives/Projects_compiled.p00' / WORLD_PATH
    if sha(source) != WORLD_SHA:
        raise ValueError('Unsupported original Clock_PS world source')
    data = source.read_bytes()
    document = _read_native_world(data, source)
    entity = document['entities'][1]
    if entity['name'] != 'World_MCP' or entity['guid'] != GUID or entity['sourceOffset'] != 455:
        raise ValueError('Original World_MCP record differs')
    index = next(i for i, record in enumerate(entity['classes']) if record['name'] == 'gCClock_PS')
    clazz, metadata = entity['classes'][index], document['offsets'][1][index]
    if metadata['sourceOffset'] != 1121 or clazz['version'] != 1 or clazz['tail'] != '':
        raise ValueError('Original Clock_PS Read boundary differs')
    values, checks, references = {}, [], {}
    for prop, offsets in zip(clazz['properties'], metadata['properties']):
        decoded = decode_property(prop, document['strings'], offsets=offsets)
        if decoded['status'] != 'decoded' or decoded['type'] not in ('long', 'float'):
            raise ValueError('Original Clock_PS property not decoded')
        values[prop['name']] = decoded['value']
        offset, size = offsets['sourceOffset'], decoded['byteLength']
        if data[offset:offset + size].hex() != decoded['raw']:
            raise ValueError('Original Clock_PS value bytes differ')
        checks.append({'property': prop['name'], 'type': prop['type'], 'sourceOffset': offset,
                       'byteLength': size, 'raw': decoded['raw'], 'value': decoded['value']})
        for key in ['nameStringIndex', 'typeStringIndex']:
            string_index = offsets[key]
            references[str(string_index)] = document['strings'][string_index]
    if values != VALUES or list(values) != list(VALUES):
        raise ValueError('Original Clock_PS serialized values/order differ')
    version_offset = metadata['tailSourceOffset'] - 2
    version_raw = data[version_offset:version_offset + 2]
    if struct.unpack('<H', version_raw)[0] != clazz['version']:
        raise ValueError('Original Clock_PS Read version bytes differ')
    seed = {'schema': 'gothic3-original-clock-property-seed-v1',
            'phase': 'serialized-before-derived-Clock-Read',
            'entity': {'key': 'world-2419:1', 'name': 'World_MCP', 'guid20': GUID},
            'values': values, 'derivedReadVersion': clazz['version'],
            'source': {'archive': 'Projects_compiled.p00', 'path': WORLD_PATH,
                       'sha256': WORLD_SHA, 'propertySetSourceOffset': metadata['sourceOffset']}}
    save_json(public / 'serialized-clock.json', seed)
    save_json(out / 'seed-evidence.json', {'schema': 'gothic3-clock-property-seed-evidence-v1',
        'native': {'studyPath': str(source.relative_to(study)).replace('\\', '/'),
                   'sha256': WORLD_SHA, 'bytes': len(data)},
        'entity': {'name': entity['name'], 'guid20': entity['guid'], 'index': entity['index'],
                   'sourceOffset': entity['sourceOffset'], 'headerRaw': entity['nativeHeader']['headerRaw']},
        'originalRecord': clazz, 'serialization': metadata, 'stringReferences': references,
        'byteChecks': checks, 'derivedReadVersion': {'sourceOffset': version_offset, 'bytes': version_raw.hex(), 'value': clazz['version']},
        'audit': {'originalRecordBytesVerified': True, 'propertyValues': len(checks),
                  'nativeEntityReadExecuted': False, 'nativeClockReadExecuted': False}})
    return seed


def receipt(path):
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': sha(path)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    study = args.study.resolve()
    out, public = ROOT / 'assets/gothic3/clock-properties', ROOT / 'public/gothic3/clock-properties'
    out.mkdir(parents=True, exist_ok=True); public.mkdir(parents=True, exist_ok=True)
    inputs, pes, selected = {}, {}, {key: set(value) for key, value in SELECTED.items()}
    for short, (module, path, expected) in INPUTS.items():
        binary = study / path
        if sha(binary) != expected:
            raise ValueError('Unsupported original build: ' + short)
        pes[short] = PE(binary)
        inputs[short] = {'studyPath': path, 'sha256': expected, 'bytes': binary.stat().st_size}
    bindings, vtable = source_bindings(pes, selected)
    functions, instructions = [], {}
    for short, (module, path, _) in INPUTS.items():
        bodies, records = collect(study, short, module, ' '.join(sorted(selected[short])), pes[short], out)
        functions.extend(bodies); instructions.update(records)
    constants = []
    for address, fmt, expected, name in CONSTANTS:
        raw = pes['SharedBase'].at(address, struct.calcsize('<' + fmt))
        value = struct.unpack('<' + fmt, raw)[0]
        if value != expected:
            raise ValueError('Original clock constant differs: ' + name)
        constants.append({'module': 'SharedBase', 'name': name, 'address': f'{address:08x}', 'bytes': raw.hex(), 'value': value})
    for address, fmt, expected, name in [(0x20685a90, 'f', 12.0, 'PostInitializeFactor'),
        (0x20685cb0, 'd', 86400.0, 'weatherSecondsPerDay'),
        (0x20685ca0, 'd', 365.0, 'weatherDaysPerYear'), (0x2065d8f8, 'f', 4294967296.0, 'weatherUnsignedBias')]:
        raw = pes['Game'].at(address, struct.calcsize('<' + fmt)); value = struct.unpack('<' + fmt, raw)[0]
        if value != expected:
            raise ValueError('Original weather constant differs')
        constants.append({'module': 'Game', 'name': name, 'address': f'{address:08x}', 'bytes': raw.hex(), 'value': value})
    ambient = pes['Game'].at(0x206857d0, 16)
    if struct.unpack('<4I', ambient) != (0, 1, 2, 3):
        raise ValueError('Original ambient daytime lookup differs')
    constants.append({'module': 'Game', 'name': 'ambientDayTime', 'address': '206857d0', 'bytes': ambient.hex(), 'value': [0, 1, 2, 3]})
    setters = {'Year': '2002357e', 'Day': '2000f9bb', 'Hour': '2002b094',
               'Minute': '2002c5a2', 'Second': '20032097', 'Factor': '2002bfdf'}
    for name, entry in setters.items():
        raw = pes['Game'].at(int(entry, 16), 5)
        if raw[0] != 0xe9:
            raise ValueError('Original Clock setter alias differs')
        target = int(entry, 16) + 5 + struct.unpack_from('<i', raw, 1)[0]
        candidates = [row for row in instructions[f'Game:{target:08x}']
                      if len(bytes.fromhex(row['bytes'])) == 5 and row['bytes'].startswith('68')]
        literals = []
        for row in candidates:
            address = struct.unpack_from('<I', bytes.fromhex(row['bytes']), 1)[0]
            if pes['Game'].cstring(address) == name.encode('ascii'):
                literals.append(address)
        if len(literals) != 2 or literals[0] != literals[1]:
            raise ValueError('Original setter property literal differs: ' + name)
        constants.append({'module': 'Game', 'name': 'setterProperty:' + name, 'address': f'{literals[0]:08x}',
                          'bytes': (name.encode('ascii') + b'\0').hex(), 'value': name})
    try:
        pes['Game'].at(0x207bd478, 16)
    except ValueError as error:
        if not str(error).startswith('Not file-backed:'):
            raise
    else:
        raise ValueError('Expected non-file-backed live global bCString array')
    constants.append({'module': 'Game', 'name': 'musicDayTimeLiveCStringArray', 'address': '207bd478',
                      'bytes': None, 'notFileBacked': True, 'liveContentsKnown': False, 'elementBytes': 4, 'elements': 4})
    lookup = {row['address']: row for rows in instructions.values() for row in rows}
    pins = {**PINS, '20208216': 'ff1568807d20', '20208266': '8b4e1c',
        '202082e7': '897e14', '202082ea': '896e18', '202082ed': '895e1c',
        '202082f0': '894620', '202082f3': '895624', '2020831e': 'd95c2418',
        '20208322': 'e88855e0ff', '20208345': 'e803f8e0ff', '2020834c': 'e85075e2ff',
        '20208355': '8d14bd78d47b20', '2020835f': 'e878e5e1ff', '20208372': 'e89ea7e1ff',
        '305a7ea6': 'f30f114130', '20207e96': 'ff1574807d20', '20207e9c': 'f30f104628',
        '20207ebe': 'ff1578807d20', '20207ecd': 'ff1548727d20'}
    for address, expected in pins.items():
        if lookup[address]['bytes'] != expected:
            raise ValueError('Original clock decision instruction differs: ' + address)
    audit = {'functionEntries': len(functions), 'instructionRecords': sum(len(rows) for rows in instructions.values()),
             'matchedInstructionBytes': sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows),
             'allListedInstructionBytesMatchOriginalPE': True, 'selectedFunctionScopeOnly': True,
             'nativeCodeExecuted': False, 'testsExecuted': False, 'buildExecuted': False, 'browserExecuted': False}
    save_json(out / 'native-evidence.json', {'schema': 'gothic3-clock-properties-evidence-v1',
        'inputs': inputs, 'functions': functions, 'instructions': instructions, 'importBindings': bindings,
        'vtable': {'address': '206858fc', 'entries': vtable}, 'constants': constants,
        'decisionInstructions': [lookup[address] for address in pins], 'audit': audit})
    seed = original_seed(study, out, public)
    rules = {'schema': 'gothic3-clock-properties-rules-v1', 'inputs': {key: value['sha256'] for key, value in inputs.items()},
        'profile': 'one-physical-original-gCClock_PS-finite-explicit-clock-profile', 'vtable': '206858fc',
        'propertyOffsets': OFFSETS, 'propertyType': 32, 'isProcessable': True,
        'embeddedClockOffset': 0x2c, 'scratchOffsets': {'years': 0x50, 'days': 0x54, 'seconds': 0x58},
        'secondsPerDay': 86400, 'daysPerYear': 365, 'musicStringsBase': '207bd478', 'ambientDayTime': [0, 1, 2, 3],
        'constructor': {'baseReferenceWord': 1, 'scratch': {'years': 0, 'days': 0, 'seconds': 0},
            'clock': 'constructor then Set zero', 'propertyValuesWrittenByConstructor': False,
            'PostInitializeProperties': {'Year': 0, 'Day': 0, 'Hour': 0, 'Minute': 0, 'Second': 0, 'Factor': 12},
            'postInitializeDoesNotAdjustEmbeddedClock': True},
        'physicalBinding': 'lowercase calendar accessor view aliases exact existing Uppercase value storage; one binding per clock and values object',
        'setters': 'NotifyEnter(name,false); property write; NotifyExit(name,false); no direct Process publication',
        'notifications': {'outer': 'owner.Modified read; virtual OnNotify',
            'inheritedEnterExit': 'owner.Modified read; SharedBase true',
            'nonpropagatedClockExit': ['scratch.seconds from wrapping calendar seconds', 'scratch.days from Day',
                'scratch.years from Year', 'bCClock.Set(same scratch)', 'read current Factor', 'bCClock.Adjust', 'inherited Engine Exit'],
            'propagatedClockExit': 'inherited Engine Exit only', 'propertyFilter': None},
        'Read': 'consume arbitrary uint16 version; direct virtual OnNotifyExit(NULL,false); return1; no inherited base.Read call',
        'Create': 'if invalid, Pause then base.Create highbit; return1',
        'Invalidate': 'scratch.seconds=0; days=0; years=0; bCClock.Set; property fields and adjustment remain',
        'processOrder': ['base.OnProcess(empty)', 'bCClock.GetTimeAndDate(same scratch)',
            'capture old property Hour after advancing read', 'classify old and new uint32 Hour',
            'direct publication Year/Day/Hour/Minute/Second without Notify',
            'weather float32 computation, regardless of module existence', 'GetWeatherAdmin', 'SetCurrentDayTime if nonnull',
            'if daytime changed capture AmbientModule then MusicModule', 'Music.SetDayTime if captured music nonnull',
            'Ambient.SetDayTime if captured ambient nonnull'],
        'weatherSetter': 'Engine3004070f->305a7ea0 direct storedfloat32 write admin+0x30; actual supplied storage wrapper available',
        'hostConsumerContracts': {'moduleGetters': 'original IsInitialised gate then static cached FindModule/RTDynamicCast effect; unknown is not null',
            'music': 'captured module pointer and exact live global bCString reference; full native music system/sequencer/trigger subcalls are host work',
            'ambient': 'captured module pointer and enum; full native system/sequencer/property-container/notification subcalls are host work'},
        'arithmeticProfile': {'precisionBits': [24, 53, 64], 'rounding': 'nearest-even', 'capturedNativeControlWord': False,
            'timestamps': 'selected monotonic u32 milliseconds, fewer than2^32ms between related reads; no timestamp callback reentrant clock mutation',
            'finiteOnly': True, 'nativeFPUExceptionEnvironmentPorted': False},
        'lifetimeProfile': 'stable live concrete Clock_PS and physical plain data storage during a call; owner slot may be reread; reentrant consumer setters permitted, recursive OnProcess unsupported',
        'remaining': ['full original reflective construction/deserialization/entity scheduling', 'original module lookup/cache/app registration services',
            'music and ambient systems, sequencers and trigger payload consumers', 'live contents of global music daytime strings',
            'savegame clock baseline restoration and copy/destructor paths', 'captured active native x87 environment and exceptions'],
        'audit': audit}
    save_json(public / 'runtime-rules.json', rules)
    save_json(out / 'runtime-rules.json', rules)
    seed_receipt = receipt(public / 'serialized-clock.json'); seed_receipt['path'] = 'serialized-clock.json'
    save_json(out / 'manifest.json', {'schema': 'gothic3-clock-properties-manifest-v1',
        'seed': seed_receipt, 'rules': receipt(public / 'runtime-rules.json'),
        'nativeEvidence': receipt(out / 'native-evidence.json'), 'seedEvidence': receipt(out / 'seed-evidence.json'), 'audit': audit})
    (out / 'README.txt').write_text(
        'Original Clock_PS selected native instruction bytes and serialized World_MCP values are audited offline.\n'
        'Uppercase properties, lower clock published calendar view, scratch and base referenceWord retain physical identity.\n'
        'Setters Notify enter/write/exit rebuild date and adjustment; Process publishes directly then dispatches ordered consumers.\n'
        'Module lookup caches, initialized application gate, music/ambient services and live music strings require actual host effects.\n'
        'Unknown consumers stop with recorded attempted/applied prefix. No missing service is inferred absent.\n'
        'Clock arithmetic requires explicit finite nearest-even precision and monotonic timestamp profile; active native FPU is not captured.\n'
        'Historical clock receipts are preserved. This receipt pins the current shared world-clock.ts extension.\n'
        'No native code, tests, build or browser was run. Producer audits listed original instructions and source bytes only.\n', encoding='utf8', newline='\n')
    files = [ROOT / 'src/gothic3/clock-properties.ts', ROOT / 'src/gothic3/world-clock.ts', Path(__file__).resolve(),
             ROOT / 'tools/gothic3/research_native_clock.py', ROOT / 'tools/gothic3/research_native_combat.py',
             ROOT / 'tools/gothic3/research_native_inventory.py', ROOT / 'tools/gothic3/read_gameplay_properties.py',
             ROOT / 'tools/gothic3/read_genome.py']
    outputs = [path for base in (out, public) for path in base.rglob('*') if path.is_file() and path.name != 'implementation-receipt.json']
    save_json(out / 'implementation-receipt.json', {'schema': 'gothic3-clock-properties-implementation-receipt-v1',
        'implementationAndProducer': [receipt(path) for path in files], 'outputs': [receipt(path) for path in sorted(outputs)],
        'audit': audit, 'claims': {'onePhysicalPropertyStore': True, 'originalLoadedSeedValuesVerified': len(seed['values']),
            'entireNativeEntityReadExecuted': False, 'fullClockConsumersImplemented': False,
            'historicalClockReceiptsRetained': True, 'typecheckClaim': 'not performed by producer'}})
    print(json.dumps({**audit, 'sourcePropertyValues': len(seed['values']), 'outputFiles': len(outputs)}))


if __name__ == '__main__':
    main()
