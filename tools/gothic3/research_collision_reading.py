"""Recover real Hero CollisionShape PS and nested shape construction/read offline.

The producer reads the preserved original PEs and source text. No native code,
tests, build, browser or remote action is executed. Constructed shapes are not
registered PhysX objects or resident world members.
"""
from __future__ import annotations
import argparse,csv,hashlib,json,re,struct,sys
from pathlib import Path
from research_native_combat import PE,cblocks,save_json,sha
from research_native_clock import collect
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import INPUTS,WORLD_PATH,WORLD_SHA,pin_vtable,SELECT as REFLECTION_SELECT
from read_gameplay_properties import _genome_strings,_read_class,Cursor

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/gothic3/collision-reading'
PUBLIC=ROOT/'public/gothic3/collision-reading'
CLASSES=('eCCollisionShape_PS','eCCollisionShape')

def close_thunks(rows,entries,pe):
    by={r['address']:r for r in rows};entries=set(entries);pending=list(entries)
    while pending:
        entry=pending.pop();row=by[entry]
        # Some exported JMP entries include unreachable neighboring label bytes.
        # Close the actual first-instruction unconditional JMP, regardless of CSV size.
        raw=pe.at(int(entry,16),5)
        if raw[0]!=0xe9:continue
        target=f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}'
        if target not in by:raise ValueError('Concrete thunk target has no full source boundary '+target)
        if target not in entries:entries.add(target);pending.append(target)
    return entries

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--study',type=Path,required=True)
    ap.add_argument('--capture-only',action='store_true');args=ap.parse_args();study=args.study.resolve()
    OUT.mkdir(parents=True,exist_ok=True);PUBLIC.mkdir(parents=True,exist_ok=True)
    pes={};inputs={};rows={};select={k:set() for k in INPUTS};catalog=[]
    for short,(directory,filename,expected) in INPUTS.items():
        path=study/'00_Original_Runtime'/filename
        if sha(path)!=expected:raise ValueError('Original PE differs: '+short)
        pes[short]=PE(path);inputs[short]={'path':'00_Original_Runtime/'+filename,'bytes':path.stat().st_size,'sha256':expected}
        source=study/'01_Decompiled_Code'/directory
        rows[short]=list(csv.DictReader((source/'functions.csv').open(encoding='utf-8-sig',newline='')))
        for row in rows[short]:
            if row['status']=='decompiled' and row['qualified_name']!='eCCollisionShapeBase_PS::Destroy' and ('eCCollisionShape' in row['qualified_name'] or
                (short=='SharedBase' and row['qualified_name'].startswith(('bCCapsule::','bCOrientedBox::','bCBox::','bCObjectRefBase::Read')))):
                select[short].add(row['address'])
        if short=='Engine':
            for path in sorted((source/'pseudocode').glob('*.c')):
                for entry,block,line in cblocks(path):
                    match=re.search(r'&(eCCollisionShape(?:Base_PS|_PS)?|bCObjectRefBase)::ms_PropertyMember_',block)
                    if not match or 'RegisterPropertyTemplate' not in block:continue
                    prefix=block.split('bCPropertyTypeBase::bCPropertyTypeBase',1)[0]
                    names=re.findall(r'bCString::bCString\([^;]*?,\s*"([^"\n]*)"\)',prefix)
                    template=re.search(r'bTPropertyType<(.+?)>::',block)
                    if not names or not template:raise ValueError('Ambiguous shape registrar '+entry)
                    catalog.append({'module':short,'entry':entry,'className':match[1],'name':names[-1],'cppType':template[1].split(',',1)[1]})
                    select[short].add(entry)
    select['SharedBase'].update(REFLECTION_SELECT['SharedBase'])
    select['Engine'].update('300025bd 3003b5bb 3001a091 3002ad10 30037ca4 3075d780 3075f970 3033c8e0 3033f140 3033d2a0 3033c380 3033f9f0 30361ed0 3033b6d0 3035b900'.split())
    select['SharedBase'].update('1004a5a0 1004a5d0 1004a600 1004a750 100079fa 10005e5c 10002eb9 100132b0 100083c3 10011600 10008143 100076f8 100022d4 1000551a'.split())
    export_maps={k:exports(v) for k,v in pes.items()};import_maps={k:native_imports(v) for k,v in pes.items()}
    functions={};instructions={}
    def capture(short,entries):
        entries=close_thunks(rows[short],entries,pes[short])-{k.split(':')[1] for k in instructions if k.startswith(short+':')}
        if not entries:return
        bodies,records=collect(study,short,INPUTS[short][0],' '.join(sorted(entries)),pes[short],OUT)
        for body in bodies:
            if body['id'] in functions and functions[body['id']]!=body:raise ValueError('Conflicting body receipt')
            functions[body['id']]=body
        instructions.update(records)
    for short in INPUTS:capture(short,select[short])
    # Recover descriptor vtables/offset/default stores and original PE literals.
    for field in catalog:
        stores={};zero=set();body=instructions['Engine:'+field['entry']]
        for row in body:
            match=re.fullmatch(r'XOR (E[ABCD]X|ESI|EDI|EBP),\1',row['assembly'])
            if match:zero.add(match[1])
            match=re.fullmatch(r'MOV dword ptr \[0x([0-9a-f]+)\],0x([0-9a-f]+)',row['assembly'])
            if match:stores[int(match[1],16)]=(int(match[2],16),row)
            match=re.fullmatch(r'MOV dword ptr \[0x([0-9a-f]+)\],(ESI|EDI|EBX|EBP)',row['assembly'])
            if match and match[2] in zero:stores[int(match[1],16)]=(0,row)
            match=re.match(r'(?:MOV|LEA|POP) (ESI|EDI|EBX|EBP),',row['assembly'])
            if match:zero.discard(match[1])
        tables=[(a,v,r) for a,(v,r) in stores.items() if pes['Engine'].base<=v<pes['Engine'].base+0x1000000]
        offsets=[(a,v,r) for a,(v,r) in stores.items() if 0<v<0x10000 and a+4 in stores and stores[a+4][0]==0]
        if len(tables)!=1 or len(offsets)!=1:raise ValueError('Original shape metadata unresolved: '+str(field))
        address,vtable,row=tables[0];oa,offset,orow=offsets[0]
        field.update(descriptor=f'{address:08x}',vtable=f'{vtable:08x}',nativeOffset=offset,defaultPointer=0,
                     descriptorStore=row,offsetStore=orow,defaultStore=stores[oa+4][1])
        names=[]
        for row in body:
            match=re.fullmatch(r'PUSH 0x([0-9a-f]{8})',row['assembly'])
            if match:
                a=int(match[1],16)
                try:
                    if pes['Engine'].cstring(a).decode('cp1252')==field['name']:names.append({'address':match[1],'bytes':pes['Engine'].cstring(a).hex()+'00','instruction':row})
                except (ValueError,UnicodeError):pass
        if not names:raise ValueError('Original shape property literal missing')
        field['nameLiteral']=names[0]
    tables={};crt_orders={}
    for class_name,root_entry in [('eCCollisionShape_PS','3075d780'),('eCCollisionShape','3075f970')]:
        targets=[int(x['entry'],16) for x in catalog if x['className']==class_name]
        candidates=[];needle=struct.pack('<I',int(root_entry,16));at=pes['Engine'].data.find(needle)
        while at>=0:
            tail=pes['Engine'].data[at:at+0x1000];slots={}
            for target in targets:
                matches=[i for i in range(0,len(tail)-3,4) if tail[i:i+4]==struct.pack('<I',target)]
                if len(matches)!=1:break
                slots[target]=matches[0]
            else:candidates.append((at,slots))
            at=pes['Engine'].data.find(needle,at+1)
        if len(candidates)!=1:raise ValueError('Original CRT registrar order ambiguous '+class_name)
        at,slots=candidates[0];size=max(slots.values())+4
        raw=pes['Engine'].data[at:at+size]
        address=next(pes['Engine'].base+rva+at-offset for rva,length,offset in pes['Engine'].sections if offset<=at<offset+length)
        crt_orders[class_name]={'address':f'{address:08x}','bytes':raw.hex(),'sha256':hashlib.sha256(raw).hexdigest(),
          'registrars':[f'{target:08x}' for target in sorted(slots,key=slots.get)]}
    catalog.sort(key=lambda x:(x['className'],crt_orders[x['className']]['registrars'].index(x['entry'])))
    # Constructor stores identify the exact concrete native vtables.
    for label,key in [('psNative','Engine:30337c50'),('shapeNative','Engine:3035acd0')]:
        stores=[int(m[1],16) for row in instructions[key] for m in [re.search(r'MOV dword ptr \[ESI\],0x([0-9a-f]+)',row['assembly'])] if m]
        if len(stores)!=1:raise ValueError('Native vtable constructor store missing '+key)
        tables[label]=pin_vtable(pes['Engine'],import_maps['Engine'],export_maps,stores[0],0x150 if label=='psNative' else 0x60)
    for name,entry in [('psWrapper','3075d780'),('shapeWrapper','3075f970')]:
        stores=[int(m[1],16) for row in instructions['Engine:'+entry] for m in [re.search(r'MOV dword ptr \[[^]]+\],0x(308[0-9a-f]+)',row['assembly'])] if m]
        if not stores:raise ValueError('Wrapper vtable initializer store missing')
        tables[name]=pin_vtable(pes['Engine'],import_maps['Engine'],export_maps,stores[-1],0x44)
    for field in catalog:tables.setdefault(field['cppType']+'@'+field['className'],pin_vtable(pes['Engine'],import_maps['Engine'],export_maps,int(field['vtable'],16),0x68))
    enum_tables={'eECollisionGroup':0x3081f4b4,'eEPhysicRangeType':0x30860a8c,'eECollisionShapeType':0x308211b4,
      'eEShapeGroup':0x3081f304,'eEShapeMaterial':0x3081f3dc,'eEShapeAABBAdapt':0x30821204}
    for name,address in enum_tables.items():tables['enum:'+name]=pin_vtable(pes['Engine'],import_maps['Engine'],export_maps,address,0x20)
    table_entries={k:set() for k in INPUTS}
    for table in tables.values():
        for row in table['entries']:
            if row.get('implementation'):
                short,entry=row['implementation'].split(':');table_entries[short].add(entry)
            elif row['target']!='00000000':table_entries['Engine'].add(row['target'])
    for short in INPUTS:capture(short,table_entries[short])
    # Exact imported constructor/read geometry/refcount helpers, never execute.
    bindings=[];extra={k:set() for k in INPUTS}
    for key in ['Engine:30337c50','Engine:30337a50','Engine:30338710','Engine:3035acd0','Engine:3035a1a0','Engine:3033f140','Engine:30359a50','Engine:30359c10','Engine:303365a0','Engine:303363c0','Engine:30336cc0']:
        for row in instructions[key]:
            match=re.search(r'(?:CALL\s+|MOV E[A-Z]+,\s*)dword ptr \[0x([0-9a-f]+)\]',row['assembly'])
            if not match:continue
            slot=int(match[1],16);imp=import_maps['Engine'].get(slot)
            if not imp:continue
            module=imp['library'].removesuffix('.dll');binding={'function':key,'instruction':row,'slot':f'{slot:08x}','import':imp}
            if module in export_maps:
                target=f"{export_maps[module][imp['decoratedName']]:08x}";binding['implementation']=module+':'+target;extra[module].add(target)
            else:binding['status']='required native service; never executed'
            bindings.append(binding)
    for short in INPUTS:capture(short,extra[short])
    original=study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
    if sha(original)!=WORLD_SHA:raise ValueError('Original SysDyn differs')
    data=original.read_bytes();cursor,_,_=_genome_strings(data)
    candidates=json.loads((ROOT/'assets/gothic3/entity-reflection/serialized-candidates.json').read_text())
    hero=next(e for e in candidates['entities'] if e['name']=='PC_Hero')['propertySets'][2]
    if hero['className']!='eCCollisionShape_PS' or hero['nativeReadVersion']!=63:raise ValueError('Original Hero CollisionShape differs')
    raw=data[hero['sourceOffset']:hero['endSourceOffset']+4]
    if raw.hex()!=hero['serializedRaw'] or hashlib.sha256(raw).hexdigest()!=hero['serializedSha256']:raise ValueError('Original PS bytes differ')
    # Structural audit retains every nested property and every native-tail byte.
    stream=Cursor(data,cursor.strings,hero['nativeReadOffset']+2,base_offset=0);count=stream.u32();shapes=[]
    if count!=2:raise ValueError('Original Hero shape count differs')
    for index in range(count):
        clazz,meta=_read_class(stream)
        shapes.append({'index':index,'className':clazz['name'],'objectVersion':meta['objectVersion'],'propertyVersion':meta['propertyVersion'],
          'nativeReadVersion':clazz['version'],'sourceOffset':meta['sourceOffset'],'endSourceOffset':meta['endSourceOffset'],
          'properties':[dict(prop,**offset) for prop,offset in zip(clazz['properties'],meta['properties'])],
          'nativeReadOffset':meta['tailSourceOffset']-2,'tailRaw':clazz['tail'],
          'serializedRaw':data[meta['sourceOffset']:meta['endSourceOffset']].hex(),
          'serializedSha256':hashlib.sha256(data[meta['sourceOffset']:meta['endSourceOffset']]).hexdigest()})
    if stream.pos!=hero['endSourceOffset']:raise ValueError('Unconsumed original CollisionShape PS tail bytes')
    literal_pins=[]
    for name,address,length in [('Shape.Read switch1through7',0x3035a464,28),('Shape.PostInit SkinWidth',0x308193d4,4),
      ('Shape.PostInit raw40',0x30818434,4)]:
        raw=pes['Engine'].at(address,length)
        literal_pins.append({'name':name,'module':'Engine','address':f'{address:08x}','bytes':raw.hex(),'sha256':hashlib.sha256(raw).hexdigest()})
    for short,address in [('Engine',0x30aa202c),('SharedBase',0x1013f1a8)]:
        mangled=pes[short].cstring(address+8)
        if mangled!=b'.?AVbCObjectRefBase@@':raise ValueError('Original reflected end-sentinel RTTI differs')
        raw=pes[short].at(address,8+len(mangled)+1)
        literal_pins.append({'name':'actual bCObjectRefBase end-sentinel RTTI','module':short,'address':f'{address:08x}',
          'bytes':raw.hex(),'sha256':hashlib.sha256(raw).hexdigest()})
    switch=struct.unpack('<7I',bytes.fromhex(literal_pins[0]['bytes']))
    if switch[3]!=0x3035a357:raise ValueError('Original capsule switch dispatch differs')
    for class_name,count_expected in [('eCCollisionShapeBase_PS',0)]:
        if any(x['className']==class_name for x in catalog):raise ValueError('Inherited metadata unexpectedly contains fields')
    audit={'selectedNativeBodies':len(functions),'instructions':sum(map(len,instructions.values())),
      'instructionBytes':sum(len(bytes.fromhex(r['bytes'])) for body in instructions.values() for r in body),'allSelectedInstructionBytesMatchOriginalPE':True}
    evidence={'schema':'gothic3-collision-reading-evidence-v1','nativeCodeExecuted':False,'inputs':inputs,
      'functions':[functions[k] for k in sorted(functions)],'instructions':instructions,'vtables':tables,'registrars':catalog,
      'importedSubcalls':bindings,'literalPins':literal_pins,'crtRegistrationOrder':crt_orders,'metadataHierarchy':{'eCCollisionShape_PS':'eCCollisionShapeBase_PS','eCCollisionShapeBase_PS':'eCEntityPropertySet','eCCollisionShape':None},'cppShapeParent':'bCObjectRefBase','baseIteratorSentinel':{'GetBaseClass':'SharedBase:1009ae00','sentinelNameGetter':'SharedBase:10005e5c','shapeBaseNameGetter':'Engine:3035cde0','contentEqualityChain':['SharedBase:10002eb9','SharedBase:100132b0','SharedBase:100083c3','SharedBase:10011600'],'result':'known NULL at bCObjectRefBase; no reflected base root is invented'},'audit':audit,'originalSource':{'path':'02_Unpacked_Data/Archives/Projects_compiled.p00/'+WORLD_PATH,
      'bytes':len(data),'sha256':WORLD_SHA,'psSerializedSha256':hero['serializedSha256'],'allFocusedSerializedBytesMatchOriginal':True}}
    rules={'schema':'gothic3-collision-reading-rules-v1','inputs':{k:v[2] for k,v in INPUTS.items()},'heroSerialized':hero,'shapeRecords':shapes,
      'fields':{},'nativeVtables':{k:v['address'] for k,v in tables.items() if k in ('psNative','shapeNative','psWrapper','shapeWrapper')}}
    for class_name in CLASSES:
        rules['fields'][class_name]=[{'name':x['name'],'nativeOffset':x['nativeOffset'],
          'typeName':('bTPropertyContainer<enum '+x['cppType'][20:-2]+'>' if x['cppType'].startswith('bTPropertyContainer<') else 'short' if x['cppType']=='unsigned_short' else x['cppType']),'cppType':x['cppType'],'registrar':'Engine:'+x['entry'],
          'reader':'Engine:'+tables[x['cppType']+'@'+class_name]['entries'][0x38//4]['target'],
          'defaultInitializer':'Engine:'+tables[x['cppType']+'@'+class_name]['entries'][0x14//4]['target']} for x in catalog if x['className']==class_name]
    for class_name,records in [('eCCollisionShape_PS',[hero]),('eCCollisionShape',shapes)]:
        expected={f['name']:f['typeName'] for f in rules['fields'][class_name]}
        for record in records:
            actual={f['name']:f['type'] for f in record['properties']}
            if actual!=expected:raise ValueError('Actual serialized field/type table differs '+class_name+': '+str(actual)+' / '+str(expected))
    rules['profile']={'selectedCurrentHeroNativeVersions':{'eCCollisionShape_PS':63,'eCCollisionShape':74},
      'nativeCategory':{'eCCollisionShape_PS':'entity-property-set','eCCollisionShape':'non-property-set'},
      'physicalSizes':{'eCCollisionShape_PS':76,'eCCollisionShape':120,'bCCapsule':56},
      'supportedShapePayload':'current type4 capsule; exact56-byte payload, inheritedu16, embeddedBox24 and Vector12',
      'maskedConstructorDefaults':'live enum-default globals are mutable BSS; missing actual storage stays masked until source PostInitialize overwrites it',
      'allocationProfile':'fresh objects and successful bounded TypeScript moving allocations; native numeric heap pointer identity remains masked',
      'dependencies':['actual captured live owner registry/physics/cache/response-buffer services','original warnings when their source branches execute','actual local notification temporary CString constructor/Compare/destructor ownership',
        'terminal native shape/wrapper/geometry destruction if source reference count reaches zero','legacy native migration or non-capsule payload branches'],
      'worldResident':False,'physXActorCreatedByLoading':False}
    readme='''# Original collision reading

This namespace constructs a real detached eCCollisionShape_PS (type14, GetVersion63) and two real reflected eCCollisionShape objects (GetVersion74, C++ bCObjectRefBase). The original Hero packet contains two type4 capsules. Each current capsule read retains all56 payload bytes, the inherited nativeu16, embedded Box24 bytes and center Vector12 bytes. The producer independently compares the serialized field names/types, every focused original packet byte, native instruction bytes, vtable dispatch, enum default/Read/Copy helpers, thunk chains, the switch table, and CRT descriptor order with immutable source files.

Register collisionReflectionRoots once, then collisionFactory and shapeFactory from createNativeCollisionFactories(host) on the same NativeReflectionController. Only eCCollisionShapeBase_PS is an additional reflected parent. bCObjectRefBase is the original base-iterator end sentinel: Shape has a NULL reflected parent and no invented reflected base root. The actual C++ inheritance and native reference state remain present. Factory capability lookups retain stopped allocation prefixes; they do not certify completed reads.

OriginalCollisionProperties.base and its values are the same NativeLivePropertySet used by entity lifecycle. Its movement identity is that base object. Its NativeEntityCollisionShape setter values and notifications use the same fields. The two real arrays retain shape pointers and wrapper references; normal shapes and proprietary/touching shapes remain distinct. ClearTouchingShapes clears nativebyte40, releases and clears proprietary array slots in source order, then writes its count0; it does not clear the ordinary shapes array.

Constructor-uninitialized and uncaptured mutable enum-global bits remain masked. Numeric native heap pointer addresses are not invented. Supported allocation is successful fresh bounded TypeScript allocation. Current native reads support PS versions>=63 and type4 Shape versions>=74; older migration/non-capsule branches stop at their actual unresolved prefix. Native raw float payload reads retain original IEEE bits without arithmetic validation. Canonical native bool/indexed ASCII domains remain explicit.

Real PostRead always requires the captured physical owner HasPS48 and GetPS13 services; conditional physics creation, buffers/cache, warnings and actor effects remain required. Local exit notifications preserve three original temporary CString constructor/Compare/destructor sequences, with source physics-condition/destructor/branch ordering. Propagated reflective exit skips these local services. Terminal release/destruction, resource/actor/world registration and native PhysX services are not inferred to be empty or complete. Same-instance mutation and same-class factory/read reentry stop with retained attempted/applied prefixes; legitimate PS-to-Shape nesting remains supported. Loaded objects are detached, not resident.

The receipt records offline source/PE/serialized/hash audits only. The producer executes no game/native code, tests, build, browser, remotes or Actions.
'''
    (OUT/'README.md').write_text(readme,encoding='utf-8',newline='\n');(PUBLIC/'README.md').write_text(readme,encoding='utf-8',newline='\n')
    for name,value in [('native-evidence.json',evidence),('runtime-rules.json',rules)]:save_json(OUT/name,value);save_json(PUBLIC/name,value)
    if not args.capture_only:
        imported=[]
        for module in list(sys.modules.values()):
            file=getattr(module,'__file__',None)
            if file:
                p=Path(file).resolve()
                if p.parent==ROOT/'tools/gothic3' and p.suffix=='.py':imported.append(p)
        dependencies=[ROOT/'src/gothic3/collision-reading.ts',ROOT/'src/gothic3/entity-reflection.ts',ROOT/'src/gothic3/entity-lifecycle.ts',
          ROOT/'src/gothic3/entity-reading.ts',ROOT/'src/gothic3/movement-state.ts',ROOT/'src/gothic3/entity-setters.ts',ROOT/'assets/gothic3/entity-reflection/serialized-candidates.json',
          Path(__file__).resolve(),*imported]
        for p in dependencies:
            if not p.is_file():raise ValueError('Required implementation dependency missing '+str(p))
        owned=[p for base in (OUT,PUBLIC) for p in base.rglob('*') if p.is_file() and p.name!='implementation-receipt.json']
        receipt={'schema':'gothic3-collision-reading-implementation-receipt-v1','baseline':'a81549c8e537070e7c41d505eb8cfef655ac33b7',
          'checksActuallyPerformed':['offline original PE instruction-byte audit','offline original PS/shape serialized-byte audit','offline source/hash audit'],
          'noNativeCodeExecution':True,'noTestsOrBuildRunByProducer':True,'audit':audit,
          'files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(set(owned+dependencies))]}
        save_json(OUT/'implementation-receipt.json',receipt);save_json(PUBLIC/'implementation-receipt.json',receipt)
    print(json.dumps({'audit':audit,'fields':{k:len(v) for k,v in rules['fields'].items()},'shapeRecords':len(shapes),
                      'receiptSha256':None if args.capture_only else sha(OUT/'implementation-receipt.json')}))

if __name__=='__main__':main()
