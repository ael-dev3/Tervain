"""Recover original Illuminated construction and current Hero reading offline."""
from __future__ import annotations
import argparse,csv,hashlib,json,re,shutil,struct,sys
from pathlib import Path
from research_native_combat import PE,save_json,sha
from bounded_native_capture import collect
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import INPUTS,SELECT as REFLECTION_SELECT,pin_vtable,WORLD_PATH,WORLD_SHA
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/gothic3/illuminated-reading';PUBLIC=ROOT/'public/gothic3/illuminated-reading'
PROFILE={'heroIndex':15,'type':74,'version':8,'nativeBytes':188,'nativeVtable':'30844dc4','wrapperVtable':'30844f5c','constructor':'30222eb0','create':'30222a50','invalidate':'30222bd0','postInitialize':'30222a70','nativeRead':'30222ca0','root':'30748c70','clone':'30228690','initialize':'30225fc0','attach':'30223ad0','defaults':'30227df0','wrapperRead':'30224fa0','dataRead':'302292d0'}
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--study',type=Path,required=True);ap.add_argument('--capture-only',action='store_true');args=ap.parse_args();study=args.study.resolve()
 OUT.mkdir(parents=True,exist_ok=True);PUBLIC.mkdir(parents=True,exist_ok=True)
 pes={};inputs={};rows={}
 for module,(directory,filename,expected) in INPUTS.items():
  path=study/'00_Original_Runtime'/filename
  if sha(path)!=expected:raise ValueError('Original PE hash differs '+module)
  pes[module]=PE(path);inputs[module]={'path':'00_Original_Runtime/'+filename,'bytes':path.stat().st_size,'sha256':expected}
  rows[module]={r['address']:r for r in csv.DictReader((study/'01_Decompiled_Code'/directory/'functions.csv').open(encoding='utf-8-sig',newline=''))}
 maps={k:exports(v)for k,v in pes.items()};imports={k:native_imports(v)for k,v in pes.items()};functions={};instructions={}
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
 capture('SharedBase',REFLECTION_SELECT['SharedBase'])
 getters=[{'symbol':name,'entry':f'{address:08x}'}for name,address in maps['Engine'].items()if name.startswith('?Get')and '@eCIlluminated_PS@@'in name]
 capture('Engine',{g['entry']for g in getters})
 capture('Engine',set(PROFILE[k]for k in ['constructor','create','invalidate','postInitialize','nativeRead','root','clone','initialize','attach','defaults','wrapperRead','dataRead'])|set('300025bd 3003b5bb 3001a091 3002ad10 30037ca4 30222a00 30222a20 302229f0 30223430 30222ff0 302231e0 30223270 30223050 30222c50 30222af0 302230f0 30044f62 300138b3 30016126 3000c2bb 30671690'.split()))
 tables={};needed={k:set()for k in INPUTS}
 def slot(table,offset,module='Engine'):
  entry=next(e for e in table['entries']if e['offset']==offset);target=entry.get('implementation',module+':'+entry['target']);short,address=target.split(':');needed[short].add(address);return target
 native=tables['native']=pin_vtable(pes['Engine'],imports['Engine'],maps,0x30844dc4,0x150)
 wrapper=tables['wrapper']=pin_vtable(pes['Engine'],imports['Engine'],maps,0x30844f5c,0x44)
 dispatch={str(off):slot(native,off)for off in [0,4,0x10,0x18,0x3c,0x40,0x4c,0x50,0x58,0x5c,0x60,0x68,0x84,0x110,0x118,0x120,0x124,0x128,0x12c,0x138,0x13c]}
 wrapper_dispatch={str(off):slot(wrapper,off)for off in [0,4,8,0x14,0x1c,0x28,0x30,0x34,0x38]}
 for module in INPUTS:capture(module,needed[module])
 profile=dict(PROFILE,dispatch=dispatch,wrapperDispatch=wrapper_dispatch)
 schema_path=ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json';schema=json.loads(schema_path.read_text(encoding='utf-8'))
 fields=sorted((f for f in schema['nativePropertyRegistrars']if f['className']=='eCIlluminated_PS'),key=lambda f:f['entry'])
 if len(fields)!=9:raise ValueError('Illuminated original field count differs')
 addresses=[f['entry']for f in fields];at=pes['Engine'].data.find(struct.pack('<I',int(addresses[0],16)))
 sequence=pes['Engine'].data[at:at+56];crt=[f'{x:08x}'for x in struct.unpack('<14I',sequence)]
 if [x for x in crt if x in addresses]!=addresses or crt[-1]!=addresses[-1]:raise ValueError('Complete ordered Illuminated CRT interval differs')
 registrar_order={'module':'Engine','fileOffset':at,'bytes':sequence.hex(),'sha256':hashlib.sha256(sequence).hexdigest(),'entries':crt,'fieldEntries':addresses}
 capture('Engine',{x for x in crt if x in rows['Engine']})
 capture('Engine',{f['entry']for f in fields});runtime_fields=[]
 for field in fields:
  for store in [field['descriptorStore'],field['offsetStore'],field['defaultStore'],field['nameLiteral']]:
   raw=bytes.fromhex(store['bytes'])
   if pes['Engine'].at(int(store['address'],16),len(raw))!=raw:raise ValueError('Original descriptor literal/store differs')
  descriptor=tables.setdefault('descriptor:'+field['vtable'],pin_vtable(pes['Engine'],imports['Engine'],maps,int(field['vtable'],16),0x68))
  runtime_fields.append({'name':field['name'],'typeName':field['cppType'],'nativeOffset':field['nativeOffset'],'registrar':'Engine:'+field['entry'],'reader':slot(descriptor,0x38),'defaultInitializer':slot(descriptor,0x14),'descriptorRead':slot(descriptor,0),'memberAccessor':slot(descriptor,0x64)})
 profile['fields']=runtime_fields;profile['enums']={}
 for name,offset,table_address,global_address in [('StaticIlluminated',24,0x30844b84,0x30ae1c48),('DirectionalShadowType',36,0x30844c5c,0x30ae1c4c)]:
  table=tables['enum:'+name]=pin_vtable(pes['Engine'],imports['Engine'],maps,table_address,0x3c)
  profile['enums'][name]={'offset':offset,'vtable':f'{table_address:08x}','global':f'{global_address:08x}','dispatch':{str(off):slot(table,off)for off in [0x10,0x18,0x1c,0x38]}}
 for module in INPUTS:capture(module,needed[module])
 # Concrete wrapper helpers call internal fresh initialization/default/read bodies.
 capture('Engine',{'300404bc'})
 direct_sources=set(wrapper_dispatch.values())|{'Engine:'+PROFILE[k]for k in ['constructor','create','initialize','attach','defaults','clone']}
 for key in list(direct_sources):
  module,entry=key.split(':');raw=pes[module].at(int(entry,16),5)
  while raw[0]==0xe9:
   entry=f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}';direct_sources.add(module+':'+entry);raw=pes[module].at(int(entry,16),5)
 direct_needed={k:set()for k in INPUTS}
 for key in sorted(direct_sources):
  module=key.split(':')[0]
  for row in instructions[key]:
   match=re.fullmatch(r'CALL 0x([0-9a-f]{8})',row['assembly'])
   if match and match[1]in rows[module]:direct_needed[module].add(match[1])
 for module in INPUTS:capture(module,direct_needed[module])
 # Imports are bound using original import/export tables. Captured services stay
 # boundaries; this does not assert their implementations are runtime ports.
 bindings=[];scanned=set()
 for _ in range(3):
  new=set(instructions)-scanned
  if not new:break
  import_needed={k:set()for k in INPUTS}
  for key in sorted(new):
   scanned.add(key);module=key.split(':')[0]
   for row in instructions[key]:
    m=re.search(r'(?:CALL\s+|JMP\s+|MOV E[A-Z]+,\s*)dword ptr \[0x([0-9a-f]+)\]',row['assembly'])
    if not m:continue
    imp=imports[module].get(int(m[1],16))
    if not imp:continue
    short=imp['library'].removesuffix('.dll');binding={'function':key,'instruction':row,'importSlot':m[1],'import':imp}
    if short in maps:
     entry=f"{maps[short][imp['decoratedName']]:08x}";binding['implementation']=short+':'+entry;import_needed[short].add(entry)
    else:binding['status']='external service; never executed'
    bindings.append(binding)
  for module in INPUTS:capture(module,import_needed[module])
 # Literal/body semantics used by the concrete runtime: actual allocation size,
 # type/version, seven RET Vector4 ctors, post defaults, and native tail extent.
 assertions={'Engine:30225fc0':['PUSH 0xbc'],'Engine:30222aa0':['MOV EAX,0x4a'],'Engine:30222a90':['MOV AX,0x8'],
  'SharedBase:10023c20':['MOV EAX,ECX','RET'],'Engine:30222eb0':['MOV EBX,0x6','ADD EDI,0x10','JNS 0x30222f00','PUSH 0x70'],
  'Engine:30222a70':['MOV EAX,0x1','MOV byte ptr [ECX + 0x2c],0x0','MOV byte ptr [ECX + 0x2e],AL'],
  'Engine:304b2bf0':['LEA EAX,[ECX + 0x14c]'],'Engine:30398d30':['MOV dword ptr [ECX + 0x34],EAX']}
 for key,expected in assertions.items():
  actual=[r['assembly']for r in instructions[key]]
  if any(x not in actual for x in expected):raise ValueError('Illuminated source semantic anchor differs '+key)
 globals_proof=[];pe=pes['Engine']
 for name,container in profile['enums'].items():
  address=int(container['global'],16);global_uses=[{'function':k,'instruction':r}for k,body in instructions.items()for r in body if ('0x'+container['global'])in r['assembly']]
  if not global_uses:raise ValueError('Mutable enum uses absent')
  try:cold={'coldPEBytes':pe.at(address,4).hex()}
  except ValueError:
   header=struct.unpack_from('<I',pe.data,0x3c)[0];optional_size=struct.unpack_from('<H',pe.data,header+20)[0];section_count=struct.unpack_from('<H',pe.data,header+6)[0];rva=address-pe.base;proof=None
   for index in range(section_count):
    pos=header+24+optional_size+index*40;virtual_size,section_rva,raw_size,raw_offset=struct.unpack_from('<IIII',pe.data,pos+8)
    if section_rva+raw_size<=rva and rva+4<=section_rva+virtual_size:
     proof={'headerFileOffset':pos,'headerBytes':pe.data[pos:pos+40].hex(),'virtualSize':virtual_size,'rva':section_rva,'rawSize':raw_size,'rawOffset':raw_offset};break
   if proof is None:raise ValueError('Mutable enum storage not proved')
   cold={'coldPEBytes':None,'storage':'PE virtual zero-fill; live value is not established','sectionProof':proof}
  globals_proof.append({'name':name,'address':container['global'],**cold,'liveValueKnown':False,'consumers':global_uses})
 candidate_path=ROOT/'assets/gothic3/entity-reflection/serialized-candidates.json';candidates=json.loads(candidate_path.read_text(encoding='utf-8'));hero=next(e for e in candidates['entities']if e['name']=='PC_Hero');packet=hero['propertySets'][15]
 original=study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
 if sha(original)!=WORLD_SHA:raise ValueError('Original SysDyn hash differs')
 data=original.read_bytes();raw=data[packet['sourceOffset']:packet['endSourceOffset']+4];tail=data[packet['nativeReadOffset']:packet['endSourceOffset']]
 if packet['className']!='eCIlluminated_PS' or packet['nativeReadVersion']!=8 or len(raw)!=255 or len(tail)!=115 or raw.hex()!=packet['serializedRaw'] or hashlib.sha256(raw).hexdigest()!=packet['serializedSha256'] or tail!=b'\x08\x00\x00'+bytes(112):raise ValueError('Original Hero Illuminated packet differs')
 if [f['name']for f in fields]!=[f['name']for f in packet['properties']]:raise ValueError('Original registered/serialized Illuminated names differ')
 profile['heroSerialized']=packet
 hero_proof={'className':'eCIlluminated_PS','heroIndex':15,'heroRelativeBegin':packet['sourceOffset']-hero['sourceOffset'],'heroRelativeEnd':packet['endSourceOffset']-hero['sourceOffset'],'serializedBytesIncludingSentinel':255,'serializedSha256':packet['serializedSha256'],'nativeTailBytes':115,'nativeTailHex':tail.hex(),'sourcePath':WORLD_PATH,'sourceSha256':WORLD_SHA,'allFocusedSerializedBytesMatchOriginal':True,'registeredNamesEqualSerializedNames':True}
 audit={'selectedNativeBodies':len(functions),'instructions':sum(map(len,instructions.values())),'instructionBytes':sum(len(bytes.fromhex(r['bytes']))for body in instructions.values()for r in body),'allSelectedInstructionBytesMatchOriginalPE':True,'completeOriginalPEBodyRangesCovered':True}
 for getter in getters:
  entry=getter['entry'];raw=pes['Engine'].at(int(entry,16),5)
  while raw[0]==0xe9:entry=f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}';raw=pes['Engine'].at(int(entry,16),5)
  getter['implementation']='Engine:'+entry
 evidence={'schema':'gothic3-illuminated-reading-evidence-v1','inputs':inputs,'nativeCodeExecuted':False,'functions':[functions[k]for k in sorted(functions)],'instructions':instructions,'vtables':tables,'importedSubcalls':bindings,'registrarOrder':registrar_order,'nativePropertyRegistrars':fields,'publicGetters':getters,'semanticAnchors':assertions,'mutableEnumGlobals':globals_proof,'originalHero':hero_proof,'audit':audit}
 rules={'schema':'gothic3-illuminated-reading-rules-v1','inputs':{k:v[2]for k,v in INPUTS.items()},'profile':profile,'boundaries':{'worldResident':False,'freshAllocationOnly':True,'stableRetainedDescriptorReceiver':True,'nativeReadVersions':'ushort>=8; older branches stop after version read','missing':['actual owner embedded frustum item for scene Added/Removed','IlluminationAdmin getter and same physical PS GetEffectedDynamicLights for local Exit with owner','nonNULL LightSet array/light membership/refcount services','nonNULL directional shadow RemoveObject/ReleaseReference','nonNULL occlusion query/render services or state1 shadow image removal','terminal wrapper/native destruction and complete world/render integration']}}
 readme='''# Original Illuminated reading

OriginalIlluminatedReader registers the real eCIlluminated_PS factory (type74/version8), with a retained NativeLivePropertySet and a single188-byte physical store. Original Hero packet15 is [7320,7571),255bytes including the following sentinel, with nine reflective fields and a115-byte native tail. Original field literals are ReciveShadows, ReciveTreeShadows and ReciveStaticShadows: their serialized names match the registered names exactly.

Fresh successful allocation follows original base/ref/entity constructor stores, two embedded enum ObjectBase constructors and concrete vtables, current mutable enum globals, seven source-proven empty Vector4 constructors, pointer/count/query defaults, then Create, Attach/reference handoff, descriptor defaults and PostInitialize. Absent live enum capture leaves copied numeric bits masked unknown, not inferred from cold PE zero-fill. PostInitialize sets seven bools in source order and returns1; it does not call inherited PostInitialize. Unknown padding and uninitialized bits remain masked. Numeric heap addresses are unknown while separate initialized physical pointer capabilities retain NULL/nonNULL identity.

Descriptor readers consume version/size without forced seek, notify Enter(true), resolve the retained native receiver after Enter, consume actual bool/enum payload, independently check the native receiver before Exit(true). The selected stable retained receiver profile rejects replacement. Current native Read consumes ushort version8, one byte static-light count and ONE112-byte bulk directly into the same shader block, then copies ReciveStaticShadows from ReciveShadows and CastStaticShadows from CastShadows. Versions>=8 use that proved same branch; older conversion branches stop after consuming version. Shader bytes and masks are stable physical subviews, preserving raw IEEE bits rather than a second light projection.

The inherited notification wrapper and inherited OnNotify hooks separately reread the actual live owner Modified value. Local Exit with an owner obtains the actual illumination admin and calls GetEffectedDynamicLights on this same captured PS before inherited Exit. A missing service stops at that native call with the attempted/completed prefix retained. Propagated Hero reads skip the illumination-admin branch. Added binds the actual owner's stable embedded FrustumItem+14c/illuminationPS+34; Removed first performs virtual CacheOut and then rereads the owner to clear that same embedded slot. A NULL owner is a required original dereference boundary, not successful no-op registration.

CacheIn sets needsUpdate1. Fresh NULL/NULL directional-shadow and light-set CacheOut paths are concrete. NonNULL map CacheOut first executes the source query-clearing prefix, then stops at required shadow RemoveObject/refcount services; nonNULL LightSet stops at GetEffectedDynamicLights before array/light membership/refcount effects. NonNULL occlusion queries stop before RenderSystemAdmin; state1/nonNULL shadow query clearing stops before GetImage. Invalidate and ClearStaticLightData execute only their actual ordered stores; Invalidate does not clear material-list/shadow/occluded slots. UpdatedWorldMatrix sets needsUpdate1 for a NULL light set; a nonNULL light set requires its original live light array and per-light virtual180 service. IsProcessable is inherited false; Process/Pre/Post/PostRead are source-proven RET bodies. Full UpdateIllumination, active scene/render services, terminal allocation destruction and world residency remain unimplemented dependencies. Direct pointer-slot writes are physical service storage only, not native AddReference/SetLightSet substitutes. Public callbacks/read paths reject reentry, and base owner/wrapper/flags/refword setters guard before mutation.

The offline producer captures complete inclusive catalog body ranges globally, including discontiguous ranges, verifies every instruction against immutable PE bytes and pins full-range/body hashes. It closes forwarding JMP chains, pins native/wrapper/enum/descriptor dispatch and import/export bindings, full CRT field order with intervening enum registration entries, exact registrar literals/stores, semantic anchors, mutable-global section evidence and original focused Hero bytes. Current receipts pin actual runtime/producer/imported helpers/metadata/output bytes and exclude themselves. No native programs, tests, builds, browsers, remotes or Actions are run by this producer. A successful detached factory/read does not establish actual scene or render residency.
'''
 for base in [OUT,PUBLIC]:(base/'README.md').write_text(readme,encoding='utf-8',newline='\n')
 for name,value in [('native-evidence.json',evidence),('runtime-rules.json',rules)]:save_json(OUT/name,value);save_json(PUBLIC/name,value)
 expected_sources={Path(f[x])for f in functions.values()for x in ['cExcerpt','assemblyExcerpt']}
 for base in [OUT,PUBLIC]:
  for path in (base/'sources').rglob('*'):
   if path.is_file()and path.relative_to(base)not in expected_sources:
    if not path.resolve().is_relative_to(base.resolve()):raise ValueError('Cleanup escapes namespace')
    path.unlink()
 for relative in sorted(expected_sources):dest=PUBLIC/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(OUT/relative,dest)
 if not args.capture_only:
  imported=[Path(m.__file__).resolve()for m in list(sys.modules.values())if getattr(m,'__file__',None)and Path(m.__file__).resolve().parent==ROOT/'tools/gothic3'and Path(m.__file__).suffix=='.py']
  deps=[ROOT/'src/gothic3/illuminated-reading.ts',ROOT/'src/gothic3/entity-reflection.ts',ROOT/'src/gothic3/entity-lifecycle.ts',ROOT/'src/gothic3/entity-reading.ts',ROOT/'src/gothic3/native-properties.ts',schema_path,ROOT/'assets/gothic3/entity-reflection/serialized-candidates.json',Path(__file__).resolve(),*imported]
  deps+=[ROOT/('assets/gothic3/'+namespace+'/runtime-rules.json')for namespace in ['entity-reflection','entity-lifecycle','entity-reading','properties']]
  deps+=[ROOT/('assets/gothic3/'+namespace+'/manifest.json')for namespace in ['entity-reflection','entity-lifecycle']]
  owned=[p for base in [OUT,PUBLIC]for p in base.rglob('*')if p.is_file()and p.name!='implementation-receipt.json']
  receipt={'schema':'gothic3-illuminated-reading-implementation-receipt-v1','baseline':'42c7149a9b08a3b224df0592d02585f1a535e351','checksActuallyPerformed':['offline original PE instruction/body/range-byte audit','offline original Hero packet/native-tail audit','offline source/output hash audit'],'noNativeCodeExecution':True,'noTestsOrBuildRunByProducer':True,'audit':audit,'files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}for p in sorted(set(deps+owned))]}
  save_json(OUT/'implementation-receipt.json',receipt);save_json(PUBLIC/'implementation-receipt.json',receipt)
 print(json.dumps({'audit':audit,'receiptSha256':None if args.capture_only else sha(OUT/'implementation-receipt.json')}))
if __name__=='__main__':main()
