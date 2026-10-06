"""Offline original Hero loop/input receipts. Python3.10+, standard library.

python -B tools/gothic3/research_player_state.py --study <LOCAL_DESKTOP_STUDY>
Only player-state namespaces are generated; Gothic3 DLLs are never loaded.
The missing PS_Normal_Loop C body is recovered as an explicit ASM/PE range.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import struct
from pathlib import Path
from research_native_clock import collect
from research_native_combat import PE, INSTRUCTION, audit_assembly, cblocks, save_json, sha
from research_native_inventory import native_imports, native_exports
from research_routine_scripts import REGISTRATION, cstring, jump_target
from research_spu_instructions import zero_fill

ROOT = Path(__file__).resolve().parents[2]
SHA = '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1'
OLD_ROUTINE = '9bb9012061ea0d0557d64c385fbdfcfcc6bd3a5e686a4a82160da6f75f777930'
SELECTED = ('10012460 1000cf80 1000d6f0 10015cc0 100150d0 '
            '1000d3f0 1000dde0 10009520 100094e0 1000c160 '
            '1009ac30 100787d0 10078ed0 1001b0c0 10027960 10084910 '
            '100800e0 100414a0 1000ec30 10015a70 100158a0 100162a0 '
            '10015b10 10154d90')
SELECTED += (' 1009b950 10059d80 1007d000 1007e0b0 100108d0 '
             '10078460 100785c0 100786e0 10009420 10009480 1000eda0 1000ed50 '
             '101082d0 10046590 1000c4d0 10046af0 100467f0 100d0470 '
             '100015e1 10077710 10077fb0 10079500 10077630 10129840 10129a70 1000ecc0')
LABELS = {
    'PS_Normal_Loop': {'mask': '10222ab0', 'counter': '10222aac', 'labels': ['10222aa8']},
    'PS_Normal_Sneak': {'mask': '10222abc', 'counter': '10222ab8', 'labels': ['10222ab4']},
    'PS_Normal_Jump': {'mask': '10222af8', 'counter': '10222af4', 'labels': ['10222af0', '10222aec']},
    '_AI_Jump': {'mask': '10221ca4', 'counter': '10221ca0', 'labels': ['10221c9c', '10221c98', '10221c94']},
}

def source_registrations(study, pe):
    """Use C only to locate initializers; checked ASM PUSHes prove names/pointers."""
    wanted = {'PS_Normal_Loop', 'PS_Normal_Sneak', 'PS_Normal_Jump', '_AI_Jump',
        'OnPlayerMovement', 'OnPlayerWalk', 'OnPlayerSneak', 'OnPlayerJump', 'OnPlayerAction',
        'GetStaminaPoints', 'AddStaminaPoints', 'SetStaminaPoints', 'OnInit'}
    result = []
    base = study/'01_Decompiled_Code/scripts__Script_Game_dll'
    for source in sorted((base/'pseudocode').glob('*.c')):
        for initializer, block, line in cblocks(source):
            for match in REGISTRATION.finditer(block):
                if match[2] not in wanted: continue
                helper, entry = match[3].removeprefix('thunk_FUN_'), match[4]
                body, _ = jump_target(pe, int(entry, 16))
                result.append({'name': match[2], 'sourceLabel': match[1].replace('\\\\', '\\'),
                    'kind': {'10017a50': 'script', '100a12c0': 'routine', '1001db60': 'state',
                             '1004aa50': 'function', '1001da70': 'callback'}[helper],
                    'initializer': initializer, 'helper': helper, 'body': f'{body:08x}',
                    'cLocatorPath': source.relative_to(study).as_posix(), 'cLocatorLine': line+block[:match.start()].count('\n'),
                    'cLocatorSha256': sha(source)})
    if len(result) != len(wanted) or {r['name'] for r in result} != wanted:
        raise ValueError('Original player registration membership differs')
    return result

def pin_registrations(records, pe, instructions):
    for record in records:
        rows = instructions['Script_Game:'+record['initializer']]
        pushes = [(int(m[1],16), row) for row in rows
                  if (m := re.fullmatch(r'PUSH 0x([0-9a-f]+)', row['assembly']))]
        names = []
        for address, row in pushes:
            if not 0x10200000 <= address < 0x102239d8: continue
            text, raw = cstring(pe, address)
            if text in [record['name'], record['sourceLabel']]:
                names.append({'address': f'{address:08x}', 'text': text, 'bytes': raw, 'push': row})
        pointers = [(address, row) for address, row in pushes if 0x10001000 <= address < 0x10200000
                    and jump_target(pe, address)[0] == int(record['body'],16)]
        if len(pointers) != 1 or sorted(n['text'] for n in names) != sorted([record['name'], record['sourceLabel']]):
            raise ValueError('Original player registration PUSH proof differs: '+record['name'])
        address, row = pointers[0]
        record.update(entry=f'{address:08x}', entryJumpChain=jump_target(pe,address)[1],
                      pointerPush=row, strings=names)
    return records

def literal(pe, name, address, length):
    raw = pe.at(address,length)
    return {'name': name, 'address': f'{address:08x}', 'bytes': raw.hex(),
            'byteCount': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

def default_keys(pe, rows):
    """Exact installed conditional default key table; offsets are native device IDs."""
    mappings, current, device = [], None, None
    for i, row in enumerate(rows):
        text = row['assembly']
        if match := re.fullmatch(r'MOV word ptr \[ESP \+ 0x3c\],(0x[0-9a-f]+)', text):
            current = {'sessionKey': int(match[1],16), 'keyIdInstruction': row, 'physicalKeys': []}
            mappings.append(current)
            labels = []
            for previous in rows[max(0,i-16):i]:
                push = re.fullmatch(r'PUSH (0x[0-9a-f]+)',previous['assembly'])
                if not push: continue
                address = int(push[1],16)
                try:
                    raw = bytearray()
                    while (word := pe.at(address+len(raw),2)) != b'\0\0':
                        raw.extend(word)
                        if len(raw)>180: raise ValueError('Long nonlabel candidate')
                    label = raw.decode('utf-16le')
                    if len(label)>2: labels.append((address,label,len(raw)+2))
                except (ValueError, UnicodeError): pass
            if not labels: raise ValueError('Original default-key label unresolved')
            address,label,length = labels[-1]
            current.update(nativeLabel=label, labelEvidence=literal(pe,'UTF16 literal',address,length))
        if re.fullmatch(r'MOV dword ptr \[(?:EAX|ESI) \+ 0x10\],EBX',text): device=0
        if re.fullmatch(r'MOV dword ptr \[(?:EAX|ESI) \+ 0x10\],0x1',text): device=1
        match = re.fullmatch(r'MOV dword ptr \[EAX\],(0x[0-9a-f]+)',text)
        if match and current and int(match[1],16)<0x1000:
            if device not in (0,1): raise ValueError('Default-key device unresolved')
            current['physicalKeys'].append({'offset': int(match[1],16), 'device': device,
                'deviceMeaning': ['keyboard','mouse'][device], 'offsetStoreInstruction': row})
    if len(mappings)!=42 or len({r['sessionKey'] for r in mappings})!=42:
        raise ValueError('Original42 default session keys differ')
    return mappings

def missing_loop(study, pe, out):
    path = study/'01_Decompiled_Code/scripts__Script_Game_dll/full_disassembly.asm'
    rows, first = [], None
    with path.open(encoding='utf8') as file:
        for number, line in enumerate(file, 1):
            match = INSTRUCTION.match(line)
            if match and 0x1009a660 <= int(match[1], 16) <= 0x1009aba2:
                first = first or number
                rows.append(line)
    text = ''.join(rows)
    ins = audit_assembly(text, pe)
    raw = pe.at(0x1009a660, 0x1009aba3-0x1009a660)
    gaps = []
    for left, right in zip(ins, ins[1:]):
        start = int(left['address'], 16) + len(bytes.fromhex(left['bytes']))
        end = int(right['address'], 16)
        if start != end:
            gaps.append({'address': f'{start:08x}', 'bytes': pe.at(start, end-start).hex()})
    if gaps != [{'address': '1009aac9', 'bytes': pe.at(0x1009aac9, 7).hex()}]:
        raise ValueError('Unexpected missing/gapped original loop instructions')
    if ins[-1]['address'] != '1009aba0' or ins[-1]['bytes'] != 'c20800':
        raise ValueError('Original loop RET boundary differs')
    dest = out/'sources/Script_Game/1009a660.asm.txt'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text, encoding='utf8', newline='\n')
    return {'id': 'Script_Game:1009a660', 'entry': '1009a660', 'name': 'PS_Normal_Loop',
        'catalogStatus': 'absent from functions.csv; no decompiled C claim',
        'assemblyExcerpt': dest.relative_to(out).as_posix(), 'assemblyExcerptSha256': sha(dest),
        'studyAssemblyLine': first, 'studyAssemblySha256': sha(path),
        'bodyRanges': '1009a660-1009aba2', 'bodyBytes': len(raw),
        'bodySha256': hashlib.sha256(raw).hexdigest(), 'instructionCount': len(ins),
        'instructionBytes': sum(len(bytes.fromhex(r['bytes'])) for r in ins),
        'unreachableAlignmentBytes': gaps,
        'allInstructionBytesMatchOriginalPE': True}, ins

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--study', type=Path, required=True)
    args = ap.parse_args()
    study = args.study.resolve()
    out, public = ROOT/'assets/gothic3/player-state', ROOT/'public/gothic3/player-state'
    out.mkdir(parents=True, exist_ok=True); public.mkdir(parents=True, exist_ok=True)
    binary = study/'00_Original_Runtime/scripts/Script_Game.dll'
    if sha(binary) != SHA: raise ValueError('Unsupported original Script_Game PE')
    pe = PE(binary)
    registrations = source_registrations(study, pe)
    # This catalog has a trampoline but no canonical C/body entry for the loop.
    selected = set(SELECTED.split()) | {r['initializer'] for r in registrations}
    selected |= {r['helper'] for r in registrations}
    funcs, instructions = collect(study, 'Script_Game', 'scripts__Script_Game_dll', ' '.join(sorted(selected)), pe, out)
    loop, loop_ins = missing_loop(study, pe, out)
    funcs.append(loop); instructions['Script_Game:1009a660'] = loop_ins
    pin_registrations(registrations,pe,instructions)
    loop_registration = next(r for r in registrations if r['name']=='PS_Normal_Loop')
    if loop_registration['entry']!='10001d16' or loop_registration['body']!='1009a660':
        raise ValueError('Original loop registration trampoline differs')
    tables = []
    for name, va, length in [('signalTargets', 0x1009aba4, 56), ('signalMap', 0x1009abdc, 84)]:
        tables.append(literal(pe,name,va,length))
    for name,va,length in [('firstGameKeyTargets',0x10079878,16),('firstGameKeyMap',0x10079888,16),
        ('pressedGameKeyTargets',0x10079898,64),('pressedGameKeyMap',0x100798d8,32),
        ('jumpArgumentVtable',0x1020f3b4,8),('staminaCostTargets',0x1000c5ac,16),
        ('staminaCostAction1Through54Map',0x1000c5bc,54),('quickUseTargets',0x1007949c,20),
        ('quickUseUseType2Through52Map',0x100794b0,51)]: tables.append(literal(pe,name,va,length))
    quick_targets = struct.unpack('<5I',pe.at(0x1007949c,20))
    quick_nondefault = [n+2 for n,index in enumerate(pe.at(0x100794b0,51)) if quick_targets[index]!=0x10079473]
    if quick_nondefault != [2,3,4,5,6,7,8,9,12,15,16,17,18,19,20,21,22,23,24,32,44,51,52]:
        raise ValueError('Installed quick-use nondefault table differs')
    targets = struct.unpack('<14I', pe.at(0x1009aba4, 56))
    mapping = pe.at(0x1009abdc, 84)
    signals = [{'signal': n+54, 'tableIndex': index, 'target': f'{targets[index]:08x}'}
               for n, index in enumerate(mapping)]
    imports = native_imports(pe)
    used = sorted({int(m[1],16) for records in instructions.values() for row in records
                   if (m := re.search(r'(?:CALL |MOV [A-Z]+,)(?:dword ptr )?\[0x([0-9a-f]+)\]', row['assembly']))
                  } & imports.keys())
    imp = [{'iat': f'{va:08x}', **imports[va]} for va in used]
    strings = []
    for va in [0x10211424, 0x10211410, 0x102113fc, 0x102113e8, 0x1020ee6c]:
        text, raw = cstring(pe, va)
        strings.append({'address': f'{va:08x}', 'text': text, 'bytes': raw})
    modules = [dict(path='00_Original_Runtime/scripts/Script_Game.dll', bytes=binary.stat().st_size, sha256=SHA)]
    script_pe = PE(study/'00_Original_Runtime/Script.dll')
    game_pe = PE(study/'00_Original_Runtime/Game.dll')
    if sha(study/'00_Original_Runtime/Script.dll') != '9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08' or sha(study/'00_Original_Runtime/Game.dll') != 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f':
        raise ValueError('Unsupported Script/Game source PE')
    dispatch = []
    for name, source_pe, slots, manual in [
        ('Script', script_pe, [0x102268d0, 0x10226a30, 0x1022673c, 0x10226600, 0x10226668,
          0x10226c90, 0x10226540, 0x10226c10, 0x10226ab4, 0x10226574, 0x10226634, 0x102266b0,
          0x102267fc,0x10226b10,0x10226808,0x10226528,0x102264fc,0x10226514,
          0x10226584,0x10226538,0x10226580,0x10226f90],
          '10011d00 10011fa0 10011fd0 10020400 10011f30 10011f70 1002f240'),
        ('Game', game_pe, [0x10226310,0x10226318,0x10226314], '20221a70 20221cd0 20221dc0 20221df0 20221ea0 202182e0 20286340 '
         '2013bf10 2013b0a0 2004c360 2022c810 202223f0 202f90b0 201cf760 201ae310 '
         '20394560 20390ed0 20218ea0 202191c0 20218be0 20218c80 2034dc70 20371e40 2038cc90 20380b80 20380b60 20022705 '
         '2001313d 20050d20 20051710 2034cea0 200141c3 20353460')]:
        exports = native_exports(source_pe)
        selected = set(manual.split())
        for slot in slots:
            entry = exports[imports[slot]['decoratedName']]
            selected.add(f'{entry:08x}')
            target, trail = jump_target(source_pe, entry)
            dispatch.append({'slot': f'{slot:08x}', 'library': name+'.dll', 'name': imports[slot]['decoratedName'],
                             'entry': f'{entry:08x}', 'body': f'{target:08x}', 'jumpTrail': trail})
        more, more_ins = collect(study, name, name+'_dll', ' '.join(sorted(selected)), source_pe, out)
        funcs += more; instructions.update(more_ins)
        source_binary = study/('00_Original_Runtime/'+name+'.dll')
        modules.append({'path': '00_Original_Runtime/'+name+'.dll', 'bytes': source_binary.stat().st_size, 'sha256': sha(source_binary)})
    for name,va,length in [('CanJumpTrueFalseTargets',0x20222414,8),('CanJumpMode1Through14Map',0x2022241c,14),
        ('GameAppSlot270',0x2065761c+0x270,4)]:
        tables.append({'module':'Game',**literal(game_pe,name,va,length)})
    if game_pe.at(0x2065761c+0x270,4)!=struct.pack('<I',0x20002ecd):
        raise ValueError('Original GameApp270 target differs')
    default_mapping = default_keys(game_pe,instructions['Game:20390ed0'])
    configs = [{'path':p.relative_to(study).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
        for name in ['controls.ini','ge3.ini','keyboard_and_console.txt']
        for p in sorted((study/'03_Configuration_and_Docs').rglob(name))]
    if len(configs)!=3: raise ValueError('Original input configuration receipt membership differs')
    loader = []
    for group in LABELS.values():
        for address in [group['mask'], group['counter'], *group['labels']]:
            loader.append(zero_fill(pe, int(address, 16), 4))
    rules = {'schema': 'gothic3-player-state-rules-v1', 'scriptGameSha256': SHA,
        'bodies': {'PS_Normal_Loop': '1009a660', 'PS_Normal_Sneak': '1009ac30',
                   'PS_Normal_Jump': '1009b950', '_AI_Jump': '10059d80'},
        'labels': LABELS, 'signals': signals,
        'quickUseNonDefaultUseTypes':quick_nondefault,
        'strings': {r['address']: r['text'] for r in strings},
        'hostInputProfile': 'explicit game action signals and live flag bytes; not a captured native keyboard binding',
        'controlStorage': {'movementObject':'102203dc','queueObject':'10220420',
            'pendingSignal':'10220584','pendingArgument':'10220588','pendingOther':'1022058c',
            'pendingSharesQueueOffsets':['164','168','16c'],
            'initProfile':'Explicit OnInit movement/flag reset and CRT queue constructor, not a captured running session'},
        'registeredInputBodies': {r['name']:r['body'] for r in registrations if r['name'].startswith('OnPlayer')},
        'scriptDispatch': {'CallScriptFromScript':'2034dc70', 'GameApp270':'20002ecd->20051710',
            'gates':'GameApp reference cast/dereference, slot270 AL!=0, EntityAdmin processing AL!=0; then RunScriptFromScript2034d3a0 repeats processing AL!=0',
            'GetStaminaPoints':'10046590','AddStaminaPoints':'10046af0','SetStaminaPoints':'100467f0',
            'RunScriptFunction':'2034cea0','functionBodyReturn':'AL==1 pops current live top; every other AL returns0'},
        'queueOperandRules': {'loopUseConsume':'captured Self; SUB ESP,a8 at1009a879 then LEA[ESP+b8] at1009a87f selects pre-SUB+10',
            'sneakStateConsume':'captured Self; SUB ESP,a8 at1009acb7 then LEA[ESP+b0] at1009acbd selects pre-SUB+8',
            'lootResetQueue':'captured Self; SUB ESP,a8 at1008015e then LEA[ESP+b8] at10080164 selects pre-SUB+10',
            'quickUseConsume':'captured Self;10078ed0','weaponToggleConsume':'captured Self;100787d0',
            'jumpConsume':'captured argument Self;10059e1f',
            'equalityGate':'each Consume/Reset rereads live Entity.GetPlayer; captured pointer equality required'},
        'unsupported': ['physical movement/animation integration', 'complete combat/weapon/quick-use scripts',
                        'Talk/crime/quest/voice/HUD states outside examined branches']}
    save_json(out/'runtime-rules.json', rules); save_json(public/'runtime-rules.json', rules)
    save_json(out/'input-mappings.json', {'schema':'gothic3-native-input-mappings-v1',
        'gameSha256': modules[-1]['sha256'], 'defaultSessionKeys':default_mapping,'configurationReceipts':configs,
        'profileSelection':'20394560: setup CString+17c exactly Custom selects CreateINIKeys; otherwise installed defaults',
        'scope':'Conditional default device offsets and UTF16 source labels; active native/user/browser mappings not inferred'})
    save_json(out/'implementation-scope.json', {
        'schema':'gothic3-player-state-implementation-scope-v1',
        'implementation':'src/gothic3/player-state.ts',
        'integration':'NativeRoutineScripts.installPlayerStates shares its existing scheduler/SPU and delegated argument lifetime hooks',
        'supported':['module-wide movement bytes, action queue and physically aliased pending record',
            'standalone installed OnPlayerMovement/Walk/Sneak/Jump and normal/interact OnPlayerAction branches',
            'NormalLoop focus/current-target calls, ordered movement preparation, exact dispatch table branches and source-backed no-op cases',
            'ordinary actual-Player Navigation+218 and CharacterControl+ac wish writes; no physical translation',
            'NormalSneak lazy stage, Self-gated Consume, actual Sneak helper and NormalLoop state transition',
            'NormalJump frame growth,340B arguments, nonowning copies, inherited callback and strict RunScriptFunction result',
            '_AI_Jump forcedpose, Action54/Ani2 hooks, Self Consume, CanJump false full return; true movement/SP prefix',
            'each CallScriptFromScript actual GameApp/game-running and two ordered entity-processing gates; shared actual SP attribute operations'],
        'selectedProfiles':['valid signed32 scalars and byte inputs; failed input validation is not claimed native failed-input behavior',
            'successful JS queue allocation bounded65536records; no captured native allocator address claim',
            'same SPU scheduler capability and guarded still-live340B argument allocation after callbacks',
            'captured Entity pointer-field copies and captured reader capabilities; shared PS values remain mutable',
            'fixed installed Get/Add/SetStaminaPoints registrations proven by initializer PUSHes; dynamic registration replacement is not inferred',
            'explicit source-constructor/OnInit seed, not an observed native current session',
            'standalone original callback entries from explicit live input properties; no full event dispatcher equivalence'],
        'blocked':['full CharacterControl.OnAction axis/timer updates and OnPlayerGameKeyPressed prefilters/HUD/magic routing',
            'native focus search and ref-counted proxy assignment unless a concrete host supplies examined semantics',
            'physical movement mode changes, physics/animation application and PlayAni scheduling',
            'parade opponent preparation, weapon selection/equipment and most quick-use handlers',
            'loot/speech RNG/voice, master-thief template/skill, crime/dialogue/party interactions and HUD state bodies',
            'DamageReceiver SP fallback until concrete captured scalar store is supplied'],
        'scope':'Real examined source transitions with ordered prefix preserved on blocking; no whole-game gameplay equivalence'})
    evidence = {'schema': 'gothic3-player-state-native-evidence-v1',
        'scope': 'offline original PE byte checks; no native execution or gameplay validation',
        'nativeCodeExecuted':False,'testsRun':False,
        'inputBinaries': modules, 'functions': funcs, 'imports': imp, 'resolvedImports': dispatch,
        'strings': strings, 'tables': tables, 'loaderZeroFill': loader,
        'registrations':registrations, 'configurationReceipts':configs,
        'instructions': instructions,
        'intentionalSharedRuntimeChange': {'path': 'src/gothic3/routine-scripts.ts',
            'historicalCheckpoint': '08cf0580', 'historicalSha256': OLD_ROUTINE,
            'scope': 'same-SPU state/function fallback and delegated340B Jump argument destructor/delete; historical routine receipts unchanged'},
        'historicalReceiptsUntouched': ['assets/gothic3/routine-scripts/implementation-receipt.json',
                                       'assets/gothic3/dispatch-checkpoint.json']}
    save_json(out/'native-evidence.json', evidence)
    files = [ROOT/'src/gothic3/player-state.ts', ROOT/'src/gothic3/routine-scripts.ts', Path(__file__).resolve()]
    files += [ROOT/'tools/gothic3'/n for n in ['research_native_clock.py', 'research_native_combat.py',
             'research_native_inventory.py', 'research_routine_scripts.py','research_spu_instructions.py']]
    files += [ROOT/'src/gothic3'/n for n in ['script-routine.ts','script-instructions.ts','player-properties.ts',
             'inventory.ts','native-properties.ts','dialogue.ts']]
    files += sorted(p for base in [out, public] for p in base.rglob('*') if p.is_file()
                    and p.name != 'implementation-receipt.json')
    receipt = {'schema': 'gothic3-player-state-implementation-receipt-v1',
        'validation': 'producer checked every selected instruction against original PE; no tests/build/native execution',
        'intentionalSharedRuntimeChange': evidence['intentionalSharedRuntimeChange'],
        'files': [{'path': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)} for p in files if p.exists()]}
    save_json(out/'implementation-receipt.json', receipt)
    print(json.dumps({'functions': len(funcs), 'instructions': sum(len(x) for x in instructions.values()),
        'instructionBytes': sum(len(bytes.fromhex(x['bytes'])) for rs in instructions.values() for x in rs),
        'receiptFiles': len(receipt['files']), 'receiptSha256': sha(out/'implementation-receipt.json')}))

if __name__ == '__main__': main()
