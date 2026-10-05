"""Reproduce installed original RigidBody factory/current reading offline.

Python 3.10+, standard library. Original PE bytes are read, never loaded or
executed. Curated constructor programs are source interpretations, not an x86
emulator. Missing original study functions retain explicit ASM-only evidence.
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

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/gothic3/rigidbody-reading'
PUBLIC=ROOT/'public/gothic3/rigidbody-reading'
SELECT={
 'Game':set(),
 'Engine':set('''300092b4 30040c78 300438d8 3002ee3d 30028457 3000a899
3001f825 30026bd4 3004183f 30048455 3000d1ca 3000ec05 3003a1a7
30034cfc 30040f89 30003238 3003d235 3003cd99 30039892 3002c4a8
303327a0 30330a20 30008a71 3003fc8d 3032ccf0 3032f480
30481a60 304814e0'''.split()),
 'SharedBase':set('''10001d07 10004ea3 1000235b 10004b74 10006636
10002833 100062ee 10024e00 10025dc0 10005d35 1000393b 10002f68
10007356 10002455 100025d6 100043fe 10006861'''.split()),
}

def capture(study,name,module,selected,pe):
 with (study/'01_Decompiled_Code'/module/'functions.csv').open(encoding='utf-8-sig',newline='') as file:
  catalog={row['address']:row for row in csv.DictReader(file)}
 pending=list(selected)
 while pending:
  entry=pending.pop();row=catalog[entry];raw=pe.at(int(entry,16),5)
  if row['body_bytes']=='5' and raw[0]==0xe9:
   target=f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}'
   if target not in selected:selected.add(target);pending.append(target)
 return collect(study,name,module,' '.join(sorted(selected)),pe,OUT)

def audit_zero_fill(pe,proof):
 """Validate PE loader zero-fill without pretending those are file bytes."""
 pe_header=struct.unpack_from('<I',pe.data,0x3c)[0]
 count=struct.unpack_from('<H',pe.data,pe_header+6)[0]
 optional_size=struct.unpack_from('<H',pe.data,pe_header+20)[0]
 sections=pe_header+24+optional_size
 selected=None
 for index in range(count):
  at=sections+index*40;header=pe.data[at:at+40]
  name=header[:8].rstrip(b'\0').decode('ascii')
  virtual_size,rva,raw_size,raw_at=struct.unpack_from('<IIII',header,8)
  if name==proof['sectionName']:
   selected=(header,virtual_size,rva,raw_size,raw_at);break
 if selected is None:raise ValueError('Original zero-fill section absent')
 header,virtual_size,rva,raw_size,raw_at=selected
 if (header.hex()!=proof['sectionHeaderBytes'] or
  (virtual_size,rva,raw_size,raw_at)!=(proof['virtualSize'],proof['virtualAddress'],proof['rawSize'],proof['rawOffset'])):
  raise ValueError('Original zero-fill section header differs')
 address=int(proof['va'],16)-pe.base
 if (address!=int(proof['rva'],16) or not rva+raw_size<=address or
  address+proof['bytes']>rva+virtual_size or not proof['PEInitialImageZeroFill'] or
  proof['initialImageValue']!=0 or proof['liveValueCaptured']):raise ValueError('Original cold zero-fill scope differs')

def audit_program_sources(value,pes,lookup):
 """Pin every curated source instruction, including helper/capture stages."""
 if isinstance(value,dict):
  if all(key in value for key in ['method','va','bytes','assembly']):
   name,entry=value['method'].split(':');address=value['va'].replace('0x','')
   raw=bytes.fromhex(value['bytes'])
   if pes[name].at(int(address,16),len(raw))!=raw:raise ValueError('Curated helper source bytes differ '+address)
   if address not in lookup or lookup[address]['bytes']!=value['bytes']:raise ValueError('Curated helper source instruction absent '+address)
  for child in value.values():audit_program_sources(child,pes,lookup)
 elif isinstance(value,list):
  for child in value:audit_program_sources(child,pes,lookup)

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--study',type=Path,required=True)
 parser.add_argument('--capture-only',action='store_true');args=parser.parse_args();study=args.study.resolve()
 OUT.mkdir(parents=True,exist_ok=True);PUBLIC.mkdir(parents=True,exist_ok=True)
 pes={};inputs={};maps={};selectors={name:set(values) for name,values in SELECT.items()}
 for name,(module,filename,expected) in INPUTS.items():
  binary=study/'00_Original_Runtime'/filename
  if sha(binary)!=expected:raise ValueError('Original installed build differs: '+name)
  pes[name]=PE(binary);maps[name]=exports(pes[name]);inputs[name]={'path':'00_Original_Runtime/'+filename,'bytes':binary.stat().st_size,'sha256':expected}
 program_path=OUT/'construction-program.json';program=json.loads(program_path.read_text(encoding='utf8'))
 schema_path=ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json'
 schema=json.loads(schema_path.read_text(encoding='utf8'))
 leaf=sorted((field for field in schema['nativePropertyRegistrars'] if field['className']=='eCRigidBody_PS'),key=lambda field:int(field['entry'],16))
 if len(leaf)!=13 or leaf[-1]['name']!='BodyFlag':raise ValueError('Original RigidBody leaf descriptor membership differs')
 selectors['Engine'].update(field['entry'] for field in leaf)
 imports=native_imports(pes['Engine'])
 vtables={label:pin_vtable(pes['Engine'],imports,maps,int(address,16),length) for label,address,length in program['vtables']}
 for table in vtables.values():
  for item in table['entries']:
   if item.get('implementation'):
    name,entry=item['implementation'].split(':');selectors[name].add(entry)
   elif item['target']!='00000000':selectors['Engine'].add(item['target'])
 for name,entries in program.get('additionalSelectors',{}).items():selectors[name].update(entries)
 functions=[];instructions={}
 for name,(module,_,_) in INPUTS.items():
  if not selectors[name]:continue
  bodies,records=capture(study,name,module,selectors[name],pes[name]);functions+=bodies;instructions.update(records)
 for function in functions:
  name=function['id'].split(':')[0];ranges=[]
  for start,end in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})',function['bodyRanges']):
   size=int(end,16)-int(start,16)+1
   ranges.append({'startVA':start,'endVAInclusive':end,'bytes':size,'sha256':hashlib.sha256(pes[name].at(int(start,16),size)).hexdigest()})
  if not ranges:raise ValueError('Original PE function body range absent')
  function['originalPEBodyRanges']=ranges
 # The inherited registrar is genuinely absent from the completed study CSV.
 # Retain the independently curated assembly-only original body without C.
 manual=program['asmOnlyFunctions']
 for function in manual:
  rows=function['instructions'];name=function['module'];source_bytes=b'';cursor=int(function['entry'],16)
  for row in rows:
   raw=bytes.fromhex(row['bytes']);address=int(row['address'],16)
   if address!=cursor or pes[name].at(address,len(raw))!=raw:raise ValueError('ASM-only original instruction bytes differ')
   source_bytes+=raw;cursor+=len(raw)
  if cursor!=int(function['endVAExclusive'],16):raise ValueError('ASM-only body boundary differs')
  function['originalPEBodySha256']=hashlib.sha256(source_bytes).hexdigest()
  function['originalPEBodyRanges']=[{'startVA':function['entry'],'endVAInclusive':f'{cursor-1:08x}',
   'bytes':len(source_bytes),'sha256':function['originalPEBodySha256']}]
  function['instructionCount']=len(rows);function['instructionBytes']=len(source_bytes)
  function['allInstructionBytesMatchOriginalPE']=True
  key=name+':'+function['entry'];instructions[key]=rows
  destination=OUT/'sources'/name/(function['entry']+'.asm-only.txt');destination.parent.mkdir(parents=True,exist_ok=True)
  destination.write_text('; Original PE manually recovered ASM-only function; no study C/ASM function entry\n'+''.join(row['address']+' | '+row['bytes']+' | '+row['assembly']+'\n' for row in rows),encoding='utf8',newline='\n')
  function['assemblyExcerpt']=destination.relative_to(OUT).as_posix();function['assemblyExcerptSha256']=sha(destination)
 expected={OUT/function[key] for function in functions for key in ['cExcerpt','assemblyExcerpt']}
 expected.update(OUT/function['assemblyExcerpt'] for function in manual)
 for path in (OUT/'sources').rglob('*'):
  if path.is_file() and path.suffix=='.txt' and path not in expected:path.unlink()
 lookup={row['address']:row for rows in instructions.values() for row in rows}
 for stage in program['programs']:
  for operation in stage['operations']:
   name=operation.get('module',stage['module']);address=int(operation['sourceVA'],16);key=f'{address:08x}'
   if key not in lookup:raise ValueError('Curated constructor source instruction absent '+key)
   operation['sourceInstruction']=lookup[key]
 audit_program_sources(program['sourcePrograms'],pes,lookup)
 audit_zero_fill(pes['Engine'],program['enumGlobalZeroFillProof'])
 for proof in program['literalProofs']:
  raw=pes[proof['module']].at(int(proof['address'],16),len(bytes.fromhex(proof['bytes'])))
  if raw.hex()!=proof['bytes']:raise ValueError('Original literal proof differs: '+proof['meaning'])
 for field in leaf:
  rows=instructions['Engine:'+field['entry']]
  if any(field[key] not in rows for key in ['descriptorStore','offsetStore','defaultStore']):raise ValueError('Original descriptor schema proof differs')
  if pes['Engine'].cstring(int(field['nameLiteral']['address'],16)).decode('cp1252')!=field['name']:raise ValueError('Original descriptor literal differs')
 base=program['baseField']
 if base['name']!='PhysicsEnabled' or base['nativeOffset']!=20 or base['typeName']!='bool':raise ValueError('Inherited field identity differs')
 order=program['fieldRegistrarOrder']
 if order['entries']!=[field['entry'] for field in leaf] or order['entries']!=[field['registrar'] for field in program['fields']]:
  raise ValueError('Original CRT field registrar order differs')
 if pes['Engine'].at(int(order['sourceVA'],16),len(bytes.fromhex(order['bytes']))).hex()!=order['bytes']:
  raise ValueError('Original CRT field registrar pointer array differs')
 inherited=program['inheritedMetadata']['descriptor']
 if (inherited['propertyObjectVA'],inherited['descriptorVtable'],inherited['nativeOffset'],inherited['parentMetadataObjectVA'])!=('0x30aec2b0','0x308609d4',20,'0x30aec214'):
  raise ValueError('Inherited PhysicsEnabled descriptor identity differs')
 if pes['Engine'].cstring(int(inherited['nameVA'],16)).decode('ascii')!=base['name']:raise ValueError('Inherited property literal differs')
 save_json(program_path,program)
 serialized_path=ROOT/'public/gothic3/entity-reflection/serialized-candidates.json'
 serialized=json.loads(serialized_path.read_text(encoding='utf8'));hero=next(entity for entity in serialized['entities'] if entity['name']=='PC_Hero')
 ps=hero['propertySets'][1]
 if (ps['className'],ps['outerVersion'],ps['nativeReadVersion'],ps['objectVersion'],ps['propertyVersion'],len(ps['properties']))!=('eCRigidBody_PS',65,65,83,30,14):raise ValueError('Original Hero RigidBody profile differs')
 original=study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
 if sha(original)!=WORLD_SHA:raise ValueError('Original Hero world file differs')
 raw=original.read_bytes();packet=raw[ps['sourceOffset']:ps['endSourceOffset']+4]
 if packet.hex()!=ps['serializedRaw'] or hashlib.sha256(packet).hexdigest()!=ps['serializedSha256']:raise ValueError('Original Hero packet bytes differ')
 by_name={field['name']:field for field in leaf};by_name[base['name']]=base
 normalized=[]
 for prop in ps['properties']:
  value_bytes=raw[prop['sourceOffset']:prop['sourceOffset']+prop['byteLength']]
  if value_bytes.hex()!=prop['raw']:raise ValueError('Original source property bytes differ')
  field=by_name[prop['name']];kind=prop['type']
  if kind=='float':value=struct.unpack('<f',value_bytes)[0]
  elif kind=='bCVector':value=list(struct.unpack('<3f',value_bytes))
  elif kind=='bool':value=bool(value_bytes[0])
  elif kind=='bTPropertyContainer<enum eERigidbody_Flag>':value={'version':struct.unpack('<H',value_bytes[:2])[0],'value':struct.unpack('<I',value_bytes[2:])[0]}
  else:raise ValueError('Unsupported serialized property type')
  normalized.append({'name':prop['name'],'nativeOffset':field['nativeOffset'],'typeName':kind,'raw':value_bytes.hex(),'value':value,'sourceOffset':prop['sourceOffset']})
 source={'archive':'Projects_compiled.p00','path':WORLD_PATH,'sha256':WORLD_SHA,'packetOffset':ps['sourceOffset'],'packetBytes':len(packet),'packetSha256':ps['serializedSha256']}
 rules={'schema':'gothic3-rigidbody-reading-rules-v1','inputs':{name:value['sha256'] for name,value in inputs.items()},
  'propertyType':13,'getVersion':65,'baseGetVersion':2,'nativeBytes':248,'nativeVtable':program['nativeVtable'],'wrapperVtable':program['wrapperVtable'],
  'baseField':base,'fields':program['fields'],'programs':program['programs'],'sourceHero':{'index':1,**source},
  'readThresholds':{'flags80and82':40,'flag83':41,'vectors84and90':51,'posesB8and9c':55,'flag81':65},
  'scope':'Same physical original RigidBody scalar/pointer store and movement facade; detached construction/Read is not world residency or physics activation',
  'unresolved':program['unresolved']}
 save_json(OUT/'runtime-rules.json',rules);save_json(PUBLIC/'runtime-rules.json',rules)
 evidence={'schema':'gothic3-rigidbody-reading-native-evidence-v1','nativeCodeExecuted':False,'testsRun':False,
  'inputs':inputs,'functions':functions,'asmOnlyFunctions':manual,'instructions':instructions,'vtables':vtables,
  'leafDescriptors':leaf,'inheritedDescriptor':base,'sourcePacket':source,
  'constructionProgram':{'path':'construction-program.json','bytes':program_path.stat().st_size,'sha256':sha(program_path)},
  'literalProofs':program['literalProofs'],'scope':'Original PE/source packet offline audit; ASM-only evidence remains distinct from study decompiled C'}
 evidence['coldEnumGlobal']=program['enumGlobalZeroFillProof']
 evidence['inheritedMetadata']=program.get('inheritedMetadata')
 evidence['bodyFlagTypeCompatibility']=program['bodyFlagTypeCompatibility']
 save_json(OUT/'native-evidence.json',evidence)
 hero_doc={'schema':'gothic3-original-hero-rigidbody-v1','worldResident':False,'source':source,'properties':normalized,
  'tailRaw':ps['tailRaw'],'nativeReadOffset':ps['nativeReadOffset'],'outerVersion':65,'nativeReadVersion':65}
 save_json(OUT/'hero-rigidbody.json',hero_doc);save_json(PUBLIC/'hero-rigidbody.json',hero_doc)
 manifest={'schema':'gothic3-rigidbody-reading-manifest-v1','outputs':[{'path':p.name,'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(PUBLIC.glob('*.json'))]}
 save_json(OUT/'manifest.json',manifest)
 if not args.capture_only:
  files=[ROOT/'src/gothic3/rigidbody-reading.ts',Path(__file__).resolve()]
  files += [ROOT/'src/gothic3'/name for name in ['movement-state.ts','entity-reflection.ts','entity-lifecycle.ts','entity-reading.ts','native-properties.ts']]
  files += [ROOT/'tools/gothic3'/name for name in ['research_native_combat.py','research_native_clock.py','research_native_inventory.py',
   'research_entity_reflection.py','research_entity_lifecycle.py','read_gameplay_properties.py',
   'export_world_index.py','read_gameplay_ini.py','read_genome.py','read_xcmsh.py','read_xshmat.py']]
  files += [schema_path,serialized_path]
  files += sorted(p for folder in [OUT,PUBLIC] for p in folder.rglob('*') if p.is_file() and p.name!='implementation-receipt.json')
  save_json(OUT/'implementation-receipt.json',{'schema':'gothic3-rigidbody-reading-implementation-receipt-v1','nativeCodeExecuted':False,'testsRun':False,
   'scope':'Current concrete RigidBody implementation/dependency/source/output pins; earlier checkpoints remain historical',
   'files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in files]})
 print(json.dumps({'functions':len(functions),'asmOnlyFunctions':len(manual),'instructions':sum(len(rows) for rows in instructions.values()),
  'instructionBytes':sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows),'captureOnly':args.capture_only,
  'receiptSha256':None if args.capture_only else sha(OUT/'implementation-receipt.json')}))

if __name__=='__main__':main()
