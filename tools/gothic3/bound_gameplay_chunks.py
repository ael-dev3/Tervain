# SPDX-License-Identifier: GPL-3.0-only
"""Bound hosted gameplay JSON decompression and build source/entity navigation."""
from collections import defaultdict
import gzip
import json
from pathlib import Path

from export_gameplay import write_json, write_compressed

LIMIT = 4*1024*1024


def read(path):
    data = path.read_bytes()
    if path.name.endswith('.gz'):
        data = gzip.decompress(data)
    return json.loads(data)


def bounded_rows(rows, field, maximum=4096):
    chunk, length = [], len(field)+16
    for row in rows:
        size = len(json.dumps(row, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8'))+1
        if size+len(field)+16 > LIMIT:
            raise ValueError('A single gameplay record exceeds the4MiB bound; nested field partitioning is required.')
        if chunk and (length+size > LIMIT or len(chunk) == maximum):
            yield chunk
            chunk, length = [], len(field)+16
        chunk.append(row)
        length += size
    if chunk:
        yield chunk


def bound(output):
    mapping = {}
    descriptors = sorted((output/'world').glob('[0-9][0-9][0-9][0-9].json'))
    for path in descriptors:
        doc = read(path)
        if doc.get('schema') != 'gothic3-entity-chunks-v1':
            continue
        chunks, serial = [], 0
        old_chunks = list(doc['chunks'])
        loaded = [(old, read(output/old['url'])['entities']) for old in old_chunks]
        for old, rows in loaded:
            partitions = list(bounded_rows(rows, 'entities', maximum=256))
            for group in partitions:
                url = f'world/entity-chunks/{path.stem}-{serial:04d}.json.gz'
                proof = write_compressed(output/url, {'entities': group})
                if proof['uncompressedBytes'] > LIMIT:
                    raise ValueError('Gameplay chunk exceeds recorded bound')
                chunks.append({'url': url, 'entities': len(group), **proof})
                for row in group:
                    mapping[row['key']] = url
                serial += 1
        doc['chunks'] = chunks
        write_json(path, doc)
        retained = {part['url'] for part in chunks}
        for old in old_chunks:
            if old['url'] not in retained:
                (output/old['url']).unlink()
    index_path = output/'world/index.json.gz'
    index = read(index_path)
    if isinstance(index, dict) and index.get('schema') == 'gothic3-world-index-chunks-v1':
        index = [row for part in index['chunks'] for row in read(output/part['url'])['entities']]
    by_file = defaultdict(list)
    for row in index:
        if row['hasGameplay']:
            row['dataChunk'] = mapping[row['key']]
        by_file[row['file']].append(row)
    index_parts = []
    for number, rows in sorted(by_file.items()):
        parts = []
        for sequence, group in enumerate(bounded_rows(rows, 'entities')):
            url = f'world/indices/{number:04d}-{sequence:04d}.json.gz'
            proof = write_compressed(output/url, {'entities': group})
            part = {'sourceIndex': number, 'url': url, 'entities': len(group), **proof}
            parts.append(part)
            index_parts.append(part)
        descriptor = output/f'world/{number:04d}.json'
        if descriptor.exists():
            doc = read(descriptor)
            doc['indexChunks'] = parts
            write_json(descriptor, doc)
    write_compressed(index_path, {'schema': 'gothic3-world-index-chunks-v1',
        'entityCount': len(index), 'chunks': index_parts})
    template_index_path = output/'templates/index.json.gz'
    index = read(template_index_path)
    if isinstance(index, dict) and index.get('schema') == 'gothic3-template-index-chunks-v1':
        index = [row for part in index['chunks'] for row in read(output/part['url'])['headers']]
    t_files = read(output/'templates/files.json')
    for row in index:
        source = t_files[row['file']]
        row['dataChunk'] = source.get('url')
    parts = []
    for sequence, group in enumerate(bounded_rows(index, 'headers')):
        url = f'templates/indices/{sequence:04d}.json.gz'
        proof = write_compressed(output/url, {'headers': group})
        parts.append({'url': url, 'headers': len(group), **proof})
    write_compressed(template_index_path, {'schema': 'gothic3-template-index-chunks-v1',
        'headerCount': len(index), 'chunks': parts})
    oversized, largest, compressed_files = [], {'bytes': 0, 'path': None}, 0
    for path in output.rglob('*.gz'):
        compressed_files += 1
        size = len(gzip.decompress(path.read_bytes()))
        if size > largest['bytes']:
            largest = {'bytes': size, 'path': path.relative_to(output).as_posix()}
        if size > LIMIT:
            oversized.append({'path': path.relative_to(output).as_posix(), 'decodedBytes': size})
    if oversized:
        raise ValueError('Unbounded compressed gameplay files: '+str(oversized))
    return {'maximumDecodedBytes': LIMIT, 'worldEntities': len(mapping), 'worldIndexChunks': len(index_parts),
            'templateIndexChunks': len(parts), 'compressedFiles': compressed_files,
            'largestDecodedFile': largest, 'unboundedFiles': oversized}


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[2]/'public/gothic3/gameplay')
    args = parser.parse_args()
    report = bound(args.output.resolve())
    write_json(args.output/'chunk-audit.json', report)
    print(json.dumps(report, indent=2))
