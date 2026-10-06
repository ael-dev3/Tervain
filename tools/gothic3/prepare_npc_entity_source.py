"""Prepare complete original Jack bandit entity records and bounded callback evidence.

Offline original-file/PE byte audit. Never executes native code, instantiates a
source context, or changes historical entity/death receipts. Complete identity
and parent metadata accompany only three complete entity contents.
"""
# SPDX-License-Identifier: GPL-3.0-only
from __future__ import annotations

import argparse
import copy
import gzip
import hashlib
import json
import struct
from pathlib import Path

from read_genome import read_entities
from read_gameplay_properties import _entity_offsets
from prepare_bandit_death_source import WORLD, SHA, OWNERS
import read_dialogue_native_evidence as native

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / 'assets/gothic3/npc-entity'
PUBLIC = REPO / 'public/gothic3/gameplay/npc-entity'
INPUTS = {
    'Engine': 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3',
    'Game': 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f',
    'SharedBase': '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214',
}
RECEIPTS = {
    'entity-construction': 'c6d3eea75dc0f809791b8ececde3cf291babd1d90eb1f966ff483b71ce3b5fe6',
    'entity-reading': '34b3369996f965c22a16134ceb99d6ca476acf3c19ef0852bdff5da15300dad7',
    'entity-loading': '8174b1e758b1c0ed9749fca05fc2c1c2d88d64a4b080b35b00a4763471282017',
    'entity-lifecycle': '106d25de9d13ba60ebba845eb272341c0407d608584468508e0e6306c684b93e',
    'npc-reading': 'b40bbeb4fb836bb8433f840f0e6a5ff2fa59db152b7b63c0a11cabdd228f74d0',
    'routine-reading': 'da66df48a209669257f5a487a70393115c250c8760d3bc927cd28e70e0bf401c',
    'control-reading': '10b56ddfd887f63fdc12cd4eab7ce615ae411efc2b8f1a377bb6a7d9e828974f',
}
SELECTION = {
    'entity-construction': ['Game:20020757', 'Game:201d4cb0', 'Game:2012bdc0',
                           'Engine:304808d0', 'Engine:304b67c0', 'Engine:304be7f0',
                           'Engine:304cb050', 'SharedBase:10032010', 'SharedBase:1004f420'],
    'entity-reading': ['Engine:30015e1a', 'Engine:304b9580', 'Engine:30020347', 'Engine:30480aa0'],
    'entity-loading': ['Game:200246db', 'Game:2012bc00', 'Engine:30026693', 'Engine:304bd670',
                       'Engine:3003d271', 'Engine:304b5df0', 'SharedBase:10003a71', 'SharedBase:10092a00'],
    'entity-lifecycle': ['Engine:3001d9bc', 'Engine:304817d0', 'Engine:3002d713',
                         'Engine:30481830', 'Engine:3003d10e', 'Engine:304818a0',
                         'Engine:30005227', 'Engine:304cb050', 'Engine:300120a3',
                         'Engine:304cb0b0', 'Engine:30020356', 'Engine:304cb100',
                         'Game:2000ab32', 'Game:20287cb0', 'Game:2001708f', 'Game:2028a8b0'],
    'npc-reading': ['Game:2002e569', 'Game:202f9ca0'],
    'routine-reading': ['Game:2000e408', 'Game:203573a0', 'Game:20356a50', 'Game:203573f0'],
    'control-reading': ['SharedBase:100a72d0'],
}
CLASSES = [('gCNavigation_PS', 37), ('eCRigidBody_PS', 65), ('eCCollisionShape_PS', 63),
           ('gCCharacterMovement_PS', 76), ('gCNPC_PS', 78), ('gCInventory_PS', 9),
           ('gCScriptRoutine_PS', 1), ('gCInteraction_PS', 84), ('gCDamage_PS', 76),
           ('gCDamageReceiver_PS', 33), ('gCFocus_PS', 44), ('gCDialog_PS', 1),
           ('eCIlluminated_PS', 8), ('gCParty_PS', 1), ('gCEffect_PS', 1),
           ('eCVisualAnimation_PS', 64)]


