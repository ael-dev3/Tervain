"""Recover original inventory listener and player-binding evidence offline.

Reads the completed study and installed PE files. Does not load a DLL, launch
Gothic 3, or execute recovered code. Writes only this producer's namespace.
Run from the repository root with Python 3.10+:
  python tools/gothic3/research_inventory_observers.py --study <study>
"""
from __future__ import annotations

import argparse
import csv
import json
import struct
from pathlib import Path

from research_native_combat import (
    INPUTS, PE, SHORT, SUPPORTED_SHA256, collect_module, save_json, sha,
)
from research_native_inventory import native_imports


SELECTED = {
    'scripts__Script_Game_dll': ['10077540'],
    'Script_dll': ['10001820', '100011ea'],
    'Game_dll': '''2001eb87 200021fd 200170f8 2002b8eb
2001b199 2002a51d 20003238 200140b0 2000d12a
20017981 20020086 20020289 2002c273 200226e7
20013fed 20023cea 2003233a 2002658a 2000141f
20035b20 2000305d 20022133 20007e73 20023b87
201ace60 201aceb0 201acf00 201acf50 201a9050 201a9110
201cecc0 201cefb0 200337c6 20170a70 20170ac0
2018a7f0 2018a740 2018a750 2018a760 2018a770 2018a8a0
2018cd90 2018ce20 2018ce30 2018ce40 2018ce50 2018ce60
2018e460 2018e4b0 2018e4d0 2018e4e0 2018e530 2018e560
20188f70 20188fa0 2016d4d0 2016c8e0 2016ce10 2016df60
2016c5a0 2016ef60 2016e720 2016e4a0 2016f480 2016dc20
20166110 20166510 20166340 20165ed0 201668d0 20190080
20020a86 20029c67 201cf590 201ce740 201ce6f0'''.split(),
}


def hierarchy_inventory_listeners(study: Path, pe: PE) -> dict:
    """Audit every named Game.dll RTTI hierarchy, not a string-name guess.

    This bounded static inventory proves which exported Game RTTI hierarchies
    contain the listener base. It cannot establish runtime object instances,
    registration order, non-RTTI implementations, or arbitrary loaded plugins.
    """
    symbols_path = study / '01_Decompiled_Code/Game_dll/symbols.csv'
    with symbols_path.open(encoding='utf-8-sig', newline='') as handle:
        rows = list(csv.DictReader(handle))
    # Column names are source-defined and retained in the receipt.
    address_key = 'address'
    qualified_key = 'qualified_name'
    if qualified_key not in rows[0]:
        qualified_key = 'qualifiedName'
    listener = [row for row in rows if row[qualified_key] == 'gCInventoryListener::RTTI_Type_Descriptor']
    if len(listener) != 1:
        raise ValueError('Original listener RTTI identity changed')
    descriptor = int(listener[0][address_key], 16)
    type_bytes = pe.at(descriptor, 8) + pe.cstring(descriptor + 8) + b'\0'
    if b'gCInventoryListener' not in type_bytes:
        raise ValueError('Listener RTTI does not identify the original class')
    matches = []
    total = 0
    for row in rows:
        if not row[qualified_key].endswith('::RTTI_Class_Hierarchy_Descriptor'):
            continue
        address = int(row[address_key], 16)
        header = pe.at(address, 16)
        signature, attributes, count, array = struct.unpack('<IIII', header)
        if signature != 0 or not 0 < count < 4096:
            raise ValueError('Unsupported original RTTI hierarchy')
        raw_array = pe.at(array, count * 4)
        base_descriptors = []
        for base in struct.unpack('<' + 'I' * count, raw_array):
            raw = pe.at(base, 28)
            if struct.unpack_from('<I', raw)[0] == descriptor:
                base_descriptors.append({'address': f'{base:08x}', 'bytes': raw.hex()})
        total += 1
        if base_descriptors:
            matches.append({'class': row[qualified_key].split('::')[0],
                            'hierarchyAddress': f'{address:08x}', 'hierarchyBytes': header.hex(),
                            'attributes': attributes, 'baseCount': count,
                            'baseArrayAddress': f'{array:08x}', 'baseArrayBytes': raw_array.hex(),
                            'listenerBaseDescriptors': base_descriptors})
    return {'studySymbolsSha256': sha(symbols_path), 'namedHierarchiesInspected': total,
            'listenerTypeDescriptorAddress': f'{descriptor:08x}',
            'listenerTypeDescriptorBytes': type_bytes.hex(), 'classes': matches,
            'runtimeRegistryCompletenessProven': False,
            'limitation': 'Static RTTI hierarchy coverage does not enumerate runtime HUD controls or their registration order.'}


