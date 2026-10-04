# SPDX-License-Identifier: GPL-3.0-only
"""Repack a completed local gameplay export and repair explicitly failed sources.

Only generated gameplay files are replaced. Original study and full raw audits
remain read-only except refreshed failed-source audit documents. No game runs.
"""
import argparse
from collections import Counter
import gzip
import json
from pathlib import Path

from export_gameplay import (read_verified, source_path, source_ref, write_json,
                            write_compressed, write_world_chunks, runtime_entity, sha)
from read_gameplay_properties import read_gameplay_file, read_template_file


def load(path): return json.loads(path.read_bytes())


def receipts(output, manifest):
    rows = []
    for path in sorted(output.rglob('*')):
        if not path.is_file() or not path.name.endswith(('.json', '.json.gz')) or path.name == 'manifest.json':
            continue
        data = path.read_bytes()
        row = {'path': path.relative_to(output).as_posix(), 'bytes': len(data), 'sha256': sha(data)}
        if path.name.endswith('.gz'):
            raw = gzip.decompress(data)
            # Actual JSON decoding is a data integrity audit, not a game test.
            json.loads(raw)
            row.update(contentEncoding='gzip', encoding='gzip', uncompressedBytes=len(raw), uncompressedSha256=sha(raw))
        rows.append(row)
    manifest['outputs'] = rows
    manifest['transport'] = {'compressed': 'gzip', 'integrity': 'Validate compressed and decompressed SHA256/bytes before JSON use.',
        'propertySets': '{name,version,values,unknownProperties?,duplicateProperties?,tail?}',
        'enums': 'Decoded enum values are numeric; names/types/symbols and exact bytes remain in the local audit.',
        'worldChunks': 'Source descriptors reference ordered chunks of at most256 gameplay entities; geometry-only entities stay in the index.'}
    write_json(output/'manifest.json', manifest)
    return {'files': len(rows), 'bytes': sum(r['bytes'] for r in rows),
            'sha256': sha((output/'manifest.json').read_bytes())}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[2]/'public/gothic3/gameplay')
    parser.add_argument('--raw-output', type=Path, default=Path(__file__).resolve().parents[3]/'gothic3_gameplay_raw')
    parser.add_argument('--refresh-receipts-only', action='store_true')
    args = parser.parse_args()
    output = args.output.resolve()
    manifest = load(output/'manifest.json')
    if args.refresh_receipts_only:
        print(json.dumps(receipts(output, manifest), indent=2))
        return
    if args.study is None:
        parser.error('--study required for source repairs')
    effective = load(args.study/'02_Unpacked_Data/_metadata/effective_layers.json')
    entries = sorted(effective['files'], key=lambda e: (e['family'].lower(), e['logical_path'].lower()))
    worlds = [e for e in entries if Path(e['logical_path']).suffix.lower() in ('.lrentdat', '.node')]
    templates = [e for e in entries if Path(e['logical_path']).suffix.lower() == '.tple']
    files = load(output/'world/files.json')
    index = load(output/'world/index.json')
    errors = []
    failed = {row['index'] for row in load(output/'world/errors.json')}
    for number in sorted(failed):
        entry = worlds[number]
        read_verified(args.study, entry)
        source = source_ref(entry)
        doc = read_gameplay_file(source_path(args.study, entry['candidate_effective_output']), source=source)
        if doc.get('status') == 'unsupported':
            error = {'index': number, 'source': source, 'status': 'unsupported', 'error': doc['unsupportedReason']}
            errors.append(error)
            files[number] = {'index': number, 'source': source, 'entities': None, 'gameplayEntities': None,
                             'status': 'unsupported', 'error': doc['unsupportedReason']}
            write_json(args.raw_output/f'world/{number:04d}.json', doc)
            continue
        rows = []
        for record in doc['entities']:
            names = [p['name'] for p in record['propertySets']]
            gameplay = any(name.startswith('gC') for name in names)
            key = f'world-{number:04d}:{record["index"]}'
            index.append({'key': key, 'name': record['name'], 'guid': record['guid'], 'creator': record.get('creator'),
                          'file': number, 'entityIndex': record['index'], 'propertySets': names,
                          'hasGameplay': gameplay, 'position': record['worldMatrix'][12:15] if record.get('worldMatrix') else None})
            if gameplay:
                record['key'] = key
                rows.append(record)
        raw = {'source': source, 'entities': rows, 'parents': doc.get('parents', [])}
        write_json(args.raw_output/f'world/{number:04d}.json', raw)
        # The regular repack pass below accepts these full normalized records.
        write_json(output/f'world/{number:04d}.json', raw)
        files[number] = {'index': number, 'url': f'world/{number:04d}.json', 'source': source,
                         'entities': len(doc['entities']), 'gameplayEntities': len(rows)}
    for number in (86, 216):
        entry = templates[number]
        read_verified(args.study, entry)
        doc = read_template_file(source_path(args.study, entry['candidate_effective_output']), source=source_ref(entry))
        write_json(args.raw_output/f'templates/{number:04d}.json', doc)
        write_json(output/f'templates/{number:04d}.json', doc)
    for file in files:
        if 'url' not in file:
            continue
        path = output/file['url']
        doc = load(path)
        if doc.get('schema') == 'gothic3-entity-chunks-v1':
            continue
        write_world_chunks(output, file['index'], doc['source'], doc['entities'], doc.get('parents', []))
        if file['index'] % 100 == 0:
            print(f'World compacted {file["index"]}/{len(files)}', flush=True)
    index.sort(key=lambda row: (row['file'], row['entityIndex']))
    if len({r['key'] for r in index}) != len(index):
        raise ValueError('Repeated world key after failed-source patch')
    write_compressed(output/'world/index.json.gz', index)
    (output/'world/index.json').unlink()
    write_json(output/'world/files.json', files)
    write_json(output/'world/errors.json', errors)
    t_files = load(output/'templates/files.json')
    for file in t_files:
        if 'url' not in file:
            continue
        path = output/file['url']
        doc = load(path)
        new_path = file['url']+'.gz'
        proof = write_compressed(output/new_path, {'source': doc['source'],
            'entities': [runtime_entity(row) for row in doc['entities']], 'parents': doc['parents']})
        path.unlink()
        file.update(url=new_path, **proof)
        if file['index'] % 500 == 0:
            print(f'Template compacted {file["index"]}/{len(t_files)}', flush=True)
    t_index = load(output/'templates/index.json')
    write_compressed(output/'templates/index.json.gz', t_index)
    (output/'templates/index.json').unlink()
    write_json(output/'templates/files.json', t_files)
    audit = load(output/'audit.json')
    w = audit['world']
    w.update(decodedSources=len(worlds)-len(errors), failedSources=len(errors),
             indexedEntities=len(index), gameplayEntities=sum(f.get('gameplayEntities') or 0 for f in files))
    write_json(output/'audit.json', audit)
    manifest['counts'] = audit
    manifest['world']['index'] = 'world/index.json.gz'
    manifest['templates']['index'] = 'templates/index.json.gz'
    from bound_gameplay_chunks import bound
    write_json(output/'chunk-audit.json', bound(output))
    print(json.dumps(receipts(output, manifest), indent=2))


if __name__ == '__main__': main()
