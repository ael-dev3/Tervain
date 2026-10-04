# SPDX-License-Identifier: GPL-3.0-only
"""Compile source-backed Gothic 3 gameplay data from a verified local study.

No source binaries are run. Unknown fields, commands and binary property tails
are retained. This is an offline data compiler, not a full gameplay interpreter.
"""
import argparse
from collections import Counter
import hashlib
import gzip
import json
import os
from pathlib import Path
import re
import struct
import sys

from read_gameplay_ini import aligned, boolean, integer, parse_ini, vector
from read_native_gameplay_evidence import recover, SEMANTICS, function_block

for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, 'reconfigure'):
        stream.reconfigure(encoding='utf-8')

SCHEMA = 'gothic3-gameplay-v1'
COMMAND_FIELDS = ['InfoScript_Commands', 'InfoScript_Entities1', 'InfoScript_Entities2',
                  'InfoScript_IDs1', 'InfoScript_IDs2', 'InfoScript_Texts']
COMMAND_NAMES = ['command', 'entity1', 'entity2', 'id1', 'id2', 'text']
COND_NAMES = ['Crime', 'Fight', 'Hello', 'General', 'Overtime', 'Open', 'Activator',
              'Running', 'Delivery', 'PartDelivery', 'Success', 'DoCancel', 'Failed',
              'Cancelled', 'Join', 'Dismiss', 'Teach', 'Trade', 'PickPocket', 'Ready',
              'Lost', 'Reactivator', 'Won', 'MasterThief', 'EnclaveFriend', 'PoliticalFriend',
              'FirstWarn', 'SecondWarn', 'MobJoin', 'SlaveJoin', 'LongTimeNoSee',
              'EnclaveCrime', 'PoliticalCrime', 'MobDismiss', 'Wait', 'Heal']
COND_ENUM = {str(i): name for i, name in enumerate(COND_NAMES)}
COND_ENUM.update({'50': 'NothingToSay', '51': 'End', '52': 'Back'})
INFO_ENUM = {str(i): name for i, name in enumerate(['Refuse', 'Important', 'News', 'Info', 'Parent', 'Comment'])}
QUEST_STATUS = {str(i): name for i, name in enumerate(['Open', 'Running', 'Success', 'Failed', 'Obsolete', 'Cancelled', 'Lost', 'Won'])}
ENUM_LABEL_POLICY = {
    'labels': 'Community g3dit reference labels are unverified for this installed native build.',
    'authoritative': 'Original numeric enum values; never dispatch native behavior by community symbol strings.',
    'knownMismatch': {'enum': 'gEAction', 'value': 24, 'communityLabel': 'HeavyParadeStumble', 'nativeBuildLabel': 'StumbleR'}}


def sha(data): return hashlib.sha256(data).hexdigest()


def source_path(study, relative):
    path = (study / relative).resolve()
    # Extraction intentionally preserves long native resource names. Windows
    # ordinary paths can report an existing file as missing above MAX_PATH.
    if os.name == 'nt' and not str(path).startswith('\\\\?\\'):
        path = Path('\\\\?\\' + str(path))
    return path


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n', encoding='utf-8')


def write_compressed(path, value):
    """Deterministic offline gzip, with both transport and JSON receipts."""
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = (json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False)+'\n').encode('utf-8')
    packed = gzip.compress(raw, compresslevel=9, mtime=0)
    path.write_bytes(packed)
    return {'bytes': len(packed), 'sha256': sha(packed), 'contentEncoding': 'gzip', 'encoding': 'gzip',
            'uncompressedBytes': len(raw), 'uncompressedSha256': sha(raw)}


def source_ref(entry):
    return {'family': entry['family'], 'archive': entry['candidate_effective_archive'],
            'path': entry['logical_path'], 'sha256': entry['sha256'],
            'selection': 'static-effective-layer-candidate',
            'layers': [v['archive'] for v in entry['versions']]}


