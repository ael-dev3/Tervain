"""Reproduce the bounded combat receipts from a completed local Gothic3 study.

Python3.10+. This only reads PE bytes and exported study text; it does not load
DLLs, launch the game, or execute decompiled code. Writes are restricted to the
repository's assets/gothic3/combat and public/gothic3/combat directories.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import struct
from pathlib import Path

SELECTION = {
    'scripts__Script_Game_dll': '''
100ce620 100d01e0 1016ddd0 10170b10 1003d6a0 1003bb10 1003bb90 1003bbe0
1003c980 1003cbc0 10047cd0 100171c0 1007f000 1003c6b0 1003c550 100d6fa0
1003d4d0 1003d5a0 10016c60 10016e70 10016830 100169d0 10009a70 10009c80
10009a40 1003d1d0 10046e30 10046f40 10047a20 10062710 100628c0 100627e0
10027e70 100362f0 100e3ec0 100cec10 10046d30 10046c30 10045e20 100187b0
1001b0c0 1001aca0 100194c0 100183e0 100188c0 10019050 100d7ac0
10047530 100477c0 100458c0 10045b20
10016b00 10016f90 100170a0 1003a9c0 1001ab10 100cf140 100cf340 1000a390
100d01b0 10042c30 10042a70 10042d90 1001b640 100ced90 100467f0 10046af0
1000c160 10046590 10018070'''.split(),
    'Game_dll': '''
200014ba 20024127 20522a10 20015ed8 20026a03 2002a946 20027a89 201325b0
2000aa51 2036a6e0 2000779d 2001e7d6 201ae890 20029be0 20006f50 200012c1
2000e3c7 20014c6d 2007f170 2007f1d0 201ae790 200092f0 201ae950 201c0d30'''.split(),
    'Script_dll': ['10003b7f'],
    'Engine_dll': ['30009ff7', '3000bb3b'],
}
INPUTS = {
    'scripts__Script_Game_dll': '00_Original_Runtime/scripts/Script_Game.dll',
    'Game_dll': '00_Original_Runtime/Game.dll',
    'Script_dll': '00_Original_Runtime/Script.dll',
    'Engine_dll': '00_Original_Runtime/Engine.dll',
}
SUPPORTED_SHA256 = {
    'Script_Game': '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1',
    'Game': 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f',
    'Script': '9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08',
    'Engine': 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3',
}
SHORT = {'scripts__Script_Game_dll': 'Script_Game', 'Game_dll': 'Game',
         'Script_dll': 'Script', 'Engine_dll': 'Engine'}
INSTRUCTION = re.compile(r'^([0-9a-f]{8}) \| ([0-9a-f]+) \| (.*)$', re.M)
CONSTANTS = [
    ('scripts__Script_Game_dll', 0x1020be90, 'd', 'npcStrengthMultiplier'),
    ('scripts__Script_Game_dll', 0x1020be68, 'd', 'npcProtectionScale'),
    ('scripts__Script_Game_dll', 0x1020be78, 'd', 'playerProtectionScale'),
    ('scripts__Script_Game_dll', 0x1020a358, 'd', 'xpFirstMultiplier'),
    ('scripts__Script_Game_dll', 0x102091e8, 'd', 'xpSecondMultiplier'),
    ('Game_dll', 0x2065b1a8, 'd', 'beginPhaseFraction'),
    ('Game_dll', 0x206864c8, 'd', 'fistHitPhaseFraction'),
]


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def save_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n',
                    encoding='utf8', newline='\n')


class PE:
    def __init__(self, path: Path):
        self.data = path.read_bytes()
        if self.data[:2] != b'MZ':
            raise ValueError(f'Not PE: {path.name}')
        pe = struct.unpack_from('<I', self.data, 0x3c)[0]
        if self.data[pe:pe + 4] != b'PE\0\0':
            raise ValueError('Invalid PE signature')
        sections, optional_size = struct.unpack_from('<H', self.data, pe + 6)[0], struct.unpack_from('<H', self.data, pe + 20)[0]
        optional = pe + 24
        if struct.unpack_from('<H', self.data, optional)[0] != 0x10b:
            raise ValueError('This reader requires the installed32bit PE profile')
        self.base = struct.unpack_from('<I', self.data, optional + 28)[0]
        self.sections = []
        for i in range(sections):
            at = optional + optional_size + i * 40
            _, rva, size, offset = struct.unpack_from('<IIII', self.data, at + 8)
            if offset + size > len(self.data):
                raise ValueError('PE section leaves input bytes')
            self.sections.append((rva, size, offset))

    def at(self, address: int, size: int) -> bytes:
        rva = address - self.base
        for section_rva, section_size, offset in self.sections:
            if section_rva <= rva and rva + size <= section_rva + section_size:
                start = offset + rva - section_rva
                return self.data[start:start + size]
        raise ValueError(f'Not file-backed: {address:08x}/{size}')

    def cstring(self, address: int) -> bytes:
        for size in range(256):
            if self.at(address + size, 1) == b'\0':
                return self.at(address, size)
        raise ValueError('Unterminated action label')


def cblocks(path: Path):
    content = path.read_text(encoding='utf8')
    starts = list(re.finditer(r'/\* ENTRY ([0-9a-f]{8}) \|', content))
    for i, match in enumerate(starts):
        end = starts[i + 1].start() if i + 1 < len(starts) else len(content)
        yield match[1], content[match.start():end], content.count('\n', 0, match.start()) + 1


def audit_assembly(text: str, pe: PE):
    records = []
    for match in INSTRUCTION.finditer(text):
        raw = bytes.fromhex(match[2])
        if pe.at(int(match[1], 16), len(raw)) != raw:
            raise ValueError(f'Instruction mismatch at {match[1]}')
        records.append({'address': match[1], 'bytes': match[2], 'assembly': match[3]})
    if not records:
        raise ValueError('Selected assembly contains no instructions')
    return records


def registrations(directory: Path, selected: set[str], pe: PE):
    records = []
    for path in sorted((directory / 'pseudocode').glob('*.c')):
        for entry, block, line in cblocks(path):
            match = re.search(r'thunk_FUN_10017a50\(local_8,([^,]+),local_4\)', block)
            if not match:
                continue
            literals = re.findall(r'bCString::bCString\(local_[48],"([^"]+)"\)', block)
            callback = re.search(r'([0-9a-f]{8})', match[1])
            if len(literals) != 2 or not callback:
                continue
            address = callback[1]
            raw = pe.at(int(address, 16), 5)
            target = f'{int(address, 16) + 5 + struct.unpack_from("<i", raw, 1)[0]:08x}' if raw[0] == 0xe9 else address
            if target not in selected:
                continue
            records.append({'registrationEntry': entry, 'sourceCppLiteral': literals[0],
                            'name': literals[1], 'callback': address, 'body': target,
                            'callbackJumpBytes': raw.hex() if raw[0] == 0xe9 else None,
                            'source': path.relative_to(directory).as_posix(), 'sourceLine': line,
                            'sourceSha256': sha(path)})
    return records


def collect_module(study: Path, module: str, selected: set[str], pe: PE, out: Path):
    directory = study / '01_Decompiled_Code' / module
    csv_path = directory / 'functions.csv'
    with csv_path.open(encoding='utf-8-sig', newline='') as f:
        rows = list(csv.DictReader(f))
    by_address = {r['address']: r for r in rows}
    # Five-byte export jumps can have expanded C from their targets. Preserve
    # both distinct body receipts rather than attributing target bytes to alias.
    for entry in list(selected):
        row = by_address[entry]
        if row['body_bytes'] == '5':
            raw = pe.at(int(entry, 16), 5)
            if raw[0] == 0xe9:
                target = f'{int(entry, 16) + 5 + struct.unpack_from("<i", raw, 1)[0]:08x}'
                if target not in by_address:
                    raise ValueError(f'No canonical function for jump {entry}->{target}')
                selected.add(target)
    if module == 'scripts__Script_Game_dll':
        regs = registrations(directory, selected, pe)
        selected.update(r['registrationEntry'] for r in regs)
    else:
        regs = []
    sorted_rows = sorted(rows, key=lambda r: int(r['assembly_entry_line']))
    next_start = {r['address']: int(sorted_rows[i + 1]['assembly_entry_line']) - 1
                  if i + 1 < len(sorted_rows) else None for i, r in enumerate(sorted_rows)}
    range_map = {int(by_address[e]['assembly_entry_line']) - 1: e for e in selected}
    excerpts = {}
    active = None
    lines = []
    asm_path = directory / 'full_disassembly.asm'
    with asm_path.open(encoding='utf8') as f:
        for line_number, line in enumerate(f, 1):
            if active and next_start[active] == line_number:
                excerpts[active] = ''.join(lines)
                active, lines = None, []
            if line_number in range_map:
                if active:
                    raise ValueError('Overlapping canonical assembly ranges')
                active = range_map[line_number]
                if not line.startswith('; ' + active + ' '):
                    raise ValueError(f'Assembly line/header mismatch {module}:{active}')
            if active:
                lines.append(line)
        if active:
            excerpts[active] = ''.join(lines)
    c = {}
    c_paths = {directory / by_address[e]['pseudocode_file'] for e in selected}
    hashes = {path: sha(path) for path in c_paths}
    for path in c_paths:
        for entry, text, line in cblocks(path):
            if entry in selected:
                c[entry] = (text, line)
    asm_sha = sha(asm_path)
    csv_sha = sha(csv_path)
    receipts = []
    instructions = {}
    for entry in sorted(selected):
        row = by_address[entry]
        if row['status'] != 'decompiled':
            raise ValueError(f'Unsupported study C status: {module}:{entry}')
        text, source_line = c[entry]
        raw_asm = excerpts[entry]
        records = audit_assembly(raw_asm, pe)
        dest = out / 'sources' / SHORT[module]
        dest.mkdir(parents=True, exist_ok=True)
        c_path, a_path = dest / (entry + '.c.txt'), dest / (entry + '.asm.txt')
        c_path.write_text(text, encoding='utf8', newline='\n')
        a_path.write_text(raw_asm, encoding='utf8', newline='\n')
        body_jump = None
        if row['body_bytes'] == '5' and records[0]['bytes'].startswith('e9'):
            raw = bytes.fromhex(records[0]['bytes'])
            body_jump = f'{int(entry, 16) + 5 + struct.unpack_from("<i", raw, 1)[0]:08x}'
        receipts.append({'id': SHORT[module] + ':' + entry, 'module': SHORT[module], 'entry': entry,
                         'name': row['qualified_name'], 'signature': row['signature'],
                         'bodyBytes': int(row['body_bytes']), 'bodyRanges': row['body_ranges'],
                         'forwardingTarget': body_jump, 'studyCsvSha256': csv_sha,
                         'studyCSource': by_address[entry]['pseudocode_file'],
                         'studyCLine': source_line, 'studyCSha256': hashes[directory / row['pseudocode_file']],
                         'studyAssembly': 'full_disassembly.asm', 'studyAssemblyLine': int(row['assembly_entry_line']) - 1,
                         'studyAssemblySha256': asm_sha,
                         'cExcerpt': c_path.relative_to(out).as_posix(), 'cExcerptSha256': sha(c_path),
                         'assemblyExcerpt': a_path.relative_to(out).as_posix(), 'assemblyExcerptSha256': sha(a_path),
                         'instructionRecords': len(records), 'instructionBytes': sum(len(bytes.fromhex(r['bytes'])) for r in records),
                         'allInstructionBytesMatch': True})
        instructions[SHORT[module] + ':' + entry] = records
    return receipts, instructions, regs


def action_labels(records, pe: PE, input_sha: str):
    pointer = None
    labels = []
    for record in records:
        push = re.fullmatch(r'PUSH 0x([0-9a-f]+)', record['assembly'])
        if push:
            pointer = int(push[1], 16)
        target = re.fullmatch(r'MOV ECX,0x([0-9a-f]+)', record['assembly'])
        if target and pointer is not None and 0x207cc4c0 <= int(target[1], 16) < 0x207cc6e8:
            raw = pe.cstring(pointer)
            labels.append({'value': (int(target[1], 16) - 0x207cc4c0) // 4,
                           'label': raw.decode('ascii'), 'literalBytes': raw.hex(),
                           'storageAddress': target[1], 'literalAddress': f'{pointer:08x}',
                           'constructorAddress': record['address']})
    if [r['value'] for r in labels] != list(range(138)):
        raise ValueError('Incomplete installed-build action table')
    return {'version': 1, 'source': 'Game:20522a10', 'consumer': 'Game:20027a89',
            'inputSha256': input_sha, 'numericValuesAuthoritative': True,
            'note': 'Animation labels can repeat; Action11 and12 remain distinct. Action24 is StumbleR in this installed build.',
            'labels': labels}


RULES = [
    {'id': 'hero-melee', 'sources': ['Script_Game:1003d6a0', 'Script_Game:1007f000', 'Script_Game:1003cbc0'],
     'order': 'trunc(base*float32 multiplier), quality, max(0,trunc(strength/2)), perks, action scaling, protection',
     'scope': 'untransformed PlayerMemory Hero; Impact1/Blade2; fist or single1H; Action1..5; ordinary humanoid NPC0/5'},
    {'id': 'protection', 'sources': ['Script_Game:10046e30', 'Script_Game:10046f40', 'Script_Game:1003c980'],
     'arithmetic': 'cap80 before armor perks; signed32 IMUL(P,D), trunc(product/100), max(0,int32(D-removed))'},
    {'id': 'guard', 'sources': ['Script_Game:1003d6a0', 'Script_Game:100171c0', 'Script_Game:100467f0', 'Script_Game:10045b20'],
     'order': 'cost=trunc(preProtection/2); deficit=min(0,int32(SP-cost)); AddSP(-cost); AddHP(deficit); alive -> reaction17/18/21 and no engine receiver-damage subtraction'},
    {'id': 'ordinary-standing', 'sources': ['Script_Game:1003d6a0', 'Script_Game:1000c160'],
     'scope': 'caller resolves early AssessHit state and helper1000c160 result0 plus absent special effects; surviving victim receives Stumble23'},
    {'id': 'deadly', 'sources': ['Script_Game:1003c550', 'Script_Game:1003c6b0', 'Script_Game:1001aca0', 'Script_Game:1001b0c0'],
     'note': 'IsHumanoid includes Orc species5. Directional native GetAttitude results are required; serialized AttitudeToPlayer is insufficient.'},
    {'id': 'outlaw-attitude', 'sources': ['Script_Game:10018070', 'Script_Game:100194c0', 'Script_Game:1001b0c0'],
     'predicate': 'Self alignment7 with Other alignment!=7 and Other species0/5, or Other alignment7 with Self alignment!=7 and Self species0/5 ->4; otherwise0 means continue GetAttitude.',
     'browserScope': 'Three pinned Jack bandits: Self is nonplayer Type0 with source navigation and AIMode0, Hero alignment0/species0. GetAttitude returns4 from this branch before other faction/party/crime branches. The static standing/contact host remains browser-owned; no Kill/Defeat task or XP is inferred.'},
    {'id': 'xp', 'sources': ['Script_Game:10027e70', 'Script_Game:100362f0', 'Script_Game:100628c0', 'Script_Game:100627e0'],
     'correction': '10062b1d LEA EDI,[EAX+EAX*4] is level*5; expanded C says *10 incorrectly.',
     'order': 'native accepted task sets AIMode, quest callback, XP once unless DefeatedByPlayer; flag still set on GiveXP PartyMemberType5 no-op; one level increment per GiveXP, no loop/refill'},
    {'id': 'fist-timing', 'sources': ['Game:2036a6e0', 'Script_Game:100d01e0', 'Engine:30009ff7', 'Engine:3000bb3b'],
     'arithmetic': 'GetPlayTime is double; GetMaxTime is explicitly narrowed to float; threshold=float32(maxTime)*binary64(0.6000000238418579); processed flag set before callback',
     'scope': 'generic phase callback only; Script_Game OnHit accepts leftUse0/rightUse8. Sword contact uses engine TouchDamage and has no inferred60% hit timer.'},
    {'id': 'active-skill', 'sources': ['Game:201ae790', 'Game:201ae890', 'Game:201c0d30', 'Game:201ae950'],
     'predicate': 'resolved matching learnable skill stack and (Learned || ActivationCount>0); item presence alone is insufficient'},
]

PROOF_ADDRESSES = {
    'Script_Game:1003d6a0': ['1003dd17', '1003dd18', '1003dd1c', '1003df30', '1003df38', '1003df3a', '1003df42', '1003df48', '1003e1af', '1003e1b1', '1003e1b2', '1003e1b4'],
    'Script_Game:100628c0': ['10062b1d', '10062c53', '10062cf5', '10062d41'],
    'Game:2036a6e0': ['2036ab4e', '2036ab58', '2036ab60', '2036ab70', '2036ab74'],
}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--study-root', type=Path, required=True)
    p.add_argument('--repo-root', type=Path, default=Path(__file__).resolve().parents[2])
    a = p.parse_args()
    study, repo = a.study_root.resolve(strict=True), a.repo_root.resolve(strict=True)
    assets, public = repo / 'assets/gothic3/combat', repo / 'public/gothic3/combat'
    for path in [assets, public]:
        if not path.resolve().is_relative_to(repo) or path.is_symlink():
            raise ValueError('Owned output must remain physically inside repository')
        path.mkdir(parents=True, exist_ok=True)
    pe = {module: PE(study / path) for module, path in INPUTS.items()}
    inputs = [{'module': SHORT[module], 'studyPath': path, 'sha256': sha(study / path),
               'bytes': (study / path).stat().st_size} for module, path in INPUTS.items()]
    for original in inputs:
        if original['sha256'] != SUPPORTED_SHA256[original['module']]:
            raise ValueError(f"Unaudited native build: {original['module']}")
    receipts, instructions, regs = [], {}, []
    for module, values in SELECTION.items():
        r, i, registration = collect_module(study, module, set(values), pe[module], assets)
        receipts.extend(r)
        instructions.update(i)
        regs.extend(registration)
    constants = []
    for module, address, kind, name in CONSTANTS:
        raw = pe[module].at(address, struct.calcsize(kind))
        constants.append({'name': name, 'module': SHORT[module], 'address': f'{address:08x}',
                          'type': 'binary64' if kind == 'd' else 'binary32',
                          'bytes': raw.hex(), 'value': struct.unpack('<' + kind, raw)[0]})
    actions = action_labels(instructions['Game:20522a10'], pe['Game_dll'], next(x['sha256'] for x in inputs if x['module'] == 'Game'))
    instruction_proofs = []
    for source, addresses in PROOF_ADDRESSES.items():
        found = {r['address']: r for r in instructions[source]}
        instruction_proofs.append({'source': source, 'instructions': [found[address] for address in addresses]})
    if next(x for x in instructions['Script_Game:100628c0'] if x['address'] == '10062b1d')['bytes'] != '8d3c80':
        raise ValueError('The audited installed-build XP instruction changed')
    evidence = {'version': 1,
                'scope': 'verified bounded combat kernel; Hero XP bridge and Ardea browser fist arithmetic; source Outlaw death disposition for three Jack bandits',
                'ordinaryPlayIntegration': {'giveXP': 'XP and one threshold-crossing level/LP update; no live NPC activation',
                                           'combatActions': 'browser contact/static standing fist arithmetic for 15 source-pinned Raiders and three Jack bandits; native tasks, AI and defeat XP remain unintegrated',
                                           'zeroHitPointsDisposition': 'Jack bandits resolve kill through GetAttitude Outlaw4; Raider directed attitudes remain unresolved'},
                'nativeCodeExecuted': False, 'installedBuildHashesPinned': True,
                'originalInputs': inputs, 'entries': receipts,
                'constants': constants, 'registrations': regs, 'rules': RULES,
                'instructionProofs': instruction_proofs, 'excerptLineEndings': 'LF',
                'audit': {'allInstructionBytesMatch': True, 'entryCount': len(receipts),
                          'instructionRecords': sum(x['instructionRecords'] for x in receipts),
                          'instructionBytes': sum(x['instructionBytes'] for x in receipts)},
                'limitations': ['The Hero GiveXP bridge handles XP and one level/LP update per crossing using the retained NPC property set; the NPC property set is not attached to the live entity, and the level-up visual effect and native combat tasks are not integrated.',
                                'External contact, eligibility, skills, initialization and directional attitudes must be resolved with provenance.',
                                'Only selected standing humanoid Hero Impact/Blade/fist/single1H math and ordered state plans are implemented.',
                                'AI/contact/native task execution/impact effects/ragdolls/statuses/spells/projectiles/full inventory/equipment are not implemented.',
                                'Finite integer profile rejects exceptional conversion and derived-state overflow; damage amount <=0xffffff guarantees an exact binary64 product with binary32 multiplier.',
                                'Signed32 protection multiplication deliberately retains native wrap; this is not a generic percent reduction.',
                                'No arithmetic hit chance is invented.']}
    save_json(assets / 'native-source-evidence.json', evidence)
    # Public metadata is portable. Exact native excerpts stay in the repository's
    # research assets, and their paths below are explicitly relative to that root.
    save_json(public / 'native-combat-evidence.json', {**evidence, 'excerptRoot': 'assets/gothic3/combat'})
    save_json(public / 'native-action-labels.json', actions)
    module_text = (repo / 'src/gothic3/combat.ts').read_text(encoding='utf8')
    source_ids = set(re.findall(r"'(?:Script_Game|Game|Script|Engine):[0-9a-f]{8}'", module_text))
    missing = {x[1:-1] for x in source_ids} - {x['id'] for x in receipts}
    if missing:
        raise ValueError(f'Kernel references missing receipts: {sorted(missing)}')
    output_files = []
    for base in [assets, public]:
        for path in sorted(base.rglob('*')):
            if path.is_file() and path.name != 'manifest.json':
                output_files.append({'path': path.relative_to(repo).as_posix(), 'bytes': path.stat().st_size, 'sha256': sha(path)})
    manifest = {'version': 1, 'scope': evidence['scope'], 'ordinaryPlayIntegrated': False,
                'ordinaryPlayIntegration': evidence['ordinaryPlayIntegration'],
                'kernel': {'path': 'src/gothic3/combat.ts', 'sha256': sha(repo / 'src/gothic3/combat.ts')},
                'generator': {'path': 'tools/gothic3/research_native_combat.py', 'sha256': sha(Path(__file__))},
                'originalInputs': inputs, 'audit': evidence['audit'],
                'evidence': 'native-combat-evidence.json', 'actionLabels': 'native-action-labels.json',
                'outputs': output_files}
    save_json(public / 'manifest.json', manifest)
    print(json.dumps({'manifest': 'public/gothic3/combat/manifest.json', **evidence['audit'],
                      'actionLabels': len(actions['labels']), 'outputs': len(output_files), 'manifestSha256': sha(public / 'manifest.json')}))


if __name__ == '__main__':
    main()
