"""Reproduce bounded source facts for the three original Jack bandit owners.

Keeps source-present physics and animation classes separate from capabilities
attached to the partial browser world. Does not change prepared world chunks.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import struct
from pathlib import Path

from read_genome import read_entities
from read_gameplay_properties import Cursor, _entity_offsets, _read_class


REPO = Path(__file__).resolve().parents[2]
WORLD = 'G3_World_01/SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}/SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}.lrentdat'
SHA = '28f7273b3d54415b84445651a3dfa962c1ff158e9183deba81ba47e4d5d57938'
OWNERS = [(22138, 'Ardea_OutNovice_01', '0c3ad5c499a37e479901ef8b1a19877900000000'),
          (22141, 'Ardea_OutNovice_02', 'ef1adbed209ec647b20ebc9fc989642500000000'),
          (22144, 'Ardea_OutNovice_03', '81630a69bab9c44b9df46b76df0ac7b100000000')]
CHUNK = 'world/entity-chunks/2419-0081.json.gz'


def digest(data): return hashlib.sha256(data).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def class_receipt(clazz, offsets):
    return {'name': clazz['name'], 'version': clazz['version'],
            'sourceOffset': offsets['sourceOffset'],
            'tailSourceOffset': offsets['tailSourceOffset'],
            'tailBytes': len(bytes.fromhex(clazz['tail']))}


def prepare(study: Path):
    relative = '02_Unpacked_Data/Archives/Projects_compiled.p00/' + WORLD
    source = study / relative
    data = source.read_bytes()
    require(digest(data) == SHA, 'Unreviewed original SysDyn source hash')
    document = read_entities(source)
    chunk_data = (REPO / 'public/gothic3/gameplay' / CHUNK).read_bytes()
    chunk_raw = gzip.decompress(chunk_data)
    chunk = json.loads(chunk_raw)
    records = []
    for index, name, guid in OWNERS:
        entity = document['entities'][index]
        require((entity['name'], entity['guid']) == (name, guid), 'Source owner identity differs')
        offsets = _entity_offsets(data, entity, document['strings'], False, False)
        classes = list(zip(entity['classes'], offsets))
        require(len(classes) == 16, 'Unreviewed complete serialized class count')
        require(len({c['name'] for c, _ in classes}) == 16, 'Duplicate serialized class names')
        by_name = {c['name']: (c, o) for c, o in classes}
        party, party_offsets = by_name['gCParty_PS']
        require(party['version'] == 1 and party['tail'] == '0100000000', 'Unreviewed source Party member array')
        movement, movement_offsets = by_name['gCCharacterMovement_PS']
        require(movement['version'] == 76 and movement['tail'] == '', 'Unreviewed movement runtime tail')
        step_index = next(i for i, p in enumerate(movement['properties']) if p['name'] == 'StepHeight')
        step = movement['properties'][step_index]
        require(step['type'] == 'float' and step['raw'] == '00008242', 'Unreviewed StepHeight bytes')
        shape_set, shape_offsets = by_name['eCCollisionShape_PS']
        require(shape_set['version'] == 63, 'Unreviewed CollisionShape PS version')
        shape_data = bytes.fromhex(shape_set['tail'])
        shapes_cursor = Cursor(shape_data, document['strings'], base_offset=shape_offsets['tailSourceOffset'])
        shape_count = shapes_cursor.u32()
        require(shape_count == 2, 'Unreviewed serialized shape count')
        shapes = []
        for shape_index in range(shape_count):
            shape, metadata = _read_class(shapes_cursor)
            require(shape['name'] == 'eCCollisionShape' and shape['version'] == 74, 'Unreviewed shape record')
            fields = []
            for field_index, field in enumerate(shape['properties']):
                if field['name'] in ('ShapeType', 'Group', 'DisableResponse'):
                    raw = bytes.fromhex(field['raw'])
                    value = bool(raw[0]) if field['type'] == 'bool' else struct.unpack_from('<i', raw, 2)[0]
                    fields.append({'name': field['name'], 'type': field['type'], 'raw': field['raw'],
                                   'value': value, 'sourceOffset': metadata['properties'][field_index]['sourceOffset']})
            shapes.append({'index': shape_index, 'name': shape['name'], 'version': shape['version'],
                           'sourceOffset': metadata['sourceOffset'], 'fields': fields})
        require(shapes_cursor.pos == len(shape_data), 'Unconsumed shape tail bytes')
        prepared = next(e for e in chunk['entities'] if e['guid'] == guid)
        prepared_party = next(p for p in prepared['propertySets'] if p['name'] == 'gCParty_PS')
        members = prepared_party['tail']['value']['members']['value']
        require(prepared['key'] == f'world-2419:{index}' and
                members == {'prefix': 1, 'elementType': 'class eCEntityProxy', 'count': 0, 'items': []},
                'Prepared chunk member array disagrees with original source')
        absent = ['gCCharacterControl_PS', 'gCDynamicCollisionCircle_PS']
        require(all(name not in by_name for name in absent), 'Unexpected source control/DCC class')
        records.append({'id': guid, 'name': name, 'key': prepared['key'], 'entityIndex': index,
                        'entitySourceOffset': entity['sourceOffset'],
                        'completeSerializedClasses': [class_receipt(c, o) for c, o in classes],
                        'partyMembers': {'classVersion': 1, 'sourceOffset': party_offsets['tailSourceOffset'],
                                         'raw': party['tail'], 'prefix': 1, 'count': 0, 'items': []},
                        'movement': {'classVersion': 76, 'runtimeTailBytes': 0,
                                     'runtimeTailSourceOffset': movement_offsets['tailSourceOffset'],
                                     'stepHeight': 65.0, 'stepHeightRaw': step['raw'],
                                     'stepHeightSourceOffset': movement_offsets['properties'][step_index]['sourceOffset']},
                        'collisionShape': {'classVersion': 63, 'sourceOffset': shape_offsets['tailSourceOffset'],
                                           'tailBytes': len(shape_data), 'tailSha256': digest(shape_data),
                                           'shapeCount': shape_count, 'allTailBytesConsumed': True, 'shapes': shapes},
                        'absentFromCompleteSerializedClassList': absent})
    return {'schema': 'gothic3-bandit-death-source-evidence-v1',
            'source': {'archive': 'Projects_compiled.p00', 'path': WORLD,
                       'studyRelativePath': relative, 'sha256': SHA, 'bytes': len(data)},
            'preparedChunk': {'url': CHUNK, 'sha256': digest(chunk_data), 'bytes': len(chunk_data),
                              'uncompressedSha256': digest(chunk_raw), 'uncompressedBytes': len(chunk_raw)},
            'records': records,
            'limitations': ['Complete serialized classes are original source facts, not a claim about capabilities attached to a partial browser owner.',
                            'Source class absence does not establish every possible native post-load callback or inherited property set.',
                            'A zero Party array is owned source state; a scan of nearby actors does not substitute for its contents.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--out', type=Path, default=REPO / 'assets/gothic3/combat/bandit-death-source-evidence.json')
    args = parser.parse_args()
    value = prepare(args.study)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    output = (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf8')
    args.out.write_bytes(output)
    print(json.dumps({'output': str(args.out), 'sha256': digest(output), 'bytes': len(output), 'owners': len(value['records'])}))


if __name__ == '__main__':
    main()
