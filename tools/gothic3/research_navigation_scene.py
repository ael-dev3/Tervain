"""Recover navigation-scene construction/query evidence without executing DLLs.

Run from the repository root with Python3.10+:
  python -B tools/gothic3/research_navigation_scene.py --study STUDY
Generated files are confined to the navigation-scene provenance/public namespaces.
"""
# SPDX-License-Identifier: GPL-3.0-only
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
import struct

from research_native_combat import (
    INPUTS, SHORT, SUPPORTED_SHA256, PE, collect_module, save_json, sha,
)
from research_native_inventory import collect as collect_shared, native_imports
from export_world_index import Sources, native_reader, portable, source_ref, read_sector
from read_gameplay_properties import read_gameplay_file
from export_gameplay import runtime_entity
from read_gameplay_ini import parse_ini

GAME_SELECTION = '''
200131a1 20013b29 20025ee1 2001ac94 20016be9 2000dc01
2000ae8e 2000b96f 2000a1f5 2003014d 20021b16 2001c4b8
2000271b 200043d1 2002a568 2002dd49 2000e859 20036c14
20013fc0 2001b17b 20027aa2
202e8a20 202e7750 202e7bd0 202e5270
'''.split()
SHARED_SELECTION = '''10002405 100027d9 10003283 1000335f 10005e39
100027a2 10008d23 10006758 10008625 100029ff 10006587 1000236f 10007ecd
10005196 10005781 10002dab 1000873d 10001f05 1000167c 10004c32'''.split()
MAP_SHA = '1b163f4f1be7115aeef37835e798772a3437db3429a32b4d36d866437b9a41c3'


