"""Pin installed custom entity construction and its external service boundaries.

Offline source/PE inspection only. No native execution, tests, browser, build,
playthrough, or remote actions. Historical receipts remain unchanged.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
import struct
from pathlib import Path

from research_native_clock import collect
from research_native_combat import PE, save_json, sha
from research_entity_reflection import INPUTS
from research_entity_lifecycle import exports
from research_native_inventory import native_imports

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/gothic3/entity-construction'
PUBLIC = ROOT / 'public/gothic3/entity-construction'
SELECT = {
    'Game': '20020757 201d4cb0 20004f0c 2012bdc0 20026bd9 20007b5d 200ae8e0',
    'Engine': ('30010b68 304be7f0 3001ca2b 304b67c0 3003d8c5 304808d0 '
               '300253e2 304b2a30 30026779 30399070 30007559 30398fa0 '
               '300091d3 304b4780 3002572f 304bd7c0 30480500 30009a2a 3007bf20 30005227'),
    'SharedBase': ('10001d07 10007c11 10008143 1000277a 10092aa0 10004421 10092760 100059ed 10092880 '
                   '100063c5 10012980 1000694c 10012570 10008201 10012470 100015cd 10012440 '
                   '1000737e 10032010 10007e28 1002a8a0 10005e20 10036c70 '
                   '100079fa 1004a4b0 100033f5 10003d28 100149b0 '
                   '10004d54 1004be50 1000424b 1004be10 10004d6d 1004bae0'),
}


def record(path):
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': sha(path)}


def section_at(pe, address):
    header = struct.unpack_from('<I', pe.data, 0x3c)[0]
    count = struct.unpack_from('<H', pe.data, header + 6)[0]
    optional_size = struct.unpack_from('<H', pe.data, header + 20)[0]
    start = header + 24 + optional_size
    for i in range(count):
        at = start + 40 * i
        virtual_size, rva, raw_size = struct.unpack_from('<III', pe.data, at + 8)
        if rva <= address - pe.base < rva + max(virtual_size, raw_size):
            flags = struct.unpack_from('<I', pe.data, at + 36)[0]
            return {'name': pe.data[at:at + 8].rstrip(b'\0').decode('ascii'),
                    'characteristics': f'{flags:08x}', 'writable': bool(flags & 0x80000000)}
    raise ValueError('No original PE section at ' + hex(address))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--capture-only', action='store_true')
    args = parser.parse_args()
    study = args.study.resolve()
    OUT.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    pes, inputs, selections = {}, {}, {}
    for name, (module, filename, expected) in INPUTS.items():
        binary = study / '00_Original_Runtime' / filename
        if sha(binary) != expected:
            raise ValueError('Original build differs: ' + name)
        pe = pes[name] = PE(binary)
        inputs[name] = {'path': '00_Original_Runtime/' + filename,
                        'bytes': binary.stat().st_size, 'sha256': expected}
        with (study/'01_Decompiled_Code'/module/'functions.csv').open(encoding='utf-8-sig', newline='') as file:
            catalog = {row['address']: row for row in csv.DictReader(file)}
        selections[name] = set(SELECT[name].split())
        changed = True
        while changed:
            changed = False
            for entry in tuple(selections[name]):
                row = catalog[entry]
                raw = pe.at(int(entry,16),5)
                if row['body_bytes'] == '5' and raw[0] == 0xe9:
                    target = f'{int(entry,16)+5+struct.unpack_from("<i",raw,1)[0]:08x}'
                    if target not in selections[name]:
                        selections[name].add(target); changed = True
    functions, instructions = [], {}
    for name, (module, _, _) in INPUTS.items():
        bodies, rows = collect(study, name, module, ' '.join(sorted(selections[name])), pes[name], OUT)
        functions.extend(bodies); instructions.update(rows)
    for function in functions:
        pe = pes[function['id'].split(':')[0]]
        ranges = []
        for begin,end in re.findall(r'([0-9a-f]{8})-([0-9a-f]{8})',function['bodyRanges']):
            raw = pe.at(int(begin,16),int(end,16)-int(begin,16)+1)
            ranges.append({'startVA':begin,'endVAInclusive':end,'bytes':len(raw),
                           'sha256':hashlib.sha256(raw).hexdigest()})
        if not ranges: raise ValueError('Missing body range: '+function['id'])
        function['originalPEBodyRanges'] = ranges
    constants = []
    for module,address,raw_expected,label in [
        ('Engine',0x30818434,'0000803f','engineFloatOne'),
        ('SharedBase',0x100e5df0,'ffff7f7f','boxPositiveF32Max'),
        ('SharedBase',0x100e5df4,'ffff7fff','boxNegativeF32Max')]:
        raw = pes[module].at(address,4); section = section_at(pes[module],address)
        if raw.hex()!=raw_expected or section['writable']:
            raise ValueError('Original read-only float differs: '+label)
        constants.append({'module':module,'address':f'{address:08x}','bytes':raw.hex(),
                          'value':struct.unpack('<f',raw)[0],'label':label,'section':section})
    imports = {name:native_imports(pe) for name,pe in pes.items()}
    exported = {name:exports(pe) for name,pe in pes.items()}
    bindings = []
    for module,slot,target_module,symbol in [
        ('Game',0x207d6600,'Engine','?RegisterEntity@eCSceneAdmin@@IAE_NPAVeCEntity@@@Z'),
        ('Game',0x207d6a8c,'Engine','?Create@eCDynamicEntity@@UAE?AW4bEResult@@XZ'),
        ('Engine',0x30afdab4,'SharedBase','?GetTimeStamp@bCTimer@@SGKXZ'),
        ('Engine',0x30afdb00,'SharedBase','??0bCPropertyID@@QAE@XZ'),
        ('Engine',0x30afdc08,'SharedBase','??0bCObjectRefBase@@QAE@XZ')]:
        imported = imports[module][slot]
        if imported['decoratedName']!=symbol or symbol not in exported[target_module]:
            raise ValueError('Original import binding differs: '+module+':'+hex(slot))
        bindings.append({'module':module,'iat':f'{slot:08x}','bytes':pes[module].at(slot,4).hex(),
                         'import':imported,'implementation':target_module+':'+f'{exported[target_module][symbol]:08x}'})
    external = imports['SharedBase'][0x102f9a2c]
    if external['decoratedName']!='CoCreateGuid': raise ValueError('Original GUID platform import differs')
    create_slot = pes['Game'].at(0x2066813c+0x18,4)
    if create_slot!=struct.pack('<I',0x20026bd9): raise ValueError('Actual gCEntity.Create slot differs')
    evidence = {'schema':'gothic3-entity-construction-native-evidence-v1','inputs':inputs,
                'functions':functions,'instructions':instructions,'nativeCodeExecuted':False,'testsRun':False,
                'constants':constants,'imports':bindings,'guidPlatformImport':external,
                'createVirtualSlot':{'vtable':'2066813c','offset':0x18,'bytes':create_slot.hex(),
                                     'entry':'Game:20026bd9'},
                'allocation':{'bytes':0x1c0,'secondArgument':0x170,'secondArgumentMeaningInferred':False,
                              'successfulAllocationProfile':True},
                'platformProfiles':{'guid':'selected-platform-GUID16-service',
                                    'timer':'selected-host-monotonic-u32-milliseconds',
                                    'originalOSAlgorithmsOrQPCOriginClaimed':False}}
    save_json(OUT/'native-evidence.json',evidence)
    save_json(OUT/'runtime-rules.json',{'schema':'gothic3-entity-construction-rules-v1',
        'inputs':{name:value['sha256'] for name,value in inputs.items()},
        'allocation':evidence['allocation'],'constants':constants,'worldResident':False,
        'onePhysicalModifiedWord':'entity.propertyOwner.modifiedWord',
        'unknownEarlyFieldsRequireInitializedFieldOrMask':True,
        'factorySceneAdminReads':'constructor once, factory twice if first nonnull',
        'partialWritesAndAllocationsRetained':True})
    shutil.copyfile(OUT/'runtime-rules.json',PUBLIC/'runtime-rules.json')
    if (OUT/'README.md').exists(): shutil.copyfile(OUT/'README.md',PUBLIC/'README.md')
    if not args.capture_only:
        paths = {ROOT/'src/gothic3/entity-construction.ts',Path(__file__).resolve()}
        paths.update(ROOT/'src/gothic3'/name for name in [
            'entity-loading.ts','entity-reading.ts','entity-lifecycle.ts','entity-setters.ts',
            'control-reading.ts','native-properties.ts','world-clock.ts'])
        paths.update(ROOT/'tools/gothic3'/name for name in [
            'research_native_clock.py','research_native_combat.py','research_entity_reflection.py',
            'research_entity_lifecycle.py','research_native_inventory.py'])
        paths.update(path for directory in [OUT,PUBLIC] for path in directory.rglob('*')
                     if path.is_file() and path.name!='implementation-receipt.json')
        if not (ROOT/'src/gothic3/entity-construction.ts').exists(): raise ValueError('Actual constructor source required')
        save_json(OUT/'implementation-receipt.json',{'schema':'gothic3-entity-construction-implementation-receipt-v1',
            'gameplayReady':False,'nativeCodeExecuted':False,'testsRun':False,
            'scope':'original-gCEntity-constructor-custom-factory-Create-registration-and-selected-platform-services',
            'files':[record(path) for path in sorted(paths)],
            'remaining':['live-module-identity-matrix-state-and-SceneAdmin-singleton-integration',
                         'all19-original-Hero-property-readers','template-patching-and-graph-context',
                         'world-physics-processing-and-complete-original-browser-gameplay']})
    print(json.dumps({'entries':len(functions),'instructions':sum(len(rows) for rows in instructions.values()),
                      'originalInstructionBytes':sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows),
                      'nativeCodeExecuted':False,'testsRun':False}))


if __name__ == '__main__':
    main()
