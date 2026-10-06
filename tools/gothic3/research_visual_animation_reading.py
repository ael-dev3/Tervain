"""Offline exact-body VisualAnimation and immediate ClothEffector evidence.

Reads immutable original PEs, study text and the original Hero packet. Native
programs, tests, browsers, builds and remote operations are never executed.
"""
from __future__ import annotations
import argparse, csv, hashlib, json, re, shutil, struct, sys
from pathlib import Path
from bounded_native_capture import collect
from research_native_combat import PE, cblocks, save_json, sha
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import INPUTS, SELECT, pin_vtable, WORLD_PATH, WORLD_SHA
from read_gameplay_properties import Cursor, _genome_strings

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/gothic3/visual-animation-reading'
PUBLIC=ROOT/'public/gothic3/visual-animation-reading'
CLASSES=('eCVisualAnimation_PS','eCSpringAndDamperEffector','eCEffector')

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--study',type=Path,required=True);parser.add_argument('--capture-only',action='store_true');args=parser.parse_args();study=args.study.resolve()
 for base in (OUT,PUBLIC):base.mkdir(parents=True,exist_ok=True)
 pes,inputs,catalog={},{},{}
 for short,(directory,filename,expected) in INPUTS.items():
  path=study/'00_Original_Runtime'/filename
  if sha(path)!=expected:raise ValueError('Original module hash differs: '+short)
  pes[short]=PE(path);inputs[short]={'path':'00_Original_Runtime/'+filename,'bytes':path.stat().st_size,'sha256':expected}
  with (study/'01_Decompiled_Code'/directory/'functions.csv').open(encoding='utf-8-sig',newline='') as file:catalog[short]={r['address']:r for r in csv.DictReader(file)}
 imports={s:native_imports(p) for s,p in pes.items()};maps={s:exports(p) for s,p in pes.items()};functions,instructions={},{}
 def capture(short,requested):
  entries={e for e in requested if e in catalog[short]}-{k.split(':')[1] for k in instructions if k.startswith(short+':')}
  if entries:
   bodies,records=collect(study,short,INPUTS[short][0],' '.join(sorted(entries)),pes[short],OUT);functions.update((b['id'],b) for b in bodies);instructions.update(records)
 schema_path=ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json';candidate_path=ROOT/'assets/gothic3/entity-reflection/serialized-candidates.json'
 schema=json.loads(schema_path.read_text(encoding='utf8'));doc=json.loads(candidate_path.read_text(encoding='utf8'));hero=next(e for e in doc['entities'] if e['name']=='PC_Hero')['propertySets'][18]
 descriptors=[dict(r) for r in schema['nativePropertyRegistrars'] if r['className']=='eCVisualAnimation_PS']
 # The non-PS effector registrars are outside the historical PS-only catalog.
 for path in sorted((study/'01_Decompiled_Code/Engine_dll/pseudocode').glob('*.c')):
  for entry,block,line in cblocks(path):
   m=re.search(r'&(eCSpringAndDamperEffector|eCEffector)::ms_PropertyMember_',block)
   if not m or 'RegisterPropertyTemplate' not in block:continue
   prefix=block.split('bCPropertyTypeBase::bCPropertyTypeBase',1)[0];names=re.findall(r'bCString::bCString\([^;]*?,\s*"([^"\n]*)"\)',prefix);typ=re.search(r'bTPropertyType<(.+?)>::',block)
   if not names or not typ:raise ValueError('Effector registrar metadata missing')
   descriptors.append({'module':'Engine','entry':entry,'className':m[1],'name':names[-1],'cppType':typ[1].split(',',1)[1]})
 if [sum(d['className']==c for d in descriptors) for c in CLASSES]!=[31,9,4]:raise ValueError('Original class descriptor totals differ')
 selected={s:set(SELECT.get(s,[])) for s in INPUTS};selected['Engine'].update(d['entry'] for d in descriptors)
 for row in catalog['Engine'].values():
  name=row['qualified_name']
  if any(name.startswith(c+'::') or name.startswith('bTPropertyObject<'+c+',') or name.startswith('bTPropertyObjectType<'+c+',') for c in CLASSES):
   if row['status']=='decompiled':selected['Engine'].add(row['address'])
 selected['Engine'].update('300ae170 300ab6b0 300ae4c0 300bce40 300bcdf0 300bcd20 300bd440 300bed00 300bee20 300bf290 300bf0d0 3009dc50 300a4f30 300a5330 30733810 30762c30 30762fc0'.split())
 selected['Engine'].update('304c4410 300bc660 300bf060 300bef60 300beff0 30020cd4 3000e016 3009d860 3009d870'.split())
 selected['SharedBase'].update('1000277a 100059ed 10003a71 1000873d 10001f05 10007c11 100076f8 10006f41 10005e5c 10006019 10002568 10001186 10005a65'.split())
 for s in INPUTS:capture(s,selected[s])
 for d in descriptors:
  if 'nativeOffset' in d:continue
  stores={};zeros=set()
  for row in instructions['Engine:'+d['entry']]:
   asm=row['assembly'];m=re.fullmatch(r'XOR (E[ABCD]X|ESI|EDI|EBP),\1',asm)
   if m:zeros.add(m[1])
   m=re.fullmatch(r'MOV dword ptr \[0x([0-9a-f]+)\],0x([0-9a-f]+)',asm)
   if m:stores[int(m[1],16)]=(int(m[2],16),row)
   m=re.fullmatch(r'MOV dword ptr \[0x([0-9a-f]+)\],(ESI|EDI|EBX|EBP)',asm)
   if m and m[2] in zeros:stores[int(m[1],16)]=(0,row)
   m=re.match(r'(?:MOV|LEA|POP) (ESI|EDI|EBX|EBP),',asm)
   if m:zeros.discard(m[1])
  vt=[(a,v,r) for a,(v,r) in stores.items() if 0x30000000<=v<0x31000000];offs=[(a,v,r) for a,(v,r) in stores.items() if 0<v<0x10000 and a+4 in stores and stores[a+4][0]==0]
  if len(vt)!=1 or len(offs)!=1:raise ValueError('Effector descriptor stores differ: '+str(d))
  a,v,r=vt[0];o,n,orow=offs[0];d.update(descriptor=f'{a:08x}',vtable=f'{v:08x}',nativeOffset=n,descriptorStore=r,offsetStore=orow,defaultStore=stores[o+4][1])
  literals=[]
  for row in instructions['Engine:'+d['entry']]:
   m=re.fullmatch(r'PUSH 0x([0-9a-f]{8})',row['assembly'])
   if m:
    try:
     if pes['Engine'].cstring(int(m[1],16)).decode('cp1252')==d['name']:literals.append({'address':m[1],'bytes':pes['Engine'].cstring(int(m[1],16)).hex()+'00','instruction':row})
    except (ValueError,UnicodeError):pass
  if not literals:raise ValueError('Effector property name literal absent')
  d['nameLiteral']=literals[0]
 def stored_vtable(entry,static=False):
  hits=[]
  for r in instructions['Engine:'+entry]:
   m=re.fullmatch(r'MOV dword ptr \[(?:ESI|EAX|ECX|0x[0-9a-f]+)\],0x(308[0-9a-f]+)',r['assembly'])
   if m:hits.append(int(m[1],16))
  if len(hits)!=1:raise ValueError('Exact native/wrapper table unresolved: '+entry+str(hits))
  return hits[0]
 classes={};vtables={};field_tables={};needed={s:set() for s in INPUTS}
 def slot(item):
  mod,entry=item.get('implementation','Engine:'+item['target']).split(':')
  if entry in catalog.get(mod,{}):needed[mod].add(entry)
 for c,ctor,root,native_len in [('eCVisualAnimation_PS','300a5330','30733810',0x150),('eCSpringAndDamperEffector','30388300','30762fc0',0x68),('eCEffector','303850a0','30762c30',0x68)]:
  native=pin_vtable(pes['Engine'],imports['Engine'],maps,stored_vtable(ctor),native_len);wrapper=pin_vtable(pes['Engine'],imports['Engine'],maps,stored_vtable(root),0x44);vtables[c]={'native':native,'wrapper':wrapper}
  for table in (native,wrapper):
   for item in table['entries']:
    if table is wrapper or item['offset'] in {0,4,8,0x10,0x14,0x18,0x20,0x3c,0x40,0x4c,0x50,0x58,0x5c,0x60,0x68,0x84,0x120,0x124,0x128,0x12c,0x138,0x13c}:slot(item)
  fields=[];field_tables[c]={}
  for d in [x for x in descriptors if x['className']==c]:
   rows=instructions['Engine:'+d['entry']]
   if any(d[key] not in rows for key in ('descriptorStore','offsetStore','defaultStore')):raise ValueError('Registrar instruction attribution differs')
   if pes['Engine'].cstring(int(d['nameLiteral']['address'],16)).decode('cp1252')!=d['name']:raise ValueError('Native field name differs')
   table=pin_vtable(pes['Engine'],imports['Engine'],maps,int(d['vtable'],16),0x68);field_tables[c][d['name']]=table;slots={x['offset']:x for x in table['entries']}
   for off in (0x14,0x2c,0x38,0x40,0x64):slot(slots[off])
   target=lambda off:slots[off].get('implementation','Engine:'+slots[off]['target'])
   typ=d['cppType'].replace('enum ','').replace('class ','')
   if c=='eCVisualAnimation_PS':typ=next(p['type'] for p in hero['properties'] if p['name']==d['name'])
   fields.append({'name':d['name'],'typeName':typ,'nativeOffset':d['nativeOffset'],'reader':target(0x38),'defaultInitializer':target(0x14),'addressGetter':target(0x64),'registrar':'Engine:'+d['entry']})
  classes[c]={'constructor':'Engine:'+ctor,'rootRegistrar':'Engine:'+root,'nativeVtable':native['address'],'wrapperVtable':wrapper['address'],'fields':fields}
 extra_tables={}
 for name,addr,size in [('LoD',0x30820214,0x3c),('BoneShapeGroup',0x3081f304,0x28),('BoneShapeMaterial',0x3081f3dc,0x28),('SkeletonShapeGroup',0x3081f4b4,0x28)]:
  table=pin_vtable(pes['Engine'],imports['Engine'],maps,addr,size);extra_tables[name]=table
  for item in table['entries']:slot(item)
 for s in INPUTS:capture(s,needed[s])
 bindings=[];seen=set();frontier=set(instructions)
 for depth in range(3):
  needed={s:set() for s in INPUTS}
  for ident in sorted(frontier):
   short=ident.split(':')[0]
   for row in instructions[ident]:
    direct=re.fullmatch(r'(?:CALL|JMP) 0x([0-9a-f]+)',row['assembly'])
    if direct and direct[1] in catalog[short]:needed[short].add(direct[1])
    m=re.search(r'(?:CALL|JMP)\s+dword ptr \[0x([0-9a-f]+)\]',row['assembly'])
    if not m or int(m[1],16) not in imports[short] or (ident,row['address']) in seen:continue
    seen.add((ident,row['address']));imp=imports[short][int(m[1],16)];mod=imp['library'].removesuffix('.dll');binding={'function':ident,'instruction':row,'importSlot':m[1],'import':imp}
    if mod in maps and imp['decoratedName'] in maps[mod]:
     entry=f'{maps[mod][imp["decoratedName"]]:08x}';binding['implementation']=mod+':'+entry;needed[mod].add(entry)
    else:binding['status']='external native service; never executed'
    bindings.append(binding)
  before=set(instructions)
  for s in INPUTS:capture(s,needed[s])
  frontier=set(instructions)-before
  if not frontier:break
 original=study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
 if sha(original)!=WORLD_SHA:raise ValueError('Original winning world differs')
 world=original.read_bytes();packet=world[hero['sourceOffset']:hero['endSourceOffset']+4];tail=world[hero['nativeReadOffset']:hero['endSourceOffset']]
 stream,boundary,genome=_genome_strings(world)
 if stream.strings!=doc['strings']:raise ValueError('Original independently decoded indexed string table differs')
 if hero['className']!='eCVisualAnimation_PS' or len(packet)!=740 or len(tail)!=99 or packet.hex()!=hero['serializedRaw'] or sha_bytes(packet)!=hero['serializedSha256']:raise ValueError('Original Hero Visual packet differs')
 for p in hero['properties']:
  if world[p['sourceOffset']:p['sourceOffset']+p['byteLength']].hex()!=p['raw']:raise ValueError('Original serialized field differs')
 cloth=next(p for p in hero['properties'] if p['name']=='ClothEffector');raw=bytes.fromhex(cloth['raw']);at=0
 def number(fmt):
  nonlocal at
  n=struct.calcsize(fmt);v=struct.unpack_from(fmt,raw,at)[0];at+=n;return v
 version=number('<H');size=number('<I');table_version=number('<H');count=number('<I');cloth_fields=[]
 for i in range(count):
  name=doc['strings'][number('<H')];typ=doc['strings'][number('<H')];fv=number('<H');n=number('<I');b=raw[at:at+n];at+=n;cloth_fields.append({'name':name,'typeName':typ,'fieldVersion':fv,'raw':b.hex()})
 if (version,size,table_version,count)!=(83,208,30,13) or raw[at:].hex()!='3e0027000100':raise ValueError('Original Cloth packet layout differs')
 if [f['name'] for f in cloth_fields]!=[f['name'] for c in ('eCSpringAndDamperEffector','eCEffector') for f in classes[c]['fields']]:raise ValueError('Cloth inherited field order differs')
 # Source markers may identify the exact store instruction inside a body,
 # rather than its entry. Pin each marker to its real inclusive catalog range.
 runtime_path=ROOT/'src/gothic3/visual-animation-reading.ts';runtime_sources=[]
 for label in sorted(set(re.findall(r'(?:Engine|SharedBase|Game):[0-9a-f]{8}',runtime_path.read_text(encoding='utf8')))):
  short,address=label.split(':');va=int(address,16);owners=[]
  for entry,row in catalog[short].items():
   for body_range in row['body_ranges'].split(';'):
    if not body_range:continue
    lo,hi=(int(v,16) for v in body_range.split('-'))
    if lo<=va<=hi:owners.append(entry);break
  if not owners:raise ValueError('Runtime source marker has no real body: '+label)
  capture(short,owners)
  matches=[{'function':short+':'+entry,'instruction':row} for entry in owners for row in instructions[short+':'+entry] if int(row['address'],16)==va]
  if not matches:raise ValueError('Runtime source marker is not an instruction boundary: '+label)
  runtime_sources.append({'source':label,'attribution':matches})
 def literal(entry,assembly):
  hits=[row for row in instructions['Engine:'+entry] if row['assembly']==assembly]
  if len(hits)!=1:raise ValueError('Installed native literal differs: '+entry+' '+assembly)
  return {'function':'Engine:'+entry,'instruction':hits[0]}
 literals={'propertyType100':literal('3009d860','MOV EAX,0x64'),'getVersion64':literal('3009d870','MOV AX,0x40'),
   'processable1':literal('3009db20','MOV AL,0x1'),'LoDByteOnlyCtor':literal('300bee20','MOV byte ptr [ESI + 0x10],AL'),
   'LoDByteOnlySetActor':literal('300bef60','MOV byte ptr [ESI + 0x10],0x0'),'LoDByteOnlyDestroy':literal('300beff0','MOV byte ptr [ESI + 0x10],0x0')}
 constants=[]
 for address,expected in [(0x3081989c,0x3f000000),(0x3081f96c,0x42c80000),(0x3081d830,0x3dcccccd),(0x308198d0,0x3e4ccccd),
   (0x3081f968,0x469ca400),(0x308198e8,0x3a83126f),(0x3081f964,0x3f4ccccd),(0x3081f960,0x7f7fffff),(0x30818434,0x3f800000),
   (0x308205f4,0x40000000),(0x3081842c,0x40800000),(0x308660a4,0x3e800000)]:
  raw=pes['Engine'].at(address,4)
  if struct.unpack('<I',raw)[0]!=expected:raise ValueError('Installed PostInitialize data literal differs')
  uses=[{'function':ident,'instruction':row} for ident in ('Engine:3009dc50','Engine:30388280') for row in instructions[ident] if f'[0x{address:08x}]' in row['assembly']]
  if not uses:raise ValueError('PostInitialize constant has no recorded instruction use')
  constants.append({'module':'Engine','address':f'{address:08x}','bytes':raw.hex(),'uint32':expected,'uses':uses})
 # These globals sit in the mapped virtual tail rather than PE raw data. Pin
 # their original section header/range, without fabricating file-backed bytes
 # or forcing a current mutable value from a loader-time assumption.
 globals=[];pe=pes['Engine'];header=struct.unpack_from('<I',pe.data,0x3c)[0];section_count=struct.unpack_from('<H',pe.data,header+6)[0];section_base=header+24+struct.unpack_from('<H',pe.data,header+20)[0]
 for a in (0x30ada2b8,0x30ada2bc,0x30ada2c0):
  hit=None
  for i in range(section_count):
   pos=section_base+i*40;vs,rva,rawsize,rawat=struct.unpack_from('<IIII',pe.data,pos+8)
   if pe.base+rva<=a and a+4<=pe.base+rva+vs:
    if a-pe.base-rva<rawsize:raise ValueError('Enum global unexpectedly file-backed')
    hit={'sectionName':pe.data[pos:pos+8].rstrip(b'\0').decode('ascii'),'sectionHeaderFileOffset':pos,'sectionHeaderRaw':pe.data[pos:pos+40].hex(),'sectionVA':f'{pe.base+rva:08x}','virtualBytes':vs,'rawBytes':rawsize,'rawFileOffset':rawat}
    break
  if hit is None:raise ValueError('Enum global not in original mapped virtual section')
  globals.append({'module':'Engine','address':f'{a:08x}','fileBacked':False,'originalPESection':hit,'runtimeRule':'current mutable source module global supplied by actual host; no current value inferred from virtual loader storage'})
 native=Cursor(tail,doc['strings']);native_version=native.u16();factory_version=native.u16()
 def read_lod():
  begin=native.pos;version=native.u16();name=native.entry();material=native.unpack('i')[0]
  if version!=4:raise ValueError('Installed Hero LoD version differs')
  return {'tailOffset':begin,'version':version,'fileName':name,'materialSwitch':material}
 main_lod=read_lod();main_facial=read_lod() if native.boolean() else None;part_count=native.u32();parts=[]
 for _ in range(part_count):
  name=native.entry();lod=read_lod();facial=read_lod() if native.boolean() else None;visible=native.boolean();parts.append({'name':name,'main':lod,'facial':facial,'visible':visible})
 motion_prefix=native.u8();motion_count=native.u32();motions=[native.entry() for _ in range(motion_count)];attachment_count=native.u32();box=native.take(24);base_version=native.u16();enabled=native.boolean()
 if (native_version,factory_version,part_count,motion_prefix,motion_count,attachment_count,base_version,enabled,native.pos)!=(64,5,2,1,7,0,2,True,99):raise ValueError('Installed Hero native tail layout differs')
 native_layout={'version':native_version,'factoryVersion':factory_version,'main':main_lod,'facial':main_facial,'parts':parts,'motionPrefix':motion_prefix,'motions':motions,'attachmentCount':attachment_count,'boxRaw':box.hex(),'baseVersion':base_version,'enabled':enabled,'decodedBytes':native.pos}
 if not all(b.get('completeOriginalPEBodyRangesCovered') and b['instructionBytes']==b['bodyBytes'] for b in functions.values()):raise ValueError('Native body coverage incomplete')
 audit={'selectedNativeBodies':len(functions),'instructions':sum(map(len,instructions.values())),'instructionBytes':sum(b['bodyBytes'] for b in functions.values()),'allSelectedInstructionBytesMatchOriginalPE':True,'allInstructionsInsideOriginalPEBodyRanges':True,'allOriginalBodyBytesCoveredByInstructions':True}
 evidence={'schema':'gothic3-visual-animation-reading-evidence-v1','nativeCodeExecuted':False,'testsRun':False,'inputs':inputs,'functions':[functions[k] for k in sorted(functions)],'instructions':instructions,'vtables':vtables,'supportVtables':extra_tables,'descriptorVtables':field_tables,'descriptors':descriptors,'importedSubcalls':bindings,'audit':audit,'runtimeSourceAttribution':runtime_sources,'installedLiterals':literals,'postInitializeDataConstants':constants,'mutableEnumGlobals':globals,'originalHero':{'sourcePath':WORLD_PATH,'sourceSha256':WORLD_SHA,'packetBytes':len(packet),'packetSha256':sha_bytes(packet),'nativeTailBytes':len(tail),'nativeTailRaw':tail.hex(),'allFocusedSerializedBytesMatchOriginal':True,'stringTableBoundary':boundary,'stringTableIndependentlyDecoded':True,'genome':genome,'nativeTailLayout':native_layout},'clothPacket':{'wrapperVersion':version,'declaredBytes':size,'propertyTableVersion':table_version,'fields':cloth_fields,'nativeTailRaw':'3e0027000100'},'scope':'Selected factory/descriptor/lifecycle/LoD/factory/motion bodies and referenced native support are evidence, not a claim that every captured function is ported.'}
 rules={'schema':'gothic3-visual-animation-reading-rules-v1','inputs':{s:v[2] for s,v in INPUTS.items()},'classes':classes,'hero':hero,'cloth':evidence['clothPacket'],'installedLiterals':literals,'nativeTailLayout':native_layout,'profile':{'worldResident':False,'nativeCodeExecuted':False,'canonicalBool':True,'freshSuccessfulAllocation':True,'CStringOwnership':'actual indexed buffer/header/refcount Read required','arrayCallbacks':'stable retained captured allocation/header before subsequent source effects','legacyReaders':'unexamined versions stop after recorded ordered prefix','resourceServices':'archive actor/CString/LoD release services are required; no inspector resource/actor substitute'}}
 for name,data in [('native-evidence.json',evidence),('runtime-rules.json',rules)]:
  for base in (OUT,PUBLIC):save_json(base/name,data)
 expected={Path(b[k]) for b in functions.values() for k in ('cExcerpt','assemblyExcerpt')}
 for base in (OUT,PUBLIC):
  for p in (base/'sources').rglob('*'):
   if p.is_file() and p.relative_to(base) not in expected:
    if not p.resolve().is_relative_to(base.resolve()):raise ValueError('Owned cleanup escaped namespace')
    p.unlink()
 for rel in expected:
  dest=PUBLIC/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(OUT/rel,dest)
 if not args.capture_only:
  imported=[Path(m.__file__).resolve() for m in list(sys.modules.values()) if getattr(m,'__file__',None) and Path(m.__file__).resolve().parent==ROOT/'tools/gothic3' and Path(m.__file__).suffix=='.py']
  deps=[ROOT/'src/gothic3/visual-animation-reading.ts',schema_path,candidate_path,Path(__file__).resolve(),*imported,*[ROOT/'src/gothic3'/name for name in ('entity-reflection.ts','entity-lifecycle.ts','entity-reading.ts','native-properties.ts','animation-state.ts')]]
  owned=[p for base in (OUT,PUBLIC) for p in base.rglob('*') if p.is_file() and p.name!='implementation-receipt.json'];receipt={'schema':'gothic3-visual-animation-reading-implementation-receipt-v1','baseline':'42c7149a','audit':audit,'noNativeCodeExecution':True,'noTestsOrBuildRunByProducer':True,'files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(set(deps+owned))]}
  for base in (OUT,PUBLIC):save_json(base/'implementation-receipt.json',receipt)
 print(json.dumps({'audit':audit,'receiptSHA':None if args.capture_only else sha(OUT/'implementation-receipt.json')}))

def sha_bytes(raw):return hashlib.sha256(raw).hexdigest()

if __name__=='__main__':main()
