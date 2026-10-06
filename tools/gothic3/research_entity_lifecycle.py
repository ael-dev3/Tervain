"""Recover original entity/property ownership, read and registration lifecycle.

Offline source/PE byte audit only; no native binary is loaded or executed.
Run: python -B tools/gothic3/research_entity_lifecycle.py --study STUDY
"""
# SPDX-License-Identifier: GPL-3.0-only
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import re
from pathlib import Path
import struct

from research_native_combat import PE, INPUTS, SHORT, SUPPORTED_SHA256, collect_module, save_json, sha
from research_native_inventory import native_imports, directory
from export_world_index import Sources, source_ref, read_sector
from read_gameplay_ini import parse_ini
from read_gameplay_properties import _read_native_world, normalize_entity, _genome_strings, _read_class, _normalize_class
INPUTS['SharedBase_dll'] = '00_Original_Runtime/SharedBase.dll'
SHORT['SharedBase_dll'] = 'SharedBase'
SUPPORTED_SHA256['SharedBase'] = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'

SELECTED = {
    'Engine_dll': set('''
    3000243c 300025bd 3000ec23 3001ca2b 30010b68 3000d0da
    300091d3 3002572f 3003b863 3003d271 30015e1a 3003f017
    30026693 3000df8a 3001d9bc 3002d713 3000c0c7
    3000a9a2 3001808e 30045e03 3003d10e
    3003b5bb 3001a091 3002ad10 30037ca4 3003544f
    3003f445 3003fb70 30028cfe 30020347 30042f7d 3001b2f2
    30037bcd 3003abed 3003e9f5 30023cf4 300253e2 300321be
    3003dd93 3001b09a 3003d8c5 30005227 300120a3 3000e223
    30030fb2 30012733 30015f28 300017c6 3002b80f
    30020356 300302ce 300048fe 3003eac7 300210c1 3002208e
    30033046 30037d99 304cfc00 304d0490
    30009f98 30008783 3000bf14 3000d404 3001f1a9 30018ac5
    3002059f 30007559 3002422b 3001882c 3002a09a 300361ba 3003dca8 3002292b 3000d4ea 30017e77
    '''.split()),
    'Game_dll': set('''
    20004f0c 20026bd9 200246db 200285dd 20004593 20030a30
    2000ab32 200223cc 2001708f 200328bc 2002bb11
    2000d75b 20017b34 20005358 2000b96f 200093b3 2000e0bb 2002b00d 20015474 20018f93
    2002cbf1 2001a235 20020fa4 200166df 2000ef48
    2002dff1 201d4cb0 20020757 2003014d
    '''.split()),
    'SharedBase_dll': set('10001d07 100079fa 10007f81 10008143 10004b74 10006636 1000873d 10001f05 100027de 10008805 10001a82 100022d4 1000551a 10008841 10003a71 10008233 100059ed'.split()),
}
GAME_TABLES = {'gCEntity': 0x2066813c, 'gCNavPath_PS': 0x2068f414}
PROPERTY_TYPES = {'gCNavigation_PS': ('Game', '20024edd', 5),
                  'gCNavPath_PS': ('Game', '20011e55', 10),
                  'gCNPC_PS': ('Game', '20010a1e', 30),
                  'gCInventory_PS': ('Game', '2000e6c4', 31),
                  'gCScriptRoutine_PS': ('Game', '2002b0a8', 45),
                  'gCInteraction_PS': ('Game', '20031ee4', 49),
                  'gCDamage_PS': ('Game', '20020f9a', 51),
                  'gCDamageReceiver_PS': ('Game', '2001db24', 52),
                  'gCFocus_PS': ('Game', '200259ff', 59),
                  'gCPlayerMemory_PS': ('Game', '20032641', 60),
                  'gCDialog_PS': ('Game', '20018def', 68),
                  'eCIlluminated_PS': ('Engine', '3000ccf2', 74),
                  'gCParty_PS': ('Game', '200137af', 77),
                  'gCEffect_PS': ('Game', '200174ef', 96),
                  'eCVisualAnimation_PS': ('Engine', '3002840c', 100),
                  'gCCharacterMovement_PS': ('Game', '20033596', 21)}
