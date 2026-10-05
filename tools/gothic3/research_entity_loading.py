"""Recover the installed Hero record and enclosing dynamic read, offline.

Reads original PE bytes and exported source; never executes native code, tests,
the browser, a build, or remote actions. Old receipts are left historical.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
import struct
from pathlib import Path

from research_native_clock import collect
from research_native_combat import PE, save_json, sha
from research_entity_reflection import INPUTS, WORLD_PATH, WORLD_SHA
from research_entity_lifecycle import exports
from research_native_inventory import native_imports
from read_gameplay_properties import Cursor, _genome_strings, _read_native_entity

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/gothic3/entity-loading'
PUBLIC = ROOT / 'public/gothic3/entity-loading'
SELECT = {
    'Game': ('200246db 2012bc00 2012bca0 20004f0c 2012bdc0 20020757 '
             '201d4cb0 201d4eb0 204628a0 204627da 20007b5d'),
    'Engine': ('30026693 304bd670 3003d271 30015e1a 3000e223 30030fb2 '
               '304bd710 304be7f0 304bd7c0 304808d0 304b2a30 30480500 '
               '304b4780 30026779 30399070 30007559 30398fa0 '
               '30008783 30481520 30046fbf 304b3740 30045e03 304bdf10 '
               '30010b68 3001ca2b 3003d8c5 300091d3 3002572f 30009a2a '
               '300301b6 300048fe 304abc80 3003eac7 304ab820'),
    'SharedBase': ('1000277a 10092aa0 10004421 10092760 100059ed 10092880 '
                   '1000737e 10032010 10007e28 1002a8a0 10005e20 10036c70 '
                   '100079fa 1004a4b0 10007aae 100333f0 10003ba2 10024be0 '
                   '10003a71 10092a00 10007243 100033f5 10003d28 100149b0'),
}
HERO_BEGIN = 1183912
HERO_END = 1192397
HERO_SHA = '8b0478a57152023598a3d93550151d623d58fc6d49d90b3ea505a2202efa5e8b'


def record(path):
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size,
            'sha256': sha(path)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--capture-only', action='store_true')
    args = parser.parse_args()
    study = args.study.resolve()
    OUT.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    pes, inputs, selections = {}, {}, {}
    for name, (module, filename, expected) in INPUTS.items():
        binary = study / '00_Original_Runtime' / filename
        if sha(binary) != expected:
            raise ValueError('Unsupported original build: ' + name)
        pes[name] = PE(binary)
        inputs[name] = {'path': '00_Original_Runtime/' + filename,
                        'bytes': binary.stat().st_size, 'sha256': expected}
        selections[name] = set(SELECT[name].split())
        with (study/'01_Decompiled_Code'/module/'functions.csv').open(
                encoding='utf-8-sig', newline='') as file:
            catalog = {row['address']: row for row in csv.DictReader(file)}
        # collect follows one jump. Close every PE-proven pure JMP first.
        changed = True
        while changed:
            changed = False
            for entry in tuple(selections[name]):
                row = catalog.get(entry)
                if row is None:
                    raise ValueError('Original source entry absent: '+name+':'+entry)
                raw = pes[name].at(int(entry, 16), 5)
                if row['body_bytes'] == '5' and raw[0] == 0xe9:
                    target = f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}'
                    if target not in selections[name]:
                        selections[name].add(target)
                        changed = True
    functions, instructions = [], {}
    for name, (module, _, _) in INPUTS.items():
        bodies, rows = collect(study, name, module,
                               ' '.join(sorted(selections[name])), pes[name], OUT)
        functions.extend(bodies)
        instructions.update(rows)
    for function in functions:
        name = function['id'].split(':')[0]
        ranges = []
        for begin, end in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})',function['bodyRanges']):
            length = int(end,16)-int(begin,16)+1
            raw = pes[name].at(int(begin,16),length)
            ranges.append({'startVA':begin,'endVAInclusive':end,'bytes':length,
                           'sha256':hashlib.sha256(raw).hexdigest()})
        if not ranges:
            raise ValueError('Missing PE range: '+function['id'])
        function['originalPEBodyRanges'] = ranges
    world = study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
    if sha(world) != WORLD_SHA:
        raise ValueError('Winning original Hero archive differs')
    data = world.read_bytes()
    genome, boundary, format_info = _genome_strings(data)
    cursor = Cursor(data, genome.strings, HERO_BEGIN, base_offset=0)
    hero, packets = _read_native_entity(cursor, 371, False)
    raw = data[HERO_BEGIN:cursor.pos]
    if (cursor.pos != HERO_END or hashlib.sha256(raw).hexdigest() != HERO_SHA or
            hero['name'] != 'PC_Hero' or len(packets) != 19 or
            [hero['nativeHeader'][key] for key in
             ['outerVersion','dynamicVersion','entityVersion','nodeVersion']] != [64,83,83,1]):
        raise ValueError('Original Hero record profile differs')
    if struct.unpack_from('<i',data,148)[0]!=26927:
        raise ValueError('Original unfiltered dynamic entity count differs')
    nearby=[]
    for index,begin,end,expected in [
        (370,1183609,1183912,'a1cd8db81d88e578071fc496fa922089f16128376f07a8bc3034fd3f68c5739a'),
        (372,1192397,1194411,'ee11cbf53d9f4358bd56801ccbb7a5d82a0764d3c31292869a955436f494007a'),
        (373,1194411,1196417,'9b2343476027679a7e5039812864bf1fe146d603cb1232e02d55e99f68b738a3')]:
        selected=Cursor(data,genome.strings,begin,base_offset=0)
        entity,parts=_read_native_entity(selected,index,False)
        body=data[begin:selected.pos]
        if selected.pos!=end or hashlib.sha256(body).hexdigest()!=expected:
            raise ValueError('Original nearby Hero record differs: '+str(index))
        nearby.append({'sourceIndex':index,'name':entity['name'],'sourceOffset':begin,
                       'endSourceOffsetExclusive':end,'bytes':len(body),'sha256':expected,
                       'serializedRaw':body.hex(),'propertyId20':entity['guid'],
                       'creatorId20':entity['creator'],'propertySetCount':len(parts),
                       'worldMatrix':entity['worldMatrix'],'localMatrix':entity['localMatrix']})
    # Independently pin inherited PostRead dispatch, creator stream binding,
    # and custom-entity layer callback; source text alone is insufficient.
    maps={name:exports(pe) for name,pe in pes.items()}
    imports={name:native_imports(pe) for name,pe in pes.items()}
    bindings=[]
    for module,slot,target_module,symbol,target in [
        ('Engine',0x30afd7f0,'SharedBase','??5@YGAAVbCIStream@@AAV0@AAVbCPropertyID@@@Z',0x10003a71),
        ('Game',0x207d6a98,'Engine','?Read@eCDynamicEntity@@UAE?AW4bEResult@@AAVbCIStream@@@Z',0x30026693),
        ('Game',0x207d69ac,'Engine','?OnPostRead@eCDynamicEntity@@MAEXXZ',0x30045e03),
        ('Game',0x207d6a30,'Engine','?ReadV83@eCEntity@@MAE?AW4bEResult@@AAVbCIStream@@G@Z',0x30015e1a),
        ('Game',0x207d65e0,'Engine','?SetCreationCallbackFunc@eCEntityDynamicContext@@QAEXP6GPAVeCEntity@@XZ@Z',0x300301b6),
    ]:
        imported=imports[module][slot]
        if imported['decoratedName']!=symbol or maps[target_module].get(symbol)!=target:
            raise ValueError('Original read import differs: '+module+':'+f'{slot:08x}')
        bindings.append({'module':module,'iat':f'{slot:08x}',
                         'bytes':pes[module].at(slot,4).hex(),'import':imported,
                         'implementation':target_module+':'+f'{target:08x}'})
    post_slot=pes['Game'].at(0x2066813c+0x140,4)
    if post_slot!=struct.pack('<I',0x204628a0) or pes['Game'].at(0x204628a0,6).hex()!='ff25ac697d20':
        raise ValueError('Actual inherited Hero PostRead slot differs')
    read_slot=pes['Game'].at(0x2066813c+0xb0,4)
    if read_slot!=struct.pack('<I',0x204627da) or pes['Game'].at(0x204627da,6).hex()!='ff25306a7d20':
        raise ValueError('Actual inherited Hero ReadV83 slot differs')
    if (pes['Game'].at(0x201d4f17,5).hex()!='6857070220' or
            pes['Game'].at(0x201d4f1e,6).hex()!='ff15e0657d20' or
            pes['Engine'].at(0x304ab740,10).hex()!='8b442404894158c20400'):
        raise ValueError('Original custom dynamic-layer creation callback binding differs')
    serialized_path = ROOT/'assets/gothic3/entity-reflection/serialized-candidates.json'
    serialized = json.loads(serialized_path.read_text(encoding='utf8'))
    old_hero = next(entity for entity in serialized['entities'] if entity['name']=='PC_Hero')
    packet_frames=[]
    for index, (packet, previous) in enumerate(zip(packets,old_hero['propertySets'],strict=True)):
        begin,end = packet['sourceOffset'],packet['endSourceOffset']
        original=data[begin:end+4]
        if original.hex()!=previous['serializedRaw'] or begin!=previous['sourceOffset']:
            raise ValueError('Existing Hero PS packet differs at '+str(index))
        packet_frames.append({'index':index,'className':previous['className'],
                              'outerVersion':previous['outerVersion'],
                              'nativeReadVersion':previous['nativeReadVersion'],
                              'begin':begin-HERO_BEGIN,'endExclusive':end+4-HERO_BEGIN,
                              'sourceOffset':begin,'sha256':hashlib.sha256(original).hexdigest()})
    # Graph links are separate from entity bytes. Pin the existing decoded
    # archive metadata; do not treat this as native graph attachment.
    graph_path=ROOT/'public/gothic3/gameplay/world/2419.json'
    graph=json.loads(graph_path.read_text(encoding='utf8'))
    if graph['source']['sha256']!=WORLD_SHA:
        raise ValueError('Retained graph belongs to another archive')
    links=[link for link in graph['parents'] if 371 in link]
    if links!=[[370,371],[371,372],[371,373]]:
        raise ValueError('Original retained Hero graph differs')
    document={'schema':'gothic3-entity-loading-hero-v1','worldResident':False,
              'source':{'archive':'Projects_compiled.p00','path':WORLD_PATH,'sha256':WORLD_SHA,
                        'bytes':len(data),'stringTableBoundary':boundary,'genome':format_info,
                        'sourceEntityCount':26927,'countSourceOffset':148},
              'strings':genome.strings,
              'hero':{'sourceIndex':371,'sourceOffset':HERO_BEGIN,'endSourceOffsetExclusive':HERO_END,
                      'bytes':len(raw),'sha256':HERO_SHA,'serializedRaw':raw.hex(),
                      'name':hero['name'],'propertyId20':hero['guid'],'creatorId20':hero['creator'],
                      'nativeHeader':hero['nativeHeader'],'worldMatrix':hero['worldMatrix'],
                      'localMatrix':hero['localMatrix'],'packets':packet_frames},
              'nearbyRecords':nearby,
              'separateGraph':{'links':links,'metadataReceipt':record(graph_path),
                               'nativeGraphAttachmentPerformed':False}}
    save_json(OUT/'hero-record.json',document)
    evidence={'schema':'gothic3-entity-loading-native-evidence-v1','inputs':inputs,
              'functions':functions,'instructions':instructions,'nativeCodeExecuted':False,'testsRun':False,
              'sourceDependencies':[record(serialized_path),record(graph_path)],
              'imports':bindings,'gCEntityPostReadSlot':{'vtable':'2066813c','offset':0x140,
                  'bytes':post_slot.hex(),'thunk':'204628a0','thunkBytes':'ff25ac697d20'},
              'gCEntityReadV83Slot':{'vtable':'2066813c','offset':0xb0,'bytes':read_slot.hex(),
                  'thunk':'204627da','thunkBytes':'ff25306a7d20'},
              'dynamicLayerCreationCallback':{'callback':'Game:20020757','pushVA':'201d4f17',
                  'pushBytes':'6857070220','callVA':'201d4f1e','callBytes':'ff15e0657d20',
                  'contextPointerOffset':0x58,'setterBodyVA':'304ab740',
                  'setterBodyBytes':'8b442404894158c20400','runtimeExecutionImplementedByThisNamespace':False},
              'heroRecord':{'offset':HERO_BEGIN,'endExclusive':HERO_END,'bytes':len(raw),'sha256':HERO_SHA}}
    save_json(OUT/'native-evidence.json',evidence)
    rules={'schema':'gothic3-entity-loading-rules-v1','inputs':{k:v['sha256'] for k,v in inputs.items()},
           'profile':{'gameVersion':64,'dynamicVersion':83,'entityVersion':83,'nodeVersion':1},
           'dynamicOffsets':{'creator':0x1a8,'flags':0x1bc},
           'order':['gCEntity.Read outer version','eCDynamicEntity.Read version',
                    'creator present bool and conditional PropertyID read','flags1bc OR1',
                    'eCEntity.Read version and ReadV83','conditional IsEntityPatchingEnabled',
                    'conditional PatchWithTemplate(creator,true)','flags1bc ANDfffd','dynamic return1'],
           'constructionEvidenceOnly':True,'worldResident':False}
    save_json(OUT/'runtime-rules.json',rules)
    for path in [OUT/'hero-record.json',OUT/'runtime-rules.json']:
        shutil.copyfile(path,PUBLIC/path.name)
    manifest={'schema':'gothic3-entity-loading-manifest-v1',
              'outputs':[dict(record(path),path=path.name) for path in
                         [PUBLIC/'hero-record.json',PUBLIC/'runtime-rules.json']]}
    save_json(OUT/'manifest.json',manifest)
    save_json(PUBLIC/'manifest.json',manifest)
    if not args.capture_only:
        implementation=ROOT/'src/gothic3/entity-loading.ts'
        if not implementation.exists():raise ValueError('Actual entity-loading implementation required')
        files={implementation,Path(__file__).resolve(),ROOT/'src/gothic3/entity-reading.ts',
               ROOT/'src/gothic3/entity-setters.ts',ROOT/'src/gothic3/entity-lifecycle.ts',
               ROOT/'src/gothic3/entity-reflection.ts',ROOT/'src/gothic3/navigation-reading.ts',
               serialized_path,graph_path}
        files.update(ROOT/'tools/gothic3'/name for name in [
            'research_native_clock.py','research_native_combat.py','research_entity_reflection.py',
            'research_entity_lifecycle.py','research_native_inventory.py','read_gameplay_properties.py'])
        files.update(path for directory in [OUT,PUBLIC] for path in directory.rglob('*')
                     if path.is_file() and path.name!='implementation-receipt.json')
        save_json(OUT/'implementation-receipt.json',{
            'schema':'gothic3-entity-loading-implementation-receipt-v1',
            'nativeCodeExecuted':False,'testsRun':False,'gameplayReady':False,
            'scope':'installed64-83-83-read-bridge-and-complete-Hero-source-record',
            'files':[record(path) for path in sorted(files)],
            'remaining':['all19-concrete-factories-and-tail-readers','actual-fresh-entity-constructor-services',
                         'creator-template-patching','original-child-graph-attachment-and-context',
                         'world-cache-physics-PVS-processing-activation','playable-browser-story-save-endings']})
    print(json.dumps({'functions':len(functions),'instructions':sum(len(rows) for rows in instructions.values()),
                      'heroBytes':len(raw),'heroSha256':HERO_SHA,'nativeCodeExecuted':False,'testsRun':False}))


if __name__=='__main__':
    main()
