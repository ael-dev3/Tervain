#!/usr/bin/env python3
"""Recover source-backed InfoManager initial state offline for one verified build.

This does not execute native code or assume that an INI catalog is the active
runtime provider. Historical compiled memberships remain separate. The ordinary
world Read and ReadSaveGame version gates are deliberately recorded separately.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import struct

import read_info_defaults_evidence as native
from read_gameplay_ini import boolean, parse_ini
from read_gameplay_properties import Cursor, _read_class, decode_property

ROOT = Path(__file__).resolve().parents[2]
INPUTS = {
    'Game': 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f',
    'Engine': 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3',
    'FileSystem': '965db61adac38cdf6dee047ca6630a869b75c6b4bba09defab70d48a76c80000',
}
DERIVATIVE_EXE_SHA = '0b65ca3438541abe40348e3a7e954725a2c2ea60d533184d5e4efca18659fa87'
ORIGINAL_EXE_SHA = '4573dc1cfdf8e52cc983ec4ce60d6de1d22715fd9c8745e5b43bb1e1876770c3'
UNPACKING_REPORT_SHA = '8e5f6ef6bfa5562be9bdf6c4512a1b143a4d2ff2d2cb791405d15c02c7325ee8'
WORLD = 'G3_World_01/SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}/SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}.lrentdat'
WORLD_SHA = '28f7273b3d54415b84445651a3dfa962c1ff158e9183deba81ba47e4d5d57938'
COMPILED = 'compiledinfos_G3_World_01.bin'
COMPILED_SHAS = {
    'Projects_compiled.pak': '17ba836ce2682bd0444294818919f4367d168c8d1ed071821e2238652868cf33',
    'Projects_compiled.p00': 'dd3e1c73ddb8b65de2cd46104a1d5b401e5e2d17cda1b3358d9629748837bcfe',
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_hash(path):
    result = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            result.update(chunk)
    return result.hexdigest()


def source_path(study, relative):
    path = (study / relative).resolve()
    if os.name == 'nt' and not str(path).startswith('\\\\?\\'):
        path = Path('\\\\?\\' + str(path))
    return path


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n', encoding='utf-8')
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': file_hash(path)}


def checked_source(study, relative, expected):
    path = source_path(study, relative)
    data = path.read_bytes()
    if digest(data) != expected:
        raise ValueError('Unreviewed original source: ' + relative)
    return data


def ini_provider(study):
    # Native later mounted archives suppress the same path in earlier layers.
    # Here the three original Infos archive headers contain no deletion entries.
    selected = {}
    archive_evidence = []
    for archive in ('Infos.pak', 'Infos.p00', 'Infos.p01'):
        manifest_path = study / '02_Unpacked_Data/_metadata' / (archive + '.manifest.json')
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        if any(entry['attributes'] & 0x8000 for entry in manifest['files']):
            raise ValueError('Unreviewed info deletion entry: ' + archive)
        archive_evidence.append({'archive': archive, 'sha256': manifest['archive']['archive_sha256'],
                                 'manifestSha256': file_hash(manifest_path), 'entryCount': len(manifest['files']),
                                 'deletedEntryCount': 0})
        for entry in manifest['files']:
            if entry['path'].startswith('G3_World_01/') and entry['path'].lower().endswith('.info'):
                selected[entry['path'].lower()] = entry
    sources, records, ids = [], [], set()
    runtime = json.loads((ROOT / 'public/gothic3/gameplay/runtime/infos.json').read_text(encoding='utf-8'))
    current = {info['id']: info for info in runtime}
    if len(current) != len(runtime):
        raise ValueError('Duplicated current catalog info ID')
    for entry in sorted(selected.values(), key=lambda entry: entry['path'].lower()):
        data = checked_source(study, entry['output_relative'], entry['sha256'])
        parsed = parse_ini(data)
        fields = parsed['sections'].get('Info', {})
        name = fields.get('Name', '')
        if not name or name in ids:
            raise ValueError('Missing or duplicated original INI info Name: ' + entry['path'])
        issues = list(parsed['issues'])
        flags = {key: boolean(fields, key, issues) for key in ('InfoGiven', 'Permanent')}
        critical_rows = {key: [row for row in parsed['records'] if row['section'] == 'Info' and row['key'] == key]
                         for key in ('Name', 'InfoGiven', 'Permanent')}
        if any(issue.get('kind') == 'invalid-boolean' for issue in issues) or any(
                len({row['value'] for row in rows}) > 1 for rows in critical_rows.values()):
            raise ValueError('Unreviewed flag or differing duplicate INI key: ' + entry['path'])
        # A present but empty value is not assumed equivalent to omission.
        if any(key in fields and flags[key] is None for key in flags):
            raise ValueError('Present empty native info flag: ' + entry['path'])
        catalog = current.get(name)
        if not catalog or catalog['source']['sha256'] != entry['sha256'] or catalog['given'] != flags['InfoGiven'] or catalog['permanent'] != flags['Permanent']:
            raise ValueError('Current catalog differs from original INI: ' + name)
        source_index = len(sources)
        sources.append({'archive': entry['archive'], 'path': entry['path'], 'sha256': entry['sha256'],
                        'selection': 'normal-mounted-archive-layer-order',
                        'lines': {key: next((row['line'] for row in parsed['records'] if row['section'] == 'Info' and row['key'] == key), None)
                                  for key in ('Name', 'InfoGiven', 'Permanent')},
                        'duplicateIdenticalCriticalKeys': {key: [{'line': row['line'], 'value': row['value']} for row in rows]
                                                          for key, rows in critical_rows.items() if len(rows) > 1}})
        records.append({'id': name, 'sourceIndex': source_index,
                        'sourceGiven': flags['InfoGiven'], 'given': flags['InfoGiven'] if flags['InfoGiven'] is not None else False,
                        'givenInitialization': 'explicit-ini' if flags['InfoGiven'] is not None else 'fresh-factory-default',
                        'sourcePermanent': flags['Permanent'], 'permanent': flags['Permanent'] if flags['Permanent'] is not None else False,
                        'permanentInitialization': 'explicit-ini' if flags['Permanent'] is not None else 'fresh-factory-default'})
        ids.add(name)
    if ids != set(current) or len(records) != 4381:
        raise ValueError('Current catalog membership differs from mounted original INIs')
    return {'schema': 'gothic3-info-provider-v1', 'id': 'ini', 'kind': 'fresh-factory-and-INI',
            'sourceOrder': 'Sorted here for lookup only; native file enumeration/dialogue ordering is not reconstructed.',
            'infoCount': len(records), 'sources': sources, 'records': records,
            'archives': archive_evidence, 'audit': counts(records)}


def counts(records):
    return {'sourceGiven': dict(Counter(str(record['sourceGiven']).lower() for record in records)),
            'sourcePermanent': dict(Counter(str(record['sourcePermanent']).lower() for record in records)),
            'effectiveGivenTrue': sum(record['given'] for record in records),
            'effectivePermanentTrue': sum(record['permanent'] for record in records)}


def compiled_provider(study, archive, provider_id, expected_count):
    relative = '02_Unpacked_Data/Archives/' + archive + '/' + COMPILED
    data = checked_source(study, relative, COMPILED_SHAS[archive])
    if data[:8] != b'GENOMFLE':
        raise ValueError('Unsupported compiled-info container')
    table_offset = struct.unpack_from('<I', data, 10)[0] + 4
    table = Cursor(data, [], table_offset)
    if table.u8() != 1:
        raise ValueError('Unsupported compiled-info string-table prefix')
    strings = [table.take(table.u16()).decode('cp1252') for _ in range(table.u32())]
    if table.pos != len(data):
        raise ValueError('Unconsumed compiled-info string-table bytes')
    reader = Cursor(data, strings, 14, base_offset=0)
    if reader.u16() != 1 or reader.u32() != expected_count:
        raise ValueError('Unreviewed compiled-info file version/count')
    records, names = [], set()
    for _ in range(expected_count):
        start = reader.pos
        clazz, offsets = _read_class(reader)
        if clazz['name'] != 'gCInfo_PS':
            raise ValueError('Unexpected compiled-info class')
        properties = {prop['name']: decode_property(prop, strings, offsets=offset)
                      for prop, offset in zip(clazz['properties'], offsets['properties'])
                      if prop['name'] in ('Name', 'InfoGiven', 'Permanent')}
        if any(prop['status'] != 'decoded' for prop in properties.values()) or set(properties) != {'Name', 'InfoGiven', 'Permanent'}:
            raise ValueError('Unreviewed compiled info name/flag encoding')
        name = properties['Name']['value']
        given, permanent = properties['InfoGiven']['value'], properties['Permanent']['value']
        if not name or name in names or not isinstance(given, bool) or not isinstance(permanent, bool):
            raise ValueError('Invalid compiled info identity/flags')
        names.add(name)
        records.append({'id': name, 'sourceIndex': 0, 'objectOffset': start, 'objectEnd': reader.pos,
                        'sourceGiven': given, 'given': given, 'givenInitialization': 'compiled-static-property',
                        'sourcePermanent': permanent, 'permanent': permanent, 'permanentInitialization': 'compiled-static-property',
                        'flagOffsets': {key: properties[key]['serialization']['sourceOffset'] for key in ('InfoGiven', 'Permanent')}})
    if reader.pos != table_offset - 4 or reader.take(4) != bytes.fromhex('efbeadde'):
        raise ValueError('Compiled-info object stream boundary disagrees')
    return {'schema': 'gothic3-info-provider-v1', 'id': provider_id, 'kind': 'historical-compiled-static',
            'infoCount': len(records), 'sources': [{'archive': archive, 'path': COMPILED, 'sha256': digest(data),
                'selection': 'historical-reference-suppressed-by-p01-tombstone'}], 'records': records,
            'audit': dict(counts(records), fileVersion=1, stringCount=len(strings),
                          objectStreamEnd=reader.pos - 4, stringTableOffset=table_offset, consumedBytes=len(data))}


def world_manager(study):
    relative = '02_Unpacked_Data/Archives/Projects_compiled.p00/' + WORLD
    data = checked_source(study, relative, WORLD_SHA)
    table_offset = struct.unpack_from('<I', data, 10)[0] + 4
    table = Cursor(data, [], table_offset)
    if table.u8() != 1:
        raise ValueError('Unsupported world string table')
    strings = [table.take(table.u16()).decode('cp1252') for _ in range(table.u32())]
    reader = Cursor(data, strings, 256641, base_offset=0)
    clazz, offsets = _read_class(reader, outer=True)
    if clazz['name'] != 'gCInfoManager_PS' or clazz['version'] != 4 or clazz['tail'] or offsets['tailSourceOffset'] != 256755 or offsets['endSourceOffset'] != 256755:
        raise ValueError('Unreviewed World_MCP InfoManager serialization')
    props = {prop['name']: decode_property(prop, strings, offsets=offset)
             for prop, offset in zip(clazz['properties'], offsets['properties'])}
    if any(prop['status'] != 'decoded' for prop in props.values()):
        raise ValueError('Undecoded original InfoManager property')
    return {'archive': 'Projects_compiled.p00', 'path': WORLD, 'sha256': WORLD_SHA,
            'entityKey': 'world-2419:1', 'entityName': 'World_MCP', 'propertyOffset': 256641,
            'classVersion': 4, 'classVersionOffset': 256753, 'classVersionBytes': data[256753:256755].hex(),
            'runtimeTailOffset': 256755, 'runtimeTailBytes': 0, 'ordinaryReadRuntimePacketCount': 0,
            'values': {key: prop['value'] for key, prop in props.items()},
            'propertyBytesSha256': digest(data[256641:256755])}


def tombstone(study, installation):
    path = study / '02_Unpacked_Data/_metadata/Projects_compiled.p01.manifest.json'
    manifest = json.loads(path.read_text(encoding='utf-8'))
    entry = next(record for record in manifest['files'] if record['path'] == COMPILED)
    archive_path = installation / 'Data/Projects_compiled.p01'
    archive = archive_path.read_bytes()
    if digest(archive) != manifest['archive']['archive_sha256']:
        raise ValueError('Unreviewed original p01 archive')
    header = bytes.fromhex(entry['entry_header_hex'])
    header_offset = archive.find(header)
    if header_offset < 0 or archive.find(header, header_offset + 1) >= 0 or len(header) != 36:
        raise ValueError('Original archive entry header is not uniquely identified')
    attributes = struct.unpack_from('<I', header, 32)[0]
    if attributes != entry['attributes'] or attributes != 0x28020 or not attributes & 0x8000 or entry['size'] != 0:
        raise ValueError('Unreviewed original compiled-info tombstone')
    return {'archive': 'Projects_compiled.p01', 'path': COMPILED, 'archiveSha256': digest(archive),
            'entryIndex': entry['entry_index'], 'entryHeaderOffset': header_offset,
            'entryHeaderBytes': header.hex(), 'attributes': attributes, 'deletionBit': 0x8000,
            'payloadBytes': 0, 'payloadSha256': digest(b''), 'manifestSha256': file_hash(path),
            'normalMountedResult': 'Later same-name entry suppresses earlier volumes; Engine then excludes the deleted entry from its VFS file cache.'}


def override_absence(study, installation):
    physical = sorted(path.relative_to(installation).as_posix() for path in installation.rglob('*') if path.is_file())
    def relevant(path):
        path = path.lower()
        return 'compiledinfos' in path or 'filepathcache' in path or path.endswith('.fpc')
    loose = [path for path in physical if relevant(path)]
    if loose:
        raise ValueError('Unreviewed physical info/cache override: ' + ','.join(loose))
    archive_matches, manifest_receipts, archive_entry_count = [], [], 0
    for path in sorted((study / '02_Unpacked_Data/_metadata').glob('*.manifest.json')):
        manifest = json.loads(path.read_text(encoding='utf-8'))
        if not isinstance(manifest, dict) or 'files' not in manifest or 'archive' not in manifest:
            continue
        archive_entry_count += len(manifest['files'])
        manifest_receipts.append({'path': path.relative_to(study).as_posix(), 'sha256': file_hash(path)})
        for entry in manifest['files']:
            if relevant(entry['path']):
                archive_matches.append({'archive': entry['archive'], 'path': entry['path'],
                                        'sha256': entry['sha256'], 'attributes': entry['attributes']})
    if len(archive_matches) != 3 or any(entry['path'] != COMPILED for entry in archive_matches):
        raise ValueError('Unreviewed archived info/cache override')
    return {'physicalFileCount': len(physical), 'physicalRelevantFiles': loose,
            'physicalRelativeNamesSha256': digest(('\n'.join(physical) + '\n').encode('utf-8')),
            'archiveEntryCount': archive_entry_count, 'archiveRelevantEntries': archive_matches,
            'archiveManifestReceipts': manifest_receipts,
            'limits': 'Filename/content membership audit within this installation/study. External cache paths supplied by nonempty command lines are not excluded.'}


METHODS = {
    'Game': [(0x20034572, 'Ordinary InfoManager Read: static provider load, then class-version<4 runtime overlay only'),
             (0x20003c2e, 'ReadCompiledInfoManager: missing/invalid/open failure returns false'),
             (0x200317a5, 'ReadSaveGame: class-version>1 restores Given packets, including version4'),
             (0x2002a1df, 'Info ReadRuntimeData: u16 packet version followed by bool Given only'),
             (0x20013354, 'Info WriteRuntimeData: version1 and bool Given'),
             (0x20004575, 'Current project compiledinfos_%s.bin filename'),
             (0x20009dfe, 'WriteSaveGame version4 includes Given/name packets, ordered selections and partner IDs'),
             (0x2002ac75, 'Ordinary Write emits current version4 without Given packets'),
             (0x20017a0d, 'Info binary property-object Read'),
             (0x20036165, 'Info INI Read'),
             (0x2002d7bd, 'WriteCompiledInfoManager serializes static property objects'),
             (0x20033e9c, 'INI loader suppresses reading when command line contains noinfos; otherwise new instance per original file'),
             (0x20032051, 'Info directory Data/Infos plus current world file base name')],
    'Engine': [(0x3003755b, 'AddDirToCache rejects entries whose deletion attribute is set'),
               (0x3002a784, 'VFS GetFilePath requires cached file membership'),
               (0x300297df, 'Archive file lookup cache path'),
               (0x300107f3, 'ArchiveManager GetFile obtains a VFS file path'),
               (0x30043379, 'IsDeleted tests native attribute bit0x8000'),
               (0x30015159, 'ArchiveFile IsValid tests nonempty path, not payload length'),
               (0x3000ac90, 'IsCompiledProjectFolder reads VFS flag byte+0x3d'),
               (0x3000e223, 'IsEntityPatchingEnabled reads native static global'),
               (0x300154f1, 'SetEntityPatchingEnabled writes native static global'),
               (0x300134b2, 'SetRootPath derives compiled-project flag from option and overrides Projects mount'),
               (0x305cf560, 'VFS constructor begins with compiled-project flag false'),
               (0x307918c0, 'Initialize mountlist.ini key'),
               (0x30791920, 'Initialize filepathcache option'),
               (0x30791950, 'Initialize .fpc extension'),
               (0x30791980, 'Initialize compiledprojects option'),
               (0x307919b0, 'Initialize projects mount name'),
               (0x307919e0, 'Initialize Data/Projects_compiled mount target')],
    'FileSystem': [(0x100068e0, 'Archive entry reads raw36byte header including attributes'),
                   (0x10006200, 'Deferred find copies native attributes to SFFFileFind+0x28'),
                   (0x1000cc10, 'Earlier volume name is suppressed when a later mounted volume has same name'),
                   (0x1000cde0, 'File enumeration skips earlier same-name matches'),
                   (0x1000bc80, 'Later volume presence lookup does not check deletion/length'),
                   (0x10008690, 'Volume file lookup traversal'),
                   (0x10008c50, 'Volume file presence result')],
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--installation', type=Path, required=True)
    args = parser.parse_args()
    native.EXPECTED_INPUTS.update(INPUTS)
    modules = {name: native.Module(args.study, name) for name in INPUTS}
    for name, methods in METHODS.items():
        for entry, meaning in methods:
            modules[name].method(entry, meaning)
    for module in modules.values():
        module.audit()
    derivative_path = args.study / '06_Reproduction_Tools/Unpacking/Analysis_Inputs_Unpacked/Gothic3.exe'
    unpacking_report = args.study / '04_Indexes_and_Reports/Static_Unpacking_Report.json'
    checked_source(args.study, '00_Original_Runtime/Gothic3.exe', ORIGINAL_EXE_SHA)
    checked_source(args.study, '04_Indexes_and_Reports/Static_Unpacking_Report.json', UNPACKING_REPORT_SHA)
    native.EXPECTED_INPUTS['Gothic3'] = DERIVATIVE_EXE_SHA
    exe = native.Module(args.study, 'Gothic3', root_name='Gothic3_exe', binary_name=derivative_path.resolve())
    exe.method(0x00401440, 'Empty incoming command line gets original Projects/G3_World_01/compiledprojects defaults')
    exe.audit()
    for record in exe.methods.values():
        record['sourceByteBasis'] = 'Verified static Steamless derivative, not original encrypted .text bytes'
        record['allInstructionBytesMatchSourcePE'] = False
        record['allInstructionBytesMatchDerivativePE'] = True
        for body_range in record['bodyRanges']:
            body_range['derivativePEBytesSha256'] = body_range.pop('sourcePEBytesSha256')
        for instruction in record['instructions']:
            instruction['sourcePEMatch'] = False
            instruction['derivativePEMatch'] = True
    default_path = ROOT / 'assets/gothic3/dialogue/info-defaults-evidence.json'
    default_evidence = json.loads(default_path.read_text(encoding='utf-8'))
    if default_evidence['schema'] != 'gothic3-native-info-defaults-evidence-v1':
        raise ValueError('Unreviewed factory-default evidence schema')
    for key in ('InfoGiven', 'Permanent'):
        if default_evidence['fields'][key]['valueWhenOmitted'] is not False:
            raise ValueError('Unreviewed fresh factory flag default')
    shared_hash = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'
    native.EXPECTED_INPUTS['SharedBase'] = shared_hash
    default_modules = dict(modules, SharedBase=native.Module(args.study, 'SharedBase'))
    for method in default_evidence['methodEvidence']:
        module = default_modules[method['id'].split(':', 1)[0]]
        for instruction in method['instructions']:
            raw = bytes.fromhex(instruction['bytes'])
            if module.read(int(instruction['va'], 16), len(raw)) != raw:
                raise ValueError('Factory default proof differs from original source PE')
    providers = [ini_provider(args.study), compiled_provider(args.study, 'Projects_compiled.pak', 'compiled-pak', 4260),
                 compiled_provider(args.study, 'Projects_compiled.p00', 'compiled-p00', 4265)]
    public = ROOT / 'public/gothic3/info-state'
    assets = ROOT / 'assets/gothic3/info-state'
    provider_receipts = []
    for provider in providers:
        receipt = write_json(public / 'providers' / (provider['id'] + '.json'), provider)
        receipt['path'] = receipt['path'].removeprefix('public/gothic3/')
        provider_receipts.append(dict(receipt, id=provider['id'], infoCount=provider['infoCount'], kind=provider['kind'], audit=provider['audit']))
    world = world_manager(args.study)
    deleted = tombstone(args.study, args.installation)
    absence = override_absence(args.study, args.installation)
    ini_ids = {record['id'] for record in providers[0]['records']}
    historical_comparison = []
    current = {record['id']: record for record in providers[0]['records']}
    for provider in providers[1:]:
        ids = {record['id'] for record in provider['records']}
        historical_comparison.append({'id': provider['id'], 'currentIniAdditionalIds': sorted(ini_ids - ids),
            'missingFromCurrentIni': sorted(ids - ini_ids),
            'changedStoredPermanent': [record['id'] for record in provider['records']
                                       if record['id'] in current and record['permanent'] != current[record['id']]['permanent']]})
    document = {'schema': 'gothic3-initial-info-state-v1', 'scope': 'ordinary-world-read-before-OnGameStartUp',
        'worldManager': world, 'providers': provider_receipts, 'tombstone': deleted,
        'staticSelection': {'selectedProvider': None, 'status': 'context-required',
            'rules': ['Patching disabled does not establish a fresh static table in this Read.',
                      'Patching enabled and compiled-project flag false selects the INI loader.',
                      'Patching enabled and compiled-project flag true attempts the current project compiled file; failure selects the INI loader.',
                      'The INI loader skips file reads if the command line contains noinfos.',
                      'Normal mounted archives make compiledinfos_G3_World_01.bin missing because of the p01 tombstone.',
                      'Known missing compiled lookup joins both compiled-project flag branches to the INI loader.',
                      'Actual cache/loose override and flag/session context require a separately verified profile.'],
            'nativeStoredPatchingDefault': {'va': '0x30abdee4', 'byte': modules['Engine'].read(0x30abdee4, 1).hex(),
                                          'runtimeValueNotInferred': True}},
        'defaultLaunch': {'incomingCommandLine': 'empty-string-only', 'substitutedArguments': exe.string(0x0041d080),
                          'worldName': 'G3_World_01', 'noInfosOptionPresent': False,
                          'compiledProjectsOptionPresent': True,
                          'sourceBasis': 'Statically unpacked executable derivative; no launch performed.',
                          'unknown': 'An arbitrary nonempty incoming command line bypasses these defaults.'},
        'cacheNames': {'option': 'filepathcache', 'extension': '.fpc'},
        'overrideAbsence': absence,
        'browserProfile': {'id': 'fresh-original-G3_World_01-INI',
                           'worldName': 'G3_World_01', 'entityPatchingEnabled': True,
                           'compiledProjectFolder': True, 'compiledInfoLookup': 'missing', 'noInfosSkip': False,
                           'sourceRoute': 'Native stored patch flag1, default no-argument world, ordinary mounted archives with verified p01 tombstone.',
                           'scope': 'Explicit new browser profile before unsupported callbacks/session/save changes.',
                           'nativeRuntimeCaptured': False,
                           'assumptions': ['No intervening entity-patching flag mutation', 'No external filepathcache override',
                                           'No custom command-line noinfos option', 'No restored savegame']},
        'runtimeOverlay': {'ordinaryWorldRead': 'Class version4 bypasses the runtime packet/list/partner overlay.',
                           'givenPackets': 0, 'permanentPackets': 0,
                           'saveGameRead': 'Separate ReadSaveGame restores Given packets for version>1, including4; unsupported by this initial-state loader.'},
        'factoryDefaults': {'InfoGiven': False, 'Permanent': False, 'evidence': {'path': 'assets/gothic3/dialogue/info-defaults-evidence.json',
                            'bytes': default_path.stat().st_size, 'sha256': file_hash(default_path)}},
        'historicalComparison': historical_comparison,
        'unapplied': ['OnGameStartUp and any subsequent callbacks', 'native dialogue selection/order/session changes',
                      'savegame Given restoration', 'compiled-provider commands/conditions (historical flag snapshots only)'],
        'sourceOrder': 'Provider records are lookup data; they do not reconstruct native enumeration order.'}
    output = write_json(public / 'initial-info-state.json', document)
    output['path'] = output['path'].removeprefix('public/gothic3/')
    evidence = {'schema': 'gothic3-info-runtime-evidence-v1', 'nativeExecution': False,
        'inputs': [{'module': name, 'path': '00_Original_Runtime/' + name + '.dll', 'sha256': INPUTS[name],
                    'bytes': len(module.data)} for name, module in modules.items()],
        'derivativeInput': {'path': derivative_path.relative_to(args.study).as_posix(), 'sha256': DERIVATIVE_EXE_SHA,
                            'originalInstalledSha256': ORIGINAL_EXE_SHA,
                            'staticUnpackingReport': {'path': unpacking_report.relative_to(args.study).as_posix(),
                                                      'sha256': UNPACKING_REPORT_SHA}},
        'methodEvidence': [record for module in modules.values() for record in module.methods.values()] + list(exe.methods.values()),
        'sourceReceipts': [{'path': path.relative_to(args.study).as_posix(), 'sha256': file_hash(path), 'bytes': path.stat().st_size}
                           for module in list(modules.values()) + [exe] for path in sorted(module.source_files)],
        'worldManager': world, 'tombstone': deleted, 'overrideAbsence': absence, 'providerComparison': historical_comparison,
        'branchBytes': {'ordinaryReadVersionGate': {'va': '0x2044c17f', 'bytes': modules['Game'].read(0x2044c17f, 10).hex(),
                        'meaning': 'CMP AX,4; unsigned JNC bypasses ordinary-world runtime overlay'},
                       'runtimeGivenTarget': {'objectOffset': '0x18', 'packetFields': ['u16 version', 'bool InfoGiven']}}}
    evidence['integrityAudit'] = {'methods': len(evidence['methodEvidence']),
        'instructions': sum(method['instructionCount'] for method in evidence['methodEvidence']),
        'allListedOriginalModuleInstructionsMatchOriginalPE': True,
        'executableInstructionsMatchVerifiedDerivativeOnly': True, 'sourceInputsUnmodified': True}
    details = write_json(assets / 'native-evidence.json', evidence)
    receipt = {'schema': 'gothic3-info-state-output-v1', 'output': output, 'providers': provider_receipts,
               'details': details, 'scope': document['scope'],
               'reproductionSources': [{'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size,
                                        'sha256': file_hash(path)} for path in
                                       (Path(__file__).resolve(), ROOT / 'tools/gothic3/read_info_defaults_evidence.py',
                                        ROOT / 'tools/gothic3/read_gameplay_ini.py', ROOT / 'tools/gothic3/read_gameplay_properties.py',
                                        ROOT / 'tools/gothic3/read_genome.py')],
               'reproduction': 'python -B tools/gothic3/research_info_runtime.py --study <LOCAL_DESKTOP_STUDY> --installation <LOCAL_GOTHIC3_INSTALLATION>'}
    write_json(assets / 'output-receipt.json', receipt)
    print(json.dumps({'output': output, 'providers': provider_receipts,
                      'integrityAudit': evidence['integrityAudit']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
