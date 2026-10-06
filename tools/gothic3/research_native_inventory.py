"""Audit installed Gothic3 inventory bodies and emit portable native receipts.

Reads the immutable completed study and its original PE bytes. Does not load a
DLL, launch the game, or execute recovered code. Python3.10+. The existing combat
receipt module supplies only PE/assembly/text readers; its SHA is retained.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import struct
from pathlib import Path

from research_native_combat import PE, audit_assembly, cblocks, save_json, sha

MODULES = {
    'Game_dll': ('Game', 'Game.dll', 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'),
    'Script_dll': ('Script', 'Script.dll', '9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08'),
    'SharedBase_dll': ('SharedBase', 'SharedBase.dll', '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'),
}
SELECTION = {
    'Game_dll': '''2000af88 2003147b 201c92b0 201cfc00 201d0210 201d2240
2001563b 200247f3 2001aa69 2001a9e2 200121c5 2001b33d 2001bffe 20014849
2000119f 20013fb6 2002003b 20023a65 20010c7b 201cf7a0 200203e2 20030995
2001695a 20014c6d 200012c1 20014669 2001cc38 2001d0ac 2002f6da 20026c4c
20022f61 2001eb87 2001b199 2002a51d 2002b8eb 20017f53 20030ac1 200346bc
2001705d 2002941a 20029c67 2002eb54 200230c4 200060b4 2002504a
20033e01 20032a5b 20004fac 20009651 2000e3c7 2000c545 200290d2
200170f8 2001a5cd 200309b3 201cf350 2000727f 20018089 20018aed
200307f1 20003850 2001efec 20028a83 200021fd'''.split(),
    'Script_dll': ['100014d3', '10003c65', '10004890'],
    'SharedBase_dll': ['10001186', '10005a65', '10008805', '100027de'],
}


def directory(pe: PE, index: int) -> tuple[int, int]:
    header = struct.unpack_from('<I', pe.data, 0x3c)[0]
    return struct.unpack_from('<II', pe.data, header + 24 + 96 + index * 8)


def native_imports(pe: PE) -> dict[int, dict]:
    rva, size = directory(pe, 1)
    result = {}
    for offset in range(0, size, 20):
        raw = pe.at(pe.base + rva + offset, 20)
        original, stamp, chain, name_rva, first = struct.unpack('<IIIII', raw)
        if raw == bytes(20):
            return result
        library = pe.cstring(pe.base + name_rva).decode('ascii')
        for i in range(65536):
            value = struct.unpack('<I', pe.at(pe.base + (original or first) + i * 4, 4))[0]
            if value == 0:
                break
            if value & 0x80000000:
                entry = {'library': library, 'ordinal': value & 0xffff, 'decoratedName': None}
            else:
                hint = struct.unpack('<H', pe.at(pe.base + value, 2))[0]
                entry = {'library': library, 'hint': hint, 'decoratedName': pe.cstring(pe.base + value + 2).decode('ascii')}
            entry['lookupBytes'] = struct.pack('<I', value).hex()
            result[pe.base + first + i * 4] = entry
        else:
            raise ValueError('Unterminated original import lookup table')
    raise ValueError('Unterminated original import descriptor table')


def native_exports(pe: PE) -> dict[str, int]:
    rva, _ = directory(pe, 0)
    raw = pe.at(pe.base + rva, 40)
    fields = struct.unpack('<IIHHIIIIIII', raw)
    count, name_count, functions, names, ordinals = fields[6:11]
    if name_count > 65536 or count > 65536:
        raise ValueError('Unbounded original export table')
    result = {}
    for i in range(name_count):
        name_rva = struct.unpack('<I', pe.at(pe.base + names + i * 4, 4))[0]
        ordinal = struct.unpack('<H', pe.at(pe.base + ordinals + i * 2, 2))[0]
        if ordinal >= count:
            raise ValueError('Export ordinal outside function table')
        function_rva = struct.unpack('<I', pe.at(pe.base + functions + ordinal * 4, 4))[0]
        name = pe.cstring(pe.base + name_rva).decode('ascii')
        result[name] = pe.base + function_rva
    return result


def collect(study: Path, module: str, entries: list[str], out: Path, pe: PE):
    short = MODULES[module][0]
    directory = study / '01_Decompiled_Code' / module
    csv_path, asm_path = directory / 'functions.csv', directory / 'full_disassembly.asm'
    with csv_path.open(encoding='utf-8-sig', newline='') as f:
        rows = list(csv.DictReader(f))
    by_address = {r['address']: r for r in rows}
    selected = set(entries)
    for entry in list(selected):
        if entry not in by_address:
            raise ValueError(f'Missing selected entry {module}:{entry}')
        row = by_address[entry]
        if row['body_bytes'] == '5':
            raw = pe.at(int(entry, 16), 5)
            if raw[0] == 0xe9:
                target = f'{int(entry, 16) + 5 + struct.unpack_from("<i", raw, 1)[0]:08x}'
                if target not in by_address:
                    raise ValueError(f'Missing native alias target {entry}->{target}')
                selected.add(target)
    ordered = sorted(rows, key=lambda r: int(r['assembly_entry_line']))
    next_start = {r['address']: int(ordered[i + 1]['assembly_entry_line']) - 1
                  if i + 1 < len(ordered) else None for i, r in enumerate(ordered)}
    starts = {int(by_address[e]['assembly_entry_line']) - 1: e for e in selected}
    excerpts, active, lines = {}, None, []
    with asm_path.open(encoding='utf8') as f:
        for line_number, line in enumerate(f, 1):
            if active and next_start[active] == line_number:
                excerpts[active] = ''.join(lines)
                active, lines = None, []
            if line_number in starts:
                if active:
                    raise ValueError('Overlapping assembly excerpts')
                active = starts[line_number]
                if not line.startswith('; ' + active + ' '):
                    raise ValueError(f'Assembly header mismatch {module}:{active}')
            if active:
                lines.append(line)
        if active:
            excerpts[active] = ''.join(lines)
    c, c_hash = {}, {}
    for path in {directory / by_address[e]['pseudocode_file'] for e in selected}:
        c_hash[path] = sha(path)
        for entry, block, line in cblocks(path):
            if entry in selected:
                c[entry] = (block, line)
    asm_sha, csv_sha = sha(asm_path), sha(csv_path)
    records, instructions = [], {}
    for entry in sorted(selected):
        row = by_address[entry]
        if row['status'] != 'decompiled':
            raise ValueError(f'Not genuine recovered C: {module}:{entry}')
        block, line = c[entry]
        assembly = excerpts[entry]
        audited = audit_assembly(assembly, pe)
        base = out / 'sources' / short
        base.mkdir(parents=True, exist_ok=True)
        c_path, a_path = base / (entry + '.c.txt'), base / (entry + '.asm.txt')
        c_path.write_text(block, encoding='utf8', newline='\n')
        a_path.write_text(assembly, encoding='utf8', newline='\n')
        jump = None
        raw = pe.at(int(entry, 16), int(row['body_bytes'])) if int(row['body_bytes']) == 5 else None
        if raw is not None and raw[0] == 0xe9:
            jump = f'{int(entry, 16) + 5 + struct.unpack_from("<i", raw, 1)[0]:08x}'
        records.append({'id': short + ':' + entry, 'module': short, 'entry': entry,
                        'name': row['qualified_name'], 'signature': row['signature'],
                        'bodyBytes': int(row['body_bytes']), 'bodyRanges': row['body_ranges'],
                        'forwardingTarget': jump, 'studyCsvSha256': csv_sha,
                        'studyCSource': row['pseudocode_file'], 'studyCLine': line,
                        'studyCSha256': c_hash[directory / row['pseudocode_file']],
                        'studyAssemblyLine': int(row['assembly_entry_line']) - 1,
                        'studyAssemblySha256': asm_sha,
                        'cExcerpt': c_path.relative_to(out).as_posix(), 'cExcerptSha256': sha(c_path),
                        'assemblyExcerpt': a_path.relative_to(out).as_posix(), 'assemblyExcerptSha256': sha(a_path),
                        'instructionRecords': len(audited),
                        'instructionBytes': sum(len(bytes.fromhex(r['bytes'])) for r in audited),
                        'allInstructionBytesMatch': True})
        instructions[short + ':' + entry] = audited
    return records, instructions


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', type=Path, required=True)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[2]
    evidence_out = repo / 'assets/gothic3/inventory'
    public_out = repo / 'public/gothic3/inventory'
    evidence_out.mkdir(parents=True, exist_ok=True)
    public_out.mkdir(parents=True, exist_ok=True)
    receipts, instructions, inputs, pes = [], {}, [], {}
    for module, (short, relative, expected) in MODULES.items():
        path = args.study / '00_Original_Runtime' / relative
        actual = sha(path)
        if actual != expected:
            raise ValueError(f'Unsupported original build: {relative}')
        inputs.append({'module': short, 'studyPath': '00_Original_Runtime/' + relative,
                       'sha256': actual, 'bytes': path.stat().st_size})
        pe = pes[module] = PE(path)
        recs, insts = collect(args.study, module, SELECTION[module], evidence_out, pe)
        receipts.extend(recs)
        instructions.update(insts)
    # These slots identify the actual inherited property callback implementation.
    # Bind both pointer bytes and Game's import name to SharedBase exported code.
    game = pes['Game_dll']
    game_imports = native_imports(game)
    shared_exports = native_exports(pes['SharedBase_dll'])
    functions = {r['address']: r for r in csv.DictReader((args.study / '01_Decompiled_Code/Game_dll/functions.csv').open(encoding='utf-8-sig'))}
    vtables = []
    expected_slots = {0x4c: ('OnNotifyPropertyValueChangedEnterEx', '10008805'),
                      0x50: ('OnNotifyPropertyValueChangedExitEx', '100027de'),
                      0x58: ('NotifyPropertyValueChangedEnterEx', '10001186'),
                      0x5c: ('NotifyPropertyValueChangedExitEx', '10005a65')}
    for address, class_name in [(0x2065c42c, 'gCInventorySlot'), (0x2065c4b4, 'gCInventoryStack')]:
        for offset, (method, shared) in expected_slots.items():
            raw = game.at(address + offset, 4)
            pointer = f'{struct.unpack("<I", raw)[0]:08x}'
            expected_name = 'SHAREDBASE.DLL::bCObjectRefBase::' + method
            if functions[pointer]['qualified_name'] != expected_name:
                raise ValueError(f'Changed property callback {class_name}/{method}')
            import_stub = game.at(int(pointer, 16), 6)
            if import_stub[:2] != b'\xff\x25':
                raise ValueError(f'Changed imported callback thunk {pointer}')
            import_address = struct.unpack_from('<I', import_stub, 2)[0]
            imported = game_imports[import_address]
            decorated = imported['decoratedName']
            if (imported['library'].lower() != 'sharedbase.dll' or not decorated or
                    not decorated.startswith('?' + method + '@bCObjectRefBase@@') or
                    shared_exports.get(decorated) != int(shared, 16)):
                raise ValueError('Original PE import/export callback binding changed')
            vtables.append({'class': class_name, 'vtableAddress': f'{address:08x}',
                            'slotOffset': offset, 'pointerBytes': raw.hex(),
                            'gameImportThunk': pointer, 'importSymbol': expected_name,
                            'importThunkBytes': import_stub.hex(),
                            'importAddressSlot': f'{import_address:08x}', 'originalPEImport': imported,
                            'implementation': 'SharedBase:' + shared,
                            'allPointerBytesReadFromPinnedPE': True})
    type_raw = game.cstring(0x20657238)
    if type_raw != b'Type':
        raise ValueError('Changed CreateItems property-name literal')
    seed_path = repo / 'public/gothic3/gameplay/initial/initialized-player.json'
    seed = json.loads(seed_path.read_text(encoding='utf8'))
    source_stacks = seed['inventory']['stacks']
    if len(source_stacks) != 121 or len(seed['templateDefinitions']) != 123:
        raise ValueError('Unexpected starting source inventory')
    stacks = []
    for stack in source_stacks:
        call = stack['startupOperation']
        definition = seed['templateDefinitions'][stack['templateGuid20']]
        if definition['name'] != call['template'] or stack['quality'] != call['quality'] or stack['amount'] != call['amount']:
            raise ValueError('Starting source stack disagrees with native call')
        stacks.append({'index': stack['index'], 'templateName': stack['templateName'],
                       'templateGuid20': stack['templateGuid20'], 'amount': stack['amount'],
                       'quality': stack['quality'], 'quickSlot': stack['quickSlot'],
                       'hotKeyUnsigned': stack['hotKeyUnsigned'], 'stackType': 0,
                       'linkedSlot': 0, 'activationCount': 0, 'transactionAmount': 0,
                       'intrinsicLearned': bool(call['finalBoolean']),
                       'learnedOperation': 'setTrue' if call['finalBoolean'] else 'preserve',
                       'externalObserverEffects': 'requires-complete-runtime-observer-registry',
                       'templateSource': definition['source'], 'templateSourceOffset': definition['sourceOffset'],
                       'startupOperation': call})
    starting = {'schema': 'gothic3-native-starting-inventory-v1', 'schemaVersion': 1,
                'sourceSeed': {'url': '../gameplay/initial/initialized-player.json', 'sha256': sha(seed_path), 'bytes': seed_path.stat().st_size},
                'scope': 'intrinsic-stack-state-before-external-inventory-observers-and-later-startup-equipping',
                'stacks': stacks, 'equipment': seed['inventory']['equipment'],
                'counts': {'stacks': len(stacks), 'intrinsicLearnedTrue': sum(s['intrinsicLearned'] for s in stacks),
                           'intrinsicLearnedFalse': sum(not s['intrinsicLearned'] for s in stacks),
                           'serializedEquipment': len(seed['inventory']['equipment'])},
                'limitations': ['Later startup callbacks may equip weapons or mutate stacks.',
                                'Physical equipped item entities retain serialized GUIDs; no synthetic spawn is asserted.',
                                'Constructor ApplyDefaults does not write SortIndex; no default value is invented.',
                                'This document does not prove which external runtime inventory observers are registered.']}
    save_json(public_out / 'starting-inventory.json', starting)
    dependency = Path(__file__).with_name('research_native_combat.py')
    evidence = {'schema': 'gothic3-native-inventory-evidence-v1', 'schemaVersion': 1,
                'sourceOnly': True, 'targetCodeExecuted': False, 'inputs': inputs,
                'producer': {'path': 'tools/gothic3/research_native_inventory.py', 'sha256': sha(Path(__file__))},
                'readerDependency': {'path': 'tools/gothic3/research_native_combat.py', 'sha256': sha(dependency)},
                'runtimeImplementation': {'path': 'src/gothic3/inventory.ts', 'sha256': sha(repo / 'src/gothic3/inventory.ts'),
                                          'scope': 'new-bounded-TS-inventory-core; external-observers-and-physical-equipping-require-host'},
                'entries': receipts, 'instructions': instructions, 'vtablePropertyCallbacks': vtables,
                'literals': [{'module': 'Game', 'address': '20657238', 'bytes': (type_raw + b'\0').hex(), 'value': 'Type'}],
                'defaults': {'amount': 1, 'quality': 0, 'quickSlot': -1, 'slot': 0, 'stackType': 0,
                             'learned': False, 'activationCount': 0, 'transactionAmount': 0,
                             'sortIndex': None, 'sortIndexStatus': 'not-written-by-ApplyDefaults'},
                'contracts': {
                    'propertyNotifications': 'Stack/slot vtables inherit SharedBase forwarding methods whose OnNotify hooks return true without side effects.',
                    'creation': 'Valid template and positive signed amount. First mergeable template+quality+type stack gets an unchecked signed32 amount increment. New stack sets Type, Quality, Amount (enter/write/exit), appends, then calls optional stack-list listener OnStackCreate.',
                    'assurance': 'PSInventory sums every exact-quality template stack in uint32 arithmetic, selects first match then replaces selection at each unlinked match. Only shortfall is created. AssureItemsEx assigns quickslot and only sets Learned when its bool is true.',
                    'hotkey': 'For nonnegative key, clear only the first stack already holding it, notify OnStackChange, then assign target and notify again. Target may be the same stack.',
                    'learn': 'LearnStack returns false for missing index; already learned returns true without notifications. Otherwise enter/write true/exit then event1 inventory listener notification. AssureItemsEx SetLearned has property notifications but no explicit inventory event1.',
                    'observerBoundary': 'OnStackCreate/Change and NotifyListeners only forward ordered active registered listeners and purge inactive entries; external observer implementations are separately required. Constructor initializes empty listener vector; this does not prove the loaded runtime keeps it empty.',
                    'equipment': 'Original Head and Body slots are separate serialized records, not newly assured stacks. Link/Unlink requires physical entity creation, skeleton/stat/skill callbacks and is not silently simulated.',
                    'give': 'Info Give requires donor and recipient inventories and an existing first ANY-quality template stack. Player donor amount is min(requested unsigned amount, first-stack unsigned quantity); nonplayer is not clamped. TransferItemsTo creates target quantities before subtracting source, deletes empty source before notifying quest manager, and emits localized game messages in Give afterward.',
                    'boundedTransfer': 'TS ordinary unlinked-stack transfer requires complete observer registries and a resolved native quest notification or proven no-op. Linked physical item effects and mission/absent-item-property transfers to nonplayers remain unsupported, including native special-name and target-stack0 fallthrough.',
                    'skillLookup': 'FindSkillStackIndex/FindSpellStackIndex scan permanent gCItem_PS items and compare the Skill/Spell proxy template pointer, not the inventory item template name. ActivateSkill increments ActivationCount with property notifications and no explicit inventory event.',
                },
                'audit': {'selectedEntries': len(receipts), 'instructionRecords': sum(r['instructionRecords'] for r in receipts),
                          'matchedInstructionBytes': sum(r['instructionBytes'] for r in receipts), 'allInstructionBytesMatch': True}}
    evidence_path = public_out / 'native-inventory-evidence.json'
    save_json(evidence_path, evidence)
    outputs = []
    for path in sorted(public_out.glob('*.json')):
        if path.name == 'manifest.json':
            continue
        outputs.append({'url': path.name, 'sha256': sha(path), 'bytes': path.stat().st_size})
    manifest = {'schema': 'gothic3-native-inventory-manifest-v1', 'schemaVersion': 1,
                'evidence': 'native-inventory-evidence.json', 'startingInventory': 'starting-inventory.json',
                'scope': 'bounded-source-backed-inventory-core', 'inputs': inputs, 'outputs': outputs,
                'audit': evidence['audit']}
    save_json(public_out / 'manifest.json', manifest)
    save_json(evidence_out / 'audit.json', {'schemaVersion': 1, 'nativeCodeExecuted': False,
              'inputs': inputs, 'manifestSha256': sha(public_out / 'manifest.json'),
              'outputs': outputs, 'audit': evidence['audit'], 'startingCounts': starting['counts']})
    findings = '''Native inventory scope and reproduction
=======================================
Run from the repository root:
  python -B tools/gothic3/research_native_inventory.py --study <completed-study-directory>

Reads only pinned original PE bytes and completed C/assembly exports. No DLL or
game execution. Every selected assembly instruction is matched to original PE
bytes; exact export E9 aliases and their real bodies have separate receipts.
The reader dependency research_native_combat.py is SHA-bound in the evidence.

ApplyDefaults: Amount1, Quality0, QuickSlot-1, Slot0, Type0, Learned false,
ActivationCount0, TransactionAmount0. SortIndex is not written there; unknown.
CreateItems does not instantiate ItemWorld/Skill/Spell template objects.
Actual Slot/Stack vtables use SharedBase no-effect-true property hooks.
Inventory observers remain separate; the constructor's empty registry does
not establish the loaded game's registration state. TS mutation requires an
explicit complete ordered observer registry and reports callback failures as
partial effects, blocking later mutations. Host effects cannot be rolled back.

Starting source:121 assurances;116 preserve intrinsic false,5 explicitly true.
Two original equipped slot records preserve Head_Player and Body_Player IDs.
AssureItemsEx assigns quickslots and has no EquipStack call. Later startup
callbacks are outside this document's scope. No weapon auto-equip is inferred.

Inventory primitive API: NativeInventory + createNativeStartingInventory in
src/gothic3/inventory.ts. Assure creates only exact-quality shortfall. Create
adds quantities and can merge linked stacks only if native MustSplit permits.
Quickslot assignment clears only the first prior holder, even if it is itself.
LearnStack notifies inventory event1; AssureItemsEx SetLearned does not.

Give foundation: planNativeInventoryGiveTransfer selects first ANY-quality
donor stack and clamps only a player donor. transferItemsTo executes ordinary
unlinked transfer, target creation then source subtraction/deletion, with a
resolved OnReceiveItem notification boundary. Missing donor is not item spawn.
Localized Given/Taken messages remain dialogue-host effects. Linked physical
effects and mission-item nonplayer fallthrough remain explicitly unsupported.
Equipment planning does not apply physical links, render attachments or stats.

Source data is mutable game-specific state, not a claim that the complete game
is playable. Native allocator/pointer lifetimes are represented by TS objects;
unsafe source-identity changes through callbacks block further interpretation.
'''
    (evidence_out / 'FINDINGS.txt').write_text(findings, encoding='utf8', newline='\n')
    print(json.dumps({'manifestSha256': sha(public_out / 'manifest.json'), 'audit': evidence['audit'], 'startingCounts': starting['counts']}))


if __name__ == '__main__':
    main()
