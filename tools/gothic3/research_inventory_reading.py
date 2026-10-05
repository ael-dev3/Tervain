"""Reproduce installed Inventory construction/current Hero packet offline.

Python 3.10+, standard library. Original PE modules and world packets are data;
no game/native code is loaded or executed. Successful allocation and fresh
wrapper branches are explicit runtime profiles, not an x86 interpreter.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import re
import struct
from pathlib import Path
from research_native_combat import PE, save_json, sha
from research_native_clock import collect
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import INPUTS, WORLD_PATH, WORLD_SHA, pin_vtable

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'assets/gothic3/inventory-reading'
PUBLIC = ROOT/'public/gothic3/inventory-reading'
SELECT = {
    'Game': '''201a8d80 201a8e30 201a8e60 201a8e80 201a8e90 201a9110
201a94a0 201a9520 201a9fd0 201abac0 201abdb0 201ac030 201ac320
201ad430 201ad620 201ad690 201adbe0 201ce5e0 201ce7d0 201ce910 201ce970
201cecc0 201cf930 201cff00 201cf410 201cf350 201d0c70
201bfa00 201bfab0 201bff80 201bffd0 201c10b0 201c14f0 201c3130 201c6070
201c5b40 201c6870 201c1f90 204f3bb0 204f3ca0 204f3d90 2002c4da 20032bd2
20033c49 20012a1c 2002c9f8 2002ba44 200010c8'''.split(),
    'Engine': '''3001d7b9 30017e77 3000247d 3000cb58 300215a3 3001a587
300327c2 30044a58 30037736 30044bd9 3002e6a9 3003816d 3002481b 3001b17b 3003b863 30481520'''.split(),
    'SharedBase': '''1000277a 10007dab 10001f05 1000873d 10008233
100022d4 1000551a 100073ce 100079fa 10007f81 100062b2 100076f8
10004ea3 1000235b 10001186 10005a65 10008805 100027de 1000191f
10004b74 10006636 10002455 100025d6 1000393b 10003ed6 10002f68
10007356 10003a71 10007243 100059ed 10004638 10006550 10003d28
100043fe 10006861 10006f41 10005e5c'''.split(),
}


def capture(study, name, module, entries, pe):
    with (study/'01_Decompiled_Code'/module/'functions.csv').open(encoding='utf-8-sig',newline='') as file:
        catalog = {row['address']:row for row in csv.DictReader(file)}
    pending = list(entries)
    while pending:
        entry = pending.pop(); row = catalog[entry]; raw = pe.at(int(entry,16),5)
        if row['body_bytes']=='5' and raw[0]==0xe9:
            target=f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}'
            if target not in entries: entries.add(target); pending.append(target)
    return collect(study,name,module,' '.join(sorted(entries)),pe,OUT)


def current_tail(tail, strings):
    """Audit this exact current packet without executing any native reader."""
    cursor=0
    def take(size):
        nonlocal cursor
        if cursor+size>len(tail):raise ValueError('Truncated current Inventory tail')
        raw=tail[cursor:cursor+size];cursor+=size;return raw
    def number(fmt):return struct.unpack(fmt,take(struct.calcsize(fmt)))[0]
    def text():return strings[number('<H')]
    stack_version=number('<H');stack_count=number('<i');slot_version=number('<H');slot_count=number('<i')
    if (stack_version,stack_count,slot_version,slot_count)!=(1,0,1,19):raise ValueError('Current Inventory list records differ')
    slots=[]
    for index in range(slot_count):
        start=cursor;version=number('<H');present=number('<B')
        if version!=1 or present not in [0,1]:raise ValueError('Current slot accessor differs')
        if not present:slots.append({'index':index,'present':False,'tailOffset':start,'bytes':cursor-start});continue
        if (number('<H'),number('<B'))!=(1,1):raise ValueError('Current singleton object differs')
        name=text();factory=(number('<H'),number('<B'),number('<H'));object_version=number('<H');declared=number('<I');property_version=number('<H');count=number('<I')
        if (name,factory,object_version,declared,property_version,count)!=('gCInventorySlot',(1,0,83),83,90,30,3):raise ValueError('Current nested Slot header differs')
        properties=[]
        for expected in [('Template','eCTemplateEntityProxy',23),('Item','eCEntityProxy',23),('Slot','bTPropertyContainer<enum gESlot>',6)]:
            name=text();type_name=text();descriptor_version=number('<H');size=number('<I');payload=take(size)
            if (name,type_name,size)!=expected or descriptor_version!=30:raise ValueError('Current nested Slot property differs')
            properties.append({'name':name,'typeName':type_name,'descriptorVersion':descriptor_version,'bytes':size,'raw':payload.hex()})
        native_version=number('<H')
        if native_version!=1:raise ValueError('Current Slot native version differs')
        template=properties[0]['raw'];item=properties[1]['raw'];enum=bytes.fromhex(properties[2]['raw']);value=struct.unpack('<I',enum[2:])[0]
        if not template.startswith('010001') or not item.startswith('010001') or enum[:2]!=b'\x01\x00':raise ValueError('Current Slot proxy/enum versions differ')
        slots.append({'index':index,'present':True,'className':'gCInventorySlot','tailOffset':start,'bytes':cursor-start,
                      'factoryVersions':list(factory),'objectVersion':83,'propertyVersion':30,'nativeVersion':1,'slot':value,
                      'templateId20':template[6:],'itemId20':item[6:],'properties':properties})
    if [(value['index'],value['slot']) for value in slots if value['present']]!=[(16,16),(17,17)]:raise ValueError('Current actual Head/Body slot records differ')
    proxies=[]
    for index in range(5):
        version=number('<H');present=number('<B')
        if (version,present)!=(1,0):raise ValueError('Current Inventory cached proxy differs')
        proxies.append({'index':index,'version':version,'present':False})
    if cursor!=len(tail):raise ValueError('Current Inventory tail has unconsumed data')
    return {'stackVersion':stack_version,'stackCount':stack_count,'slotVersion':slot_version,'slotCount':slot_count,'slots':slots,'cachedProxies':proxies,'bytes':cursor}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',type=Path,required=True)
    parser.add_argument('--capture-only',action='store_true')
    args=parser.parse_args(); study=args.study.resolve()
    OUT.mkdir(parents=True,exist_ok=True);PUBLIC.mkdir(parents=True,exist_ok=True)
    pes,inputs,maps={}, {}, {}; selectors={name:set(values) for name,values in SELECT.items()}
    for name,(module,filename,expected) in INPUTS.items():
        path=study/'00_Original_Runtime'/filename
        if sha(path)!=expected: raise ValueError('Original installed build differs: '+name)
        pes[name]=PE(path);maps[name]=exports(pes[name]);inputs[name]={'path':'00_Original_Runtime/'+filename,'bytes':path.stat().st_size,'sha256':expected}
    imports={name:native_imports(pe) for name,pe in pes.items()}
    schema_path=ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json'
    schema=json.loads(schema_path.read_text(encoding='utf8'))
    fields=sorted((value for value in schema['nativePropertyRegistrars'] if value['className']=='gCInventory_PS'),key=lambda value:int(value['entry'],16))
    if [f['nativeOffset'] for f in fields] != [24,25,28,32,36,40,44]: raise ValueError('Inventory descriptor order differs')
    slot_fields=[{'entry':'204f3bb0','name':'Template','nativeOffset':12,'vtable':'2067fc0c','typeName':'eCTemplateEntityProxy'},
                 {'entry':'204f3ca0','name':'Item','nativeOffset':24,'vtable':'2067fc94','typeName':'eCEntityProxy'},
                 {'entry':'204f3d90','name':'Slot','nativeOffset':52,'vtable':'2067fd1c','typeName':'bTPropertyContainer<enum gESlot>'}]
    tables={};runtime_fields={};native_tables={}
    for class_name,class_fields in [('gCInventory_PS',fields),('gCInventorySlot',slot_fields)]:
        runtime_fields[class_name]=[]
        for field in class_fields:
            selectors['Game'].add(field['entry'])
            table=pin_vtable(pes['Game'],imports['Game'],maps,int(field['vtable'],16),0x68)
            tables[class_name+':'+field['name']]=table;slots={row['offset']:row for row in table['entries']}
            for offset in [0x10,0x14,0x2c,0x38,0x64]:
                row=slots[offset]
                target=row.get('implementation','Game:'+row['target'])
                name,entry=target.split(':');selectors[name].add(entry)
            def target(offset):
                row=slots[offset];return row.get('implementation','Game:'+row['target'])
            runtime_fields[class_name].append({'name':field['name'],'typeName':field.get('typeName',field.get('cppType')),
                'nativeOffset':field['nativeOffset'],'registrar':'Game:'+field['entry'],'reader':target(0x38),'defaultInitializer':target(0x14)})
    # Pin concrete virtual dispatch and imported method identity. Only examined
    # virtuals enter the selected body catalog, not every unrelated operation.
    for key,va,size,offsets in [('inventory','2067cfac',0x140,[0,4,0x10,0x18,0x20,0x24,0x40,0x4c,0x50,0x58,0x5c,0x60,0x84,0x12c,0x138,0x13c]),
        ('slot','2065c42c',0x68,[0,4,0x10,0x18,0x20,0x24,0x40,0x4c,0x50,0x58,0x5c]),
        ('slotEnum','2065c204',0x28,[0x0c,0x18,0x1c])]:
        table=pin_vtable(pes['Game'],imports['Game'],maps,int(va,16),size);native_tables[key]=table
        for row in table['entries']:
            if row['offset'] in offsets:
                target=row.get('implementation','Game:'+row['target']);name,entry=target.split(':');selectors[name].add(entry)
    # Imported constructor/string/property-reference helpers used by selected
    # bodies are recorded explicitly. No transitive executable call graph runs.
    for address in [0x207d6df8,0x207d8928,0x207d865c,0x207d8700,0x207d8800,0x207d8834]:
        item=imports['Game'][address];name=Path(item['library']).stem;symbol=item['decoratedName'];selectors[name].add(f'{maps[name][symbol]:08x}')
    functions,instructions=[],{}
    for name,(module,_,_) in INPUTS.items():
        bodies,records=capture(study,name,module,selectors[name],pes[name]);functions+=bodies;instructions.update(records)
    for function in functions:
        name=function['id'].split(':')[0];ranges=[]
        for first,last in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})',function['bodyRanges']):
            size=int(last,16)-int(first,16)+1
            ranges.append({'startVA':first,'endVAInclusive':last,'bytes':size,'sha256':hashlib.sha256(pes[name].at(int(first,16),size)).hexdigest()})
        if not ranges:raise ValueError('Original full-body range absent')
        function['originalPEBodyRanges']=ranges
    literals=[]
    for name,address,expected,meaning in [('Game','201a8e80','66b80900c3','GetVersion literal9'),
        ('Game','201a8e90','b81f000000c3','GetPropertySetType literal31'),
        ('SharedBase','1004a550','66b80100c3','inherited InventorySlot GetVersion literal1'),
        ('Engine','30481520','b86400000032c0c3','inherited IsProcessable false'),
        ('Game','201adbe0','83c140','ClearDefaultItems receiver is actual slotList+40'),
        ('Game','201abb32','68e8000000','native Inventory allocation232'),
        ('Game','201c3e02','6a3c','native InventorySlot allocation60'),
        ('Game','201ac056','c706a4cd6720','Inventory wrapper vtable2067cda4'),
        ('Game','201c6096','c7061cf96720','InventorySlot wrapper vtable2067f91c')]:
        if pes[name].at(int(address,16),len(bytes.fromhex(expected))).hex()!=expected:raise ValueError('Literal differs: '+meaning)
        literals.append({'module':name,'address':address,'bytes':expected,'meaning':meaning})
    # Exact source member-registrar stores, including Slot which was outside the
    # earlier PS-only schema catalog. Names are actual packet strings.
    for field,descriptor,offset_va,vt_va in zip(slot_fields,[0x207bbe24,0x207bbe48,0x207bbe6c],['204f3c12','204f3d02','204f3df2'],['204f3bf9','204f3ce9','204f3dd9'],strict=True):
        expect=b'\xc7\x05'+struct.pack('<II',descriptor+0x1c,field['nativeOffset'])
        if pes['Game'].at(int(offset_va,16),10)!=expect:raise ValueError('Slot registrar offset differs')
        expect_vt=b'\xc7\x05'+struct.pack('<II',descriptor,int(field['vtable'],16))
        if pes['Game'].at(int(vt_va,16),10)!=expect_vt:raise ValueError('Slot registrar table differs')
        field.update({'offsetStoreVA':offset_va,'vtableStoreVA':vt_va,'descriptor':f'{descriptor:08x}'})
    serialized_path=ROOT/'public/gothic3/entity-reflection/serialized-candidates.json'
    serialized=json.loads(serialized_path.read_text(encoding='utf8'));hero=next(value for value in serialized['entities'] if value['name']=='PC_Hero');packet=hero['propertySets'][7]
    if (packet['className'],packet['outerVersion'],packet['nativeReadVersion'],packet['objectVersion'],packet['propertyVersion'])!=('gCInventory_PS',9,9,83,30):raise ValueError('Hero Inventory source versions differ')
    world_path=study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
    if sha(world_path)!=WORLD_SHA:raise ValueError('Hero original world SHA differs')
    world=world_path.read_bytes();raw=world[packet['sourceOffset']:packet['endSourceOffset']+4]
    if len(raw)!=411 or raw.hex()!=packet['serializedRaw'] or hashlib.sha256(raw).hexdigest()!=packet['serializedSha256']:raise ValueError('Hero Inventory packet differs')
    normalized=[]
    for descriptor,prop in zip(fields,packet['properties'],strict=True):
        data=world[prop['sourceOffset']:prop['sourceOffset']+prop['byteLength']]
        if prop['name']!=descriptor['name'] or data.hex()!=prop['raw']:raise ValueError('Hero descriptor payload differs')
        if prop['type']=='bool':value=bool(data[0])
        else:value=serialized['strings'][struct.unpack('<H',data)[0]]
        normalized.append({'name':prop['name'],'typeName':prop['type'],'nativeOffset':descriptor['nativeOffset'],'raw':data.hex(),'value':value,'sourceOffset':prop['sourceOffset']})
    tail=bytes.fromhex(packet['tailRaw']);
    if tail[:12]!=bytes.fromhex('010000000000010013000000'):raise ValueError('Hero Inventory tail lists differ')
    tail_audit=current_tail(tail,serialized['strings'])
    source={'archive':'Projects_compiled.p00','path':WORLD_PATH,'sha256':WORLD_SHA,'packetOffset':packet['sourceOffset'],'packetBytes':len(raw),'packetSha256':packet['serializedSha256']}
    rules={'schema':'gothic3-inventory-reading-rules-v1','inputs':{name:value['sha256'] for name,value in inputs.items()},
        'nativeBytes':232,'getVersion':9,'propertyType':31,'nativeVtable':'2067cfac','slotNativeVtable':'2065c42c',
        'fields':runtime_fields,'sourceHero':{'index':7,**source},
        'slotNativeVersion':1,'slotNativeBytes':60,'nativeBaseClassName':{'gCInventory_PS':'eCEntityPropertySet','gCInventorySlot':'bCObjectRefBase'},
        'slotIteratorBaseSentinel':{'nativeName':'bCObjectRefBase','normalizedRoot':None,'source':'SharedBase:1009ae00'},
        'sources':{'allocate':'Game:201ac030','attach':'Game:201a94a0','wrapperRead':'Game:201a9fd0','dataRead':'Game:201ac320',
                   'slotAllocate':'Game:201c6070','slotRead':'Game:201c3130','slotDataRead':'Game:201c6870'},
        'profile':{'freshWrappers':True,'successfulAllocations':True,'slotArrayRealloc':'successful moving allocation if capacity grows; retained otherwise',
                   'slotDefaultGlobal':'actual current Game DWORD207b5f2c is supplied explicitly','strings':'current Hero empty CString text with physicallyNULL destination; table source mayNULL or allocated-empty',
                   'constructorSlotCount':{'slotListConstructor':19,'afterInventoryClearDefaultItems':0,'backingCapacity':27}},
        'unresolved':['nonzero original InventoryStack clone/reader and stack callbacks','nonempty native CString allocation/refcount services',
          'last wrapper/native reference destruction and MemoryAdmin.DeleteObject','legacy Inventory readers3..8 and unknown-version warnings',
          'physical item/entity materialization and mutation/patching/equipment callbacks; serialized slots are not activated equipment',
          'world/cache/processing and later startup item assurances are separate']}
    save_json(OUT/'runtime-rules.json',rules);save_json(PUBLIC/'runtime-rules.json',rules)
    evidence={'schema':'gothic3-inventory-reading-native-evidence-v1','nativeCodeExecuted':False,'testsRun':False,
        'inputs':inputs,'functions':functions,'instructions':instructions,'descriptorVtables':tables,'nativeVtables':native_tables,
        'inventoryDescriptors':fields,'slotDescriptors':slot_fields,'literalProofs':literals,'sourcePacket':source,
        'allInstructionBytesMatchOriginalPE':True,'scope':'Fresh detached factory/defaults/current Hero physical reads; no world activation or startup-projected inventory'}
    save_json(OUT/'native-evidence.json',evidence)
    doc={'schema':'gothic3-original-hero-inventory-v1','source':source,'properties':normalized,'tailRaw':packet['tailRaw'],
         'nativeReadOffset':packet['nativeReadOffset'],'outerVersion':9,'nativeReadVersion':9,'worldResident':False,
         'stackCount':0,'slotCount':19,'startupProjectionApplied':False,'currentTailAudit':tail_audit}
    save_json(OUT/'hero-inventory.json',doc);save_json(PUBLIC/'hero-inventory.json',doc)
    expected_sources={OUT/function[key] for function in functions for key in ['cExcerpt','assemblyExcerpt']}
    for path in (OUT/'sources').rglob('*.txt'):
        if path not in expected_sources:path.unlink()
    save_json(OUT/'manifest.json',{'schema':'gothic3-inventory-reading-manifest-v1','outputs':[{'path':path.name,'bytes':path.stat().st_size,'sha256':sha(path)} for path in sorted(PUBLIC.glob('*.json'))]})
    if not args.capture_only:
        files=[Path(__file__).resolve(),ROOT/'src/gothic3/inventory-reading.ts',schema_path,serialized_path]
        files += [ROOT/'src/gothic3'/name for name in ['entity-reflection.ts','entity-lifecycle.ts','entity-reading.ts','native-properties.ts','inventory.ts']]
        files += [ROOT/'tools/gothic3'/name for name in ['research_native_combat.py','research_native_clock.py','research_native_inventory.py','research_entity_reflection.py','research_entity_lifecycle.py','read_gameplay_properties.py','export_world_index.py','read_gameplay_ini.py','read_genome.py','read_xcmsh.py','read_xshmat.py']]
        files += [path for folder in [OUT,PUBLIC] for path in folder.rglob('*') if path.is_file() and path.name!='implementation-receipt.json']
        save_json(OUT/'implementation-receipt.json',{'schema':'gothic3-inventory-reading-implementation-receipt-v1','nativeCodeExecuted':False,'testsRun':False,
            'scope':'Current Inventory physical reading implementation/source/dependency/output pins; earlier receipts stay historical',
            'files':[{'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':sha(path)} for path in sorted(set(files))]})
    print(json.dumps({'functions':len(functions),'instructions':sum(len(rows) for rows in instructions.values()),'instructionBytes':sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows),
        'captureOnly':args.capture_only,'receiptSha256':None if args.capture_only else sha(OUT/'implementation-receipt.json')}))


if __name__=='__main__':main()