def read_verified(study, entry):
    relative = Path(entry['candidate_effective_output'])
    if relative.is_absolute() or '..' in relative.parts:
        raise ValueError('Unsafe study-relative source path')
    data = source_path(study, relative).read_bytes()
    if not entry.get('verified') or sha(data) != entry['sha256']:
        raise ValueError(f"Source hash mismatch: {entry['logical_path']}")
    return data


def common_record(parsed, section, entry):
    fields = parsed['sections'].get(section, {})
    issues = list(parsed['issues'])
    if section not in parsed['sections']:
        issues.append({'kind': 'missing-section', 'section': section})
    return fields, issues, {'source': source_ref(entry), 'rawFields': fields,
                            'rawRecords': parsed['records'], 'issues': issues}


def numeric_vector(fields, key, issues):
    return [integer({key: v}, key, issues) for v in vector(fields.get(key, ''))]


def compile_quest(data, entry):
    f, issues, result = common_record(parse_ini(data), 'Quest', entry)
    getnum = lambda key: integer(f, key, issues)
    targets = aligned(f, ['DeliveryEntities', 'DeliveryAmounts', 'DeliveryCounter'], issues)
    result.update({'id': f.get('Name', ''), 'numericType': getnum('Type'),
                   'prereqs': vector(f.get('FinishedQuests', '')),
                   'deliveryTargets': [{'entity': t['DeliveryEntities'],
                       'amount': integer({'v': t['DeliveryAmounts']}, 'v', issues),
                       'initialCounter': integer({'v': t['DeliveryCounter']}, 'v', issues)} for t in targets],
                   'destination': f.get('DestinationEntity', ''), 'folder': f.get('Folder', ''),
                   'logTopic': f.get('LogTopic', ''), 'logText': f.get('LogText', ''),
                   'runningTime': {'years': getnum('RunningTimeYears'), 'days': getnum('RunningTimeDays'), 'hours': getnum('RunningTimeHours')},
                   'rewards': {'experience': getnum('ExperiencePoints'),
                       'political': {'alignment': getnum('PoliticalSuccess'), 'amount': getnum('PoliticalSuccessAmount')},
                       'enclave': {'name': f.get('EnclaveSuccess', ''), 'amount': getnum('EnclaveSuccessAmount')},
                       'job': {'code': getnum('JobSuccess'), 'amount': getnum('JobSuccessAmount')},
                       'attribute': {'id': f.get('AttribSuccess', ''), 'amount': getnum('AttribSuccessAmount')}}})
    return result


def compile_info(data, entry):
    f, issues, result = common_record(parse_ini(data), 'Info', entry)
    getnum = lambda key: integer(f, key, issues)
    getbool = lambda key: boolean(f, key, issues)
    commands = aligned(f, COMMAND_FIELDS, issues)
    result.update({'id': f.get('Name', ''), 'sortId': getnum('SortID'),
                   'owner': f.get('Owner', ''), 'npc': f.get('Owner', ''),
                   'parent': f.get('Parent', ''), 'quest': f.get('Quest', ''),
                   'conditionType': getnum('ConditionType'), 'type': getnum('InfoType'),
                   'given': getbool('InfoGiven'), 'permanent': getbool('Permanent'),
                   'clearChildren': getbool('ClearChildren'), 'goldCost': getnum('GoldCost'),
                   'folder': f.get('Folder', ''),
                   'conditions': {'ownerNearEntity': f.get('CondOwnerNearEntity', ''),
                       'playerKnows': vector(f.get('CondPlayerKnows', '')),
                       'itemContainer': f.get('CondItemContainer', ''),
                       'items': [{'id': t['CondItems'], 'amount': integer({'v': t['CondItemAmounts']}, 'v', issues)}
                                 for t in aligned(f, ['CondItems', 'CondItemAmounts'], issues)],
                       'secondaryNPCs': [{'entity': t['CondSecondaryNPC'], 'state': integer({'v': t['CondSecondaryNPCstates']}, 'v', issues)}
                                        for t in aligned(f, ['CondSecondaryNPC', 'CondSecondaryNPCstates'], issues)],
                       'playerSkills': [{'isPerk': boolean({'v': t['PlayerSkillsIsPerc']}, 'v', issues),
                           'index': integer({'v': t['PlayerSkillsIndex']}, 'v', issues),
                           'value': integer({'v': t['PlayerSkillsValue']}, 'v', issues)}
                           for t in aligned(f, ['PlayerSkillsIsPerc', 'PlayerSkillsIndex', 'PlayerSkillsValue'], issues)],
                       'namedPlayerSkills': [{'id': t['CondPlayerSkills'], 'value': integer({'v': t['CondPlayerSkillValues']}, 'v', issues)}
                           for t in aligned(f, ['CondPlayerSkills', 'CondPlayerSkillValues'], issues)]},
                   'teach': {'isPerk': getbool('TeachSkillIsPerc'), 'index': getnum('TeachSkillIndex'),
                       'value': getnum('TeachSkillValue'), 'skill': f.get('TeachSkill', ''),
                       'attribute': f.get('TeachAttrib', ''), 'attributeValue': getnum('TeachAttribValue')},
                   'commands': [{'index': i, **{name: t[key] for key, name in zip(COMMAND_FIELDS, COMMAND_NAMES)}}
                                for i, t in enumerate(commands)]})
    return result