def module_import_inventory(study: Path) -> list[dict]:
    records = []
    for path in sorted((study / '00_Original_Runtime').rglob('*')):
        if not path.is_file() or path.suffix.lower() not in {'.dll', '.exe'}:
            continue
        try:
            pe = PE(path)
            imports = native_imports(pe)
        except ValueError as error:
            records.append({'module': path.relative_to(study).as_posix(),
                            'sha256': sha(path), 'inventoryListenerImportAudit': 'unsupported',
                            'reason': str(error)})
            continue
        matched = [{'iatAddress': f'{address:08x}', **entry}
                   for address, entry in imports.items()
                   if 'gCInventoryListener' in (entry.get('decoratedName') or '')]
        records.append({'module': path.relative_to(study).as_posix(), 'sha256': sha(path),
                        'inventoryListenerImportAudit': 'inspected', 'matchingImports': matched})
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    args = parser.parse_args()
    study = args.study.resolve()
    repo = Path(__file__).resolve().parents[2]
    output = repo / 'assets/gothic3/inventory-observers'
    public = repo / 'public/gothic3/inventory-observers'
    receipts, instructions, registrations, binaries = [], {}, [], []
    for module, selected in SELECTED.items():
        path = study / INPUTS[module]
        if sha(path) != SUPPORTED_SHA256[SHORT[module]]:
            raise ValueError('Original PE identity changed: ' + module)
        pe = PE(path)
        items, rows, regs = collect_module(study, module, set(selected), pe, output)
        receipts.extend(items)
        instructions.update(rows)
        registrations.extend(regs)
        binaries.append({'module': SHORT[module], 'source': INPUTS[module], 'sha256': sha(path)})
    game = PE(study / INPUTS['Game_dll'])
    hierarchy = hierarchy_inventory_listeners(study, game)
    imports = module_import_inventory(study)
    vtables = []
    for name, address in [('gCInventory_PS bridge', 0x2067cf90),
                          ('gCHUDListCtrlInventory', 0x20677f10),
                          ('gCHUDTableRecipeStats', 0x20678824),
                          ('gCHUDTableStackStats', 0x20678ccc)]:
        raw = game.at(address, 20)
        vtables.append({'class': name, 'address': f'{address:08x}', 'bytes': raw.hex(),
                        'firstFiveFunctions': [f'{value:08x}' for value in struct.unpack('<IIIII', raw)]})
    expected_targets = {
        'gCInventory_PS bridge': ['201ace60', '201aceb0', '201acf00', '201acf50', '201acc60'],
        'gCHUDListCtrlInventory': ['2018a740', '2018a750', '2018a760', '2018a770', '2018a8a0'],
        'gCHUDTableRecipeStats': ['2018ce20', '2018ce30', '2018ce40', '2018ce50', '2018ce60'],
        'gCHUDTableStackStats': ['2018e4b0', '2018e4d0', '2018e4e0', '2018e530', '2018e560'],
    }
    for table in vtables:
        targets = []
        for target in table['firstFiveFunctions']:
            jump = game.at(int(target, 16), 5)
            canonical = int(target, 16) + 5 + struct.unpack_from('<i', jump, 1)[0] if jump[0] == 0xe9 else int(target, 16)
            targets.append(f'{canonical:08x}')
        if targets != expected_targets[table['class']]:
            raise ValueError('Actual original listener virtual order changed: ' + table['class'] + ': ' + str(targets))
        table['resolvedFirstFiveFunctions'] = targets
    save_json(output / 'instruction-records.json', instructions)
    save_json(output / 'hierarchy-and-imports.json', {'hierarchy': hierarchy, 'moduleImports': imports,
                                                   'listenerVtables': vtables})
    rules = {
        'schema': 'gothic3-native-inventory-observer-boundaries-v1',
        'originalGameSha256': SUPPORTED_SHA256['Game'],
        'originalScriptSha256': SUPPORTED_SHA256['Script'],
        'originalScriptGameSha256': SUPPORTED_SHA256['Script_Game'],
        'runtimeRegistryCompleteness': 'unresolved',
        'listenerStorage': {'entrySize': 8, 'pointerOffset': 0, 'activeOffset': 4,
                            'inventoryArrayOffset': 0x4c, 'inventoryCountOffset': 0x50,
                            'dispatchSource': 'Game:201acdc0', 'snapshotCountAtEntry': True,
                            'readActiveAndPointerAtEachIteration': True,
                            'purgeAfterDispatch': True},
        'constructor': {'source': 'Game:201a9110', 'listenerArrayPointer': 0,
                        'listenerCount': 0, 'listenerCapacity': 0,
                        'scope': 'newly-constructed-inventory-before-HUD-or-other-runtime-registration'},
        'nativeEvents': {'create': 0, 'change': 1, 'delete': 2, 'clear': 3, 'destroy': 4},
        'registrations': {'add': 'Game:201acf90', 'remove': 'Game:201acd10',
                          'purge': 'Game:201acd50', 'reactivateExistingIdentityInPlace': True,
                          'firstListenerInstallsStackListBridge': 'Game:201cefb0'},
        'onPlayerChanged': {'source': 'Script_Game:10077540', 'registeredName': 'OnPlayerChanged',
                            'invalidateScriptEntityPlayerCache': True,
                            'updateGuiPlayerBinding': True, 'returnValue': 1,
                            'directPlayerMemoryOrStatWrites': [],
                            'lazyPlayerCacheSource': 'Script:100011ea',
                            'guiSource': 'Script:10001820', 'guiManagerSource': 'Game:200337c6'},
        'guiBinding': {'source': 'Game:20170a70', 'entitySlots': 7,
                       'mainPageBeforeActivePage': True, 'mainPagePointerOffset': 0x7c,
                       'activePageIndexOffset': 0x84, 'activePageArrayOffset': 0x38,
                       'virtualSetEntityOffset': 0x118,
                       'unresolved': ['Original HUD root construction and current active page.',
                                      'Instantiated control identities and their ordered listener bindings.']},
        'mainPagePlayerBinding': {'source': 'Game:2016d4d0', 'playerSlot': 0,
                                 'quickSlotControlOffset': 0x1b0,
                                 'quickSlotControlReceiverSource': 'Game:201668d0',
                                 'inventoryBindingSource': 'Game:2018a7f0'},
        'supportedHudCallbackFamilies': {
            'list': {'create': 'Game:2018a740', 'change': 'Game:2018a750',
                     'delete': 'Game:2018a760', 'clear': 'Game:2018a770',
                     'destroy': 'Game:2018a8a0', 'bind': 'Game:2018a7f0'},
            'recipe-stats': {'create': 'Game:2018ce20', 'change': 'Game:2018ce30',
                             'delete': 'Game:2018ce40', 'clear': 'Game:2018ce50',
                             'destroy': 'Game:2018ce60', 'bind': 'Game:2018cd90'},
            'stack-stats': {'create': 'Game:2018e4b0', 'change': 'Game:2018e4d0',
                            'delete': 'Game:2018e4e0', 'clear': 'Game:2018e530',
                            'destroy': 'Game:2018e560', 'bind': 'Game:2018e460'},
        },
        'remaining': ['Runtime listener registry completeness.',
                      'Native HUD page/control instance lifecycle and paint consumers.',
                      'Physical equipment ItemWorld, owner proxies, skeleton attachments, and stat effects.'],
        'nextSourceBodies': ['Game:20160c20', 'Game:20169a90', 'Game:20165720',
                             'Game:20165ca0', 'Game:20164900', 'Game:20164210',
                             'Game:20162910', 'Game:20163670', 'Game:20162e50',
                             'Game:2016ba60', 'Game:2016bd70', 'Game:2016b650',
                             'Game:2016c120', 'Game:201cf590', 'Game:201ce740', 'Game:201ce6f0'],
        'limitation': 'Supported callback bodies are not evidence that the original complete registry is empty or reconstructed.',
    }
    save_json(public / 'boundaries.json', rules)
    save_json(output / 'boundaries.json', rules)
    manifest = {'schema': 'gothic3-native-inventory-observers-audit-v1', 'originalBinaries': binaries,
                'sourceReceipts': receipts, 'callbackRegistrations': registrations,
                'instructionCount': sum(len(rows) for rows in instructions.values()),
                'originalInstructionBytes': sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows),
                'producerSha256': sha(Path(__file__)),
                'readerSha256': sha(repo / 'tools/gothic3/research_native_combat.py'),
                'importReaderSha256': sha(repo / 'tools/gothic3/research_native_inventory.py'),
                'allSelectedInstructionBytesMatchOriginalPE': True,
                'hierarchyAndImportsSha256': sha(output / 'hierarchy-and-imports.json'),
                'instructionRecordsSha256': sha(output / 'instruction-records.json'),
                'runtimeRegistryCompletenessProven': False,
                'runtime': {'path': 'public/gothic3/inventory-observers/boundaries.json',
                            'bytes': (public / 'boundaries.json').stat().st_size,
                            'sha256': sha(public / 'boundaries.json')}}
    save_json(output / 'manifest.json', manifest)
    implementation = repo / 'src/gothic3/inventory-observers.ts'
    owned_files = [path for path in sorted(output.rglob('*'))
                   if path.is_file() and path.name != 'implementation-receipt.json']
    owned_files += [public / 'boundaries.json']
    for receipt in receipts:
        for path_key, hash_key in [('cExcerpt', 'cExcerptSha256'), ('assemblyExcerpt', 'assemblyExcerptSha256')]:
            if sha(output / receipt[path_key]) != receipt[hash_key]:
                raise ValueError('Written source excerpt differs from audited bytes')
    save_json(output / 'implementation-receipt.json', {
        'schema': 'gothic3-inventory-observer-implementation-receipt-v1',
        'nativeCodeExecuted': False, 'testsRun': False,
        'runtimeRegistryCompletenessProven': False,
        'implementation': {'path': implementation.relative_to(repo).as_posix(), 'sha256': sha(implementation)},
        'producer': {'path': Path(__file__).relative_to(repo).as_posix(), 'sha256': sha(Path(__file__))},
        'files': [{'path': path.relative_to(repo).as_posix(), 'bytes': path.stat().st_size, 'sha256': sha(path)}
                  for path in owned_files],
        'sourceFunctionCount': len(receipts), 'instructionCount': manifest['instructionCount'],
        'originalPEBytes': manifest['originalInstructionBytes'],
        'scope': 'proven-HUD-listener-callbacks-and-player-cache-GUI-binding-order-with-unresolved-original-registry',
    })
    print(json.dumps({'functions': len(receipts), 'instructions': manifest['instructionCount'],
                      'originalPEBytes': manifest['originalInstructionBytes'],
                      'listenerRTTIClasses': len(hierarchy['classes']),
                      'runtimeRegistryCompleteness': 'unresolved'}))


if __name__ == '__main__':
    main()
