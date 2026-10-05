"""Offline original Effect factory/current Hero source receipts, Python3.10+.

Read original PE/world data only. No native code, tests, build, browser or
remote action is executed. Outputs are confined to effect-reading namespaces.
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
from bounded_native_capture import collect
from research_native_combat import PE, save_json, sha
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import INPUTS, WORLD_PATH, WORLD_SHA, pin_vtable
from read_gameplay_properties import _genome_strings

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/gothic3/effect-reading'
PUBLIC=ROOT/'public/gothic3/effect-reading'


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',type=Path,required=True)
    parser.add_argument('--capture-only',action='store_true')
    args=parser.parse_args();study=args.study.resolve()
    pes={};maps={};imports={};catalog={};inputs={};selected={name:set() for name in INPUTS}
    for name,(module,filename,expected) in INPUTS.items():
        path=study/'00_Original_Runtime'/filename
        if sha(path)!=expected:raise ValueError('Original PE differs: '+name)
        pes[name]=PE(path);maps[name]=exports(pes[name]);imports[name]=native_imports(pes[name])
        inputs[name]={'path':'00_Original_Runtime/'+filename,'bytes':path.stat().st_size,'sha256':expected}
        with (study/'01_Decompiled_Code'/module/'functions.csv').open(encoding='utf-8-sig',newline='') as file:
            catalog[name]={row['address']:row for row in csv.DictReader(file)}
    schema_path=ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json'
    fields=sorted((f for f in json.loads(schema_path.read_text(encoding='utf8'))['nativePropertyRegistrars'] if f['className']=='gCEffect_PS'),key=lambda f:f['entry'])
    if [(f['name'],f['nativeOffset']) for f in fields]!=[('Effect',20),('Offset',24),('Probability',36),('Static',40)]:raise ValueError('Original Effect descriptors differ')
    tables={};runtime_fields=[]
    def select_slot(table,offset):
        item=next(row for row in table['entries'] if row['offset']==offset)
        target=item.get('implementation','Game:'+item['target']);name,entry=target.split(':');selected[name].add(entry);return target
    for field in fields:
        selected['Game'].add(field['entry'])
        table=pin_vtable(pes['Game'],imports['Game'],maps,int(field['vtable'],16),0x68);tables[field['name']]=table
        for offset in [0x10,0x14,0x2c,0x38,0x40,0x64]:select_slot(table,offset)
        runtime_fields.append({'name':field['name'],'typeName':field['cppType'],'nativeOffset':field['nativeOffset'],'registrar':'Game:'+field['entry'],
            'defaultInitializer':select_slot(table,0x14),'reader':select_slot(table,0x38),'member':select_slot(table,0x64)})
        for key in ['descriptorStore','offsetStore','defaultStore']:
            row=field[key]
            if pes['Game'].at(int(row['address'],16),len(bytes.fromhex(row['bytes']))).hex()!=row['bytes']:raise ValueError('Original descriptor bytes differ')
        if struct.unpack('<I',bytes.fromhex(field['offsetStore']['bytes'])[-4:])[0]!=field['nativeOffset']:raise ValueError('Original offset literal differs')
    native=pin_vtable(pes['Game'],imports['Game'],maps,0x20666f8c,0x150)
    wrapper=pin_vtable(pes['Game'],imports['Game'],maps,0x20666c84,0x44)
    dispatch={str(offset):select_slot(native,offset) for offset in [0,4,0x10,0x18,0x20,0x24,0x40,0x4c,0x50,0x58,0x5c,0x60,0x68,0x84,0xdc,0xe0,0x118,0x120,0x124,0x128,0x12c,0x138,0x13c]}
    for offset in [0,4,0x10,0x14,0x1c,0x2c,0x3c]:select_slot(wrapper,offset)
    selected['Game'].update('20118990 2011d360 20119db0 2011d670 2011d990 20118f80 2011df70 20119ea0 2011dab0 20118570 200069bf 20024a87 20463e50'.split())
    selected['Engine'].update('300025bd 3003544f'.split())
    selected['SharedBase'].update('10001d07 10007c11 10001f5a 10014640 100149b0 1004a390 1004a3a0 1004a3b0 1004a3c0 10004cc8 10001703 10001717 10007cf2 10002c25 100033f5'.split())
    functions={};instructions={};bindings=[]
    def capture(name,entries):
        wanted=set(entries)-{key.split(':')[1] for key in functions if key.startswith(name+':')}
        if not wanted:return
        fs,rs=collect(study,name,INPUTS[name][0],' '.join(sorted(wanted)),pes[name],OUT)
        functions.update((f['id'],f) for f in fs);instructions.update(rs)
    for name,entries in selected.items():capture(name,entries)
    # Import resolution is bounded to bodies actually selected above. Their
    # import targets and complete forwarding chains are captured, not executed.
    needed={name:set() for name in INPUTS}
    for identity,rows in list(instructions.items()):
        name=identity.split(':')[0]
        for row in rows:
            match=re.search(r'(?:(?:CALL|JMP)\s+dword ptr |MOV [A-Z]+,dword ptr )\[0x([0-9a-f]+)\]',row['assembly'])
            if not match:continue
            item=imports[name].get(int(match[1],16))
            if not item:continue
            module=Path(item['library']).stem;binding={'function':identity,'instruction':row,'import':item}
            if module in maps:
                target=f"{maps[module][item['decoratedName']]:08x}";needed[module].add(target);binding['implementation']=module+':'+target
            else:binding['status']='external native service; not executed'
            bindings.append(binding)
    for name,entries in needed.items():capture(name,entries)
    literals=[]
    for name,va,raw,meaning in [
        ('Game','20118440','66b80100c3','GetVersion1'),('Game','20118450','b860000000c3','GetPropertySetType96'),
        ('Game','2011899c','c7068c6f6620','native vtable20666f8c'),('Game','2011df96','c706846c6620','wrapper vtable20666c84'),
        ('Game','20118429','884628','PostInitialize Static0'),('Game','2011842c','f30f114624','PostInitialize Probability1 store'),
        ('Game','201153f0','8b4114c3','GetSystem reads actual module+14'),
        ('Game','201185e0','6a01','CreateEffect final argument1'),('Game','201185e6','51','CreateEffect captured matrix address'),
        ('Game','201185e7','6a00','CreateEffect third argumentNULL'),('Game','201185eb','ffd0','GetEntity virtual68 takes no operands'),
        ('Game','201185ef','50','CreateEffect captured owner'),('Game','201185f0','55','CreateEffect same CString slot'),
        ('Game','20119dfb','ff15e0887d20','runtime map MemoryAdmin.GetInstance call'),
        ('Game','20119e03','ff15e4887d20','runtime map Realloc call'),
        ('Game','20119e1b','8907','runtime map returned pointer store before memset'),
        ('Game','2011d387','c746042b000000','runtime map43 bucket count'),
        ('Game','2011d392','c7040800000000','runtime map bucket head zero store'),
    ]:
        if pes[name].at(int(va,16),len(bytes.fromhex(raw))).hex()!=raw:raise ValueError('Original literal differs '+meaning)
        literals.append({'module':name,'address':va,'bytes':raw,'meaning':meaning})
    # Actual allocator and readonly postinit probability, not packet guesses.
    allocator_rows=instructions['Game:2011d670']
    if not any(r['assembly']=='PUSH 0x40' for r in allocator_rows):raise ValueError('Original native allocation64 missing')
    probability=pes['Game'].at(0x2065b1c4,4)
    if probability!=bytes.fromhex('0000803f'):raise ValueError('Original probability constant differs')
    source_path=ROOT/'public/gothic3/entity-reflection/serialized-candidates.json'
    serialized=json.loads(source_path.read_text(encoding='utf8'))
    hero=next(e for e in serialized['entities'] if e['name']=='PC_Hero')['propertySets'][17]
    if (hero['className'],hero['outerVersion'],hero['nativeReadVersion'],hero['objectVersion'],hero['propertyVersion'])!=('gCEffect_PS',1,1,83,30):raise ValueError('Original Hero Effect versions differ')
    world_path=study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
    if sha(world_path)!=WORLD_SHA:raise ValueError('Original world differs')
    world=world_path.read_bytes();raw=world[hero['sourceOffset']:hero['endSourceOffset']+4]
    if len(raw)!=92 or raw.hex()!=hero['serializedRaw'] or hashlib.sha256(raw).hexdigest()!=hero['serializedSha256']:raise ValueError('Original Effect packet differs')
    if world[hero['nativeReadOffset']:hero['endSourceOffset']]!=bytes.fromhex('0100'):raise ValueError('Original Effect native tail differs')
    stream,boundary,genome=_genome_strings(world)
    if stream.strings!=serialized['strings']:raise ValueError('Original indexed string table differs')
    normalized=[]
    for field,prop in zip(fields,hero['properties'],strict=True):
        if field['name']!=prop['name'] or field['cppType']!=prop['type']:raise ValueError('Effect field identity differs')
        payload=world[prop['sourceOffset']:prop['sourceOffset']+prop['byteLength']]
        if payload.hex()!=prop['raw']:raise ValueError('Original Effect field bytes differ')
        value=(stream.strings[struct.unpack('<H',payload)[0]] if prop['type']=='bCString' else list(struct.unpack('<fff',payload)) if prop['type']=='bCVector' else struct.unpack('<f',payload)[0] if prop['type']=='float' else payload[0]!=0)
        normalized.append({'name':prop['name'],'typeName':prop['type'],'nativeOffset':field['nativeOffset'],'raw':payload.hex(),'value':value,'sourceOffset':prop['sourceOffset']})
    source={'archive':'Projects_compiled.p00','path':WORLD_PATH,'sha256':WORLD_SHA,'packetOffset':hero['sourceOffset'],'packetBytes':len(raw),'packetSha256':hero['serializedSha256'],
            'nativeReadOffset':hero['nativeReadOffset'],'nativeTailBytes':2,'stringTableBoundary':boundary,'stringTableIndependentlyDecoded':True,'genome':genome}
    rules={'schema':'gothic3-effect-reading-rules-v1','inputs':{n:v['sha256'] for n,v in inputs.items()},'nativeBytes':64,'getVersion':1,'propertyType':96,
        'nativeVtable':'20666f8c','wrapperVtable':'20666c84','fields':runtime_fields,'dispatch':dispatch,'sourceHero':{'index':17,**source},
        'sources':{'allocate':'Game:2011d670','attach':'Game:20118f80','wrapperRead':'Game:20119ea0','dataRead':'Game:2011dab0','initialize':'Game:2011d990'},
        'runtimeMap':{'offset':48,'bucketCount':43,'capacity':51,'allocationBytes':204,'elementCountOffset':60,'constructor':'Game:2011d360','grow':'Game:20119db0'},
        'createEffectOperands':['same CString slot','current owner from virtual68','NULL','captured64B matrix temporary','literal1'],
        'profile':{'freshSuccessfulAllocation':True,'indexedArchive':True,'canonicalBool':True,'worldResident':False,'CStringOwnership':'actual indexed/literal buffer/header/refcount assignment required; known NULL literal-empty branch is concrete'},
        'unresolved':['effect-module cached application/RTTI discovery and physical system+14','actual effect-system create/stop and native warning services','actual shared Matrix.GetIdentity lazy cache/CRT; no duplicate identity module','CString source buffer sharing/refcounts/freeing supplied by actual host','runtime-effect insertion/terminal destruction, legacy/repeated reads and full scene activation']}
    evidence={'schema':'gothic3-effect-reading-native-evidence-v1','nativeCodeExecuted':False,'testsRun':False,'inputs':inputs,
        'functions':[functions[k] for k in sorted(functions)],'instructions':instructions,'descriptorVtables':tables,'nativeVtables':{'native':native,'wrapper':wrapper},
        'effectDescriptors':fields,'importedSubcalls':bindings,'literalProofs':literals,'probabilityLiteral':{'address':'2065b1c4','bytes':probability.hex()},'sourcePacket':source,
        'allInstructionBytesMatchOriginalPE':True,'completeOriginalPEBodyRangesCovered':True,'scope':'Fresh detached Effect factory/defaults/current Hero and examined immediate callbacks; no world activation'}
    doc={'schema':'gothic3-original-hero-effect-v1','source':source,'outerVersion':1,'nativeReadVersion':1,'worldResident':False,'properties':normalized}
    for name,value in [('runtime-rules.json',rules),('hero-effect.json',doc)]:
        save_json(OUT/name,value);save_json(PUBLIC/name,value)
    save_json(OUT/'native-evidence.json',evidence)
    expected={OUT/f[k] for f in functions.values() for k in ['cExcerpt','assemblyExcerpt']}
    for path in (OUT/'sources').rglob('*.txt'):
        if path not in expected:path.unlink()
    discovery=OUT/'native-discovery.json'
    if discovery.exists():discovery.unlink()
    save_json(OUT/'manifest.json',{'schema':'gothic3-effect-reading-manifest-v1','outputs':[{'path':p.name,'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(PUBLIC.glob('*.json'))]})
    if not args.capture_only:
        files=[ROOT/'src/gothic3/effect-reading.ts',Path(__file__).resolve(),schema_path,source_path]
        files += [ROOT/'src/gothic3'/n for n in ['entity-reflection.ts','entity-lifecycle.ts','entity-reading.ts','native-properties.ts']]
        files += [Path(m.__file__).resolve() for m in list(sys.modules.values()) if getattr(m,'__file__',None) and Path(m.__file__).resolve().parent==ROOT/'tools/gothic3' and Path(m.__file__).suffix=='.py']
        files += [p for base in [OUT,PUBLIC] for p in base.rglob('*') if p.is_file() and p.name!='implementation-receipt.json']
        save_json(OUT/'implementation-receipt.json',{'schema':'gothic3-effect-reading-implementation-receipt-v1','baseCommit':'42c7149a','nativeCodeExecuted':False,'testsRun':False,
            'files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(set(files))]})
    print(json.dumps({'functions':len(functions),'instructions':sum(map(len,instructions.values())),'instructionBytes':sum(len(bytes.fromhex(r['bytes'])) for rows in instructions.values() for r in rows),
        'receiptSha256':None if args.capture_only else sha(OUT/'implementation-receipt.json')}))


if __name__=='__main__':main()
