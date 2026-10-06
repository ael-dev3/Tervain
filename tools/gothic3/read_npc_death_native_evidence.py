"""Audit scheduled NPC death, task callbacks and selected empty host branches.

Only reads original PE files and saved disassembly; executes no native code.
ZS_RagDollDead is absent from the study's function index, so its exact physical
instruction range is audited explicitly rather than using reconstructed C.
"""
import argparse
import json
from pathlib import Path
import re

from read_dialogue_native_evidence import EXPECTED_INPUTS, PE, audit_module, sha

# Additional pinned modules used by this receipt only. The historical dialogue
# receipt's default target set and output remain unchanged.
EXPECTED_INPUTS.update({
    'Engine.dll': 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3',
    'SharedBase.dll': '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214',
})


TARGETS = {
    'scripts__Script_Game_dll': ('scripts/Script_Game.dll', {
        0x10027e70: 'Kill', 0x100362f0: 'Defeat',
        0x10002536: 'ZS_Dead', 0x10003198: 'ZS_Unconscious',
        0x10115db0: 'RegisterKill', 0x10115e90: 'RegisterRagDollDead',
        0x10115cd0: 'RegisterDead', 0x1011d390: 'RegisterDefeat',
        0x1011d240: 'RegisterUnconscious',
        0x10031280: 'ResetAll', 0x10031680: 'ResetInteraction',
        0x10031970: 'RemoveNonCombatItems', 0x10031790: 'DropHandItems',
        0x1001a8c0: 'IsDroppableHandItem', 0x1000c010: 'LiveFightCategory',
        0x1000bf60: 'OrderedFightTableLookup', 0x10009520: 'PlayerControlFlag',
        0x10009650: 'MovementConstraints', 0x100096e0: 'PlayerFightSelectionReset',
        0x1001b0c0: 'IsHumanoid', 0x1000d200: 'CanSaySVM', 0x1000db70: 'SaySVM',
        0x10045b20: 'SetHitPoints',
        0x1000ecc0: 'ResetPlayerSelection', 0x10010130: 'CombatStateCleanup',
        0x10108250: 'FightTableStaticInitialize', 0x10003526: 'FightTableConstructorAlias',
        0x1000e380: 'FightTableConstructor', 0x10001267: 'FightTableAppendAlias',
        0x10016160: 'FightTableAppend', 0x10001820: 'FightTableLookupAlias',
        0x10002180: 'LiveFightCategoryAlias',
    }),
    'Script_dll': ('Script.dll', {
        0x10004273: 'SetTaskWrapper', 0x10002a9f: 'QuestManagerKillWrapper',
        0x10001f05: 'QuestManagerDefeatWrapper', 0x100035c1: 'ResetInteractAnimation',
        0x1000292d: 'SetGroundBias', 0x100036d9: 'StopEffectWrapper',
        0x10004fcf: 'StartSaySVM', 0x10003814: 'StartSayEx', 0x10004061: 'StartOutputWrapper',
        0x100040c5: 'EntitySetAlignmentTarget', 0x1000187a: 'EntitySetLookAtTarget',
        0x10002ee6: 'EntityEnableAutoAiming',
        0x100028c4: 'NavigationSetDCCEnabled', 0x10002b67: 'EntitySetCollisionGroup',
        0x100012c6: 'ControlSetMovementConstraints',
        0x10001ae6: 'PartyGetMembers', 0x10003459: 'PartyCleanUp',
    }),
    'Game_dll': ('Game.dll', {
        0x20006776: 'RoutineAISetTask', 0x2003290c: 'SPUAISetTask',
        0x20007c75: 'SetCurrentAIState', 0x200047e1: 'ProcessScript',
        0x2002aa6d: 'RunScriptState', 0x20029ad7: 'RunScriptFunction',
        0x20030f4e: 'ManagerOnNPCKilled', 0x2001e042: 'ManagerOnNPCDefeated',
        0x2000f90c: 'QuestOnNPCKilled', 0x200095b6: 'QuestOnNPCDefeated',
        0x20025392: 'HoldStacks', 0x2001509b: 'SetRightHoldStack',
        0x20029da2: 'SetLeftHoldStack', 0x20029c67: 'LinkStackToSlot',
        0x2001a5cd: 'UnlinkStackFromSlot', 0x2002941a: 'EquipStackToSlot',
        0x20005ac4: 'GetRightEquipSlot', 0x20008607: 'GetLeftEquipSlot',
        0x201ce740: 'SlotArrayUnlink', 0x201ce6f0: 'SlotArrayRestore',
        0x201cf590: 'LinkStack', 0x20009750: 'StartEffect', 0x20013bba: 'CreateEffect',
        0x20012085: 'RoutineStartOutput', 0x2002448d: 'SPUStartOutput',
        0x20023c36: 'CreateSoundAndChannel',
        0x2036c270: 'SPUConstructor', 0x2036bf90: 'SPUInvalidate',
        0x2001e385: 'GetAudioModule', 0x20009a7f: 'SVMGetInstance',
        0x2002f432: 'SVMRead', 0x20022e7b: 'SVMFormatSampleName',
        0x2001b2b6: 'SVMGetAudioLanguage',
        0x20030841: 'MovementSetGoalGroundEntity', 0x20026fa3: 'MovementConstructor',
        0x20021468: 'MovementInvalidate', 0x200152c6: 'MovementRead',
        0x20006a55: 'MovementSetAlignmentTarget',
        0x2002e4fb: 'MovementGetStepHeight', 0x200357b5: 'DCCSetEnabled',
        0x20007ec3: 'ControlSetMovementConstraints',
        0x20011e41: 'ControlConstructor', 0x20016c61: 'ControlInvalidate',
        0x200024f0: 'ControlRead', 0x2001babd: 'DCCConstructor',
        0x2000ed59: 'DCCInvalidate', 0x20007a22: 'DCCRead',
        0x2000aa97: 'PartyGetMembers', 0x20019209: 'PartyConstructor',
        0x2000a17d: 'PartyRead', 0x200071c1: 'PartyReadProxyArray',
    }),
    'Engine_dll': ('Engine.dll', {
        0x3003e2c5: 'AudioChannelConstructor', 0x30029564: 'AudioSoundConstructor',
        0x30027dd1: 'EntitySetCollisionGroup',
        0x3003b098: 'PhysicsBufferSetCollisionGroup', 0x30008a71: 'PhysicsGetStateBuffer',
    }),
    'SharedBase_dll': ('SharedBase.dll', {
        0x10001d07: 'ObjectRefBaseConstructor', 0x10007c11: 'ObjectBaseConstructorUsedByRefBase',
    }),
}


