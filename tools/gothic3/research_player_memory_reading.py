"""Offline bounded original PlayerMemory factory, map, read and lifetime proof.

The frozen player-memory-loading checkpoint is a historical dependency, never
an output. All focused Hero byte and string checks are repeated on original
world data. No original DLL is executed or loaded as a program.
"""
from __future__ import annotations
import argparse, hashlib, json, re, struct
from pathlib import Path
from research_attribute_reading import CaptureSession, ROOT, write_outputs
from research_entity_reflection import INPUTS, WORLD_PATH, WORLD_SHA
from research_native_combat import sha
from read_gameplay_properties import _genome_strings

OUT=ROOT/'assets/gothic3/player-memory-reading'
PUBLIC=ROOT/'public/gothic3/player-memory-reading'
METHODS={'gCPlayerMemory_PS','Create','Invalidate','GetVersion','GetPropertySetType','PostInitializeProperties','OnPostRead','Read','ReadSaveGame','ReadAttributes','ReadAttributesV3','ReadAttributesV4','DestroyAttributes','CreateAttributes','CreateAttrib','CreateStat'}

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--study',type=Path,required=True);ap.add_argument('--capture-only',action='store_true');args=ap.parse_args();session=CaptureSession(args.study,OUT)
 schema_path=ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json';candidate_path=ROOT/'assets/gothic3/entity-reflection/serialized-candidates.json';seed_path=ROOT/'assets/gothic3/player-properties/seed-evidence.json'
 schema=json.loads(schema_path.read_text(encoding='utf8'));candidate=json.loads(candidate_path.read_text(encoding='utf8'));seed=json.loads(seed_path.read_text(encoding='utf8'))
 descriptors=sorted((f for f in schema['nativePropertyRegistrars'] if f['className']=='gCPlayerMemory_PS'),key=lambda f:f['entry']);hero=next(e for e in candidate['entities'] if e['name']=='PC_Hero')['propertySets'][13]
 if len(descriptors)!=25 or descriptors[-1]['name']!='IsConsumingItem' or descriptors[-1]['nativeOffset']!=164:raise ValueError('Original PlayerMemory 25 registrar profile differs')
 selected={r['address'] for r in session.catalog['Game'].values() if r['status']=='decompiled' and r['qualified_name'].startswith('gCPlayerMemory_PS::') and r['qualified_name'].split('::')[-1] in METHODS}
 selected.update(f['entry'] for f in descriptors);selected.update('205184d0 20327f10 20328880 20328570 20320970 20328200 2031f540 20327550 203205f0 2031e9c0 2031e440 20320a30 20320af0 20320b80'.split());session.capture('Game',selected)
 session.capture('SharedBase',{'10002c7a','10087ad0','1000708b','10013210','100022d4','1000551a','1000574f'})
 tables={'native':session.table('Game','PlayerMemory:native','2069845c',0x150,{0,4,8,0x10,0x14,0x18,0x20,0x3c,0x40,0x4c,0x50,0x58,0x5c,0x60,0x68,0x84,0x120,0x124,0x128,0x12c,0x138,0x13c}),'WeaponConfig':session.table('Game','WeaponConfig','20697bc4',0x3c)}
 root_body=session.instructions['Game:205184d0'];vtable_stores=[r for r in root_body if re.fullmatch(r'MOV dword ptr \[0x[0-9a-f]+\],0x206[0-9a-f]+',r['assembly'])]
 if len(vtable_stores)!=1:raise ValueError('PlayerMemory root wrapper store differs')
 m=re.fullmatch(r'MOV dword ptr \[0x([0-9a-f]+)\],0x([0-9a-f]+)',vtable_stores[0]['assembly']);root_object,wrapper_vtable=m[1],m[2];tables['wrapper']=session.table('Game','PlayerMemory:wrapper',wrapper_vtable,0x44)
 fields=[];default_facts={}
 types={p['name']:p['type'] for p in hero['properties']};types['IsConsumingItem']='bool'
 for old in descriptors:
  field=session.registrar('Game',old['entry'],'gCPlayerMemory_PS',old['name'],old['nativeOffset']);field['typeName']=types[field['name']]
  for key in ('descriptorStore','offsetStore','defaultStore'):
   row=old[key]
   if row not in session.instructions['Game:'+old['entry']] or session.pes['Game'].at(int(row['address'],16),len(bytes.fromhex(row['bytes']))).hex()!=row['bytes']:raise ValueError('Original registrar attribution/store differs')
  if field['vtable']!=old['vtable'] or field['descriptor']!=old['descriptor']:raise ValueError('Original descriptor table identity differs')
  target=field['defaultInitializer'];name=field['name'];typ=field['typeName']
  if target=='Game:20321f70':fact={'behavior':'write zero byte at actual descriptor-resolved destination','value':False,'bytes':'00'}
  elif target in {'Game:20323580','Game:20325030','Game:203258d0'}:fact={'behavior':'write zero DWORD at actual descriptor-resolved destination','value':0,'bytes':'00000000'}
  elif target in {'Game:20322670','Game:20322ac0','Game:20322f50'}:fact={'behavior':'tail JMP actual descriptor addressGetter +0x64 only; no payload mutation','payloadWritten':False,'freshEmptyHeaderFromConstructor':True}
  elif target=='Game:20323ee0':fact={'behavior':'dispatch actual embedded container +0x18; 20320a30 copies mutable global207c1578','liveValueKnown':False,'liveGlobal':'207c1578'}
  elif target=='Game:20324780':fact={'behavior':'actual bCPropertyID::CreateRandom on descriptor-resolved destination','requiresService':'actual random PropertyID generator; no inferred all-zero ID'}
  else:raise ValueError('PlayerMemory default source profile unrecognized: '+target)
  fact.update({'source':target,'nativeOffset':field['nativeOffset'],'typeName':typ});default_facts[name]=fact;field['defaultBehavior']=fact;fields.append(field)
 order=session.order('Game',[f['entry'] for f in descriptors]);session.close(set(session.instructions),2)
 # The actual allocation calls the fresh exported ctor; the copy overload
 # remains distinct and is not substituted when construction is implemented.
 allocation=session.instructions['Game:20327f10']
 if not all(any(r['assembly']==asm for r in allocation) for asm in ('PUSH 0xb8','PUSH 0xc4','CALL 0x20036cdc')) or session.final('Game','20036cdc')!='Game:2031e9c0' or session.final('Game','2000cce3')!='Game:2031e440':raise ValueError('Original fresh allocator/constructor/copy distinction differs')
 for ident,assemblies in {'Game:20328880':('PUSH 0x10','PUSH 0x190'),'Game:20327550':('PUSH 0x2b',),'Game:2031e700':('PUSH 0xc','PUSH 0x199')}.items():
  if not all(any(r['assembly']==asm for r in session.instructions[ident]) for asm in assemblies):raise ValueError('Original PlayerMemory wrapper/map/node resource literal differs: '+ident)
 runtime=ROOT/'src/gothic3/player-memory-reading.ts';hash_runtime=ROOT/'src/gothic3/cstring-hash.ts';before_markers=set(session.instructions);markers=[] if args.capture_only else session.runtime_markers([runtime,hash_runtime]);session.close(set(session.instructions)-before_markers,2)
 # Current mutable enum state cannot be obtained from a cold image. Pin
 # either raw storage or the real original virtual zero-fill section header.
 pe=session.pes['Game'];address=0x207c1578;uses=[{'function':ident,'instruction':r} for ident,body in session.instructions.items() for r in body if ident.startswith('Game:') and '[0x207c1578]' in r['assembly']]
 if not uses:raise ValueError('No actual WeaponConfig mutable-global consumer captured')
 try:global_storage={'fileBacked':True,'coldPEBytes':pe.at(address,4).hex()}
 except ValueError:
  header=struct.unpack_from('<I',pe.data,0x3c)[0];base=header+24+struct.unpack_from('<H',pe.data,header+20)[0];count=struct.unpack_from('<H',pe.data,header+6)[0];proof=None
  for i in range(count):
   at=base+i*40;virtual,rva,raw,raw_at=struct.unpack_from('<IIII',pe.data,at+8)
   if pe.base+rva+raw<=address and address+4<=pe.base+rva+virtual:proof={'headerFileOffset':at,'headerBytes':pe.data[at:at+40].hex(),'virtualBytes':virtual,'rva':rva,'rawBytes':raw,'rawFileOffset':raw_at};break
  if proof is None:raise ValueError('Mutable enum has no original file/virtual storage proof')
  global_storage={'fileBacked':False,'coldPEBytes':None,'storage':'original PE virtual zero-fill, not initialized file bytes','sectionProof':proof}
 global_proof={'address':'207c1578',**global_storage,'liveValueKnown':False,'consumers':uses}
 empty=session.pes['SharedBase'].at(0x100e5e3c,1)
 if empty!=b'\0':raise ValueError('CString original empty literal differs')
 empty_literal={'module':'SharedBase','address':'100e5e3c','bytes':'00','meaning':'actual GetText empty fallback NUL; not decoded encoding inference','source':'SharedBase:10013210'}
 original=session.study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
 if sha(original)!=WORLD_SHA:raise ValueError('Original world differs')
 world=original.read_bytes();strings,boundary,genome=_genome_strings(world)
 if strings.strings!=candidate['strings']:raise ValueError('Original independently decoded indexed string table differs')
 raw=world[hero['sourceOffset']:hero['endSourceOffset']+4];native=world[hero['nativeReadOffset']:hero['endSourceOffset']]
 if hero['className']!='gCPlayerMemory_PS' or len(raw)!=1617 or len(native)!=1125 or raw.hex()!=hero['serializedRaw'] or hashlib.sha256(raw).hexdigest()!=hero['serializedSha256'] or struct.unpack_from('<HI',native)!=(5,15):raise ValueError('Original Hero PlayerMemory packet/current read profile differs')
 fresh_checks=[]
 for old in seed['byteChecks']:
  stored=bytes.fromhex(old['raw']);fresh=world[old['sourceOffset']:old['sourceOffset']+old['bytes']]
  if fresh!=stored or len(fresh)!=old['bytes']:raise ValueError('Original focused attribute bytes differ: '+old['label'])
  fresh_checks.append({**old,'raw':fresh.hex(),'freshOriginalRead':True})
 if len(fresh_checks)!=197:raise ValueError('Focused nested attribute check count differs')
 for index,value in seed['stringReferences'].items():
  if strings.strings[int(index)]!=value:raise ValueError('Original indexed attribute string differs')
 names=[p['name'] for p in hero['properties']]
 if len(names)!=24 or 'IsConsumingItem' in names or set(names)!={f['name'] for f in fields[:-1]}:raise ValueError('Original serialized 24/registered25 membership differs')
 profile={'nativeBytes':184,'allocationTag':196,'propertyType':60,'nativeVtable':'2069845c','wrapperVtable':wrapper_vtable,'rootRegistrar':'Game:205184d0','rootObject':root_object,'constructor':'Game:2031e9c0','constructorExport':'Game:20036cdc','copyConstructorExport':'Game:2000cce3','copyConstructor':'Game:2031e440','copyConstructorIsFresh':False,'allocator':'Game:20327f10','wrapperClone':'Game:20328880','initialize':'Game:20328570','attach':'Game:2031f540','wrapperRead':'Game:20320970','dataRead':'Game:20328200','nativeVersion':5,'nativeObjectVersion':6,'getVersion':6,'nativeReadVersion':5,'fields':fields,'heroSerialized':hero}
 methods={}
 for r in session.catalog['Game'].values():
  if r['address'] in selected and r['qualified_name'].startswith('gCPlayerMemory_PS::'):
   method=r['qualified_name'].split('::')[-1]
   if method not in {'gCPlayerMemory_PS'}:methods[method]=session.final('Game',r['address'])
 profile.update(methods)
 profile['wrapperBytes']=16;profile['wrapperAllocationTag']=400;profile['map']={'constructor':'Game:20327550','nativeOffset':168,'headerBytes':16,'bucketCount':43,'freshCapacity':51,'nodeBytes':12,'nodeAllocationTag':409,'nodeLayout':{'keyCString':0,'nativeAttributePointer':4,'next':8},'freshCapacityDerivation':'43 requested plus minimum growth8 at old capacity0; source203205f0'}
 for ident,assembly in ((methods['GetPropertySetType'],'MOV EAX,0x3c'),(methods['GetVersion'],'MOV AX,0x6')):
  if not any(r['assembly']==assembly for r in session.instructions[ident]):raise ValueError('Original PlayerMemory type/version literal differs')
 literals={'propertyType':{'export':'Game:20032641','implementation':methods['GetPropertySetType'],'value':60,'exportInstruction':session.instructions['Game:20032641'][0],'bodyInstructions':session.instructions[methods['GetPropertySetType']]},'getVersion':{'export':'Game:200040bb','implementation':methods['GetVersion'],'value':6,'exportInstruction':session.instructions['Game:200040bb'][0],'bodyInstructions':session.instructions[methods['GetVersion']]},'selectedOriginalHeroReadVersion':{'value':5,'sourceOffset':hero['nativeReadOffset'],'originalBytes':native[:2].hex(),'reader':methods['Read']}}
 focused={'Game:2031e9c0','Game:2031e440','Game:20320a30','Game:20327f10','Game:20328880','Game:20328570','Game:20320970','Game:20328200',*methods.values(),*[f['defaultInitializer'] for f in fields],*[f['reader'] for f in fields]}
 data_proofs=session.data_proofs(focused)
 audit={**session.audit(),'nativeRegistrars':25,'serializedFields':24,'serializedAttributes':15,'originalNestedAttributeByteChecks':197,'packetBytes':1617,'nativeReadBytes':1125,'indexedStringTableIndependentlyDecoded':True}
 evidence={'schema':'gothic3-player-memory-reading-evidence-v1','nativeCodeExecuted':False,'inputs':session.inputs,'functions':[session.functions[k] for k in sorted(session.functions)],'instructions':session.instructions,'vtables':session.tables,'classVtables':tables,'nativePropertyRegistrars':fields,'registrarOrder':order,'defaultSourceFacts':default_facts,'freshConstruction':profile,'importedSubcalls':session.bindings,'runtimeSourceAttribution':markers,'focusedLiteralAndDataStorageProofs':data_proofs,'installedLiterals':literals,'mutableWeaponConfigGlobal':global_proof,'CStringEmptyLiteral':empty_literal,'CStringHashRule':{'source':'SharedBase:10087ad0','getTextSource':'SharedBase:10013210','signedCharacter':'original MOVSX; physical character/NUL bytes and known mask required','accumulator':'uint32 multiply33 plus signed char','helperExecuted':False},'originalHero':{'sourcePath':WORLD_PATH,'sourceSha256':WORLD_SHA,'packet':hero,'nativeReadRaw':native.hex(),'nativeReadBytes':1125,'attributeCount':15,'originalNestedRecord':seed['originalPlayerMemoryRecord'],'focusedByteChecks':fresh_checks,'stringReferences':seed['stringReferences'],'stringTableBoundary':boundary,'stringTableIndependentlyDecoded':True,'genome':genome,'allFocusedSerializedBytesMatchOriginal':True},'audit':audit,'scope':'Bounded source entries and supporting services are evidence, not implemented feature counts.'}
 rules={'schema':'gothic3-player-memory-reading-rules-v1','nativeCodeExecuted':False,'inputs':{k:v[2] for k,v in INPUTS.items()},'classes':{'gCPlayerMemory_PS':profile},'fields':fields,'nativeBytes':184,'allocationTag':196,'propertyType':60,'wrapperVtable':wrapper_vtable,'nativeVersion':5,'nativeReadVersion':5,'nativeObjectVersion':6,'getVersion':6,'sources':{'clone':profile['wrapperClone'],'create':methods['Create'],'wrapperRead':profile['wrapperRead'],'dataRead':profile['dataRead']},'hero':hero,'nativePropertyDefaults':default_facts,'freshConstruction':profile,'mutableWeaponConfigGlobal':global_proof,'originalNestedRecord':seed['originalPlayerMemoryRecord'],'profile':{'worldResident':False,'detached':True,'freshSuccessfulAllocation':True,'numericNativePointersMasked':True,'nativeCodeExecuted':False,'serializedFieldOmission':'registered IsConsumingItem preserves actual native default false','frontendRequiredServices':['real memory/reallocation and map-node ownership','actual CString/header/refcount read, copy, hash and destroy','actual PropertyID random generator','current mutable WeaponConfig global','actual localization/GetText/log callbacks','native/wrapper/creator/accessor reference boundaries and terminal destruction'],'sharedConsumers':'startup, HUD and combat must retain this same map and actual NativeAttribute objects','orderedRead':'construct and PostInitialize defaults; reflected stored fields; destroy original attributes; source map/read/node/reference/log operations; CreateAttributes fallback; enclosing OnPostRead later'}}
 readme='''# Original PlayerMemory reading

This bounded detached factory/read reconstruction uses the real 184-byte
tag-0xc4 fresh allocation 20327f10 → 20036cdc → 2031e9c0. The copy constructor
2000cce3 → 2031e440 is distinct. Original PE registration order proves 25
fields; the original Hero property table stores 24, leaving IsConsumingItem
at its actual false default. The 1,617-byte Hero packet has a 1,125-byte native
version 5 read containing 15 attributes. The native GetVersion export returns
6 and the property set selector returns 60; their original forwarding and
body bytes are audited independently. All 197 focused nested record checks
and their independently decoded indexed strings are freshly compared with
the original world; prior seeds and cloned excerpts do not substitute for
these reads.

Actual descriptor defaults are pinned separately: bool/scalar zero writes,
array destination getters without payload mutation, random PropertyID creation
and mutable WeaponConfig copying. The live enum value is not inferred from
cold PE or virtual zero-fill storage. CString hashing consumes actual physical
character/NUL bytes with known mask, uses signed MOVSX characters and uint32
multiply33, and has an original file-backed empty literal proof. The pure
helper is source code, never evidence of native execution.

Construction and loading retain real map nodes, CString/header/refcounts,
NativeAttribute references and the same objects used by startup/HUD/combat.
Frontend use requires actual memory/reallocation, PropertyID, mutable-global,
localization, logging and terminal-lifetime services at their source callbacks.
The factory/read profile remains detached; this checkpoint does not establish
world residency, complete progression or a native game playthrough.

All cataloged excerpts use complete inclusive original PE body ranges,
including discontiguous ranges. Supporting captured source entry counts are
not implemented feature counts. Reproduce with `python -B
tools/gothic3/research_player_memory_reading.py --study $study --capture-only`
while runtime work is active; omit --capture-only only after runtime freeze.
The self-excluding current receipt then pins runtime, producers, imported
helpers, source dependencies and owned outputs. No native code, tests, build,
browser, remotes or Actions run.
'''
 deps=[Path(__file__).resolve(),runtime,hash_runtime,ROOT/'src/gothic3/attribute-reading.ts',schema_path,candidate_path,seed_path,ROOT/'tools/gothic3/research_player_memory_loading.py',ROOT/'assets/gothic3/player-memory-loading/loading-contract.json',ROOT/'assets/gothic3/player-memory-loading/evidence-receipt.json',ROOT/'assets/gothic3/attribute-reading/runtime-rules.json',*[ROOT/'src/gothic3'/n for n in ('entity-reflection.ts','entity-lifecycle.ts','entity-reading.ts','native-properties.ts','player-state.ts','player-properties.ts')],*[ROOT/'assets/gothic3'/n/'runtime-rules.json' for n in ('entity-reflection','entity-lifecycle','entity-reading','properties')]]
 receipt=write_outputs(session,'player-memory-reading',PUBLIC,evidence,rules,readme,deps,args.capture_only);print(json.dumps({'audit':audit,'receiptSHA':receipt}))

if __name__=='__main__':main()