def sha(data): return hashlib.sha256(data).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')


def blob(data, start, end):
    raw = data[start:end]
    return {'sourceOffset': start, 'endSourceOffset': end, 'byteLength': len(raw),
            'raw': raw.hex(), 'sha256': sha(raw)}


def source_document(study):
    relative = '02_Unpacked_Data/Archives/Projects_compiled.p00/' + WORLD
    source = study / relative
    data = source.read_bytes()
    require(sha(data) == SHA, 'Unreviewed original selected-bandit source')
    parsed = read_entities(source)
    entities, parents, strings = parsed['entities'], parsed['parents'], parsed['strings']
    require((len(entities), len(parents), len(strings)) == (26927, 26926, 6069),
            'Unreviewed complete original context counts')
    manifest_path = REPO / 'public/gothic3/entity-lifecycle/manifest.json'
    lifecycle_manifest = json.loads(manifest_path.read_bytes())
    receipt = lifecycle_manifest['sourceCandidates']
    wire = (manifest_path.parent / receipt['path']).read_bytes()
    raw = gzip.decompress(wire)
    require((len(wire), sha(wire), len(raw), sha(raw)) ==
            (receipt['bytes'], receipt['sha256'], receipt['uncompressedBytes'], receipt['uncompressedSha256']),
            'Existing original-context source receipt differs')
    original = next(f for f in json.loads(raw)['files'] if f['source']['path'] == WORLD)
    require(original['source']['sha256'] == SHA and original['parents'] == parents,
            'Existing context source/parent provenance differs from complete original file')
    context = copy.deepcopy(original['context'])
    require(data[context['sourceOffset']:context['sourceOffset'] + 33].hex() == context['raw'],
            'Original context storage stream differs from its existing receipt')
    require(struct.unpack_from('<I', data, context['sourceOffset'] + 33)[0] == len(entities),
            'Original entity-count storage boundary differs')
    layer = context['factoryProof']['layerSource']
    layer_data = (study / '02_Unpacked_Data/Archives' / layer['archive'] / layer['path']).read_bytes()
    require(sha(layer_data) == layer['sha256'] and context['layerEntityType'] == 0,
            'Original custom gCEntity layer factory proof differs')
    footer = struct.unpack_from('<I', data, 10)[0]
    require(data[footer:footer + 4] == bytes.fromhex('efbeadde') and data[footer + 4] == 1,
            'Original GENOMFLE/string-table boundary differs')
    require(struct.unpack_from('<I', data, footer + 5)[0] == len(strings),
            'Original complete string-table count differs')
    cursor = footer + 9
    for value in strings:
        length = struct.unpack_from('<H', data, cursor)[0]
        cursor += 2
        require(data[cursor:cursor + length].decode('cp1252') == value, 'Original string-table entry differs')
        cursor += length
    require(cursor == len(data), 'Unconsumed original string-table bytes')
    records = []
    for index, name, guid in OWNERS:
        entity = entities[index]
        require((entity['name'], entity['guid']) == (name, guid), 'Selected original identity differs')
        start, end = entity['sourceOffset'], entities[index + 1]['sourceOffset']
        raw = data[start:end]
        require(len(raw) == 6544, 'Unreviewed original entity record length')
        versions = {'outer': struct.unpack_from('<H', raw, 0)[0],
                    'dynamic': struct.unpack_from('<H', raw, 2)[0],
                    'entity': struct.unpack_from('<H', raw, 25)[0],
                    'node': struct.unpack_from('<H', raw, 27)[0]}
        require(versions == {'outer': 64, 'dynamic': 83, 'entity': 83, 'node': 1} and raw[4] == 1,
                'Unreviewed original nested entity versions/creator flag')
        require(raw[29:49].hex() == guid, 'Original Node GUID storage differs')
        offsets = _entity_offsets(data, entity, strings, False, False)
        require([(c['name'], c['version']) for c in entity['classes']] == CLASSES,
                'Unreviewed complete original property-set source order')
        packets = []
        for packet_index, (clazz, metadata) in enumerate(zip(entity['classes'], offsets)):
            packet_start, accessor_end = metadata['sourceOffset'], metadata['endSourceOffset']
            packet_end = accessor_end + 4
            require(data[accessor_end:packet_end] == bytes.fromhex('dec0adde'),
                    'Original property packet sentinel differs')
            derived_version_at = metadata['tailSourceOffset'] - 2
            require(struct.unpack_from('<H', data, derived_version_at)[0] == clazz['version'],
                    'Original derived Read version boundary differs')
            packet_raw = data[packet_start:packet_end]
            packets.append({'index': packet_index, 'name': clazz['name'], 'version': clazz['version'],
                            'sourceOffset': packet_start, 'endSourceOffset': packet_end,
                            'relativeOffset': packet_start - start, 'byteLength': len(packet_raw),
                            'serializedRaw': packet_raw.hex(), 'serializedSha256': sha(packet_raw),
                            'outerVersion': metadata['outerVersion'],
                            'accessorSourceOffset': packet_start + 2, 'accessorEndSourceOffset': accessor_end,
                            'accessorRelativeOffset': 2, 'accessorByteLength': accessor_end - packet_start - 2,
                            'derivedVersionSourceOffset': derived_version_at,
                            'tailSourceOffset': metadata['tailSourceOffset'],
                            'objectVersion': metadata['objectVersion'], 'objectSize': metadata['objectSize'],
                            'propertyVersion': metadata['propertyVersion'], 'propertyCount': metadata['propertyCount'],
                            'headerRaw': metadata['headerRaw'], 'properties': metadata['properties']})
        require(packets[0]['relativeOffset'] == 323 and packets[-1]['endSourceOffset'] == end,
                'Original complete entity/property-array trailing boundary differs')
        node = blob(data, start + 27, start + 49)
        node.update(relativeOffset=27, guidRelativeOffset=2,
                    implementation='Engine:30020347->30480aa0',
                    propertyIDStreamImplementation='SharedBase:10003a71->10092a00')
        records.append({'key': f'world-2419:{index}', 'name': name, 'entityIndex': index, 'guid': guid,
                        'creatorGuid': raw[5:25].hex(), **blob(data, start, end),
                        'versions': versions, 'creatorPresent': True, 'nodeStream': node,
                        'propertySets': packets})
    context.update(parentEdges=parents,
                   entityIdentities=[{'entityIndex': i, 'sourceOffset': e['sourceOffset'],
                                      'endSourceOffset': entities[i + 1]['sourceOffset'] if i + 1 < len(entities)
                                      else original['archiveSerialization']['context']['serialization']['declaredContextEndOffset'],
                                      'name': e['name'], 'guid': e['guid']} for i, e in enumerate(entities)],
                   selectedEntityIndices=[row[0] for row in OWNERS], fullEntityContentsIncluded=False,
                   fullContextInstantiationSupportedByThisSelection=False,
                   sourceStorageReceipt={**receipt, 'path': 'public/gothic3/entity-lifecycle/source-candidates.json.gz'},
                   archiveSerialization=original['archiveSerialization'])
    # The context's declared end includes the parent graph/trailers. The final
    # entity ends at the first original parent edge, not that declared end.
    # read_entities verifies that the full parent graph's two terminating
    # DWORDs end exactly at GENOMFLE.DEADBEEF. Its last entity has no PS packet.
    # Do not invent an additional root-index DWORD after those terminators.
    last_end = footer - 8 - 8 * len(parents)
    context['entityIdentities'][-1]['endSourceOffset'] = last_end
    graph_end = last_end + 8 * len(parents)
    for i, (parent, child) in enumerate(parents):
        require(struct.unpack_from('<ii', data, last_end + i * 8) == (parent, child),
                'Original full parent edge storage differs')
    require(data[graph_end:graph_end + 8] == bytes.fromhex('ffffffffffffffff'),
            'Original parent graph termination differs')
    require(graph_end + 8 == footer, 'Unconsumed original parent graph bytes')
    require({child for parent, child in parents} == set(range(1, len(entities))) and
            context['graphRootIndex'] == 0, 'Original full parent graph unique root differs')
    context['parentEdgeStorage'] = blob(data, last_end, graph_end)
    context['graphRootIndexProvenance'] = 'Verified full original parent graph: index0 is the only entity without a parent; every other source index occurs exactly once as child. No extra serialized graph-root DWORD.'
    return {'schema': 'gothic3-npc-entity-source-v1',
            'source': {'path': relative, 'sha256': SHA, 'bytes': len(data)},
            'strings': strings, 'stringTable': {**blob(data, footer + 4, len(data)), 'count': len(strings)},
            'context': context, 'entities': records, 'sourceCandidatesAreLiveEntities': False,
            'scope': 'Full original source identities, graph and string table; complete selected three entity records only. No context/world activation asserted.'}


