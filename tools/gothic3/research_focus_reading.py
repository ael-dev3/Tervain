"""Recover the original Focus factory, physical defaults and Hero read offline.

Only original PE/study/world files are read. No native code, tests, browser,
build or remote action is executed. Outputs belong to focus-reading only.
"""
from __future__ import annotations
import argparse, csv, hashlib, json, re, shutil, struct, sys
from pathlib import Path
from research_native_combat import PE, save_json, sha
from bounded_native_capture import collect
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import INPUTS, SELECT as BASE_SELECT, pin_vtable, WORLD_PATH, WORLD_SHA

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/gothic3/focus-reading'
PUBLIC=ROOT/'public/gothic3/focus-reading'
SELECT={'Game':set('2000ca18 20023042 2000cbdf 20011293 200259ff 20028cc2 200233d0 2001db83 20032448 200078f1 20034a54 20024bf9 20003a3a 2013d480 2013c840 2013c4e0 2013f210 20145f00 20140c30 201479b0 201468a0 201461f0'.split()),
        'Engine':set('300025bd 3003b5bb 3001a091 3002ad10 30037ca4 304c45a0 304c43a0'.split()),
        'SharedBase':set(BASE_SELECT['SharedBase'])}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',type=Path,required=True)
    parser.add_argument('--capture-only',action='store_true')
    args=parser.parse_args();study=args.study.resolve()
    for base in (OUT,PUBLIC):base.mkdir(parents=True,exist_ok=True)
    pes,inputs,catalog={},{},{}
    for short,(directory,filename,expected) in INPUTS.items():
        path=study/'00_Original_Runtime'/filename
        if sha(path)!=expected:raise ValueError('Original PE differs: '+short)
        pes[short]=PE(path);inputs[short]={'path':'00_Original_Runtime/'+filename,'bytes':path.stat().st_size,'sha256':expected}
        with (study/'01_Decompiled_Code'/directory/'functions.csv').open(encoding='utf-8-sig',newline='') as file:
            catalog[short]={row['address']:row for row in csv.DictReader(file)}
    schema_path=ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json'
    descriptors=[row for row in json.loads(schema_path.read_text(encoding='utf8'))['nativePropertyRegistrars'] if row['className']=='gCFocus_PS']
    if len(descriptors)!=80:raise ValueError('Original Focus descriptors differ')
    SELECT['Game'].update(row['entry'] for row in descriptors)
    functions,instructions={},{}
    def capture(short,requested):
        entries=set(requested);pending=list(entries)
        while pending:
            entry=pending.pop();raw=pes[short].at(int(entry,16),5)
            if raw[0]!=0xe9:continue
            target=f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}'
            if target not in catalog[short]:raise ValueError('Original thunk boundary absent: '+short+':'+target)
            if target not in entries:entries.add(target);pending.append(target)
        entries-={key.split(':')[1] for key in instructions if key.startswith(short+':')}
        if not entries:return
        bodies,records=collect(study,short,INPUTS[short][0],' '.join(sorted(entries)),pes[short],OUT)
        functions.update((body['id'],body) for body in bodies);instructions.update(records)
    for short in INPUTS:capture(short,SELECT[short])
    maps={short:exports(pe) for short,pe in pes.items()}
    imports={short:native_imports(pe) for short,pe in pes.items()}
    def stored_table(entry,offset):
        expression=r'MOV dword ptr \[ESI'+(r'\+0x'+f'{offset:x}' if offset else '')+r'\],0x(206[0-9a-f]+)'
        hits=[int(m[1],16) for row in instructions['Game:'+entry] if (m:=re.fullmatch(expression,row['assembly']))]
        if len(hits)!=1:raise ValueError('Exact Focus table store differs: '+entry+'+'+hex(offset)+' '+str(hits))
        return hits[0]
    tables={'native':pin_vtable(pes['Game'],imports['Game'],maps,stored_table('2013d480',0),0x150),
            'wrapper':pin_vtable(pes['Game'],imports['Game'],maps,stored_table('201468a0',0),0x44)}
    field_tables={row['name']:pin_vtable(pes['Game'],imports['Game'],maps,int(row['vtable'],16),0x68) for row in descriptors}
    container_stores=[];container_sites=[];current_offset=None
    for row in instructions['Game:2013d480']:
        if m:=re.fullmatch(r'LEA EDI,\[ESI \+ 0x([0-9a-f]+)\]',row['assembly']):current_offset=int(m[1],16)
        if m:=re.fullmatch(r'MOV dword ptr \[EDI\],0x(206[0-9a-f]+)',row['assembly']):
            container_stores.append(int(m[1],16));container_sites.append({'nativeOffset':current_offset,'instruction':row})
    if len(container_stores)!=3:raise ValueError('Focus embedded container stores differ')
    if [v['nativeOffset'] for v in container_sites]!=[0x14,0x1c,0x128]:raise ValueError('Focus actual enum constructor receiver offsets differ')
    containers={name:pin_vtable(pes['Game'],imports['Game'],maps,address,0x20) for name,address in zip(['FocusLookAtMode','FocusLookAtKeysFOR','CurrentMode'],container_stores,strict=True)}
    needed={short:set() for short in INPUTS}
    def slot(item):
        module,entry=item.get('implementation','Game:'+item['target']).split(':')
        if entry!='00000000':needed[module].add(entry)
    for name,table in tables.items():
        for item in table['entries']:
            if name=='native' and item['offset'] not in {0,4,0x10,0x18,0x20,0x3c,0x40,0x4c,0x50,0x58,0x5c,0x60,0x68,0x84,0x120,0x124,0x128,0x12c,0x138,0x13c}:continue
            slot(item)
    for table in field_tables.values():
        for item in table['entries']:
            if item['offset'] in {0x14,0x2c,0x38,0x64}:slot(item)
    for table in containers.values():
        for item in table['entries']:
            if item['offset'] in {0x10,0x18,0x1c}:slot(item)
    for short in INPUTS:capture(short,needed[short])
    bindings=[];needed={short:set() for short in INPUTS}
    for identity,rows in list(instructions.items()):
        short=identity.split(':')[0]
        for row in rows:
            match=re.search(r'(?:(?:CALL|JMP)\s+dword ptr |MOV [A-Z]+,dword ptr )\[0x([0-9a-f]+)\]',row['assembly'])
            if not match:continue
            imp=imports[short].get(int(match[1],16))
            if not imp:continue
            module=imp['library'].removesuffix('.dll');binding={'function':identity,'instruction':row,'import':imp}
            if module in maps:
                entry=f"{maps[module][imp['decoratedName']]:08x}";binding['implementation']=module+':'+entry;needed[module].add(entry)
            else:binding['status']='external service; never executed'
            bindings.append(binding)
    for short in INPUTS:capture(short,needed[short])
    candidate_path=ROOT/'assets/gothic3/entity-reflection/serialized-candidates.json'
    hero=next(e for e in json.loads(candidate_path.read_text(encoding='utf8'))['entities'] if e['name']=='PC_Hero')['propertySets'][12]
    source=study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
    if sha(source)!=WORLD_SHA:raise ValueError('Original world differs')
    world=source.read_bytes();packet_raw=world[hero['sourceOffset']:hero['endSourceOffset']+4]
    if hero['className']!='gCFocus_PS' or len(packet_raw)!=1140 or packet_raw.hex()!=hero['serializedRaw'] or hashlib.sha256(packet_raw).hexdigest()!=hero['serializedSha256']:raise ValueError('Original Focus packet differs')
    if world[hero['nativeReadOffset']:hero['endSourceOffset']]!=bytes.fromhex('2c00'):raise ValueError('Focus native tail differs')
    fields=[]
    for descriptor,prop in zip(descriptors,hero['properties'],strict=True):
        rows=instructions['Game:'+descriptor['entry']]
        if descriptor['name']!=prop['name'] or any(descriptor[key] not in rows for key in ['descriptorStore','offsetStore','defaultStore']):raise ValueError('Focus descriptor proof differs')
        if pes['Game'].cstring(int(descriptor['nameLiteral']['address'],16)).decode('ascii')!=descriptor['name']:raise ValueError('Descriptor name differs')
        if world[prop['sourceOffset']:prop['sourceOffset']+prop['byteLength']].hex()!=prop['raw']:raise ValueError('Original field payload differs')
        slots={item['offset']:item for item in field_tables[descriptor['name']]['entries']}
        target=lambda offset:slots[offset].get('implementation','Game:'+slots[offset]['target'])
        fields.append({'name':prop['name'],'typeName':prop['type'],'nativeOffset':descriptor['nativeOffset'],'reader':target(0x38),'defaultInitializer':target(0x14),'registrar':'Game:'+descriptor['entry']})
    registrar_bytes=b''.join(struct.pack('<I',int(row['entry'],16)) for row in descriptors)
    at=pes['Game'].data.find(registrar_bytes)
    if at<0 or pes['Game'].data.find(registrar_bytes,at+1)>=0:raise ValueError('Original Focus registrar order ambiguous')
    constant_pins={}
    def readonly_word(address):
        pe=pes['Game'];header=struct.unpack_from('<I',pe.data,0x3c)[0]
        count=struct.unpack_from('<H',pe.data,header+6)[0];optional_size=struct.unpack_from('<H',pe.data,header+20)[0]
        rva=address-pe.base;section=None
        for index in range(count):
            start=header+24+optional_size+index*40
            virtual_size,base_rva,raw_size=struct.unpack_from('<III',pe.data,start+8)
            if base_rva<=rva and rva+4<=base_rva+max(virtual_size,raw_size):section=start;break
        if section is None or struct.unpack_from('<I',pe.data,section+36)[0]&0x80000000:raise ValueError('Focus immutable float literal not readonly')
        raw=pe.at(address,4);constant_pins[f'{address:08x}']={'bytes':raw.hex(),'sectionWritable':False}
        return raw.hex()
    # Straight-line store plans are derived from audited concrete instructions,
    # not serialized values. Explicit enum-call boundaries preserve their order.
    def stores(entry,enum_calls):
        registers={};plan=[]
        for row in instructions['Game:'+entry]:
            asm=row['assembly']
            if m:=re.fullmatch(r'MOVSS (XMM\d),dword ptr \[0x([0-9a-f]+)\]',asm):registers[m[1]]=readonly_word(int(m[2],16))
            elif m:=re.fullmatch(r'XORPS (XMM\d),\1',asm):registers[m[1]]='00000000'
            elif asm=='XOR EBX,EBX':registers['BL']='00'
            elif asm=='MOV EBX,0x1':registers['BL']='01'
            elif m:=re.fullmatch(r'MOVSS dword ptr \[ESI \+ 0x([0-9a-f]+)\],(XMM\d)',asm):
                if m[2] not in registers:raise ValueError('Unknown Focus SSE source before store')
                plan.append({'source':'Game:'+row['address'],'offset':int(m[1],16),'raw':registers[m[2]],'kind':'word'})
            elif m:=re.fullmatch(r'MOV byte ptr \[ESI \+ 0x([0-9a-f]+)\],(BL|0x[0-9a-f]+)',asm):
                raw=registers.get(m[2]) if m[2]=='BL' else f'{int(m[2],16):02x}'
                if raw is None:raise ValueError('Unknown Focus byte source before store')
                plan.append({'source':'Game:'+row['address'],'offset':int(m[1],16),'raw':raw,'kind':'byte'})
            if row['address'] in enum_calls:
                name,value=enum_calls[row['address']];plan.append({'source':'Game:'+row['address'],'kind':'enum-temporary','name':name,'value':value})
        return plan
    invalidate_plan=stores('2013c840',{'2013c904':('FocusLookAtMode',1),'2013c93b':('FocusLookAtKeysFOR',0)})
    # This separate DWORD occurs before the first temporary enum construction.
    if not any(row['address']=='2013c8e1' and row['assembly']=='MOV dword ptr [ESI + 0x184],EBX' for row in instructions['Game:2013c840']):raise ValueError('Actual Invalidate auxiliary DWORD store absent')
    pos=next(i for i,row in enumerate(invalidate_plan) if row['kind']=='enum-temporary')
    invalidate_plan.insert(pos,{'source':'Game:2013c8e1','kind':'word','offset':0x184,'raw':'01000000'})
    postinit_plan=stores('2013c4e0',{'2013c71e':('CurrentMode',2),'2013c79b':('FocusLookAtMode',1),'2013c7cc':('FocusLookAtKeysFOR',0)})
    if len(invalidate_plan)!=12 or len(postinit_plan)!=80:raise ValueError('Original Focus store-plan extent differs: '+str((len(invalidate_plan),len(postinit_plan))))
    literal_proofs={}
    for address,raw in [('2013b120','66b82c00c3'),('2013b130','b83b000000c3'),('2013b0c0','b001c3'),('2013b140','b001c20800')]:
        if pes['Game'].at(int(address,16),len(bytes.fromhex(raw))).hex()!=raw:raise ValueError('Focus literal getter differs')
        literal_proofs[address]=raw
    evidence={'schema':'gothic3-focus-reading-evidence-v1','inputs':inputs,'nativeCodeExecuted':False,'functions':[functions[k] for k in sorted(functions)],'instructions':instructions,'vtables':tables,'descriptorVtables':field_tables,'containerVtables':containers,'containerConstructorSites':container_sites,'importedSubcalls':bindings,'registrarOrder':{'fileOffset':at,'bytes':registrar_bytes.hex()},'hero':{'sourceSha256':WORLD_SHA,'packetIndex':12,'packetBytes':len(packet_raw),'packetSha256':hero['serializedSha256'],'allFocusedSerializedBytesMatchOriginal':True}}
    evidence['readonlyConstants']=constant_pins
    evidence['literalReturnProofs']=literal_proofs
    evidence['storePlans']={'invalidate':invalidate_plan,'postInitialize':postinit_plan}
    rules={'schema':'gothic3-focus-reading-rules-v1','inputs':{short:v[2] for short,v in INPUTS.items()},'propertyType':59,'getVersion':44,'nativeBytes':408,'nativeVtable':tables['native']['address'],'wrapperVtable':tables['wrapper']['address'],'fields':fields,'heroSerialized':hero,'enumGlobals':{'FocusLookAtMode':'207b8850','FocusLookAtKeysFOR':'207b8854','CurrentMode':'207b5f34'},'containerVtables':{name:table['address'] for name,table in containers.items()},'invalidatePlan':invalidate_plan,'postInitializePlan':postinit_plan,'profile':{'freshSuccessfulAllocation':True,'worldResident':False,'allHeapAddressBitsMasked':True,'unresolved':['nonempty candidate allocation Free unless actual host supplied','real FindFocusEntity scene/picking/interaction services','terminal destruction and full world activation']}}
    for name,value in [('native-evidence.json',evidence),('runtime-rules.json',rules)]:
        for base in (OUT,PUBLIC):save_json(base/name,value)
    readme='''# Original Focus construction and Hero reading

This namespace reconstructs the bounded fresh `gCFocus_PS` factory and the
original `PC_Hero` packet 12 over one 408-byte allocation with 80 reflected
fields. Its native selector is 59 and version 44. Physical byte masks preserve
unknown heap addresses, enum globals, vector constructor bits and padding.
The base object, fields, embedded CurrentEntity proxy and candidate pointer
retain their actual store and capability identities. These are source
components; the browser application does not invoke this reader yet.

The concrete constructor, virtual Create/Attach, descriptor defaults,
PostInitialize, Invalidate and current packet read preserve source ordering.
Each temporary enum retains the real 8-byte reused stack slot through its
base/typed vtable writes, scalar copy and base destruction. Focus Enter uses
the inherited second owner.Modified read. Focus Exit overrides OnNotifyExit
with literal 1, so only its outer owner read occurs. CurrentEntity's descriptor
default resolves its member and does not clear it. Its proxy ID/internal
slots alias the same allocation, with GUID16 equality and cache-DWORD rules.

The three module-global enum values require current masked host words, never
the original PE's file initializers as assumed live defaults. Candidate Free
requires the actual captured allocator service before clearing its header.
Process checks DrawFocusName byte for strict 1 before the actual scene search;
FindFocusEntity needs live scene/picking/interaction services. PostProcess
clears the same look vector before inherited empty processing. Terminal
destruction, entity residency and complete focus selection remain unresolved.
Unknown services stop at their call site with their applied prefix retained.

The offline producer checks immutable Game/Engine/SharedBase hashes and all
selected instruction bytes, vtable slots, registrar order, descriptor stores,
readonly literal words, ordered store plans and the original 1,140-byte Hero
packet. Audited supporting bodies may be captured without being implemented.
Assembly capture selects complete inclusive catalog body ranges by global VA,
including discontiguous ranges and excluding adjacent functions. Each range
has exact instruction-byte coverage and an original PE byte hash. Historical
receipts retain their originally recorded source and collection method.
No original native code is loaded or executed. No tests, build, browser,
deployment or playthrough is run by the producer. An implementation receipt
pins current source, imported Python helpers and all owned namespace output.

Reproduce at this recorded source revision:

```powershell
python -B tools/gothic3/research_focus_reading.py --study $study
```
'''
    for base in (OUT,PUBLIC):(base/'README.md').write_text(readme,encoding='utf8',newline='\n')
    expected={Path(body[key]) for body in functions.values() for key in ['cExcerpt','assemblyExcerpt']}
    for base in (OUT,PUBLIC):
        for path in (base/'sources').rglob('*'):
            if path.is_file() and path.relative_to(base) not in expected:
                if not path.resolve().is_relative_to(base.resolve()):raise ValueError('Owned cleanup escaped namespace')
                path.unlink()
    for relative in expected:
        destination=PUBLIC/relative;destination.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(OUT/relative,destination)
    if not args.capture_only:
        imported=[Path(m.__file__).resolve() for m in list(sys.modules.values()) if getattr(m,'__file__',None) and Path(m.__file__).resolve().parent==ROOT/'tools/gothic3' and Path(m.__file__).suffix=='.py']
        deps=[ROOT/'src/gothic3/focus-reading.ts',ROOT/'src/gothic3/entity-reflection.ts',ROOT/'src/gothic3/entity-lifecycle.ts',ROOT/'src/gothic3/entity-reading.ts',ROOT/'src/gothic3/native-properties.ts',
              *[ROOT/'assets/gothic3'/name for name in ['entity-reflection/runtime-rules.json','entity-reflection/manifest.json','entity-lifecycle/runtime-rules.json','entity-lifecycle/manifest.json','entity-reading/runtime-rules.json','properties/runtime-rules.json']],
              schema_path,candidate_path,Path(__file__).resolve(),*imported]
        owned=[p for base in (OUT,PUBLIC) for p in base.rglob('*') if p.is_file() and p.name!='implementation-receipt.json']
        receipt={'schema':'gothic3-focus-reading-implementation-receipt-v1','baseCommit':'fd8048844d3e06026f96e8b8096cfcd53e3d9eaa','noNativeCodeExecution':True,'noTestsOrBuildRunByProducer':True,'files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(set(deps+owned))]}
        for base in (OUT,PUBLIC):save_json(base/'implementation-receipt.json',receipt)
    print(json.dumps({'functions':len(functions),'instructions':sum(map(len,instructions.values())),'bytes':sum(len(bytes.fromhex(r['bytes'])) for rows in instructions.values() for r in rows),'nativeVtable':rules['nativeVtable'],'wrapperVtable':rules['wrapperVtable']}))


if __name__=='__main__':main()