def pe_string(data, va):
    nt = struct.unpack_from('<I', data, 0x3c)[0]
    assert data[nt:nt+4] == b'PE\0\0'
    count, optional_size = struct.unpack_from('<H', data, nt+6)[0], struct.unpack_from('<H', data, nt+20)[0]
    optional = nt+24
    assert struct.unpack_from('<H', data, optional)[0] == 0x10b
    image_base = struct.unpack_from('<I', data, optional+28)[0]
    rva = va-image_base
    for i in range(count):
        base = optional+optional_size+i*40
        virtual_size, virtual_address, raw_size, raw_offset = struct.unpack_from('<IIII', data, base+8)
        if virtual_address <= rva < virtual_address+min(virtual_size, raw_size):
            offset = raw_offset+rva-virtual_address
            end = data.index(b'\0', offset)
            return data[offset:end].decode('cp1252')
    raise ValueError(f'VA not backed by source bytes: {va:08x}')


def native_command_table(study):
    module = study/'01_Decompiled_Code/scripts__Script_Game_dll'
    assembly = (module/'full_disassembly.asm').read_text(encoding='utf-8')
    binary = (study/'00_Original_Runtime/scripts/Script_Game.dll').read_bytes()
    dispatcher_data = (module/'pseudocode/functions_00004.c').read_bytes()
    dispatcher, dispatcher_line = function_block(dispatcher_data.decode('utf-8'), '100dbb80')
    lines = assembly.splitlines()
    selected = [(i+1, line) for i, line in enumerate(lines) if re.match(r'1017[ab][0-9a-f]{3} \|', line)]
    rows = []
    last_string_va = None
    for line_number, line in selected:
        push = re.search(r'PUSH (0x[0-9a-f]+)$', line)
        if push:
            value = int(push[1], 16)
            if 0x10200000 <= value < 0x102239d8:
                last_string_va = value
        assign = re.search(r'MOV dword ptr \[(0x[0-9a-f]+)\],(0x[0-9a-f]+)$', line)
        if assign and 0x102239dc <= int(assign[1], 16) <= 0x10223b84:
            rows.append({'name': pe_string(binary, last_string_va), 'opcode': int(assign[2], 16),
                         'stringVA': f'0x{last_string_va:08x}',
                         'initializerVA': '0x'+line.split(' |')[0], 'assemblyLine': line_number})
    if len(rows) != 54:
        raise ValueError(f'Native command table expected 54 entries, recovered {len(rows)}')
    cases = list(re.finditer(r'^  case (0x[0-9a-f]+|[0-9]+):', dispatcher, re.M))
    handlers = {}
    for i, match in enumerate(cases):
        block = dispatcher[match.start():cases[i+1].start() if i+1 < len(cases) else len(dispatcher)]
        if '\n  default:' in block:
            block = block[:block.index('\n  default:')]
        calls = sorted(set(re.findall(r'([A-Za-z_][A-Za-z0-9_:<>~=]*)\(', block)))
        handlers[int(match[1], 0)] = {'caseLine': dispatcher_line+dispatcher.count('\n', 0, match.start()),
            'operandAccessors': sorted(set(re.findall(r'PSInfoScriptCommand::(Get[A-Za-z0-9]+)\(', block))),
            'nativeCalls': [name for name in calls if '::' in name or name.startswith(('thunk_FUN_', 'FUN_'))],
            'status': 'Native case navigation and exact call/accessor names; shared labels/fallthrough and argument ABI require interpretation.'}
    if set(handlers) != set(range(54)):
        raise ValueError('Native dispatch switch does not cover all54 table opcodes')
    for row in rows:
        row['handler'] = handlers[row['opcode']]
    return {'module': 'scripts/Script_Game.dll', 'inputSha256': sha(binary),
            'lookup': {'va': '0x100db360', 'comparison': 'bCString::CompareNoCase',
                       'emptyCommandOpcode': 0, 'unknownCommandOpcode': -1},
            'dispatcher': {'va': '0x100dbb80', 'decompiledFile': 'pseudocode/functions_00004.c',
                           'line': dispatcher_line, 'fileSha256': sha(dispatcher_data)},
            'entries': rows}


