# SPDX-License-Identifier: GPL-3.0-only
"""Recover offline script registrations and selected native gameplay evidence.

References point to reconstructed pseudocode/unaltered instruction bytes, never
to original source. No native callback is executed by this helper.
"""
import csv
import hashlib
from pathlib import Path
import re
import struct


def digest(data): return hashlib.sha256(data).hexdigest()


def function_block(text, va):
    marker = '/* ENTRY '+va+' |'
    start = text.index(marker)
    end = text.find('/* ENTRY ', start+len(marker))
    return text[start:end if end >= 0 else len(text)], text.count('\n', 0, start)+1


def pe_bytes(data, va, length):
    nt = struct.unpack_from('<I', data, 0x3c)[0]
    assert data[nt:nt+4] == b'PE\0\0'
    count = struct.unpack_from('<H', data, nt+6)[0]
    optional_size = struct.unpack_from('<H', data, nt+20)[0]
    optional = nt+24
    assert struct.unpack_from('<H', data, optional)[0] == 0x10b
    base = struct.unpack_from('<I', data, optional+28)[0]
    for i in range(count):
        section = optional+optional_size+i*40
        virtual_size, virtual_address, raw_size, raw_offset = struct.unpack_from('<IIII', data, section+8)
        if virtual_address <= va-base and va-base+length <= virtual_address+raw_size:
            offset = raw_offset+va-base-virtual_address
            return data[offset:offset+length]
    raise ValueError(f'Native instruction not source-backed: {va:08x}+{length}')


