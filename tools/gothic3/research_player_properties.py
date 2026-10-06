"""Recover original player memory and attribute setters using offline PE bytes.

Only assets/public Gothic3 player-properties output namespaces are written.
No original code is loaded/executed; no tests, builds or browser runs occur.
"""
from __future__ import annotations

import argparse
import copy
import csv
import json
import struct
from pathlib import Path

from research_native_combat import PE, INPUTS, SHORT, SUPPORTED_SHA256, collect_module, save_json, sha
from read_gameplay_properties import _genome_strings, decode_property

INPUTS['SharedBase_dll'] = '00_Original_Runtime/SharedBase.dll'
SHORT['SharedBase_dll'] = 'SharedBase'
SUPPORTED_SHA256['SharedBase'] = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'

SCRIPT_GAME = '''10045c90 10045b20 100462a0 100461d0 10046960 100467f0
100443c0 10044490 10044560 10044700 100447d0 10044630
10044f00 10044fd0 100450a0 10045170 10045240 10045310 100cfb70'''.split()
MEMORY_METHODS = {'GetAttribute', 'SetValue', 'GetValue', 'SetBaseValue', 'GetBaseValue',
                  'SetMaximum', 'GetMaximum', 'SetModifier', 'GetModifier',
                  'AddModifier', 'AddValue', 'AddBaseValue', 'AddMaximum',
                  'SetChapter', 'GetChapter', 'AccessChapter', 'SetLPAttribs', 'GetLPAttribs',
                  'AccessLPAttribs', 'SetLPPerks', 'GetLPPerks', 'SetXP', 'GetXP',
                  'SetTutorialFlags', 'GetTutorialFlags', 'EnableTutorial', 'IsTutorialEnabled',
                  'GetAttributes', 'gCPlayerMemory_PS', 'CreateAttributes', 'CreateAttrib',
                  'CreateStat', 'Invalidate', 'Read', 'ReadAttributes', 'PostInitializeProperties',
                  'OnPostRead', 'OnSaveGameEntityPostRead', 'ReadSaveGame', 'ApplyMod', 'UnapplyMod'}

RAW_HERO_SHA = '04fa72fc5b71d6ba227836a21226068ffcea2685c36ee4c927e40ecf377c32aa'
WORLD_SHA = '28f7273b3d54415b84445651a3dfa962c1ff158e9183deba81ba47e4d5d57938'
GUID = '054d6e4a5f059340bc5c2ca0cca6674500000000'
TAGS = {'STR', 'DEX', 'INT', 'SMT', 'THF', 'ALC', 'PROT_BLADE', 'PROT_IMPACT',
        'PROT_MISSILE', 'PROT_FIRE', 'PROT_ICE', 'PROT_LIGHTNING', 'HP', 'MP', 'SP'}
STARTUP = [
    ('SetHitPointsMax', 'HP', 'Maximum', '10045c90', 200),
    ('SetHitPoints', 'HP', 'BaseValue', '10045b20', 200),
    ('SetManaPointsMax', 'MP', 'Maximum', '100462a0', 100),
    ('SetManaPoints', 'MP', 'BaseValue', '100461d0', 100),
    ('SetStaminaPointsMax', 'SP', 'Maximum', '10046960', 100),
    ('SetStaminaPoints', 'SP', 'BaseValue', '100467f0', 100),
    ('SetStrength', 'STR', 'BaseValue', '100443c0', 100),
    ('SetDexterity', 'DEX', 'BaseValue', '10044490', 100),
    ('SetIntelligence', 'INT', 'BaseValue', '10044560', 0),
    ('SetSmithing', 'SMT', 'BaseValue', '10044700', 10),
    ('SetTheft', 'THF', 'BaseValue', '100447d0', 10),
    ('SetAlchemy', 'ALC', 'BaseValue', '10044630', 10),
    ('SetProtectionBlades', 'PROT_BLADE', 'BaseValue', '10044f00', 0),
    ('SetProtectionImpact', 'PROT_IMPACT', 'BaseValue', '10044fd0', 0),
    ('SetProtectionMissile', 'PROT_MISSILE', 'BaseValue', '100450a0', 0),
    ('SetProtectionFire', 'PROT_FIRE', 'BaseValue', '10045170', 0),
    ('SetProtectionIce', 'PROT_ICE', 'BaseValue', '10045240', 0),
    ('SetProtectionLightning', 'PROT_LIGHTNING', 'BaseValue', '10045310', 0),
]


