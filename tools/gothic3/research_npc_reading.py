"""Recover fresh gCNPC_PS construction/current Hero reading offline; no native execution."""
from __future__ import annotations
import argparse,csv,hashlib,json,re,shutil,struct,sys
from pathlib import Path
from research_native_combat import PE,save_json,sha
from research_native_clock import collect
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import INPUTS,SELECT as REFLECTION_SELECT,pin_vtable,WORLD_PATH,WORLD_SHA

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/gothic3/npc-reading';PUBLIC=ROOT/'public/gothic3/npc-reading'
SELECT={'Game':set('20031f48 200109c4 200361dd 200053b7 2000df26 2000eb06 20010a1e 20015df7 2001e5f6 2002e569 200077e8 2002b3c3 2002c51b 2002eb4f 205133d0 20021eb8 20002dc4 200024aa 202fb970 200107c1 20015a46 2001717f 2028f890 2030bd70'.split()),
 'Engine':set('300025bd 3003b5bb 3001a091 3002ad10 30037ca4 3001d7b9 3000f7ea 3000247d 30017e77'.split()),
 'SharedBase':set(REFLECTION_SELECT['SharedBase'])|set('10004421 100063c5 1000694c 10008201 100015cd 10012570 10092760 1000779d 10003d28 10001cee 10003a71 10008233 100059ed 1000873d 10001f05'.split())}