def recover(study):
    module = study/'01_Decompiled_Code/scripts__Script_Game_dll'
    asm_data = (module/'full_disassembly.asm').read_bytes()
    asm = asm_data.decode('utf-8')
    asm_lines = asm.splitlines()
    binary = (study/'00_Original_Runtime/scripts/Script_Game.dll').read_bytes()
    jumps = {}
    for i, line in enumerate(asm_lines, 1):
        match = re.fullmatch(r'([0-9a-f]{8}) \| [0-9a-f]+ \| JMP (0x[0-9a-f]+)', line)
        if match:
            jumps[match[1]] = {'target': match[2][2:], 'assemblyLine': i}
    source_bytes = {p.name: p.read_bytes() for p in (module/'pseudocode').glob('*.c')}
    # Preserve original CR/LF bytes: universal-newline translation can change
    # hashes and line navigation in reconstructed native C files.
    source_files = {name: data.decode('utf-8') for name, data in source_bytes.items()}
    registrations = []
    for file, text in sorted(source_files.items()):
        for match in re.finditer(r'bCString::bCString\(local_4,"([^"\n]+)"\);\s*'
                                r'bCString::bCString\(local_8,"([^"\n]+)"\);\s*'
                                r'(thunk_FUN_100[0-9a-f]+)\(local_8,(?:thunk_FUN_|&LAB_)([0-9a-f]{8}),local_4\);', text):
            thunk = match[4]
            registrations.append({'name': match[2], 'originalSourceLabel': match[1].replace('\\\\', '\\'),
                'registrationHelper': match[3], 'entryVA': '0x'+thunk,
                'bodyVA': '0x'+jumps.get(thunk, {'target': thunk})['target'],
                'decompiledFile': 'pseudocode/'+file, 'line': text.count('\n', 0, match.start())+1})
    by_body = {r['bodyVA'][2:]: r for r in registrations}
    startup, startup_line = function_block(source_files['functions_00004.c'], '100cfb70')
    startup_setters = []
    for match in re.finditer(r'thunk_FUN_([0-9a-f]{8})\(param_1,&stack0xfffffa9c,None_exref,(\d+)\);', startup):
        target, value = match[1], int(match[2])
        registration = by_body.get(target)
        startup_setters.append({'function': registration['name'] if registration else 'FUN_'+target,
                                'bodyVA': '0x'+target, 'value': value,
                                'target': 'player', 'sourceLine': startup_line+startup.count('\n', 0, match.start())})
    startup_asm = []
    for number, line in enumerate(asm_lines, 1):
        match = re.match(r'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', line)
        if match and 0x100cfb70 <= int(match[1], 16) < 0x100d01b0:
            raw = bytes.fromhex(match[2])
            if pe_bytes(binary, int(match[1], 16), len(raw)) != raw:
                raise ValueError(f'Startup instruction bytes mismatch: {match[1]}')
            startup_asm.append({'va': '0x'+match[1], 'bytes': match[2], 'instruction': match[3], 'assemblyLine': number})
    for setter in startup_setters:
        calls = []
        for i, row in enumerate(startup_asm):
            match = re.fullmatch(r'CALL 0x([0-9a-f]{8})', row['instruction'])
            if match and jumps.get(match[1], {'target': match[1]})['target'] == setter['bodyVA'][2:]:
                immediate_pushes = [r for r in startup_asm[max(0, i-12):i] if re.fullmatch(r'PUSH 0x[0-9a-f]+', r['instruction'])]
                value_row = immediate_pushes[-1] if immediate_pushes else None
                if value_row is None or int(value_row['instruction'].split()[-1], 16) != setter['value']:
                    raise ValueError('Startup setter immediate differs from reconstructed C: '+setter['function'])
                calls.append({'call': row, 'valuePush': value_row, 'entryVA': '0x'+match[1],
                              'entryJumpLine': jumps[match[1]]['assemblyLine'] if match[1] in jumps else None})
        if len(calls) != 1:
            raise ValueError('Startup setter expected exactly one source-backed call: '+setter['function'])
        setter['instructionEvidence'] = calls[0]
    inventory, inventory_line = function_block(source_files['functions_00004.c'], '100901f0')
    inventory_calls = []
    for match in re.finditer(r'Template::Template\(([^,]+),"([^"\n]+)"\);\s*'
                            r'PSInventory::AssureItemsEx\(([^;]+)\);', inventory):
        arguments = [p.strip() for p in match[3].split(',')]
        if len(arguments) != 6 or arguments[1] != match[1]:
            raise ValueError('Startup inventory template/call pairing mismatch')
        inventory_calls.append({'template': match[2], 'arguments': arguments[2:],
            'quality': int(arguments[2], 0), 'amount': int(arguments[3], 0),
            'key': int(arguments[4], 0), 'finalBoolean': arguments[5] == 'true',
            'sourceLine': inventory_line+inventory.count('\n', 0, match.start())})
    inventory_asm = []
    for number, line in enumerate(asm_lines, 1):
        match = re.match(r'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)', line)
        if match and 0x100901f0 <= int(match[1], 16) < 0x100914f8:
            raw = bytes.fromhex(match[2])
            if pe_bytes(binary, int(match[1], 16), len(raw)) != raw:
                raise ValueError('Startup inventory instruction bytes mismatch: '+match[1])
            inventory_asm.append({'va': '0x'+match[1], 'bytes': match[2], 'instruction': match[3], 'assemblyLine': number})
    # ESI becomes the imported Template(name) constructor and EDI becomes
    # imported PSInventory::AssureItemsEx. The preserved imported labels plus
    # instruction bytes anchor this ABI; four immediate PUSHes are bool/key/
    # amount/quality in right-to-left x86 thiscall order.
    import_row = next(row for row in inventory_asm if row['instruction'] == 'MOV EDI,dword ptr [0x10226db4]')
    calls = [(i, row) for i, row in enumerate(inventory_asm)
             if row['instruction'] == 'CALL EDI' and int(row['va'], 16) > int(import_row['va'], 16)]
    if len(calls) != len(inventory_calls):
        raise ValueError('Native assurance instruction/call count differs from reconstructed C')
    def immediate(row):
        match = re.fullmatch(r'PUSH (-?0x[0-9a-f]+)', row['instruction'])
        return int(match[1], 16) if match else None
    def string_at(va):
        return bytes(pe_bytes(binary, va+i, 1)[0] for i in range(512)).split(b'\0', 1)[0].decode('cp1252')
    for assurance, (position, call) in zip(inventory_calls, calls):
        pushes = [row for row in inventory_asm[max(0, position-20):position] if immediate(row) is not None]
        expected = [int(assurance['finalBoolean']), assurance['key'], assurance['amount'], assurance['quality']]
        if [immediate(row) for row in pushes[-4:]] != expected:
            raise ValueError('Native assurance argument PUSHes differ: '+assurance['template'])
        pointer = next((row for row in reversed(pushes[:-4]) if 0x10200000 <= immediate(row) < 0x102239d8), None)
        if pointer is None or string_at(immediate(pointer)) != assurance['template']:
            raise ValueError('Native assurance template pointer differs: '+assurance['template'])
        assurance['instructionEvidence'] = {'call': call, 'argumentPushes': pushes[-4:], 'templateNamePush': pointer,
                                            'importAssignment': import_row}
    rows = list(csv.DictReader((module/'functions.csv').open(encoding='utf-8', newline='')))
    selected_vas = {'100cfb70', '100901f0', '10091ad0', '100628c0', '100627e0', '100dbb80', '100db360'}
    selected_vas.update(r['bodyVA'][2:] for r in startup_setters)
    selected = []
    for row in rows:
        if row['address'] in selected_vas:
            selected.append({'va': '0x'+row['address'], 'name': row['qualified_name'],
                'decompiledFile': row['pseudocode_file'], 'decompiledLine': int(row['pseudocode_line']),
                'assemblyLine': int(row['assembly_entry_line']), 'bodyRanges': row['body_ranges'],
                'status': row['status']})
    assure_path = study/'01_Decompiled_Code/Script_dll/pseudocode/functions_00005.c'
    assure_data = assure_path.read_bytes()
    assure_body, assure_line = function_block(assure_data.decode('utf-8'), '10004890')
    if not all(token in assure_body for token in ('iVar1 = AssureItems(this,param_1,param_2,param_3)',
                                                   'SetStackHotKey', 'if (param_5 != false)', 'SetLearned')):
        raise ValueError('Reviewed AssureItemsEx semantics differ from actual native C reconstruction')
    inventory_semantics = {'native': 'Script.dll::PSInventory::AssureItemsEx', 'entryVA': '0x10004890',
        'inputSha256': digest((study/'00_Original_Runtime/Script.dll').read_bytes()),
        'decompiledFile': 'pseudocode/functions_00005.c', 'line': assure_line, 'fileSha256': digest(assure_data),
        'assurance': 'AssureItems(template,quality,amount), then assign hotkey if stack exists.',
        'quickSlot': 'Negative key maps to0xffffffff; nonnegative key is assigned as supplied.',
        'learned': 'Final boolean true sets stack Learned true; false leaves existing Learned unchanged.',
        'equipment': 'AssureItemsEx does not itself equip an item.'}
    return {'schemaVersion': 1, 'scriptRegistrations': registrations, 'selectedFunctions': selected,
        'inputSha256': digest(binary), 'startupInstructions': startup_asm,
        'startupInventoryInstructionCount': len(inventory_asm),
        'assemblySha256': digest(asm_data),
        'decompiledFileHashes': {name: digest(data) for name, data in source_bytes.items()},
        'nativeStartUp': {'registeredName': 'OnGameStartUp', 'bodyVA': '0x100cfb70',
            'registeredEntryVA': '0x10002c07', 'jumpAssemblyLine': jumps['10002c07']['assemblyLine'],
            'chapter': {'value': 1, 'instructionVA': '0x100cfcc2'},
            'learningPointsAttributes': {'value': 0, 'instructionVA': '0x100cffb5'},
            'explicitQuestRuns': ['Xardas_FindXardas'],
            'attributeSetterCalls': startup_setters,
            'inventoryPopulateBodyVA': '0x10091ad0', 'inventoryAssureBodyVA': '0x100901f0',
            'inventoryAssureCalls': inventory_calls,
            'inventoryAssureSemantics': inventory_semantics,
            'otherCalls': ['Larson:SetRoutine(Start)', 'Ardea enclave political/raid/revolution overrides',
                           'NotifyEnclave(Ardea)', 'Gorn:ExitROIScript(OnExit_Gorn)', 'OnGameStartUpDirtyHack'],
            'caveats': ['Operations describe this actual callback, not a captured running game state.',
                        'AssureItemsEx false preserves prior Learned; item creation defaults and full template inheritance require separate evidence.',
                        'Ardea enclave override immediate values are not yet mapped here; do not infer them from serialized state.',
                        'Quest activation through NotifyEnclave and later callbacks is distinct from explicit RunQuest.']}}


