"""Recover original HUD construction and listener composition without native execution.

Run from this repository with Python 3.10+:
  python -B tools/gothic3/research_native_hud.py --study <completed study>
Only the hud evidence namespaces are written. The runtime profile describes
constructed listener controls, not a complete renderer or external registry.
"""
from __future__ import annotations

import argparse
import csv
import re
import struct
from pathlib import Path

from research_native_combat import PE, INPUTS, SUPPORTED_SHA256, collect_module, save_json, sha

SELECTED = '''
2016fb70 201708b0 2016fc30 20170760 20170a70 20170ac0
201702e0 20170320 20170d90 20170d00 20170be0
2016d160 2016d230 2016d4d0 2016d770 20166870 20166890 201668d0
20166110 20166510 20166340 20165ed0 20190080 2018ef50 2018ecd0
2016c800 2016c850 2016c8e0 2016c4f0 2016c530 2016c5a0
2016deb0 2016def0 2016df60 2016e420 2016e450 2016e4a0
2016ebf0 2016ec60 2016ef60 2016cc00 2016cc50 2016ce10
2016e610 2016e670 2016e720 2016e750 2016f370 2016f3d0 2016f480 2016f490
2016dba0 2016dbd0 2016dc20 2016c300 2016c330 2016f920 2016f950 2016e110 2016e140
20160b40 20160bb0 20160c20 20160f10 20160f50 20161000
201618a0 20161900 20161a80 20164100 20164160 20164210
20164860 20164890 20164900 20169330 201693e0 20169a90 20169580
2016b270 2016b2d0 2016b650 2016b3a0 20165270 201652b0 20165350
20165640 20165680 20165720 20165a60 20165ab0 20165ca0 20165ba0 20165b70
20162810 20162860 20162910 20162c90 20162d10 20162e50 20163290 201632b0
201635a0 201635e0 20163670 20162a70 20163810
2016b9d0 2016ba00 2016ba60 2016bab0 2016bcf0 2016bd20 2016bd70
2016c090 2016c0c0 2016c120 2016c170
20189f50 20189f90 2018a7f0 2018a8a0 2018a780
2018cd30 2018cd60 2018cd90 2018e410 2018e440 2018e460 2018e590
20187da0 20187dc0 20186cc0 20186ce0 20188310 20188330
201884f0 20188510 201886b0 201886e0 20189e90 20189eb0
201873e0 20187440 20188e10 20188e70 20189a70 20189a90
201875f0 20188ed0 20188f20 20188f70 2018b730 20192e50
20029a7d 2000a312 2001a979 20012ad5 20020a86 2000ca36 20008a08
2015d8a0 20170170 20190340 201903e0 20191620 20170b20
201621b0 20190810 2018b1e0 2018e930 20188730 2018b510
20164d90 201650c0 20163c80 201946d0 20186d20 20193a20
'''.split()

PAGE_CLASSES = ['gCHUDPageInventory2', 'gCHUDPageSpells2', 'gCHUDPageDocuments2',
                'gCHUDPageSkills2', 'gCHUDPageQuests2', 'gCHUDPageTrade2',
                'gCHUDPageDialog2', 'gCHUDPageLoot2', 'gCHUDPageSynth2',
                'gCHUDPageSynth2', 'gCHUDPageSynth2', 'gCHUDPageTransform2',
                'gCHUDPageTransform2', 'gCHUDPageTransform2', 'gCHUDPageTransform2',
                'gCHUDPageTutorial2', 'gCHUDPageSlideshow2']
PAGE_CTORS = ['2016c800', '2016e420', '2016c4f0', '2016deb0', '2016dba0',
              '2016ebf0', '2016c300', '2016cc00', '2016e610', '2016e610',
              '2016e610', '2016f370', '2016f370', '2016f370', '2016f370',
              '2016f920', '2016e110']
