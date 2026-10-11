# SPDX-License-Identifier: GPL-3.0-only
"""Capture original ending records and native EndGame bytes; execute no gameplay."""
from __future__ import annotations
import argparse
import hashlib
import json
import re
from pathlib import Path
from read_gameplay_ini import parse_ini
from read_native_gameplay_evidence import pe_bytes

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_SHA = '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1'
EVENTS = {'Epilog_Innos', 'Epilog_Adanos', 'Epilog_Beliar', 'Epilog_EndGameInfo'}

def digest(data):
    return hashlib.sha256(data).hexdigest()

def checked(path, expected):
    data = path.read_bytes()
    if digest(data) != expected:
        raise ValueError('Original source hash differs: ' + str(path))
    return data

def capture(study):
    catalog_path = ROOT / 'public/gothic3/gameplay/infos.json'
    runtime_path = ROOT / 'public/gothic3/gameplay/runtime/infos.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    runtime = {r['id']: r for r in json.loads(runtime_path.read_text(encoding='utf-8'))}
    manifests = {}
    selected = {}
    for archive in ('Infos.pak', 'Infos.p00', 'Infos.p01'):
        path = study / '02_Unpacked_Data/_metadata' / (archive + '.manifest.json')
        data = path.read_bytes()
        manifest = json.loads(data)
        if any(e['attributes'] & 0x8000 for e in manifest['files']):
            raise ValueError('Unreviewed info deletion entry')
        manifests[archive] = {'sha256': manifest['archive']['archive_sha256'],
                              'manifestSha256': digest(data), 'entries': len(manifest['files'])}
        for entry in manifest['files']:
            selected[entry['path'].lower()] = entry
    infos = []
    for row in catalog:
        commands = row['commands']
        if not any(c['command'] == 'EndGame' or
                   (c['command'] == 'SetGameEvent' and c['id1'] in EVENTS)
                   for c in commands):
            continue
        source = row['source']
        entry = selected[source['path'].lower()]
        if entry['archive'] != source['archive'] or entry['sha256'] != source['sha256']:
            raise ValueError('Ending catalog differs from archive selection: ' + row['id'])
        data = checked(study / entry['output_relative'], source['sha256'])
        parsed = parse_ini(data)
        if parsed['sections'].get('Info', {}) != row['rawFields']:
            raise ValueError('Ending fields differ from original INI: ' + row['id'])
        retained = runtime.get(row['id'])
        if retained is None or retained['source']['sha256'] != source['sha256'] or retained['commands'] != commands:
            raise ValueError('Ending runtime catalog differs: ' + row['id'])
        field_lines = {}
        for record in parsed['records']:
            if record['section'] == 'Info':
                field_lines.setdefault(record['key'], []).append(record['line'])
        infos.append({'id': row['id'], 'source': source,
                      'sourceLines': field_lines, 'owner': row['owner'],
                      'quest': row['quest'], 'conditionType': row['conditionType'],
                      'infoType': row['type'], 'given': row['given'],
                      'permanent': row['permanent'], 'conditions': row['conditions'],
                      'commands': commands, 'runtimeCatalogMatches': True})
    commands_path = ROOT / 'public/gothic3/gameplay/commands.json'
    commands = json.loads(commands_path.read_text(encoding='utf-8'))
    native = commands['native']
    end_game = next(e for e in native['entries'] if e['name'] == 'EndGame')
    if end_game['opcode'] != 49 or native['inputSha256'] != SCRIPT_SHA:
        raise ValueError('Unreviewed EndGame dispatcher')
    binary = checked(study / '00_Original_Runtime/scripts/Script_Game.dll', SCRIPT_SHA)
    module = study / '01_Decompiled_Code/scripts__Script_Game_dll'
    pseudo = checked(module / native['dispatcher']['decompiledFile'],
                     native['dispatcher']['fileSha256'])
    pseudo_lines = pseudo.decode('utf-8').splitlines()
    case_line = end_game['handler']['caseLine']
    if 'case 0x31:' not in pseudo_lines[case_line - 1]:
        raise ValueError('Unreviewed EndGame pseudocode case')
    assembly = (module / 'full_disassembly.asm').read_bytes()
    instructions = []
    expected = 0x100ddcc7
    for number, line in enumerate(assembly.decode('utf-8').splitlines(), 1):
        match = re.match(r'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', line)
        if not match:
            continue
        address = int(match[1], 16)
        if not 0x100ddcc7 <= address < 0x100ddd2c:
            continue
        raw = bytes.fromhex(match[2])
        if address != expected or pe_bytes(binary, address, len(raw)) != raw:
            raise ValueError('EndGame assembly differs from original PE')
        instructions.append({'va': match[1], 'bytes': match[2],
                             'text': match[3], 'assemblyLine': number})
        expected += len(raw)
    if expected != 0x100ddd2c:
        raise ValueError('Incomplete EndGame native case')
    credits = []
    for name, address in [('G3_Credits.bik', 0x102143b0), ('G3_Credits2.bik', 0x1021439c)]:
        raw = name.encode('ascii') + b'\0'
        if pe_bytes(binary, address, len(raw)) != raw:
            raise ValueError('Credits literal differs from PE')
        credits.append({'name': name, 'literalVA': f'{address:08x}', 'bytes': raw.hex()})
    quest_names = sorted({r['quest'] for r in infos if r['quest']})
    quest_path = ROOT / 'public/gothic3/gameplay/quests.json'
    quests = [q for q in json.loads(quest_path.read_text(encoding='utf-8')) if q['id'] in quest_names]
    if sorted(q['id'] for q in quests) != quest_names:
        raise ValueError('Ending quest definition missing')
    return {'schema': 1, 'scope': 'original ending evidence; no gameplay or native execution',
            'runtimeExecuted': False, 'campaignCompletionVerified': False,
            'catalogs': {'infosSha256': digest(catalog_path.read_bytes()),
                         'runtimeInfosSha256': digest(runtime_path.read_bytes()),
                         'commandsSha256': digest(commands_path.read_bytes()),
                         'questsSha256': digest(quest_path.read_bytes())},
            'infoArchives': manifests, 'infos': infos, 'referencedQuests': quests,
            'endGame': {'module': 'scripts/Script_Game.dll', 'inputSha256': SCRIPT_SHA,
                        'dispatcherVA': native['dispatcher']['va'], 'opcode': 49,
                        'pseudocode': {'file': native['dispatcher']['decompiledFile'],
                                       'sha256': native['dispatcher']['fileSha256'],
                                       'caseLine': case_line},
                        'assemblySha256': digest(assembly), 'caseBegin': '100ddcc7',
                        'caseEndExclusive': '100ddd2c', 'instructions': instructions,
                        'bytesSha256': digest(pe_bytes(binary, 0x100ddcc7, 0x65)),
                        'credits': credits,
                        'terminationCall': {'va': '100ddd21', 'iatVA': '1022625c',
                                            'argument': True}},
            'limitations': ['Catalog membership does not prove live info activation or availability.',
                            'Some branch-event records use owner sh; their presence does not prove an ordinary campaign route.',
                            'The dependencies of PlayVideo and Terminate remain unimplemented here.',
                            'No quest, event or ending state is forced by this evidence generator.']}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=ROOT / 'assets/gothic3/campaign-ending/source-evidence.json')
    args = parser.parse_args()
    evidence = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(evidence, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print('Captured', len(evidence['infos']), 'original ending-related infos and',
          len(evidence['endGame']['instructions']), 'verified EndGame instructions')

if __name__ == '__main__':
    main()
