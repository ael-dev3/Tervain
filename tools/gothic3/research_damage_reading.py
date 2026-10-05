"""Recover original Damage/DamageReceiver factories and Hero reads offline."""
from __future__ import annotations
import argparse,csv,hashlib,json,re,shutil,struct,sys
from pathlib import Path
from research_native_combat import PE,save_json,sha
from bounded_native_capture import collect
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import INPUTS,SELECT as REFLECTION_SELECT,pin_vtable,WORLD_PATH,WORLD_SHA
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/gothic3/damage-reading';PUBLIC=ROOT/'public/gothic3/damage-reading'
CLASSES={
 'gCDamage_PS':{'heroIndex':10,'type':51,'version':76,'nativeBytes':44,'nativeVtable':'2065ec34','constructor':'200b3670','create':'200b3540','invalidate':'200b3520','postInitialize':'200b35f0','nativeRead':'200b3580','root':'204b73d0','clone':'200b85f0','initialize':'200b5840','defaults':'200b80c0','wrapperRead':'200b4bc0','dataRead':'200b8ec0','enumOffset':20},
 'gCDamageReceiver_PS':{'heroIndex':11,'type':52,'version':33,'nativeBytes':84,'nativeVtable':'2065f3e4','constructor':'200b9fc0','create':'200b9e40','invalidate':'200b9e20','postInitialize':'200b9e60','nativeRead':'200b9ea0','root':'204b7ef0','clone':'200bdad0','initialize':'200bba10','defaults':'200bd7b0','wrapperRead':'200bb0c0','dataRead':'200bdf10','enumOffset':44}}
