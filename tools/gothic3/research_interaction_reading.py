"""Offline original gCInteraction_PS factory/current Hero evidence, Python3.10+.

Original PEs and the world resource are read as data. No native code or tests
are executed. Only the selected current factory/read/callback profile is ported.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import re
import struct
import sys
from pathlib import Path
from research_native_combat import PE, save_json, sha
from bounded_native_capture import collect
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import INPUTS, WORLD_PATH, WORLD_SHA, pin_vtable
from read_gameplay_properties import _genome_strings

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/gothic3/interaction-reading'
PUBLIC=ROOT/'public/gothic3/interaction-reading'


def capture(study,name,module,entries,pe):
    with (study/'01_Decompiled_Code'/module/'functions.csv').open(encoding='utf-8-sig',newline='') as file:
        catalog={row['address']:row for row in csv.DictReader(file)}
    pending=list(entries)
    while pending:
        entry=pending.pop();row=catalog[entry];raw=pe.at(int(entry,16),5)
        if row['body_bytes']=='5' and raw[0]==0xe9:
            target=f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}'
            if target not in entries:entries.add(target);pending.append(target)
    return collect(study,name,module,' '.join(sorted(entries)),pe,OUT)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',type=Path,required=True)
    parser.add_argument('--capture-only',action='store_true')
    args=parser.parse_args();study=args.study.resolve()
    inputs={};pes={};maps={};selectors={name:set() for name in INPUTS}
    for name,(module,filename,expected) in INPUTS.items():
        path=study/'00_Original_Runtime'/filename
        if sha(path)!=expected:raise ValueError('Unsupported original input '+name)
        pes[name]=PE(path);maps[name]=exports(pes[name]);inputs[name]={'path':'00_Original_Runtime/'+filename,'bytes':path.stat().st_size,'sha256':expected}
    imports={name:native_imports(pe) for name,pe in pes.items()}
    schema_path=ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json'
    schema=json.loads(schema_path.read_text(encoding='utf8'))
    fields=sorted((field for field in schema['nativePropertyRegistrars'] if field['className']=='gCInteraction_PS'),key=lambda field:field['entry'])
    if [field['nativeOffset'] for field in fields]!=[20,28,56,84,92,96,124,132,136,148,160,164,168,172]:raise ValueError('Interaction descriptor order differs')
    serialized_path=ROOT/'public/gothic3/entity-reflection/serialized-candidates.json'
    serialized=json.loads(serialized_path.read_text(encoding='utf8'))
    hero=next(value for value in serialized['entities'] if value['name']=='PC_Hero');packet=hero['propertySets'][9]
    if (packet['className'],packet['outerVersion'],packet['nativeReadVersion'],packet['objectVersion'],packet['propertyVersion'],packet['tailRaw'])!=('gCInteraction_PS',84,84,83,30,''):raise ValueError('Hero Interaction versions/tail differ')
    world_path=study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
    if sha(world_path)!=WORLD_SHA:raise ValueError('Original world SHA differs')
    world=world_path.read_bytes();raw=world[packet['sourceOffset']:packet['endSourceOffset']+4]
    if len(raw)!=236 or raw.hex()!=packet['serializedRaw'] or hashlib.sha256(raw).hexdigest()!=packet['serializedSha256']:raise ValueError('Hero Interaction packet differs')
    cursor,boundary,genome=_genome_strings(world)
    if cursor.strings!=serialized['strings']:raise ValueError('Original archive string table differs')
    tables={};runtime_fields=[];normalized=[]
    for field,prop in zip(fields,packet['properties'],strict=True):
        if prop['name']!=field['name']:raise ValueError('Interaction field identity differs')
        data=world[prop['sourceOffset']:prop['sourceOffset']+prop['byteLength']]
        if data.hex()!=prop['raw']:raise ValueError('Original property payload differs')
        if prop['type']=='bCString':value=cursor.strings[struct.unpack('<H',data)[0]]
        elif prop['type']=='bool':value=bool(data[0])
        elif 'PropertyContainer' in prop['type']:value=struct.unpack('<I',data[2:])[0]
        elif prop['type']=='bCVector':value=list(struct.unpack('<fff',data))
        else:value={'version':struct.unpack('<H',data[:2])[0],'present':data[2]==1}
        normalized.append({'name':prop['name'],'typeName':prop['type'],'nativeOffset':field['nativeOffset'],'raw':data.hex(),'value':value,'sourceOffset':prop['sourceOffset']})
        selectors['Game'].add(field['entry'])
        table=pin_vtable(pes['Game'],imports['Game'],maps,int(field['vtable'],16),0x68);tables[field['name']]=table
        rows={row['offset']:row for row in table['entries']}
        def target(offset):
            row=rows[offset];return row.get('implementation','Game:'+row['target'])
        for offset in [0x10,0x14,0x2c,0x38,0x64]:
            name,entry=target(offset).split(':');selectors[name].add(entry)
        runtime_fields.append({'name':field['name'],'typeName':prop['type'],'nativeOffset':field['nativeOffset'],
            'registrar':'Game:'+field['entry'],'reader':target(0x38),'defaultInitializer':target(0x14)})
        # Independently bind each curated native offset/vtable store to PE.
        for key,expected in [('offsetStore',bytes.fromhex(field['offsetStore']['bytes'])),
                             ('descriptorStore',b'\xc7\x05'+struct.pack('<II',int(field['descriptor'],16),int(field['vtable'],16)))]:
            if pes['Game'].at(int(field[key]['address'],16),len(expected))!=expected:raise ValueError('Interaction registrar literal differs')
        if struct.unpack('<I',bytes.fromhex(field['offsetStore']['bytes'])[-4:])[0]!=field['nativeOffset']:raise ValueError('Interaction offset immediate differs')
    native_tables={}
    specs=[('native','206ab484',0x140,[0,4,0x10,0x18,0x20,0x24,0x40,0x4c,0x50,0x58,0x5c,0x60,0x68,0x84,0x88,0x8c,0x90,0xdc,0xe0,0x120,0x124,0x128,0x12c,0x138,0x13c]),
           ('wrapper','206ab62c',0x44,[0,4,0x10,0x14,0x18,0x20,0x2c,0x3c]),
           ('FocusPriority','2065e1a4',0x28,[0,0x10,0x18,0x1c]),('UseType','206ab294',0x28,[0,0x10,0x18,0x1c]),
           ('FocusNameType','2065e1f4',0x28,[0,0x10,0x18,0x1c])]
    for key,va,size,offsets in specs:
        table=pin_vtable(pes['Game'],imports['Game'],maps,int(va,16),size);native_tables[key]=table
        for row in table['entries']:
            if row['offset'] in offsets:
                name,entry=row.get('implementation','Game:'+row['target']).split(':');selectors[name].add(entry)
    selectors['Game'].update('20404440 20403f00 20403f20 20403f50 20403f60 20403fb0 20404180 20404f00 20407b70 2040c5e0 2040d1f0 204067f0 2040e680 20403f40 204048c0 20404900 20404730 204047f0'.split())
    selectors['Engine'].update('3001d7b9 3000247d 30017e77 3000cb58 300215a3 3003816d 30044bd9 3002e6a9 30037736 3001b17b 3002481b 30003b43 3003df41 3003b863 30481520'.split())
    selectors['Game'].update('20030085 20031ec6 2001ae0b 2002e5b9 20036e76 20013813 2001afbe'.split())
    selectors['SharedBase'].update('1000277a 10007dab 10001f05 1000873d 10003a71 10007243 100059ed 100076f8 10004638 10006550 10003d28 10006479 10004cc8 10002833 10001186 10005a65 10008805 100027de 100043fe 10006861 10006f41 10005e5c 10001c67 10001d07'.split())
    # Actual imported constructor/assignment/base-reference targets from selected bodies.
    for address in [0x207d6df8,0x207d8700,0x207d8800,0x207d8928,0x207d8934,0x207d8908,0x207d6dd8,0x207d6ea0,0x207d6ebc,0x207d8898,0x207d867c,0x207d6d24,0x207d87c0,0x207d87c4,0x207d87c8,0x207d8818,0x207d88f8]:
        item=imports['Game'][address];name=Path(item['library']).stem;selectors[name].add(f'{maps[name][item["decoratedName"]]:08x}')
    functions=[];instructions={}
    for name,(module,_,_) in INPUTS.items():
        bodies,records=capture(study,name,module,selectors[name],pes[name]);functions+=bodies;instructions.update(records)
    for function in functions:
        name=function['id'].split(':')[0];function['originalPEBodyRanges']=[]
        for first,last in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})',function['bodyRanges']):
            size=int(last,16)-int(first,16)+1;function['originalPEBodyRanges'].append({'startVA':first,'endVAInclusive':last,'bytes':size,'sha256':hashlib.sha256(pes[name].at(int(first,16),size)).hexdigest()})
        if not function['originalPEBodyRanges']:raise ValueError('Full original body range absent')
    literals=[]
    for name,va,expected,meaning in [('Game','20403f50','66b85400c3','GetVersion84'),('Game','20403f60','b831000000c3','GetPropertySetType49'),
        ('Game','20407be2','68e0000000','native allocation224/tag196'),('Game','2040d216','c7062cb66a20','wrapper vtable'),
        ('Game','20404457','c70684b46a20','native vtable'),('Engine','30481520','b86400000032c0c3','inherited IsProcessablefalse'),
        ('Engine','304c45a9','c706f4bf8730','EntityProxy vtable3087bff4'),('Engine','304c662c','c706f4c08730','PropertySetProxy vtable3087c0f4'),
        ('SharedBase','1004a1c2','c7001c7e0e10','temporary ObjectBase ctor vtable'),('SharedBase','10049fe0','c7011c7e0e10','temporary ObjectBase dtor vtable')]:
        if pes[name].at(int(va,16),len(bytes.fromhex(expected))).hex()!=expected:raise ValueError('Literal differs '+meaning)
        literals.append({'module':name,'address':va,'bytes':expected,'meaning':meaning})
    source={'archive':'Projects_compiled.p00','path':WORLD_PATH,'sha256':WORLD_SHA,'packetOffset':packet['sourceOffset'],'packetBytes':len(raw),'packetSha256':packet['serializedSha256'],
            'stringTableBoundary':boundary,'stringTableIndependentlyDecoded':True,'genome':genome}
    rules={'schema':'gothic3-interaction-reading-rules-v1','inputs':{name:value['sha256'] for name,value in inputs.items()},
        'nativeBytes':224,'getVersion':84,'propertyType':49,'nativeVtable':'206ab484','wrapperVtable':'206ab62c','fields':runtime_fields,
        'enumGlobals':{'FocusPriority':'207b61a8','UseType':'207cef3c','FocusNameType':'207b61ac'},
        'containerVtables':{'FocusPriority':'2065e1a4','UseType':'206ab294','FocusNameType':'2065e1f4'},
        'sourceHero':{'index':9,**source},'sources':{'allocate':'Game:20407b70','attach':'Game:20404f00','wrapperRead':'Game:204067f0','dataRead':'Game:2040e680'},
        'profile':{'freshWrapper':True,'successfulAllocations':True,'indexedArchiveStream':True,'nativeRead':'ushort version ignored, return1',
            'proxyReaders':'source current version1; native canonical bool; current absent proxies do not resolve entities',
            'CString':'actual NULL/allocated buffer ownership via indexed/literal assignment capabilities',
            'callbacks':'inherited empty PostRead/Process; Added/Removed require real NavigationAdmin on non-template cast; ROI script/admin operations stay explicit boundaries'},
        'unresolved':['last-reference destruction/delete and repeat Read/CopyFrom','actual CString indexed/literal buffer ownership and freeing supplied by host',
            'navigation registry and runtime ROI/script/application services; no implicit world residency','savegame/legacy/custom-patch and complete interaction/focus behavior']}
    save_json(OUT/'runtime-rules.json',rules);save_json(PUBLIC/'runtime-rules.json',rules)
    save_json(OUT/'native-evidence.json',{'schema':'gothic3-interaction-reading-native-evidence-v1','nativeCodeExecuted':False,'testsRun':False,
        'inputs':inputs,'functions':functions,'instructions':instructions,'descriptorVtables':tables,'nativeVtables':native_tables,
        'interactionDescriptors':fields,'literalProofs':literals,'sourcePacket':source,'allInstructionBytesMatchOriginalPE':True,'allInstructionsInsideOriginalPEBodyRanges':True,
        'scope':'Original fresh detached Interaction factory/defaults/current Hero read with actual live fields/proxies; no activation claim'})
    doc={'schema':'gothic3-original-hero-interaction-v1','source':source,'properties':normalized,'nativeReadOffset':packet['nativeReadOffset'],
        'outerVersion':84,'nativeReadVersion':84,'worldResident':False,'tailBytes':0}
    save_json(OUT/'hero-interaction.json',doc);save_json(PUBLIC/'hero-interaction.json',doc)
    expected_sources={OUT/function[key] for function in functions for key in ['cExcerpt','assemblyExcerpt']}
    for path in (OUT/'sources').rglob('*.txt'):
        if path not in expected_sources:path.unlink()
    save_json(OUT/'manifest.json',{'schema':'gothic3-interaction-reading-manifest-v1','outputs':[{'path':path.name,'bytes':path.stat().st_size,'sha256':sha(path)} for path in sorted(PUBLIC.glob('*.json'))]})
    if not args.capture_only:
        files=[Path(__file__).resolve(),ROOT/'src/gothic3/interaction-reading.ts',schema_path,serialized_path]
        files += [ROOT/'src/gothic3'/name for name in ['entity-reflection.ts','entity-lifecycle.ts','entity-reading.ts','native-properties.ts']]
        files += [ROOT/'tools/gothic3'/name for name in ['research_native_combat.py','research_native_clock.py','research_native_inventory.py','research_entity_reflection.py','research_entity_lifecycle.py','read_gameplay_properties.py','export_world_index.py','read_gameplay_ini.py','read_genome.py','read_xcmsh.py','read_xshmat.py']]
        files += [Path(module.__file__).resolve() for module in list(sys.modules.values()) if getattr(module,'__file__',None) and Path(module.__file__).resolve().parent==ROOT/'tools/gothic3' and Path(module.__file__).suffix=='.py']
        files += [path for folder in [OUT,PUBLIC] for path in folder.rglob('*') if path.is_file() and path.name!='implementation-receipt.json']
        save_json(OUT/'implementation-receipt.json',{'schema':'gothic3-interaction-reading-implementation-receipt-v1','nativeCodeExecuted':False,'testsRun':False,
            'scope':'Current Interaction implementation/source/dependency/output pins; old receipts remain historical',
            'files':[{'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':sha(path)} for path in sorted(set(files))]})
    print(json.dumps({'functions':len(functions),'instructions':sum(len(rows) for rows in instructions.values()),
        'instructionBytes':sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows),
        'receiptSha256':None if args.capture_only else sha(OUT/'implementation-receipt.json')}))


if __name__=='__main__':main()