def compile_localization(data, entry, output):
    parsed = parse_ini(data)
    languages = vector(parsed['sections'].get('LocAdmin_Languages', {}).get('Languages', ''))
    strings = parsed['sections'].get('LocAdmin_Strings', {})
    issues = parsed['issues']
    table = {name: {} for name in languages}
    anomalies = []
    for key, raw in strings.items():
        fields = raw.split(';')
        expected = len(languages)*2
        if len(fields) != expected:
            anomalies.append({'id': key, 'fieldCount': len(fields), 'expected': expected, 'raw': raw})
        for i, language in enumerate(languages):
            table[language][key] = {'text': fields[2*i] if 2*i < len(fields) else '',
                                    'stageDirection': fields[2*i+1] if 2*i+1 < len(fields) else ''}
    files = []
    for language, values in table.items():
        file = 'localization/'+language.lower()+'.json'
        write_json(output/file, values)
        files.append({'language': language, 'url': file, 'count': len(values)})
    write_json(output/'localization/anomalies.json', anomalies)
    return {'source': source_ref(entry), 'languages': languages,
            'currentLanguage': parsed['sections'].get('LocAdmin_Languages', {}).get('CurrentLanguage'),
            'entries': len(strings), 'files': files, 'anomalyCount': len(anomalies),
            'issues': issues, 'layout': 'Each language has two fields: text and stage direction; original empty text is retained, no silent fallback.'}, set(strings)


def compact_value(value):
    if isinstance(value, list):
        return [compact_value(item) for item in value]
    if isinstance(value, dict):
        return {key: compact_value(item) for key, item in value.items()
                if key not in ('raw', 'rawFile', 'tailRaw', 'headerRaw', 'rawRecords',
                               'classOffset', 'tailOffset', 'sourceOffset', 'propertyOffsets')}
    return value


def compact_entity(record):
    # Geometry-only metadata and native byte copies belong in the local audit,
    # not browser downloads. Each source file owns its shared provenance.
    result = {key: record.get(key) for key in ('key', 'index', 'name', 'guid', 'creator', 'flags', 'worldMatrix', 'worldBox')}
    result['propertySets'] = []
    for clazz in record['propertySets']:
        if not clazz['name'].startswith('gC'):
            continue
        properties = [{key: compact_value(prop[key]) for key in ('name', 'type', 'value', 'status') if key in prop}
                      for prop in clazz['properties']]
        result['propertySets'].append({'name': clazz['name'], 'version': clazz['version'],
                                       'properties': properties, 'tail': compact_value(clazz['tail'])})
    if 'templateHeader' in record:
        result['templateHeader'] = compact_value(record['templateHeader'])
    return result