SELECT={'Game':set('2000f312 20030fc1 200074af 20029492 20016a68 2002caa2 2000d90e 2002e474 200173b4 2000bd70 200147f9 200024cd 20020f9a 2001db24 2002a946 2001b62b 20028f42 20016851 200361c9 20004e08 200243ed 20018cb9 20023899'.split())|{v[k]for v in CLASSES.values()for k in ['root','clone','initialize','defaults','wrapperRead','dataRead']},
 'Engine':set('300025bd 3003b5bb 3001a091 3002ad10 30037ca4 3003544f 3001d7b9 3000247d 30017e77 3000392c'.split()),
 'SharedBase':set(REFLECTION_SELECT['SharedBase'])|set('10007c11 10003a71 10008233 100059ed 1000873d 10001f05'.split())}
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--study',type=Path,required=True);ap.add_argument('--capture-only',action='store_true');args=ap.parse_args();study=args.study.resolve()
 OUT.mkdir(parents=True,exist_ok=True);PUBLIC.mkdir(parents=True,exist_ok=True)
 pes={};inputs={};rows={}
 for module,(directory,filename,expected) in INPUTS.items():
  path=study/'00_Original_Runtime'/filename
  if sha(path)!=expected:raise ValueError('Original PE hash differs '+module)
  pes[module]=PE(path);inputs[module]={'path':'00_Original_Runtime/'+filename,'bytes':path.stat().st_size,'sha256':expected}
  rows[module]={r['address']:r for r in csv.DictReader((study/'01_Decompiled_Code'/directory/'functions.csv').open(encoding='utf-8-sig',newline=''))}
 functions={};instructions={}
 def capture(module,entries):
  entries=set(entries);pending=list(entries);pe=pes[module]
  while pending:
   entry=pending.pop();raw=pe.at(int(entry,16),5)
   if raw[0]!=0xe9:continue
   target=f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}'
   if target not in rows[module]:raise ValueError('Full thunk source missing '+module+':'+target)
   if target not in entries:entries.add(target);pending.append(target)
  entries-={k.split(':')[1]for k in instructions if k.startswith(module+':')}
  if not entries:return
  bodies,records=collect(study,module,INPUTS[module][0],' '.join(sorted(entries)),pe,OUT)
  for body in bodies:functions[body['id']]=body
  instructions.update(records)
 for module in INPUTS:capture(module,SELECT[module])
 capture('Game',{'20462864'})
 maps={k:exports(v)for k,v in pes.items()};imports={k:native_imports(v)for k,v in pes.items()}
 schema_path=ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json';schema=json.loads(schema_path.read_text(encoding='utf-8'))
 tables={'embeddedEntityProxy':pin_vtable(pes['Engine'],imports['Engine'],maps,0x3087bff4,0x14)};profiles={};needed={k:set()for k in INPUTS};import_sources=set();registrar_order=[]
 def slot(table,offset,module='Game'):
  entry=next(e for e in table['entries']if e['offset']==offset);target=entry.get('implementation',module+':'+entry['target']);short,address=target.split(':');needed[short].add(address);return target
 for name,profile in CLASSES.items():
  fields=sorted((f for f in schema['nativePropertyRegistrars']if f['className']==name),key=lambda f:f['entry'])
  if len(fields)!=(5 if name=='gCDamage_PS'else 9):raise ValueError('Native Damage field count differs')
  sequence=b''.join(struct.pack('<I',int(f['entry'],16))for f in fields);game_raw=pes['Game'].data;at=game_raw.find(sequence)
  if at<0 or game_raw.find(sequence,at+1)>=0:raise ValueError('Unique complete Damage CRT registration sequence missing '+name)
  registrar_order.append({'className':name,'module':'Game','fileOffset':at,'bytes':sequence.hex(),'sha256':hashlib.sha256(sequence).hexdigest(),'entries':[f['entry']for f in fields]})
  capture('Game',{f['entry']for f in fields})
  root_stores=[int(m[1],16)for r in instructions['Game:'+profile['root']]for m in [re.fullmatch(r'MOV dword ptr \[0x[0-9a-f]+\],0x(206[0-9a-f]+)',r['assembly'])]if m]
  if len(root_stores)!=1:raise ValueError('Actual Damage wrapper vtable missing')
  table=tables[name+':native']=pin_vtable(pes['Game'],imports['Game'],maps,int(profile['nativeVtable'],16),0x150)
  wrapper=tables[name+':wrapper']=pin_vtable(pes['Game'],imports['Game'],maps,root_stores[0],0x44)
  dispatch={str(off):slot(table,off)for off in [0,4,0x10,0x18,0x3c,0x40,0x4c,0x50,0x58,0x5c,0x60,0x68,0x84,0x120,0x124,0x128,0x12c,0x138,0x13c]}
  for off in [0,4,8,0x14,0x1c,0x28,0x30,0x34,0x38]:slot(wrapper,off)
  ctor=instructions['Game:'+profile['constructor']]
  enum_stores=[m[1]for r in ctor for m in [re.search(r'MOV dword ptr \[ESI \+ 0x(?:14|2c)\],0x([0-9a-f]+)',r['assembly'])]if m]
  # Register selection differs in tiny constructors; accept the unique concrete
  # gEDamageType vtable store, independently verified against both bodies.
  if not enum_stores:
   enum_stores=[m[1]for r in ctor for m in [re.fullmatch(r'MOV dword ptr \[EDI\],0x([0-9a-f]+)',r['assembly'])]if m]
  if len(enum_stores)!=1:raise ValueError('DamageType container vtable missing '+name)
  enum_vtable=enum_stores[0];enum_table=tables.setdefault('enum:'+enum_vtable,pin_vtable(pes['Game'],imports['Game'],maps,int(enum_vtable,16),0x3c))
  enum_dispatch={str(off):slot(enum_table,off)for off in [0x10,0x18,0x1c,0x38]}
  runtime_fields=[]
  for field in fields:
   for store in [field['descriptorStore'],field['offsetStore'],field['defaultStore']]:
    raw=bytes.fromhex(store['bytes'])
    if pes['Game'].at(int(store['address'],16),len(raw))!=raw:raise ValueError('Original descriptor store differs')
   literal=field['nameLiteral'];raw=bytes.fromhex(literal['bytes'])
   if pes['Game'].at(int(literal['address'],16),len(raw))!=raw:raise ValueError('Original descriptor name differs')
   descriptor=tables.setdefault('descriptor:'+field['vtable'],pin_vtable(pes['Game'],imports['Game'],maps,int(field['vtable'],16),0x68))
   runtime_fields.append({'name':field['name'],'typeName':field['cppType'],'nativeOffset':field['nativeOffset'],'registrar':'Game:'+field['entry'],'reader':slot(descriptor,0x38),'defaultInitializer':slot(descriptor,0x14),'descriptorRead':slot(descriptor,0),'memberAccessor':slot(descriptor,0x64)})
  profiles[name]={**profile,'wrapperVtable':f'{root_stores[0]:08x}','enumVtable':enum_vtable,'enumGlobal':'207b62a4','enumDispatch':enum_dispatch,'dispatch':dispatch,'fields':runtime_fields}
  import_sources|={'Game:'+profile[k]for k in ['constructor','create','postInitialize','initialize','defaults','nativeRead','dataRead','wrapperRead']}
  import_sources|={f['reader']for f in runtime_fields}|{f['defaultInitializer']for f in runtime_fields}|set(enum_dispatch.values())
 for module in INPUTS:capture(module,needed[module])
 slot(tables['embeddedEntityProxy'],0x0c,'Engine')
 for module in INPUTS:capture(module,needed[module])
 # Concrete source initializer Attach call is a direct thunk; preserve the
 # exact callee as well as its wrapper/native lifetime stores.
 for name,profile in profiles.items():
  text=(OUT/functions['Game:'+profile['initialize']]['cExcerpt']).read_text(encoding='utf-8')
  calls=re.findall(r'thunk_FUN_([0-9a-f]{8})\(this_[0-9]+\)',text)
  if len(calls)!=1:raise ValueError('Exact fresh Attach callee missing '+name)
  profile['attach']=calls[0];capture('Game',{calls[0]});import_sources.add('Game:'+calls[0])
 # Include nested proxy/base constructors and the precise notification bodies.
 import_sources|={'Engine:304c45a0','Engine:304c4350','Engine:304c43a0','Engine:304c4410','Engine:30481a60','Engine:304814e0','Engine:3003b5bb','Engine:3001a091','Engine:3002ad10','Engine:30037ca4','Game:20462864'}
 for module in INPUTS:capture(module,{k.split(':')[1]for k in import_sources if k.startswith(module+':')})
 expanded=set(import_sources)
 for key in list(import_sources):
  module,entry=key.split(':');raw=pes[module].at(int(entry,16),5)
  while raw[0]==0xe9:
   entry=f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}';expanded.add(module+':'+entry);raw=pes[module].at(int(entry,16),5)
 bindings=[];needed={k:set()for k in INPUTS}
 for key in sorted(expanded):
  module=key.split(':')[0]
  for row in instructions[key]:
   m=re.search(r'(?:CALL\s+|JMP\s+|MOV E[A-Z]+,\s*)dword ptr \[0x([0-9a-f]+)\]',row['assembly'])
   if not m:continue
   imp=imports[module].get(int(m[1],16))
   if not imp:continue
   short=imp['library'].removesuffix('.dll');binding={'function':key,'instruction':row,'importSlot':m[1],'import':imp}
   if short in maps:entry=f"{maps[short][imp['decoratedName']]:08x}";binding['implementation']=short+':'+entry;needed[short].add(entry)
   else:binding['status']='external service; never executed'
   bindings.append(binding)
 for module in INPUTS:capture(module,needed[module])
 # All scalar public setters use the same physical stores and source Notify
 # chain, and are useful to the later combat adapter rather than a projection.
 public_setters=[]
 def final_entry(module,address):
  while True:
   raw=pes[module].at(address,5)
   if raw[0]!=0xe9:return f'{address:08x}'
   address=address+5+struct.unpack_from('<i',raw,1)[0]
 for profile in profiles.values():profile['setters']={}
 for name,address in maps['Game'].items():
  if name.startswith('?Set')and any('@'+class_name+'@@'in name for class_name in CLASSES):
   class_name=next(c for c in CLASSES if '@'+c+'@@'in name);property_name=name.split('@')[0].removeprefix('?Set');body=final_entry('Game',address)
   public_setters.append({'symbol':name,'className':class_name,'property':property_name,'entry':f'{address:08x}','implementation':'Game:'+body});capture('Game',{f'{address:08x}'})
   profiles[class_name]['setters'][property_name]='Game:'+body
 # The actual enum base ctor/dtor write these concrete vtable addresses;
 # PostInitialize copies the file-backed float literal, not an inferred1.
 literal=pes['Game'].at(0x2065b1c4,4)
 if literal!=bytes.fromhex('0000803f'):raise ValueError('Damage PostInitialize float1 literal differs')
 consumer=next(r for r in instructions['Game:200b35f0']if r['address']=='200b363f')
 if consumer['assembly']!='MOVSS XMM0,dword ptr [0x2065b1c4]':raise ValueError('Damage PostInitialize float consumer differs')
 literals=[{'module':'Game','address':'2065b1c4','bytes':literal.hex(),'value':struct.unpack('<f',literal)[0],'consumer':consumer}]
 # The mutable default resides in original virtual zero-fill. That cold
 # fact never certifies its live value after native registration/writes.
 address=0x207b62a4;pe=pes['Game'];global_uses=[]
 for profile in profiles.values():
  uses=[r for r in instructions['Game:'+profile['constructor']]if '0x207b62a4'in r['assembly']]
  if len(uses)!=1:raise ValueError('Damage ctor mutable enum reference differs')
  global_uses.extend({'function':'Game:'+profile['constructor'],'instruction':r}for r in uses)
 try:cold={'coldPEBytes':pe.at(address,4).hex()}
 except ValueError:
  header=struct.unpack_from('<I',pe.data,0x3c)[0];optional_size=struct.unpack_from('<H',pe.data,header+20)[0];section_count=struct.unpack_from('<H',pe.data,header+6)[0];rva=address-pe.base;proof=None
  for index in range(section_count):
   at=header+24+optional_size+index*40;virtual_size,section_rva,raw_size,raw_offset=struct.unpack_from('<IIII',pe.data,at+8)
   if section_rva+raw_size<=rva and rva+4<=section_rva+virtual_size:
    proof={'headerFileOffset':at,'headerBytes':pe.data[at:at+40].hex(),'virtualSize':virtual_size,'rva':section_rva,'rawSize':raw_size,'rawOffset':raw_offset};break
  if proof is None:raise ValueError('Damage enum is neither initialized nor proved virtual zero-fill')
  cold={'coldPEBytes':None,'storage':'PE virtual zero-fill; not a file-backed initialized DWORD','sectionProof':proof}
 globals_proof=[{'address':'207b62a4',**cold,'liveValueKnown':False,'consumers':global_uses}]
 candidate_path=ROOT/'assets/gothic3/entity-reflection/serialized-candidates.json';candidates=json.loads(candidate_path.read_text(encoding='utf-8'));hero=next(e for e in candidates['entities']if e['name']=='PC_Hero')
 original=study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
 if sha(original)!=WORLD_SHA:raise ValueError('Original SysDyn differs')
 data=original.read_bytes();source_hero=[]
 for name,profile in profiles.items():
  packet=hero['propertySets'][profile['heroIndex']];raw=data[packet['sourceOffset']:packet['endSourceOffset']+4];tail=data[packet['nativeReadOffset']:packet['endSourceOffset']]
  if packet['className']!=name or packet['nativeReadVersion']!=profile['version'] or raw.hex()!=packet['serializedRaw']or hashlib.sha256(raw).hexdigest()!=packet['serializedSha256']or tail!=struct.pack('<H',profile['version']):raise ValueError('Original Damage Hero packet differs')
  if {f['name']for f in profile['fields']}!={f['name']for f in packet['properties']}:raise ValueError('Damage source/schema membership differs')
  profile['heroSerialized']=packet;source_hero.append({'className':name,'heroIndex':profile['heroIndex'],'serializedBytes':len(raw),'serializedSha256':packet['serializedSha256'],'nativeTailBytes':len(tail),'sourcePath':WORLD_PATH,'sourceSha256':WORLD_SHA,'allFocusedSerializedBytesMatchOriginal':True})
 audit={'selectedNativeBodies':len(functions),'instructions':sum(map(len,instructions.values())),'instructionBytes':sum(len(bytes.fromhex(r['bytes']))for body in instructions.values()for r in body),'allSelectedInstructionBytesMatchOriginalPE':True}
 evidence={'schema':'gothic3-damage-reading-evidence-v1','inputs':inputs,'nativeCodeExecuted':False,'functions':[functions[k]for k in sorted(functions)],'instructions':instructions,'vtables':tables,'importedSubcalls':bindings,'publicSetters':public_setters,'registrarOrder':registrar_order,'literals':literals,'mutableEnumGlobals':globals_proof,'originalHero':source_hero,'audit':audit}
 rules={'schema':'gothic3-damage-reading-rules-v1','inputs':{k:v[2]for k,v in INPUTS.items()},'classes':profiles,'enumLiveValueFromPEKnown':False,'profile':{'worldResident':False,'allocation':'fresh successful native/wrapper allocation; numeric heap pointers masked','derivedRead':'both consume onlyu16 and return1, without base tail','unresolved':['live mutable enum global if numeric bits are accessed before proven writes','nonNULL cached proxy actual ReleaseReference/destruction','last native/wrapper reference destruction','entity/world/combat integration']}}
 readme='''# Original Damage and DamageReceiver reading

OriginalDamageReader registers real gCDamage_PS and gCDamageReceiver_PS factories, selectors51/52 and versions76/33. Their original Hero packets10/11 contain5/9 reflective fields, with only a two-byte native version tail each. The factories retain the exact NativeLivePropertySet, masked physical numeric store and live values. DamageReceiver's LastInflictor is a real embedded EntityProxy capability with the same cached pointer and PropertyID slots, not a projected GUID record.

Constructors initialize the inherited base and embedded DamageType container from mutable global207b62a4; absent live global capture copies masked unknown bits rather than guessed zero. Receiver additionally constructs LastInflictor. Fresh Create, wrapper Attach/reference handoff, reflected defaults and PostInitialize remain ordered. PostInitialize is nonempty: Damage writes DamageAmount10, constructs/copies/destroys the actual temporary enum value2 (including base constructor/destructor vtable writes), then ManaMultiplier1, ManaUsed0 and HitMultiplier1. Receiver writes HitPoints1 then HitPointsMax1. The subsequent Hero read overwrites original serialized fields, including DamageAmount0 and Receiver DamageType2.

Descriptor readers consume their version/size without a forced seek, dispatch inherited propagated Enter, resolve the actual retained destination after Enter, read actual scalar/enum/proxy payload and independently resolve the receiver before Exit. The selected stable retained-native receiver profile rejects wrapper/native replacement before payload or Exit rather than pretending to dispatch replacement classes. Both native derived Reads consume onlyu16 and return1. Current PostRead/Added/Removed/Pre/Post callbacks dispatch to proved inherited RET bodies. Damage process is inherited RET and Receiver overrides it with RET; both IsProcessable dispatch to inherited false. These empty selected callbacks do not establish full combat behavior or world processing membership.

All numeric views and implemented native scalar setters use this one physical values store. Scalar setters preserve captured PS and Notify enter/write/exit ordering; setScalar selects an immutable primitive argument, while setScalarReference reads the captured current argument only after Enter and before the write. Native container/proxy copy-assignment setters remain separate unsupported operations. Unknown field bits cannot be read as zero. Float raw serialized reads preserve IEEE bits, while public numeric setters select finite exact-float32 inputs. Proxy updates preserve original first16-byte ID equality, copy16/cache0, release and clearing order. A nonNULL cached internal requires its actual guarded ReleaseReference service; terminal allocation/destruction and world/combat connections remain separate dependencies. Reentry stops with the completed/attempted prefix retained. Successful construction/reading remains detached.

The producer compares every selected instruction against immutable original PE bytes and confines each excerpt to its cataloged inclusive body ranges; the bounded capture helper also pins complete range bytes/hashes and rejects whole-instruction boundary violations. It closes initial JMP forwarding chains, pins native/wrapper/enum/descriptor/proxy dispatch, complete CRT registration order, registrar literals/stores, the PostInitialize float1 literal and mutable-global storage evidence, and compares focused original Hero packets. Current implementation receipts pin actual runtime/producer/helpers/metadata/output bytes and exclude themselves. It runs no native code, tests, build, browser, remote actions or Actions. Historical captures used a next-entry text boundary that could misattribute neighboring instructions; the current evidence and counts replace that attribution.
'''
 for base in [OUT,PUBLIC]:(base/'README.md').write_text(readme,encoding='utf-8',newline='\n')
 for name,value in [('native-evidence.json',evidence),('runtime-rules.json',rules)]:save_json(OUT/name,value);save_json(PUBLIC/name,value)
 expected_sources={Path(f[x])for f in functions.values()for x in ['cExcerpt','assemblyExcerpt']}
 for base in [OUT,PUBLIC]:
  for path in (base/'sources').rglob('*'):
   if path.is_file()and path.relative_to(base)not in expected_sources:
    if not path.resolve().is_relative_to(base.resolve()):raise ValueError('Source cleanup escapes owned namespace')
    path.unlink()
 for relative in sorted(expected_sources):dest=PUBLIC/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(OUT/relative,dest)
 if not args.capture_only:
  imported=[Path(m.__file__).resolve()for m in list(sys.modules.values())if getattr(m,'__file__',None)and Path(m.__file__).resolve().parent==ROOT/'tools/gothic3'and Path(m.__file__).suffix=='.py']
  deps=[ROOT/'src/gothic3/damage-reading.ts',ROOT/'src/gothic3/entity-reflection.ts',ROOT/'src/gothic3/entity-lifecycle.ts',ROOT/'src/gothic3/entity-reading.ts',ROOT/'src/gothic3/native-properties.ts',schema_path,candidate_path,Path(__file__).resolve(),*imported]
  deps+=[ROOT/('assets/gothic3/'+namespace+'/runtime-rules.json')for namespace in ['entity-reflection','entity-lifecycle','entity-reading','properties']]
  deps+=[ROOT/('assets/gothic3/'+namespace+'/manifest.json')for namespace in ['entity-reflection','entity-lifecycle']]
  owned=[p for base in [OUT,PUBLIC]for p in base.rglob('*')if p.is_file()and p.name!='implementation-receipt.json']
  receipt={'schema':'gothic3-damage-reading-implementation-receipt-v1','baseline':'fd8048844d3e06026f96e8b8096cfcd53e3d9eaa','checksActuallyPerformed':['offline original PE instruction-byte audit','offline original Hero packets/native-tail audit','offline source/output hash audit'],'noNativeCodeExecution':True,'noTestsOrBuildRunByProducer':True,'audit':audit,'files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}for p in sorted(set(deps+owned))]}
  save_json(OUT/'implementation-receipt.json',receipt);save_json(PUBLIC/'implementation-receipt.json',receipt)
 print(json.dumps({'audit':audit,'receiptSha256':None if args.capture_only else sha(OUT/'implementation-receipt.json')}))
if __name__=='__main__':main()