def read_navigation_map(data: bytes) -> dict:
    """Exact serialized lists, with original order/proxies/padding retained.

    Layout corroboration: g3dit30113b8 NavMap sections1..4. Native behavior:
    Game202d6180 ReadLists and its byte-audited stream/list consumers.
    """
    r, end, encoding = native_reader(data)
    if encoding != 'GENOMFLE' or r.take(11) != b'GE3-NAV-MAP' or (r.u32(), r.u32()) != (3, 0):
        raise ValueError('Unsupported installed navigation-map header')
    sections, ranges, prefixes = {}, [], {}

    def boolean():
        value = r.u8()
        if value not in (0, 1):
            raise ValueError(f'Invalid navigation boolean at {r.pos - 1}')
        return bool(value)

    def f32():
        value = r.f32()
        if not math.isfinite(value):
            raise ValueError('Nonfinite navigation float cannot be represented faithfully in JSON')
        return value

    def vec(): return [f32(), f32(), f32()]
    def i32(): return r.unpack('i')[0]
    def guid(): return r.take(20).hex()

    def array(read, minimum=1, count16=False):
        prefix = r.u8()
        prefixes[prefix] = prefixes.get(prefix, 0) + 1
        count = r.u16() if count16 else r.u32()
        if count > (end - r.pos) // minimum:
            raise ValueError(f'Impossible navigation list count {count} at {r.pos}')
        return [read() for _ in range(count)]

    def proxy():
        offset = r.pos
        version = r.u16()
        name = r.entry() if boolean() else None
        entity_version = r.u16()
        identity = guid() if boolean() else None
        if version != 1 or entity_version != 1:
            raise ValueError(f'Unsupported property proxy version at {offset}')
        return {'propertySet': name, 'guid20': identity}

    def section(name, read):
        start = r.pos
        sections[name] = read()
        ranges.append({'section': name, 'start': start, 'end': r.pos,
                       'bytes': r.pos - start,
                       'sha256': hashlib.sha256(data[start:r.pos]).hexdigest()})

    section('grid', lambda: {
        'cells': array(lambda: array(lambda: array(proxy, 6), 5), 5),
        'minX': f32(), 'maxX': f32(), 'minZ': f32(), 'maxZ': f32(),
        'cellSizeX': f32(), 'cellSizeZ': f32(),
    })
    section('negativeZones', lambda: array(lambda: {
        'worldPointsCm': array(vec, 12), 'radiusCm': f32(),
        'worldRadiusOffsetCm': vec(), 'ccw': boolean(),
        'zoneGuid20': guid(), 'guid20': guid(),
    }, 62))
    section('collisionCircles', lambda: array(lambda: {
        'worldOffsetsCm': array(vec, 12), 'radiiCm': array(f32, 4),
        'obstacleType': i32(), 'zoneGuids20': array(guid, 20),
        'guid20': guid(), 'worldPositionY': f32(),
    }, 43))
    section('preferredPaths', lambda: array(lambda: {
        'worldPointsCm': array(vec, 12), 'pointRadiiCm': array(f32, 4),
        'radiusCm': f32(), 'worldRadiusOffsetCm': vec(), 'zoneGuid20': guid(),
    }, 46))
    section('zoneObjects', lambda: array(lambda: {
        'zone': proxy(), 'networkIndex': i32(),
        'negativeZoneIndices': array(i32, 4),
        'collisionCircleIndices': array(i32, 4),
        'preferredPathIndices': array(i32, 4),
    }, 25))
    section('collisionCircleOverlaps', lambda: array(lambda: {
        'circleIndex': i32(), 'zones': array(lambda: {
            'zoneGuid20': guid(), 'circleIndices': array(i32, 4),
        }, 25),
    }, 9))
    section('pathIntersections', lambda: array(lambda: {
        'path': proxy(), 'networkIndex': i32(),
        'zoneACenterCm': vec(), 'zoneAMargin1Cm': vec(), 'zoneAMargin2Cm': vec(),
        'zoneBCenterCm': vec(), 'zoneBMargin1Cm': vec(), 'zoneBMargin2Cm': vec(),
    }, 82))
    section('interactionAssignments', lambda: array(lambda: {
        'interaction': proxy(), 'area': proxy(),
    }, 12))
    section('networkObjects', lambda: array(lambda: {
        'area': proxy(), 'isPath': boolean(), 'linkIndices': array(i32, 4, True),
    }, 10))
    section('networkLinks', lambda: array(lambda: {
        'intersectionCm': vec(), 'zone': proxy(), 'path': proxy(),
    }, 24))

    def connection():
        distance, back_road = f32(), boolean()
        padding = r.take(3).hex()
        return {'distanceCm': distance, 'backRoad': back_road,
                'paddingHex': padding, 'linkIndex': i32()}
    section('waypoints', lambda: array(lambda: {
        'connections': array(connection, 12, True),
    }, 3))
    if r.pos != end:
        raise ValueError(f'Navigation sections consumed {r.pos}, expected {end}')
    grid = sections['grid']
    if not grid['cells'] or not grid['cells'][0] or grid['cellSizeX'] <= 0 or grid['cellSizeZ'] <= 0:
        raise ValueError('Invalid source navigation grid')
    rows = len(grid['cells'][0])
    if any(len(column) != rows for column in grid['cells']):
        raise ValueError('Nonrectangular source navigation grid is unsupported by native lookup')
    for binding in sections['zoneObjects']:
        for field, target in [('negativeZoneIndices', 'negativeZones'),
                              ('collisionCircleIndices', 'collisionCircles'),
                              ('preferredPathIndices', 'preferredPaths')]:
            if any(index < 0 or index >= len(sections[target]) for index in binding[field]):
                raise ValueError('Out-of-range stored navigation association ' + field)
    links = len(sections['networkLinks'])
    if any(index < 0 or index >= links for obj in sections['networkObjects'] for index in obj['linkIndices']):
        raise ValueError('Out-of-range network object link')
    if any(c['linkIndex'] < 0 or c['linkIndex'] >= links
           for w in sections['waypoints'] for c in w['connections']):
        raise ValueError('Out-of-range waypoint connection')
    return {'schema': 'gothic3-navigation-map-lists-v1',
            'nativeLoadPath': 'Game20025ee1 -> 202d6180 ReadLists NavigationMap.xnav',
            'encoding': encoding, 'fileVersion': 1, 'mapVersion': [3, 0],
            'sections': sections, 'sectionByteRanges': ranges,
            'prefixByteCounts': prefixes, 'payloadEnd': end,
            'counts': {name: len(value['cells']) if name == 'grid' else len(value)
                       for name, value in sections.items()}}


