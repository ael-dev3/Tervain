"""Bounded offline original Attribute/Stat factory and descriptor evidence.

Only immutable PE/study/world inputs are read. The Stat bootstrap is absent
from the study catalog and is explicitly an original-PE-only byte proof.
"""
from __future__ import annotations
import argparse, csv, hashlib, json, re, shutil, struct, sys
from pathlib import Path
from bounded_native_capture import collect
from research_native_combat import PE, save_json, sha
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import INPUTS, pin_vtable

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/gothic3/attribute-reading'
PUBLIC=ROOT/'public/gothic3/attribute-reading'
BASELINE='28f3ca1269a4fa08002f8da35f73bcb5cb3794d6'
PROFILES={
 'gCAttribute':{'baseClass':'bCObjectRefBase','nativeBytes':24,'allocationTag':196,'nativeVtable':'2065da7c','wrapperVtable':'206a2d94','rootRegistrar':'205263a0','rootPointer':'20613eec','rootObject':'207ccfb4','typeInitialize':'20398d50','constructor':'20397cd0','constructorExport':'20008387','allocator':'203980f0','wrapperClone':'2039a790','initialize':'20398b00','attach':'20397e60','wrapperRead':'20398c90','dataRead':'2039aa80','postInitialize':'20397ca0','registrars':['20526400','205264f0','205265e0']},
 'gCStat':{'baseClass':'gCAttribute','nativeBytes':32,'allocationTag':196,'nativeVtable':'2065db4c','wrapperVtable':'206a3164','rootRegistrar':'20526910','rootPointer':'206141d0','rootObject':'207cd0e4','typeInitialize':'2039c2d0','constructor':'2039b270','allocator':'2039b680','wrapperClone':'2039d460','initialize':'2039c070','attach':'2039b400','wrapperRead':'2039c210','dataRead':'2039d680','postInitialize':'20397ca0','registrars':['20526970','20526a60']}}

