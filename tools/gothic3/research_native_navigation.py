"""Recover original navigation registration and processing-range receipts.

Python3.10+, standard library. Reads only the completed study and original PE
bytes; no binary is loaded or executed. Run from the repository root with:
  python -B tools/gothic3/research_native_navigation.py --study <study directory>
Only assets/gothic3/navigation and public/gothic3/navigation are written.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import re
import struct

from research_native_combat import (
    INPUTS, SHORT, SUPPORTED_SHA256, PE, collect_module, save_json, sha,
)
from research_native_inventory import collect as collect_shared, native_imports

SELECTED = {
    'Game_dll': '''20005b7d 2002f009 2002fc57 20003e1d 20025f40 2000af65
2000f3c6 2002739f 2001a85c 2000ab32 200223cc 20289960 200336fe 20004593
20024c08 200315f2 2000cfae 200062df 20003486 20023f4c 202bd490 20022197
200131a1 2002a770 20001b27 20376690 2000bf19 20016275 20013b29 2000dc01
20016be9 20027926 200328bc 2002bb11 2000a74a 200216c5 2001d007 2000a2f4'''.split(),
    'Engine_dll': '''300118f1 30024ff5 3002e6ea 3001e178 3002355b 3003f229
3003fc8d 300013a7 30024ee7 30005669 3002bf2b 30030ab7 3002d0bf 300210a8
304c8510 3002c3b8 30009633 30013d40'''.split(),
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    args = parser.parse_args()
    root, study = Path.cwd().resolve(), args.study.resolve()
    if not (root / 'src/gothic3').is_dir():
        raise ValueError('Run from the Tervain repository root')
    out = root / 'assets/gothic3/navigation'
    hosted = root / 'public/gothic3/navigation'
    if study == root or root in study.parents or study in out.parents:
        raise ValueError('Study must be separate from generated outputs')
    out.mkdir(parents=True, exist_ok=True)
    hosted.mkdir(parents=True, exist_ok=True)
    functions, instructions, inputs = [], {}, {}
    for module, selected in SELECTED.items():
        binary = study / INPUTS[module]
        input_sha = sha(binary)
        if input_sha != SUPPORTED_SHA256[SHORT[module]]:
            raise ValueError('Unsupported original build: ' + module)
        inputs[SHORT[module]] = {'path': INPUTS[module], 'sha256': input_sha}
        receipts, records, _ = collect_module(study, module, set(selected), PE(binary), out)
        functions += receipts
        instructions.update(records)

    # Bind the decision constants to the actual audited instructions rather
    # than trusting decompiler integer/float types or community enum names.
    shared_path = study / '00_Original_Runtime/SharedBase.dll'
    shared_sha = sha(shared_path)
    if shared_sha != '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214':
        raise ValueError('Unsupported SharedBase build')
    inputs['SharedBase'] = {'path': '00_Original_Runtime/SharedBase.dll', 'sha256': shared_sha}
    recs, records = collect_shared(study, 'SharedBase_dll', ['10002833', '10001fdc', '100060e1', '100ab010', '10005e20'], out, PE(shared_path))
    functions += recs
    instructions.update(records)
    decision_literals = {
        'Engine:300210a8': ['0x30826e38', '0x4800008', '0x42'],
        'Engine:300118f1': ['0x100108', '0x40'],
        'Engine:3002bf2b': ['0x100108', '0x20', '0x40'],
        'Engine:30030ab7': ['0x100100', '0x40'],
        'Engine:300013a7': ['0x80', '0x100'],
        'Engine:3003fc8d': ['0x80'],
        'Game:2001a85c': ['0x1e5'],
    }
    decision_instructions = []
    for key, literals in decision_literals.items():
        record = next(f for f in functions if f['id'] == key)
        body = record['forwardingTarget']
        rows = instructions[record['module'] + ':' + body] if body else instructions[key]
        for literal in literals:
            matches = [r for r in rows if re.search(re.escape(literal) + r'(?![0-9a-f])', r['assembly'])]
            if not matches:
                raise ValueError('Missing source decision instruction ' + key + '/' + literal)
            decision_instructions += [{'function': key, 'literal': literal, **r} for r in matches]
    engine = PE(study / INPUTS['Engine_dll'])
    padding_bytes = engine.at(0x30826e38, 4)
    padding = struct.unpack('<f', padding_bytes)[0]
    if padding != 250.0:
        raise ValueError('Unexpected processing-range expansion')
    ini = study / '03_Configuration_and_Docs/Ini/ge3.INI'
    ini_text = ini.read_text(encoding='utf-8-sig')
    roi = re.findall(r'^Entity\.ROI=([^\r\n]+)', ini_text, re.M)
    if roi != ['4000.0']:
        raise ValueError('Unsupported installed ROI configuration')
    ini_copy = out / 'ge3-roi-config.txt'
    ini_copy.write_text('Entity.ROI=' + roi[0] + '\n', encoding='utf8', newline='\n')
    evidence = {
        'schema': 'gothic3-native-navigation-evidence-v1',
        'inputs': inputs, 'functions': functions, 'instructions': instructions,
        'decisionInstructions': decision_instructions,
        'constants': [{'module': 'Engine', 'address': '30826e38', 'bytes': padding_bytes.hex(),
                       'type': 'float32', 'value': padding, 'role': 'ROI movement padding'}],
        'mathImportBindings': {f'{a:08x}': native_imports(engine)[a]
                               for a in [0x30afccd8, 0x30afccf4, 0x30afdb70]},
        'configuration': {'source': '03_Configuration_and_Docs/Ini/ge3.INI',
                          'sha256': sha(ini), 'line': 58, 'key': 'Entity.ROI',
                          'valueCm': float(roi[0]), 'excerpt': ini_copy.name,
                          'excerptSha256': sha(ini_copy),
                          'overridePrecedence': 'Engine3002c3b8: application override config if key exists, otherwise base config'},
        'audit': {'nativeCodeExecuted': False,
                  'bodyCount': len(functions),
                  'instructionCount': sum(len(rows) for rows in instructions.values()),
                  'matchedBytes': sum(len(bytes.fromhex(r['bytes'])) for rows in instructions.values() for r in rows),
                  'allInstructionBytesMatchOriginalPE': True},
    }
    save_json(out / 'native-source-evidence.json', evidence)
    rules = {
        'schema': 'gothic3-navigation-runtime-rules-v1',
        'inputs': {name: row['sha256'] for name, row in inputs.items()},
        'registries': {'allDataOffset': '0x34', 'roiDataOffset': '0x40',
                       'identity': 'property-set object identity, not name or GUID',
                       'register': 'backward duplicate search, append; 0 if present, 1 if appended',
                       'deregister': 'backward search, remove and shift survivors; 0 if absent, 1 if removed'},
        'navigationConstructor': {'source': 'Game20289960 -> Invalidate20286e50',
                                  'processingDataOffset': '0x1e1', 'processingObjectOffset': '0x1e5',
                                  'inProcessingRange': False, 'floorDetectionFailed': False,
                                  'enabled': True, 'startPositionCm': [0, 0, 0],
                                  'lastUseableNavigationPositionCm': {'known': False, 'reason': 'SharedBase10002833 default bCVector constructor is a no-op; OnPropertySetAdded later writes this field'},
                                  'cachedMovementDataOffset': '0x1dc', 'cachedDCCDataOffset': '0x1d8',
                                  'cachedMovement': None, 'cachedDCC': None,
                                  'opaqueBytes': {'0x1e0': 1, '0x204': 0, '0x205': 0,
                                                  '0x20c': 1, '0x20d': 0, '0x234': 0,
                                                  '0x24c': 0, '0x250': 1, '0x251': 0},
                                  'opaqueValues': {'0x188': 0, '0x1c8': -1, '0x214': 4,
                                                   '0x218': 0, '0x2a8': 65535}},
        'propertyLifecycle': {'added': 'non-template registers, then LastUseableNavigationPosition enter/write/exit, then base callback',
                              'vectorCopy': 'GetWorldPosition captures a storage pointer before EnterEx, then copies its live contents after EnterEx; no pre-observer snapshot',
                              'removed': 'if byte1e1==1 remove ROI; non-template remove all; then base callback; does not clear byte1e1 itself'},
        'pointerCaches': {'getCharacterMovement': 'Game200216c5: null cache triggers Entity.GetPropertySet21, stores result; null repeats lookup next call',
                          'rangeCallbacks': 'read cached movement data1dc directly; never invoke lazy getter',
                          'setCharacterMovement': 'Game2000a74a raw pointer assignment',
                          'setDCC': 'Game2001d007 raw pointer assignment', 'getDCC': 'Game2000a2f4 direct cached pointer'},
        'entry': {'source': 'Game2028a350',
                  'prefix': ['if byte1e1==0 register ROI', 'byte1e1=1', 'byte1e2=0',
                             'Destroy PropertyID238', 'byte24c=0'],
                  'earlyReturn': ['entity is null', 'application virtual270 result !=1', 'characterMovement is null'],
                  'tail': 'floor detection/world repositioning, restore movement or Reset(false,true,true); required host, never silently skipped'},
        'exit': {'source': 'Game20287b70',
                 'prefix': ['if byte1e1==1 deregister ROI and dword188=0', 'byte1e1=0',
                            'if DCC exists DestroyCollisionCirclePSObject'],
                 'movement': ['byte205 = !GetGoalReached(false,false,false)',
                              'if character-control property type45 mode==9 byte205=0',
                              'StopMovement', 'ResetIsProcessing']},
        'cache': {'source': ['Game20003486', 'Game20023f4c'],
                  'getMembers': 'build(false) only if cache count<1',
                  'build': 'force clears; append ordered all-navigation entities with NPC.Enclave matching this entity ID, skip duplicate entity pointers',
                  'automaticRegistryInvalidation': False, 'nullProxyResolutionsRetained': True},
        'range': {'source': ['Engine3002d0bf', 'Engine300118f1', 'Engine30024ff5'],
                  'coordinateUnit': 'native centimetres; native float32 stored values',
                  'initialOldSphere': 'SharedBase10005e20 Clear: position0, radius=-FLT_MAX; first old AABB is inverted, current box is uninitialized until first rebuild',
                  'installedBaseRadiusCm': float(roi[0]), 'movementPaddingCm': padding,
                  'center': 'current camera position, not player position',
                  'rebuild': 'distance(currentCamera,previousExpandedSphereCenter)>250 or force-full-update; SharedBase1002e700 rounds squared sum then sqrt result to float32',
                  'region': 'AABB of camera-centred sphere radius Entity.ROI+250; inclusive intersection',
                  'dynamicRequiredFlags': 0x100108, 'staticRequiredFlags': 0x100100,
                  'excludedFlags': 0x40, 'canDeactivateFlag': 0x20, 'enteredFlag': 0x80,
                  'enterAllowedFlag': 0x100,
                  'orderedTransitions': 'all queued exits first, then queued enters whose live flags still include0x100',
                  'candidates': 'PVS valid cells/static skip hierarchy/dynamic arrays and non-deactivation cell; dirty updates traverse backward'},
        'unsupported': ['CompileStaticNavigationScene/nav map and zone/path geometry',
                        'PVS/sector streaming and native candidate traversal order',
                        'entity physics/content/property-set observer lifecycles outside navigation',
                        'range-entry character floor/movement tail and DCC execution without a complete host',
                        'native x87 extended arithmetic bit equivalence'],
        'nextSourcePath': 'gCSession20376690 -> NavigationAdmin200131a1 -> gCNavigationMap::CompileStaticNavigationScene20013b29, then RecompileAIZonePropertiesForNavZones2000dc01 and GetZone20016be9; registration only does not replace compilation',
        'evidence': {'path': 'native-source-evidence.json', 'sha256': sha(out / 'native-source-evidence.json')},
    }
    save_json(out / 'runtime-rules.json', rules)
    save_json(hosted / 'runtime-rules.json', rules)
    (out / 'README.txt').write_text(
        'Original navigation registry and range prefix implementation, not a simulated NPC population.\n'
        'All selected instruction bytes bind to the pinned original Game/Engine PEs. No native execution.\n'
        'Engine sphere-to-AABB rebuild uses camera position and 250cm hysteresis expansion.\n'
        'Native candidate order/PVS and full navigation-scene compilation remain required.\n'
        'Character range tails and property observers require explicit complete host contracts.\n'
        'Registry edits do not clear the native enclave cache; an empty cache rebuilds on each GetMembers.\n',
        encoding='utf8', newline='\n')
    sources = [{'path': p.relative_to(out).as_posix(), 'sha256': sha(p), 'bytes': p.stat().st_size}
               for p in sorted(out.rglob('*')) if p.is_file() and p.name not in ['manifest.json', 'final-audit.json']]
    runtime = root / 'src/gothic3/navigation-runtime.ts'
    manifest = {'schema': 'gothic3-navigation-manifest-v1', 'nativeCodeExecuted': False,
                'inputs': inputs, 'producer': {'path': 'tools/gothic3/research_native_navigation.py', 'sha256': sha(Path(__file__))},
                'receiptHelper': {'path': 'tools/gothic3/research_native_combat.py', 'sha256': sha(Path(__file__).with_name('research_native_combat.py'))},
                'sharedReceiptHelper': {'path': 'tools/gothic3/research_native_inventory.py', 'sha256': sha(Path(__file__).with_name('research_native_inventory.py'))},
                'runtime': {'path': 'src/gothic3/navigation-runtime.ts', 'sha256': sha(runtime)} if runtime.exists() else None,
                'audit': evidence['audit'], 'assets': sources,
                'hostedRules': {'path': 'runtime-rules.json', 'sha256': sha(hosted / 'runtime-rules.json'),
                                'bytes': (hosted / 'runtime-rules.json').stat().st_size}}
    save_json(out / 'manifest.json', manifest)
    save_json(hosted / 'manifest.json', manifest)
    print(evidence['audit'])


if __name__ == '__main__':
    main()