def save_compressed(path: Path, value: dict) -> dict:
    raw = (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf8')
    payload = gzip.compress(raw, mtime=0)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)
    return {'path': path.name, 'sha256': hashlib.sha256(payload).hexdigest(), 'bytes': len(payload),
            'uncompressedSha256': hashlib.sha256(raw).hexdigest(), 'uncompressedBytes': len(raw),
            'encoding': 'gzip'}


def extract_navigation_entities(root: Path, sources: Sources, navigation_map: dict,
                                out: Path, hosted: Path) -> tuple[dict, dict]:
    """Use the frozen index to find original records, then decode original bytes.

    No registration is inferred: each candidate carries original sector metadata.
    Even test/unregistered candidates are retained when an original map GUID names
    them. Multiple definitions of one GUID remain separate source identities.
    """
    base = root / 'public/gothic3/gameplay'
    manifest_path = base / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf8'))
    receipts = {entry['path']: entry for entry in manifest['outputs']}
    used_outputs = {}

    def verified_output(relative):
        relative = portable(relative)
        receipt = receipts[relative]
        data = (base / relative).read_bytes()
        if len(data) != receipt['bytes'] or hashlib.sha256(data).hexdigest() != receipt['sha256']:
            raise ValueError(f'Frozen gameplay receipt mismatch: {relative}')
        raw = gzip.decompress(data) if receipt.get('encoding') == 'gzip' else data
        if 'uncompressedSha256' in receipt and (
                len(raw) != receipt['uncompressedBytes'] or
                hashlib.sha256(raw).hexdigest() != receipt['uncompressedSha256']):
            raise ValueError(f'Frozen gameplay decoded receipt mismatch: {relative}')
        used_outputs[relative] = receipt
        return json.loads(raw)

    index = verified_output(manifest['world']['index'])
    files = {entry['index']: entry for entry in verified_output(manifest['world']['files'])}
    world_files_path = root / 'public/gothic3/world/world-files.json'
    world_index_path = root / 'public/gothic3/world/index.json'
    world_manifest_path = root / 'public/gothic3/world/source-manifest.json'
    world_manifest = json.loads(world_manifest_path.read_text(encoding='utf8'))
    for path in (world_files_path, world_index_path):
        receipt = world_manifest['outputs'][path.name]
        if path.stat().st_size != receipt['bytes'] or sha(path) != receipt['sha256']:
            raise ValueError('Frozen source world membership receipt differs: ' + path.name)
    world_index = json.loads(world_index_path.read_text(encoding='utf8'))
    sectors = {entry['id']: entry for entry in world_index['sectors']}
    registry_worlds = {entry['id']: entry for entry in world_index['worlds']}
    membership_receipts, verified_sectors, verified_registries = [], set(), set()

    def winning(source):
        candidates = sources.by_logical[(source['family'], source['path'].casefold())]
        if len(candidates) != 1 or candidates[0]['sha256'] != source['sha256']:
            raise ValueError('Frozen original source differs from installed winning layer')
        return candidates[0]

    def verify_membership(membership):
        for sector_id in membership['sectorIds']:
            sector = sectors[sector_id]
            if sector_id not in verified_sectors:
                decoded = read_sector(sources.read(winning(sector['source'])))
                expected = [(kind, order, name) for kind, key in
                            [('static-node', 'nodes'), ('dynamic-layer', 'dynamicLayers')]
                            for order, name in enumerate(decoded[key])]
                actual = [(row['kind'], row['order'], row['nativeName']) for row in sector['files']]
                if expected != actual:
                    raise ValueError('Native sector list differs from frozen membership graph')
                membership_receipts.append({'source': sector['source'], 'decodedMembershipHashVerified': True})
                verified_sectors.add(sector_id)
            if not any(row.get('fileId') == membership['id'] for row in sector['files']):
                raise ValueError('Claimed sector does not reference selected navigation file')
            for registration in sector['registrations']:
                world_id = registration['world']
                world = registry_worlds[world_id]
                if world_id not in verified_registries:
                    parsed = parse_ini(sources.read(winning(world['source'])))
                    original = [(row['key'], row['value'], row['line']) for row in parsed['records']
                                if row['section'] == 'Sector.List']
                    frozen = [(row['name'], row['rawValue'], row['line']) for row in world['registry']]
                    if original != frozen:
                        raise ValueError('Original world registry differs from frozen graph')
                    membership_receipts.append({'source': world['source'], 'decodedRegistryHashVerified': True})
                    verified_registries.add(world_id)
                if not any(row == registration for row in world['registry']):
                    raise ValueError('Sector registration is not in its original world registry')
    memberships = {entry['id'].casefold(): entry for entry in
                   json.loads(world_files_path.read_text(encoding='utf8'))['files']}
    referenced = set()
    for column in navigation_map['sections']['grid']['cells']:
        for cell in column:
            referenced.update(p['guid20'][:32] for p in cell if p['guid20'])
    referenced.update(row['zone']['guid20'][:32] for row in navigation_map['sections']['zoneObjects'] if row['zone']['guid20'])
    referenced.update(row['path']['guid20'][:32] for row in navigation_map['sections']['pathIntersections'] if row['path']['guid20'])
    wanted = {}
    for chunk in index['chunks']:
        rows = verified_output(chunk['url'])['entities']
        selected = [row for row in rows if (row.get('guid') or '')[:32] in referenced and
                    any(p in ('gCNavZone_PS', 'gCNavPath_PS') for p in row['propertySets'])]
        if selected:
            wanted.setdefault(chunk['sourceIndex'], []).extend(selected)
    records, source_receipts = [], []
    for file_index, indexed in sorted(wanted.items()):
        source = files[file_index]['source']
        entries = sources.by_logical[(source['family'], source['path'].casefold())]
        if len(entries) != 1 or entries[0]['sha256'] != source['sha256']:
            raise ValueError(f'Winning entity source mismatch: {source}')
        entry = entries[0]
        raw = sources.read(entry)
        document = read_gameplay_file(sources.path(entry), source=source, gameplay_only=True, strict=True)
        if document['sourceSha256'] != source['sha256'] or document['status'] != 'decoded':
            raise ValueError(f'Original navigation source did not decode: {source}')
        original = {row['index']: row for row in document['entities']}
        membership = memberships.get(source['path'].casefold())
        if membership is None or membership['source']['sha256'] != source['sha256']:
            raise ValueError(f'World membership/source mismatch: {source}')
        verify_membership(membership)
        proof_records = []
        for indexed_row in indexed:
            entity = original[indexed_row['entityIndex']]
            entity['key'] = indexed_row['key']
            if entity['guid'] != indexed_row['guid']:
                raise ValueError('Indexed identity differs from original decoded entity')
            compact = runtime_entity(entity)
            compact['propertySets'] = [p for p in compact['propertySets']
                                       if p['name'] in ('gCNavZone_PS', 'gCNavPath_PS')]
            compact['sourceIndex'] = len(source_receipts)
            records.append(compact)
            proof_records.append(entity)
        proof_receipt = save_compressed(out / f'entity-sources/{file_index:04d}.json.gz', {
            'source': source, 'sourceByteLength': len(raw), 'entities': proof_records,
            'readerMode': document['readerMode'],
        })
        source_receipts.append({'source': source, 'bytes': len(raw),
            'sectorIds': membership['sectorIds'], 'registered': membership['registered'],
            'enabledByAnyRegistry': membership['enabledByAnyRegistry'],
            'sourceProof': {'path': f'entity-sources/{file_index:04d}.json.gz', **
                            {k: v for k, v in proof_receipt.items() if k != 'path'}}})
    candidates = {}
    for entity in records:
        candidates.setdefault(entity['guid'][:32], []).append(entity['key'])
    unresolved = sorted(guid for guid in referenced if guid and guid not in candidates)
    duplicate = {guid: keys for guid, keys in candidates.items() if len(keys) > 1}
    definition = {'schema': 'gothic3-navigation-entity-definitions-v1', 'world': 'G3_World_01',
        'units': 'original centimetres', 'sourceCandidatesAreNotLiveRegistration': True,
        'sources': source_receipts, 'entities': records,
        'unresolvedMapPropertyIds16': unresolved, 'duplicateGuidCandidates': duplicate}
    receipt = save_compressed(hosted / 'entity-definitions.json.gz', definition)
    proof = {'schema': 'gothic3-navigation-entity-source-audit-v1',
             'gameplayManifestSha256': sha(manifest_path),
             'worldMembershipSha256': sha(world_files_path), 'indexOutputs': list(used_outputs.values()),
             'worldIndexSha256': sha(world_index_path), 'worldSourceManifestSha256': sha(world_manifest_path),
             'nativeMembershipInputs': membership_receipts,
             'entityCount': len(records), 'sourceCount': len(source_receipts),
             'unresolvedMapPropertyIds16': unresolved, 'duplicateGuidCandidates': duplicate,
             'allSelectedOriginalInputsHashVerified': True, 'output': receipt}
    save_json(out / 'entity-source-audit.json', proof)
    return definition, receipt