SEMANTICS = {
    'scope': 'Recovered native control flow. This catalog documents behavior; it does not claim browser implementation.',
    'commands': {
        'Say': {'opcode': 0, 'operands': {'entity1': 'speaker', 'entity2': 'listener', 'text': 'localized text ID'},
                'native': 'scripts/Script_Game.dll::0x100dbb80',
                'behavior': 'Starts _AI_Say for regular info; comment info starts Entity::StartSay. Native voice, stage direction, camera and completion callbacks are asynchronous.'},
        'SaySVM': {'opcode': 1, 'operands': {'entity1': 'speaker', 'entity2': 'listener', 'id1': 'SVM ID'},
                   'native': 'scripts/Script_Game.dll::0x100dbb80'},
        'Description': {'native': 'Game.dll::gCInfoScript_PS::Execute/OnCommandCompleted',
                        'symbolVA': '0x207d07b4', 'initializerVA': '0x2053e430',
                        'behavior': 'Case insensitive description marker skipped while advancing script lines; text supplies menu/title metadata.'},
        'Give': {'opcode': 13, 'operands': {'entity1': 'donor', 'entity2': 'recipient', 'id1': 'item template', 'id2': 'integer amount'},
                 'native': 'scripts/Script_Game.dll::0x100dbb80',
                 'behavior': 'Assures requested item template in donor inventory, then delegates transfer to PSInfoManager::Give; direct subtraction without native assurance differs.'},
        'GiveXP': {'opcode': 12, 'operands': {'id1': 'requested integer XP script value'},
                   'native': 'scripts/Script_Game.dll::0x100628c0',
                   'behavior': 'Context-sensitive callback with party gates, world/None self multiplier 5, XP update, level/LP effects and Perk_Learn branch. Exact LP arithmetic requires instruction verification.'},
        'SetGameEvent': {'opcode': 35, 'operands': {'id1': 'player memory event ID'}, 'native': 'scripts/Script_Game.dll::0x100dbb80'},
        'ClearGameEvent': {'opcode': 36, 'operands': {'id1': 'player memory event ID'}, 'native': 'scripts/Script_Game.dll::0x100dbb80'},
        'RunQuest': {'opcode': 39, 'operands': {'id1': 'quest name'}, 'native': 'Game.dll::0x20007306', 'behavior': 'Only Open0 -> Running1.'},
        'CloseQuest': {'opcode': 40, 'operands': {'id1': 'quest name'}, 'native': 'Game.dll::0x20028358', 'behavior': 'Open0 -> Obsolete4; otherwise attempts Cancelled5, which only accepts Running1.'},
        'SucceedQuest': {'opcode': 41, 'operands': {'id1': 'quest name'}, 'native': 'Game.dll::0x2001e72c', 'behavior': 'Open0 or Running1 -> Success2 through SetStatus reward path.'},
        'SuccessQuest': {'native': None, 'behavior': 'Source typo is absent from native command table; unknown-command warning path. Do not silently repair original command.'},
        'End': {'opcode': 51, 'native': 'scripts/Script_Game.dll::0x100dbb80', 'behavior': 'PSInfoManager::End; also reached by Sleep fallthrough.'},
        'Back': {'opcode': 50, 'native': 'scripts/Script_Game.dll::0x100dbb80', 'behavior': 'ChildMode=false.'},
        'ShowPicture': {'opcode': 45, 'operands': {'id1': 'image resource'}, 'native': 'scripts/Script_Game.dll::0x100dbb80'},
        'ShowSubtitle': {'opcode': 46, 'operands': {'text': 'localized text'}, 'native': 'scripts/Script_Game.dll::0x100dbb80'},
        'PlayMusic': {'opcode': 47, 'operands': {'id1': 'music situation'}, 'native': 'scripts/Script_Game.dll::0x100dbb80'},
        'InfoWait': {'opcode': 48, 'operands': {'id1': 'wait integer'}, 'native': 'scripts/Script_Game.dll::0x100dbb80'},
        'EndGame': {'opcode': 49, 'native': 'scripts/Script_Game.dll::0x100dbb80',
                    'behavior': 'Plays G3_Credits.bik and G3_Credits2.bik, then terminates application.'}},
    'questSetStatus': {'native': 'Game.dll::gCQuest_PS::SetStatus', 'va': '0x2001a519',
        'acceptedPrevious': {'0': [], '1': [0, 6], '2': [0, 1], '3': [0, 1], '4': [0], '5': [1], '6': [1], '7': [0, 1]},
        'rewardStatuses': [2, 7],
        'rewards': ['Political amount >0 increments alignment fame.', 'Enclave amount >0 increments fame on matching enclave.',
                    'Nonempty attribute ID increments base value by attribute amount.',
                    'Nonzero ExperiencePoints calls GiveXP with self=world,other=player; final XP is context-derived.',
                    'Job reward fields remain source data; this SetStatus body does not implement them.'],
        'otherEffects': ['Running captures game start time.', 'Arena types5/12 update ArenaStatus depending on Running.',
                         'Ardea_Revolution success disables tutorial8 and opens TUT_AfterFight when enabled.']},
    'infoAvailability': {'native': 'Game.dll::gCInfo_PS::IsAvailable', 'va': '0x20004615',
        'rule': 'Given infos rejected except conditionType51 End, then AreConditionsFulfilled.'},
    'infoGiven': {'native': 'Game.dll::gCInfo_PS::Execute', 'va': '0x2002218d',
        'rule': 'Successful script execution marks Given except InfoType0/4, conditionType19/51/52, Permanent true, or player owner.',
        'unknown': '108 original INIs omit Permanent; normalized null preserves absence pending default initialization evidence.'},
    'infoCommonConditions': {'native': 'Game.dll::gCInfo_PS::AreConditionsFulfilled', 'va': '0x20020fc7',
        'owner': 'Owner entity must resolve.', 'quest': 'Nonempty Quest must resolve.',
        'ownerNearEntity': 'Distance <=500 native centimetres.',
        'playerKnows': 'All event IDs must be found in player-memory event array.',
        'items': 'When CondItemContainer resolves, each required stack must exist and meet amount.',
        'secondaryNPCStatus': {'0': 'Alive', '1': 'Unharmed', '2': 'Defeated', '3': 'Dead', '4': 'TalkedToPlayer', '5': 'NotTalkedToPlayer'},
        'parentType4': 'Requires AreChildInfosAvailable.',
        'questStatusChecks': {'5': 'Open0 + prereqs finished', '6': 'Open0 + prereqs finished',
                              '7': 'Running1', '10': 'Success2', '11': 'Running1', '12': 'Failed3',
                              '13': 'Cancelled5', '20': 'Lost6', '21': 'Lost6', '22': 'Won7'},
        'unsupportedUntilPorted': ['Crime/fight/party/enclave predicates', 'Native inventory partial-delivery checks',
                                  'Teaching/stat checks and skill tables', 'Native time predicates']},
    'infoDelivery': {'native': 'Game.dll::gCInfo_PS::OnDelivery', 'va': '0x20035175',
        'trigger': 'OnCommandCompleted advances to native command index1 after skipping description.',
        'rule': 'Only condition8/9. Questtype0 transfers remaining amounts from player to info owner. Condition8 type1/4 increments matching owner target counter and checks delivery; type3/6 Success2+StopBringNPC; type7 Success2+StopGuidePlayer.'},
    'infoOnEnd': {'native': 'Game.dll::gCInfo_PS::OnEndInfo', 'va': '0x20007d1f',
        'rule': 'Condition6/21 starts/restarts quest Running1;11 cancels; party/teach/mob conditions invoke further native callbacks. Say records append to quest log for condition3/4/5/6/7/8/10/11/19.'}}