for module, address, _ in PROPERTY_TYPES.values():
    SELECTED[module + '_dll'].add(address)


def compressed(path, value):
    decoded = (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf8')
    wire = gzip.compress(decoded, compresslevel=9, mtime=0)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(wire)
    return {'path': path.name, 'bytes': len(wire), 'sha256': hashlib.sha256(wire).hexdigest(),
            'encoding': 'gzip', 'uncompressedBytes': len(decoded),
            'uncompressedSha256': hashlib.sha256(decoded).hexdigest()}


def exports(pe):
    # Engine has decorated exports longer than the combat label reader's
    # 256-byte bound. Keep this export-specific reader bounded at4096 bytes.
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


def dispatch_proofs(pes):
    game_imports = native_imports(pes['Game'])
    export_tables = {name: exports(pe) for name, pe in pes.items()}
    entities = {
        'eCEntity': ('Engine', 0x3087aa9c, {4: 0x30009f98, 0x18: 0x300091d3, 0x74: 0x3002422b, 0x78: 0x3003dca8, 0x118: 0x3003544f}),
        'eCSpatialEntity': ('Engine', 0x3087b23c, {4: 0x30009f98, 0x18: 0x3002dd67, 0x74: 0x3001069f, 0x78: 0x3003dca8, 0x118: 0x3003544f}),
        'eCDynamicEntity': ('Engine', 0x3087b3ec, {4: 0x30009f98, 0x18: 0x3002572f, 0x74: 0x3002422b, 0x78: 0x3003dca8, 0x118: 0x3003544f}),
        'gCEntity': ('Game', 0x2066813c, {4: 0x20462762, 0x18: 0x20026bd9, 0x74: 0x20462786, 0x78: 0x2046278c, 0x118: 0x20462864}),
        'gCNavPath_PS': ('Game', 0x2068f414, {4: 0x2046031a, 0x18: 0x200093b3, 0x4c: 0x20461e80, 0x50: 0x20461e86, 0x58: 0x20461e8c, 0x5c: 0x20461e92, 0x60: 0x20011e55, 0x68: 0x20461e9e, 0x84: 0x20461ec8, 0xb4: 0x20461f0a, 0x12c: 0x20018f93, 0x138: 0x2002b00d, 0x13c: 0x20015474}),
    }
    imported_targets = {0x20462762: ('Engine', 0x30009f98), 0x20462786: ('Engine', 0x3002422b),
                        0x2046278c: ('Engine', 0x3003dca8), 0x20462864: ('Engine', 0x3003544f),
                        0x2046031a: ('SharedBase', 0x10007f81),
                        0x20461e80: ('Engine', 0x3002ad10), 0x20461e86: ('Engine', 0x30037ca4),
                        0x20461e8c: ('Engine', 0x3003b5bb), 0x20461e92: ('Engine', 0x3001a091),
                        0x20461e9e: ('Engine', 0x3002292b), 0x20461ec8: ('Engine', 0x30008783),
                        0x20461f0a: ('Engine', 0x3001d9bc)}
    results = {}
    for name, (module, table, slots) in entities.items():
        entries = []
        for offset, target in slots.items():
            raw = pes[module].at(table + offset, 4)
            if struct.unpack('<I', raw)[0] != target:
                raise ValueError('Original virtual slot changed: ' + name + '/' + hex(offset))
            entry = {'offset': offset, 'bytes': raw.hex(), 'target': f'{target:08x}'}
            if target in imported_targets:
                library, address = imported_targets[target]
                stub = pes['Game'].at(target, 6)
                if stub[:2] != b'\xff\x25':
                    raise ValueError('Original imported virtual stub changed')
                slot = struct.unpack_from('<I', stub, 2)[0]
                imported = game_imports[slot]
                if (imported['library'].lower() != (library + '.dll').lower() or
                        export_tables[library].get(imported['decoratedName']) != address):
                    raise ValueError('Original PE import/export virtual binding changed: ' + hex(target))
                entry.update(importThunkBytes=stub.hex(), importSlot=f'{slot:08x}',
                             originalPEImport=imported, implementation=library + ':' + f'{address:08x}')
            entries.append(entry)
        results[name] = {'module': module, 'address': f'{table:08x}', 'entries': entries,
                         'allPointerBytesReadFromPinnedPE': True}
    return results


def comparator_proof(study, pe, out):
    # This small function was an unlabelled assembly range in the saved study;
    # do not claim recovered C or silently invent a function manifest entry.
    start, end = 0x304b22f0, 0x304b2315
    source = study / '01_Decompiled_Code/Engine_dll/full_disassembly.asm'
    records, lines, first_line = [], [], None
    pattern = re.compile(r'^([0-9a-f]{8}) \| ([0-9a-f]+) \| (.*)$')
    with source.open(encoding='utf8') as f:
        for number, line in enumerate(f, 1):
            match = pattern.match(line.rstrip('\n'))
            if match and start <= int(match[1], 16) < end:
                raw = bytes.fromhex(match[2])
                if pe.at(int(match[1], 16), len(raw)) != raw:
                    raise ValueError('Property comparator instruction byte mismatch')
                first_line = number if first_line is None else first_line
                lines.append(line)
                records.append({'address': match[1], 'bytes': match[2], 'assembly': match[3]})
    if not records or int(records[0]['address'], 16) != start or int(records[-1]['address'], 16) + len(bytes.fromhex(records[-1]['bytes'])) != end:
        raise ValueError('Incomplete property comparator assembly range')
    for left, right in zip(records, records[1:]):
        if int(left['address'], 16) + len(bytes.fromhex(left['bytes'])) != int(right['address'], 16):
            raise ValueError('Noncontiguous property comparator instruction range')
    jump = pe.at(0x30017323, 5)
    if jump[0] != 0xe9 or 0x30017323 + 5 + struct.unpack_from('<i', jump, 1)[0] != start:
        raise ValueError('Property comparator forwarding target differs')
    dest = out / 'sources/Engine/property_type_comparator.asm.txt'
    dest.write_text(''.join(lines), encoding='utf8', newline='\n')
    return {'module': 'Engine', 'alias': '30017323', 'aliasBytes': jump.hex(),
            'target': f'{start:08x}', 'endExclusive': f'{end:08x}', 'instructions': records,
            'assemblyExcerpt': dest.relative_to(out).as_posix(), 'assemblyExcerptSha256': sha(dest),
            'studyAssemblySha256': sha(source), 'studyAssemblyLine': first_line,
            'representation': 'original byte-verified assembly; not a recovered C body',
            'operation': 'first pointer PS.GetPropertySetType - second pointer PS.GetPropertySetType',
            'allInstructionBytesMatchOriginalPE': True}


def resource_records(root, study, out, public):
    index = study / '02_Unpacked_Data/_metadata/effective_layers.json'
    entries = json.loads(index.read_text(encoding='utf8'))['files']
    sources = Sources(study, entries)
    # Membership references are checked afresh against original registry/secdat
    # bytes. The existing world index supplies no live/processing facts here.
    registry_entry, problem = sources.resolve('G3_World_01/G3_World_01.wrldatasc', '.wrldatasc', world='G3_World_01')
    if problem:
        raise ValueError(problem)
    registry = parse_ini(sources.read(registry_entry))
    world_index = json.loads((root / 'public/gothic3/world/index.json').read_text(encoding='utf8'))
    sector_records = [r for r in world_index['sectors'] if r['source']['path'].startswith('G3_World_01/')]
    selected_names = ['G3_Myrtana_01_Ardea_NPC_01.lrentdat', 'G3_Myrtana_01_Ardea_NPC_02.lrentdat',
                      'SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}.lrentdat']
    story_names = {'PC_Hero', 'Diego', 'Milten', 'Gorn', 'Lester', 'Lares', 'Vatras'}
    selected, files = [], []
    for name in selected_names:
        source, problem = sources.resolve(name, '.lrentdat', world='G3_World_01')
        if problem:
            raise ValueError(problem)
        raw = sources.read(source)
        doc = _read_native_world(raw, sources.path(source))
        if doc['status'] != 'decoded':
            raise ValueError('Original source is not fully byte-decoded: ' + name)
        layer, problem = sources.resolve(name[:-9] + '.lrent', '.lrent', world='G3_World_01')
        if problem:
            raise ValueError(problem)
        layer_raw = sources.read(layer)
        reader, boundary, genome = _genome_strings(layer_raw)
        reader.pos = 14
        clazz, metadata = _read_class(reader)
        if reader.pos != boundary or clazz['name'] != 'gCDynamicLayer':
            raise ValueError('Unreviewed dynamic-layer class or serialization boundary')
        layer_class = _normalize_class(clazz, reader.strings, offsets=metadata)
        entity_types = [p for p in clazz['properties'] if p['name'] == 'EntityType']
        if (len(entity_types) != 1 or entity_types[0]['type'] != 'bTPropertyContainer<enum gEEntityType>' or
                len(bytes.fromhex(entity_types[0]['raw'])) != 6 or bytes.fromhex(entity_types[0]['raw'])[:2] != b'\x01\x00'):
            raise ValueError('Unreviewed dynamic layer EntityType property')
        entity_type = struct.unpack_from('<I', bytes.fromhex(entity_types[0]['raw']), 2)[0]
        if entity_type not in (0, 1):
            raise ValueError('Dynamic-layer factory type is outside the proven custom callback path')
        matches = []
        for sector in sector_records:
            sec, problem = sources.resolve(sector['source']['path'], '.secdat', world='G3_World_01')
            if problem:
                raise ValueError(problem)
            # Resolve membership only for matching candidates, then hash/read
            # that winning sector; no guessed directory-only association.
            if not any(member['kind'] == 'dynamic-layer' and member['nativeName'] == name[:-9]
                       for member in sector.get('files', [])):
                continue
            membership = read_sector(sources.read(sec))
            if name[:-9] not in membership['dynamicLayers']:
                raise ValueError('Frozen index disagrees with original sector membership')
            registrations = sector.get('registrations', [])
            for registration in registrations:
                original = [r for r in registry['records'] if r['line'] == registration['line']]
                if (len(original) != 1 or original[0]['section'] != 'Sector.List' or
                        original[0]['key'] != registration['name'] or original[0]['value'] != registration['rawValue'] or
                        registration['enabled'] is not {'true': True, 'false': False}.get(original[0]['value'].casefold())):
                    raise ValueError('Frozen registry disagrees with original line bytes')
            if sector['registered'] != bool(registrations) or sector['enabledByAnyRegistry'] != any(r['enabled'] is True for r in registrations):
                raise ValueError('Frozen sector flags disagree with original registry entries')
            matches.append({'id': sector['id'], 'source': source_ref(sec),
                            'registryEntries': registrations,
                            'registeredInSourceRegistry': sector['registered'],
                            'enabledBySourceRegistry': sector['enabledByAnyRegistry']})
        wrapper = doc['archiveSerialization']['context']
        tail = bytes.fromhex(wrapper['tail']['raw'])
        if wrapper['version'] != 83 or len(tail) != 33 or tail[0] not in (0, 1):
            raise ValueError('Unsupported dynamic-context version83 tail')
        context = {'version': 83, 'enabled': bool(tail[0]),
                   'floatFields': {'data+0x44': struct.unpack_from('<f', tail, 1)[0],
                                   'data+0x48': struct.unpack_from('<f', tail, 5)[0]},
                   'worldBoxCm': list(struct.unpack_from('<6f', tail, 9)),
                   'raw': tail.hex(), 'sourceOffset': wrapper['tail']['sourceOffset'],
                   'graphRootIndex': 0 if doc['entities'] else None,
                   'sourceEntityCount': len(doc['entities']), 'nativeClass': 'gCEntity',
                   'creationCallback': 'Game20020757->201d4cb0 (installed by OnCreateContext for layer type0 or1)',
                   'layerEntityType': entity_type,
                   'factoryProof': {'layerSource': source_ref(layer), 'class': layer_class, 'genome': genome,
                                    'nativeDispatch': 'Game2002dff1->201d4eb0'}}
        wanted = [e for e in doc['entities'] if e['name'] in story_names] if name.startswith('SysDyn') else [
            e for e in doc['entities'] if any(c['name'] == 'gCNPC_PS' for c in e['classes'])]
        file_index = len(files)
        for e in wanted:
            record = normalize_entity(e, doc['strings'], source=source_ref(source),
                                      class_offsets=doc['offsets'][e['index']])
            record.update(key=source['logical_path'] + ':' + str(e['index']),
                          nativeHeader=e['nativeHeader'], sourceFileIndex=file_index,
                          sourceClass='gCEntity', live=False,
                          interpretation='Original serialized candidate; no Create/Read/PostRead/patch/registration is inferred.')
            selected.append(record)
        files.append({'source': source_ref(source), 'context': context, 'sectorMemberships': matches,
                      'selectedEntityCount': len(wanted), 'selection': 'all serialized NPC property-set records in Ardea NPC01/NPC02; seven explicitly named SysDyn story/player records',
                      'parents': doc['parents'], 'parentIndicesReferenceFullOriginalSource': True,
                      'archiveSerialization': doc['archiveSerialization'], 'fullyReadButSelectedForExport': True,
                      'fullContextInstantiationSupportedByThisSelection': False})
        print('Original resource read', name, 'sourceEntities', len(doc['entities']), 'selected', len(wanted), flush=True)
    receipt = compressed(public / 'source-candidates.json.gz', {
        'schema': 'gothic3-entity-lifecycle-source-candidates-v1', 'world': 'G3_World_01',
        'files': files, 'entities': selected, 'sourceCandidatesAreLiveEntities': False})
    save_json(out / 'original-resources.json', {'schema': 'gothic3-entity-lifecycle-resources-v1',
        'effectiveLayersIndex': {'studyPath': '02_Unpacked_Data/_metadata/effective_layers.json',
                                 'bytes': index.stat().st_size, 'sha256': sha(index)},
        'registry': {'source': source_ref(registry_entry), 'parsedSections': registry},
        'files': list(sources.verified.values()), 'output': receipt,
        'counts': {'sourceFiles': len(files), 'selectedCandidates': len(selected),
                   'sourceEntityCounts': [v['context']['sourceEntityCount'] for v in files],
                   'contextEnabled': [v['context']['enabled'] for v in files]},
        'runtimeActivationAsserted': False})
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    if root != Path.cwd().resolve():
        raise ValueError('Run from the repository root')
    out = root / 'assets/gothic3/entity-lifecycle'
    public = root / 'public/gothic3/entity-lifecycle'
    out.mkdir(parents=True, exist_ok=True)
    public.mkdir(parents=True, exist_ok=True)
    functions, instructions, registrations, inputs, pes = [], {}, [], {}, {}
    for module, selected in SELECTED.items():
        short = SHORT[module]
        source = args.study / INPUTS[module]
        source_sha = sha(source)
        if source_sha != SUPPORTED_SHA256[short]:
            raise ValueError('Unsupported original ' + short + '.dll')
        inputs[short] = {'studyPath': INPUTS[module], 'sha256': source_sha, 'bytes': source.stat().st_size}
        pe = pes[short] = PE(source)
        bodies, rows, register = collect_module(args.study, module, set(selected), pe, out)
        functions.extend(bodies)
        instructions.update(rows)
        registrations.extend(register)
    vtables = dispatch_proofs(pes)
    comparator = comparator_proof(args.study, pes['Engine'], out)
    nav_cache_sentinel = pes['Game'].at(0x2065c04c, 4)
    if struct.unpack('<f', nav_cache_sentinel)[0] != -1.0:
        raise ValueError('Original NavPath cache constructor sentinel differs')
    node_id_import = native_imports(pes['Engine'])[0x30afd7f0]
    if (node_id_import['library'].lower() != 'sharedbase.dll' or
            exports(pes['SharedBase']).get(node_id_import['decoratedName']) != 0x10003a71):
        raise ValueError('Original Node.Read PropertyID stream binding differs')
    proxy_null_import = native_imports(pes['Game'])[0x207d6d24]
    if (proxy_null_import['library'].lower() != 'engine.dll' or
            exports(pes['Engine']).get(proxy_null_import['decoratedName']) != 0x30017e77 or
            proxy_null_import['decoratedName'] != '?SetEntity@eCEntityProxy@@QAEXPBVeCEntity@@@Z'):
        raise ValueError('Original NavPath GameReset entity-pointer NULL overload differs')
    proxy_destroy_import = native_imports(pes['Engine'])[0x30afd834]
    if (proxy_destroy_import['library'].lower() != 'sharedbase.dll' or
            exports(pes['SharedBase']).get(proxy_destroy_import['decoratedName']) != 0x100059ed):
        raise ValueError('Original proxy NULL PropertyID.Destroy import differs')
    property_types = {}
    for name, (module, address, expected) in PROPERTY_TYPES.items():
        # Every selected type getter has its constant return in recovered C,
        # backed independently by the instruction audit above.
        body = (out / 'sources' / module / (address + '.c.txt')).read_text(encoding='utf8')
        returns = re.findall(r'\breturn\s+(0x[0-9a-f]+|[0-9]+)\s*;', body)
        if len(returns) != 1 or int(returns[0], 0) != expected:
            raise ValueError('Original GetPropertySetType return differs: ' + name)
        property_types[name] = {'value': expected, 'source': module + ':' + address,
                                'allInstructionBytesMatchOriginalPE': True}
    audit = {'entries': len(functions),
             'instructions': sum(len(rows) for rows in instructions.values()),
             'matchedBytes': sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows),
             'comparatorAdditionalInstructions': len(comparator['instructions']),
             'comparatorAdditionalMatchedBytes': sum(len(bytes.fromhex(r['bytes'])) for r in comparator['instructions']) + 5,
             'allListedInstructionBytesMatchOriginalPE': True, 'nativeCodeExecuted': False}
    save_json(out / 'native-evidence.json', {
        'schema': 'gothic3-entity-lifecycle-native-evidence-v1', 'nativeCodeExecuted': False,
        'inputs': inputs, 'functions': functions, 'instructions': instructions,
        'registrations': registrations,
        'vtables': vtables, 'propertyTypes': property_types,
        'propertyTypeComparator': comparator,
        'constants': [{'module': 'Game', 'address': '2065c04c', 'bytes': nav_cache_sentinel.hex(),
                       'value': -1.0, 'type': 'float32', 'use': 'Invalidate20298370 heightmax/min sentinel'}],
        'nodePropertyIDStreamRead': {'EngineImportSlot': '30afd7f0', 'originalPEImport': node_id_import,
                                     'implementation': 'SharedBase:10003a71',
                                     'readsBytes': 20, 'copiesBytes': 16, 'clearsTrailingDWORD': True},
        'navPathGameResetProxyNull': {'GameImportSlot': '207d6d24', 'originalPEImport': proxy_null_import,
                                     'implementation': 'Engine:30017e77->304c43a0',
                                     'order': 'nonnull internal ReleaseReference -> pointer clear -> PropertyID.Destroy all20 bytes',
                                     'IDEqualityShortCircuit': False,
                                     'EngineDestroyImportSlot': '30afd834', 'originalPEDestroyImport': proxy_destroy_import,
                                     'destroyImplementation': 'SharedBase:100059ed'},
        'audit': audit,
    })
    output = resource_records(root, args.study, out, public)
    remaining = [
        'Full context construction: selected candidate exports omit other original nodes and cannot instantiate a complete context graph.',
        'Reflective object/accessor factory, complete class constructors/Create/Read and each class-specific OnPostRead override.',
        'Entity ReadV83 field setters and full template patching after dynamic Read; no bulk source-value copying substitutes for callbacks.',
        'PVS/cache-in, sector activation, ChildrenAvailable, physical collision/movement and processing-range traversal.',
        'SceneAdmin spatial/template tables and exact proxy lifetime/destruction hosts.',
        'Native GE_MESSAGEF_WARN missing-property-object branch and fatal already-owned-PS error observers.',
        'Existing-parent MoveToNode, spatial graph override, equal-type native qsort order, sorted AddPropertySet(true), PS type0/4 reflective-name lookup.',
        'Native multithread critical-section scheduling and x87 bit equivalence.',
    ]
    rules = {'schema': 'gothic3-entity-lifecycle-rules-v1',
        'inputs': {name: row['sha256'] for name, row in inputs.items()},
        'propertyOwnerOffset': 0x0c, 'propertyAddedBeforeAppend': True, 'propertyIDEqualityBytes': 16,
        'propertyTypes': {name: row['value'] for name, row in property_types.items()},
        'entity': {'constructorReferenceWord': 1,
                   'validity': 'eCNode::IsValid checks first16 PropertyID bytes, independently of referenceWord high bit',
                   'baseEntityCreate': 'reference high bit, frustum backpointer, property-type comparator; spatial Create override excluded',
                   'registration': 'SceneAdmin first table overwrite by first16 ID; erase by key regardless of stored pointer',
                   'storedIdentityRead': 'unregister old ID -> stream consume20/copy16/clear trailingDWORD -> register new ID',
                   'onReadContent': 'all four audited entity classes inherit empty eCNode::OnReadContent'},
        'propertyBase': {'constructorReferenceWord': 1, 'constructorFlagBit0': True,
                         'virtualValidity': 'base reference high bit, NOT serialized flag bit0',
                         'read': 'version>1 reads flagbit0 bool; otherwise sets true; derived reads are separate'},
        'navPath': {'vtable': '2068f414', 'inheritedNotifications': True, 'currentReadVersion': 39,
                    'constructor': 'Game20017b34->20298600, Game20005358 transient Invalidate; source arrays/margins are separate',
                    'constructorObjectOffsets': {'mean0': '0xbc', 'maximumMinus1': '0xc0', 'minimumMinus1': '0xc4',
                                                 'dirtyByte1': '0xb8', 'zeroFields': ['0x10c', '0x110', '0xc8']},
                    'read': 'version39 consumes only derived u16; legacy migration excluded',
                    'added': 'non-template map pointer registration, then inverse current owner world matrix, then empty Engine base',
                    'worldMatrixAdapter': 'path.worldMatrix aliases the exact stable mutable embedded live-owner matrix, never a serialized snapshot; CalcPathHeights2003014d rereads it on a cache miss',
                    'postRead': 'GameReset202983f0 clears DCC pointers and owner proxy, sets byteb8=1, leaves height cachesbc/c0/c4 unchanged; version39 skips legacy migration',
                    'heightCacheIdentity': 'rawbc/c0/c4 readers alias navigation path.heights; null represents constructor0/-1/-1'},
        'dynamicGraph': {'attachFreshChild': 'assign parent, recursive SetContext, AddReference, append',
                         'setGraph': 'AddReference argument, ReleaseReference old/clear, SetContext argument, assign',
                         'contextIsResidency': False},
        'sourceCandidatesAreLiveEntities': False, 'remaining': remaining,
        'evidence': {'path': 'native-evidence.json', 'sha256': sha(out / 'native-evidence.json')}}
    save_json(out / 'runtime-rules.json', rules)
    save_json(public / 'runtime-rules.json', rules)
    manifest = {'schema': 'gothic3-entity-lifecycle-manifest-v1',
                'inputs': {name: row['sha256'] for name, row in inputs.items()},
                'sourceCandidates': output, 'sourceCandidatesAreLiveEntities': False,
                'originalResourceReceipt': {'path': 'assets/gothic3/entity-lifecycle/original-resources.json',
                                             'bytes': (out / 'original-resources.json').stat().st_size,
                                             'sha256': sha(out / 'original-resources.json')},
                'nativeCodeExecuted': False, 'runtimeActivationAsserted': False}
    save_json(out / 'manifest.json', manifest)
    save_json(public / 'manifest.json', manifest)
    (out / 'README.txt').write_text(
        'Original entity/PS ownership, registered-ID rekey and fresh dynamic graph subset.\n'
        'Source candidates are never implicitly live, registered, resident or in processing range.\n'
        'Ardea NPC01 enabled=true; NPC02=false; SysDyn=true are serialized context facts, not PVS state.\n'
        'All selected function assembly bytes bind to pinned original PEs; no native execution.\n'
        'NavPath notifications use its actual inherited vtable; bind the exact live value store.\n'
        'Full reflective read, original template patching, complete contexts and physical engine hosts remain required.\n',
        encoding='utf8', newline='\n')
    def record(path):
        return {'path': path.relative_to(root).as_posix(), 'bytes': path.stat().st_size, 'sha256': sha(path)}
    receipt = out / 'implementation-receipt.json'
    namespace_files = [record(path) for base in (out, public) for path in sorted(base.rglob('*'))
                       if path.is_file() and path != receipt]
    helpers = ['research_native_combat.py', 'research_native_inventory.py', 'export_world_index.py',
               'read_gameplay_ini.py', 'read_gameplay_properties.py', 'read_genome.py', 'read_xshmat.py']
    save_json(receipt, {'schema': 'gothic3-entity-lifecycle-implementation-receipt-v1',
        'runtime': record(root / 'src/gothic3/entity-lifecycle.ts'), 'producer': record(Path(__file__)),
        'runtimeDependencies': [record(root / 'src/gothic3' / name) for name in
                                ['native-properties.ts', 'navigation-scene.ts', 'resource.ts', 'dialogue.ts']],
        'helpers': [record(root / 'tools/gothic3' / name) for name in helpers],
        'sourceSelectionHelper': record(root / 'public/gothic3/world/index.json'),
        'files': namespace_files, 'audit': audit, 'nativeCodeExecuted': False,
        'testsExecuted': False, 'actualNativeReadLifecycleExecuted': False,
        'remaining': remaining, 'sourceOutput': output})
    # Fresh exact output hashes, including compact decoded gzip bytes, before
    # reporting completion. This is conversion evidence, not a gameplay test.
    for item in namespace_files:
        path = root / item['path']
        if path.stat().st_size != item['bytes'] or sha(path) != item['sha256']:
            raise ValueError('Changed output during receipt publication')
    decoded = gzip.decompress((public / output['path']).read_bytes())
    if len(decoded) != output['uncompressedBytes'] or hashlib.sha256(decoded).hexdigest() != output['uncompressedSha256']:
        raise ValueError('Decoded source-candidate output differs from receipt')
    print({'native': audit, 'sourceOutput': output, 'namespaceFiles': len(namespace_files),
           'implementationReceiptSha256': sha(receipt)}, flush=True)


if __name__ == '__main__':
    main()
