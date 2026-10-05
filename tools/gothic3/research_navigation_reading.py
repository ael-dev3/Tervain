"""Offline original Navigation constructor/reflection/native Read evidence.
Never loads native code or runs tests/builds. Source records are not residency.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import re
import struct
import sys
from pathlib import Path

from research_native_combat import PE, save_json, sha
from research_native_clock import collect
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import INPUTS, WORLD_PATH, WORLD_SHA, pin_vtable

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/gothic3/navigation-reading'
PUBLIC = ROOT / 'public/gothic3/navigation-reading'
SELECT = {
    'Game': set('''20289960 20004593 200336fe 20030a30 200328bc 2002bb11
20028eac 20024edd 2001708f 200050c9 20286e50 2050a040 20008689 20286340
2028be90 20291510 20291700 20292300 20292380
2028d930 2028da90 2028e1c0 2028e320 2028ea60 2028ebc0
2028f160 2028f2c0 2028f5a0 2028f7e0 2028ff60 202900c0
202907e0 20290940 20291900 20279700 2028f890 2028d3f0 20276a10'''.split()),
    'Engine': set('3003b863 3003b5bb 3001a091 3002ad10 30037ca4 3000247d 3001d7b9 30030e27 304c43a0'.split()),
    'SharedBase': set('''10007130 10004b74 10006636 10004ea3 1000235b
100030da 1000551a 10004e99 10006db6 10005e48 100068b6 10007356
100043fe 10006861 10006f41 10001159 10002455 100025d6
100052f9 1000437c 1000393b 10003ed6 10002f68 10005d35
10001f05 10003a71 10008233 1000873d 100059ed 10004421 1000277a
10003d28 10004cc8 10005ae7 100013ca 10002833 10002905 10005af6 100035d5 1000459d
10001528 100015cd 10003814 100063c5 1000694c 10007153 100079e1 10008201 10008be3'''.split()),
}

def collect_complete(study, short, directory, selected, pe):
    """Close pure native JMP thunk chains before the common one-hop collector.

    The frozen evidence is independent of whether a prior invocation already
    emitted a later thunk in the chain. No call graph or execution is inferred.
    """
    rows=list(csv.DictReader((study/'01_Decompiled_Code'/directory/'functions.csv').open(encoding='utf-8-sig',newline='')))
    by_entry={row['address']:row for row in rows}
    entries=set(selected); pending=list(entries)
    while pending:
        entry=pending.pop(); row=by_entry[entry]
        if row['body_bytes']!='5':continue
        raw=pe.at(int(entry,16),5)
        if raw[0]!=0xe9:continue
        target=f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}'
        if target not in entries:entries.add(target);pending.append(target)
    return collect(study,short,directory,' '.join(sorted(entries)),pe,OUT)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',type=Path,required=True)
    args=parser.parse_args(); study=args.study.resolve()
    OUT.mkdir(parents=True,exist_ok=True); PUBLIC.mkdir(parents=True,exist_ok=True)
    select={k:set(v) for k,v in SELECT.items()}
    rows=list(csv.DictReader((study/'01_Decompiled_Code/Game_dll/functions.csv').open(encoding='utf-8-sig',newline='')))
    for row in rows:
        name=row['qualified_name']
        if 'gCNavigation_PS' in name and any(name.startswith(x) for x in ('bTPropertyObject<','bTPOPureSmartPtr<')):
            select['Game'].add(row['address'])
    schemas_path=ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json'
    schemas=json.loads(schemas_path.read_text(encoding='utf-8'))
    fields=[x for x in schemas['nativePropertyRegistrars'] if x['className']=='gCNavigation_PS']
    if len(fields)!=15: raise ValueError('Original navigation table differs')
    select['Game'].update(x['entry'] for x in fields)
    pes={}; inputs={}
    for short,(directory,filename,expected) in INPUTS.items():
        path=study/'00_Original_Runtime'/filename
        if sha(path)!=expected: raise ValueError('Original PE differs: '+short)
        pes[short]=PE(path); inputs[short]={'path':'00_Original_Runtime/'+filename,'bytes':path.stat().st_size,'sha256':expected}
    imports=native_imports(pes['Game']); export_maps={k:exports(v) for k,v in pes.items()}
    tables={'native':pin_vtable(pes['Game'],imports,export_maps,0x2068e8b4,0x150)}
    for field in fields:
        tables.setdefault(field['cppType'],pin_vtable(pes['Game'],imports,export_maps,int(field['vtable'],16),0x68))
        for key in ('descriptorStore','offsetStore','defaultStore'):
            instruction=field[key]
            if pes['Game'].at(int(instruction['address'],16),len(bytes.fromhex(instruction['bytes'])))!=bytes.fromhex(instruction['bytes']):
                raise ValueError('Registrar metadata PE mismatch')
        literal=field['nameLiteral']
        if pes['Game'].at(int(literal['address'],16),len(bytes.fromhex(literal['bytes'])))!=bytes.fromhex(literal['bytes']):
            raise ValueError('Original field name differs')
    # Exact root+15 registrar sequence in the original CRT initializer table.
    sequence=[0x2050a040]+[int(x['entry'],16) for x in fields]
    raw=struct.pack('<'+'I'*len(sequence),*sequence)
    positions=[]
    for rva,size,offset in pes['Game'].sections:
        va=pes['Game'].base+rva; data=pes['Game'].data[offset:offset+size]
        index=data.find(raw)
        if index>=0: positions.append(va+index)
    if len(positions)!=1: raise ValueError('Native navigation registration order not unique')
    for table in tables.values():
        for item in table['entries']:
            if item.get('implementation'):
                short,entry=item['implementation'].split(':');select[short].add(entry)
            elif item['target']!='00000000': select['Game'].add(item['target'])
    functions=[]; instructions={}
    for short,(directory,_,_) in INPUTS.items():
        # Reproduce all selected source excerpts retained by this namespace.
        select[short].update(x.stem.removesuffix('.c') for x in (OUT/'sources'/short).glob('*.c.txt'))
        bodies,records=collect_complete(study,short,directory,select[short],pes[short])
        functions.extend(bodies);instructions.update(records)
    # Add the concrete property wrapper table from its root initializer stores.
    initializer=instructions['Game:2050a040']
    stores=[int(m[1],16) for row in initializer for m in [re.search(r'MOV dword ptr \[[^]]+\],0x(2068[0-9a-f]+)',row['assembly'])] if m]
    if not stores: raise ValueError('Original root wrapper vtable store missing')
    wrapper_va=stores[-1]
    tables['wrapper']=pin_vtable(pes['Game'],imports,export_maps,wrapper_va,0x44)
    extra={k:set() for k in INPUTS}
    for item in tables['wrapper']['entries']:
        if item.get('implementation'):
            short,entry=item['implementation'].split(':');extra[short].add(entry)
        elif item['target']!='00000000':extra['Game'].add(item['target'])
    for short,(directory,_,_) in INPUTS.items():
        new=extra[short]-select[short]
        if new:
            bodies,records=collect_complete(study,short,directory,new,pes[short])
            functions.extend(bodies);instructions.update(records)
    # Pin concrete constructor/default/read subcall imports. System services
    # remain actual external boundaries; imported Engine/SharedBase bodies
    # are exported and byte-compared rather than inferred from their names.
    bindings=[]; subcalls={k:set() for k in INPUTS}
    for key in ['Game:20289960','Game:20286e50','Game:2028dcf0','Game:2028e580',
                'Game:2028ee20','Game:20291cb0','Game:20291800','Game:20290310',
                'SharedBase:10012570','SharedBase:10092760']:
        short=key.split(':')[0]; imported=native_imports(pes[short])
        for row in instructions[key]:
            match=re.search(r'(?:CALL\s+|MOV E[A-Z]+,\s*)dword ptr \[0x([0-9a-f]+)\]',row['assembly'])
            if not match: continue
            slot=int(match[1],16)
            if slot not in imported: continue
            imp=imported[slot]; module=imp['library'].removesuffix('.dll')
            item={'function':key,'instruction':row,'slot':f'{slot:08x}','import':imp}
            if module in export_maps:
                target=f"{export_maps[module][imp['decoratedName']]:08x}"
                item['implementation']=module+':'+target;subcalls[module].add(target)
            else:item['status']='required original system service; never executed by producer'
            bindings.append(item)
    for short,(directory,_,_) in INPUTS.items():
        new=subcalls[short]-{x.split(':')[1] for x in instructions if x.startswith(short+':')}
        if new:
            bodies,records=collect_complete(study,short,directory,new,pes[short])
            functions.extend(bodies);instructions.update(records)
    unique={}
    for function in functions:
        if function['id'] in unique and unique[function['id']]!=function: raise ValueError('Conflicting selected body receipts')
        unique[function['id']]=function
    functions=[unique[k] for k in sorted(unique)]
    evidence={'schema':'gothic3-navigation-reading-evidence-v1','nativeCodeExecuted':False,'inputs':inputs,
      'functions':functions,'instructions':instructions,'vtables':tables,
      'registryInitializer':{'address':f'{positions[0]:08x}','bytes':raw.hex()},'registrars':fields,'importedSubcalls':bindings,
      'audit':{'selectedNativeBodies':len(functions),'instructions':sum(map(len,instructions.values())),
               'instructionBytes':sum(len(bytes.fromhex(x['bytes'])) for body in instructions.values() for x in body),
               'allSelectedInstructionBytesMatchOriginalPE':True}}
    serialized=json.loads((ROOT/'assets/gothic3/entity-reflection/serialized-candidates.json').read_text(encoding='utf-8'))
    hero=next(x for x in serialized['entities'] if x['name']=='PC_Hero')['propertySets'][0]
    if hero['className']!='gCNavigation_PS' or hero['nativeReadVersion']!=37: raise ValueError('Focused Hero record differs')
    original_world=study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
    if sha(original_world)!=WORLD_SHA:raise ValueError('Immutable original SysDyn differs')
    original=original_world.read_bytes()
    payload=original[hero['sourceOffset']:hero['endSourceOffset']+4]
    if payload.hex()!=hero['serializedRaw'] or hashlib.sha256(payload).hexdigest()!=hero['serializedSha256']:
        raise ValueError('Original Hero Navigation serialized bytes differ')
    for property in hero['properties']:
        if original[property['sourceOffset']:property['sourceOffset']+property['byteLength']].hex()!=property['raw']:
            raise ValueError('Original property source range differs')
    type_names={'bCVector':'bCVector','bCPropertyID':'bCPropertyID','bCString':'bCString',
        'bTValArray<bCPropertyID>_':'bTValArray<class bCPropertyID>',
        'bTObjArray<bCString>_':'bTObjArray<class bCString>','eCEntityProxy':'eCEntityProxy','bool':'bool'}
    for field in fields:
        serialized_type=next(p['type'] for p in hero['properties'] if p['name']==field['name'])
        if serialized_type!=type_names[field['cppType']]:raise ValueError('Original writer/native descriptor type names differ')
    evidence['serializedSource']={'path':'02_Unpacked_Data/Archives/Projects_compiled.p00/'+WORLD_PATH,
        'sha256':WORLD_SHA,'bytes':len(original),'navigationBegin':hero['sourceOffset'],
        'navigationBytesIncludingSentinel':len(payload),'navigationSha256':hero['serializedSha256'],
        'allFocusedSerializedBytesMatchOriginal':True}
    rules={'schema':'gothic3-navigation-reading-rules-v1','inputs':{k:v[2] for k,v in INPUTS.items()},
      'version':37,'getVersion':1,'propertyType':5,'nativeBytes':0x2b0,'wrapperVtable':f'{wrapper_va:08x}',
      'fields':[{'name':x['name'],'nativeOffset':x['nativeOffset'],'typeName':type_names[x['cppType']],
                 'registrar':'Game:'+x['entry'],'reader':'Game:'+tables[x['cppType']]['entries'][0x38//4]['target'],
                 'defaultInitializer':'Game:'+tables[x['cppType']]['entries'][0x14//4]['target']} for x in fields],
      'heroSerialized':hero,'supportedProfile':'fresh detached successful TypeScript allocations; current native version37; canonical bool; finite float32; indexed ASCII value strings; arrays<=65536; actual CoCreateGuid service required; retained state/wishes identity',
      'gaps':['Actual CoCreateGuid implementation/entropy profile is required from host','Older native Read tails below37 and array descriptor versions below30','Nonpropagated Navigation notify area/routine effects','PostRead GameReset/proxy/world callbacks and entity residency','Native heap/string pool final destruction, nonfresh array backing and failed allocation profiles','Concrete Navigation processable virtual branch']}
    # Property type from actual original virtual literal is reviewed/pinned;
    # selected source evidence below retains its machine instruction.
    for name,value in [('native-evidence.json',evidence),('runtime-rules.json',rules)]:
        save_json(OUT/name,value);save_json(PUBLIC/name,value)
    imported=[]
    for module in list(sys.modules.values()):
        file=getattr(module,'__file__',None)
        if file:
            path=Path(file).resolve()
            if path.parent==ROOT/'tools/gothic3' and path.suffix=='.py':imported.append(path)
    dependencies=[ROOT/'src/gothic3/navigation-reading.ts',ROOT/'src/gothic3/entity-reflection.ts',ROOT/'src/gothic3/entity-lifecycle.ts',
      ROOT/'src/gothic3/navigation-runtime.ts',ROOT/'src/gothic3/player-state.ts',ROOT/'src/gothic3/native-properties.ts',
      ROOT/'src/gothic3/entity-reading.ts',ROOT/'src/gothic3/resource.ts',schemas_path,
      ROOT/'assets/gothic3/entity-reflection/serialized-candidates.json',Path(__file__).resolve(),*imported]
    for dependency in dependencies:
        if not dependency.is_file():raise ValueError('Required implementation dependency missing: '+str(dependency))
    owned=[x for base in (OUT,PUBLIC) for x in base.rglob('*') if x.is_file() and x.name!='implementation-receipt.json']
    receipt={'schema':'gothic3-navigation-reading-implementation-receipt-v1','baseline':'4252aa9a',
      'checksActuallyPerformed':['offline original PE instruction-byte audit','offline original serialized Navigation byte/hash audit','offline source/hash audit'],
      'noNativeCodeExecution':True,'noTestsOrBuildRunByProducer':True,'audit':evidence['audit'],
      'files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(set(owned+dependencies))]}
    save_json(OUT/'implementation-receipt.json',receipt);save_json(PUBLIC/'implementation-receipt.json',receipt)
    print(json.dumps({'audit':evidence['audit'],'receiptSha256':sha(OUT/'implementation-receipt.json')}))

if __name__=='__main__':main()