PAGE_BIND = ['2016c8e0', '2016e4a0', '2016c5a0', '2016df60', '2016dc20',
             '2016ef60', '2000ca36', '2016ce10', '2016e720', '2016e720', '2016e720',
             '2016f480', '2016f480', '2016f480', '2016f480', '20008a08', '20020a86']


def constructor_path(control):
    page, name = control['page'], control['name']
    leaf = control['constructor'].split(':')[1]
    # Every edge is separately checked against the canonical assembly and its
    # original relative-call thunk bytes below. These are object offsets.
    if page == -1:
        return [('2016d160', 0x1b0, '20166870'), ('20166870', 0x10, leaf)]
    ctor = PAGE_CTORS[page]
    if name == 'item-stats':
        offset = {0: 0x50, 5: 0x78, 7: 0x50}.get(page, 0x64)
        return [(ctor, offset, '20160f10'), ('20160f10', 0x40, leaf)]
    if page == 0:
        return [(ctor, 0x8cc, '20165270'), ('20165270', 0x78, leaf)]
    if page == 1:
        return [(ctor, 0x28, '2016b270'), ('2016b270', control['controlOffset'] - 0x28, leaf)]
    if page == 2:
        if name == 'documents':
            return [(ctor, 0x3c, '20164860'), ('20164860', 0x28, leaf)]
        return [(ctor, 0xac, '20164100'), ('20164100', 0x60, '201618a0'), ('201618a0', 0x84, leaf)]
    if page == 3:
        return [(ctor, 0x834, '20169330'), ('20169330', control['controlOffset'] - 0x834, leaf)]
    if page == 5:
        view, offset = {'transaction-player': ('20162c90', 0x15c), 'transaction-vendor': ('20162c90', 0x15c),
                        'inventory': ('20162810', 0x2ac), 'vendor': ('201635a0', 0x39c)}[name]
        return [(ctor, offset, view), (view, control['controlOffset'] - offset, leaf)]
    if page == 7:
        view, offset = {'pool': ('20165a60', 0xd4), 'inventory': ('20165640', 0x1ac)}[name]
        return [(ctor, offset, view), (view, control['controlOffset'] - offset, leaf)]
    if 8 <= page <= 10:
        if name == 'recipes':
            return [(ctor, 0x1c8, '2016b9d0'), ('2016b9d0', 0x20, leaf)]
        return [(ctor, 0xc4, '2016bcf0'), ('2016bcf0', 0x24, '201618a0'), ('201618a0', 0x84, leaf)]
    if 11 <= page <= 14:
        return [(ctor, 0x148, '2016c090'), ('2016c090', 0x20, leaf)]
    raise ValueError('Missing original constructor chain: ' + control['id'])


def audit_constructor_paths(constructed, instructions, pe):
    def resolve(entry):
        pins = []
        seen = set()
        while entry not in seen:
            seen.add(entry)
            raw = pe.at(int(entry, 16), 5)
            if raw[0] != 0xe9:
                return entry, pins
            target = f'{int(entry, 16) + 5 + struct.unpack_from("<i", raw, 1)[0]:08x}'
            pins.append({'address': entry, 'bytes': raw.hex(), 'target': target})
            entry = target
        raise ValueError('Constructor forwarding cycle')
    result = []
    for control in constructed:
        edges = []
        for parent, offset, child in constructor_path(control):
            rows = instructions['Game:' + parent]
            found = []
            for at, row in enumerate(rows):
                if row['assembly'] != f'LEA ECX,[ESI + 0x{offset:x}]':
                    continue
                for call in rows[at + 1:at + 5]:
                    match = re.fullmatch(r'CALL 0x([0-9a-f]{8})', call['assembly'])
                    if match:
                        actual, pins = resolve(match[1])
                        if actual == child:
                            found.append({'parent': 'Game:' + parent, 'offset': offset,
                                          'child': 'Game:' + child, 'receiverInstruction': row,
                                          'callInstruction': call, 'forwardingBytes': pins})
                        break
            if len(found) != 1:
                raise ValueError(f'Original constructor edge differs: {parent}+{offset:x}->{child}')
            edges.extend(found)
        if sum(edge['offset'] for edge in edges) != control['controlOffset']:
            raise ValueError('Object-relative listener layout differs: ' + control['id'])
        result.append({'control': control['id'], 'edges': edges, 'summedControlOffset': control['controlOffset']})
    return result