ENUMS=[('Gender',0x28,'20695264','207c0928'),('Species',0x30,'2069533c','207c092c'),('PoliticalAlignment',0x38,'206671f4','207b7f08'),('Class',0x40,'20695414','207c0930'),('Type',0x48,'206954ec','207c0934'),('AttitudeToPlayer2',0x64,'206955c4','207c0938'),('LastPlayerCrime',0x6c,'20667354','207b7f0c'),('AttackReason',0x74,'2069569c','207c093c'),('LastPlayerAR',0x7c,'2069569c','207c093c'),('LastFightAgainstPlayer',0x84,'20695774','207c0940'),('GuardStatus',0x12c,'2067ddf4','207bb2f4'),('Bearing',0x138,'206958d4','207c0944')]

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--study',type=Path,required=True);ap.add_argument('--capture-only',action='store_true');args=ap.parse_args();study=args.study.resolve()
 OUT.mkdir(parents=True,exist_ok=True);PUBLIC.mkdir(parents=True,exist_ok=True)
 pes={};inputs={};rows={}
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
   if target not in rows[short]:raise ValueError('Full thunk source missing '+short+':'+target)
   if target not in entries:entries.add(target);pending.append(target)
  entries-={k.split(':')[1] for k in instructions if k.startswith(short+':')}
  if not entries:return
  bodies,records=collect(study,short,INPUTS[short][0],' '.join(sorted(entries)),pe,OUT)
  for body in bodies:functions[body['id']]=body
  instructions.update(records)
 for short in INPUTS:capture(short,SELECT[short])
 maps={k:exports(v) for k,v in pes.items()};imports={k:native_imports(v) for k,v in pes.items()}
 schema_path=ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json'
 schema=json.loads(schema_path.read_text(encoding='utf-8'));fields=[f for f in schema['nativePropertyRegistrars'] if f['className']=='gCNPC_PS']
 if len(fields)!=43:raise ValueError('Original NPC field count differs')
 fields.sort(key=lambda f:f['entry'])
 capture('Game',{f['entry'] for f in fields})
 tables={'npcNative':pin_vtable(pes['Game'],imports['Game'],maps,0x2069668c,0x150),'npcWrapper':pin_vtable(pes['Game'],imports['Game'],maps,0x20695ac4,0x44),'embeddedEntityProxy':pin_vtable(pes['Engine'],imports['Engine'],maps,0x3087bff4,0x14)}
 needed={k:set() for k in INPUTS};runtime_fields=[]
 def add_slot(table,offset):
  slot=next(e for e in table['entries'] if e['offset']==offset)
  target=slot.get('implementation','Game:'+slot['target']);short,entry=target.split(':');needed[short].add(entry);return target
 for off in [0,4,0x10,0x18,0x3c,0x40,0x4c,0x50,0x58,0x5c,0x60,0x68,0x84,0x120,0x124,0x128,0x12c,0x138,0x13c]:add_slot(tables['npcNative'],off)
 for off in [0,4,8,0x14,0x1c,0x28,0x30,0x34,0x38]:add_slot(tables['npcWrapper'],off)
 for f in fields:
  # Every registrar's literal stores and descriptor dispatch are original bytes.
  for store in [f['descriptorStore'],f['offsetStore'],f['defaultStore']]:
   address=int(store['address'],16)
   if pes['Game'].at(address,len(bytes.fromhex(store['bytes'])))!=bytes.fromhex(store['bytes']):raise ValueError('Registrar store differs')
  vt=f['vtable'];table=tables.setdefault('descriptor:'+vt,pin_vtable(pes['Game'],imports['Game'],maps,int(vt,16),0x6c))
  literal=f['nameLiteral'];literal_raw=bytes.fromhex(literal['bytes'])
  if pes['Game'].at(int(literal['address'],16),len(literal_raw))!=literal_raw:raise ValueError('Registrar name literal differs')
  field={'name':f['name'],'typeName':f['cppType'],'nativeOffset':f['nativeOffset'],'registrar':'Game:'+f['entry'],'reader':add_slot(table,0x38),'default':add_slot(table,0x14),'descriptorRead':add_slot(table,0),'memberAccessor':add_slot(table,0x64)}
  runtime_fields.append(field)
 for name,offset,vtable,global_address in ENUMS:
  table=tables.setdefault('enum:'+vtable,pin_vtable(pes['Game'],imports['Game'],maps,int(vtable,16),0x28))
  field=next(f for f in runtime_fields if f['name']==name)
  field['enum']={'vtable':vtable,'global':global_address,'valueOffset':offset+4,'nativeRead':add_slot(table,0x10),'nativeDefault':add_slot(table,0x18)}
 for short in INPUTS:capture(short,needed[short])
 # Imported subcalls of concrete constructors/readers/defaults, not arbitrary game traversal.
 bindings=[];needed={k:set() for k in INPUTS}
 import_sources={'Game:202f9e80','Game:202f8e80','Game:202f9940','Game:202f9ca0','Game:202f8d90','Game:202f9d00','Game:202f9d50','Game:202fb970','Game:2030eb30','Game:2030f1e0','Game:20305e50','Game:20301e50','Game:2028f890','Game:2030bd70','Engine:304c45a0','Engine:304c4350','Engine:304c43a0','Engine:304c4410','Engine:30481a60','Engine:304814e0','SharedBase:10012570','SharedBase:10092760'}|{f['reader'] for f in runtime_fields}|{f['enum']['nativeRead'] for f in runtime_fields if 'enum'in f}|{f['enum']['nativeDefault'] for f in runtime_fields if 'enum'in f}
 for short in INPUTS:capture(short,{key.split(':')[1] for key in import_sources if key.startswith(short+':')})
 # Resolve thunk fields to their bodies before inspecting imported calls.
 expanded=set(import_sources)
 for key in list(import_sources):
  short,entry=key.split(':');raw=pes[short].at(int(entry,16),5)
  while raw[0]==0xe9:
   entry=f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}';expanded.add(short+':'+entry);raw=pes[short].at(int(entry,16),5)
 for key in sorted(expanded):
  short=key.split(':')[0]
  if key not in instructions:raise ValueError('Called body missing '+key)
  for row in instructions[key]:
   m=re.search(r'(?:CALL\s+|JMP\s+|MOV E[A-Z]+,\s*)dword ptr \[0x([0-9a-f]+)\]',row['assembly'])
   if not m:continue
   imp=imports[short].get(int(m[1],16))
   if not imp:continue
   module=imp['library'].removesuffix('.dll');binding={'function':key,'instruction':row,'importSlot':m[1],'import':imp}
   if module in maps:
    entry=f"{maps[module][imp['decoratedName']]:08x}";binding['implementation']=module+':'+entry;needed[module].add(entry)
   else:binding['status']='external native service boundary; never executed'
   bindings.append(binding)
 for short in INPUTS:capture(short,needed[short])
 # The mutable enum globals are addresses/cold PE bytes, never an invented live value.
 globals_proof=[]
 ctor_asm='\n'.join(r['assembly'] for r in instructions['Game:202f9e80'])
 for name,offset,vtable,address in ENUMS:
  if '0x'+address not in ctor_asm or '0x'+vtable not in ctor_asm:raise ValueError('Constructor enum literal differs '+name)
  try:raw=pes['Game'].at(int(address,16),4);cold={'coldPEBytes':raw.hex()}
  except ValueError:
   pe=pes['Game'];header=struct.unpack_from('<I',pe.data,0x3c)[0];optional_size=struct.unpack_from('<H',pe.data,header+20)[0];section_count=struct.unpack_from('<H',pe.data,header+6)[0];rva=int(address,16)-pe.base;proof=None
   for index in range(section_count):
    at=header+24+optional_size+index*40;virtual_size,section_rva,raw_size,raw_offset=struct.unpack_from('<IIII',pe.data,at+8)
    if section_rva+raw_size<=rva and rva+4<=section_rva+virtual_size:
     proof={'headerFileOffset':at,'headerBytes':pe.data[at:at+40].hex(),'virtualSize':virtual_size,'rva':section_rva,'rawSize':raw_size,'rawOffset':raw_offset};break
   if proof is None:raise ValueError('Mutable enum is neither initialized nor proved virtual zero-fill '+address)
   cold={'coldPEBytes':None,'storage':'PE virtual zero-fill; not a file-backed initialized DWORD','sectionProof':proof}
  globals_proof.append({'name':name,'address':address,**cold,'liveValueKnown':False,'consumer':'Game:202f9e80'})
 # Exact .CRT initializer order preserves native member iteration/default order.
 sequence=b''.join(struct.pack('<I',int(f['entry'],16)) for f in fields)
 game_raw=(study/'00_Original_Runtime/Game.dll').read_bytes();at=game_raw.find(sequence)
 if at<0 or game_raw.find(sequence,at+1)>=0:raise ValueError('Unique complete NPC CRT registration sequence missing')
 registrar_order={'module':'Game','fileOffset':at,'bytes':sequence.hex(),'sha256':hashlib.sha256(sequence).hexdigest(),'entries':[f['entry'] for f in fields]}
 candidate_path=ROOT/'assets/gothic3/entity-reflection/serialized-candidates.json'
 candidates=json.loads(candidate_path.read_text(encoding='utf-8'));hero=next(e for e in candidates['entities'] if e['name']=='PC_Hero')['propertySets'][6]
 original=study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
 if sha(original)!=WORLD_SHA:raise ValueError('Original SysDyn differs')
 data=original.read_bytes();raw=data[hero['sourceOffset']:hero['endSourceOffset']+4];tail=data[hero['nativeReadOffset']:hero['endSourceOffset']]
 if hero['className']!='gCNPC_PS' or hero['nativeReadVersion']!=78 or len(hero['properties'])!=43 or raw.hex()!=hero['serializedRaw'] or hashlib.sha256(raw).hexdigest()!=hero['serializedSha256'] or tail!=bytes.fromhex('4e00'):raise ValueError('Original Hero NPC packet differs')
 if {p['name'] for p in hero['properties']}!={f['name'] for f in runtime_fields}:raise ValueError('Hero/schema field membership differs')
 audit={'selectedNativeBodies':len(functions),'instructions':sum(map(len,instructions.values())),'instructionBytes':sum(len(bytes.fromhex(r['bytes'])) for body in instructions.values() for r in body),'allSelectedInstructionBytesMatchOriginalPE':True}
 evidence={'schema':'gothic3-npc-reading-evidence-v1','inputs':inputs,'nativeCodeExecuted':False,'functions':[functions[k] for k in sorted(functions)],'instructions':instructions,'vtables':tables,'importedSubcalls':bindings,'mutableEnumGlobals':globals_proof,'registrarOrder':registrar_order,'audit':audit,'originalHero':{'className':hero['className'],'index':6,'sourceOffset':hero['sourceOffset'],'endSourceOffset':hero['endSourceOffset'],'serializedBytes':len(raw),'serializedSha256':hero['serializedSha256'],'nativeTailBytes':len(tail),'allFocusedSerializedBytesMatchOriginal':True,'sourcePath':WORLD_PATH,'sourceSha256':WORLD_SHA}}
 rules={'schema':'gothic3-npc-reading-rules-v1','inputs':{k:v[2] for k,v in INPUTS.items()},'className':'gCNPC_PS','propertyType':30,'getVersion':78,'nativeBytes':508,'nativeVtable':'2069668c','wrapperVtable':'20695ac4','fields':runtime_fields,'heroSerialized':hero,'nativeTailRaw':tail.hex(),'profile':{'allocation':'fresh successful wrapper/native capability allocation; numeric heap pointers remain masked','enumGlobals':'live masked DWORD copy; cold PE bytes are not live defaults','derivedRead':'all versions consume u16 then reset ManaUsed+158 to0; no inherited read','worldResident':False,'unresolved':['actual indexed CString stream ownership/copy service','CoCreateGuid platform service','nonempty teaching array allocation/destruction','animation/TrackCurrentPose body after the proven pending-pose fast branch','local NotifyExit temporary CString ownership','terminal destruction and world registration']}}
 readme='''# Original NPC construction and reading

OriginalNPCReader(controller, host?) registers the real gCNPC_PS factory: selector30, GetVersion78, 508-byte native storage and 43 source-ordered reflected descriptors. Fresh construction initializes the inherited RefBase/EntityPS, five NULL CStrings, twelve masked mutable-global enum values, Enclave PropertyID, nine actual EntityProxy objects and two real empty teaching arrays. It leaves primitive/padding/pose fields unknown until the original default/read writes them. Create, wrapper Attach/reference handoff, defaults and inherited PostInitialize use the same retained physical object.

Enclave's reflective default calls original CreateRandom: temporary bCGuid constructor, required CoCreateGuid callback with ignored HRESULT, valid-byte write, copy16/cache0 and destructor. It does not replace this with a zero ID. Enum defaults copy the same actual mutable globals again and can preserve unknown bits; getters reject unknown numeric fields. ManaUsed defaults to -1, then native Read consumes its version and resets it to0. The original Hero packet6 occupies relative [2615,3266), 651 bytes including its sentinel: 43 properties and a two-byte native version78 tail.

properties(wrapper) exposes one base/values/notifications/Enclave-proxy store. OriginalEntityPropertySet owner reads follow the live physical base owner, including both owner Modified reads. Propagated descriptor notifications skip NPC's local temporary-CString branch. OnPostRead resets pending pose+1a4 before refreshing the same proxy+1c4 from Enclave, then dispatches inherited RET. Added/Removed/Pre/Post callbacks retain their actual inherited RET scope. IsProcessable is true; Process first dispatches inherited OnProcess, then the concrete pending-pose fast branch or requires the actual animation-backed TrackCurrentPose service. Uninitialized pose fields are not guessed.

Each descriptor consumes version and advertised payload size without forcing a seek, resolves the same retained destination across callbacks, reads its actual typed payload and dispatches propagated Exit. Current primitive/enum/ID/NULL-proxy/empty-array branches are concrete. CString constructor/Clear preserve NULL versus nonNULL empty allocation; actual indexed stream Read/copy/ref/free remains a required host service on the same mutable slot. Nonempty arrays stop at the real allocation/destruction boundary. Local NotifyExit requires the actual temporary CString construct/compare/destroy services before proxy effects. Allocation failure, full terminal destruction, external animation and world registration are separate unresolved capabilities. A detached constructed/read PS is not a resident entity.

The standalone producer runs only offline original PE/serialized-byte/source hash audits. It closes initial JMP thunks transitively, pins selected vtable dispatch, all 43 registrar descriptors and their unique contiguous .CRT order, masks live enum globals rather than assuming cold values, and compares the original Hero packet. Receipts pin current source/helper/output bytes and exclude themselves. No native code, tests, build, browser, remotes or Actions are run by this producer.
'''
 for base in (OUT,PUBLIC):(base/'README.md').write_text(readme,encoding='utf-8',newline='\n')
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
  deps=[ROOT/'src/gothic3/npc-reading.ts',ROOT/'src/gothic3/entity-reflection.ts',ROOT/'src/gothic3/entity-lifecycle.ts',ROOT/'src/gothic3/entity-reading.ts',ROOT/'src/gothic3/native-properties.ts',schema_path,candidate_path,Path(__file__).resolve(),*imported]
  for p in deps:
   if not p.is_file():raise ValueError('Required source dependency missing '+str(p))
  owned=[p for base in (OUT,PUBLIC) for p in base.rglob('*') if p.is_file() and p.name!='implementation-receipt.json']
  receipt={'schema':'gothic3-npc-reading-implementation-receipt-v1','baseline':'eb97f57b3ff2b7838862078276740526f3dc962a','checksActuallyPerformed':['offline original PE instruction-byte audit','offline original Hero packet/derived-tail byte audit','offline current source/output hash audit'],'noNativeCodeExecution':True,'noTestsOrBuildRunByProducer':True,'audit':audit,'files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(set(deps+owned))]}
  save_json(OUT/'implementation-receipt.json',receipt);save_json(PUBLIC/'implementation-receipt.json',receipt)
 print(json.dumps({'audit':audit,'receiptSha256':None if args.capture_only else sha(OUT/'implementation-receipt.json')}))

if __name__=='__main__':main()
