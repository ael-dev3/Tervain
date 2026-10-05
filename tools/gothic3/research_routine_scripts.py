"""Offline installed Script_Game routine/registration receipts (Python3.10+).

python -B tools/gothic3/research_routine_scripts.py --study <LOCAL_DESKTOP_STUDY>
Only routine-scripts namespaces are generated. No game/native DLL execution.
Typecheck/build, if separately requested, are not performed by this producer.
"""
from __future__ import annotations
import argparse
import csv
import json
import re
import struct
from pathlib import Path
from research_native_clock import collect
from research_native_combat import PE, cblocks, save_json, sha
from research_spu_instructions import zero_fill

ROOT = Path(__file__).resolve().parents[2]
SHA = '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1'
OLD_ROUTINE_SHA = '75c0634238479619096ac1b400f2ddd36e26d43ca0c740f8ac3718f9e8ad2c38'
LABELS = {
    'ZS_Attack_Wait': {'mask': '102211e8', 'counter': '102211e4', 'labels': ['102211e0', '102211dc']},
    'ZS_StandUp': {'mask': '102236e4', 'counter': '102236e0', 'labels': ['102236dc', '102236d8']},
    '_AI_ChangeAction': {'mask': '1022193c', 'counter': '10221938', 'labels': ['10221934', '10221930']},
    '_AI_StandUp': {'mask': '10221ebc', 'counter': '10221eb8', 'labels': ['10221eb4']},
    '_AI_TransferItem': {'mask': '10221f08', 'counter': '10221f04', 'labels': ['10221f00']},
    '_AI_HoldInventoryItems': {'mask': '10221c64', 'counter': '10221c60', 'labels': ['10221c5c', '10221c58', '10221c54']},
    'PS_Normal': {'mask': '10222ad4', 'counter': '10222ad0', 'labels': ['10222acc', '10222ac8', '10222ac4', '10222ac0']},
}
SUPPORTED = {'ZS_Attack_Wait': '10020310', 'ZS_StandUp': '100c8640',
             '_AI_ChangeAction': '100497d0', '_AI_StandUp': '1005f140',
             '_AI_TransferItem': '1005f9d0', '_AI_HoldInventoryItems': '100583f0', 'PS_Normal': '1009ad30'}
SELECTION = ('100c8100 100a13b0 100c8640 100c8850 100c8d10 '
             '10019910 100194c0 100183e0 100459e0 100c7f80 100cacf0 '
             '1006ed30 1001df40 100c9520 100cccb0 100cc390 '
             '10031280 1000c160 1000c010 1000bf60 1000ecc0 10009520 10009650 '
             '1009ad30 100497d0 1001d9e0 1001d8b0 1001cd70 1001d550 '
             '10020310 1005f140 100583f0 100496d0 1007d2a0 1007d060 '
             '1000e380 10108250 10016160 10009800 10009810 1000bfa0 100098e0 10009910 '
             '10009890 1005f9d0 1000bae0 10009580 10009600 100096e0 100c9560 '
             '1004a7d0 1001de70 1001de30 10053c90 10053b90 10053bd0 '
             '10017a50 1001db60 1001da70 1004aa50 100a12c0')
REGISTRATION = re.compile(r'bCString::bCString\(local_4,"([^"\n]+)"\);\s*'
                          r'bCString::bCString\(local_8,"([^"\n]+)"\);\s*'
                          r'(thunk_FUN_100[0-9a-f]+)\(local_8,(?:thunk_FUN_|&LAB_)([0-9a-f]{8}),local_4\);')
ENTITY_METHODS = '1000411a 1000358f 10004b8d 100050b5 1000452f 100010eb 1002ec00'
PS_ATTACH_METHODS = ('1002c9f0 100133d0 10012c00 10015780 100178c0 100190a0 10018390 '
    '100196b0 1001bd10 1001c100 1001e530 100200b0 10028550 1002c700 10011200 '
    '10011bb0 10014670 10013d10 1002e510 100149a0 10026f50 1000f200 1001bf80 '
    '10010aa0 1001de80 1002c090 1002ada0 1002b560 1002e230 10024c40 10015be0 '
    '1001c570 1002dcc0 10010be0 100160c0 100107d0 1000dc00 1000fe60 1001df90 '
    '1002ea00 1002e700')