def add_ragdoll(study, module):
    pe = PE((study / '00_Original_Runtime/scripts/Script_Game.dll').read_bytes())
    pattern = re.compile(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)')
    instructions = []
    path = study / '01_Decompiled_Code/scripts__Script_Game_dll/full_disassembly.asm'
    with path.open('rb') as stream:
        for number, line in enumerate(stream, 1):
            match = pattern.fullmatch(line.rstrip(b'\r\n'))
            if not match:
                continue
            va = int(match[1], 16)
            if not 0x100285c0 <= va <= 0x10028e36:
                continue
            raw = bytes.fromhex(match[2].decode())
            if pe.bytes(va, len(raw)) != raw:
                raise ValueError(f'RagDollDead instruction/PE mismatch: {va:x}')
            instructions.append({'va': f'{va:08x}', 'rva': f'{va-pe.base:x}',
                'fileOffset': pe.offset(va, len(raw)), 'bytes': raw.hex(),
                'instruction': match[3].decode('utf-8'), 'assemblyLine': number})
    raw = b''.join(bytes.fromhex(row['bytes']) for row in instructions)
    if len(instructions) != 555 or len(raw) != 2167:
        raise ValueError('Unexpected bounded RagDollDead body')
    module['methods'].append({'label': 'ZS_RagDollDead', 'entryVA': '0x10003292',
        'bodyVA': '0x100285c0', 'entryChain': [{'va': '10003292',
            'bytes': pe.bytes(0x10003292, 5).hex(), 'targetVA': '100285c0'}],
        'bodyRanges': '100285c0-10028e36', 'instructions': instructions,
        'instructionCount': len(instructions), 'bodyByteCount': len(raw),
        'bodyInstructionBytesSha256': sha(raw), 'reconstructedC': None,
        'scope': 'Explicit assembly slice. This LAB body has no functions.csv row or reconstructed C function.'})
    used = set()
    for method in module['methods']:
        for row in method['instructions']:
            used.update('0x'+value for value in re.findall(r'\[0x([0-9a-f]{8})\]', row['instruction']))
    module['imports'] = [row for row in pe.imports() if row['iatVA'] in used]
    module['stateLiterals'] = [
        {'va': f'0x{va:08x}', 'value': pe.string(va),
         'bytes': pe.bytes(va, len(pe.string(va))+1).hex()}
        for va in [0x1020a3d4, 0x1020a3cc, 0x1020a318, 0x1020b0dc, 0x1020b0c4]
    ]
    globals_ = []
    for va in [0x102213f0, 0x102213ec, 0x102213e8, 0x10221414,
               0x10221410, 0x1022140c, 0x10221408, 0x102217b0,
               0x102217ac, 0x102217a8, 0x102217a4, 0x10220e8c]:
        try:
            raw = pe.bytes(va, 4)
            backing = 'PE raw bytes'
        except ValueError:
            rva = va-pe.base
            if not any(start+raw_size <= rva and rva+4 <= start+virtual_size
                       for virtual_size, start, raw_size, offset in pe.sections):
                raise ValueError('Global is not PE loader zero-fill')
            raw = b'\0'*4
            backing = 'PE section virtual tail loader zero-fill'
        if raw != b'\0'*4:
            raise ValueError('Unexpected native death global loader seed')
        globals_.append({'va': f'0x{va:08x}', 'kind': 'float32' if va == 0x10220e8c else 'signed32',
                         'bytes': raw.hex(), 'backing': backing, 'value': 0})
    module['freshModuleGlobals'] = globals_


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[2] / 'assets/gothic3/combat/npc-death-native-evidence.json')
    args = parser.parse_args()
    modules = []
    for directory, (binary, targets) in TARGETS.items():
        module = audit_module(args.study, directory, binary, targets)
        if directory == 'scripts__Script_Game_dll':
            add_ragdoll(args.study, module)
        modules.append(module)
    result = {'schema': 'gothic3-npc-death-native-evidence-v1',
        'scope': 'Offline original-PE instruction audit; reconstructed C is decompiler output. No game code executed.',
        'sourceRoot': '<LOCAL_DESKTOP_STUDY>', 'modules': modules,
        'audit': {'methodCount': sum(len(module['methods']) for module in modules),
                  'instructionCount': sum(method['instructionCount'] for module in modules for method in module['methods']),
                  'uniqueInstructionCount': sum(len({row['va'] for method in module['methods'] for row in method['instructions']}) for module in modules),
                  'instructionCountScope': 'Method body references include repeated bodies selected through distinct aliases; uniqueInstructionCount deduplicates physical VAs within each module.',
                  'byteMismatchCount': 0, 'executedGameCode': False},
        'interpretations': {
            'schedule': 'SetTask installs a state; later processing and registered state dispatch are separate requirements.',
            'questDispatch': 'Manager OnNPCKilled/OnNPCDefeated iterates every registered quest in registry order; no type cache or queue in these bodies.',
            'killOrder': 'Cleanup, AIMode9, world quest event, credit/XP, NotifyEnclave, destination reset, plunder cleanup.',
            'defeatOrder': 'Cleanup, AIMode8, social branch, world quest event, credit/XP, last-fight state, destination reset, plunder cleanup.',
            'emptyHandProfile': 'Null slot1/2 arrays plus no stacks linked to those slots select effect-free DropHandItems HoldStacks invalid-index paths. The first FightTable row is(UseType0,UseType0,category2), so RemoveNonCombatItems returns0 without HoldStacks for empty hands. Item drop host remains required for nonempty selected slots.',
            'emptyEffectProfile': 'Empty cached EffectStart name returns true; changing a nonempty name with token0 to empty selects CreateEffect IsEmpty early return.',
            'svmBeforeKill': 'Humanoid RagDollDead calls DEAD category2 SVM helper, stores playing time at10220e8c, then Entity StartSaySVM before Kill. Return is ignored.',
            'svmHelperReturn': 'After an admitted CanSaySVM category2 gate, SaySVM returns1 independently of the ignored StartOutput bool. Script StartSaySVM/StartSayEx/PSRoutine StartOutput wrappers returnvoid.',
            'speechNullAudioProfile': 'StartOutput first allocates/constructs retained20-byte Channel and16-byte Sound wrappers atSPU+6c/+70. Either allocation null or Self null returns false; explicit AudioModule null returns false before camera/matrix/PlayStream3D. Script wrapper ignores the bool.',
            'speechObjectWords': 'Channel final words2067b6cc,0,1,0,0; Sound final words2067b744,0,1,0. Parent transient vtables and explicit scalar stores are retained in the instruction receipt.',
            'svmBootstrapRepresentation': 'Native first GetInstance sets bit207cd574, initializes two43-bucket maps207cd54c/207cd55c and readsData/Strings/SVMAdmin.dat; Read bool is ignored. Prepared browser arrays represent successfully read map contents; native bucket allocations and atexit lifetime are unported.',
            'resetInteractionGroundTarget': 'Navigation-valid ResetInteraction calls ResetInteract on current destination, then SetGroundBias(None). The latter writes SetGoalGroundEntity(None) when movementPS is nonnull; a null destination alone does not prove the helper effect-free.',
            'nullGroundTargetWrites': 'Movement SetGoalGroundEntity(None) readsStepHeight at+1c, storesfloat32 max(min(0,StepHeight),-StepHeight) at+388, then SetEntity(None) atproxy+338. Original constructor/Invalidate seedalignmentproxy+31c andgroundproxy+338 null andgoaloffset+388 zero; MovementRead version>=76 leavesconstructor values.',
            'partyMembers': 'Party GetMembers uses ownedproxyarray at+3c/count+40/capacity+44, cleaned of unresolvedproxies byScript wrapper. It does not infer members byscanning a selected subset ofbrowser actors. Nativeconstructor zeroesthreewords; nativeRead consumes serializedproxyarray.',
            'sourceVersusBrowserCapabilities': 'Selected bandit serialized files includeCollisionShape/RigidBody/VisualAnimation; browser host can explicitly bind missingnativeCollision/Physics/VisualAni capabilities, but this selected browser runtime branch is distinct fromthe original loadedgame.',
        },
        'reproduce': 'python tools/gothic3/read_npc_death_native_evidence.py --study <LOCAL_DESKTOP_STUDY>'}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, separators=(',', ':'))+'\n', encoding='utf-8')
    print(json.dumps({'path': args.output.name, 'bytes': args.output.stat().st_size,
                      'sha256': sha(args.output.read_bytes()), 'audit': result['audit']}))


if __name__ == '__main__':
    main()
