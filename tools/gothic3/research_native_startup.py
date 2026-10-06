"""Audit original startup bytes and preserve ordered lifecycle evidence.

Python 3.10+, pefile; capstone 5.0.7 is needed only for the undiscovered Gorn
callback. This reads the completed study and PE files, never loads a game DLL.
Writes only assets/gothic3/startup and public/gothic3/startup. Run from repo root:
  python tools/gothic3/research_native_startup.py --study <study>
An isolated Capstone directory can be provided with --capstone-path.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import re
import struct
import sys
from pathlib import Path

from research_native_combat import (
    PE, INPUTS, SHORT, SUPPORTED_SHA256, collect_module, save_json, sha,
)

SELECTED = {
    'scripts__Script_Game_dll': '''
100cfb70 100cfa10 100d0470 10077540 10091ad0 100901f0
100755e0 10075220 100183e0 100d5e30
10009400 10009680 1000e380 1000ebc0 1000a6f0 1000ed50 1000a800
1000ee40 1000a9a0 1000adc0 1000b3e0 1000b4a0 10015990 10016160
10045c90 10045b20 100462a0 100461d0 10046960 100467f0 100443c0 10044490
10044560 10044700 100447d0 10044630 10044f00 10044fd0 100450a0 10045170
10045240 10045310 10174a50 101742a0'''.split(),
    'Game_dll': ['200087ab', '20376690', '20033096'],
}

NAMED = {
    'PC_Hero', 'Ardea', 'Ardea_Orkboss', 'Gorn', 'Larson', 'Yepas',
    'AlShedim_TempleDoor_Tester_01',
}
RELEVANT_CLASSES = {
    'gCNavigation_PS', 'gCNPC_PS', 'gCInteraction_PS', 'gCEnclave_PS',
    'gCScriptRoutine_PS',
}


def relative(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def recover_callback(study: Path, out: Path, name: str, registration: str,
                     alias: int, entry: int, window_bytes: int):
    """Decode the registered byte range which the original C export missed.

    This is offline disassembly, not a decompilation or execution. RET 0x10 and
    all direct branch boundaries establish the selected callback's body extent.
    """
    import capstone
    import pefile
    path = study / INPUTS['scripts__Script_Game_dll']
    pe = PE(path)
    parsed = pefile.PE(str(path), fast_load=False)
    imports = {entry.address: entry.name.decode('ascii') if entry.name else str(entry.ordinal)
               for dll in parsed.DIRECTORY_ENTRY_IMPORT for entry in dll.imports}
    jump = pe.at(alias, 5)
    if jump[0] != 0xe9 or alias + 5 + struct.unpack_from('<i', jump, 1)[0] != entry:
        raise ValueError(name + ' registered alias changed')
    registration_text = (out / 'sources/Script_Game' / (registration + '.c.txt')).read_text(encoding='utf8')
    if f'"{name}"' not in registration_text or f'{alias:08x}' not in registration_text:
        raise ValueError(name + ' registration identity is not in original C')
    # This exact range ends with C2 10 00 before alignment CC and next function.
    window = pe.at(entry, window_bytes)
    end = window.index(bytes.fromhex('c21000')) + 3
    if window[end:] != b'\xcc' * (len(window) - end):
        raise ValueError('Unknown ' + name + ' callback boundary')
    raw = window[:end]
    decoder = capstone.Cs(capstone.CS_ARCH_X86, capstone.CS_MODE_32)
    records = []
    cursor = entry
    strings = {}
    for ins in decoder.disasm(raw, entry):
        if ins.address != cursor or bytes(ins.bytes) != pe.at(ins.address, ins.size):
            raise ValueError(name + ' instruction decoding left a gap')
        cursor += ins.size
        row = {'address': f'{ins.address:08x}', 'bytes': ins.bytes.hex(),
               'assembly': f'{ins.mnemonic} {ins.op_str}'}
        if ins.mnemonic == 'call' and ins.op_str.startswith('dword ptr [0x'):
            address = int(re.search(r'0x([0-9a-f]+)', ins.op_str)[1], 16)
            row['import'] = imports.get(address)
        if ins.mnemonic == 'push' and ins.op_str.startswith('0x102'):
            address = int(ins.op_str, 16)
            value = pe.cstring(address).decode('cp1252')
            strings[f'{address:08x}'] = value
            row['string'] = value
        records.append(row)
    if cursor != entry + len(raw) or records[-1]['assembly'] != 'ret 0x10':
        raise ValueError('Incomplete ' + name + ' callback decoding')
    boundaries = {int(row['address'], 16) for row in records}
    for row in records:
        if row['assembly'].startswith(('j', 'loop')):
            destination = re.search(r'0x([0-9a-f]+)', row['assembly'])
            if destination and int(destination[1], 16) not in boundaries:
                raise ValueError(name + ' branch leaves selected body')
    text = '; Offline original-PE disassembly; not a Ghidra C export.\n'
    text += '\n'.join(f"{r['address']} | {r['bytes']} | {r['assembly']}" +
                      (f" | {r['import']}" if r.get('import') else '') +
                      (f" | {r['string']!r}" if 'string' in r else '') for r in records) + '\n'
    dest = out / 'sources' / 'Script_Game' / (f'{entry:08x}.offline.asm.txt')
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text, encoding='utf8', newline='\n')
    return {'name': name, 'registration': registration,
            'registeredCallback': f'{alias:08x}', 'jumpBytes': jump.hex(),
            'registrationSource': 'sources/Script_Game/' + registration + '.c.txt',
            'registrationSourceSha256': sha(out / 'sources/Script_Game' / (registration + '.c.txt')),
            'body': f'{entry:08x}', 'bodyBytes': len(raw),
            'bodySha256': hashlib.sha256(raw).hexdigest(),
            'inputSha256': sha(path), 'decoder': f'capstone {capstone.__version__}',
            'allDecodedInstructionBytesMatch': True, 'allDirectBranchesInsideBody': True,
            'instructions': records, 'strings': strings,
            'assembly': relative(dest, out), 'assemblySha256': sha(dest),
            'CExportAvailable': False,
            'limitation': 'The pre-existing study missed this function; recovered instruction evidence does not assert an inferred C prototype.'}


def on_init_profiles(out: Path, instructions: dict, pe: PE):
    """Retain helper receiver identities plus literal reset effects.

    Unknown field meanings stay offsets. Vector/entity cache resets do not
    pretend to reproduce native allocation addresses or constructor side effects.
    """
    bodies = ['10009400', '10009680', '1000e380', '1000ebc0', '1000a6f0', '1000ed50',
              '1000a800', '1000ee40', '1000a9a0', '1000adc0', '1000b3e0', '1000b4a0']
    rows = instructions['Script_Game:100d0470']
    calls = []
    for i, row in enumerate(rows):
        raw = bytes.fromhex(row['bytes'])
        if len(raw) != 5 or raw[0] != 0xe8 or i == 0:
            continue
        previous = rows[i - 1]
        receiver = bytes.fromhex(previous['bytes'])
        if len(receiver) != 5 or receiver[0] != 0xb9:
            continue
        alias = int(row['address'], 16) + 5 + struct.unpack_from('<i', raw, 1)[0]
        jump = pe.at(alias, 5)
        body = alias + 5 + struct.unpack_from('<i', jump, 1)[0] if jump[0] == 0xe9 else alias
        calls.append({'receiverVA': f'{struct.unpack_from("<I", receiver, 1)[0]:08x}',
                      'bodyVA': f'{body:08x}', 'callVA': row['address'],
                      'callBytes': row['bytes'], 'receiverInstructionVA': previous['address'],
                      'receiverBytes': previous['bytes']})
    if [r['bodyVA'] for r in calls] != bodies:
        raise ValueError('OnInit helper sequence changed')
    table_source = (out / 'sources/Script_Game/1000e380.c.txt').read_text(encoding='utf8')
    current = {}
    table = []
    for statement in table_source.split(';'):
        for field, value in re.findall(r'local_(c|8|4) = (0x[0-9a-f]+|[0-9]+)', statement):
            current[field] = int(value, 0)
        if 'thunk_FUN_10016160(&local_c)' in statement:
            table.append([current['c'], current['8'], current['4']])
    if len(table) != 63:
        # Explicit bounded profile; unknown regeneration fails before publishing.
        raise ValueError(f'Unexpected OnInit transition count: {len(table)}')
    for call in calls:
        body = call['bodyVA']
        call['effects'] = {
            '10009400': [],
            '10009680': [{'operation': 'zeroBytes', 'offset': 0, 'count': 7}],
            '1000e380': [{'operation': 'writeI32', 'offsets': [0, 4, 8], 'value': -1},
                          {'operation': 'replaceTransitionArray', 'offset': 12, 'rows': table}],
            '1000ebc0': [{'operation': 'reserveArrayCapacity', 'offset': 0, 'arguments': [0, -1]},
                          {'operation': 'writeI32', 'offsets': [4], 'value': 0},
                          {'operation': 'reserveArrayCapacity', 'offset': 12, 'arguments': [0, -1]},
                          {'operation': 'writeI32', 'offsets': [16, 24, 28], 'value': 0}],
            '1000a6f0': [{'operation': 'zeroBytes', 'offset': 0, 'count': 1}],
            '1000ed50': [{'operation': 'zeroBytes', 'offset': 0, 'count': 3},
                          {'operation': 'clearNativeArray', 'offset': 0x214}],
            '1000a800': [{'operation': 'zeroBytes', 'offset': 0, 'count': 3},
                          {'operation': 'writeI32', 'offsets': [4, 8], 'value': 0},
                          {'operation': 'zeroBytes', 'offset': 12, 'count': 1}],
            '1000ee40': [{'operation': 'replaceNoneEntityArray', 'offset': 0, 'count': 117},
                          {'operation': 'clearNativeArray', 'offset': 12},
                          {'operation': 'clearNativeArray', 'offset': 24}],
            '1000a9a0': [{'operation': 'resetEntityDistanceEntries', 'offset': 0, 'count': 10,
                          'stride': 172, 'entity': None, 'distance': 'positive-infinity'},
                          {'operation': 'writeNoneEntity', 'offsets': [0x6b8, 0x760]},
                          {'operation': 'writeI32', 'offsets': [0x808], 'value': 0}],
            '1000adc0': [], '1000b3e0': [],
            '1000b4a0': [{'operation': 'zeroBytes', 'offset': 0, 'count': 60}],
        }[body]
    return calls


def source_entities(repo: Path, study: Path):
    directory = repo / 'public/gothic3/gameplay/world'
    by_file = {f'{int(p.stem):04d}': json.loads(p.read_text(encoding='utf8'))
               for p in directory.glob('[0-9][0-9][0-9][0-9].json')}
    selected = []
    for path in sorted((directory / 'entity-chunks').glob('*.json.gz')):
        raw = path.read_bytes()
        document = json.loads(gzip.decompress(raw))
        for entity in document['entities']:
            if entity['name'] not in NAMED:
                continue
            metadata = by_file[path.name[:4]]
            source = metadata['source']
            native_path = study / '02_Unpacked_Data/Archives' / source['archive'] / source['path']
            if sha(native_path) != source['sha256']:
                raise ValueError('World source changed: ' + source['path'])
            selected.append({
                'key': entity['key'], 'name': entity['name'], 'guid20': entity['guid'],
                'worldMatrixCm': entity['worldMatrix'], 'source': source,
                'chunk': relative(path, repo / 'public/gothic3'), 'chunkSha256': hashlib.sha256(raw).hexdigest(),
                'classes': {ps['name']: {'version': ps['version'], 'values': ps['values']}
                            for ps in entity['propertySets'] if ps['name'] in RELEVANT_CLASSES},
            })
    for name in NAMED:
        if len([r for r in selected if r['name'] == name]) != 1:
            raise ValueError('Startup name not uniquely resolved: ' + name)
    start = by_file['0000']
    native = study / '02_Unpacked_Data/Archives' / start['source']['archive'] / start['source']['path']
    if sha(native) != start['source']['sha256']:
        raise ValueError('G3_StartUp source changed')
    return selected, {'world': 'G3_StartUp', 'source': start['source'],
                      'entityCount': start['entityCount'],
                      'note': 'Distinct source world containing World_MCP; not an inferred Script_Game event or post-raid state.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--capstone-path', type=Path)
    args = parser.parse_args()
    if args.capstone_path:
        sys.path.insert(0, str(args.capstone_path.resolve()))
    repo = Path(__file__).resolve().parents[2]
    out = repo / 'assets/gothic3/startup'
    hosted = repo / 'public/gothic3/startup'
    study = args.study.resolve(strict=True)
    receipts = []
    registrations = []
    instructions = {}
    for module, entries in SELECTED.items():
        path = study / INPUTS[module]
        expected = SUPPORTED_SHA256[SHORT[module]]
        if sha(path) != expected:
            raise ValueError('Unsupported native input: ' + module)
        module_receipts, module_instructions, regs = collect_module(study, module, set(entries), PE(path), out)
        receipts.extend(module_receipts)
        instructions[module] = module_instructions
        registrations.extend(regs)
    gorn = recover_callback(study, out, 'OnExit_Gorn', '10174a50', 0x1000205e, 0x100d3590, 0x1a0)
    menu = recover_callback(study, out, 'OnReturnFromMenu', '101742a0', 0x10002ab8, 0x100d2e80, 0x300)
    init_profiles = on_init_profiles(out, instructions['scripts__Script_Game_dll'], PE(study / INPUTS['scripts__Script_Game_dll']))
    entities, startup_world = source_entities(repo, study)
    prior = repo / 'public/gothic3/gameplay/initial/native-startup.json'
    player_receipt = json.loads(prior.read_text(encoding='utf8'))
    setter_calls = [r for r in player_receipt['attributeSetterCalls'] if r['function'].startswith('Set')]
    if len(setter_calls) != 18:
        raise ValueError('Expected18 stat setters, excluding the separate InventoryPopulate callback')
    pe = PE(study / INPUTS['scripts__Script_Game_dll'])
    for setter in player_receipt['attributeSetterCalls']:
        for kind in ['call', 'valuePush']:
            item = setter['instructionEvidence'][kind]
            if pe.at(int(item['va'], 16), len(bytes.fromhex(item['bytes']))) != bytes.fromhex(item['bytes']):
                raise ValueError('Existing player setter receipt differs from original PE')
        call = setter['instructionEvidence']['call']
        call_raw = bytes.fromhex(call['bytes'])
        entry = int(setter['instructionEvidence']['entryVA'], 16)
        if call_raw[0] != 0xe8 or int(call['va'], 16) + 5 + struct.unpack_from('<i', call_raw, 1)[0] != entry:
            raise ValueError('Startup setter call does not resolve to declared callback')
        jump = pe.at(entry, 5)
        body = entry + 5 + struct.unpack_from('<i', jump, 1)[0] if jump[0] == 0xe9 else entry
        if body != int(setter['bodyVA'], 16):
            raise ValueError('Startup setter jump does not resolve to declared body')
    constant = pe.at(0x1020d360, 8)
    if struct.unpack('<d', constant)[0] != 50.0:
        raise ValueError('Door translation constant changed')
    game_pe = PE(study / INPUTS['Game_dll'])
    clock = game_pe.at(0x2069eb48, 4)
    operations = [
        {'kind': 'resetEntityCaches', 'fields': ['ms_arrEntities', 'ms_arrNPCs', 'ms_u32LastFrame', 'ms_Player']},
        {'kind': 'setPlayerChapter', 'value': 1},
        {'kind': 'repairDoorTranslation', 'entity': 'AlShedim_TempleDoor_Tester_01', 'deltaYcm': -50.0, 'missing': 'log-warning-and-continue'},
        {'kind': 'repairNpcAlignment', 'entity': 'Yepas', 'alignment': 7, 'missingOrInvalid': 'log-warning-and-continue'},
        {'kind': 'setNavigationRoutine', 'entity': 'Larson', 'routine': 'Start'},
        {'kind': 'setEnclaveAlignment', 'entity': 'Ardea', 'alignment': 1},
        {'kind': 'setEnclaveRaid', 'entity': 'Ardea', 'value': True},
        {'kind': 'setEnclaveRevolution', 'entity': 'Ardea', 'value': True},
        {'kind': 'notifyEnclave', 'callback': 'NotifyEnclave', 'self': 'PC_Hero', 'other': 'Ardea_Orkboss', 'event': 2},
        {'kind': 'runQuest', 'quest': 'Xardas_FindXardas'},
        {'kind': 'setExitRoiScript', 'entity': 'Gorn', 'script': 'OnExit_Gorn', 'missing': 'skip'},
        *[{'kind': 'setPlayerStat', 'setter': r['function'], 'value': r['value'], 'body': r['bodyVA']} for r in setter_calls],
        {'kind': 'setPlayerLearningPointsAttributes', 'value': 0},
        {'kind': 'inventoryPopulate', 'self': 'PC_Hero', 'other': None, 'argument': 0},
    ]
    document = {
        'schema': 'gothic3-native-startup-v1', 'version': 1,
        'profile': 'installed-build-new-game-start0',
        'inputs': {SHORT[m]: {'path': INPUTS[m], 'sha256': SUPPORTED_SHA256[SHORT[m]]} for m in SELECTED},
        'callbackOrder': ['OnInit', 'OnGameStartUp', 'clock.SetFactor/Resume', 'session.Resume', 'warmup20', 'close-menu/page', 'OnReturnFromMenu', 'G3_Intro.bik', 'tutorial-if-enabled'],
        'newGameOnly': {'sessionStartMode': 0, 'sessionBody': '20376690', 'onInitBody': '100d0470', 'onGameStartUpBody': '100cfb70'},
        'nativeClockFactor': {'va': '2069eb48', 'bytes': clock.hex(), 'value': struct.unpack('<f', clock)[0]},
        'startupOperations': operations,
        'entities': entities, 'startupWorld': startup_world,
        'registeredCallbacks': registrations,
        'gornExitCallback': gorn, 'returnFromMenuCallback': menu,
        'onInitHelpers': init_profiles,
        'doorOffsetConstant': {'va': '1020d360', 'bytes': constant.hex(), 'valueCm': 50.0},
        'playerSetterInputReceipt': {'path': relative(prior, repo), 'sha256': sha(prior), 'count': len(setter_calls), 'separateInventoryPopulateIncludedInOriginalList': True, 'allSelectedCallAndArgumentBytesMatch': True},
        'sourceFunctions': receipts,
        'audit': {'listedInstructions': sum(len(v) for module in instructions.values() for v in module.values()) + len(gorn['instructions']) + len(menu['instructions']),
                  'allListedInstructionBytesMatch': True, 'worldEntityNameResolutionUnique': True,
                  'noNativeGameCodeExecuted': True},
        'limitations': [
            'The planner reproduces OnGameStartUp order, not the complete gCSession::Start lifecycle.',
            'OnInit initializes internal script helper state; a host must establish its completed stage before startup.',
            'NotifyEnclave event2 must be prepared against source Ardea membership, political attitudes and AI/navigation state.',
            'Quest and inventory callbacks require separately implemented native hosts; no prefix may be applied when a later boundary is unsupported.',
            'Gorn exit ROI invocation requires native spatial ROI scheduling; this receipt proves the registered callback and branch effects, not its trigger radius.',
            'The body instruction audit compares exported listed instructions to PE bytes; it is not a fresh full executable disassembly.',
        ],
    }
    save_json(out / 'native-startup.json', document)
    save_json(hosted / 'native-startup.json', document)
    notes = '''# Native startup evidence\n\nThe installed callback activates the original Ardea raid. It does not skip to a liberated village.\n\n`gCSession::Start` (Game20376690) calls OnInit for modes0/1 and OnGameStartUp only for new-game mode0. Camera/player selection and navigation compilation precede both. Clock resume,20 warm-up process calls, menu return, intro video and optional tutorial follow.\n\nOnGameStartUp100cfb70 executes the ordered operations preserved in native-startup.json. NotifyEnclave receives player as self, Ardea_Orkboss as other, and integer event2 (fourth argument). The Ghidra three-argument prototype and unaff_retaddr name are not authoritative for that ABI.\n\nDirtyhack100cfa10 subtracts50 native centimetres from an existing door's matrixY and sets existing valid Yepas NPC political alignment7. Its missing-entity warnings do not stop native startup.\n\nOnExit_Gorn1000205e is a five-byte E9 to100d3590. The old study omitted this body from its function index. Offline PE decoding preserves every instruction and branch, without changing the study. The callback checks whether Gorn_ShowReddock is open. When it is not open, it closes that quest, sets the callback self's routine GothaPrison, moves self to the routine working point, and clears self ExitROIScript. It returns1 regardless. This is an escort-related callback, not the opening raid trigger.\n\nG3_StartUp is a separate compiled world with one World_MCP entity in the reviewed effective resource. It is not a Script_Game literal event. No callback named GornROI is present in the installed registration/string table.\n\nThe TypeScript planner requires a fresh source phase and all callback transactions before a single atomic commit. An already initialized player seed cannot be declared a newly executed native startup. This prerequisite is not a claim that full gameplay is implemented.\n'''
    (out / 'EVIDENCE.md').write_text(notes, encoding='utf8', newline='\n')
    manifest = {'schema': 'gothic3-native-startup-manifest-v1', 'version': 1,
                'nativeDocument': {'url': 'startup/native-startup.json', 'sha256': sha(hosted / 'native-startup.json'), 'bytes': (hosted / 'native-startup.json').stat().st_size},
                'researchTool': {'path': 'tools/gothic3/research_native_startup.py', 'sha256': sha(Path(__file__))},
                'evidenceFiles': [{'path': relative(p, out), 'sha256': sha(p), 'bytes': p.stat().st_size}
                                  for p in sorted(out.rglob('*')) if p.is_file() and p.name != 'source-manifest.json'],
                'instructionsAudited': document['audit']['listedInstructions']}
    save_json(out / 'source-manifest.json', manifest)
    save_json(hosted / 'source-manifest.json', manifest)
    print(json.dumps({'functions': len(receipts), 'instructions': document['audit']['listedInstructions'],
                      'gornBodyBytes': gorn['bodyBytes'], 'entities': len(entities),
                      'nativeClockFactor': document['nativeClockFactor']['value'],
                      'documentSha256': manifest['nativeDocument']['sha256']}))


if __name__ == '__main__':
    main()