class CaptureSession:
 """Local capture helpers shared only by the two new bounded producers."""
 def __init__(self,study,out):
  self.study,self.out=Path(study).resolve(),Path(out);self.pes={};self.inputs={};self.catalog={};self.functions={};self.instructions={};self.bindings=[];self.tables={}
  for short,(directory,filename,expected) in INPUTS.items():
   path=self.study/'00_Original_Runtime'/filename
   if sha(path)!=expected:raise ValueError('Original PE differs: '+short)
   self.pes[short]=PE(path);self.inputs[short]={'path':'00_Original_Runtime/'+filename,'bytes':path.stat().st_size,'sha256':expected}
   with (self.study/'01_Decompiled_Code'/directory/'functions.csv').open(encoding='utf-8-sig',newline='') as f:self.catalog[short]={r['address']:r for r in csv.DictReader(f)}
  self.imports={s:native_imports(p) for s,p in self.pes.items()};self.maps={s:exports(p) for s,p in self.pes.items()}
 def capture(self,short,entries):
  entries=set(entries)-{k.split(':')[1] for k in self.instructions if k.startswith(short+':')}
  absent=entries-set(self.catalog[short])
  if absent:raise ValueError('Requested original catalog body absent: '+short+':'+','.join(sorted(absent)))
  if entries:
   bodies,records=collect(self.study,short,INPUTS[short][0],' '.join(sorted(entries)),self.pes[short],self.out)
   self.functions.update((b['id'],b) for b in bodies);self.instructions.update(records)
 def final(self,short,entry):
  seen=set()
  while True:
   if entry in seen:raise ValueError('Forwarding cycle')
   seen.add(entry);raw=self.pes[short].at(int(entry,16),5)
   if raw[0]!=0xe9:return short+':'+entry
   entry=f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}'
 def table(self,short,name,address,length,offsets=None):
  table=pin_vtable(self.pes[short],self.imports[short],self.maps,int(address,16),length);self.tables[name]=table
  needed={s:set() for s in INPUTS}
  for item in table['entries']:
   if item['target']=='00000000' or (offsets is not None and item['offset'] not in offsets):continue
   mod,target=item.get('implementation',short+':'+item['target']).split(':');needed[mod].add(target)
  for mod in INPUTS:self.capture(mod,needed[mod])
  return table
 def close(self,roots,depth=2):
  frontier=set(roots);seen=set()
  for _ in range(depth):
   needed={s:set() for s in INPUTS}
   for ident in sorted(frontier):
    short=ident.split(':')[0]
    for row in self.instructions[ident]:
     m=re.fullmatch(r'(?:CALL|JMP) 0x([0-9a-f]{8})',row['assembly'])
     if m and m[1] in self.catalog[short]:needed[short].add(m[1])
     m=re.search(r'(?:CALL |JMP |MOV E[A-Z]+,)dword ptr \[0x([0-9a-f]{8})\]',row['assembly'])
     if not m or int(m[1],16) not in self.imports[short] or (ident,row['address']) in seen:continue
     seen.add((ident,row['address']));imp=self.imports[short][int(m[1],16)];mod=imp['library'].removesuffix('.dll');binding={'function':ident,'instruction':row,'importSlot':m[1],'import':imp}
     if mod in self.maps and imp['decoratedName'] in self.maps[mod]:
      entry=f'{self.maps[mod][imp["decoratedName"]]:08x}';binding['implementation']=mod+':'+entry;needed[mod].add(entry)
     else:binding['status']='external service; never executed'
     self.bindings.append(binding)
   before=set(self.instructions)
   for short in INPUTS:self.capture(short,needed[short])
   frontier=set(self.instructions)-before
   if not frontier:break
 def registrar(self,short,entry,class_name,expected_name=None,expected_offset=None):
  body=self.instructions[short+':'+entry];pe=self.pes[short];stores={};zeros=set()
  for row in body:
   asm=row['assembly'];m=re.fullmatch(r'XOR (E[ABCD]X|ESI|EDI|EBP),\1',asm)
   if m:zeros.add(m[1])
   m=re.fullmatch(r'MOV dword ptr \[0x([0-9a-f]+)\],0x([0-9a-f]+)',asm)
   if m:stores[int(m[1],16)]=(int(m[2],16),row)
   m=re.fullmatch(r'MOV dword ptr \[0x([0-9a-f]+)\],(ESI|EDI|EBX|EBP)',asm)
   if m and m[2] in zeros:stores[int(m[1],16)]=(0,row)
   m=re.match(r'(?:MOV|LEA|POP) (ESI|EDI|EBX|EBP),',asm)
   if m:zeros.discard(m[1])
  vt=[(a,v,r) for a,(v,r) in stores.items() if pe.base<=v<pe.base+0x1000000]
  offsets=[(a,v,r) for a,(v,r) in stores.items() if 0<v<0x10000 and a+4 in stores and stores[a+4][0]==0]
  if len(vt)!=1 or len(offsets)!=1:raise ValueError('Descriptor stores ambiguous: '+entry)
  text=(self.out/self.functions[short+':'+entry]['cExcerpt']).read_text(encoding='utf8');prefix=text.split('bCPropertyTypeBase::bCPropertyTypeBase',1)[0]
  names=re.findall(r'bCString::bCString\([^;]*?,\s*"([^"\n]*)"\)',prefix);typ=re.search(r'bTPropertyType<(.+?)>::',text)
  if not names or not typ:raise ValueError('Descriptor native name/type absent: '+entry)
  name=names[-1];cpp=typ[1].split(',',1)[1];address,vtable,store=vt[0];offset_at,offset,offset_store=offsets[0]
  if expected_name is not None and (name,offset)!=(expected_name,expected_offset):raise ValueError('Descriptor exact name/offset differs')
  literals=[]
  for row in body:
   m=re.fullmatch(r'PUSH 0x([0-9a-f]{8})',row['assembly'])
   if not m:continue
   try:raw=pe.cstring(int(m[1],16))
   except ValueError:continue
   if raw.decode('cp1252')==name:literals.append({'address':m[1],'bytes':(raw+b'\0').hex(),'instruction':row})
  if not literals or len({r['address'] for r in literals})!=1:raise ValueError('Descriptor exact name literal differs: '+entry)
  table=self.table(short,'descriptor:'+entry,f'{vtable:08x}',0x68,{0x14,0x2c,0x38,0x40,0x64});slots={s['offset']:s for s in table['entries']}
  target=lambda off: self.final(*slots[off].get('implementation',short+':'+slots[off]['target']).split(':'))
  return {'className':class_name,'name':name,'nativeOffset':offset,'typeName':cpp.replace('class ','').replace('enum ',''),'registrar':short+':'+entry,'reader':target(0x38),'defaultInitializer':target(0x14),'addressGetter':target(0x64),'descriptor':f'{address:08x}','vtable':f'{vtable:08x}','descriptorStore':store,'offsetStore':offset_store,'defaultStore':stores[offset_at+4][1],'nameLiteral':literals[0],'nameLiteralUses':literals}
 def order(self,short,entries):
  entries=list(entries);pe=self.pes[short];hits=[]
  for rva,size,offset in pe.sections:
   raw=pe.data[offset:offset+size];start=raw.find(struct.pack('<I',int(entries[0],16)))
   while start>=0:
    window=raw[start:start+max(400,len(entries)*16)]
    values=[f'{v:08x}' for v in struct.unpack('<'+'I'*(len(window)//4),window[:len(window)//4*4])]
    if [v for v in values if v in entries]==entries:
     n=values.index(entries[-1])+1;proof=window[:n*4];hits.append({'address':f'{pe.base+rva+start:08x}','bytes':proof.hex(),'sha256':hashlib.sha256(proof).hexdigest(),'fieldEntries':entries,'entries':values[:n]})
    start=raw.find(struct.pack('<I',int(entries[0],16)),start+1)
  if len(hits)!=1:raise ValueError('Original registrar order ambiguous: '+short)
  return hits[0]
 def runtime_markers(self,paths,pe_only=()):
  result=[]
  for path in paths:
   if not path.exists():continue
   for label in sorted(set(re.findall(r'(?:Engine|SharedBase|Game):[0-9a-f]{8}',path.read_text(encoding='utf8')))):
    short,entry=label.split(':');va=int(entry,16)
    if label in pe_only:result.append({'source':label,'proofKind':'explicit-original-PE-only-bootstrap'});continue
    owners=[]
    for address,row in self.catalog[short].items():
     if any(int(a,16)<=va<=int(b,16) for a,b in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})',row['body_ranges'])):owners.append(address)
    if not owners:raise ValueError('Runtime source marker has no original bounded body: '+label)
    self.capture(short,owners);matches=[{'function':short+':'+owner,'instruction':r} for owner in owners for r in self.instructions[short+':'+owner] if r['address']==entry]
    if not matches:raise ValueError('Runtime marker not an instruction boundary: '+label)
    result.append({'source':label,'runtimePath':path.relative_to(ROOT).as_posix(),'attribution':matches})
  return result
 def audit(self):
  return {'selectedNativeBodies':len(self.functions),'instructions':sum(map(len,self.instructions.values())),'instructionBytes':sum(b['bodyBytes'] for b in self.functions.values()),'allSelectedInstructionBytesMatchOriginalPE':True,'allInstructionsInsideOriginalPEBodyRanges':True,'allOriginalBodyBytesCoveredByInstructions':True,'capturedBodyCountIsImplementedFeatureCount':False}
 def data_proofs(self,identities):
  """Pin focused literal references and actual cold global storage, not live values."""
  references={};literals=[]
  for ident in sorted(set(identities)):
   short=ident.split(':')[0];pe=self.pes[short]
   for row in self.instructions[ident]:
    for address in re.findall(r'\[0x([0-9a-f]{8})\]',row['assembly']):
     va=int(address,16)
     if va in self.imports[short]:continue
     references.setdefault((short,address),[]).append({'function':ident,'instruction':row})
    m=re.fullmatch(r'PUSH 0x([0-9a-f]{8})',row['assembly'])
    if m:
     try:raw=pe.cstring(int(m[1],16))
     except ValueError:continue
     if raw and all(b>=32 and b!=127 for b in raw):literals.append({'module':short,'address':m[1],'bytes':(raw+b'\0').hex(),'source':ident,'instruction':row,'fileBacked':True})
  globals=[]
  for (short,address),uses in sorted(references.items()):
   pe=self.pes[short];va=int(address,16);header=struct.unpack_from('<I',pe.data,0x3c)[0];section_at=header+24+struct.unpack_from('<H',pe.data,header+20)[0];count=struct.unpack_from('<H',pe.data,header+6)[0];proof=None
   for i in range(count):
    at=section_at+i*40;virtual,rva,raw,raw_at=struct.unpack_from('<IIII',pe.data,at+8)
    if pe.base+rva<=va and va+4<=pe.base+rva+max(virtual,raw):
     flags=struct.unpack_from('<I',pe.data,at+36)[0];proof={'headerFileOffset':at,'headerBytes':pe.data[at:at+40].hex(),'virtualBytes':virtual,'rva':rva,'rawBytes':raw,'rawFileOffset':raw_at,'writableSection':bool(flags&0x80000000)};break
   if proof is None:raise ValueError('Referenced absolute source global outside actual original PE section: '+short+':'+address)
   try:storage={'fileBacked':True,'coldPEBytes':pe.at(va,4).hex()}
   except ValueError:
    if not (pe.base+proof['rva']+proof['rawBytes']<=va and va+4<=pe.base+proof['rva']+proof['virtualBytes']):raise ValueError('Absolute global not file backed or fully virtual zero fill')
    storage={'fileBacked':False,'coldPEBytes':None,'storage':'actual original virtual zero-fill section; not initialized file bytes'}
   globals.append({'module':short,'address':address,**storage,'sectionProof':proof,'liveValueKnown':False if proof['writableSection'] else None,'coldImageNeverCertifiesMutableLiveValue':True,'consumers':uses})
  return {'fileBackedLiterals':literals,'absoluteDataStorage':globals}

def runtime_dependencies(paths):
 pending=list(paths);files=set()
 while pending:
  path=pending.pop().resolve()
  if path in files:continue
  if not path.is_file():raise ValueError('Current source dependency missing: '+str(path))
  files.add(path)
  if path.suffix!='.ts':continue
  for name in re.findall(r'\bfrom\s*[\'"]([^\'"]+)[\'"]',path.read_text(encoding='utf8')):
   if not name.startswith('.'):continue
   target=(path.parent/name.split('?',1)[0]).resolve();options=[target,target.with_suffix('.ts'),target/'index.ts']
   match=next((p for p in options if p.is_file()),None)
   if match is None:raise ValueError('Relative runtime import missing: '+name+' from '+str(path))
   pending.append(match)
 return files

def write_outputs(session,namespace,public,evidence,rules,readme,deps,capture_only):
 out=session.out
 for base in (out,public):
  base.mkdir(parents=True,exist_ok=True);(base/'README.md').write_text(readme,encoding='utf8',newline='\n')
  save_json(base/'native-evidence.json',evidence);save_json(base/'runtime-rules.json',rules)
 expected={Path(b[k]) for b in session.functions.values() for k in ('cExcerpt','assemblyExcerpt')}
 for base in (out,public):
  for p in (base/'sources').rglob('*'):
   if p.is_file() and p.relative_to(base) not in expected:
    if not p.resolve().is_relative_to(base.resolve()):raise ValueError('Owned cleanup escapes namespace')
    p.unlink()
 for rel in expected:
  dest=public/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(out/rel,dest)
 if capture_only:return None
 imported=[Path(m.__file__).resolve() for m in list(sys.modules.values()) if getattr(m,'__file__',None) and Path(m.__file__).resolve().parent==ROOT/'tools/gothic3' and Path(m.__file__).suffix=='.py']
 owned=[p for base in (out,public) for p in base.rglob('*') if p.is_file() and p.name!='implementation-receipt.json']
 sources=runtime_dependencies([p for p in deps if p.suffix=='.ts'])
 producers=[ROOT/'tools/gothic3/research_attribute_reading.py',ROOT/'tools/gothic3/research_player_memory_reading.py']
 receipt={'schema':'gothic3-'+namespace+'-implementation-receipt-v1','baseline':BASELINE,'nativeCodeExecuted':False,'testsExecuted':False,'buildExecuted':False,'browserExecuted':False,'runtimeSourceFrozenBeforeReceipt':True,'audit':evidence['audit'],'checksActuallyPerformed':['immutable original PE complete inclusive/discontiguous body and instruction byte audit','original descriptor/registration/import/dispatch proof','original data bytes and independently decoded indexed strings where applicable','frozen current runtime/producer/imported helper/dependency/owned output hashes'],'files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(set([*deps,*sources,*producers,*imported,*owned]))]}
 for base in (out,public):save_json(base/'implementation-receipt.json',receipt)
 return sha(out/'implementation-receipt.json')

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--study',type=Path,required=True);ap.add_argument('--capture-only',action='store_true');args=ap.parse_args()
 session=CaptureSession(args.study,OUT);selected={k for p in PROFILES.values() for k in [p[n] for n in ('constructor','allocator','wrapperClone','initialize','attach','wrapperRead','dataRead','postInitialize','typeInitialize')]+p['registrars']};selected.add('205263a0');selected.add('20008387');session.capture('Game',selected)
 expected={'gCAttribute':[('Tag',12),('Modifier',16),('Value',20)],'gCStat':[('BaseMaximum',24),('MaximumModifier',28)]};classes={};tables={};orders={}
 for name,profile in PROFILES.items():
  profile=dict(profile);entries=profile.pop('registrars');fields=[session.registrar('Game',entry,name,n,o) for entry,(n,o) in zip(entries,expected[name])]
  for entry,size,tag in ((profile['allocator'],profile['nativeBytes'],0xc4),(profile['wrapperClone'],16,0x190)):
   body=session.instructions['Game:'+entry]
   for value in (size,tag):
    if not any(r['assembly']==f'PUSH 0x{value:x}' for r in body):raise ValueError('Original Attribute allocation size/tag differs: '+entry)
  expected_readers=['Game:20399d80','Game:2039a610','Game:2039a610'] if name=='gCAttribute' else ['Game:2039d2e0','Game:2039d2e0']
  expected_defaults=['Game:20399b20','Game:2039a3c0','Game:2039a3c0'] if name=='gCAttribute' else ['Game:2039d090','Game:2039d090']
  if [f['reader'] for f in fields]!=expected_readers or [f['defaultInitializer'] for f in fields]!=expected_defaults:raise ValueError('Original concrete Attribute descriptor dispatch differs')
  tables[name]={'native':session.table('Game',name+':native',profile['nativeVtable'],0x88),'wrapper':session.table('Game',name+':wrapper',profile['wrapperVtable'],0x44)}
  pointer=session.pes['Game'].at(int(profile['rootPointer'],16),4)
  if pointer!=struct.pack('<I',int(profile['rootRegistrar'],16)):raise ValueError('Original CRT bootstrap pointer differs')
  profile['rootPointerProof']={'address':profile['rootPointer'],'bytes':pointer.hex()};orders[name]=session.order('Game',entries);profile['fields']=fields
  default_slot=next(s for s in tables[name]['native']['entries'] if s['offset']==0x84);profile['nativeApplyDefaults']=session.final('Game',default_slot['target']);profile['wrapperBytes']=16;profile['wrapperAllocationTag']=400
  for key in ('rootRegistrar','typeInitialize','constructor','constructorExport','allocator','wrapperClone','initialize','attach','wrapperRead','dataRead','postInitialize'):
   if key in profile:profile[key]='Game:'+profile[key]
  classes[name]=profile
 stat=session.pes['Game'].at(0x20526910,75);expected_sha='d2ac58943f13166d44cc6b699a067e12e2882460c357d74ba622feb061ad1d8b'
 if hashlib.sha256(stat).hexdigest()!=expected_sha or '20526910' in session.catalog['Game']:raise ValueError('Stat original-only bootstrap extent/catalog profile differs')
 asm_path=session.study/'01_Decompiled_Code/Game_dll/full_disassembly.asm'
 with asm_path.open(encoding='utf8') as f:
  if any(re.match(r'205269[1-5][0-9a-f]\s*\|',line) for line in f):raise ValueError('Stat bootstrap unexpectedly present in full assembly')
 slices=[(0,5,'root receiver'),(5,6,'imported base constructor'),(11,10,'native pointer clear'),(21,10,'wrapper vtable store'),(31,5,'type initializer call'),(36,2,'true initialization argument'),(38,5,'root receiver'),(43,5,'type pointer store'),(48,10,'native pointer clear'),(58,5,'root initialize call'),(63,5,'atexit callback argument'),(68,5,'atexit call'),(73,1,'stack adjustment'),(74,1,'return')]
 bootstrap={'module':'Game','entry':'20526910','endVAInclusive':'2052695a','bytes':75,'raw':stat.hex(),'sha256':expected_sha,'proofKind':'original-PE-only; absent functions.csv and full_disassembly.asm','catalogBody':False,'decompiledBody':False,'sourceBodyInvented':False,'rootObject':'207cd0e4','wrapperVtable':'206a3164','typeStore':'207cd0f0','typeCallExport':'Game:200036b1','typeCallImplementation':'Game:2039c2d0','initializeExport':'Game:2000d8e1','initializeImplementation':'Game:2039c070','initializeArgument':True,'atexitCallback':'Game:20563030','byteSlices':[{'address':f'{0x20526910+at:08x}','bytes':stat[at:at+n].hex(),'meaning':label} for at,n,label in slices]}
 for at,target in ((31,0x200036b1),(58,0x2000d8e1)):
  if stat[at]!=0xe8 or 0x20526910+at+5+struct.unpack_from('<i',stat,at+1)[0]!=target:raise ValueError('Stat bootstrap call differs')
 if stat[21:31]!=bytes.fromhex('c705e4d07c2064316a20') or stat[43:48]!=bytes.fromhex('a3f0d07c20') or stat[63:68]!=bytes.fromhex('6830305620'):raise ValueError('Stat bootstrap stores/callback differs')
 session.capture('Game',{'200036b1','2000d8e1'})
 session.table('Game','gCAttribute:type','206a2cc4',0x28);session.table('Game','gCStat:type','206a309c',0x28)
 session.capture('SharedBase',{'10006479','10004638','100022d4','1000551a','1000574f','10006f41','10005e5c','100085e9','10089290'})
 session.capture('Game',{'20320af0','20320b80'})
 session.close(set(session.instructions),2)
 classes['gCAttribute']['baseClassName']=None;classes['gCStat']['baseClassName']='gCAttribute'
 relation={'accessorGetBase':'SharedBase:10006f41','implementation':'SharedBase:1009ae00','sentinelName':'SharedBase:10005e5c','compareSource':'SharedBase:10002eb9','rootLookup':'SharedBase:100085e9','gCAttribute':{'wrapperBaseNameSlot':8,'target':'Game:200043b3','returnedName':'bCObjectRefBase','result':None,'nullBranchInstruction':'1009ae55'},'gCStat':{'wrapperBaseNameSlot':8,'target':'Game:2000b3d9','returnedName':'gCAttribute','result':'actual gCAttribute registered root'}}
 for assembly in ('CALL 0x10005e5c','MOV EDX,dword ptr [EAX + 0x8]','CALL 0x100085e9','MOV dword ptr [EAX],0x0'):
  if not any(r['assembly']==assembly for r in session.instructions['SharedBase:1009ae00']):raise ValueError('Original reflection base-root relation differs')
 before_markers=set(session.instructions);markers=[] if args.capture_only else session.runtime_markers([ROOT/'src/gothic3/attribute-reading.ts'],{'Game:20526910'})
 session.close(set(session.instructions)-before_markers,2)
 data_proofs=session.data_proofs({key for key in session.instructions if key.startswith('Game:') and key.split(':')[1] in selected}|{'SharedBase:10089290','SharedBase:1009ae00'})
 audit=session.audit();audit['originalPEOnlyBootstrapBytes']=75
 evidence={'schema':'gothic3-attribute-reading-evidence-v1','nativeCodeExecuted':False,'inputs':session.inputs,'functions':[session.functions[k] for k in sorted(session.functions)],'instructions':session.instructions,'vtables':session.tables,'classVtables':tables,'registrarOrder':orders,'classes':classes,'reflectionBaseRootRelation':relation,'statBootstrapOriginalPEOnly':bootstrap,'importedSubcalls':session.bindings,'focusedLiteralAndDataStorageProofs':data_proofs,'runtimeSourceAttribution':markers,'audit':audit,'scope':'Captured source entries and dependencies are bounded evidence, not implemented feature counts.'}
 rules={'schema':'gothic3-attribute-reading-rules-v1','nativeCodeExecuted':False,'inputs':{k:v[2] for k,v in INPUTS.items()},'classes':classes,'reflectionBaseRootRelation':relation,'statBootstrapOriginalPEOnly':bootstrap,'profile':{'worldResident':False,'detached':True,'frontendRequiredServices':['actual allocation/reference handoff','actual CString ownership and read','captured accessor/descriptor enter and exit','source terminal native/wrapper lifetime'],'freshSuccessfulAllocation':True,'numericNativePointersMasked':True,'inheritedFields':'gCStat owns BaseMaximum and MaximumModifier and inherits gCAttribute Tag, Modifier, Value; actual accessor stops at bCObjectRefBase sentinel','defaults':'Tag actual CString clear; signed integer descriptor defaults 0xffffffff','nativeCodeExecuted':False}}
 readme='''# Original Attribute and Stat reading

This bounded detached reconstruction pins the real gCAttribute and gCStat
factory/descriptor paths, their 24/32-byte tag-0xc4 allocations, 16-byte
tag-0x190 wrapper clones, inherited fields and exact registration order.
Tag is an owned CString; integer reflected defaults are 0xffffffff.
Native virtual ApplyDefaults then writes Tag empty, Modifier 0 and Value 100;
the Stat override also writes BaseMaximum 100 and MaximumModifier 0 before
forwarding to the Attribute implementation. The actual accessor metadata
base for Attribute is NULL after the bCObjectRefBase sentinel comparison;
Stat resolves the real registered Attribute root.
The selected factories retain one physical object and propagate descriptor
callbacks through its actual wrapper and native references. Frontend use
requires actual allocation, CString, accessor, reference and terminal lifetime
services at the captured boundaries. Successful construction is detached and
does not establish world residency or complete progression.

The Stat CRT bootstrap 20526910 is absent from functions.csv and the full
assembly study. Its complete original PE extent 20526910–2052695a (75 bytes)
is checked separately, with exact root/vtable/type/init/atexit byte slices.
It is explicitly a PE-only proof, with no invented CSV or decompiled body.
Every cataloged body uses complete inclusive original ranges, including
discontiguous ranges, and every instruction is checked against original PE
bytes. Captured source entry counts are not implemented feature counts.

Reproduce with `python -B tools/gothic3/research_attribute_reading.py --study
$study --capture-only` while runtime work is active. Omit --capture-only only
after the runtime source is frozen; that receipt pins current runtime,
producer/imported helpers/dependencies and all owned outputs, excluding
receipts themselves. No native code, tests, build, browser or remotes run.
'''
 deps=[Path(__file__).resolve(),ROOT/'src/gothic3/attribute-reading.ts',*[ROOT/'src/gothic3'/n for n in ('entity-reflection.ts','entity-lifecycle.ts','entity-reading.ts','native-properties.ts')],*[ROOT/'assets/gothic3'/n/'runtime-rules.json' for n in ('entity-reflection','entity-lifecycle','entity-reading','properties')]]
 receipt=write_outputs(session,'attribute-reading',PUBLIC,evidence,rules,readme,deps,args.capture_only);print(json.dumps({'audit':audit,'receiptSHA':receipt}))

if __name__=='__main__':main()
