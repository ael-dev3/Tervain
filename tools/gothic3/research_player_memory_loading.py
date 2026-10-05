"""Capture original PlayerMemory construction and attribute loading offline.

This evidence checkpoint does not implement a PlayerMemory factory. It reads
immutable PE/world/study inputs and writes only the two owned namespaces.
Native programs, tests, builds, browsers and remote actions are never executed.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
import struct
import sys
from pathlib import Path

from bounded_native_capture import collect
from research_native_combat import PE, save_json, sha
from research_native_inventory import native_imports
from research_entity_lifecycle import exports
from research_entity_reflection import INPUTS, SELECT, WORLD_PATH, WORLD_SHA, pin_vtable
from read_gameplay_properties import _genome_strings

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/gothic3/player-memory-loading'
PUBLIC = ROOT / 'public/gothic3/player-memory-loading'
METHODS = {'gCPlayerMemory_PS', 'Create', 'Invalidate', 'GetVersion', 'GetPropertySetType',
           'PostInitializeProperties', 'OnPostRead', 'Read', 'ReadSaveGame', 'ReadAttributes',
           'ReadAttributesV3', 'ReadAttributesV4', 'DestroyAttributes', 'CreateAttributes',
           'CreateAttrib', 'CreateStat'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    study = args.study.resolve()
    pes, catalogs, inputs = {}, {}, {}
    selected = {module: set() for module in INPUTS}
    for module, (directory, filename, expected) in INPUTS.items():
        path = study / '00_Original_Runtime' / filename
        if sha(path) != expected:
            raise ValueError('Original PE differs: ' + module)
        pes[module] = PE(path)
        inputs[module] = {'path': '00_Original_Runtime/' + filename, 'bytes': path.stat().st_size, 'sha256': expected}
        with (study/'01_Decompiled_Code'/directory/'functions.csv').open(encoding='utf-8-sig', newline='') as file:
            catalogs[module] = {row['address']: row for row in csv.DictReader(file)}
    maps = {module: exports(pe) for module, pe in pes.items()}
    imports = {module: native_imports(pe) for module, pe in pes.items()}
    for row in catalogs['Game'].values():
        name = row['qualified_name']
        if name.startswith('gCPlayerMemory_PS::') and name.split('::')[-1] in METHODS:
            selected['Game'].add(row['address'])
        elif name.startswith(('gCAttribute::', 'gCStat::')) and name.split('::')[-1] in {
            'gCAttribute', 'gCStat', 'ApplyDefaults', 'Invalidate', 'PostInitializeProperties', 'Read', 'GetVersion'}:
            selected['Game'].add(row['address'])
    selected['Game'].update('20327f10 20328880 20328570 20320970 20328200 2031f540 20327550 203205f0'.split())
    selected['SharedBase'].update(SELECT['SharedBase'])
    schema_path = ROOT/'assets/gothic3/entity-reflection/native-property-schemas.json'
    fields = sorted((field for field in json.loads(schema_path.read_text(encoding='utf8'))['nativePropertyRegistrars']
                     if field['className'] == 'gCPlayerMemory_PS'), key=lambda field: field['entry'])
    if len(fields) != 25 or fields[-1]['name'] != 'IsConsumingItem' or fields[-1]['nativeOffset'] != 164:
        raise ValueError('Original PlayerMemory registrar count/last field differs')
    selected['Game'].update(field['entry'] for field in fields)
    tables = {}
    def table(name, address, length):
        value = pin_vtable(pes['Game'], imports['Game'], maps, address, length)
        tables[name] = value
        for entry in value['entries']:
            if entry['target'] == '00000000':
                continue
            module, target = entry.get('implementation', 'Game:'+entry['target']).split(':')
            if target not in catalogs[module]:
                raise ValueError('Vtable body missing: ' + module + ':' + target)
            selected[module].add(target)
        return value
    table('PlayerMemory native', 0x2069845c, 0x150)
    table('Attribute native', 0x2065da7c, 0x6c)
    table('Stat native', 0x2065db4c, 0x6c)
    for field in fields:
        for key in ['descriptorStore', 'offsetStore', 'defaultStore', 'nameLiteral']:
            row = field[key]
            if pes['Game'].at(int(row['address'],16),len(bytes.fromhex(row['bytes']))).hex() != row['bytes']:
                raise ValueError('Original PlayerMemory field proof differs: ' + field['name'])
        if 'descriptor:'+field['vtable'] not in tables:
            table('descriptor:'+field['vtable'],int(field['vtable'],16),0x68)
    table('WeaponConfig container',0x20697bc4,0x3c)
    # The selected functions and their direct internal/imported callees supply
    # constructor/Create/default/Read/lifetime evidence. Capturing a callee is
    # never a claim that its behavior has been ported.
    functions, instructions = {}, {}
    def capture():
        for module, (directory, _, _) in INPUTS.items():
            missing = selected[module] - {key.split(':')[1] for key in functions if key.startswith(module+':')}
            if not missing:
                continue
            bodies, rows = collect(study,module,directory,' '.join(sorted(missing)),pes[module],OUT)
            functions.update((body['id'],body) for body in bodies)
            instructions.update(rows)
    capture()
    bindings = []
    scanned = set()
    for _ in range(2):
        for key in sorted(set(instructions)-scanned):
            scanned.add(key)
            module = key.split(':')[0]
            for row in instructions[key]:
                direct = re.fullmatch(r'CALL 0x([0-9a-f]{8})',row['assembly'])
                if direct and direct[1] in catalogs[module]:
                    selected[module].add(direct[1])
                imported = re.search(r'(?:CALL |JMP |MOV E[A-Z]+,)dword ptr \[0x([0-9a-f]{8})\]',row['assembly'])
                if not imported or int(imported[1],16) not in imports[module]:
                    continue
                imp = imports[module][int(imported[1],16)]
                target_module = imp['library'].removesuffix('.dll')
                if target_module not in maps:
                    continue
                address = f"{maps[target_module][imp['decoratedName']]:08x}"
                selected[target_module].add(address)
                bindings.append({'from':key,'instruction':row,'import':imp,'implementation':target_module+':'+address})
        capture()
    # Original allocator selects the no-argument constructor, not the copy
    # overload. Follow the exported five-byte thunk to the real native body.
    fresh = bytes.fromhex(instructions['Game:20036cdc'][0]['bytes'])
    if fresh[0] != 0xe9:
        raise ValueError('Fresh constructor forwarding profile differs')
    target = f'{0x20036cdc+5+struct.unpack_from("<i",fresh,1)[0]:08x}'
    if target != '2031e9c0' or not any(row['assembly']=='CALL 0x20036cdc' for row in instructions['Game:20327f10']):
        raise ValueError('Original fresh allocator/constructor call differs')
    allocation_rows = instructions['Game:20327f10']
    if not any(row['assembly']=='PUSH 0xb8' for row in allocation_rows) or not any(row['assembly']=='PUSH 0xc4' for row in allocation_rows):
        raise ValueError('Original184-byte allocation/tag0xc4 proof differs')
    # PE initializer pointers establish registration order independently of
    # serialized field order or monotonically increasing function addresses.
    field_entries = [field['entry'] for field in fields]
    order_candidates = []
    for rva, size, offset in pes['Game'].sections:
        raw = pes['Game'].data[offset:offset+size]
        start = raw.find(struct.pack('<I',int(field_entries[0],16)))
        while start >= 0:
            window = raw[start:start+400]
            if len(window)==400:
                entries = [f'{value:08x}' for value in struct.unpack('<100I',window)]
                if [entry for entry in entries if entry in field_entries] == field_entries:
                    end = entries.index(field_entries[-1])+1
                    original = window[:end*4]
                    order_candidates.append({'address':f'{pes["Game"].base+rva+start:08x}','bytes':original.hex(),
                        'sha256':hashlib.sha256(original).hexdigest(),'fieldEntries':field_entries,'entries':entries[:end]})
            start = raw.find(struct.pack('<I',int(field_entries[0],16)),start+1)
    if len(order_candidates) != 1:
        raise ValueError('Original PlayerMemory registrar order ambiguous')
    serialized_path = ROOT/'assets/gothic3/entity-reflection/serialized-candidates.json'
    serialized = json.loads(serialized_path.read_text(encoding='utf8'))
    hero = next(entity for entity in serialized['entities'] if entity['name']=='PC_Hero')
    packet = hero['propertySets'][13]
    original = study/'02_Unpacked_Data/Archives/Projects_compiled.p00'/WORLD_PATH
    if sha(original) != WORLD_SHA:
        raise ValueError('Original SysDyn world differs')
    data = original.read_bytes()
    cursor, _, _ = _genome_strings(data)
    raw = data[packet['sourceOffset']:packet['endSourceOffset']+4]
    if packet['className']!='gCPlayerMemory_PS' or packet['nativeReadVersion']!=5 or len(raw)!=1617 or raw.hex()!=packet['serializedRaw'] or hashlib.sha256(raw).hexdigest()!=packet['serializedSha256']:
        raise ValueError('Original PlayerMemory packet differs')
    seed_path = ROOT/'assets/gothic3/player-properties/seed-evidence.json'
    seed = json.loads(seed_path.read_text(encoding='utf8'))
    for check in seed['byteChecks']:
        value = bytes.fromhex(check['raw'])
        if len(value)!=check['bytes'] or data[check['sourceOffset']:check['sourceOffset']+len(value)]!=value:
            raise ValueError('Original nested attribute record differs: '+check['label'])
    for index, value in seed['stringReferences'].items():
        if cursor.strings[int(index)] != value:
            raise ValueError('Original nested attribute string differs')
    names = [field['name'] for field in packet['properties']]
    native = data[packet['nativeReadOffset']:packet['endSourceOffset']]
    if len(names)!=24 or 'IsConsumingItem' in names or len(native)!=1125 or struct.unpack_from('<HI',native)!= (5,15):
        raise ValueError('Original current native attribute read profile differs')
    audit = {'selectedNativeBodies':len(functions),'instructions':sum(map(len,instructions.values())),
        'instructionBytes':sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows),
        'allSelectedInstructionBytesMatchOriginalPE':True,'allInstructionsInsideOriginalPEBodyRanges':True,
        'allOriginalBodyBytesCoveredByInstructions':True,'serializedFields':24,'nativeRegistrars':25,
        'originalNestedAttributeByteChecks':len(seed['byteChecks']),'serializedAttributes':15,'nativeReadExecuted':False}
    evidence = {'schema':'gothic3-player-memory-loading-evidence-v1','inputs':inputs,'nativeCodeExecuted':False,
        'functions':[functions[key] for key in sorted(functions)],'instructions':instructions,'vtables':tables,
        'importedSubcalls':bindings,'nativePropertyRegistrars':fields,'registrarOrder':order_candidates[0],
        'freshConstruction':{'allocator':'Game:20327f10','constructorExport':'Game:20036cdc','constructorBody':'Game:'+target,
            'nativeBytes':184,'allocationTag':196,'copyConstructorExport':'Game:2000cce3','copyConstructorIsFresh':False},
        'originalHero':{'sourcePath':WORLD_PATH,'sourceSha256':WORLD_SHA,'packet':packet,
            'nativeReadBytes':1125,'attributeCount':15,'originalNestedRecord':seed['originalPlayerMemoryRecord'],
            'stringReferences':seed['stringReferences'],'allFocusedSerializedBytesMatchOriginal':True},'audit':audit}
    contract = {'schema':'gothic3-player-memory-loading-contract-v1','factoryImplemented':False,'worldResident':False,
        'freshConstruction':evidence['freshConstruction'],'nativeVersion':5,'nativeRegistrars':25,'serializedProperties':24,
        'preservedDefault':'IsConsumingItem is registered but absent from the stored Hero property table',
        'sharedConsumers':'startup, HUD and combat must retain the same map and OriginalNativeAttribute objects',
        'originalOrder':['constructor base/arrays/enum/PropertyID/hash buckets','Create/Attach/defaults',
            'PostInitialize and CreateAttributes','stored property descriptors','DestroyAttributes',
            'count/key/accessor/cast/node/value/reference/log/destruction for each stored attribute',
            'CreateAttributes for missing or broken entries','enclosing OnPostRead later'],
        'remaining':['concrete PlayerMemory factory and original nested Attribute/Stat factories',
            'real memory/CString/localization/logging capabilities and exact lifetimes',
            'same retained attributes bound to existing consumers','enclosing entity/world integration','full original progression']}
    for name, value in [('native-evidence.json',evidence),('loading-contract.json',contract)]:
        save_json(OUT/name,value);save_json(PUBLIC/name,value)
    expected = {Path(body[key]) for body in functions.values() for key in ['cExcerpt','assemblyExcerpt']}
    for relative in sorted(expected):
        destination = PUBLIC/relative
        destination.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(OUT/relative,destination)
    readme = '''# Original PlayerMemory loading evidence

This is an offline evidence checkpoint, not an implemented factory or a loaded
Hero. The native allocator `20327f10` calls the no-argument export `20036cdc`,
whose actual body `2031e9c0` constructs 184 bytes with tag `0xc4`. The copy
overload `2000cce3` is not used for fresh allocation. Ordered PE initializer
pointers and registrar stores establish 25 fields, while the current Hero
stores 24; `IsConsumingItem` must keep its native default. The 1,617-byte packet
contains a 1,125-byte native version 5 read with 15 nested attributes.
Every selected body range and every
captured instruction is checked against immutable original PE bytes, including
discontiguous ranges. The nested record/string proof is checked against the
original world, not trusted as a substitute for executing its native reader.

The remaining factory must construct and then destroy the original default
attributes before loading the stored ones, preserve map nodes and reference
lifetimes, and share the resulting actual attribute objects with startup/HUD/
combat. It must retain real allocation, CString, localization and logging
services at their original call sites. Captured supporting bodies and service
methods do not imply runtime implementations, world residency or completion.

Reproduce from this source revision:

```powershell
python -B tools/gothic3/research_player_memory_loading.py --study $study
```

The producer only reads original inputs and writes its two owned namespaces.
No native execution, tests, build, browser, deployment or playthrough occurs.
Its self-excluding evidence receipt pins the producer, imported helpers,
previous schema/packet evidence and every current owned output.
'''
    for base in [OUT,PUBLIC]:
        (base/'README.md').write_text(readme,encoding='utf8',newline='\n')
    imported = [Path(module.__file__).resolve() for module in list(sys.modules.values()) if getattr(module,'__file__',None)
        and Path(module.__file__).resolve().parent==ROOT/'tools/gothic3' and Path(module.__file__).suffix=='.py']
    deps = [schema_path,serialized_path,seed_path,Path(__file__).resolve(),*imported]
    owned = [path for base in [OUT,PUBLIC] for path in base.rglob('*') if path.is_file() and path.name!='evidence-receipt.json']
    receipt = {'schema':'gothic3-player-memory-loading-evidence-receipt-v1','factoryImplemented':False,
        'baseline':'42c7149a9b08a3b224df0592d02585f1a535e351','nativeCodeExecuted':False,'testsExecuted':False,
        'checksActuallyPerformed':['original PE instruction and complete body-range coverage','original registrar stores/order',
            'original Hero and nested record bytes/strings','current producer/helper/output hashes'],'audit':audit,
        'files':[{'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':sha(path)} for path in sorted(set(deps+owned))]}
    for base in [OUT,PUBLIC]:
        save_json(base/'evidence-receipt.json',receipt)
    print(json.dumps({'audit':audit,'receiptSha256':sha(OUT/'evidence-receipt.json')}))


if __name__=='__main__':
    main()