def native_evidence(study):
    pes = {}
    for module, digest in INPUTS.items():
        data = (study / '00_Original_Runtime' / (module + '.dll')).read_bytes()
        require(sha(data) == digest, 'Unreviewed original PE: ' + module)
        pes[module] = native.PE(data)
    references, documents = [], {}
    instruction_count = 0
    for namespace, digest in RECEIPTS.items():
        path = REPO / 'assets/gothic3' / namespace / 'native-evidence.json'
        raw = path.read_bytes()
        require(sha(raw) == digest, 'Historical receipt changed: ' + namespace)
        document = documents[namespace] = json.loads(raw)
        by_id = {f['id']: f for f in document['functions']}
        methods = []
        for method_id in SELECTION[namespace]:
            method = by_id[method_id]
            module = method_id.split(':')[0]
            rows = document['instructions'][method_id]
            for row in rows:
                require(pes[module].bytes(int(row['address'], 16), len(bytes.fromhex(row['bytes']))) == bytes.fromhex(row['bytes']),
                        'Historical receipt/original PE instruction mismatch: ' + method_id)
            for key in ['cExcerpt', 'assemblyExcerpt']:
                excerpt = path.parent / method[key]
                require(sha(excerpt.read_bytes()) == method[key + 'Sha256'],
                        'Historical source excerpt hash mismatch: ' + str(excerpt))
            count = len(rows)
            instruction_count += count
            methods.append({'id': method_id, 'name': method['name'], 'bodyRanges': method['bodyRanges'],
                            'instructionCount': count,
                            'bodyInstructionBytesSha256': sha(b''.join(bytes.fromhex(r['bytes']) for r in rows)),
                            'cExcerpt': method['cExcerpt'], 'cExcerptSha256': method['cExcerptSha256'],
                            'assemblyExcerpt': method['assemblyExcerpt'], 'assemblyExcerptSha256': method['assemblyExcerptSha256'],
                            'allInstructionBytesMatch': True})
        references.append({'path': path.relative_to(REPO).as_posix(), 'sha256': digest,
                           'methods': methods, 'copiedBroadReceipt': False})
    vtables = {}
    imports = {int(row['iatVA'], 16): row for row in pes['Game'].imports()}
    for namespace, name, table_key in [('npc-reading', 'gCNPC_PS', 'npcNative'),
                                       ('routine-reading', 'gCScriptRoutine_PS', 'native')]:
        table = documents[namespace]['vtables'][table_key]
        address = int(table['address'], 16)
        entries = []
        for slot in [0xb4, 0x12c, 0x138]:
            item = copy.deepcopy(next(e for e in table['entries'] if e['offset'] == slot))
            require(pes['Game'].bytes(address + slot, 4).hex() == item['bytes'],
                    'Original NPC/Routine callback vtable pointer differs')
            if 'importThunkBytes' in item:
                target, iat = int(item['target'], 16), int(item['importSlot'], 16)
                require(pes['Game'].bytes(target, 6).hex() == item['importThunkBytes'],
                        'Original inherited callback import thunk differs')
                require(imports[iat]['name'] == item['import']['decoratedName'],
                        'Original inherited callback PE import differs')
            entries.append(item)
        vtables[name] = {'address': table['address'], 'entries': entries,
                         'allPointerBytesReadFromPinnedPE': True}
    native.EXPECTED_INPUTS['Engine.dll'] = INPUTS['Engine']
    scene_admin = native.audit_module(study, 'Engine_dll', 'Engine.dll', {
        0x30014619: 'SceneAdminConstructor', 0x30015a5f: 'OwnedRegisteredTableConstructor14',
        0x30009e12: 'OwnedSpatialTableConstructor24', 0x3003e3d3: 'OwnedTemplateTableConstructor34',
        0x3003b9da: 'OwnedNameTableConstructor44', 0x30001109: 'OwnedAdditionalTableConstructor54',
        0x30023f74: 'RegisteredBucketAllocation', 0x30023989: 'SpatialBucketAllocation',
        0x30020b08: 'TemplateBucketAllocation', 0x3001f3c5: 'NameBucketAllocation',
        0x300258e2: 'AdditionalBucketAllocation'})
    for method in scene_admin['methods']:
        instruction_count += method['instructionCount']
    # This callback has no reconstructed C/catalog body in the saved study.
    # Reuse the existing assembly-only receipt, then re-read its actual byte.
    control_path = REPO / 'assets/gothic3/control-reading/native-evidence.json'
    callback = next(row for row in documents['control-reading']['asmOnlyFunctions']
                    if row['entry'] == '100e2910')
    callback_raw = pes['SharedBase'].bytes(0x100e2910, 1)
    callback_sha = 'ae3f4619b0413d70d3004b9131c3752153074e45725be13b9a148978895e359e'
    require(callback_raw == b'\xc3' and sha(callback_raw) == callback_sha and
            callback['instructions'] == [{'address': '100e2910', 'bytes': 'c3', 'assembly': 'RET'}],
            'Original matrix destructor literal RET differs')
    excerpt = control_path.parent / callback['assemblyExcerpt']
    require(sha(excerpt.read_bytes()) == callback['assemblyExcerptSha256'],
            'Existing matrix destructor assembly-only excerpt differs')
    matrix_destructor = {
        'module': 'SharedBase', 'inputSha256': INPUTS['SharedBase'], 'address': '100e2910',
        'instructionBytesHex': callback_raw.hex(), 'instructionBytesSha256': callback_sha,
        'instructionCount': 1, 'sourceCGap': True, 'sourceASMGap': True,
        'sourceReceipt': {'path': control_path.relative_to(REPO).as_posix(),
                          'sha256': RECEIPTS['control-reading']},
        'assemblyExcerpt': 'assets/gothic3/control-reading/' + callback['assemblyExcerpt'],
        'assemblyExcerptSha256': callback['assemblyExcerptSha256'],
        'behavior': 'Literal RET. Does not destroy or clear the matrix cache/guard.'}
    native.EXPECTED_INPUTS['SharedBase.dll'] = INPUTS['SharedBase']
    crt = native.audit_module(study, 'SharedBase_dll', 'SharedBase.dll', {
        0x100a7294: 'CRTOnExit', 0x100a71ac: 'CRTOrderedCallbackAppend',
        0x100aa6c4: 'CRTNormalTermination'})
    instruction_count += 1 + sum(method['instructionCount'] for method in crt['methods'])
    return {'schema': 'gothic3-npc-entity-native-evidence-v1', 'inputs': INPUTS,
            'sourceRoot': '<LOCAL_DESKTOP_STUDY>', 'nativeCodeExecuted': False,
            'reusedReceipts': references, 'callbackVtables': vtables, 'sceneAdminInitialization': scene_admin,
            'matrixDestructor': matrix_destructor, 'crtRegistrationBoundary': crt,
            'semantics': {
                'nodeRead': 'Read u16 version; unregister current owner ID; read PropertyID20 (copy first16, clear trailingDWORD); register same retained owner. Version is not rejected here.',
                'attachmentOrder': 'SetEntity(owner), OnPropertySetAdded before array append; preserve all16 original source packet positions. NPC/Routine cannot bypass earlier Navigation attachment.',
                'setEntity': 'NPC/Routine inherit Engine3001d9bc->304817d0, physical owner pointer+0c assignment.',
                'onAdded': 'NPC/Routine inherit Engine3002d713->30481830 literal RET.',
                'npcPostRead': 'Game2002e569->202f9ca0 clears pending pose+1a4, assigns source Enclave PropertyID+50 to embedded proxy+1c4, then inherited base PostRead RET.',
                'routinePostRead': 'Game2000e408->203573a0 invokes20356a50 GameReset: notifications, real embedded SPU reset/task/state/time/position/callback operations; then inherited base PostRead RET.',
                'routineSelfBinding': 'Inherited SetEntity writes only PS owner. Embedded SPU Self is bound by Routine.PreProcess203573f0, not SetEntity/OnAdded.',
                'freshSceneAdminFields': 'Ctor304cc660 zeroes DWORD+134; initializes five independently owned43-bucket tables. GetEntity304cb100 consults+14 registered,+24 spatial,+34 template. These seeds apply only to a fresh owned host, not restored game state.',
                'sceneAdminLimits': 'This receipt proves constructor fields/table allocation, not full eCEngineComponentBase/eCEntityAdmin/module registration or a browser port of the native hash bucket layout.',
                'matrixIdentity': 'Reuse the actual shared NativeControlModuleGlobals lazy cache via connectConstructorMatrixIdentity; do not duplicate an identity singleton.',
                'matrixDestructorHostProfile': 'A selected browser-host ordered registry retains original module/address, drains callbacks in reverse registration order once on explicit disposal, and invokes the proven literalRET. This does not claim native CRT pointer encoding, allocator, locks, process termination or external callback equivalence.',
                'firstAttachmentGate': 'Source packet0 gCNavigation_PS OnAdded2000ab32->20287cb0 requires concrete navigation registry/application mode/owner position/notification capabilities. Later original packets remain pending if it blocks.'},
            'audit': {'reusedMethodCount': sum(len(x['methods']) for x in references),
                      'newMethodCount': len(scene_admin['methods']) + len(crt['methods']),
                      'asmOnlyMethodCount': 1, 'instructionCount': instruction_count,
                      'byteMismatchCount': 0, 'nativeCodeExecuted': False}}