def namespace(root, prefix):
    target = root / prefix
    for candidate in [target, *target.parents]:
        if candidate == root:
            break
        if candidate.exists() and candidate.is_symlink():
            raise ValueError('Output namespace includes a symbolic link: ' + str(candidate))
    target.mkdir(parents=True, exist_ok=True)
    if target.resolve() != target or not target.is_relative_to(root):
        raise ValueError('Output namespace leaves this checkout')
    for candidate in target.rglob('*'):
        if candidate.is_symlink():
            raise ValueError('Owned output contains a symbolic link: ' + str(candidate))
    return target


def original_hero(study, root, out, public):
    source = root.parent / 'gothic3_gameplay_raw/initial/ardea-people.json'
    if sha(source) != RAW_HERO_SHA:
        raise ValueError('Unsupported lossless original hero export')
    entities = json.loads(source.read_text(encoding='utf8'))
    heroes = [e for e in entities if e['name'] == 'PC_Hero' and e['guid'] == GUID]
    if len(heroes) != 1:
        raise ValueError('Expected one original PC_Hero')
    hero = heroes[0]
    native = study / '02_Unpacked_Data/Archives' / hero['source']['archive'] / hero['source']['path']
    if sha(native) != WORLD_SHA or hero['source']['sha256'] != WORLD_SHA:
        raise ValueError('Original hero world source differs')
    data = native.read_bytes()
    cursor, boundary, string_meta = _genome_strings(data)
    string_refs, byte_checks = {}, []

    def check(offset, raw, label):
        value = bytes.fromhex(raw)
        if not isinstance(offset, int) or offset < 0 or offset + len(value) > boundary or data[offset:offset+len(value)] != value:
            raise ValueError('Original hero record bytes differ: ' + label)
        byte_checks.append({'label': label, 'sourceOffset': offset, 'bytes': len(value), 'raw': raw})

    def string(index, value, label):
        if cursor.strings[index] != value:
            raise ValueError('Original string table differs: ' + label)
        string_refs[str(index)] = value

    def record(record, outer=False):
        label = record['name']
        meta = record['serialization']
        check(meta['sourceOffset'], meta['headerRaw'], label + '/header')
        header = bytes.fromhex(meta['headerRaw'])
        string(struct.unpack_from('<H', header, 8 if outer else 6)[0], label, label + '/class')
        values = {}
        for prop in record['properties']:
            pm = prop['serialization']
            string(pm['nameStringIndex'], prop['name'], label + '/property-name')
            string(pm['typeStringIndex'], prop['type'], label + '/property-type')
            check(pm['recordSourceOffset'], pm['recordHeaderRaw'], label + '/' + prop['name'] + '/header')
            check(pm['sourceOffset'], prop['raw'], label + '/' + prop['name'])
            decoded = decode_property(prop, cursor.strings, offsets=pm)
            if decoded['status'] != 'decoded' or decoded['value'] != prop['value']:
                raise ValueError('Native property decode differs: ' + label + '/' + prop['name'])
            values[prop['name']] = copy.deepcopy(decoded['value'])
        check(record['tail']['sourceOffset'], record['tail']['raw'], label + '/tail')
        return values

    memories = [r for r in hero['propertySets'] if r['name'] == 'gCPlayerMemory_PS']
    if len(memories) != 1 or memories[0]['version'] != 5:
        raise ValueError('Original PlayerMemory version differs')
    memory = memories[0]
    values = record(memory, outer=True)
    tail = memory['tail']
    attributes = []
    if struct.unpack_from('<i', bytes.fromhex(tail['raw']))[0] != 15:
        raise ValueError('Original attribute count differs')
    for entry in tail['value']['attributes']:
        raw_key = data[entry['sourceOffset']:entry['sourceOffset']+2]
        if struct.unpack('<H', raw_key)[0] != entry['keyStringIndex']:
            raise ValueError('Original attribute map key bytes differ')
        check(entry['sourceOffset'], raw_key.hex(), 'attribute-map-key/' + entry['key'])
        string(entry['keyStringIndex'], entry['key'], 'attribute-map-key')
        attr_values = record(entry['record'])
        kind = entry['record']['name']
        expected = {'Tag', 'Modifier', 'Value'} | ({'BaseMaximum', 'MaximumModifier'} if kind == 'gCStat' else set())
        if kind not in ('gCAttribute', 'gCStat') or set(attr_values) != expected or attr_values['Tag'] != entry['key'] or (kind == 'gCStat') != (entry['key'] in {'HP', 'MP', 'SP'}):
            raise ValueError('Original concrete attribute type/fields differ')
        attributes.append({'key': entry['key'], 'kind': kind, 'sourceOffset': entry['record']['serialization']['sourceOffset'], 'values': attr_values})
    if len(attributes) != 15 or {a['key'] for a in attributes} != TAGS:
        raise ValueError('Incomplete original loaded attribute map')
    seed = {'schema': 'gothic3-original-player-property-seed-v1', 'phase': 'serialized-before-OnGameStartUp',
            'entity': {'key': hero['key'], 'name': 'PC_Hero', 'guid20': GUID},
            'source': {'archive': hero['source']['archive'], 'path': hero['source']['path'], 'sha256': WORLD_SHA,
                       'propertySetSourceOffset': memory['serialization']['sourceOffset']},
            'memory': values, 'attributes': attributes,
            'audit': {'originalRecordBytesMatch': True, 'attributes': 15, 'propertySetVersion': 5,
                      'sourceByteChecks': len(byte_checks), 'propertyValues': len(memory['properties']) + sum(len(e['record']['properties']) for e in tail['value']['attributes']),
                      'nativeReadExecuted': False, 'startupExecuted': False}}
    save_json(public / 'serialized-hero.json', seed)
    save_json(out / 'seed-evidence.json', {'schema': 'gothic3-player-property-seed-evidence-v1',
        'export': {'path': '../gothic3_gameplay_raw/initial/ardea-people.json', 'sha256': RAW_HERO_SHA},
        'native': {'path': str(native.relative_to(study)).replace('\\', '/'), 'sha256': WORLD_SHA,
                   'bytes': len(data), 'stringTable': string_meta, 'stringTableBoundary': boundary},
        'originalPlayerMemoryRecord': memory, 'stringReferences': string_refs, 'byteChecks': byte_checks,
        'audit': seed['audit']})
    return seed


