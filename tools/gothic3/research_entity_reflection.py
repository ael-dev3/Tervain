"""Reproduce bounded original reflective loader/class/property evidence offline.

Python 3.10+, stdlib only. Reads immutable original PEs and exported study text;
never loads native code. Outputs are restricted to entity-reflection namespaces.
The original entity records are serialized candidates, not resident objects.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import re
import shutil
import struct
import sys
from pathlib import Path

from research_native_combat import PE, cblocks, save_json, sha
from research_native_clock import collect
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from read_gameplay_properties import Cursor, _genome_strings, _read_native_entity

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/gothic3/entity-reflection'
PUBLIC = ROOT / 'public/gothic3/entity-reflection'
INPUTS = {
    'SharedBase': ('SharedBase_dll', 'SharedBase.dll', '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'),
    'Engine': ('Engine_dll', 'Engine.dll', 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'),
    'Game': ('Game_dll', 'Game.dll', 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'),
}
SELECT = {
    'SharedBase': '''100052f9 1000166d 10001a28 1000156e 10002455 100025d6
1000437c 10001e60 1000393b 1000376a 10004435 1000191f 10090c90 10004fd4
10007130 10002473 10004b74 10006636 100058a3 10003922 100056e6 10003ed6
10002f68 10005b73 10002c02 10002649 10006997 10006db6 10004db3 10006feb
10004aac 10001f23 100020e5 10001d07 10004ea3 1000235b 100030da 10004e99
1000551a 10007e8c 1000117c 10005d35 100043fe 10006861 10006f41 10005e48
100068b6 10007356 10006cd5 10004b6f 100059cf 10006708 10001159 1000355d
10003049 100039ea 10004566 100088cd 100085e9 10008cba 100032b5'''.split(),
    'Game': '''200198c1 20209470 20209f20 202090f0 202095d0 202095c0
2020b3d0 2020b0e0 20209360 20208970 20208560 20208160 20208c70 20208d10
20208d20 20208d30 20208650 20208660 2020a4b0 2020ad40 2020a700 2020afa0
2020a150 2020a9e0 2020a290 2020ab20 200339fb 20005e11 2000813e 20031615
2002d731 200187fa 20023e7a 20007130 20007090 2001997f 204fc660'''.split(),
    'Engine': ['300025bd', '30771900', '30440210'],
}
WORLD_PATH = 'G3_World_01/SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}/SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}.lrentdat'
WORLD_SHA = '28f7273b3d54415b84445651a3dfa962c1ff158e9183deba81ba47e4d5d57938'
CLASS_NAMES = '''gCNavigation_PS eCRigidBody_PS eCCollisionShape_PS gCCharacterMovement_PS
gCCharacterControl_PS gCCharacterSensor_PS gCNPC_PS gCInventory_PS gCScriptRoutine_PS
gCInteraction_PS gCDamage_PS gCDamageReceiver_PS gCFocus_PS gCPlayerMemory_PS gCDialog_PS
eCIlluminated_PS gCParty_PS gCEffect_PS eCVisualAnimation_PS gCClock_PS eCEntityPropertySet'''.split()


def source_catalog(study, selections):
    candidates = []
    base_registrars = []
    for short in ('Game', 'Engine'):
        directory = study / '01_Decompiled_Code' / INPUTS[short][0]
        for path in sorted((directory / 'pseudocode').glob('*.c')):
            for entry, block, _ in cblocks(path):
                match = re.search(r'&([eg]C\w+_PS|eCEntityPropertySet)::ms_PropertyMember_', block)
                if match and match[1] in CLASS_NAMES and 'RegisterPropertyTemplate' in block:
                    prefix = block.split('bCPropertyTypeBase::bCPropertyTypeBase', 1)[0]
                    names = re.findall(r'bCString::bCString\([^;]*?,\s*"([^"\n]*)"\)', prefix)
                    if not names:
                        raise ValueError('Ambiguous native property registrar ' + entry)
                    template = re.search(r'bTPropertyType<(.+?)>::', block)
                    if not template:
                        raise ValueError('No original property datatype: ' + entry)
                    candidates.append({'module': short, 'entry': entry, 'className': match[1],
                                       'name': names[-1], 'cppType': template[1].split(',', 1)[1]})
                    selections[short].add(entry)
                    if match[1] == 'eCEntityPropertySet':
                        base_registrars.append(entry)
        # Select actual derived constructor/Create/Read/version and class type
        # functions for the focused families; evidence does not imply ports.
        with (directory / 'functions.csv').open(encoding='utf-8-sig', newline='') as file:
            rows = list(csv.DictReader(file))
        for row in rows:
            if row['status'] != 'decompiled':
                continue
            name = row['qualified_name']
            for class_name in CLASS_NAMES:
                if name in [class_name + '::' + class_name, class_name + '::Create',
                            class_name + '::Read', class_name + '::GetVersion']:
                    selections[short].add(row['address'])
    if base_registrars:
        raise ValueError('The inherited empty entity property table profile changed')
    return candidates


def pin_vtable(pe, imports, export_maps, address, length):
    result = []
    for offset in range(0, length, 4):
        raw = pe.at(address + offset, 4)
        target = struct.unpack('<I', raw)[0]
        item = {'offset': offset, 'bytes': raw.hex(), 'target': f'{target:08x}'}
        if target:
            code = pe.at(target, 6)
            if code[:2] == b'\xff\x25':
                slot = struct.unpack_from('<I', code, 2)[0]
                imp = imports[slot]
                module = imp['library'].removesuffix('.dll')
                item['importThunkBytes'] = code.hex()
                item['importSlot'] = f'{slot:08x}'
                item['import'] = imp
                item['implementation'] = module + ':' + f"{export_maps[module][imp['decoratedName']]:08x}"
        result.append(item)
    return {'address': f'{address:08x}', 'entries': result}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    study = args.study.resolve()
    OUT.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    selections = {key: set(value) for key, value in SELECT.items()}
    # Reproduce previously selected exploratory excerpts as well.
    for short in INPUTS:
        selections[short].update(path.stem.removesuffix('.c') for path in (OUT / 'sources' / short).glob('*.c.txt'))
    catalog = source_catalog(study, selections)
    pes, inputs, functions, instructions = {}, {}, [], {}
    for short, (module, filename, expected) in INPUTS.items():
        binary = study / '00_Original_Runtime' / filename
        if sha(binary) != expected:
            raise ValueError('Unsupported original build: ' + short)
        pes[short] = PE(binary)
        inputs[short] = {'path': '00_Original_Runtime/' + filename, 'sha256': expected, 'bytes': binary.stat().st_size}
    export_maps = {short: exports(pe) for short, pe in pes.items()}
    imports = native_imports(pes['Game'])
    vtables = {
        'clockWrapper': pin_vtable(pes['Game'], imports, export_maps, 0x20685bc4, 0x44),
        'clockUInt': pin_vtable(pes['Game'], imports, export_maps, 0x20685cc4, 0x68),
        'clockFloat': pin_vtable(pes['Game'], imports, export_maps, 0x20685d4c, 0x68),
        'clockNative': pin_vtable(pes['Game'], imports, export_maps, 0x206858fc, 0x150),
    }
    for table in vtables.values():
        for item in table['entries']:
            if item.get('implementation'):
                short, entry = item['implementation'].split(':')
                selections[short].add(entry)
            elif item['target'] != '00000000':
                selections['Game'].add(item['target'])
    for short, (module, _, _) in INPUTS.items():
        bodies, records = collect(study, short, module, ' '.join(sorted(selections[short])), pes[short], OUT)
        functions.extend(bodies)
        instructions.update(records)
    for item in catalog:
        body = instructions[item['module'] + ':' + item['entry']]
        stores = {}
        zero_registers = set()
        for row in body:
            zero = re.fullmatch(r'XOR (E[ABCD]X|ESI|EDI|EBP),\1', row['assembly'])
            if zero:
                zero_registers.add(zero[1])
            match = re.fullmatch(r'MOV dword ptr \[0x([0-9a-f]+)\],0x([0-9a-f]+)', row['assembly'])
            if match:
                stores[int(match[1], 16)] = (int(match[2], 16), row)
            register_store = re.fullmatch(r'MOV dword ptr \[0x([0-9a-f]+)\],(ESI|EDI|EBX|EBP)', row['assembly'])
            if register_store and register_store[2] in zero_registers:
                stores[int(register_store[1], 16)] = (0, row)
            overwritten = re.match(r'(?:MOV|LEA|POP) (ESI|EDI|EBX|EBP),', row['assembly'])
            if overwritten:
                zero_registers.discard(overwritten[1])
        options = [(address, value, row) for address, (value, row) in stores.items()
                   if pes[item['module']].base <= value < pes[item['module']].base + 0x1000000]
        offsets = [(address, value, row) for address, (value, row) in stores.items()
                   if 0 < value < 0x10000 and address + 4 in stores and stores[address + 4][0] == 0]
        if len(options) != 1 or len(offsets) != 1:
            raise ValueError('Native property descriptor stores unresolved: ' + str(item))
        address, vtable, row = options[0]
        offset_address, native_offset, offset_row = offsets[0]
        item.update(descriptor=f'{address:08x}', vtable=f'{vtable:08x}',
                    nativeOffset=native_offset, defaultPointer=stores[offset_address + 4][0],
                    descriptorStore=row, offsetStore=offset_row,
                    defaultStore=stores[offset_address + 4][1])
        # The native registrar's CString input literal is a PE-backed pointer.
        names = []
        for row in body:
            match = re.fullmatch(r'PUSH 0x([0-9a-f]{8})', row['assembly'])
            if match:
                address = int(match[1], 16)
                try:
                    if pes[item['module']].cstring(address).decode('cp1252') == item['name']:
                        names.append({'address': match[1], 'bytes': pes[item['module']].cstring(address).hex() + '00', 'instruction': row})
                except (ValueError, UnicodeError):
                    pass
        if not names:
            raise ValueError('Missing original property name literal')
        item['nameLiteral'] = names[0]
    world = study / '02_Unpacked_Data/Archives/Projects_compiled.p00' / WORLD_PATH
    if sha(world) != WORLD_SHA:
        raise ValueError('Original SysDyn world differs')
    data = world.read_bytes()
    cursor, boundary, genome = _genome_strings(data)
    entities = []
    for index, start, expected_name, expected_count in [(1, 455, 'World_MCP', 13), (371, 1183912, 'PC_Hero', 19)]:
        entity, offsets = _read_native_entity(Cursor(data, cursor.strings, start, base_offset=0), index, False)
        if entity['name'] != expected_name or len(entity['classes']) != expected_count:
            raise ValueError('Focused original entity changed')
        property_sets = []
        for clazz, meta in zip(entity['classes'], offsets):
            begin, end = meta['sourceOffset'], meta['endSourceOffset']
            property_sets.append({'className': clazz['name'], 'outerVersion': meta['outerVersion'],
                'nativeReadVersion': clazz['version'], 'objectVersion': meta['objectVersion'],
                'propertyVersion': meta['propertyVersion'], 'sourceOffset': begin, 'endSourceOffset': end,
                'serializedRaw': data[begin:end + 4].hex(), 'serializedSha256': hashlib.sha256(data[begin:end + 4]).hexdigest(),
                'properties': [{**prop, **position} for prop, position in zip(clazz['properties'], meta['properties'])],
                'tailRaw': clazz['tail'], 'nativeReadOffset': meta['tailSourceOffset'] - 2,
                'worldResident': False})
        entities.append({'name': expected_name, 'sourceIndex': index, 'sourceOffset': start,
                         'worldResident': False, 'propertySets': property_sets})
    serialized = {'schema': 'gothic3-entity-reflection-serialized-v1', 'phase': 'serialized-candidates',
        'worldResident': False, 'source': {'archive': 'Projects_compiled.p00', 'path': WORLD_PATH,
        'sha256': WORLD_SHA, 'bytes': len(data), 'stringTableBoundary': boundary, 'genome': genome},
        'strings': cursor.strings, 'entities': entities}
    clock_fields = sorted([item for item in catalog if item['className'] == 'gCClock_PS'], key=lambda item: int(item['entry'], 16))
    if [item['name'] for item in clock_fields] != ['Year', 'Day', 'Hour', 'Minute', 'Second', 'Factor'] or [item['nativeOffset'] for item in clock_fields] != [20, 24, 28, 32, 36, 40]:
        raise ValueError('Clock property registry differs')
    # Actual PE initializer pointer sequence establishes append order, rather
    # than treating serialized order or increasing addresses as proof.
    sequence = struct.pack('<I', 0x204fc660) + b''.join(struct.pack('<I', int(item['entry'], 16)) for item in clock_fields)
    positions = []
    for rva, size, offset in pes['Game'].sections:
        raw = pes['Game'].data[offset:offset + size]
        at = raw.find(sequence)
        if at >= 0:
            positions.append({'address': f'{pes["Game"].base + rva + at:08x}', 'bytes': sequence.hex()})
    if len(positions) != 1:
        raise ValueError('Clock original static property registration order unresolved')
    rules = {'schema': 'gothic3-entity-reflection-rules-v1', 'inputs': {key: value['sha256'] for key, value in inputs.items()},
        'objectVersion': 83, 'propertyVersion': 30, 'clockVersion': 1, 'clockPropertyType': 32,
        'clockWrapperVtable': '20685bc4', 'clockNativeVtable': '206858fc',
        'clockFields': [{'name': item['name'], 'nativeOffset': item['nativeOffset'],
                        'typeName': 'float' if item['name'] == 'Factor' else 'long',
                        'descriptor': item['descriptor'], 'registrar': 'Game:' + item['entry'],
                        'reader': 'Game:2020afa0' if item['name'] == 'Factor' else 'Game:2020a700'} for item in clock_fields],
        'clockRegistryInitializer': positions[0], 'inheritedEntityPropertyTableEmpty': True,
        'supportedProfile': 'successful-allocation; canonical bool; ASCII names; nonpanic creator cleanup; finite float32; detached Clock construction',
        'unresolved': ['Other native property-set clone/constructor/default/Create/Read effects',
                       'Obsolete/mismatched property lazy descriptor/critical section branch',
                       'Last wrapper release deleting destructor and memory admin deletion',
                       'Full entity context load/template patch/world residency']}
    save_json(OUT / 'runtime-rules.json', rules)
    save_json(OUT / 'serialized-candidates.json', serialized)
    unmatched = [{'entity': entity['name'], 'className': ps['className'], 'property': prop['name'],
                  'serializedType': prop['type'], 'sourceOffset': prop['sourceOffset'],
                  'status': 'native registrar not resolved; not a decoded live field'}
                 for entity in entities for ps in entity['propertySets'] if ps['className'] in CLASS_NAMES
                 for prop in ps['properties'] if not any(item['className'] == ps['className'] and item['name'] == prop['name'] for item in catalog)]
    save_json(OUT / 'native-property-schemas.json', {'schema': 'gothic3-native-property-schemas-v1', 'classes': CLASS_NAMES,
                                                  'nativePropertyRegistrars': catalog, 'constructorsPorted': ['gCClock_PS'],
                                                  'unmatchedSerializedProperties': unmatched,
                                                  'serializedCandidateCount': 32, 'worldResident': False})
    evidence = {'schema': 'gothic3-entity-reflection-evidence-v1', 'nativeCodeExecuted': False,
        'inputs': inputs, 'functions': functions, 'instructions': instructions, 'vtables': vtables,
        'clockRegistryInitializer': positions[0], 'nativePropertyRegistrarCount': len(catalog),
        'audit': {'selectedNativeBodies': len(functions), 'instructions': sum(len(value) for value in instructions.values()),
                  'instructionBytes': sum(sum(len(bytes.fromhex(row['bytes'])) for row in value) for value in instructions.values()),
                  'allSelectedInstructionBytesMatchOriginalPE': True}}
    save_json(OUT / 'native-evidence.json', evidence)
    for name in ['runtime-rules.json', 'serialized-candidates.json', 'native-property-schemas.json', 'native-evidence.json']:
        shutil.copyfile(OUT / name, PUBLIC / name)
    manifest = {'schema': 'gothic3-entity-reflection-manifest-v1', 'outputs': [
        {'path': name, 'bytes': (PUBLIC / name).stat().st_size, 'sha256': sha(PUBLIC / name)}
        for name in ['serialized-candidates.json', 'native-property-schemas.json', 'native-evidence.json']]}
    save_json(OUT / 'manifest.json', manifest)
    save_json(PUBLIC / 'manifest.json', manifest)
    paths = [ROOT / 'src/gothic3/entity-reflection.ts', Path(__file__).resolve()]
    paths += [ROOT / 'tools/gothic3' / name for name in ['research_native_clock.py', 'research_native_combat.py',
              'research_native_inventory.py', 'research_entity_lifecycle.py', 'read_gameplay_properties.py', 'read_genome.py']]
    paths += [ROOT / 'src/gothic3' / name for name in ['clock-properties.ts', 'world-clock.ts', 'entity-reading.ts', 'entity-lifecycle.ts', 'native-properties.ts', 'resource.ts']]
    # Pin every local Python helper actually imported, including transitive
    # dependencies needed to reproduce this producer in the retained baseline.
    for module in tuple(sys.modules.values()):
        filename = getattr(module, '__file__', None)
        if filename:
            path = Path(filename).resolve()
            if path.is_file() and path.parent == ROOT / 'tools/gothic3':
                paths.append(path)
    paths += sorted(path for base in [OUT, PUBLIC] for path in base.rglob('*') if path.is_file() and path.name != 'implementation-receipt.json')
    paths = sorted(set(paths))
    receipt = {'schema': 'gothic3-entity-reflection-implementation-receipt-v1',
        'checksActuallyPerformed': ['offline original PE instruction-byte audit', 'offline serialized source-byte/hash audit'],
        'noNativeCodeExecution': True, 'noTestsOrBuildRunByProducer': True,
        'baseline': '48c7ee73', 'audit': evidence['audit'],
        'files': [{'path': path.relative_to(ROOT).as_posix(), 'sha256': sha(path), 'bytes': path.stat().st_size} for path in paths]}
    save_json(OUT / 'implementation-receipt.json', receipt)
    save_json(PUBLIC / 'implementation-receipt.json', receipt)
    print(json.dumps({'audit': evidence['audit'], 'nativePropertyRegistrars': len(catalog),
                      'receiptSha256': sha(OUT / 'implementation-receipt.json')}))


if __name__ == '__main__':
    main()