def query_map(navigation_map: dict) -> dict:
    """A smaller exact subset; all list order and original indices are retained."""
    sections = navigation_map['sections']
    proxies, proxy_ids = [], {}

    def proxy_index(proxy):
        key = (proxy['propertySet'], proxy['guid20'])
        if key not in proxy_ids:
            proxy_ids[key] = len(proxies)
            proxies.append(proxy)
        return proxy_ids[key]

    grid = sections['grid']
    cells = [[[proxy_index(p) for p in cell] for cell in column] for column in grid['cells']]
    return {'schema': 'gothic3-navigation-query-map-v1', 'mapSourceSha256': MAP_SHA,
            'proxies': proxies, 'grid': {**grid, 'cells': cells},
            'negativeZones': sections['negativeZones'],
            'zoneBindings': [{'proxy': proxy_index(row['zone']), 'networkIndex': row['networkIndex'],
                              'negativeZoneIndices': row['negativeZoneIndices']}
                             for row in sections['zoneObjects']],
            'pathBindings': [{'proxy': proxy_index(row['path']), **
                              {k: v for k, v in row.items() if k != 'path'}}
                             for row in sections['pathIntersections']]}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    args = parser.parse_args()
    root, study = Path(__file__).resolve().parents[2], args.study.resolve()
    if root != Path.cwd().resolve():
        raise ValueError('Run from the repository root')
    out = root / 'assets/gothic3/navigation-scene'
    hosted = root / 'public/gothic3/navigation-scene'
    if root == study or root in study.parents or study in out.parents:
        raise ValueError('Study and generated output must be separate')
    original = study / INPUTS['Game_dll']
    original_sha = sha(original)
    if original_sha != SUPPORTED_SHA256['Game']:
        raise ValueError('Unsupported original Game.dll build')
    functions, instructions, _ = collect_module(
        study, 'Game_dll', set(GAME_SELECTION), PE(original), out)
    shared_path = study / '00_Original_Runtime/SharedBase.dll'
    shared_sha = sha(shared_path)
    if shared_sha != '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214':
        raise ValueError('Unsupported original SharedBase build')
    shared_pe = PE(shared_path)
    shared_functions, shared_instructions = collect_shared(
        study, 'SharedBase_dll', SHARED_SELECTION, out, shared_pe)
    functions += shared_functions
    instructions.update(shared_instructions)
    game_pe = PE(original)
    relevant_imports = {f'{address:08x}': record
                       for address, record in native_imports(game_pe).items()
                       if any(fragment in (record.get('decoratedName') or '')
                              for fragment in ('InfDoubleCylinder', 'InfCylinder',
                                               'GetAngleUnitRad', 'g_fPI', 'g_f2PI',
                                               'PropertySetProxy', 'GetInverted'))}
    evidence = {
        'schema': 'gothic3-navigation-scene-native-evidence-v1',
        'nativeCodeExecuted': False,
        'inputs': {'Game': {'path': INPUTS['Game_dll'], 'sha256': original_sha},
                   'SharedBase': {'path': '00_Original_Runtime/SharedBase.dll', 'sha256': shared_sha}},
        'functions': functions, 'instructions': instructions,
        'mathAndProxyImports': relevant_imports,
        'constants': [{'module': 'SharedBase', 'address': f'{address:08x}',
                       'bytes': shared_pe.at(address, 4).hex(), 'name': name}
                      for address, name in [(0x100e5dc8, 'g_fPI'), (0x100e5dcc, 'g_f2PI'),
                                            (0x100e5de8, 'homogeneous near-zero epsilon float32')]] +
                     [{'module': 'Game', 'address': '2067bae0',
                       'bytes': game_pe.at(0x2067bae0, 8).hex(), 'name': 'angle boundary epsilon double'}],
        'audit': {
            'bodyCount': len(functions),
            'instructionCount': sum(len(rows) for rows in instructions.values()),
            'matchedBytes': sum(len(bytes.fromhex(r['bytes']))
                                for rows in instructions.values() for r in rows),
            'allInstructionBytesMatchOriginalPE': True,
        },
    }
    save_json(out / 'native-source-evidence.json', evidence)
    index_path = study / '02_Unpacked_Data/_metadata/effective_layers.json'
    entries = json.loads(index_path.read_text(encoding='utf8'))['files']
    matches = [entry for entry in entries if entry['family'] == 'projects_compiled'
               and entry['logical_path'].casefold() == 'g3_world_01/navigationmap.xnav']
    if len(matches) != 1 or matches[0]['sha256'] != MAP_SHA:
        raise ValueError('Unsupported winning installed navigation-map resource')
    sources = Sources(study, entries)
    raw = sources.read(matches[0])
    navigation_map = read_navigation_map(raw)
    navigation_map['source'] = {**source_ref(matches[0]), 'bytes': len(raw)}
    hosted_receipt = save_compressed(hosted / 'map-lists.json.gz', navigation_map)
    save_json(out / 'map-source-receipt.json', {
        'schema': 'gothic3-navigation-map-source-receipt-v1',
        'source': navigation_map['source'], 'selectionIndexSha256': sha(index_path),
        'sectionByteRanges': navigation_map['sectionByteRanges'],
        'prefixByteCounts': navigation_map['prefixByteCounts'],
        'counts': navigation_map['counts'], 'output': hosted_receipt,
        'layoutCorroboration': 'georgeto/g3dit30113b8254d3e6d0395d8e3c78618a99fbc0a6ca NavMap sections1..4; original PE ReadLists behavior is separately audited',
    })
    query_receipt = save_compressed(hosted / 'query-map.json.gz', query_map(navigation_map))
    definitions, definition_receipt = extract_navigation_entities(root, sources, navigation_map, out, hosted)
    manifest = {'schema': 'gothic3-navigation-scene-manifest-v1',
        'mapSourceSha256': MAP_SHA, 'inputs': {'Game': original_sha, 'SharedBase': shared_sha},
        'queryMap': query_receipt, 'definitions': definition_receipt, 'storedLists': hosted_receipt,
        'counts': {**navigation_map['counts'], 'sourceEntities': len(definitions['entities']),
                   'unresolvedMapPropertyIds16': len(definitions['unresolvedMapPropertyIds16']),
                   'duplicateGuidCandidates': len(definitions['duplicateGuidCandidates'])},
        'limitations': [
            'Source candidates do not prove live entity registration, sector residency or runtime activation.',
            'Stored original map loading is supported; forced recompilation, AIZone inheritance and door bindings remain separate dependencies.',
            'Network/obstacle lists are preserved, but this does not implement path search, collision avoidance or character physics.',
            'JS arithmetic models native float stores, not bit-identical x87 extended arithmetic at boundaries.',
        ]}
    save_json(hosted / 'manifest.json', manifest)
    save_json(out / 'original-inputs.json', {'effectiveLayersIndexSha256': sha(index_path),
                                           'files': list(sources.verified.values())})
    save_json(out / 'runtime-contract.json', {
        'schema': 'gothic3-navigation-scene-runtime-contract-v1',
        'stage': 'stored original map query-property binding and GetZone',
        'nativeEntrypoints': {
            'compileAdmin': 'Game200131a1->202bdd40', 'compileStatic': 'Game20013b29',
            'readLists': 'Game20025ee1->202d6180', 'getZone': 'Game20016be9->202c47e0',
            'zonePointTest': 'Game2000271b->2029f870', 'pathPointTest': 'Game2002a568->20297190',
            'negativeZonePointTest': 'Game20027aa2->202ebe80', 'doubleCylinderContains': 'SharedBase10005e39->100605d0',
            'matrixInverse': 'SharedBase100029ff->10032970', 'propertyIdEquality': 'SharedBase1000873d',
        },
        'supported': ['Exact original stored list decoding, all section byte ranges and source-layer proof',
                      'Typed original zone/path state with first16byte PropertyID equality',
                      'Stored zone negative pointers and path intersections, with virtual observer boundaries',
                      'Ordered stored grid GetZone, native height priorities, angle winding, tapered-cylinder and endpoint margins'],
        'hostBoundaries': ['Live eCPropertySetProxy resolution and world/property-set lifetime',
                           'Path NotifyPropertyValueChangedEnterEx/ExitEx(false)',
                           'Live transform/cache updates; source flags never establish registration'],
        'notImplemented': ['Full CompileNavigationScene success flag, GameReset/rebuild and forced precompile',
                           'RecompileAIZonePropertiesForNavZones Game2000dc01->202c37e0',
                           'Door-to-path registration and NPC current-zone/start-position initialization in Game202bdd40',
                           'Circle/preferred-path/interaction live object binding, route search, obstacle avoidance and movement physics'],
        'nextSourcePaths': ['Game202bdd40 full admin orchestration and dependent door/AIZone calls',
                            'Game202c37e0 AIZone property inheritance',
                            'Game202d6180 remaining collision/preferred-path/interaction bindings'],
        'precision': 'JS float-store reconstruction; not captured native x87 equivalence. Boundary results may differ.',
        'retry': 'One binding attempt per scene. Partial callbacks block replay; reconstruct host/areas and fresh scene explicitly.',
    })
    required = [Path(__file__), root / 'src/gothic3/navigation-scene.ts']
    dependencies = [root / 'tools/gothic3' / name for name in (
        'research_native_combat.py', 'research_native_inventory.py', 'export_world_index.py',
        'read_gameplay_properties.py', 'read_genome.py', 'export_gameplay.py', 'read_gameplay_ini.py',
        'read_native_gameplay_evidence.py', 'read_xcmsh.py', 'read_xshmat.py')]
    dependencies.append(root / 'assets/gothic3/gameplay/entity-semantics.json')
    files = sorted(set(required + dependencies + [path for parent in (out, hosted)
                   for path in parent.rglob('*') if path.is_file() and path.name != 'final-audit.json']),
                   key=lambda path: str(path))
    save_json(hosted / 'final-audit.json', {
        'schema': 'gothic3-navigation-scene-final-audit-v1', 'nativeCodeExecuted': False,
        'testsRun': False, 'allOriginalInstructionBytesMatched': True,
        'nativeCode': evidence['audit'], 'counts': manifest['counts'],
        'producer': {'path': str(Path(__file__).relative_to(root)).replace('\\', '/'),
                     'sha256': sha(Path(__file__)), 'command': 'python -B tools/gothic3/research_navigation_scene.py --study STUDY'},
        'files': [{'path': str(path.relative_to(root)).replace('\\', '/'),
                   'sha256': sha(path), 'bytes': path.stat().st_size} for path in files],
    })
    print(navigation_map['counts'])
    print(manifest['counts'])
    print({'queryMap': query_receipt, 'definitions': definition_receipt})
    print(evidence['audit'])


if __name__ == '__main__':
    main()
