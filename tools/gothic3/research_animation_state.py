"""Recover animation naming, descriptors and instruction state from original PEs.

Python 3.10+, standard library. Run offline with --study PATH. This never loads
or executes a Gothic executable/DLL. Outputs stay in animation-state namespaces.
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import struct
from pathlib import Path

from research_native_clock import collect
from research_native_combat import PE, save_json, sha
from research_application_process import native_exports
from read_xact_skin import read_motion

ROOT = Path(__file__).resolve().parents[2]
MODULES = {
    'Script': ('Script_dll', '00_Original_Runtime/Script.dll',
               '9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08',
               '100047a5 10003bb6 10004b01 10001c99 10004935 10004039 100037ba 1002f7b0 10074cd0 10074d20'),
    'Script_Game': ('scripts__Script_Game_dll', '00_Original_Runtime/scripts/Script_Game.dll',
                    '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1',
                    '10059d80'),
    'Game': ('Game_dll', '00_Original_Runtime/Game.dll',
             'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f',
             '2000d92c 20022570 2001c76f 2002efaa 20012ec2 2000da3f '
             '20522a10 20523250 20523410 205235b0 2001c161 20018d63 '
             '202128b0 20211f70 202123d0 20211e00 20216730 20216c80 20215640 '
             '202148e0 20213940 202112f0 20211140 20211bd0 20211230 2001d534 20211650 20211b80'),
    'Engine': ('Engine_dll', '00_Original_Runtime/Engine.dll',
               'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3',
               '30010e83 3001431c 30009494 3004014c 3003fc29 30022af2 300047fa 3000e543 '
               '30021cce 30021cc9 30037970 3003b124 30046add 30007f9a 3001b1cb '
               '300172a1 3003fac6 3003fdc3 3003b705 300061b8 3003e90f 3003ecd4 '
               '305c9680 3000d0cb 30016301 30007c5c 3064c600 3064c260 300e2c60 3067456a'),
}


def receipt(path: Path):
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': sha(path)}


def literal(pe, address):
    raw = pe.cstring(address)
    return {'address': f'{address:08x}', 'bytes': (raw + b'\0').hex(), 'text': raw.decode('ascii')}


def initialized_strings(pe, records, address, count):
    result = [None] * count
    for i, row in enumerate(records):
        match = re.fullmatch(r'MOV ECX,0x([0-9a-f]+)', row['assembly'])
        if not match:
            continue
        slot = int(match[1], 16) - address
        if not 0 <= slot < count * 4 or slot % 4:
            continue
        push = re.fullmatch(r'PUSH 0x([0-9a-f]+)', records[i-1]['assembly'])
        item = literal(pe, int(push[1], 16)) if push else {'text': '', 'defaultConstructor': True}
        item['slotAddress'] = match[1]
        item['constructorCall'] = records[i+1]
        result[slot // 4] = item
    if any(item is None for item in result):
        raise ValueError('Missing initialized native animation string')
    return result


def write_compressed(path, document):
    decoded = (json.dumps(document, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(gzip.compress(decoded, compresslevel=9, mtime=0))
    import hashlib
    item = receipt(path)
    item.update(contentEncoding='gzip', uncompressedBytes=len(decoded),
                uncompressedSha256=hashlib.sha256(decoded).hexdigest())
    return item


def export_resources(study, out, public):
    index_path = study / '02_Unpacked_Data/_metadata/effective_layers.json'
    if sha(index_path) != '6b780b236fdd1468946e0194bffd4681ad5481d7fcf1965b1043fae58d0462a2':
        raise ValueError('Authoritative effective-layer selection receipt differs')
    index = json.loads(index_path.read_text(encoding='utf-8'))
    hero_path = ROOT / 'public/gothic3/animated/hero-native.json'
    if sha(hero_path) != '80e274ba176b88d4780937d6794a1bf5d3f8988be76f5ee820c41f697697c97e':
        raise ValueError('Original cleaned Hero rig source differs')
    hero = json.loads(hero_path.read_text(encoding='utf-8'))
    catalog, selected, aliases = [], [], {}
    for entry in sorted(index['files'], key=lambda item: item['logical_path'].casefold()):
        logical = entry['logical_path']
        if not logical.lower().endswith('.xmot'):
            continue
        filename = logical.replace('\\', '/').split('/')[-1]
        stem = filename[:-5]
        alias = stem.split('%', 1)[0] + '.xmot'
        path = study / entry['candidate_effective_output']
        if sha(path) != entry['sha256']:
            raise ValueError('Effective XMOT source differs: ' + logical)
        item = {'filename': filename, 'alias': alias, 'logicalPath': logical,
                'archive': entry['candidate_effective_archive'],
                'studyPath': entry['candidate_effective_output'],
                'bytes': path.stat().st_size, 'sha256': entry['sha256']}
        aliases.setdefault(alias.upper(), []).append(len(catalog))
        catalog.append(item)
        # Exactly the unarmed Hero Stand/P0 locomotion and Jump/Fall resources.
        # Ambient Loop resources cover native idle's ordinary phase selection.
        if filename.startswith('Hero_Stand_None_None_P0_') and any(
                token in filename for token in ('_Move_', '_Jump_', '_Fall_', '_Ambient_Loop_', '_Ambient_Ambient_')):
            decoded = read_motion(path)
            if decoded['audit']['unknownChunks'] or decoded['audit']['interpolations'] != ['L']:
                raise ValueError('Unsupported selected native motion payload: ' + logical)
            if any(track['keys'] and track['keys'][0]['time'] != 0
                   for part in decoded['parts'] for track in part['tracks']):
                raise ValueError('Selected motion requires original positive-first-key initialization')
            selected.append({'name': alias, 'source': item, 'decoded': decoded})
    catalog_doc = {'schema': 'gothic3-native-animation-resource-catalog-v1', 'resources': catalog,
                   'duplicateAliases': {k: v for k, v in aliases.items() if len(v) > 1},
                   'aliasRule': 'Engine30046add SplitPath then305c9680: basename before percent, retain extension, CompareNoCase',
                   'blendingRecipeMatches': [e['logical_path'] for e in index['files']
                                             if e['logical_path'].lower().endswith('g3_ani_blendings.txt')]}
    catalog_receipt = write_compressed(public / 'resource-catalog.json.gz', catalog_doc)
    motions_receipt = write_compressed(public / 'hero-motions.json.gz', {
        'version': 1, 'nativeUnits': 'centimetres', 'sharedCleanedRig': hero['sharedCleanedRig'],
        'motions': selected, 'scope': 'original Hero unarmed Stand/P0 motion tracks, not engine blend/reposition passes'})
    save_json(out / 'resource-audit.json', {
        'effectiveIndex': {'studyPath': str(index_path.relative_to(study)).replace('\\', '/'),
                           'bytes': index_path.stat().st_size, 'sha256': sha(index_path)},
        'rigSource': receipt(hero_path), 'catalog': catalog_receipt, 'motions': motions_receipt,
        'motionCount': len(catalog), 'aliasCount': len(aliases),
        'ambiguousAliases': len(catalog_doc['duplicateAliases']), 'decodedSelected': len(selected),
        'nativeCodeExecuted': False, 'testsExecuted': False})
    return catalog_receipt, motions_receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    out = ROOT / 'assets/gothic3/animation-state'
    public = ROOT / 'public/gothic3/animation-state'
    functions, instructions, inputs, pes = [], {}, {}, {}
    for short, (directory, relative, expected, selected) in MODULES.items():
        path = args.study / relative
        actual = sha(path)
        if actual != expected:
            raise ValueError('Original animation PE differs: ' + short + ' ' + actual)
        pe = PE(path)
        pes[short] = pe
        inputs[short] = {'studyPath': relative, 'bytes': path.stat().st_size, 'sha256': actual}
        bodies, records = collect(args.study, short, directory, selected, pe, out)
        functions += bodies
        instructions.update(records)
    save_json(out / 'native-evidence.json', {
        'schema': 'gothic3-native-animation-state-evidence-v1',
        'inputs': inputs, 'functions': functions, 'instructions': instructions,
        'nativeCodeExecuted': False, 'testsExecuted': False,
    })
    tables = {}
    for name, entry, base, count in (
            ('actions', '20522a10', 0x207cc4c0, 138),
            ('phases', '20523250', 0x207cc6e8, 28),
            ('poses', '20523410', 0x207cc758, 25),
            ('aniStates', '205235b0', 0x207cc7c8, 30)):
        tables[name] = initialized_strings(pes['Game'], instructions['Game:' + entry], base, count)
    tables['overlays'] = initialized_strings(pes['Script'], instructions['Script:10074cd0'], 0x100b3a80, 3)
    tables['directions'] = initialized_strings(pes['Script'], instructions['Script:10074d20'], 0x100b3a8c, 9)
    exports = native_exports(pes['Game'])
    candidates = [(key, value) for key, value in exports.items() if key.startswith('?g_ppszUseTypes')]
    if len(candidates) != 1:
        raise ValueError('Original use-type export missing or ambiguous')
    key, base = candidates[0]
    tables['useTypes'] = []
    for i in range(57):
        raw = pes['Game'].at(base + i * 4, 4)
        item = literal(pes['Game'], struct.unpack('<I', raw)[0])
        item.update(slotAddress=f'{base + i*4:08x}', pointerBytes=raw.hex(), export=key)
        tables['useTypes'].append(item)
    rules = {'schema': 'gothic3-native-animation-rules-v1',
             'tables': {name: [item['text'] for item in values] for name, values in tables.items()},
             'tableEvidence': tables,
             'jump': [{'action': 54, 'phase': 12, 'useTypeA': 0, 'useTypeB': 0, 'duration': 0},
                      {'action': 57, 'phase': 5, 'useTypeA': 0, 'useTypeB': 0, 'duration': -1}],
             'defaultWrapperDescriptor': {'fadeIn': 0.30000001192092896, 'mode': 0,
                 'playSpeed': 1, 'loops': 4294967295, 'weight': 1, 'fadeOut': 0, 'blendMode': 1},
             'motionPriorities': [4, 3, 2, 0, 7, 6, 5, 8],
             'standardAniFadeTime': 0.20000000298023224,
             'limitations': ['JS floating-point storage reconstruction, not x87 emulation',
                 'full actor layer blending, masks, motion extraction, frame effects and movement remain engine dependencies',
                 'longitudinal/strafe helper outputs need original diagonal combiner/phase synchronization before full locomotion']}
    save_json(public / 'rules.json', rules)
    catalog, motions = export_resources(args.study, out, public)
    manifest = {'schema': 'gothic3-native-animation-state-manifest-v1',
                'rules': receipt(public / 'rules.json'), 'catalog': catalog, 'heroMotions': motions,
                'rig': receipt(ROOT / 'public/gothic3/animated/hero-native.json'),
                'sourceEvidence': receipt(out / 'native-evidence.json')}
    save_json(public / 'manifest.json', manifest)
    runtime = ROOT / 'src/gothic3/animation-state.ts'
    if runtime.exists():
        files = [p for directory in (out, public) for p in directory.rglob('*') if p.is_file()
                 and p.name != 'implementation-receipt.json']
        helpers = [Path(__file__), ROOT / 'tools/gothic3/research_native_clock.py',
                   ROOT / 'tools/gothic3/research_native_combat.py', ROOT / 'tools/gothic3/research_application_process.py',
                   ROOT / 'tools/gothic3/research_native_inventory.py', ROOT / 'tools/gothic3/read_xact_skin.py',
                   ROOT / 'src/gothic3/resource.ts', ROOT / 'src/gothic3/native-motion.ts',
                   ROOT / 'src/gothic3/player-state.ts', ROOT / 'public/gothic3/animated/hero-native.json']
        save_json(out / 'implementation-receipt.json', {
            'schema': 'gothic3-native-animation-implementation-receipt-v1',
            'runtime': receipt(runtime), 'producer': receipt(Path(__file__)),
            'helpers': [receipt(p) for p in helpers if p != Path(__file__)],
            'files': [receipt(p) for p in sorted(set(files + helpers + [runtime]))],
            'counts': {'entries': len(functions), 'instructions': sum(map(len, instructions.values())),
                       'matchedInstructionBytes': sum(len(bytes.fromhex(r['bytes']))
                                                       for rows in instructions.values() for r in rows)},
            'nativeCodeExecuted': False, 'testsExecuted': False})
    print({'entries': len(functions), 'instructions': sum(map(len, instructions.values())),
           'manifest': receipt(public / 'manifest.json')})


if __name__ == '__main__':
    main()
