"""Reproduce original CharacterControl construction/current Hero read offline.

Python 3.10+, standard library; original modules are data, never loaded or run.
Curated ordered programs are checked against original PE instructions and are
not an x86 emulator. Live module globals are not inferred from cold PE state.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import re
import struct
from pathlib import Path
from research_native_combat import PE, save_json, sha
from research_native_clock import collect
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import INPUTS, WORLD_PATH, WORLD_SHA, pin_vtable

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'assets/gothic3/control-reading'
PUBLIC = ROOT/'public/gothic3/control-reading'


def capture(study, name, module, selected, pe):
    """Close all exact five-byte forwarding bodies in one producer invocation."""
    with (study/'01_Decompiled_Code'/module/'functions.csv').open(encoding='utf-8-sig', newline='') as file:
        catalog = {row['address']: row for row in csv.DictReader(file)}
    pending = list(selected)
    while pending:
        entry = pending.pop(); row = catalog[entry]; raw = pe.at(int(entry, 16), 5)
        if row['body_bytes'] == '5' and raw[0] == 0xe9:
            target = f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}'
            if target not in selected:
                selected.add(target); pending.append(target)
    return collect(study, name, module, ' '.join(sorted(selected)), pe, OUT)


def cold_zero_fill(pe, proof):
    """Check section headers/ranges: loader zero-fill is not a file-byte read."""
    nt = struct.unpack_from('<I', pe.data, 0x3c)[0]
    count = struct.unpack_from('<H', pe.data, nt+6)[0]
    optional = struct.unpack_from('<H', pe.data, nt+20)[0]
    section = proof['section']; found = None
    for index in range(count):
        at = nt+24+optional+index*40
        virtual_size, rva, raw_size, raw_at = struct.unpack_from('<IIII', pe.data, at+8)
        if rva == section['virtualAddress']:
            found = (virtual_size, rva, raw_size, raw_at)
            proof['sectionHeaderBytes'] = pe.data[at:at+40].hex()
            break
    expected = (section['virtualSize'], section['virtualAddress'], section['rawSize'], section['rawOffset'])
    address = int(proof['va'],16)-pe.base
    if (found != expected or address < section['virtualAddress']+section['rawSize'] or
        address+proof['bytes'] > section['virtualAddress']+section['virtualSize'] or
        proof.get('initialImageValue') != 0 or proof.get('PEInitialImageZeroFill') is not True or
        proof.get('liveValueCaptured') is not False):
        raise ValueError('Original cold global zero-fill proof differs')


def source_operations(program, pes, lookup):
    for stage in program['programs']:
        for operation in stage['operations']:
            name = operation['module']; address = operation['sourceVA']; source = operation['source']
            expected = bytes.fromhex(source['bytes'])
            if pes[name].at(int(address,16),len(expected)) != expected:
                raise ValueError('Curated original instruction differs: '+address)
            row = lookup.get((name,address))
            if not row or row['bytes'] != source['bytes'] or row['assembly'] != source['assembly']:
                raise ValueError('Curated instruction absent from selected original body: '+address)
            operation['sourceInstruction'] = row


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study',type=Path,required=True)
    parser.add_argument('--capture-only',action='store_true')
    args = parser.parse_args(); study = args.study.resolve()
    OUT.mkdir(parents=True,exist_ok=True); PUBLIC.mkdir(parents=True,exist_ok=True)
    program_path = OUT/'construction-program.json'
    program = json.loads(program_path.read_text(encoding='utf8'))
    if (program['nativeBytes'], program['nativeVtable'], program['wrapperVtable'],
        program['getVersion'], program['getPropertySetType']) != (176,'20686abc','20686c5c',2,22):
        raise ValueError('CharacterControl curated literal profile differs')
    pes, inputs, maps = {}, {}, {}
    selectors = {name:set(entries) for name,entries in program['additionalSelectors'].items()}
    for name,(module,filename,expected) in INPUTS.items():
        path = study/'00_Original_Runtime'/filename
        if sha(path) != expected: raise ValueError('Original installed build differs: '+name)
        pes[name] = PE(path); maps[name] = exports(pes[name])
        inputs[name] = {'path':'00_Original_Runtime/'+filename,'bytes':path.stat().st_size,'sha256':expected}
    schema_path = ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json'
    schema = json.loads(schema_path.read_text(encoding='utf8'))
    fields = sorted((value for value in schema['nativePropertyRegistrars'] if value['className']=='gCCharacterControl_PS'),key=lambda value:int(value['entry'],16))
    if [field['name'] for field in fields] != ['ControlFrameOfReference','PressedKey','IsPressed','IsPressedBefore','DurationPressedMSecs']:
        raise ValueError('Original five field descriptor order differs')
    imports = native_imports(pes['Game']); descriptor_tables = {}
    for field in fields:
        selectors['Game'].add(field['entry'])
        table = pin_vtable(pes['Game'],imports,maps,int(field['vtable'],16),0x68)
        descriptor_tables[field['name']] = table
        for item in table['entries']:
            if item['offset'] not in [0x10,0x14,0x2c,0x38,0x64]: continue
            if item.get('implementation'):
                name,entry = item['implementation'].split(':'); selectors[name].add(entry)
            elif item['target'] != '00000000': selectors['Game'].add(item['target'])
    functions, instructions = [], {}
    for name,(module,_,_) in INPUTS.items():
        bodies,records = capture(study,name,module,selectors[name],pes[name])
        functions += bodies; instructions.update(records)
    for function in functions:
        name = function['id'].split(':')[0]; ranges = []
        for first,last in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})',function['bodyRanges']):
            size = int(last,16)-int(first,16)+1
            ranges.append({'startVA':first,'endVAInclusive':last,'bytes':size,
                           'sha256':hashlib.sha256(pes[name].at(int(first,16),size)).hexdigest()})
        if not ranges: raise ValueError('Original full body range absent')
        function['originalPEBodyRanges'] = ranges
    lookup = {(key.split(':')[0],row['address']):row for key,rows in instructions.items() for row in rows}
    source_operations(program,pes,lookup)
    for table in [program['peerNativeVtable'],program['peerWrapperVtable']]:
        for slot in table['slots']:
            pointer = pes['Game'].at(int(table['va'],16)+slot['offset'],4)
            if pointer.hex()!=slot['sourcePEPointerBytes'] or struct.unpack('<I',pointer)[0]!=int(slot['entry'],16):
                raise ValueError('Original concrete vtable slot differs')
    for proof in program['coldGlobals']: cold_zero_fill(pes[proof['module']],proof)
    for constant in program['staticFloats']:
        if pes[constant['module']].at(int(constant['va'],16),4).hex() != constant['raw']:
            raise ValueError('Original float constant differs')
    identity = program['matrixIdentity']
    if pes['SharedBase'].at(int(identity['constantVA'],16),64).hex() != identity['constantSourcePEBytes']:
        raise ValueError('Original matrix constant table differs')
    literal_proofs = []
    for name,address,expected,meaning in [('Game','202182a0','66b80200c3','GetVersion literal2'),
        ('Game','202182b0','b816000000c3','GetPropertySetType literal22'),
        ('Game','2021c212','68b0000000','fresh native allocation176 bytes'),
        ('SharedBase','10025afa','6a0c','vector rawstream size12'),
        ('SharedBase','10025aff','ffd2','one vector stream virtual+4 read'),
        ('Engine','30481520','b86400000032c0c3','IsProcessable literalfalse')]:
        raw = pes[name].at(int(address,16),len(bytes.fromhex(expected)))
        if raw.hex()!=expected: raise ValueError('Original literal differs: '+meaning)
        literal_proofs.append({'module':name,'address':address,'bytes':expected,'meaning':meaning})
    for field in fields:
        rows = instructions['Game:'+field['entry']]
        if any(field[key] not in rows for key in ['descriptorStore','offsetStore','defaultStore']):
            raise ValueError('Original schema registrar proof differs')
        if pes['Game'].cstring(int(field['nameLiteral']['address'],16)).decode('ascii') != field['name']:
            raise ValueError('Original descriptor name literal differs')
    # A literal RET is genuinely absent from the study C/ASM/catalog. Retain it
    # separately, with a checked contiguous PE extent and its padding boundary.
    cleanup = program['manualCleanup']; address = int(cleanup['va'],16)
    if (pes['SharedBase'].at(address,1).hex() != 'c3' or
        pes['SharedBase'].at(address+1,15).hex() != cleanup['followingBytes'] or
        cleanup['followingBytes'] != 'cc'*15): raise ValueError('Original ASM-only cleanup boundary differs')
    with (study/'01_Decompiled_Code/SharedBase_dll/functions.csv').open(encoding='utf-8-sig',newline='') as file:
        if any(row['address']=='100e2910' for row in csv.DictReader(file)):
            raise ValueError('ASM-only catalog gap no longer matches this study')
    manual_rows = [{'address':f'{address:08x}','bytes':'c3','assembly':'RET'}]
    manual_path = OUT/'sources/SharedBase/100e2910.asm-only.txt'; manual_path.parent.mkdir(parents=True,exist_ok=True)
    manual_path.write_text('; Original PE manual literal RET; no study C/ASM entry\n100e2910 | c3 | RET\n',encoding='utf8',newline='\n')
    manual = {'module':'SharedBase','entry':'100e2910','endVAExclusive':'100e2911','sourceCGap':True,'sourceASMGap':True,
              'instructions':manual_rows,'instructionCount':1,'instructionBytes':1,'allInstructionBytesMatchOriginalPE':True,
              'originalPEBodySha256':hashlib.sha256(bytes.fromhex('c3')).hexdigest(),
              'originalPEBodyRanges':[{'startVA':'100e2910','endVAInclusive':'100e2910','bytes':1,'sha256':hashlib.sha256(bytes.fromhex('c3')).hexdigest()}],
              'assemblyExcerpt':manual_path.relative_to(OUT).as_posix(),'assemblyExcerptSha256':sha(manual_path),'followingPaddingBytes':cleanup['followingBytes']}
    instructions['SharedBase:100e2910'] = manual_rows
    expected_sources = {OUT/function[key] for function in functions for key in ['cExcerpt','assemblyExcerpt']}|{manual_path}
    for path in (OUT/'sources').rglob('*.txt'):
        if path not in expected_sources: path.unlink()
    serialized_path = ROOT/'public/gothic3/entity-reflection/serialized-candidates.json'
    serialized = json.loads(serialized_path.read_text(encoding='utf8'))
    hero = next(value for value in serialized['entities'] if value['name']=='PC_Hero'); packet = hero['propertySets'][4]
    if (packet['className'],packet['outerVersion'],packet['nativeReadVersion'],packet['objectVersion'],packet['propertyVersion']) != ('gCCharacterControl_PS',2,2,83,30):
        raise ValueError('Original Hero Control source versions differ')
    original = study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
    if sha(original)!=WORLD_SHA: raise ValueError('Original Hero world hash differs')
    world = original.read_bytes(); raw = world[packet['sourceOffset']:packet['endSourceOffset']+4]
    if len(raw)!=223 or raw.hex()!=packet['serializedRaw'] or hashlib.sha256(raw).hexdigest()!=packet['serializedSha256']:
        raise ValueError('Original full Hero Control packet differs')
    normalized, runtime_fields = [], []
    for descriptor,prop in zip(fields,packet['properties'],strict=True):
        value_raw = world[prop['sourceOffset']:prop['sourceOffset']+prop['byteLength']]
        if prop['name']!=descriptor['name'] or value_raw.hex()!=prop['raw']: raise ValueError('Original property identity/bytes differ')
        if prop['type']=='bool': value = bool(value_raw[0])
        elif prop['type']=='long': value = struct.unpack('<I',value_raw)[0]
        else: value = {'version':struct.unpack('<H',value_raw[:2])[0],'value':struct.unpack('<I',value_raw[2:])[0]}
        normalized.append({'name':prop['name'],'typeName':prop['type'],'nativeOffset':descriptor['nativeOffset'],
                           'raw':value_raw.hex(),'value':value,'sourceOffset':prop['sourceOffset']})
        table = descriptor_tables[descriptor['name']]
        slots = {item['offset']:item for item in table['entries']}
        def target(slot):
            item = slots[slot]
            return item.get('implementation','Game:'+item['target'])
        runtime_fields.append({'name':prop['name'],'typeName':prop['type'],'nativeOffset':descriptor['nativeOffset'],
                               'registrar':'Game:'+descriptor['entry'],'reader':target(0x38),'defaultInitializer':target(0x14)})
    # This selected current source class uses the five CRT registrars in exactly
    # this physical pointer order; aliases are packet facts, not guessed demangling.
    array_raw = b''.join(struct.pack('<I',int(field['entry'],16)) for field in fields)
    array_offset = pes['Game'].data.find(array_raw)
    if array_offset<0 or pes['Game'].data.find(array_raw,array_offset+1)>=0: raise ValueError('Original field registrar array missing/ambiguous')
    array_va = next(pes['Game'].base+rva+array_offset-file_at for rva,size,file_at in pes['Game'].sections
                    if file_at<=array_offset and array_offset+len(array_raw)<=file_at+size)
    if pes['Game'].at(array_va,len(array_raw))!=array_raw: raise ValueError('Original CRT pointer array mapping differs')
    registrar_order = {'sourceVA':f'{array_va:08x}','fileOffset':array_offset,'bytes':array_raw.hex(),'entries':[field['entry'] for field in fields]}
    source = {'archive':'Projects_compiled.p00','path':WORLD_PATH,'sha256':WORLD_SHA,'packetOffset':packet['sourceOffset'],
              'packetBytes':len(raw),'packetSha256':packet['serializedSha256']}
    save_json(program_path,program)
    rules = {'schema':'gothic3-control-reading-rules-v1','inputs':{name:value['sha256'] for name,value in inputs.items()},
             'nativeBytes':176,'getVersion':2,'propertyType':22,'nativeVtable':'20686abc','wrapperVtable':'20686c5c',
             'fields':runtime_fields,'programs':program['programs'],'matrixIdentityRaw':identity['constantSourcePEBytes'],
             'sourceHero':{'index':4,**source},'coldGlobals':program['coldGlobals'],
             'sources':{'allocate':'Game:2021c1a0','attach':'Game:20219a70','wrapperRead':'Game:2021b180','dataRead':'Game:2021fe40'},
             'scope':'Same detached Control physical allocation/defaults/current source Read; not world residency or keyboard/control processing',
             'unresolved':['actual CRT registration observer for first matrix cache initialization',
                           'actual incoming Entity.DisableProcessing(false) through retained entity flag services',
                           'native OnPreProcess/ProcessMovements/OnPostProcess frame integration and hardware input',
                           'remaining Hero property factories and actual world activation']}
    save_json(OUT/'runtime-rules.json',rules); save_json(PUBLIC/'runtime-rules.json',rules)
    evidence = {'schema':'gothic3-control-reading-native-evidence-v1','nativeCodeExecuted':False,'testsRun':False,
                'inputs':inputs,'functions':functions,'asmOnlyFunctions':[manual],'instructions':instructions,
                'descriptorVtables':descriptor_tables,'leafDescriptors':fields,'fieldRegistrarOrder':registrar_order,
                'literalProofs':literal_proofs,'coldGlobals':program['coldGlobals'],'matrixIdentity':identity,
                'sourcePacket':source,'nativeVtable':program['peerNativeVtable'],'wrapperVtable':program['peerWrapperVtable'],
                'constructionProgram':{'path':'construction-program.json','bytes':program_path.stat().st_size,'sha256':sha(program_path)},
                'typeCompatibility':{'packetTypesAreExactObservedSourceStrings':True,'nativeSchemaDurationCppType':'unsigned_long',
                                     'sourcePacketDurationType':'long','nativePayloadRead':'raw uint32','UnMangleExecutionNotImplemented':True}}
    save_json(OUT/'native-evidence.json',evidence)
    hero_doc = {'schema':'gothic3-original-hero-control-v1','source':source,'properties':normalized,'tailRaw':packet['tailRaw'],
                'nativeReadOffset':packet['nativeReadOffset'],'outerVersion':2,'nativeReadVersion':2,'worldResident':False}
    save_json(OUT/'hero-control.json',hero_doc); save_json(PUBLIC/'hero-control.json',hero_doc)
    manifest = {'schema':'gothic3-control-reading-manifest-v1','outputs':[{'path':path.name,'bytes':path.stat().st_size,'sha256':sha(path)} for path in sorted(PUBLIC.glob('*.json'))]}
    save_json(OUT/'manifest.json',manifest)
    if not args.capture_only:
        files = [ROOT/'src/gothic3/control-reading.ts',Path(__file__).resolve(),schema_path,serialized_path]
        files += [ROOT/'src/gothic3'/name for name in ['entity-reflection.ts','entity-lifecycle.ts','entity-reading.ts','native-properties.ts','player-state.ts','movement-state.ts']]
        files += [ROOT/'tools/gothic3'/name for name in ['research_native_combat.py','research_native_clock.py','research_native_inventory.py',
            'research_entity_reflection.py','research_entity_lifecycle.py','read_gameplay_properties.py','export_world_index.py',
            'read_gameplay_ini.py','read_genome.py','read_xcmsh.py','read_xshmat.py']]
        files += sorted(path for folder in [OUT,PUBLIC] for path in folder.rglob('*') if path.is_file() and path.name!='implementation-receipt.json')
        files = sorted(set(files))
        save_json(OUT/'implementation-receipt.json',{'schema':'gothic3-control-reading-implementation-receipt-v1',
            'nativeCodeExecuted':False,'testsRun':False,'scope':'Current concrete Control implementation/source/dependency/output pins; earlier checkpoints stay historical',
            'files':[{'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':sha(path)} for path in files]})
    print(json.dumps({'functions':len(functions),'asmOnlyFunctions':1,'instructions':sum(len(rows) for rows in instructions.values()),
        'instructionBytes':sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows),
        'captureOnly':args.capture_only,'receiptSha256':None if args.capture_only else sha(OUT/'implementation-receipt.json')}))


if __name__=='__main__': main()