def compact_runtime_value(value):
    if isinstance(value, dict) and 'enum' in value and 'value' in value:
        return value['value']
    if isinstance(value, dict):
        return {key: compact_runtime_value(item) for key, item in compact_value(value).items()
                if key not in ('offset', 'symbols', 'symbol', 'byteLength')}
    if isinstance(value, list):
        return [compact_runtime_value(item) for item in value]
    return value


def runtime_entity(record):
    """Lossless decoded gameplay values; native byte/layout evidence stays local."""
    result = compact_entity(record)
    classes = []
    for clazz in result['propertySets']:
        properties = clazz['properties']
        values, unknown, duplicates = {}, [], []
        for prop in properties:
            name = prop['name']
            if name in values:
                duplicates.append({'name': name, 'value': values[name]})
            values[name] = compact_runtime_value(prop.get('value'))
            if prop.get('status') != 'decoded':
                unknown.append({'name': name, 'type': prop.get('type'), 'status': prop.get('status')})
        item = {'name': clazz['name'], 'version': clazz['version'], 'values': values}
        if unknown:
            item['unknownProperties'] = unknown
        if duplicates:
            item['duplicateProperties'] = duplicates
        tail = clazz['tail']
        if tail.get('status') not in ('empty', None):
            item['tail'] = compact_runtime_value(tail)
        classes.append(item)
    result['propertySets'] = classes
    return result


def write_world_chunks(output, file_number, source, records, parents):
    chunks = []
    # Serialized SysDyn contains almost25k records; never require one huge JSON
    # parse to instantiate a nearby entity. Source membership remains explicit.
    for start in range(0, len(records), 256):
        path = f'world/chunks/{file_number:04d}-{start//256:04d}.json.gz'
        rows = [runtime_entity(record) for record in records[start:start+256]]
        proof = write_compressed(output/path, {'entities': rows})
        chunks.append({'url': path, 'entities': len(rows), **proof})
    file = f'world/{file_number:04d}.json'
    write_json(output/file, {'schema': 'gothic3-entity-chunks-v1', 'source': source,
                            'entityCount': len(records), 'parents': parents, 'chunks': chunks})
    return file


