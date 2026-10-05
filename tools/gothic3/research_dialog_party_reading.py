"""Offline original Dialog/Party factory, reflection and current Hero audit.

No native code, tests, browser, builds or remote actions are executed.
"""
from __future__ import annotations
import argparse, csv, hashlib, json, re, shutil, struct, sys
from pathlib import Path
from research_native_combat import PE, save_json, sha
from bounded_native_capture import collect
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import INPUTS, SELECT as REFLECTION_SELECT, pin_vtable, WORLD_PATH, WORLD_SHA

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/gothic3/dialog-party-reading'
PUBLIC=ROOT/'public/gothic3/dialog-party-reading'
CLASSES={
 'gCDialog_PS':{'packetIndex':14,'packetBytes':140,'rootRegistrar':'204fcd80','constructor':'2020b9c0','nativeVtable':'206861cc','wrapperVtable':'20685f54','containerVtable':'20685dec','enumGlobal':'207bd4c4','enumName':'TradeCategory','propertyType':68,'nativeBytes':88,'listOffset':76,'proxyOffset':48},
 'gCParty_PS':{'packetIndex':16,'packetBytes':78,'rootRegistrar':'20517c00','constructor':'20317c20','nativeVtable':'20697834','wrapperVtable':'206975bc','containerVtable':'20697454','enumGlobal':'207c1414','enumName':'PartyMemberType','propertyType':77,'nativeBytes':72,'listOffset':60,'proxyOffset':20},
}

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--study',type=Path,required=True);parser.add_argument('--capture-only',action='store_true');args=parser.parse_args();study=args.study.resolve()
 OUT.mkdir(parents=True,exist_ok=True);PUBLIC.mkdir(parents=True,exist_ok=True)
 pes,inputs,catalog={},{},{}
 for short,(directory,filename,expected) in INPUTS.items():
  path=study/'00_Original_Runtime'/filename
  if sha(path)!=expected:raise ValueError('Original PE differs: '+short)
  pes[short]=PE(path);inputs[short]={'path':'00_Original_Runtime/'+filename,'bytes':path.stat().st_size,'sha256':expected}
  with (study/'01_Decompiled_Code'/directory/'functions.csv').open(encoding='utf-8-sig',newline='') as file:catalog[short]={row['address']:row for row in csv.DictReader(file)}
 maps={short:exports(pe) for short,pe in pes.items()};imports={short:native_imports(pe) for short,pe in pes.items()}
 functions,instructions={},{}
 def capture(short,requested):
  entries={entry for entry in requested if entry in catalog[short]};pending=list(entries)
  while pending:
   entry=pending.pop();raw=pes[short].at(int(entry,16),5)
   if raw[0]!=0xe9:continue
   target=f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}'
   if target not in catalog[short]:raise ValueError('Missing original forwarder body: '+short+':'+target)
   if target not in entries:entries.add(target);pending.append(target)
  entries-={identity.split(':')[1] for identity in instructions if identity.startswith(short+':')}
  if not entries:return
  bodies,records=collect(study,short,INPUTS[short][0],' '.join(sorted(entries)),pes[short],OUT);functions.update((body['id'],body) for body in bodies);instructions.update(records)
 schema_path=ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json';candidate_path=ROOT/'assets/gothic3/entity-reflection/serialized-candidates.json'
 schema=json.loads(schema_path.read_text(encoding='utf8'));candidates=json.loads(candidate_path.read_text(encoding='utf8'));hero=next(row for row in candidates['entities'] if row['name']=='PC_Hero')
 selected={short:set(REFLECTION_SELECT.get(short,[])) for short in INPUTS}
 selected['SharedBase'].update('10006019 10002568 10001186 10005a65 10003a71 1000873d 100059ed 1000277a 10001f05 10007dab'.split())
 selected['Engine'].update('3003544f 3000392c 3000326f 30017e77 3000b9c9 3002d844 3001d7b9 300241d6 300021c1 300150a5 3000f7ea'.split())
 selected['Game'].update(f'{address:08x}' for name,address in maps['Game'].items() if any(className+'@@' in name for className in CLASSES))
 for data in CLASSES.values():selected['Game'].add(data['rootRegistrar'])
 descriptors={className:[row for row in schema['nativePropertyRegistrars'] if row['className']==className] for className in CLASSES}
 selected['Game'].update(row['entry'] for rows in descriptors.values() for row in rows)
 for short in INPUTS:capture(short,selected[short])
 tables={};fields={};containers={}
 proxy_table=pin_vtable(pes['Engine'],imports['Engine'],maps,0x3087bff4,0x20)
 def add_slot(needed,item):
  module,entry=item.get('implementation','Game:'+item['target']).split(':')
  if entry in catalog.get(module,{}):needed[module].add(entry)
 needed={short:set() for short in INPUTS}
 for item in proxy_table['entries']:
  if item['offset'] in {4,0xc,0x14,0x18,0x1c}:needed['Engine'].add(item['target'])
 for className,data in CLASSES.items():
  tables[className]={kind:pin_vtable(pes['Game'],imports['Game'],maps,int(data[key],16),length) for kind,key,length in [('native','nativeVtable',0x150),('wrapper','wrapperVtable',0x44)]}
  fields[className]={row['name']:pin_vtable(pes['Game'],imports['Game'],maps,int(row['vtable'],16),0x68) for row in descriptors[className]}
  containers[className]=pin_vtable(pes['Game'],imports['Game'],maps,int(data['containerVtable'],16),0x1c)
  for table in tables[className].values():
   for item in table['entries']:
    if table is tables[className]['native'] and item['offset'] not in {0,4,0x10,0x18,0x20,0x3c,0x40,0x4c,0x50,0x58,0x5c,0x60,0x68,0x84,0x120,0x124,0x128,0x12c,0x138,0x13c,0x140}:continue
    add_slot(needed,item)
  for table in fields[className].values():
   for item in table['entries']:
    if item['offset'] in {0x14,0x38,0x40,0x64}:add_slot(needed,item)
  for item in containers[className]['entries']:
   if item['offset'] in {0x10,0x18}:add_slot(needed,item)
 for short in INPUTS:capture(short,needed[short])
 # Concrete constructor/factory/descriptor dependencies: resolve direct native
 # CALLs and imported CALL/JMP helpers without executing any target instruction.
 bindings=[];seen=set();frontier=set(instructions)
 for depth in range(3):
  needed={short:set() for short in INPUTS}
  for identity in sorted(frontier):
   short=identity.split(':')[0]
   for row in instructions[identity]:
    direct=re.fullmatch(r'CALL 0x([0-9a-f]+)',row['assembly'])
    if direct and direct[1] in catalog[short]:needed[short].add(direct[1])
    match=re.search(r'(?:CALL|JMP)\s+dword ptr \[0x([0-9a-f]+)\]',row['assembly'])
    if not match:continue
    imp=imports[short].get(int(match[1],16))
    if not imp:continue
    key=(identity,row['address'])
    if key in seen:continue
    seen.add(key);module=imp['library'].removesuffix('.dll');binding={'function':identity,'instruction':row,'importSlot':match[1],'import':imp}
    if module in maps and imp['decoratedName'] in maps[module]:
     entry=f'{maps[module][imp["decoratedName"]]:08x}';binding['implementation']=module+':'+entry;needed[module].add(entry)
    else:binding['status']='external native service; never executed'
    bindings.append(binding)
  before=set(instructions)
  for short in INPUTS:capture(short,needed[short])
  frontier=set(instructions)-before
  if not frontier:break
 original=study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
 if sha(original)!=WORLD_SHA:raise ValueError('Winning original Hero world differs')
 world=original.read_bytes();rules_classes={};packets=[];orders={}
 for className,data in CLASSES.items():
  packet=hero['propertySets'][data['packetIndex']];raw=world[packet['sourceOffset']:packet['endSourceOffset']+4]
  if packet['className']!=className or packet['nativeReadVersion']!=1 or len(raw)!=data['packetBytes'] or raw.hex()!=packet['serializedRaw'] or hashlib.sha256(raw).hexdigest()!=packet['serializedSha256']:raise ValueError('Original Hero packet differs: '+className)
  expected_tail='0100' if className=='gCDialog_PS' else '01000100000000'
  if world[packet['nativeReadOffset']:packet['endSourceOffset']].hex()!=expected_tail:raise ValueError('Original native tail differs')
  field_rows=[]
  for descriptor,prop in zip(descriptors[className],packet['properties'],strict=True):
   rows=instructions['Game:'+descriptor['entry']]
   if descriptor['name']!=prop['name'] or any(descriptor[key] not in rows for key in ['descriptorStore','offsetStore','defaultStore']):raise ValueError('Native descriptor proof differs')
   if pes['Game'].cstring(int(descriptor['nameLiteral']['address'],16)).decode('ascii')!=descriptor['name']:raise ValueError('Native descriptor name differs')
   if world[prop['sourceOffset']:prop['sourceOffset']+prop['byteLength']].hex()!=prop['raw']:raise ValueError('Original field payload differs')
   slots={item['offset']:item for item in fields[className][descriptor['name']]['entries']};target=lambda slot:slots[slot].get('implementation','Game:'+slots[slot]['target'])
   field_rows.append({'name':prop['name'],'typeName':prop['type'],'nativeOffset':descriptor['nativeOffset'],'registrar':'Game:'+descriptor['entry'],'reader':target(0x38),'defaultInitializer':target(0x14),'addressGetter':target(0x64)})
  registrar_bytes=b''.join(struct.pack('<I',int(row['entry'],16)) for row in descriptors[className]);offset=pes['Game'].data.find(registrar_bytes)
  if offset<0 or pes['Game'].data.find(registrar_bytes,offset+1)>=0:raise ValueError('Native registrar order ambiguous')
  orders[className]={'fileOffset':offset,'bytes':registrar_bytes.hex(),'entries':[row['entry'] for row in descriptors[className]]}
  rules_classes[className]={**data,'fields':field_rows,'heroSerialized':packet};packets.append({'className':className,'packetIndex':data['packetIndex'],'bytes':len(raw),'sha256':packet['serializedSha256']})
 literal_pins=[('Game','2020b840','66b80100c3','Dialog GetVersion1'),('Game','2020b850','b844000000c3','Dialog type68'),('Game','2020b8c0','b001c3','Dialog processabletrue'),('Game','20317b40','66b80100c3','Party GetVersion1'),('Game','20317b50','b84d000000c3','Party type77'),('Engine','30481520','b86400000032c0c3','Party inherited processablefalseAL'),('Game','2020f7ad','68c4000000','Dialog original allocation tag0xc4'),('Game','2020f7b2','6a58','Dialog original allocation88bytes'),('Game','2031b97d','68c4000000','Party original allocation tag0xc4'),('Game','2031b982','6a48','Party original allocation72bytes')]
 empty_pins=[('Game','2020b800'),('Game','2020b8d0'),('Game','20317ad0'),('Engine','304818e0'),('Engine','304818f0'),('Engine','30481900'),('Engine','304818a0'),('Engine','30481830'),('Engine','30481840')]
 literal_pins += [(short,address,'c3','selected lifecycle/Invalidation literalRET') for short,address in empty_pins]
 literal_pins += [('Game','20317b60','c20c00','Party OnChildrenAvailable empty RET12'),('Engine','304818b0','c20c00','inherited OnChildrenAvailable empty RET12')]
 for short,address,expected,meaning in literal_pins:
  if pes[short].at(int(address,16),len(bytes.fromhex(expected))).hex()!=expected:raise ValueError('Native literal differs: '+short+':'+address+' '+meaning)
 for className,data in CLASSES.items():
  rows=instructions['Game:'+data['constructor']]
  if not any(row['assembly']=='MOV dword ptr [ESI],0x'+data['nativeVtable'] for row in rows):raise ValueError('Native ctor vtable differs')
  if not any(row['assembly']=='MOV dword ptr [EDI],0x'+data['containerVtable'] for row in rows):raise ValueError('Native ctor enum vtable differs')
  if not any(row['assembly']=='MOV EAX,[0x'+data['enumGlobal']+']' for row in rows):raise ValueError('Native ctor mutable enum global differs')
  if not any(row['assembly'].startswith('MOV dword ptr [0x') and row['assembly'].endswith(',0x'+data['wrapperVtable']) for row in instructions['Game:'+data['rootRegistrar']]):raise ValueError('Root wrapper registration vtable differs')
 if not all(body.get('allInstructionsInsideOriginalPEBodyRanges') and body.get('completeOriginalPEBodyRangesCovered') and body['instructionBytes']==body['bodyBytes'] for body in functions.values()):raise ValueError('Bounded original body instruction coverage incomplete')
 audit={'selectedNativeBodies':len(functions),'instructions':sum(map(len,instructions.values())),'instructionBytes':sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows),'allSelectedInstructionBytesMatchOriginalPE':True,'allInstructionsInsideOriginalPEBodyRanges':True,'allOriginalBodyBytesCoveredByInstructions':True}
 evidence={'schema':'gothic3-dialog-party-reading-evidence-v1','inputs':inputs,'nativeCodeExecuted':False,'functions':[functions[key] for key in sorted(functions)],'instructions':instructions,'vtables':tables,'descriptorVtables':fields,'containerVtables':containers,'proxyVtable':proxy_table,'importedSubcalls':bindings,'registrarOrder':orders,'literalPins':[{'module':short,'address':address,'bytes':expected,'meaning':meaning} for short,address,expected,meaning in literal_pins],'audit':audit,'originalHero':{'sourcePath':WORLD_PATH,'sourceSha256':WORLD_SHA,'packets':packets,'allFocusedSerializedBytesMatchOriginal':True}}
 rules={'schema':'gothic3-dialog-party-reading-rules-v1','inputs':{short:data[2] for short,data in INPUTS.items()},'classes':rules_classes,'profile':{'worldResident':False,'nativeCodeExecuted':False,'allocation':'successful fresh original-class allocation/Attach; old wrapper replacement and terminal destruction are not implemented','constructor':'actual ordered base/container/proxy/list stores, live enum globals via required masked host','nativeRead':'Dialog consumes onlyu16; Party version1 consumes originalu8/count32 list then elements','currentHeroLists':'both count0/capacity0/NULLbuffer; no array allocation or cache resolution asserted','notifications':'both classes inherit Engine Notify/OnNotify; current physical owner.Modified is a timestamp read twice','unresolved':['nonempty list memory allocation/proxy constructor and destruction','terminal wrapper/class destruction and old allocations','actual cached proxy internal services and nonNULL Entity* lookup','full entity loading, world residency, dialogue execution and completed game']}}
 for name,value in [('native-evidence.json',evidence),('runtime-rules.json',rules)]:save_json(OUT/name,value);save_json(PUBLIC/name,value)
 expected={Path(body[key]) for body in functions.values() for key in ['cExcerpt','assemblyExcerpt']}
 for base in (OUT,PUBLIC):
  for path in (base/'sources').rglob('*'):
   if path.is_file() and path.relative_to(base) not in expected:
    if not path.resolve().is_relative_to(base.resolve()):raise ValueError('Cleanup leaves owned namespace')
    path.unlink()
 for relative in sorted(expected):
  destination=PUBLIC/relative;destination.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(OUT/relative,destination)
 readme='''# Original Dialog and Party factory/reading

`OriginalDialogPartyReader(controller, host)` registers both concrete original factories on the same NativeReflectionController. `readOriginalHeroDialog` and `readOriginalHeroParty` consume pinned original accessors and return their retained NativeLivePropertySet, one physical values facade, embedded proxy/list facade, and unconsumed outer sentinel. They do not call PostRead or add a set to a world entity implicitly. Actual base lifecycle composition can use the returned same PS pointer. Current factories are detached successful fresh allocations; no loaded/resident NPC or full-game completion is asserted.

Dialog is type68/version1, with original88-byte constructor allocation/tag0xc4, final vtable206861cc and wrapper20685f54. Constructor order is base -> finalvtable -> enumcontainer/currentTradeCategory@207bd4c4 -> TalkingTo proxy+30 -> TalkedToBy list+4c. Boolean/float fields remain uninitialized until descriptor defaults. Defaults set booleans/floatzero; enumCreate re-reads the current masked global. PostInitialize calls inherited RefBase's literal1, Reserve(0,-1), then clears list count and assigns a temporaryNULL entity proxy before its destruction. The current fresh empty list needs no heap callback.

Party is type77/version1, with original72-byte allocation/tag0xc4, finalvtable20697834 and wrapper206975bc. Constructor order is base -> finalvtable -> PartyLeader proxy+14 -> enumcontainer/currentPartyMemberType@207c1414 -> members list+3c. Its proxy descriptor default only resolves the field address and performs no reset; Waiting defaultsfalse, enumCreate reads the mutable global, and inherited PostInitialize returns1. Native Read always consumesu16; onlyversion1 reads members through the original prefixu8/countu32 routine. Counts, capacity and proxy ID bytes occupy the same retained store. Nonempty reserve/tail lifetime/element reads stop at original call boundaries instead of manufacturing elements. Bounds use the native signed count comparisons; this is not a hostile-input hardened archive decoder.

Hero packet14 is140bytes and packet16 is78bytes including their four-byte sentinels. The winning SysDyn world hash, offsets, every focused payload, registrar order, names/offsets/vtables/default/read/address-getter methods and original PE instruction bytes are audited. Every captured instruction lies inside its function's original inclusive CSV body ranges; all body bytes, including discontiguous ranges, must be covered before dependency closure or evidence publication. Adjacent functions are excluded. The current Party native tail is01000100000000 (version1,prefix1,count0); Dialog tail is0100. Native reader versions are consumed in order without a synthetic inherited Read or size-based seeking. Raw float/enum payloads retain all IEEE/integer bits. Boolean read uses the existing canonical0/1 input profile. Mutable enum values can remain partially unknown before the actual Hero descriptor overwrites them.

The proxy port follows original default constructor, Read, assignment, Entity*-NULL/nonNULL SetEntity and GetEntity cache gates. ID equality uses16bytes; stream reads discard the final cacheDWORD and assignment zeroes it. Source reference Add/Release operations retain captured/current receiver ordering. NULL/invalid fresh GetEntity returnsNULL without an invented resolver. NonNULL QueryEntityProxyInternal, cached GetEntity and virtual ResolveEntity are required actual service capabilities at their original sites. Numeric heap address bits remain masked. No terminal wrapper/class destructor or nonempty proxy-list memory implementation is claimed.

Both classes inherit original Added/Removed/PostRead literalRET callbacks. Dialog IsProcessable istrue; its PreProcess is literalRET and Process forwards to inherited literalRET. Party IsProcessable isfalse and its process phases are inheritedRET; Party OnChildrenAvailable is an own literalRET. Both notification chains re-read the actual owner twice and only read its existing Modified timestamp. Factory/read/callback reentry latches a failure, preserving already applied/attempted prefixes and blocking automatic replay. Descriptor address resolution happens after Enter and the native receiver is independently fetched before Exit. Missing services are explicit; they are not skipped.

Reproduce the offline audit from the repository root:

```
python tools/gothic3/research_dialog_party_reading.py --study "<absolute Gothic3_Decompiled_Study_2026-10-04 path>"
```

The producer only reads immutable original study/resources and writes the two owned namespaces. It never executes native binaries, tests, builds, browser or remote operations. Its self-excluding receipt pins current implementation, producer/helper sources and all outputs; historical namespace receipts are unchanged. The evidence includes supporting generic reflection/helper bodies and unported exported methods, so audited-body totals are not a count of fully implemented game behaviors.
'''
 for base in (OUT,PUBLIC):(base/'README.md').write_text(readme,encoding='utf8',newline='\n')
 if not args.capture_only:
  imported=[Path(module.__file__).resolve() for module in list(sys.modules.values()) if getattr(module,'__file__',None) and Path(module.__file__).resolve().parent==ROOT/'tools/gothic3' and Path(module.__file__).suffix=='.py']
  deps=[ROOT/'src/gothic3/dialog-party-reading.ts',ROOT/'src/gothic3/entity-reflection.ts',ROOT/'src/gothic3/entity-lifecycle.ts',ROOT/'src/gothic3/entity-reading.ts',ROOT/'src/gothic3/native-properties.ts',schema_path,candidate_path,Path(__file__).resolve(),*imported]
  owned=[path for base in (OUT,PUBLIC) for path in base.rglob('*') if path.is_file() and path.name!='implementation-receipt.json']
  receipt={'schema':'gothic3-dialog-party-reading-implementation-receipt-v1','baseline':'fd804884','checksActuallyPerformed':['offline original PE instruction-byte audit','complete inclusive original function-body range coverage and attribution audit','offline current Hero packet audit','current implementation/dependency/output hash audit'],'noNativeCodeExecution':True,'noTestsOrBuildRunByProducer':True,'audit':audit,'files':[{'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':sha(path)} for path in sorted(set(deps+owned))]}
  for base in (OUT,PUBLIC):save_json(base/'implementation-receipt.json',receipt)
 print(json.dumps({'audit':audit,'receiptSha256':None if args.capture_only else sha(OUT/'implementation-receipt.json')}))

if __name__=='__main__':main()
