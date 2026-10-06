"""Recover original Hero CharacterSensor construction/read offline; no native execution."""
from __future__ import annotations
import argparse,csv,hashlib,json,re,shutil,struct,sys
from pathlib import Path
from research_native_combat import PE,save_json,sha
from research_native_clock import collect
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import INPUTS,SELECT as REFLECTION_SELECT,pin_vtable,WORLD_PATH,WORLD_SHA

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/gothic3/sensor-reading';PUBLIC=ROOT/'public/gothic3/sensor-reading'
SELECT={'Game':set('2003162e 20007a31 2000ea0c 2001367e 20015681 2001b383 2002c6a6 2001f019 20014b28 20023330 20005f1a 20012418 200239e3 20238b80 20501a40 2001c715 20006659 20015cf3 20023506'.split()),
 'Engine':set('300025bd 3003b5bb 3001a091 3002ad10 30037ca4'.split()),
 'SharedBase':set(REFLECTION_SELECT['SharedBase'])|set('10005ae7 10002833 100062ee 100076f8 100079fa'.split())}

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--study',type=Path,required=True);ap.add_argument('--capture-only',action='store_true');args=ap.parse_args();study=args.study.resolve()
 OUT.mkdir(parents=True,exist_ok=True);PUBLIC.mkdir(parents=True,exist_ok=True)
 pes={};inputs={};rows={};selectors={k:set(v) for k,v in SELECT.items()}
 for short,(directory,filename,expected) in INPUTS.items():
  path=study/'00_Original_Runtime'/filename
  if sha(path)!=expected:raise ValueError('Original PE hash differs '+short)
  pes[short]=PE(path);inputs[short]={'path':'00_Original_Runtime/'+filename,'bytes':path.stat().st_size,'sha256':expected}
  rows[short]={r['address']:r for r in csv.DictReader((study/'01_Decompiled_Code'/directory/'functions.csv').open(encoding='utf-8-sig',newline=''))}
 functions={};instructions={}
 def capture(short,entries):
  entries=set(entries);pending=list(entries);pe=pes[short]
  while pending:
   entry=pending.pop();raw=pe.at(int(entry,16),5)
   if raw[0]!=0xe9:continue
   target=f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}'
   if target not in rows[short]:raise ValueError('Full thunk source boundary missing '+short+':'+target)
   if target not in entries:entries.add(target);pending.append(target)
  entries-={k.split(':')[1] for k in instructions if k.startswith(short+':')}
  if not entries:return
  bodies,records=collect(study,short,INPUTS[short][0],' '.join(sorted(entries)),pe,OUT)
  for body in bodies:functions[body['id']]=body
  instructions.update(records)
 for short in INPUTS:capture(short,selectors[short])
 maps={k:exports(v) for k,v in pes.items()};imports={k:native_imports(v) for k,v in pes.items()}
 def ctor_table(entry):
  matches=[int(m[1],16) for row in instructions['Game:'+entry] for m in [re.fullmatch(r'MOV dword ptr \[ESI\],0x([0-9a-f]+)',row['assembly'])] if m]
  if len(matches)!=1:raise ValueError('Exact constructor native vtable missing')
  return matches[0]
 native=ctor_table('20237a40')
 wrapper_stores=[int(m[1],16) for row in instructions['Game:20501a40'] for m in [re.fullmatch(r'MOV dword ptr \[0x[0-9a-f]+\],0x(206[0-9a-f]+)',row['assembly'])] if m]
 if len(wrapper_stores)!=1:raise ValueError('Exact Sensor root wrapper vtable missing')
 tables={'sensorNative':pin_vtable(pes['Game'],imports['Game'],maps,native,0x150),'sensorWrapper':pin_vtable(pes['Game'],imports['Game'],maps,wrapper_stores[0],0x44)}
 needed={k:set() for k in INPUTS}
 # Pin all dispatch slots; capture only relevant called native/lifecycle slots.
 native_slots={0x00,0x04,0x10,0x18,0x20,0x3c,0x40,0x4c,0x50,0x58,0x5c,0x60,0x68,0x84,0x12c,0x138,0x13c}
 for label,table in tables.items():
  for item in table['entries']:
   if label=='sensorNative' and item['offset'] not in native_slots:continue
   if item.get('implementation'):module,entry=item['implementation'].split(':');needed[module].add(entry)
   elif item['target']!='00000000':needed['Game'].add(item['target'])
 for short in INPUTS:capture(short,needed[short])
 bindings=[];needed={k:set() for k in INPUTS}
 for key in ['Game:20237a40','Game:20236e30','Game:20236df0','Game:20236e00','Game:20238b80','Game:202396e0','Game:20236ca0']:
  if key not in instructions:raise ValueError('Called native body missing '+key)
  for row in instructions[key]:
   m=re.search(r'(?:CALL\s+|MOV E[A-Z]+,\s*)dword ptr \[0x([0-9a-f]+)\]',row['assembly'])
   if not m:continue
   imp=imports['Game'].get(int(m[1],16))
   if not imp:continue
   module=imp['library'].removesuffix('.dll');binding={'function':key,'instruction':row,'importSlot':m[1],'import':imp}
   if module in maps:
    entry=f"{maps[module][imp['decoratedName']]:08x}";binding['implementation']=module+':'+entry;needed[module].add(entry)
   else:binding['status']='external native service boundary; never executed'
   bindings.append(binding)
 for short in INPUTS:capture(short,needed[short])
 constant_address=0x100e71bc;constant=pes['SharedBase'].at(constant_address,4)
 if constant!=bytes.fromhex('0000803f'):raise ValueError('Original Quaternion.Clear W constant differs')
 if not any(r['assembly']=='MOVSS XMM0,dword ptr [0x100e71bc]' for r in instructions['SharedBase:10025dc0']):raise ValueError('Quaternion.Clear no longer reads exact W literal')
 literals=[{'module':'SharedBase','address':f'{constant_address:08x}','bytes':constant.hex(),'sha256':hashlib.sha256(constant).hexdigest(),'float32':struct.unpack('<f',constant)[0],'consumer':'SharedBase:10025dc0'}]
 schema_path=ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json'
 schema=json.loads(schema_path.read_text(encoding='utf-8'));fields=[f for f in schema['nativePropertyRegistrars'] if f['className']=='gCCharacterSensor_PS']
 if fields:raise ValueError('Sensor current descriptor table no longer empty')
 # Independent original full source registry scan, not inference from packet count.
 matched=[]
 for path in sorted((study/'01_Decompiled_Code'/INPUTS['Game'][0]/'pseudocode').glob('*.c')):
  text=path.read_text(encoding='utf-8')
  if re.search(r'&gCCharacterSensor_PS::ms_PropertyMember_',text):matched.append(path.name)
 if matched:raise ValueError('Unexpected native Sensor property registration '+str(matched))
 candidate_path=ROOT/'assets/gothic3/entity-reflection/serialized-candidates.json'
 candidates=json.loads(candidate_path.read_text(encoding='utf-8'));hero=next(e for e in candidates['entities'] if e['name']=='PC_Hero')['propertySets'][5]
 original=study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
 if sha(original)!=WORLD_SHA:raise ValueError('Original SysDyn differs')
 data=original.read_bytes();raw=data[hero['sourceOffset']:hero['endSourceOffset']+4]
 if hero['className']!='gCCharacterSensor_PS' or hero['nativeReadVersion']!=2 or hero['properties'] or raw.hex()!=hero['serializedRaw'] or hashlib.sha256(raw).hexdigest()!=hero['serializedSha256']:raise ValueError('Original Hero Sensor packet differs')
 tail=data[hero['nativeReadOffset']:hero['endSourceOffset']]
 if len(tail)!=70 or tail[2:].hex()!=hero['tailRaw']:raise ValueError('Original Sensor native payload differs')
 audit={'selectedNativeBodies':len(functions),'instructions':sum(map(len,instructions.values())),'instructionBytes':sum(len(bytes.fromhex(r['bytes'])) for body in instructions.values() for r in body),'allSelectedInstructionBytesMatchOriginalPE':True}
 evidence={'schema':'gothic3-sensor-reading-evidence-v1','inputs':inputs,'nativeCodeExecuted':False,'functions':[functions[k] for k in sorted(functions)],'instructions':instructions,'vtables':tables,'importedSubcalls':bindings,'literals':literals,'audit':audit,'propertyRegistryAudit':{'className':'gCCharacterSensor_PS','currentFieldCount':0,'nativeSchemaSha256':sha(schema_path),'independentAllGameSourceMemberRegistrarScanEmpty':True},'originalHero':{'className':hero['className'],'index':5,'sourceOffset':hero['sourceOffset'],'endSourceOffset':hero['endSourceOffset'],'serializedBytes':len(raw),'serializedSha256':hero['serializedSha256'],'nativeTailBytes':len(tail),'allFocusedSerializedBytesMatchOriginal':True,'sourcePath':WORLD_PATH,'sourceSha256':WORLD_SHA}}
 rules={'schema':'gothic3-sensor-reading-rules-v1','inputs':{k:v[2] for k,v in INPUTS.items()},'className':'gCCharacterSensor_PS','propertyType':23,'getVersion':2,'nativeBytes':96,'nativeVtable':f'{native:08x}','wrapperVtable':tables['sensorWrapper']['address'],'fields':[],'heroSerialized':hero,'nativeTailRaw':tail.hex(),'profile':{'allocation':'fresh successful TypeScript/native-capability allocation; physical numeric heap pointers remain masked','derivedRead':'version<=1 consumes only itsu16; version>=2 reads3 vectors12,4 boolbytes,raw28 bytes; no inherited base read','unresolved':['full collision/sensor Process body','terminal destruction/memory services','world/spatial registration and preceding Hero property-set factories'],'worldResident':False}}
 readme='''# Original CharacterSensor reading

OriginalSensorReader(controller, host?) registers the concrete gCCharacterSensor_PS factory (type23, GetVersion2). Its fresh successful construction executes source RefBase/EntityPS initialization, embedded no-data vector/quaternion constructors, derived defaults, inherited Create, actual wrapper Attach/reference handoff, empty reflective defaults and PostInitialize. The factory preserves original wrapper/property header consumption, creator/iterator/reference order and required ErrorAdmin panic callback. No obsolete field reader is invented.

The original PC_Hero packet5 occupies relative [2514,2615), 101 bytes including its sentinel. It has zero reflective properties and a 70-byte native tail: versionu16, three raw12-byte vectors, four canonical bool bytes and one raw28-byte stream read at native+44 (goal position12 plus quaternion16). Current version>=2 performs that exact sequence; versions0/1 consume onlyu16. Native+3c movement is not serialized. Raw vector/quaternion reads preserve IEEE payload bits. Constructor/Invalidate clear vectors, set flags41/38/39=1 and40=0, and Quaternion.Clear sets XYZ=0/W=1 from the pinned original float32 literal. Padding and other uninitialized constructor bits stay masked.

properties(wrapper) returns the retained OriginalSensorProperties, whose base is the exact NativeLivePropertySet used by entity lifecycle; base.values is that same physical object. The NativeMovementSensor facade shares vector/quaternion/flag bytes and the same nonowning movement capability. A nonNULL movement pointer remains a known object while its numeric heap-address bits stay masked. SetGoalPosition and Invalidate preserve the source store order; the public postProcessByte setter supports the actual PostProcessMovements clear-to0. Mutable vector setter inputs use an explicit finite float32 profile; raw serialized reads retain all IEEE bits. The native wrapper+4, reference word+8, owner+0c and base flag+10 views share this physical storage.

OnAdded, OnRemoved and OnPostRead dispatch to the pinned inherited RET bodies. IsProcessable returns the inherited literal false. Sensor.process requires the real ProcessPlayerMovements body through a host capability; collision/control/navigation/application/world services inside that body are unresolved. Terminal wrapper/native destruction and allocation failure, full legacy reflective migration, prior Hero factories and spatial/world registration remain explicit dependencies. Empty inherited callbacks do not imply those services exist. Mutation and factory/read reentry stop with retained attempted/applied prefixes. Constructed/read objects are detached and do not become resident.

The producer independently audits every selected instruction against immutable original PE bytes, closes initial JMP thunks transitively, pins native/wrapper vtable dispatch and Quaternion.Clear's W literal, verifies the empty current Sensor member registry from original source, and compares the focused original Hero bytes. The implementation receipt pins current source/helpers and all namespace outputs, excluding the receipt itself. It records offline audits only; the producer runs no native code, tests, build, browser, remotes or Actions.
'''
 (OUT/'README.md').write_text(readme,encoding='utf-8',newline='\n');(PUBLIC/'README.md').write_text(readme,encoding='utf-8',newline='\n')
 for name,value in [('native-evidence.json',evidence),('runtime-rules.json',rules)]:save_json(OUT/name,value);save_json(PUBLIC/name,value)
 expected_sources={Path(f[x]) for f in functions.values() for x in ('cExcerpt','assemblyExcerpt')}
 for base in (OUT,PUBLIC):
  for p in (base/'sources').rglob('*'):
   if p.is_file() and p.relative_to(base) not in expected_sources:
    if not p.resolve().is_relative_to(base.resolve()):raise ValueError('Source cleanup escapes owned namespace')
    p.unlink()
 for relative in sorted(expected_sources):
  destination=PUBLIC/relative;destination.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(OUT/relative,destination)
 if not args.capture_only:
  imported=[Path(m.__file__).resolve() for m in list(sys.modules.values()) if getattr(m,'__file__',None) and Path(m.__file__).resolve().parent==ROOT/'tools/gothic3' and Path(m.__file__).suffix=='.py']
  deps=[ROOT/'src/gothic3/sensor-reading.ts',ROOT/'src/gothic3/entity-reflection.ts',ROOT/'src/gothic3/entity-lifecycle.ts',ROOT/'src/gothic3/entity-reading.ts',ROOT/'src/gothic3/movement-state.ts',schema_path,candidate_path,Path(__file__).resolve(),*imported]
  for p in deps:
   if not p.is_file():raise ValueError('Required source dependency missing '+str(p))
  owned=[p for base in (OUT,PUBLIC) for p in base.rglob('*') if p.is_file() and p.name!='implementation-receipt.json']
  receipt={'schema':'gothic3-sensor-reading-implementation-receipt-v1','baseline':'cce28354472f8716a65edc8e855003ee74830f6f','checksActuallyPerformed':['offline original PE instruction-byte audit','offline original Hero packet/derived-tail byte audit','offline current source/output hash audit'],'noNativeCodeExecution':True,'noTestsOrBuildRunByProducer':True,'audit':audit,'files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(set(deps+owned))]}
  save_json(OUT/'implementation-receipt.json',receipt);save_json(PUBLIC/'implementation-receipt.json',receipt)
 print(json.dumps({'audit':audit,'nativeVtable':rules['nativeVtable'],'wrapperVtable':rules['wrapperVtable'],'receiptSha256':None if args.capture_only else sha(OUT/'implementation-receipt.json')}))

if __name__=='__main__':main()