def export_world(study, entries, output, raw_output):
    from read_gameplay_properties import normalize_entity, read_gameplay_file
    world_index, files, errors = [], [], []
    people = []
    counts = Counter()
    for file_number, entry in enumerate(entries):
        source = source_ref(entry)
        try:
            data = read_verified(study, entry)
            path = source_path(study, entry['candidate_effective_output'])
            world = read_gameplay_file(path, source=source)
            entities = world['entities']
            if world.get('status') == 'unsupported':
                errors.append({'index': file_number, 'source': source, 'status': 'unsupported',
                               'error': world['unsupportedReason']})
                write_json(raw_output/f'world/{file_number:04d}.json', world)
                files.append({'index': file_number, 'source': source, 'entities': None,
                              'gameplayEntities': None, 'status': 'unsupported', 'error': world['unsupportedReason']})
                continue
            records = []
            for entity in entities:
                # Wrapper normalizes entities; index geometry-only objects too.
                if 'propertySets' in entity:
                    record = entity
                else:
                    record = normalize_entity(entity, world.get('strings', []), source=source)
                props = record.get('propertySets', [])
                names = [p['name'] for p in props]
                has_gameplay = any(name.startswith('gC') for name in names)
                key = f"world-{file_number:04d}:{record.get('index', entity.get('index'))}"
                world_index.append({'key': key, 'name': record.get('name', ''),
                    'guid': record.get('guid'), 'creator': record.get('creator'),
                    'file': file_number, 'entityIndex': record.get('index'),
                    'propertySets': names, 'hasGameplay': has_gameplay,
                    'worldMatrix': record.get('worldMatrix')})
                if has_gameplay:
                    record['key'] = key
                    records.append(record)
                    counts.update(names)
                if record.get('name') in ('PC_Hero', 'Hamlar', 'Gorn', 'Diego', 'Milten', 'Lester', 'Jack'):
                    people.append(record)
            file = f'world/{file_number:04d}.json'
            write_json(raw_output/file, {'source': source, 'entities': records,
                                         'parents': world.get('parents', [])})
            write_world_chunks(output, file_number, source, records, world.get('parents', []))
            files.append({'index': file_number, 'url': file, 'source': source,
                          'entities': len(entities), 'gameplayEntities': len(records)})
        except Exception as exc:
            errors.append({'index': file_number, 'source': source, 'error': str(exc), 'exception': type(exc).__name__})
            files.append({'index': file_number, 'source': source, 'entities': None,
                          'gameplayEntities': None, 'error': str(exc)})
            print(f"World decode issue {entry['logical_path']}: {type(exc).__name__}: {exc}", flush=True)
        if file_number % 50 == 0:
            print(f'World source {file_number+1}/{len(entries)}, indexed {len(world_index)}, errors {len(errors)}', flush=True)
    write_json(raw_output/'world/index.json', world_index)
    write_compressed(output/'world/index.json.gz', [
        {key: value for key, value in record.items() if key != 'worldMatrix'} |
        {'position': record['worldMatrix'][12:15] if record.get('worldMatrix') else None}
        for record in world_index])
    write_json(output/'world/files.json', files)
    write_json(output/'world/errors.json', errors)
    write_json(raw_output/'initial/ardea-people.json', people)
    write_json(output/'initial/ardea-people.json', [{'source': r['source'], **compact_entity(r)} for r in people])
    return {'sources': len(entries), 'decodedSources': len(entries)-len(errors),
            'failedSources': len(errors), 'indexedEntities': len(world_index),
            'gameplayEntities': sum(f.get('gameplayEntities') or 0 for f in files),
            'propertySetCounts': dict(counts), 'importantRecords': len(people),
            'initialStateCaveat': 'Serialized source values are exported; loading, template inheritance, script initialization and savegame overrides must be interpreted before claiming a new-game state.'}


