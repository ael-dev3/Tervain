"""Recover original ScriptRoutine factory/current Hero reading, offline only.

No native execution, tests, browser, builds or remote actions. Outputs belong
only to the routine-reading namespaces; original source excerpts keep bytes.
"""
from __future__ import annotations
import argparse, csv, hashlib, json, re, shutil, struct, sys
from pathlib import Path
from research_native_combat import PE, save_json, sha
from research_native_clock import collect
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import INPUTS, SELECT as REFLECTION_SELECT, pin_vtable, WORLD_PATH, WORLD_SHA

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'assets/gothic3/routine-reading'
PUBLIC = ROOT/'public/gothic3/routine-reading'
SELECT = {'Game': set('20028745 200358be 200151d6 2002b0a8 20021643 2001ad3e 20018d6d 2000e408 2002554a 20027809 2000a745 20020469 2051e1c0 20036ec1 20027110 2002d52e 2035c910 20361e10 20358b80 2002c313'.split()),
          'Engine': set('300025bd 3003b5bb 3001a091 3002ad10 30037ca4'.split()),
          'SharedBase': set(REFLECTION_SELECT['SharedBase'])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--capture-only', action='store_true')
    args = parser.parse_args(); study = args.study.resolve()
    OUT.mkdir(parents=True, exist_ok=True); PUBLIC.mkdir(parents=True, exist_ok=True)
    pes, inputs, catalog = {}, {}, {}
    for short, (directory, filename, expected) in INPUTS.items():
        path = study/'00_Original_Runtime'/filename
        if sha(path) != expected: raise ValueError('Original PE differs: '+short)
        pes[short] = PE(path)
        inputs[short] = {'path':'00_Original_Runtime/'+filename, 'bytes':path.stat().st_size, 'sha256':expected}
        with (study/'01_Decompiled_Code'/directory/'functions.csv').open(encoding='utf-8-sig', newline='') as file:
            catalog[short] = {row['address']:row for row in csv.DictReader(file)}
    schema_path = ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json'
    descriptors = [row for row in json.loads(schema_path.read_text(encoding='utf8'))['nativePropertyRegistrars'] if row['className']=='gCScriptRoutine_PS']
    if len(descriptors) != 15: raise ValueError('Original Routine field table differs')
    SELECT['Game'].update(row['entry'] for row in descriptors)
    functions, instructions = {}, {}
    def capture(short, requested):
        entries = set(requested); pending = list(entries)
        while pending:
            entry = pending.pop(); raw = pes[short].at(int(entry,16),5)
            if raw[0] != 0xe9: continue
            target = f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}'
            if target not in catalog[short]: raise ValueError('Source thunk boundary missing: '+short+':'+target)
            if target not in entries: entries.add(target); pending.append(target)
        entries -= {key.split(':')[1] for key in instructions if key.startswith(short+':')}
        if not entries: return
        bodies, records = collect(study,short,INPUTS[short][0],' '.join(sorted(entries)),pes[short],OUT)
        functions.update((body['id'],body) for body in bodies); instructions.update(records)
    for short in INPUTS: capture(short, SELECT[short])
    maps = {short:exports(pe) for short,pe in pes.items()}
    imports = {short:native_imports(pe) for short,pe in pes.items()}
    stores = [int(match[1],16) for row in instructions['Game:20357c00'] for match in [re.fullmatch(r'MOV dword ptr \[ESI\],0x([0-9a-f]+)',row['assembly'])] if match]
    if len(stores) != 1: raise ValueError('Native Routine constructor table ambiguous')
    wrapper_stores = [int(match[1],16) for row in instructions['Game:2051e1c0'] for match in [re.fullmatch(r'MOV dword ptr \[0x[0-9a-f]+\],0x(206[0-9a-f]+)',row['assembly'])] if match]
    if len(wrapper_stores) != 1: raise ValueError('Routine root wrapper table ambiguous')
    tables = {'native':pin_vtable(pes['Game'],imports['Game'],maps,stores[0],0x150),
              'wrapper':pin_vtable(pes['Game'],imports['Game'],maps,wrapper_stores[0],0x44)}
    field_tables = {row['name']:pin_vtable(pes['Game'],imports['Game'],maps,int(row['vtable'],16),0x40) for row in descriptors}
    container_addresses = [int(match[1],16) for row in instructions['Game:20357c00'] for match in [re.fullmatch(r'MOV dword ptr \[EBX\],0x([0-9a-f]+)',row['assembly'])] if match]
    if len(container_addresses)!=5: raise ValueError('Exact Routine enum container tables missing')
    containers = {name:pin_vtable(pes['Game'],imports['Game'],maps,address,0x1c) for name,address in zip(['AniState','Action','AmbientAction','AIMode','HitDirection'],container_addresses,strict=True)}
    needed = {short:set() for short in INPUTS}
    def select_slot(item):
        module,entry = item.get('implementation','Game:'+item['target']).split(':')
        if entry != '00000000': needed[module].add(entry)
    for table in tables.values():
        for item in table['entries']:
            if table is tables['native'] and item['offset'] not in {0,4,0x10,0x18,0x20,0x3c,0x40,0x4c,0x50,0x58,0x5c,0x60,0x68,0x84,0x12c,0x138,0x13c}: continue
            select_slot(item)
    for table in field_tables.values():
        for item in table['entries']:
            if item['offset'] in {0x14,0x38}: select_slot(item)
    for table in containers.values():
        for item in table['entries']:
            if item['offset'] in {0x10,0x18}: select_slot(item)
    for short in INPUTS: capture(short, needed[short])
    bindings = []; needed = {short:set() for short in INPUTS}
    # Resolve direct imported helpers from the concrete constructor/default/read
    # paths; embedded SPU execution remains an explicit actual host capability.
    for identity, rows in list(instructions.items()):
        if identity.split(':')[0] != 'Game': continue
        for row in rows:
            match = re.search(r'(?:CALL|JMP)\s+dword ptr \[0x([0-9a-f]+)\]',row['assembly'])
            if not match: continue
            slot = int(match[1],16); imp = imports['Game'].get(slot)
            if not imp: continue
            module = imp['library'].removesuffix('.dll')
            binding = {'function':identity,'instruction':row,'importSlot':match[1],'import':imp}
            if module in maps:
                entry = f"{maps[module][imp['decoratedName']]:08x}"; binding['implementation']=module+':'+entry; needed[module].add(entry)
            else: binding['status']='external native service; never executed'
            bindings.append(binding)
    for short in INPUTS: capture(short, needed[short])
    candidate_path = ROOT/'assets/gothic3/entity-reflection/serialized-candidates.json'
    hero = next(entity for entity in json.loads(candidate_path.read_text(encoding='utf8'))['entities'] if entity['name']=='PC_Hero')['propertySets'][8]
    original = study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
    if sha(original) != WORLD_SHA: raise ValueError('Original Hero world differs')
    world = original.read_bytes(); raw = world[hero['sourceOffset']:hero['endSourceOffset']+4]
    if hero['className']!='gCScriptRoutine_PS' or hero['nativeReadVersion']!=1 or len(raw)!=245 or raw.hex()!=hero['serializedRaw'] or hashlib.sha256(raw).hexdigest()!=hero['serializedSha256']: raise ValueError('Original Hero Routine packet differs')
    if world[hero['nativeReadOffset']:hero['endSourceOffset']] != bytes.fromhex('0100'): raise ValueError('Routine native tail differs')
    fields = []
    for descriptor,prop in zip(descriptors,hero['properties'],strict=True):
        rows = instructions['Game:'+descriptor['entry']]
        if descriptor['name']!=prop['name'] or any(descriptor[key] not in rows for key in ['descriptorStore','offsetStore','defaultStore']): raise ValueError('Descriptor source proof differs')
        if pes['Game'].cstring(int(descriptor['nameLiteral']['address'],16)).decode('ascii')!=descriptor['name']: raise ValueError('Descriptor name differs')
        if world[prop['sourceOffset']:prop['sourceOffset']+prop['byteLength']].hex()!=prop['raw']: raise ValueError('Original field payload differs')
        slots = {item['offset']:item for item in field_tables[descriptor['name']]['entries']}
        target = lambda slot: slots[slot].get('implementation','Game:'+slots[slot]['target'])
        fields.append({'name':prop['name'],'typeName':prop['type'],'nativeOffset':descriptor['nativeOffset'],'registrar':'Game:'+descriptor['entry'],'reader':target(0x38),'defaultInitializer':target(0x14)})
    registrar_bytes = b''.join(struct.pack('<I',int(row['entry'],16)) for row in descriptors)
    file_offset = pes['Game'].data.find(registrar_bytes)
    if file_offset<0 or pes['Game'].data.find(registrar_bytes,file_offset+1)>=0: raise ValueError('Original Routine registrar array ambiguous')
    order = {'fileOffset':file_offset,'bytes':registrar_bytes.hex(),'entries':[row['entry'] for row in descriptors]}
    audit = {'selectedNativeBodies':len(functions),'instructions':sum(map(len,instructions.values())),'instructionBytes':sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows),'allSelectedInstructionBytesMatchOriginalPE':True}
    literal_pins = [('20356bb0','66b80100c3','GetVersion1'),('20356bc0','b82d000000c3','type45'),('203573e0','b001c3','IsProcessabletrue'),('2035c97d','68c4000000','new allocation tag0xc4'),('2035c982','68f4010000','native allocation500bytes')]
    for address,expected,_ in literal_pins:
        if pes['Game'].at(int(address,16),len(bytes.fromhex(expected))).hex()!=expected: raise ValueError('Original Routine literal differs: '+address)
    evidence = {'schema':'gothic3-routine-reading-evidence-v1','inputs':inputs,'nativeCodeExecuted':False,'functions':[functions[key] for key in sorted(functions)],'instructions':instructions,'vtables':tables,'descriptorVtables':field_tables,'containerVtables':containers,'importedSubcalls':bindings,'registrarOrder':order,'literalPins':[{'address':address,'bytes':expected,'meaning':meaning} for address,expected,meaning in literal_pins],'audit':audit,'originalHero':{'sourcePath':WORLD_PATH,'sourceSha256':WORLD_SHA,'packetIndex':8,'packetBytes':len(raw),'packetSha256':hero['serializedSha256'],'allFocusedSerializedBytesMatchOriginal':True}}
    rules = {'schema':'gothic3-routine-reading-rules-v1','inputs':{short:data[2] for short,data in INPUTS.items()},'propertyType':45,'getVersion':1,'nativeBytes':500,'nativeVtable':tables['native']['address'],'wrapperVtable':tables['wrapper']['address'],'fields':fields,'heroSerialized':hero,'enumGlobals':{'AniState':'207cbf3c','Action':'207cbf40','AmbientAction':'207cbf44','AIMode':'207cbf48','HitDirection':'207cbf4c'},'containerVtables':{name:table['address'] for name,table in containers.items()},'profile':{'allocation':'fresh successful concrete allocation; physical heap address bits stay masked','embeddedSPU':'actual source-equivalent constructor and methods required, retained once at native+64','currentNativeRead':'consume only u16 and return1; no inheritedRead','worldResident':False,'unresolved':['terminal destruction/memory services','embedded SPU and CString ownership services unless supplied','all Hero factories and live world activation','original savegame paths and full game progression']}}
    for name,value in [('native-evidence.json',evidence),('runtime-rules.json',rules)]: save_json(OUT/name,value); save_json(PUBLIC/name,value)
    expected = {Path(body[key]) for body in functions.values() for key in ['cExcerpt','assemblyExcerpt']}
    for base in (OUT,PUBLIC):
        for path in (base/'sources').rglob('*'):
            if path.is_file() and path.relative_to(base) not in expected:
                if not path.resolve().is_relative_to(base.resolve()): raise ValueError('Source cleanup leaves owned namespace')
                path.unlink()
    for relative in sorted(expected):
        destination = PUBLIC/relative; destination.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(OUT/relative,destination)
    readme = '''# Original ScriptRoutine factory and reading

OriginalRoutineReader registers the concrete gCScriptRoutine_PS (type45/version1) over one retained physical value store. The native constructor builds four strings, five enum containers reading current masked module globals, one actual embedded SPU at+64 and debug byte+1f0=0. It requires the real embedded SPU constructor; a fabricated seed or another actor's processor is not a substitute. Descriptor defaults and reads share the same NativeRoutineProperties consumed by source script setters and OriginalEntityPropertySet notifications. Runtime heap addresses are masked rather than copied from PE virtual addresses.

Hero packet8 is245 bytes including its sentinel, with15 descriptors and a two-byte native version tail. Native Read always consumes only thatu16 and returns1. Reflective long/float/string/container payloads preserve their source order; declared lengths do not cause seeking. The constructor/default/read profile remains detached. OnPostRead executes the outer GameReset ordered stores and actual embedded SPU/CString calls before its inherited RET. Missing services stop at their actual call site with already applied prefixes retained. IsProcessable istrue; OnPreProcess/OnProcess require actual embedded processor owner/process services. These are not evidence of live story execution, saves, world membership or completed gameplay.

The producer independently compares selected instructions and Hero packet bytes with immutable local files and verifies the source registrar order, vtable dispatch and descriptor metadata. The receipt hashes current implementation/helpers/output; no native code, tests, build, browser or remote action is run.
'''
    for base in (OUT,PUBLIC): (base/'README.md').write_text(readme,encoding='utf8',newline='\n')
    if not args.capture_only:
        imported = [Path(module.__file__).resolve() for module in list(sys.modules.values()) if getattr(module,'__file__',None) and Path(module.__file__).resolve().parent==ROOT/'tools/gothic3' and Path(module.__file__).suffix=='.py']
        deps = [ROOT/'src/gothic3/routine-reading.ts',ROOT/'src/gothic3/entity-reflection.ts',ROOT/'src/gothic3/entity-lifecycle.ts',ROOT/'src/gothic3/entity-reading.ts',ROOT/'src/gothic3/native-properties.ts',ROOT/'src/gothic3/script-routine.ts',schema_path,candidate_path,Path(__file__).resolve(),*imported]
        owned = [path for base in (OUT,PUBLIC) for path in base.rglob('*') if path.is_file() and path.name!='implementation-receipt.json']
        receipt = {'schema':'gothic3-routine-reading-implementation-receipt-v1','baseline':'eb97f57b3ff2b7838862078276740526f3dc962a','checksActuallyPerformed':['offline original PE instruction-byte audit','offline current Hero packet audit','current implementation/dependency/output hash audit'],'noNativeCodeExecution':True,'noTestsOrBuildRunByProducer':True,'audit':audit,'files':[{'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':sha(path)} for path in sorted(set(deps+owned))]}
        for base in (OUT,PUBLIC): save_json(base/'implementation-receipt.json',receipt)
    print(json.dumps({'audit':audit,'nativeVtable':rules['nativeVtable'],'wrapperVtable':rules['wrapperVtable'],'receiptSha256':None if args.capture_only else sha(OUT/'implementation-receipt.json')}))


if __name__=='__main__': main()