def prepare(study):
    records = source_document(study)
    evidence = native_evidence(study)
    raw = json_bytes(records)
    wire = gzip.compress(raw, compresslevel=9, mtime=0)
    evidence_raw = json_bytes(evidence)
    receipt = {'path': 'gameplay/npc-entity/bandit-records.json.gz', 'bytes': len(wire), 'sha256': sha(wire),
               'encoding': 'gzip', 'uncompressedBytes': len(raw), 'uncompressedSha256': sha(raw)}
    manifest = {'schema': 'gothic3-npc-entity-manifest-v1', 'records': receipt,
                'source': records['source'], 'sourceCandidatesAreLiveEntities': False,
                'matrixDestructor': evidence['matrixDestructor'],
                'nativeEvidence': {'path': 'assets/gothic3/npc-entity/native-evidence.json',
                                   'bytes': len(evidence_raw), 'sha256': sha(evidence_raw)},
                'entities': [{'key': e['key'], 'entityIndex': e['entityIndex'], 'byteLength': e['byteLength'],
                              'sha256': e['sha256'], 'propertySets': [
                                  {'index': p['index'], 'name': p['name'], 'byteLength': p['byteLength'],
                                   'serializedSha256': p['serializedSha256']} for p in e['propertySets']]} for e in records['entities']]}
    OUT.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    (OUT / 'bandit-records.json').write_bytes(raw)
    (OUT / 'native-evidence.json').write_bytes(evidence_raw)
    (OUT / 'manifest.json').write_bytes(json_bytes(manifest))
    (PUBLIC / 'bandit-records.json.gz').write_bytes(wire)
    return {'records': receipt, 'audit': evidence['audit'], 'nativeEvidence': manifest['nativeEvidence']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(prepare(args.study)))


if __name__ == '__main__': main()