def export_templates(study, entries, output, raw_output):
    from read_gameplay_properties import read_template_file
    index, files, errors = [], [], []
    for number, entry in enumerate(entries):
        source = source_ref(entry)
        try:
            read_verified(study, entry)
            document = read_template_file(source_path(study, entry['candidate_effective_output']), source=source)
            file = f'templates/{number:04d}.json'
            write_json(raw_output/file, document)
            if document.get('status') == 'unsupported':
                errors.append({'index': number, 'source': source, 'status': 'unsupported', 'error': document['unsupportedReason']})
                files.append({'index': number, 'source': source, 'headers': None,
                              'status': 'unsupported', 'error': document['unsupportedReason']})
                continue
            file += '.gz'
            proof = write_compressed(output/file, {'source': source, 'entities': [runtime_entity(r) for r in document['entities']],
                                                   'parents': document['parents']})
            for header in document['entities']:
                index.append({'file': number, 'header': header['index'], 'name': header['name'],
                              'guid': header['guid'], 'refTemplate': header['templateHeader']['refTemplate'],
                              'helperParent': header['templateHeader']['helperParent'],
                              'propertySets': [p['name'] for p in header['propertySets']]})
            files.append({'index': number, 'url': file, 'source': source, 'headers': len(document['entities']), **proof})
        except Exception as exc:
            errors.append({'index': number, 'source': source, 'error': str(exc), 'exception': type(exc).__name__})
            files.append({'index': number, 'source': source, 'headers': None, 'error': str(exc)})
        if number % 500 == 0:
            print(f'Template source {number+1}/{len(entries)}, indexed {len(index)}, errors {len(errors)}', flush=True)
    write_compressed(output/'templates/index.json.gz', index)
    write_json(output/'templates/files.json', files)
    write_json(output/'templates/errors.json', errors)
    return {'sources': len(entries), 'decodedSources': len(entries)-len(errors),
            'failedSources': len(errors), 'indexedHeaders': len(index)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[2]/'public/gothic3/gameplay')
    parser.add_argument('--evidence', type=Path, default=Path(__file__).resolve().parents[2]/'assets/gothic3/gameplay')
    parser.add_argument('--skip-world', action='store_true')
    parser.add_argument('--raw-output', type=Path, default=Path(__file__).resolve().parents[3]/'gothic3_gameplay_raw',
                        help='Lossless world/template audits, outside the hosted repository')
    args = parser.parse_args()
    repo_root = Path(__file__).resolve().parents[2]
    if args.raw_output.resolve().is_relative_to(repo_root):
        raise ValueError('Lossless raw audit destination must be outside the hosted repository')
    effective_path = args.study/'02_Unpacked_Data/_metadata/effective_layers.json'
    effective_data = effective_path.read_bytes()
    effective = json.loads(effective_data)
    entries = sorted(effective['files'], key=lambda e: (e['family'].lower(), e['logical_path'].lower()))
    quests, infos = [], []
    sources = []
    for entry in entries:
        suffix = Path(entry['logical_path']).suffix.lower()
        if suffix not in ('.quest', '.info'):
            continue
        data = read_verified(args.study, entry)
        compiled = (compile_quest if suffix == '.quest' else compile_info)(data, entry)
        (quests if suffix == '.quest' else infos).append(compiled)
        sources.append(source_ref(entry))
    for name, records in [('quests', quests), ('infos', infos)]:
        duplicate_ids = [key for key, count in Counter(r['id'] for r in records).items() if count > 1]
        if duplicate_ids:
            raise ValueError(f'Duplicate {name} IDs need explicit resolution: {duplicate_ids}')
        write_json(args.output/(name+'.json'), records)
        write_json(args.output/('runtime/'+name+'.json'),
                   [{key: value for key, value in record.items()
                     if key not in ('rawFields', 'rawRecords')} for record in records])
    table = native_command_table(args.study)
    native_evidence = recover(args.study)
    native_evidence['inputSha256'] = table['inputSha256']
    write_json(args.evidence/'native-gameplay-evidence.json', native_evidence)
    write_json(args.output/'native-semantics.json', SEMANTICS)
    write_json(args.output/'initial/native-startup.json', {'source': {'module': table['module'], 'sha256': table['inputSha256']},
                                                       **native_evidence['nativeStartUp']})
    by_name = {row['name'].casefold(): row for row in table['entries']}
    command_counts = Counter(c['command'] for info in infos for c in info['commands'])
    catalog = []
    for name, count in sorted(command_counts.items()):
        native = by_name.get(name.casefold())
        engine_only = name.casefold() == 'description'
        catalog.append({'name': name, 'sourceLineCount': count,
                        'nativeOpcode': native['opcode'] if native else None,
                        'nativeName': native['name'] if native else None,
                        'nativeRecognized': native is not None or engine_only,
                        'nativeHandler': 'Game.dll::gCInfoScript_PS' if engine_only else 'scripts/Script_Game.dll' if native else None,
                        'implementation': 'runtime-owned; catalog does not imply support'})
    write_json(args.output/'commands.json', {'native': table, 'sourceCommands': catalog})
    write_json(args.evidence/'native-command-table.json', table)
    write_json(args.output/'enums.json', {'infoConditionType': COND_ENUM, 'infoType': INFO_ENUM,
                                         'questStatus': QUEST_STATUS,
                                         'labelPolicy': ENUM_LABEL_POLICY,
                                         'reference': 'g3dit G3Enums.java; behavior must be checked against this build native handlers'})
    strings_entry = next(e for e in entries if e['family'].lower() == 'strings' and e['logical_path'].lower() == 'stringtable.ini')
    localization, string_ids = compile_localization(read_verified(args.study, strings_entry), strings_entry, args.output)
    referenced_text = {c['text'] for info in infos for c in info['commands'] if c['text']}
    missing_text = sorted(referenced_text-string_ids)
    quest_ids = {q['id'] for q in quests}
    info_ids = {i['id'] for i in infos}
    audit = {'schema': SCHEMA, 'quests': len(quests), 'infos': len(infos),
             'commandLines': sum(command_counts.values()), 'sourceCommandSpellings': len(command_counts),
             'nonemptyCommandLines': sum(count for name, count in command_counts.items() if name),
             'nativeCommandTableEntries': len(table['entries']),
             'unrecognizedSourceCommands': [r for r in catalog if not r['nativeRecognized']],
             'missingLocalizationKeys': missing_text,
             'missingQuestReferences': sorted({i['quest'] for i in infos if i['quest']}-quest_ids),
             'missingParentInfoReferences': sorted({i['parent'] for i in infos if i['parent']}-info_ids),
             'issueCount': sum(len(r['issues']) for r in quests+infos),
             'missingPermanentField': sum(i['permanent'] is None for i in infos)}
    if not args.skip_world:
        world_entries = [e for e in entries if Path(e['logical_path']).suffix.lower() in ('.lrentdat', '.node')]
        template_entries = [e for e in entries if Path(e['logical_path']).suffix.lower() == '.tple']
        audit['world'] = export_world(args.study, world_entries, args.output, args.raw_output)
        audit['templates'] = export_templates(args.study, template_entries, args.output, args.raw_output)
        sources.extend(source_ref(entry) for entry in world_entries+template_entries)
    write_json(args.output/'audit.json', audit)
    write_json(args.evidence/'source-inputs.json', {'effectiveLayerIndexSha256': sha(effective_data),
        'sources': sources+[source_ref(strings_entry)],
        'resolverPolicy': effective['priority_policy'],
        'caveat': 'Static candidates reflect archive ordering; zero-byte patch/runtime deletion semantics are not inferred.'})
    if not args.skip_world:
        from bound_gameplay_chunks import bound
        write_json(args.output/'chunk-audit.json', bound(args.output))
    receipts = []
    for path in sorted(p for p in args.output.rglob('*') if p.is_file() and p.name.endswith(('.json', '.json.gz'))):
        if path.name == 'manifest.json':
            continue
        data = path.read_bytes()
        receipt = {'path': path.relative_to(args.output).as_posix(), 'bytes': len(data), 'sha256': sha(data)}
        if path.name.endswith('.gz'):
            unpacked = gzip.decompress(data)
            receipt.update(contentEncoding='gzip', encoding='gzip', uncompressedBytes=len(unpacked), uncompressedSha256=sha(unpacked))
        receipts.append(receipt)
    manifest = {'schema': SCHEMA, 'urls': {'quests': 'quests.json', 'infos': 'infos.json',
                'runtimeQuests': 'runtime/quests.json', 'runtimeInfos': 'runtime/infos.json',
                'commands': 'commands.json', 'enums': 'enums.json', 'audit': 'audit.json'},
                'runtime': {'quests': 'runtime/quests.json', 'infos': 'runtime/infos.json'},
                'enumLabelPolicy': ENUM_LABEL_POLICY,
                'entityCoordinates': {'units': 'native centimetres', 'positionLayout': 'worldMatrix translation entries12,13,14',
                                      'runtimeConversion': 'Use the scene origin/axis conversion supplied by the renderer; gameplay imports do not modify original coordinates.'},
                'world': {'index': 'world/index.json.gz', 'files': 'world/files.json', 'errors': 'world/errors.json'},
                'templates': {'index': 'templates/index.json.gz', 'files': 'templates/files.json', 'errors': 'templates/errors.json'},
                'initial': {'people': 'initial/ardea-people.json', 'nativeStartup': 'initial/native-startup.json'},
                'localization': localization, 'counts': audit, 'outputs': receipts,
                'scope': 'Original full quest/info/localization catalog and serialized world gameplay metadata. Native code semantics, combat, AI and streaming require separate runtime implementations.'}
    write_json(args.output/'manifest.json', manifest)
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