def receipt(root, path):
    return {'path': path.relative_to(root).as_posix(), 'bytes': path.stat().st_size, 'sha256': sha(path)}


def runtime_rules(inputs):
    return {'schema': 'gothic3-player-properties-rules-v1', 'inputs': inputs,
        'profile': 'original-loaded-valid-PC_Hero-PlayerMemory-gCAttribute-gCStat',
        'physicalStorage': {'sharedByStartupHudRoutineAndCombat': True, 'entityPS': 'gCPlayerMemory_PS',
                            'attributeObjectKinds': ['gCAttribute', 'gCStat'], 'missingMapEntryGetter': 0,
                            'lookupStringComparison': 'case-sensitive', 'mapIterationOrderPorted': False},
        'attributeFields': {'Tag': 12, 'Modifier': 16, 'Value': 20},
        'statFields': {'BaseMaximum': 24, 'MaximumModifier': 28},
        'constructorDefaults': {'gCAttribute': {'Tag': '', 'Modifier': 0, 'Value': 100},
                                'gCStat': {'Tag': '', 'Modifier': 0, 'Value': 100, 'BaseMaximum': 100, 'MaximumModifier': 0}},
        'loadedRecord': {'version': 5, 'readDispatch': 'Game:20014268->2000ed22',
                         'attributes': 15, 'source': WORLD_SHA, 'phase': 'before OnGameStartUp'},
        'notifications': {'attributeEnter': ['SharedBase:10001186', 'SharedBase:10008805'],
                          'attributeExit': ['SharedBase:10005a65', 'Game:2002e2b2', 'virtual Cap unless propagated'],
                          'attributeEntityOwnerModified': False,
                          'playerMemoryScalar': 'OriginalEntityPropertySet exact captured receiver, Notify enter/write/exit',
                          'directStatSetterInventoryNotifications': []},
        'startupSetters': [{'setter': s, 'tag': t, 'nativeFieldOperation': f, 'source': 'Script_Game:'+a, 'startupValue': v} for s,t,f,a,v in STARTUP],
        'hitAndStaminaPoints': {'setCurrent': 'read current (discard); read max; clamp request to0..oldMax; SetBaseValue',
                               'setMaximum': 'read current; read max (discard); SetBaseValue(max(0,current)); SetMaximum(request)'},
        'maximumManaPoints': 'SetMaximum(request) directly',
        'integerArithmetic': 'signed32 add/sub/multiply wrap; signed division truncates toward zero',
        'temporaryModifiers': {'ordinarySupportedOperation': 0,
            'statOperation1': 'mutate MaximumModifier, Cap, then base returns false',
            'statOperation2': 'required native warning host, then base returns false',
            'statOperation3': 'signed magic divide argument by100 first (negated division for unapply), FILD/FIMUL BaseMaximum, convert, add MaximumModifier, Cap, then base false',
            'percentageConversion': {'source': 'Game:20465320', 'liveFlagAddress': '207d2b50',
                                     'supportedProduct': 'signed32 integer exactly representable as binary32; all x87 precision/rounding modes and both conversion branches agree',
                                     'outOfRangeOrNonBinary32ExactProduct': 'unsupported before write; native FPU precision/rounding and CPU conversion flag are not known'}},
        'permanentStatOperation5': 'preserve original SetMaximum(oldMaximum); only increase current when requested-old is positive',
        'nativeFalseMayFollowAppliedEffects': True,
        'tutorial': {'enableTrue': 'clear mask bits', 'enableFalse': 'set mask bits',
                     'query': 'mask != (TutorialFlags & mask)', 'directMaskWriteNotifies': False},
        'remaining': ['Entity/Script wrapper attachment, validity and transformed/DamageReceiver branches belong to session host',
                      'Loaded source values are retained; original deserialization/logging/AddRef and whole entity PostRead lifecycle are not executed by the seed loader',
                      'Equipment category/slot selection, modifier enumeration/application callers and inventory observer completeness are separate dependencies',
                      'Live native FPU precision/rounding is required for temporary percentage integer product not exactly representable as binary32; CPU conversion flag207d2b50 additionally matters outside signed32',
                      'Other PlayerMemory gameplay actions and unexamined derived attribute vtables are unsupported'],
        'audit': {'nativeCodeExecuted': False, 'testsExecuted': False, 'buildExecuted': False, 'browserExecuted': False}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    out = namespace(root, 'assets/gothic3/player-properties')
    public = namespace(root, 'public/gothic3/player-properties')
    functions, instructions, inputs = [], {}, {}
    vtables, data_pins = [], []
    for module, short in [('Game_dll', 'Game'), ('Script_dll', 'Script'), ('scripts__Script_Game_dll', 'Script_Game'), ('SharedBase_dll', 'SharedBase')]:
        binary = args.study / INPUTS[module]
        if sha(binary) != SUPPORTED_SHA256[short]:
            raise ValueError('Unsupported original ' + short)
        pe = PE(binary)
        with (args.study / '01_Decompiled_Code' / module / 'functions.csv').open(encoding='utf-8-sig', newline='') as handle:
            rows = list(csv.DictReader(handle))
        if short == 'Script_Game':
            selected = set(SCRIPT_GAME)
        elif short == 'Script':
            selected = {row['address'] for row in rows if row['qualified_name'].startswith('PSPlayerMemory::') and
                        (row['qualified_name'].split('::')[1].startswith(('Get', 'Set', 'PropertyChapter', 'PropertyLPAttribs', 'PropertyLPPerks', 'PropertyXP')) or
                         row['qualified_name'].split('::')[1] == 'IsValid')}
        elif short == 'SharedBase':
            selected = set('10001186 10005a65 10008805 100027de'.split())
        else:
            selected = {row['address'] for row in rows if row['qualified_name'].startswith(('gCAttribute::', 'gCStat::')) or
                        (row['qualified_name'].startswith('gCPlayerMemory_PS::') and row['qualified_name'].split('::')[1] in MEMORY_METHODS)}
        if short == 'Game':
            selected.update(['203214f0', '20321560', '20320af0', '20465320'])
            for name, address in [('gCAttribute', 0x2065da7c), ('gCStat', 0x2065db4c)]:
                entries = []
                for offset in [0x4c, 0x50, 0x58, 0x5c, 0x60, 0x64, 0x68, 0x6c, 0x70, 0x74, 0x78, 0x7c, 0x80]:
                    raw = pe.at(address + offset, 4)
                    target = f'{struct.unpack("<I", raw)[0]:08x}'
                    entries.append({'offset': offset, 'address': f'{address+offset:08x}', 'bytes': raw.hex(), 'target': target})
                    selected.add(target)
                vtables.append({'class': name, 'vtableAddress': f'{address:08x}', 'entries': entries})
            for label, address, length in [('gCStat::ApplyPerm switch table', 0x2039b0ac, 32)]:
                data_pins.append({'label': label, 'address': f'{address:08x}', 'bytes': pe.at(address, length).hex()})
            # This is virtual section storage, not file-backed PE data. Pin the
            # referring CMP instruction above; do not manufacture original bytes
            # or infer the live flag after the CPU feature initialization.
            try:
                pe.at(0x207d2b50, 4)
            except ValueError as exc:
                if not str(exc).startswith('Not file-backed:'):
                    raise
            else:
                raise ValueError('Expected non-file-backed live conversion flag')
            data_pins.append({'label': 'live conversion CPU flag', 'address': '207d2b50',
                              'bytes': None, 'notFileBacked': True, 'liveValueKnown': False})
            for address in [0x206a2f88, 0x206a2fe0]:
                raw = pe.cstring(address)
                data_pins.append({'label': 'stat modifier warning string', 'address': f'{address:08x}',
                                  'bytes': (raw+b'\0').hex(), 'value': raw.decode('cp1252')})
        f, i, _ = collect_module(args.study, module, selected, pe, out)
        functions.extend(f); instructions.update(i)
        inputs[short] = {'path': INPUTS[module], 'sha256': sha(binary)}
    audit = {'entries': len(functions), 'instructions': sum(len(rows) for rows in instructions.values()),
             'matchedBytes': sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows),
             'allListedInstructionBytesMatchOriginalPE': True, 'nativeCodeExecuted': False,
             'testsExecuted': False, 'buildExecuted': False, 'browserExecuted': False}
    save_json(out / 'native-evidence.json', {'schema': 'gothic3-player-properties-evidence-v1',
                                           'inputs': inputs, 'functions': functions,
                                           'instructions': instructions, 'audit': audit, 'vtables': vtables, 'dataPins': data_pins})
    seed = original_hero(args.study, root, out, public)
    save_json(public / 'runtime-rules.json', runtime_rules(inputs))
    save_json(out / 'manifest.json', {'schema': 'gothic3-player-properties-manifest-v1',
        'inputs': inputs, 'allListedInstructionBytesMatchOriginalPE': True,
        'hero': receipt(root, public / 'serialized-hero.json'), 'rules': receipt(root, public / 'runtime-rules.json'),
        'nativeEvidence': receipt(root, out / 'native-evidence.json'), 'seedEvidence': receipt(root, out / 'seed-evidence.json'),
        'audit': {**audit, 'sourceSeedAttributes': seed['audit']['attributes'], 'sourcePropertyValues': seed['audit']['propertyValues']}})
    implementation = root / 'src/gothic3/player-properties.ts'
    files = [implementation, Path(__file__).resolve(), root / 'tools/gothic3/research_native_combat.py',
             root / 'tools/gothic3/read_gameplay_properties.py', root / 'tools/gothic3/read_genome.py']
    outputs = [p for base in (out, public) for p in base.rglob('*') if p.is_file() and p.name != 'implementation-receipt.json']
    save_json(out / 'implementation-receipt.json', {'schema': 'gothic3-player-properties-implementation-receipt-v1',
        'implementationAndProducer': [receipt(root, p) for p in files],
        'outputs': [receipt(root, p) for p in sorted(outputs)],
        'audit': audit, 'claims': {'originalLoadedSeedBytesVerified': True,
            'entireNativeEntityReadExecuted': False, 'fullInventoryRegistryCertified': False,
            'selectedFunctionInstructionScopeOnly': True, 'typecheckClaim': 'not performed by producer'}})
    print({**audit, 'sourceSeedAttributes': seed['audit']['attributes'], 'sourcePropertyValues': seed['audit']['propertyValues'], 'outputFiles': len(outputs)})


if __name__ == '__main__':
    main()