def cstring(pe: PE, va: int):
    raw = bytearray()
    for i in range(4096):
        value = pe.at(va + i, 1)[0]
        if value == 0:
            return raw.decode('cp1252'), (raw + b'\0').hex()
        raw.append(value)
    raise ValueError('Unterminated original registration string')

def jump_target(pe: PE, address: int):
    trail = []
    for _ in range(8):
        raw = pe.at(address, 5)
        if raw[0] != 0xe9:
            return address, trail
        target = address + 5 + struct.unpack_from('<i', raw, 1)[0]
        trail.append({'address': f'{address:08x}', 'bytes': raw.hex(), 'target': f'{target:08x}'})
        address = target
    raise ValueError('Excessive native registration jump chain')

def fight_table(instructions):
    """Recover literal triples from checked x86 stores, tracking PUSH/RET ESP."""
    registers = {'EDI': 0}
    esp, local, stores, ordered, last_push = 0, {}, {}, [], None
    for row in instructions['Script_Game:1000e380']:
        address, text = int(row['address'], 16), row['assembly']
        if not 0x1000e3b4 <= address <= 0x1000eaa9:
            continue
        if match := re.fullmatch(r'LEA (E[A-Z]{2}),\[ESP \+ (0x[0-9a-f]+)\]', text):
            registers[match[1]] = ('stack', esp + int(match[2], 16))
        elif match := re.fullmatch(r'MOV (E[A-Z]{2}),(0x[0-9a-f]+|E[A-Z]{2})', text):
            registers[match[1]] = int(match[2], 16) if match[2].startswith('0x') else registers.get(match[2])
        elif match := re.fullmatch(r'PUSH (E[A-Z]{2})', text):
            last_push = registers.get(match[1]); esp -= 4
        elif match := re.fullmatch(r'MOV dword ptr \[ESP \+ (0x[0-9a-f]+)\],(0x[0-9a-f]+|E[A-Z]{2})', text):
            offset = esp + int(match[1], 16)
            value = int(match[2], 16) if match[2].startswith('0x') else registers.get(match[2])
            if offset in (16, 20, 24):
                if not isinstance(value, int): raise ValueError('Unresolved native table literal')
                local[offset], stores[offset] = value, row
        elif text == 'CALL 0x10001267':
            if last_push != ('stack', 16): raise ValueError('Original append pointer differs')
            ordered.append({'ordinal': len(ordered), 'triple': [local[16], local[20], local[24]],
                            'call': row, 'literalStores': [stores[k] for k in (16, 20, 24)]})
            esp += 4
            for register in ('EAX', 'ECX', 'EDX'): registers.pop(register, None)
    if esp != 0 or len(ordered) != 63 or ordered[0]['triple'] != [0, 0, 2] or ordered[-1]['triple'] != [0, 0, 8]:
        raise ValueError('Ordered original weapon-selection constructor differs')
    return ordered

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    study = args.study.resolve()
    out, public = ROOT/'assets/gothic3/routine-scripts', ROOT/'public/gothic3/routine-scripts'
    out.mkdir(parents=True, exist_ok=True); public.mkdir(parents=True, exist_ok=True)
    path = study/'00_Original_Runtime/scripts/Script_Game.dll'
    if sha(path) != SHA:
        raise ValueError('Unsupported original Script_Game PE')
    pe = PE(path)
    module = study/'01_Decompiled_Code/scripts__Script_Game_dll'
    rows = {r['address']: r for r in csv.DictReader((module/'functions.csv').open(encoding='utf-8-sig', newline=''))}
    registrations = []
    for source in sorted((module/'pseudocode').glob('*.c')):
        for initializer, block, line in cblocks(source):
            for match in REGISTRATION.finditer(block):
                helper, entry = match[3].removeprefix('thunk_FUN_'), match[4]
                name, label = match[2], match[1].replace('\\\\', '\\')
                raw = pe.at(int(entry, 16), 5)
                target = f'{int(entry, 16)+5+struct.unpack_from("<i", raw, 1)[0]:08x}' if raw[0] == 0xe9 else entry
                kind = {'10017a50': 'script', '100a12c0': 'routine', '1001db60': 'state', '1004aa50': 'function', '1001da70': 'callback'}.get(helper)
                if not kind:
                    raise ValueError('Unknown registration-helper kind: ' + helper)
                registrations.append({'name': name, 'kind': kind, 'originalSourceLabel': label,
                    'initializer': initializer, 'helper': helper, 'entry': entry, 'body': target,
                    'entryBytes': raw.hex(), 'decompiledPath': 'pseudocode/'+source.name,
                    'decompiledLine': line + block[:match.start()].count('\n'), 'decompiledSha256': sha(source)})
    selected = set(SELECTION.split()) | {r['initializer'] for r in registrations}
    funcs, instructions = collect(study, 'Script_Game', 'scripts__Script_Game_dll', ' '.join(sorted(selected)), pe, out)
    by_entry = {f['entry']: f for f in funcs}
    for record in registrations:
        records = instructions['Script_Game:'+record['initializer']]
        pushes = []
        for row in records:
            m = re.fullmatch(r'PUSH 0x([0-9a-f]+)', row['assembly'])
            if m:
                pushes.append((int(m[1], 16), row))
        names = []
        for address, row in pushes:
            if address < 0x10200000 or address >= 0x102239d8:
                continue
            text, raw = cstring(pe, address)
            if text in [record['name'], record['originalSourceLabel']]:
                names.append({'address': f'{address:08x}', 'text': text, 'bytes': raw, 'push': row})
        if sorted(r['text'] for r in names) != sorted([record['name'], record['originalSourceLabel']]):
            raise ValueError('Original registration string PUSH mismatch: '+record['name'])
        # Ghidra C often prints canonical thunk_FUN_<body>, while the original
        # initializer PUSHes a distinct incremental-link JMP trampoline.
        pointer = [(address, row) for address, row in pushes if 0x10001000 <= address < 0x10200000
                   and jump_target(pe, address)[0] == int(record['body'], 16)]
        if len(pointer) != 1:
            raise ValueError('Original registration callback PUSH mismatch: '+record['name'])
        actual, push = pointer[0]
        record['decompiledPointerLabel'] = record['entry']
        record['entry'] = f'{actual:08x}'
        record['entryBytes'] = pe.at(actual, 5).hex()
        record['entryJumpChain'] = jump_target(pe, actual)[1]
        record['registrationEvidence'] = {'function': 'Script_Game:'+record['initializer'],
                                           'strings': names, 'pointerPush': push}
    save_json(out/'registrations.json', {'schema': 'gothic3-native-routine-registrations-v1',
              'inputSha256': SHA, 'records': registrations, 'membership': '857 exact installed compiler registration initializers; all groups, not only implemented bodies'})
    globals_receipts = []
    for group in LABELS.values():
        for address in [group['mask'], group['counter'], *group['labels']]:
            try:
                raw = pe.at(int(address, 16), 4)
                if raw != b'\0'*4: raise ValueError('Static label loader seed differs: '+address)
                globals_receipts.append({'address': address, 'bytes': raw.hex(), 'loaderSigned32': 0})
            except ValueError as error:
                if str(error).startswith('Static label'): raise
                globals_receipts.append(zero_fill(pe, int(address, 16), 4))
    ordered = fight_table(instructions)
    save_json(out/'weapon-selection-table.json', {'schema': 'gothic3-original-weapon-selection-v1',
        'source': 'Script_Game:1000e380', 'constructor': '10108250', 'global': '102203e4',
        'lookup': '1000bf60', 'ordered': ordered, 'firstMatchWins': True,
        'initialSelection': [-1, -1, -1], 'scope': 'Source constructor state, not a captured native session'})
    inputs = {'Script_Game': {'studyPath': '00_Original_Runtime/scripts/Script_Game.dll', 'sha256': SHA, 'bytes': path.stat().st_size}}
    for short, folder, relative, expected, selection in [
        ('Script', 'Script_dll', '00_Original_Runtime/Script.dll',
         '9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08',
         '10003332 10004994 10004b42 10001bd1 100036cf 100010e6 10004a75 1000287e 10002752 1000187a 100040c5 100028c4 10002b67 10004b1a 100012c6 '+ENTITY_METHODS+' '+PS_ATTACH_METHODS),
        ('Game', 'Game_dll', '00_Original_Runtime/Game.dll',
         'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f',
         '2002c04d 2001ab90 20029be0 20031b06 201cf550 20010f87')]:
        binary = study/relative
        if sha(binary) != expected: raise ValueError('Unsupported '+short+' input')
        inputs[short] = {'studyPath': relative, 'sha256': expected, 'bytes': binary.stat().st_size}
        additional, records = collect(study, short, folder, selection, PE(binary), out)
        funcs.extend(additional); instructions.update(records)
    no_calls = ['1002eca0', '1002ede0', '1002ee50', '1002ec00', *PS_ATTACH_METHODS.split()]
    for entry in no_calls:
        if any(re.match(r'(CALL|JMP)\b', r['assembly']) for r in instructions['Script:'+entry]):
            raise ValueError('Nonowning Script wrapper no-call proof differs: '+entry)
    if [r['assembly'] for r in instructions['Script:1002ede0']] != ['RET']:
        raise ValueError('Script Entity destructor is no longer a plain RET')
    evidence = {'schema': 'gothic3-routine-scripts-evidence-v1',
        'inputs': inputs,
        'functions': funcs, 'instructions': instructions, 'globals': globals_receipts,
        'executedNativeCode': False, 'testsRun': False,
        'audit': {'functions': len(funcs), 'instructions': sum(map(len, instructions.values())),
                  'instructionBytes': sum(len(bytes.fromhex(i['bytes'])) for group in instructions.values() for i in group),
                  'allInstructionsMatchOriginalPE': True, 'registrationCount': len(registrations)}}
    save_json(out/'native-evidence.json', evidence)
    rules = {'schema': 'gothic3-routine-scripts-rules-v1', 'scriptGameSha256': SHA,
             'labels': LABELS, 'supportedBodies': SUPPORTED, 'fightPairs': [r['triple'] for r in ordered],
             'routine': {'Rtn_Player': '100a13b0'}, 'scripts': {'ContinueRoutine': '100c8100'},
             'frameStack': {'add': '1001d9e0', 'setCount': '1001d8b0', 'initialize': '1001cd70', 'destroy': '1001d550',
                            'stride': 24, 'capacityGrowth': 'requested + clamp(signed capacity>>3,4,1024)',
                            'spareSlotIsReinitializedByAdd': False, 'browserAllocationProfileMaximumSlots': 65536,
                            'allocationProfile': 'Finite successful-moving Realloc. Native in-place/failure outcomes are not modeled.'},
             'entityWrappers': {'bytes': 168, 'copyDwords': 42, 'ownsReferences': False,
                 'copy': 'Script:1002eca0', 'assignmentCopyFrom': 'Script:1002ee50',
                 'destructor': 'Script:1002ede0', 'attachTo': 'Script:100307d0',
                 'capturedPSPointersRemainShared': True, 'noCallsProved': no_calls},
             'argumentAllocationProfile': 'Captured args must remain registered and undestroyed for every field access and function return; callback deletion blocks with its prefix.',
             'branchProfiles': {'Rtn_Player': 'Scalar writes and ordered ResetAll calls/task selection; engine dependencies must be supplied.',
                 'ContinueRoutine': 'Navigation/application/attitude gates and Dead/StandUp task branches; normal tail stops after proven ResetAll prefix.',
                 'ZS_Attack_Wait': 'Complete Action47, WAIT100ms, SetState ZS_Attack_Loop; next state is not implemented here.',
                 '_AI_ChangeAction': 'Complete no-animation/no-ground-bias paths, including actual initial Action24 ->0.',
                 '_AI_StandUp': 'Complete AIMode0/AniState2 path; other animation/reset branches unsupported.',
                 'ZS_StandUp': 'Real function frame/destruction and AIMode0/ContinueRoutine continuation under supported function profile.',
                 '_AI_TransferItem': 'Complete initial index-1 path; item/slot/animation branches unsupported.',
                 '_AI_HoldInventoryItems': 'Complete initialized desired-1/-1 and empty-slot1/2 path through two actual TransferItem frames.',
                 'PS_Normal': 'Source initial Action24/AniState2/Species0, desired-1/-1, empty held slots, no triggered tutorial, destinationNone path; concrete engine host operations required.'},
             'unsupported': ['Full normal ContinueRoutine enclave/HP/routine/party tail.',
                 'ResetAll frozen/effect/species branch and native engine operations without concrete host implementations.',
                 'PS_Normal_Loop and other player/AI registered states not yet ported; Normal unsupported branches remain explicit.',
                 'AI_ChangeAction PlayAni/ground-bias branches, AI_StandUp reset/animation branches.',
                 'Native allocator failure/in-place Realloc outcomes and unrestricted native memory addresses.',
                 'Unimplemented native Entity PS discovery outside explicitly supplied captured wrappers.']}
    save_json(out/'runtime-rules.json', rules); save_json(public/'native-routine-scripts.json', rules)
    seed_path = ROOT/'public/gothic3/startup/native-startup.json'
    startup = json.loads(seed_path.read_text(encoding='utf8'))
    save_json(out/'startup-input-receipt.json', {'source': 'public/gothic3/startup/native-startup.json',
        'sha256': sha(seed_path), 'bytes': seed_path.stat().st_size,
        'scope': 'Original source routine input objects; not a claim that every startup callback has run.',
        'entities': startup['entities']})
    outputs = []
    for p in sorted(public.rglob('*')):
        if p.is_file() and p.name != 'manifest.json':
            outputs.append({'path': p.relative_to(public).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)})
    save_json(public/'manifest.json', {'schema': 'gothic3-routine-scripts-manifest-v1', 'inputSha256': SHA,
                                     'outputs': outputs, 'implementedAllRegisteredBodies': False})
    required = [ROOT/'src/gothic3/routine-scripts.ts', ROOT/'src/gothic3/script-routine.ts', Path(__file__),
                ROOT/'tools/gothic3/research_native_clock.py', ROOT/'tools/gothic3/research_native_combat.py']
    required.append(ROOT/'tools/gothic3/research_spu_instructions.py')
    files = required + [p for d in [out, public] for p in d.rglob('*') if p.is_file() and p.name != 'implementation-receipt.json']
    files = sorted(set(files))
    records = [{'path': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)} for p in files]
    save_json(out/'implementation-receipt.json', {'schema': 'gothic3-routine-scripts-implementation-receipt-v1',
        'files': records, 'filesCount': len(records), 'totalBytes': sum(r['bytes'] for r in records),
        'selfExcluded': True, 'originalInputs': evidence['inputs'], 'originalInstructionAudit': evidence['audit'],
        'intentionalSharedFileChange': {'path': 'src/gothic3/script-routine.ts', 'previousCheckpoint': '2637d1e',
            'previousSha256': OLD_ROUTINE_SHA, 'currentSha256': sha(ROOT/'src/gothic3/script-routine.ts'),
            'scope': 'Validated scoped Add/SetCount frame push; preserve unused-slot values, native growth/default initialization and live journal.'},
        'historicalReceiptsUntouched': ['assets/gothic3/instructions/implementation-receipt.json', 'assets/gothic3/dispatch-checkpoint.json'],
        'reproduce': 'python -B tools/gothic3/research_routine_scripts.py --study <LOCAL_DESKTOP_STUDY>',
        'nativeExecution': False, 'testsRun': False, 'typecheckExecutedByProducer': False, 'buildExecutedByProducer': False})
    print(json.dumps({'registrations': len(registrations), **evidence['audit'], 'receiptFiles': len(records)}))

if __name__ == '__main__':
    main()
