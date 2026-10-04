# SPDX-License-Identifier: GPL-3.0-only
"""Index the installed world's native memberships without running Gothic 3.

Usage: python -B tools/gothic3/export_world_index.py --study STUDY
Writes only public/gothic3/world. This is a streaming/data index, not a renderer
or a claim that all indexed entities are active in the original game.

Binary format references: georgeto/g3dit commit
30113b8254d3e6d0395d8e3c78618a99fbc0a6ca, GenomeFile, SecDat,
OneClassGenomeFile, eCGeometrySpatialContext and CheckSectors; terrain streams
use the existing read_xcmsh reader, based on Baltram/rmtools GPL-3.0.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
import os
from pathlib import Path, PurePosixPath
import struct
import sys

from read_gameplay_ini import parse_ini
from read_genome import Reader, read_class
from read_xcmsh import read_mesh, mesh_bounds
from read_xshmat import InlineReader


SCHEMA = 'gothic3-world-index-v1'
REPO = Path(__file__).resolve().parents[2]
OUT = REPO / 'public' / 'gothic3' / 'world'
INDEX_PATH = '02_Unpacked_Data/_metadata/effective_layers.json'
PRIMARY_TERRAIN = {
    'g3_myrtana_landscape_01': 'Myrtana',
    'g3_nordmar_landscape_01': 'Nordmar',
    'g3_varant_landscape_01': 'Varant',
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def physical(path):
    """Use Win32 extended paths for physically present long study filenames."""
    path = str(Path(path).absolute())
    if os.name == 'nt' and not path.startswith('\\\\?\\'):
        path = '\\\\?\\UNC\\' + path[2:] if path.startswith('\\\\') else '\\\\?\\' + path
    return Path(path)


def portable(path):
    value = str(path).replace('\\', '/')
    parts = PurePosixPath(value).parts
    if value.startswith('/') or ':' in value or '..' in parts:
        raise ValueError(f'Unsafe relative resource path: {value}')
    return value


def source_ref(entry):
    return {'family': entry['family'], 'archive': entry['candidate_effective_archive'],
            'path': portable(entry['logical_path']), 'sha256': entry['sha256'],
            'selection': 'static-effective-layer-candidate',
            'layers': [v['archive'] for v in entry['versions']]}


class Sources:
    def __init__(self, study, entries):
        self.study, self.entries, self.verified = study, entries, {}
        self.by_name = defaultdict(list)
        self.by_logical = defaultdict(list)
        for entry in entries:
            logical = portable(entry['logical_path'])
            self.by_name[(entry['family'], PurePosixPath(logical).name.casefold())].append(entry)
            self.by_logical[(entry['family'], logical.casefold())].append(entry)

    def path(self, entry):
        relative = portable(entry['candidate_effective_output'])
        target = self.study / relative
        # Study files are immutable inputs. Do not follow a link outside it.
        resolved = physical(target).resolve()
        if not resolved.is_relative_to(physical(self.study).resolve()):
            raise ValueError(f'Source escapes study: {relative}')
        return resolved

    def read(self, entry):
        data = self.path(entry).read_bytes()
        if not entry.get('verified') or sha(data) != entry['sha256']:
            raise ValueError(f"Source hash mismatch: {entry['logical_path']}")
        key = entry['family'] + ' :: ' + entry['logical_path']
        self.verified[key] = {**source_ref(entry), 'bytes': len(data),
                              'studyRelativePath': portable(entry['candidate_effective_output'])}
        return data

    def resolve(self, name, extension, family='projects_compiled', world=None):
        normalized = portable(name)
        if not normalized.casefold().endswith(extension):
            normalized += extension
        matches = self.by_logical.get((family, normalized.casefold()), [])
        if not matches:
            matches = self.by_name.get((family, PurePosixPath(normalized).name.casefold()), [])
        if world and len(matches) > 1:
            same_world = [e for e in matches if e['logical_path'].casefold().startswith(world.casefold() + '/')]
            if same_world:
                matches = same_world
        if len(matches) == 1:
            return matches[0], None
        return None, {'kind': 'missing-reference' if not matches else 'ambiguous-reference',
                      'resource': normalized, 'candidates': [source_ref(e) for e in matches]}


def native_reader(data):
    """Genome string-table container or old inline-string container."""
    if data[:8] != b'GENOMFLE':
        return InlineReader(data), len(data), 'inline-strings'
    reader = Reader(data)
    reader.skip(8)
    if reader.u16() != 1:
        raise ValueError('Unexpected GENOMFLE version')
    end = reader.u32()
    trailer = Reader(data, offset=end)
    if trailer.u32() != 0xDEADBEEF or trailer.u8() != 1:
        raise ValueError('Invalid Genome trailer/string table')
    strings = [trailer.take(trailer.u16()).decode('cp1252') for _ in range(trailer.u32())]
    if trailer.pos != len(data):
        raise ValueError('Trailing data after Genome string table')
    return Reader(data, strings, 14), end, 'GENOMFLE'


def read_sector(data):
    reader, end, encoding = native_reader(data)
    version = reader.u16()
    if version != 0x1b:
        raise ValueError(f'Unexpected sector version {version}')
    dynamic_count, node_count = reader.u32(), reader.u32()
    dynamic = [reader.entry() for _ in range(dynamic_count)]
    nodes = [reader.entry() for _ in range(node_count)]
    if reader.pos != end:
        raise ValueError('Sector membership did not consume complete payload')
    return {'version': version, 'encoding': encoding, 'nodes': nodes, 'dynamicLayers': dynamic}


def valid_bounds(values):
    return (len(values) == 6 and all(math.isfinite(v) for v in values)
            and all(values[i] <= values[i + 3] for i in range(3)))


def bounds_record(values):
    if not valid_bounds(values):
        return {'nativeRaw': values, 'valid': False,
                'reason': 'native invalid/empty box (including max-float sentinels)'}
    low, high = values[:3], values[3:]
    return {'valid': True, 'nativeCentimetres': {'min': low, 'max': high},
            'browserMetres': {'min': [low[0] / 100, low[1] / 100, -high[2] / 100],
                              'max': [high[0] / 100, high[1] / 100, -low[2] / 100]}}


def read_context(data):
    reader, end, encoding = native_reader(data)
    cls = read_class(reader, False)
    if cls['name'] != 'eCGeometrySpatialContext' or reader.pos != end:
        raise ValueError('Unexpected geometry context class/boundary')
    props = {p['name']: p for p in cls['properties']}
    box = bytes.fromhex(props['ContextBox']['raw'])
    tail = bytes.fromhex(cls['tail'])
    # Installed v30/v56 contexts predate the stored hybrid flag. Native
    # eCGeometrySpatialContext::Read reads the remaining 24-byte box. Preserve
    # an absent hybrid value as unknown instead of fabricating false.
    old_flags = cls['version'] in (30, 56) and len(tail) == 25
    if len(box) != 24 or len(tail) not in (25, 26) or tail[0] > 1 or (not old_flags and (len(tail) != 26 or tail[1] > 1)):
        raise ValueError('Unexpected geometry context box/flags')
    values = list(struct.unpack('<6f', box))
    flags_size = 1 if old_flags else 2
    tail_values = list(struct.unpack('<6f', tail[flags_size:]))
    return {'encoding': encoding, 'version': cls['version'], 'enabled': bool(tail[0]),
            'hybrid': None if old_flags else bool(tail[1]),
            'flagLayout': 'enabled-only-legacy' if old_flags else 'enabled-and-hybrid',
            'decodeStatus': 'decoded', 'bounds': bounds_record(values),
            'storedBounds': bounds_record(tail_values),
            'propertyAndStoredBoundsAgree': box == tail[flags_size:],
            'idRaw': props.get('ID', {}).get('raw')}


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n').encode('utf-8')


def main():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--study', type=Path, required=True)
    args = ap.parse_args()
    study = args.study.resolve()
    if OUT.resolve().is_relative_to(study):
        raise ValueError('Output must be outside the immutable study')
    effective_data = physical(study / INDEX_PATH).read_bytes()
    entries = json.loads(effective_data)['files']
    sources = Sources(study, entries)
    project = sorted((e for e in entries if e['family'] == 'projects_compiled'),
                     key=lambda e: e['logical_path'].casefold())
    issues, worlds, sectors = [], [], []
    memberships = defaultdict(list)
    world_files = {}
    contexts = {}

    # Keep all winning world files, including those unregistered in a sector.
    for e in project:
        ext = PurePosixPath(e['logical_path']).suffix.casefold()
        if ext in ('.node', '.lrentdat'):
            data = sources.read(e)
            world_files[e['logical_path']] = {'id': e['logical_path'], 'source': source_ref(e),
                'bytes': len(data), 'kind': 'static-node' if ext == '.node' else 'dynamic-layer'}
        elif ext == '.lrgeodat':
            data = sources.read(e)
            if not data:
                decoded = {'decodeStatus': 'empty-native-resource', 'enabled': None,
                           'hybrid': None, 'bounds': None, 'storedBounds': None}
                issues.append({'kind': 'empty-native-context', 'source': source_ref(e)})
            else:
                try:
                    decoded = read_context(data)
                except Exception as error:
                    raise ValueError(f"Cannot decode geometry context {e['logical_path']}") from error
            node_path = str(PurePosixPath(e['logical_path']).with_suffix('.node'))
            contexts[node_path.casefold()] = {'source': source_ref(e), **decoded}

    print(f'Verified {len(world_files)} world files and {len(contexts)} geometry contexts.', flush=True)

    def compile_sector(entry, registrations):
        key = entry['logical_path']
        decoded = read_sector(sources.read(entry))
        record = {'id': key, 'name': PurePosixPath(key).stem,
                  'source': source_ref(entry), 'registrations': registrations,
                  'registered': bool(registrations),
                  'enabledByAnyRegistry': any(r['enabled'] is True for r in registrations),
                  'membershipVersion': decoded['version'], 'encoding': decoded['encoding'],
                  'files': [], 'issues': []}
        for kind, names, extension in [('static-node', decoded['nodes'], '.node'),
                                      ('dynamic-layer', decoded['dynamicLayers'], '.lrentdat')]:
            for order, name in enumerate(names):
                member, issue = sources.resolve(name, extension,
                    world=registrations[0]['world'] if registrations else key.split('/')[0])
                ref = {'kind': kind, 'order': order, 'nativeName': name,
                       'fileId': member['logical_path'] if member else None}
                if issue:
                    ref['issue'] = issue
                    record['issues'].append(issue)
                    issues.append({'sector': key, **issue})
                else:
                    memberships[member['logical_path']].append(key)
                record['files'].append(ref)
        sectors.append(record)
        return key

    # First collect registrations so one native sector can retain every owner.
    registration_map = defaultdict(list)
    for e in project:
        if not e['logical_path'].casefold().endswith('.wrldatasc'):
            continue
        parsed = parse_ini(sources.read(e))
        world_name = PurePosixPath(e['logical_path']).stem
        registry = []
        world = {'id': world_name, 'source': source_ref(e), 'encoding': parsed['encoding'],
                 'registry': registry, 'issues': parsed['issues'], 'controlFiles': []}
        for ext in ('.wrl', '.wrldat'):
            control, issue = sources.resolve(world_name, ext, world=world_name)
            if control:
                sources.read(control)
                world['controlFiles'].append(source_ref(control))
            else:
                world['issues'].append(issue)
        records = [r for r in parsed['records'] if r['section'] == 'Sector.List']
        if not records:
            world['issues'].append({'kind': 'missing-sector-list'})
        for r in records:
            enabled = {'true': True, 'false': False}.get(r['value'].casefold())
            registration = {'world': world_name, 'name': r['key'], 'enabled': enabled,
                            'line': r['line'], 'rawValue': r['value'], 'sectorId': None}
            sector, issue = sources.resolve(r['key'], '.secdat', world=world_name)
            if enabled is None:
                world['issues'].append({'kind': 'invalid-sector-enabled', 'line': r['line'], 'value': r['value']})
            if sector:
                registration['sectorId'] = sector['logical_path']
                registration_map[sector['logical_path']].append(registration)
            else:
                registration['issue'] = issue
                issues.append({'world': world_name, 'enabled': enabled, **issue})
            registry.append(registration)
        worlds.append(world)

    for e in project:
        if e['logical_path'].casefold().endswith('.secdat'):
            compile_sector(e, registration_map.get(e['logical_path'], []))
    sector_by_id = {s['id']: s for s in sectors}
    for file_id, record in world_files.items():
        ids = sorted(set(memberships[file_id]))
        record['sectorIds'] = ids
        record['hasSectorMembership'] = bool(ids)
        record['registered'] = any(sector_by_id[i]['registered'] for i in ids)
        record['enabledByAnyRegistry'] = any(sector_by_id[i]['enabledByAnyRegistry'] for i in ids)
        context = contexts.get(file_id.casefold())
        record['spatialContext'] = context
        if len(ids) > 1:
            issues.append({'kind': 'multiple-sector-membership', 'fileId': file_id, 'sectorIds': ids})
    orphan_contexts = [v for k, v in contexts.items() if not any(f.casefold() == k for f in world_files)]
    print(f'Indexed {len(worlds)} worlds and {len(sectors)} sectors; {len(issues)} source membership issues retained.', flush=True)

    terrain, mesh_inventory = [], []
    for e in sorted((v for v in entries if v['logical_path'].casefold().endswith('.xcmsh')),
                    key=lambda v: (v['family'], v['logical_path'].casefold())):
        logical = PurePosixPath(e['logical_path'])
        region = PRIMARY_TERRAIN.get(logical.parts[0].casefold())
        is_cell = bool(region and '_landscape_cell_' in logical.name.casefold())
        data = sources.read(e)
        mesh_inventory.append({'id': e['family'] + ' :: ' + e['logical_path'],
                               'source': source_ref(e), 'bytes': len(data), 'terrainCell': is_cell})
        if not is_cell:
            continue
        sections = read_mesh(sources.path(e))
        # The existing reader reads a path, so verify the bytes again after it.
        sources.read(e)
        low, high = mesh_bounds(sections)
        if not valid_bounds(low + high):
            raise ValueError(f'Invalid terrain mesh bounds: {logical}')
        section_data = []
        for section in sections:
            streams = section['streams']
            indices = streams.get(0, {}).get('count', 0)
            if indices % 3:
                raise ValueError(f'Terrain index count is not triangular: {logical}')
            section_data.append({'material': section['material'],
                'vertices': streams.get(1, {}).get('count', 0), 'triangles': indices // 3,
                'bounds': bounds_record(section['box'])})
        terrain.append({'id': e['family'] + ' :: ' + e['logical_path'], 'region': region,
            'source': source_ref(e), 'bytes': len(data), 'bounds': bounds_record(low + high),
            'vertices': sum(s['vertices'] for s in section_data),
            'triangles': sum(s['triangles'] for s in section_data), 'sections': section_data,
            'coordinateSpace': 'native-world-space-centimetres',
            'resourceRole': 'installed-landscape-cell; filename directory is LOD/lod',
            'sectorBinding': 'not reconstructed; spatial overlap is not native membership'})
        if len(terrain) % 100 == 0:
            print(f'Decoded {len(terrain)} native terrain cells.', flush=True)

    summary = {'effectiveResources': len(entries), 'worlds': len(worlds),
        'registryEntries': sum(len(w['registry']) for w in worlds),
        'enabledRegistryEntries': sum(r['enabled'] is True for w in worlds for r in w['registry']),
        'disabledRegistryEntries': sum(r['enabled'] is False for w in worlds for r in w['registry']),
        'missingRegistryReferences': sum(r['sectorId'] is None for w in worlds for r in w['registry']),
        'sectors': len(sectors), 'registeredSectors': sum(s['registered'] for s in sectors),
        'enabledSectors': sum(s['enabledByAnyRegistry'] for s in sectors),
        'worldFiles': len(world_files), 'worldFilesByKind': dict(Counter(v['kind'] for v in world_files.values())),
        'worldFilesWithSectorMembership': sum(v['hasSectorMembership'] for v in world_files.values()),
        'registeredWorldFiles': sum(v['registered'] for v in world_files.values()),
        'registryEnabledWorldFiles': sum(v['enabledByAnyRegistry'] for v in world_files.values()),
        'geometryContexts': len(contexts), 'orphanGeometryContexts': len(orphan_contexts),
        'validContextBounds': sum(bool(v.get('bounds') and v['bounds']['valid']) for v in contexts.values()),
        'meshResources': len(mesh_inventory), 'terrainCells': len(terrain),
        'terrainCellsByRegion': dict(Counter(t['region'] for t in terrain)),
        'terrainTriangles': sum(t['triangles'] for t in terrain),
        'membershipIssues': len(issues), 'verifiedInputs': len(sources.verified)}
    limitations = [
        'This indexes source data. It does not render or simulate the full world.',
        'Registry-enabled is a source flag, not proof of quest activation or native runtime residency.',
        'Missing and ambiguous registry/member references are retained, not silently repaired.',
        'Unregistered world files and sectors are inventoried; they are not automatically activated.',
        'Geometry context bounds are native metadata, not collision surfaces or terrain geometry.',
        'Available landscape Cell meshes are indexed with native section bounds; full-detail implicit/GUID terrain resolution remains unimplemented.',
        'Terrain-cell sector ownership is not inferred from geometric overlap.',
        'Entity GUIDs, gameplay properties, template inheritance, navigation, vegetation and trigger execution are compiled/implemented separately.',
        'Browser bounds use absolute world metres with Z reflected; subtract an explicit floating origin at render time.',
        'Static effective archive layer selection is verified against the completed local study, not a capture of runtime modifications or saves.',
    ]
    artifacts = {
        'index.json': {'schema': SCHEMA, 'selection': 'static-effective-layer-candidate',
            'coordinates': {'sourceUnits': 'centimetres', 'sourceUp': 'Y',
                'browserUnits': 'metres', 'pointConversion': '[X/100,Y/100,-Z/100]',
                'origin': [0, 0, 0], 'ardeaSceneOriginNative': [92000, 5200, -12000]},
            'summary': summary, 'worlds': worlds, 'sectors': sectors, 'issues': issues,
            'limitations': limitations, 'files': {'worldFiles': 'world-files.json',
                'terrain': 'terrain.json', 'meshResources': 'mesh-resources.json', 'manifest': 'source-manifest.json'}},
        'world-files.json': {'schema': SCHEMA, 'files': list(world_files.values()),
                             'orphanGeometryContexts': orphan_contexts},
        'terrain.json': {'schema': SCHEMA, 'cells': terrain},
        'mesh-resources.json': {'schema': SCHEMA, 'resources': mesh_inventory},
    }
    encoded = {name: json_bytes(value) for name, value in artifacts.items()}
    manifest = {'schema': SCHEMA, 'summary': summary, 'limitations': limitations,
        'effectiveLayersIndex': {'studyRelativePath': INDEX_PATH, 'sha256': sha(effective_data), 'bytes': len(effective_data)},
        'compiler': {'path': 'tools/gothic3/export_world_index.py',
                     'sha256': sha(Path(__file__).read_bytes()),
                     'command': 'python -B tools/gothic3/export_world_index.py --study STUDY',
                     'dependencies': [{'path': 'tools/gothic3/' + name,
                                       'sha256': sha((Path(__file__).parent / name).read_bytes())}
                                      for name in ('read_genome.py', 'read_xcmsh.py',
                                                   'read_xshmat.py', 'read_gameplay_ini.py')]},
        'formatReferences': {'g3dit': '30113b8254d3e6d0395d8e3c78618a99fbc0a6ca',
                             'rmtools': '5525421bf4b22636259bdc0d250ee96a5abcae66'},
        'inputs': list(sources.verified.values()),
        'outputs': {name: {'sha256': sha(data), 'bytes': len(data)} for name, data in encoded.items()}}
    if sha(physical(study / INDEX_PATH).read_bytes()) != sha(effective_data):
        raise ValueError('Effective layers index changed during compilation')
    encoded['source-manifest.json'] = json_bytes(manifest)
    # Build everything before replacing artifacts. Publish the manifest last.
    OUT.mkdir(parents=True, exist_ok=True)
    for name, data in encoded.items():
        target = OUT / name
        temporary = OUT / (name + '.tmp')
        temporary.write_bytes(data)
        temporary.replace(target)
    for name, data in encoded.items():
        if (OUT / name).read_bytes() != data:
            raise ValueError(f'Generated artifact failed readback: {name}')
    print(json.dumps({'output': OUT.as_posix(), 'summary': summary,
                      'manifestSha256': sha(encoded['source-manifest.json'])}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