def controls():
    """Actual constructed listener objects, in member-constructor order.

    Offsets refer to each page's concrete object, not its recovered data wrapper.
    The backing receiver adjustment is separate from the listener subobject.
    """
    result = []
    def add(page, name, family, offset, ctor):
        result.append({'id': ('main' if page == -1 else 'page-' + str(page)) + '/' + name,
                       'page': page, 'name': name, 'family': family,
                       'controlOffset': offset,
                       'listenerOffset': offset + {'list': 0x10, 'recipe-stats': 0x28, 'stack-stats': 0x34}[family],
                       'constructor': 'Game:' + ctor,
                       'initial': {'dirty': False, 'selectedStack': 'uninitialized' if family == 'stack-stats' else None,
                                   'boundInventory': None}})
    add(-1, 'quick-slots', 'list', 0x1c0, '20187da0')
    add(0, 'item-stats', 'stack-stats', 0x90, '2018e410')
    add(0, 'inventory', 'list', 0x944, '20189e90')
    for name, offset in zip(['innos', 'beliar', 'adanos'], [0x68, 0xa0, 0xd8]):
        add(1, name, 'list', offset, '201884f0')
    add(2, 'documents', 'list', 0x64, '20186cc0')
    add(2, 'recipe-stats', 'recipe-stats', 0x190, '2018cd30')
    for index in range(7):
        add(3, 'skills-' + str(index), 'list', 0x844 + 0x38 * index, '20188310')
    add(5, 'item-stats', 'stack-stats', 0xb8, '2018e410')
    add(5, 'transaction-player', 'list', 0x16c, '20188e10')
    add(5, 'transaction-vendor', 'list', 0x1c4, '20188e10')
    add(5, 'inventory', 'list', 0x2bc, '20188e10')
    add(5, 'vendor', 'list', 0x40c, '20188e10')
    add(7, 'item-stats', 'stack-stats', 0x90, '2018e410')
    add(7, 'pool', 'list', 0x154, '201873e0')
    add(7, 'inventory', 'list', 0x224, '201873e0')
    for page in range(8, 11):
        add(page, 'recipe-stats', 'recipe-stats', 0x16c, '2018cd30')
        add(page, 'recipes', 'list', 0x1e8, '20186cc0')
    for page in range(11, 15):
        add(page, 'item-stats', 'stack-stats', 0xa4, '2018e410')
        add(page, 'inventory', 'list', 0x168, '20189a70')
    if len(result) != 37:
        raise ValueError('Constructed listener control coverage changed')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    out, public = root / 'assets/gothic3/hud', root / 'public/gothic3/hud'
    for owned in [out, public]:
        if not owned.resolve().is_relative_to(root) or owned.is_symlink():
            raise ValueError('Owned HUD output must remain inside repository')
    out.mkdir(parents=True, exist_ok=True)
    public.mkdir(parents=True, exist_ok=True)
    study = args.study.resolve()
    binary = study / INPUTS['Game_dll']
    if sha(binary) != SUPPORTED_SHA256['Game']:
        raise ValueError('Unsupported original Game.dll')
    pe = PE(binary)
    directory = study / '01_Decompiled_Code/Game_dll'
    with (directory / 'functions.csv').open(encoding='utf-8-sig', newline='') as handle:
        rows = list(csv.DictReader(handle))
    # Include every named HUD constructor in the page/control region. This
    # covers non-listener members and inherited constructor defaults too.
    ctor_rows = [row for row in rows if len(row['address']) == 8 and
                 0x201601f0 <= int(row['address'], 16) <= 0x20194560 and
                 row['qualified_name'].startswith('gCHUD') and
                 ('::gCHUD' in row['qualified_name'] or '::~gCHUD' in row['qualified_name'])]
    selected = set(SELECTED) | {row['address'] for row in ctor_rows}
    with (directory / 'symbols.csv').open(encoding='utf-8-sig', newline='') as handle:
        symbols = list(csv.DictReader(handle))
    vtables = []
    for name in sorted(set(PAGE_CLASSES) | {'gCHUDPageMain2'}):
        matches = [row for row in symbols if row['qualified_name'] == name + '::vftable']
        if len(matches) != 1:
            raise ValueError('Original page vtable identity changed: ' + name)
        address = int(matches[0]['address'], 16)
        raw = pe.at(address + 0x110, 12)
        vtables.append({'class': name, 'address': f'{address + 0x110:08x}', 'bytes': raw.hex(),
                        'openCloseSetEntity': [f'{value:08x}' for value in struct.unpack('<III', raw)]})
        selected.update(f'{value:08x}' for value in struct.unpack('<III', raw))
    functions, instructions, _ = collect_module(study, 'Game_dll', selected, pe, out)
    constructed = controls()
    paths = audit_constructor_paths(constructed, instructions, pe)
    factory_table = pe.at(0x201700c4, 17 * 4)
    audit = {'nativeCodeExecuted': False, 'testsExecuted': False,
             'bodyCount': len(functions),
             'instructionCount': sum(len(value) for value in instructions.values()),
             'matchedBytes': sum(len(bytes.fromhex(row['bytes'])) for values in instructions.values() for row in values),
             'allInstructionBytesMatchOriginalPE': True,
             'constructedListenerControls': 37, 'externalRegistryCompletenessProven': False}
    evidence = {'schema': 'gothic3-native-hud-evidence-v1',
                'input': {'path': INPUTS['Game_dll'], 'sha256': sha(binary)},
                'functions': functions, 'instructions': instructions, 'pageVtables': vtables,
                'constructorPaths': paths,
                'pageFactoryTable': {'address': '201700c4', 'bytes': factory_table.hex(),
                                     'entries': [f'{value:08x}' for value in struct.unpack('<17I', factory_table)]},
                'audit': audit}
    save_json(out / 'native-evidence.json', evidence)
    profile = {'schema': 'gothic3-native-hud-profile-v1', 'inputSha256': sha(binary),
               'root': {'constructor': 'Game:2016fb70', 'create': 'Game:201708b0',
                        'entitySlots': 7, 'initialActivePage': -1, 'initialPreviousPage': -1,
                        'initialEntitySlots': [None] * 7, 'regularPageCount': 17,
                        'setEntity': 'Game:20170a70', 'resetEntity': 'Game:20170ac0',
                        'bindPageSlots': 'Game:201702e0', 'clearPageSlots': 'Game:20170320',
                        'selectPage': 'Game:20170d90'},
               'mainPage': {'id': 'main', 'class': 'gCHUDPageMain2', 'constructor': 'Game:2016d160',
                            'setEntity': 'Game:2016d4d0',
                            'bindingOrder': ['focus', 'mana', 'health', 'stamina', 'quick-slots', 'compass']},
               'pages': [{'id': index, 'class': name, 'constructor': 'Game:' + PAGE_CTORS[index],
                          'setEntity': 'Game:' + PAGE_BIND[index] if PAGE_BIND[index] else None,
                          'synthesisCategory': index - 6 if 8 <= index <= 10 else None,
                          'transformCategory': index - 11 if 11 <= index <= 14 else None}
                         for index, name in enumerate(PAGE_CLASSES)],
               'controls': constructed,
               'listenerDefaults': {'list': {'source': 'Game:20189f50', 'inventoryOffset': 20, 'dirtyOffset': 40},
                                    'recipe-stats': {'source': 'Game:2018cd30', 'inventoryOffset': 44, 'dirtyOffset': 56},
                                    'stack-stats': {'source': 'Game:2018e410', 'inventoryOffset': 56,
                                                    'dirtySource': 'Game:2018b730', 'dirtyOffset': 48, 'selectedOffset': 60,
                                                    'selectedConstructorWrite': False}},
               'scope': 'constructed-HUD-listener-controls-and-ordered-binding-lifecycle',
               'supportedProfile': {'successfulObjectAllocations': True,
                                    'allFactoryPagesConstructed': True,
                                    'additionalGfcMessageBindingsRequireHost': True,
                                    'stableUniqueLiveEntityPointers': True,
                                    'entityDestructionOrReplacementSupported': False},
               'startupPlayerBinding': {'source': 'Game:2016d4d0', 'rootSlot': 0,
                                        'activeRegularPage': -1,
                                        'inventoryListenerOrder': ['main/quick-slots'],
                                        'claim': 'Only HUD contributions at this exact profile; not global registry completeness.'},
               'remaining': ['Complete native GFC window creation/resource/control population and rendering.',
                             'Entity pointer slot lifetime and destruction/replacement outside the selected stable live-pointer profile.',
                             'Paint/selection message dispatch and their inventory-stat refreshes.',
                             'Complete non-HUD listener registration and original external module/plugin lifecycle.',
                             'Full page activation, tutorial/session changes and physical trading effects.'],
               'evidence': {'path': 'native-evidence.json', 'sha256': sha(out / 'native-evidence.json')}}
    save_json(out / 'profile.json', profile)
    save_json(public / 'profile.json', profile)
    (out / 'README.txt').write_text(
        'Original-PE HUD construction, listener defaults and binding evidence.\n'
        '37 listener controls across persistent Main2 and 17 instantiated regular pages.\n'
        'This evidence does not by itself certify a complete external/native inventory registry.\n',
        encoding='utf8', newline='\n')
    outputs = [{'path': path.relative_to(out).as_posix(), 'bytes': path.stat().st_size, 'sha256': sha(path)}
               for path in sorted(out.rglob('*')) if path.is_file() and path.name not in {'manifest.json', 'implementation-receipt.json'}]
    manifest = {'schema': 'gothic3-native-hud-manifest-v1', 'audit': audit,
                'producer': {'path': 'tools/gothic3/research_native_hud.py', 'sha256': sha(Path(__file__)),
                             'sharedHelper': {'path': 'tools/gothic3/research_native_combat.py',
                                              'sha256': sha(Path(__file__).with_name('research_native_combat.py'))}},
                'assets': outputs,
                'implementation': {'path': 'src/gothic3/hud-runtime.ts',
                                   'sha256': sha(root / 'src/gothic3/hud-runtime.ts')},
                'runtimeProfile': {'path': 'profile.json', 'bytes': (public / 'profile.json').stat().st_size,
                                   'sha256': sha(public / 'profile.json')}}
    save_json(out / 'manifest.json', manifest)
    implementation_files = [{'path': path.relative_to(root).as_posix(), 'bytes': path.stat().st_size,
                             'sha256': sha(path)}
                            for directory in [out, public] for path in sorted(directory.rglob('*'))
                            if path.is_file() and path != out / 'implementation-receipt.json']
    save_json(out / 'implementation-receipt.json', {
        'schema': 'gothic3-native-hud-implementation-receipt-v1',
        'nativeCodeExecuted': False, 'testsExecuted': False,
        'buildExecuted': False, 'browserExecuted': False,
        'externalRegistryCompletenessProven': False, 'audit': audit,
        'implementation': manifest['implementation'], 'producer': manifest['producer'],
        'files': implementation_files,
        'remainingHostBoundaries': profile['remaining'],
        'receiptSelfExcluded': True})
    print(audit)


if __name__ == '__main__':
    main()
