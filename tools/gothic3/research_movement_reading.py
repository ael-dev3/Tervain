"""Audit installed CharacterMovement construction/reflective reading offline.

Python 3.10+, standard library. Curated source operation programs are validated
against original PE instruction bytes, not executed. Original DLLs are never
loaded. Run from repository root with --study <LOCAL_GOTHIC3_STUDY>.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import re
import struct
from pathlib import Path
from research_native_clock import collect
from research_native_combat import PE, save_json, sha
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import pin_vtable

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/gothic3/movement-reading'
PUBLIC=ROOT/'public/gothic3/movement-reading'
INPUTS={
 'Game':('Game_dll','Game.dll','b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'),
 'Engine':('Engine_dll','Engine.dll','d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'),
 'SharedBase':('SharedBase_dll','SharedBase.dll','5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'),
}
GAME_SELECT='''20026fa3 20021468 200362c8 20027304 200280e7 200010fa
200170b2 20022061 20007b17 20005466 20035576 2001ed80 20027a48
200152c6 2002e6f4 2002fd01 2003067f 20028f97 200158cf 20005425
20026fd0 2000986d 20033596 200278e0 20025612 20236030 20235d30 2001ff73
2002318c 2000dcc9 20032795 2023b040 2023b050 2000b7c1 2000b9f1
2000f59c 2002ac2a 2023c8e0'''
ENGINE_SELECT='30481490 304814e0 30481a60 304c42e0 304c43a0 304c45a0 300629d0 300633f0 30088e90 30088af0'
SHARED_SELECT='''10002833 100062ee 100020a9 10003d28 100076f8
10024e00 10025dc0 10028790 10001d07
10006997 1000179e 1000191f 10002649 10006feb 100085e9'''

def main():
 ap=argparse.ArgumentParser(description=__doc__)
 ap.add_argument('--study',type=Path,required=True)
 ap.add_argument('--capture-only',action='store_true',help='Capture rules/evidence before runtime is finalized; no current implementation receipt')
 args=ap.parse_args();study=args.study.resolve()
 OUT.mkdir(parents=True,exist_ok=True);PUBLIC.mkdir(parents=True,exist_ok=True)
 pes={};inputs={}
 for name,(module,path,expected) in INPUTS.items():
  binary=study/'00_Original_Runtime'/path
  if sha(binary)!=expected:raise ValueError('Unsupported original build: '+name)
  pes[name]=PE(binary);inputs[name]={'path':'00_Original_Runtime/'+path,'bytes':binary.stat().st_size,'sha256':expected}
 original_schema=ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json'
 schema=json.loads(original_schema.read_text(encoding='utf8'))
 fields=sorted((item for item in schema['nativePropertyRegistrars'] if item['className']=='gCCharacterMovement_PS'),key=lambda item:int(item['entry'],16))
 if len(fields)!=36 or fields[-1]['name']!='TreatWaterAsSolid' or fields[-1]['nativeOffset']!=152:
  raise ValueError('Original movement descriptor table differs')
 selectors={'Game':set(GAME_SELECT.split()),'Engine':set(ENGINE_SELECT.split()),'SharedBase':set(SHARED_SELECT.split())}
 selectors['Game'].update(item['entry'] for item in fields)
 maps={name:exports(pe) for name,pe in pes.items()}
 symbols={
  'SharedBase':['??0bCObjectRefBase@@QAE@XZ','??0bCObjectBase@@QAE@XZ','??0bCString@@QAE@XZ',
    '??0bCString@@QAE@PBD@Z','??1bCString@@QAE@XZ','??0bCPropertyID@@QAE@XZ',
    '?Destroy@bCPropertyID@@QAEXXZ','?Create@bCObjectRefBase@@UAE?AW4bEResult@@XZ',
    '?Create@bCObjectBase@@UAE?AW4bEResult@@XZ'],
 }
 for name,names in symbols.items():
  for symbol in names:
   if symbol not in maps[name]:raise ValueError('Required original symbol absent: '+symbol)
   selectors[name].add(f'{maps[name][symbol]:08x}')
 imports=native_imports(pes['Game'])
 vtables={label:pin_vtable(pes['Game'],imports,maps,address,length) for label,address,length in [
  ('movementNative',0x20687e8c,0x150),('movementWrapper',0x206879c4,0x44),
  ('movementBool',0x20687af4,0x68),('movementFloat',0x20687b7c,0x68),
  ('movementBaseType',0x20688b64,0x10)]}
 for table in vtables.values():
  for item in table['entries']:
   if item.get('implementation'):
    name,entry=item['implementation'].split(':');selectors[name].add(entry)
   elif item['target']!='00000000':selectors['Game'].add(item['target'])
 # Close only PE-proven pure five-byte JMP forwarding aliases before capture.
 # collect itself follows one hop; this makes a fresh run immediately stable.
 for name,(module,_,_) in INPUTS.items():
  with (study/'01_Decompiled_Code'/module/'functions.csv').open(encoding='utf-8-sig',newline='') as file:
   catalog={row['address']:row for row in csv.DictReader(file)}
  changed=True
  while changed:
   changed=False
   for entry in tuple(selectors[name]):
    row=catalog.get(entry)
    if row is None:raise ValueError('Selected source entry absent: '+name+':'+entry)
    raw=pes[name].at(int(entry,16),5)
    if row['body_bytes']=='5' and raw[0]==0xe9:
     target=f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}'
     if target not in selectors[name]:selectors[name].add(target);changed=True
 functions=[];instructions={}
 for name,(module,_,_) in INPUTS.items():
  bodies,records=collect(study,name,module,' '.join(sorted(selectors[name])),pes[name],OUT)
  functions+=bodies;instructions.update(records)
 for function in functions:
  name=function['id'].split(':')[0];ranges=[]
  for start,end in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})',function['bodyRanges']):
   size=int(end,16)-int(start,16)+1;raw=pes[name].at(int(start,16),size)
   ranges.append({'startVA':start,'endVAInclusive':end,'bytes':size,'sha256':hashlib.sha256(raw).hexdigest()})
  if not ranges:raise ValueError('Native PE body ranges absent')
  function['originalPEBodyRanges']=ranges
 # Stale captures from a preceding selector revision are not current evidence.
 expected={OUT/function[key] for function in functions for key in ['cExcerpt','assemblyExcerpt']}
 for path in (OUT/'sources').rglob('*'):
  if path.is_file() and path not in expected and path.suffix=='.txt':path.unlink()
 lookup={record['address']:record for rows in instructions.values() for record in rows}
 program_path=OUT/'construction-program.json'
 program=json.loads(program_path.read_text(encoding='utf8'))
 if program['schema']!='gothic3-movement-construction-program-v1' or [stage['stage'] for stage in program['programs']]!=['constructor','invalidate','postInitialize']:
  raise ValueError('Curated source operation program differs')
 for stage in program['programs']:
  body=f"{int(stage['body'],16):08x}"
  body_rows={row['address']:row for row in instructions['Game:'+body]}
  previous=0
  for operation in stage['operations']:
   address=int(operation['sourceVA'],16)
   if address<previous or f'{address:08x}' not in body_rows:raise ValueError('Operation source order/membership differs')
   previous=address
   record=body_rows[f'{address:08x}']
   operation['sourceInstruction']=record
   if 'raw' in operation and 'value' in operation:
    width=operation['bytes'];raw=bytes.fromhex(operation['raw'])
    if len(raw)!=width:raise ValueError('Operation width differs')
    if operation['kind']=='float32Store':
     if struct.unpack('<f',raw)[0]!=operation['value']:raise ValueError('Float operation raw/value differs')
    elif int.from_bytes(raw,'little')!=operation['value']:raise ValueError('Integer operation raw/value differs')
 save_json(program_path,program)
 # Helper recipes are curated ASM interpretation, not an x86 emulator. Each
 # instruction address and complete original PE bytes are independently pinned.
 for role,operations in program['helperPrograms'].items():
  for operation in operations:
   if 'sourceVA' not in operation:continue
   address=f"{int(operation['sourceVA'],16):08x}"
   if address not in lookup:raise ValueError('Helper instruction is not captured: '+role+' '+address)
   operation['sourceInstruction']=lookup[address]
 allocation=program['allocation']
 size_instruction=lookup[f"{int(allocation['sizePushVA'],16):08x}"]
 ctor_instruction=lookup[f"{int(allocation['constructorCallVA'],16):08x}"]
 if (allocation['size']!=988 or size_instruction['assembly']!='PUSH 0x3dc' or
     ctor_instruction['assembly']!='CALL 0x20026fa3'):raise ValueError('Original allocation extent/constructor instruction differs')
 allocation['sizeInstruction']=size_instruction;allocation['constructorInstruction']=ctor_instruction
 save_json(program_path,program)
 type_slot=next(item for item in vtables['movementNative']['entries'] if item['offset']==0x60)
 if (type_slot['target']!='20033596' or lookup['20223240']['bytes']!='b815000000' or
     lookup['20223245']['bytes']!='c3' or lookup['10088036']['bytes']!='89460c' or
     pes['Game'].at(0x20666860,4).hex()!='487a0220' or lookup['20223220']['bytes']!='66b84d00'):
  raise ValueError('Original movement selector/base count/effect virtual differs')
 # The actual PE initializer pointer sequence establishes descriptor append order.
 sequence=b''.join(struct.pack('<I',int(item['entry'],16)) for item in fields)
 initializer=[]
 for rva,size,file_offset in pes['Game'].sections:
  raw=pes['Game'].data[file_offset:file_offset+size];at=raw.find(sequence)
  if at>=0:initializer.append({'address':f"{pes['Game'].base+rva+at:08x}",'bytes':sequence.hex()})
 if len(initializer)!=1:raise ValueError('Original movement property initializer order unresolved')
 for field in fields:
  records=instructions['Game:'+field['entry']]
  if field['descriptorStore'] not in records or field['offsetStore'] not in records or field['defaultStore'] not in records:
   raise ValueError('Intermediate schema descriptor proof differs: '+field['name'])
  raw=pes['Game'].cstring(int(field['nameLiteral']['address'],16))
  if raw.decode('cp1252')!=field['name'] or raw.hex()+'00'!=field['nameLiteral']['bytes']:
   raise ValueError('Original property name literal differs')
  if field['defaultPointer']!=0 or field['cppType'] not in ['bool','float']:
   raise ValueError('Unsupported concrete descriptor default type')
 serialized_path=ROOT/'public/gothic3/entity-reflection/serialized-candidates.json'
 serialized=json.loads(serialized_path.read_text(encoding='utf8'))
 hero=next(entity for entity in serialized['entities'] if entity['name']=='PC_Hero')
 chosen=[(index,ps) for index,ps in enumerate(hero['propertySets']) if ps['className']=='gCCharacterMovement_PS']
 if len(chosen)!=1:raise ValueError('Original Hero movement membership differs')
 index,ps=chosen[0]
 if (index,ps['outerVersion'],ps['nativeReadVersion'],ps['objectVersion'],ps['propertyVersion'],len(ps['properties']))!=(3,76,76,83,30,35):
  raise ValueError('Original Hero movement packet profile differs')
 source=serialized['source'];original=study/'02_Unpacked_Data/Archives'/source['archive']/source['path']
 if sha(original)!=source['sha256']:raise ValueError('Original Hero world file differs')
 raw=original.read_bytes();packet=raw[ps['sourceOffset']:ps['endSourceOffset']+4]
 if packet.hex()!=ps['serializedRaw'] or hashlib.sha256(packet).hexdigest()!=ps['serializedSha256']:
  raise ValueError('Original Hero movement packet bytes differ')
 normalized=[]
 by_name={field['name']:field for field in fields}
 for prop in ps['properties']:
  field=by_name[prop['name']];value_bytes=raw[prop['sourceOffset']:prop['sourceOffset']+prop['byteLength']]
  if value_bytes.hex()!=prop['raw']:raise ValueError('Serialized source property differs')
  value=bool(value_bytes[0]) if field['cppType']=='bool' else struct.unpack('<f',value_bytes)[0]
  normalized.append({'name':field['name'],'nativeOffset':field['nativeOffset'],'typeName':field['cppType'],
    'value':value,'raw':value_bytes.hex(),'sourceOffset':prop['sourceOffset']})
 evidence={'schema':'gothic3-movement-reading-native-evidence-v1','nativeCodeExecuted':False,'testsRun':False,
  'inputs':inputs,'functions':functions,'instructions':instructions,'vtables':vtables,
  'descriptorInitializer':initializer[0],'propertyDescriptors':fields,
  'freshMovementBaseMetadata':{'className':'gCMovementBase_PS','baseClassName':'eCEntityPropertySet','declaredFields':0,
   'templateGetter':'20032795/2023bed0','rootObjectGetter':'2002318c/2023a940',
   'countInitialization':lookup['10088036'],'countGetter':lookup['10087e70'],
   'classRTTI':{'address':'20796e10','bytes':pes['Game'].cstring(0x20796e10+8).hex()},
   'baseRTTI':{'address':'20796088','bytes':pes['Game'].cstring(0x20796088+8).hex()},
   'limitation':'Fresh builtin metadata only; unknown/type-mismatched property fallback2023c8e0 can append an obsolete descriptor'},
  'installedEffectSystemGetter':{'moduleVtable':'206667a4','slot':'000000bc','slotAddress':'20666860',
   'slotBytes':pes['Game'].at(0x20666860,4).hex(),'entry':'20027a48','body':'201153e0',
   'instructions':instructions['Game:201153e0']},
  'nativePropertyType':{'slotOffset':96,'entry':'20033596','body':'20223240','value':21,
    'instructions':instructions['Game:20223240']},
  'nativeGetVersion':{'entry':'20026fd0','body':'20223220','value':77,'instructions':instructions['Game:20223220']},
  'sourcePacket':{'archive':source['archive'],'path':source['path'],'sha256':source['sha256'],
    'packetOffset':ps['sourceOffset'],'packetBytes':len(packet),'packetSha256':ps['serializedSha256']},
  'constructionProgram':{'path':'construction-program.json','bytes':program_path.stat().st_size,'sha256':sha(program_path)},
  'scope':'Original PE and source packet byte audit; detached construction/read only, not world residency'}
 save_json(OUT/'native-evidence.json',evidence)
 rules={'schema':'gothic3-movement-reading-rules-v1','inputs':{name:item['sha256'] for name,item in inputs.items()},
  'nativeVersion':76,'getVersion':77,'propertyType':21,'nativeVtable':'20687e8c','wrapperVtable':'206879c4',
  'fields':[{'name':f['name'],'typeName':f['cppType'],'nativeOffset':f['nativeOffset'],
    'registrar':f['entry'],'reader':'202350f0' if f['cppType']=='bool' else '20235990'} for f in fields],
  'programs':program['programs'],'helperPrograms':program['helperPrograms'],
  'allocation':program['allocation'],
  'metadataProfile':'Fresh builtin MovementBase root has zero declared fields. Obsolete/type-mismatch reads can append legacy metadata and are excluded.',
  'sourceHero':{'reflectionUrl':'entity-reflection/serialized-candidates.json','propertySetIndex':index,
    'packetSha256':ps['serializedSha256'],'sourceOffset':ps['sourceOffset'],'outerVersion':76,'nativeReadVersion':76},
  'scope':'Scalar/bit/identity storage from actual constructor/default/property/native Read; source callbacks remain services; detached PS is not worldresident',
  'legacyRead':'Only native version>=76 implemented; older payload/migration keeps consumed-version prefix and explicit dependency',
  'pointerProfile':'JS pointer identities are sidecars; no source PE address is asserted to be a browser memory address',
  'unresolved':['full generic obsolete/repeat/property type mismatch readers','legacy native versions<76',
    'animation allocation last-reference release/delete','nonnull owned shape array reset','nonnull CString pool ownership',
    'actual initialized ModuleAdmin/FindModule/RTTI and Application instance binding','loaded active world/collision/animation/physical integration']}
 save_json(OUT/'runtime-rules.json',rules);save_json(PUBLIC/'runtime-rules.json',rules)
 hero_doc={'schema':'gothic3-original-hero-movement-v1','worldResident':False,'source':evidence['sourcePacket'],
  'className':'gCCharacterMovement_PS','outerVersion':76,'nativeReadVersion':76,'serializedFields':normalized,
  'missingSerializedDescriptors':['TreatWaterAsSolid'],'factoryDefaultsRemainDistinct':True}
 save_json(OUT/'hero-movement.json',hero_doc);save_json(PUBLIC/'hero-movement.json',hero_doc)
 manifest={'schema':'gothic3-movement-reading-manifest-v1','outputs':[{'path':p.name,'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(PUBLIC.glob('*.json'))]}
 save_json(OUT/'manifest.json',manifest)
 if not args.capture_only:
  files=[ROOT/'src/gothic3/movement-reading.ts',Path(__file__).resolve()]
  files += [ROOT/'src/gothic3'/name for name in ['movement-state.ts','entity-reflection.ts','entity-lifecycle.ts','entity-reading.ts','native-properties.ts','player-state.ts']]
  files += [ROOT/'tools/gothic3'/name for name in ['research_native_clock.py','research_native_combat.py','research_native_inventory.py',
   'research_entity_lifecycle.py','research_entity_reflection.py','research_routine_scripts.py','read_gameplay_properties.py']]
  files += [original_schema,serialized_path]
  files += sorted(p for folder in [OUT,PUBLIC] for p in folder.rglob('*') if p.is_file() and p.name!='implementation-receipt.json')
  receipt={'schema':'gothic3-movement-reading-implementation-receipt-v1','nativeCodeExecuted':False,'testsRun':False,
   'scope':'Current source/input/output byte pins; old movement-state receipts remain historical at4252aa9a',
   'intentionalSharedChange':'MovementBytes optional bit-known mask; fc bit2 reads/OR2 stores preserve unknown other bits; braking invalidation clears both masks',
   'files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in files]}
  save_json(OUT/'implementation-receipt.json',receipt)
 print(json.dumps({'functions':len(functions),'instructions':sum(len(rows) for rows in instructions.values()),
  'instructionBytes':sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows),
  'captureOnly':args.capture_only,'receiptSha256':None if args.capture_only else sha(OUT/'implementation-receipt.json')}))

if __name__=='__main__':main()
