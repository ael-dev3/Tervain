"""Recover installed character movement bodies and byte receipts offline.

python -B tools/gothic3/research_movement_state.py --study <LOCAL_DESKTOP_STUDY>
Python3.10+, standard library; never loads or executes a target DLL.
"""
from __future__ import annotations
import argparse
import json
import hashlib
import re
import struct
from pathlib import Path
from research_native_clock import collect
from research_native_combat import PE, INSTRUCTION, audit_assembly, save_json, sha
from research_native_inventory import native_imports
from research_routine_scripts import jump_target, cstring

ROOT=Path(__file__).resolve().parents[2]
GAME_SHA='b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'
METHODS={
    'SetMovementMode':'2022c810','CreateDependantPSets':'20024348',
    'CanWalkOnFloor':'20017233','FindFloorWaterCeiling':'20035a3f',
    'PutToGround':'20002068','StopMovement':'20032029','VisualAnimationModeProxy':'20020b71',
    'SetShapeByMode':'20021b07','SetSpeedByMode':'20001988','SetFlagsByMode':'20016509',
    'SetEffectsByMode':'2001b4b4','GetMovementIsControledByPlayer':'2000d963','SetGoalPosition':'2001d638',
    'CreateDependantShapes':'20009278','CalcQuadrupedDistances':'20034892','IsDead':'20007f31',
    'Read':'200152c6','Invalidate':'20021468','Create':'200362c8','OnPostRead':'2002e6f4',
    'GetSpeedByMode':'20024339',
    'OnProcess':'20032ec0','ProcessMovements':'2002c72d','ProcessControlled':'20031f3e',
    'Translation':'20014894','Rotation':'200324a2','Physics':'20020234','Sensor':'2000c5bd',
    'Animation':'2001c161','OnTouch':'20032849','OnUntouch':'20017332','OnIntersect':'20023790',
    'PreProcess':'200347b6','ResetProcessing':'2001e35d','GetProcessing':'2002db87',
    'IsProcessable':'2003579c','CalcNextSteps':'20033bae','SetCurrentVelocity':'202215e0',
    'SaveFrameStates':'20036c19','SensorPostProcess':'20015cf3',
    'SensorSetMovement':'20006659','SensorGetPosition':'20035f03','SensorGoalRotation':'200058df',
    'SensorSetGoalPosition':'2001c715','ContributeFloorActions':'2000535d','GetCurrentVelocity':'20023687',
    'ScriptAdminGetter':'2001afbe','ScriptAdminConstructor':'200098bd','ScriptAdminCallScript':'20010e10',
    'ScriptAdminRunScript':'2002ad92','AdminSPUSetSelf':'2001fa41','AdminSPUSetOther':'2002eb72',
    'AdminSPUSetIntParameter':'20016f72',
}
ENGINE_METHODS=('3032c8b0 3032ccf0 3032e3d0 3032e440 3032d370 3032f480 3030f3d0 '
    '3030d4e0 3030a040 3030f440 3030f3a0 3030fdc0 303103e0 30310710 30310350 '
    '30311ca0 30311ab0 30314220 303148f0 300cad60 30313f60 3032ddf0 3032e810 '
    '3003fc8d 3000e6f1 300129c2 30038050 3002467c 3003f98b')
SHARED_METHODS='10002833 100062ee 100035e4 100020a9 10005402 1000443a 10001609 100062f8 10008d23 10002437'

def assembly_only(study, pe, out, short, module, start, end, name):
    path=study/'01_Decompiled_Code'/module/'full_disassembly.asm'
    rows=[];first=None
    for number,line in enumerate(path.open(encoding='utf8'),1):
        m=INSTRUCTION.match(line)
        if m and start<=int(m[1],16)<=end:
            first=first or number;rows.append(line)
    text=''.join(rows);ins=audit_assembly(text,pe)
    if not ins or int(ins[-1]['address'],16)+len(bytes.fromhex(ins[-1]['bytes']))!=end+1:
        raise ValueError('Assembly-only body boundary differs: '+name)
    dest=out/'sources'/short/f'{start:08x}.asm.txt';dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(text,encoding='utf8',newline='\n')
    raw=pe.at(start,end-start+1)
    gaps=[]
    for left,right in zip(ins,ins[1:]):
        a=int(left['address'],16)+len(bytes.fromhex(left['bytes']));b=int(right['address'],16)
        if a!=b:gaps.append({'address':f'{a:08x}','bytes':pe.at(a,b-a).hex()})
    return {'id':f'{short}:{start:08x}','entry':f'{start:08x}','name':name,
        'catalogStatus':'absent from functions.csv; assembly-only, no C claim',
        'assemblyExcerpt':dest.relative_to(out).as_posix(),'assemblyExcerptSha256':sha(dest),
        'studyAssemblyLine':first,'studyAssemblySha256':sha(path),'bodyRanges':f'{start:08x}-{end:08x}',
        'bodyBytes':len(raw),'bodySha256':hashlib.sha256(raw).hexdigest(),
        'instructionCount':len(ins),'instructionBytes':sum(len(bytes.fromhex(r['bytes'])) for r in ins),
        'unreachableAlignmentBytes':gaps,'allInstructionBytesMatchOriginalPE':True},ins

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--study',type=Path,required=True)
    args=ap.parse_args();study=args.study.resolve()
    out=ROOT/'assets/gothic3/movement-state';public=ROOT/'public/gothic3/movement-state'
    out.mkdir(parents=True,exist_ok=True);public.mkdir(parents=True,exist_ok=True)
    binary=study/'00_Original_Runtime/Game.dll'
    if sha(binary)!=GAME_SHA:raise ValueError('Unsupported installed Game.dll')
    pe=PE(binary)
    functions,instructions=collect(study,'Game','Game_dll',' '.join(METHODS.values()),pe,out)
    module_pes={'Game':pe};module_receipts=[{'path':'00_Original_Runtime/Game.dll','bytes':binary.stat().st_size,'sha256':GAME_SHA}]
    for name,selected,expected in [('Engine',ENGINE_METHODS,'d49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'),
        ('SharedBase',SHARED_METHODS,'5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214')]:
        path=study/'00_Original_Runtime'/f'{name}.dll'
        if sha(path)!=expected:raise ValueError('Unsupported original '+name)
        module_pes[name]=source_pe=PE(path)
        more,more_ins=collect(study,name,name+'_dll',selected,source_pe,out)
        functions+=more;instructions.update(more_ins)
        module_receipts.append({'path':f'00_Original_Runtime/{name}.dll','bytes':path.stat().st_size,'sha256':expected})
    sg_binary=study/'00_Original_Runtime/scripts/Script_Game.dll'
    if sha(sg_binary)!='2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1':
        raise ValueError('Unsupported installed Script_Game')
    sg=PE(sg_binary)
    module_pes['Script_Game']=sg
    module_receipts.append({'path':'00_Original_Runtime/scripts/Script_Game.dll','bytes':sg_binary.stat().st_size,'sha256':sha(sg_binary)})
    for start,end,name in [(0x100029f5,0x100029f9,'OnMovementModeChanged trampoline'),
                            (0x100d07c0,0x100d0cad,'OnMovementModeChanged'),
                            (0x101720d0,0x10172121,'OnMovementModeChanged registration initializer')]:
        rec,ins=assembly_only(study,sg,out,'Script_Game','scripts__Script_Game_dll',start,end,name)
        functions.append(rec);instructions[rec['id']]=ins
    # Pin complete catalog body ranges separately from instruction excerpts.
    # Ghidra body membership can have multiple ranges; no alignment-gap bytes
    # are silently added to a catalog function's body count.
    for function in functions:
        source_pe=module_pes[function['id'].split(':',1)[0]]
        ranges=[]
        for item in function['bodyRanges'].split(';'):
            left,right=(int(value,16) for value in item.split('-'))
            raw=source_pe.at(left,right-left+1)
            ranges.append({'start':f'{left:08x}','end':f'{right:08x}',
                           'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
        if sum(item['bytes'] for item in ranges)!=function['bodyBytes']:
            raise ValueError('Catalog byte-range count differs: '+function['id'])
        function['originalPERanges']=ranges
    entries={name:{'entry':entry,'body':f'{jump_target(pe,int(entry,16))[0]:08x}',
                  'jumpTrail':jump_target(pe,int(entry,16))[1]} for name,entry in METHODS.items()}
    imports=native_imports(pe)
    used={int(h,16) for key,rows in instructions.items() if key.startswith('Game:') for row in rows
          for h in __import__('re').findall(r'0x([0-9a-f]{8})',row['assembly'])}&imports.keys()
    sg_imports=native_imports(sg)
    sg_used={int(h,16) for key,rows in instructions.items() if key.startswith('Script_Game:') for row in rows
          for h in re.findall(r'0x([0-9a-f]{8})',row['assembly'])}&sg_imports.keys()
    tables=[]
    for name,address,length in [('speedTargets',0x20221fac,32),('mode1Through14SpeedMap',0x20221fcc,14)]:
        raw=pe.at(address,length)
        tables.append({'name':name,'address':f'{address:08x}','bytes':raw.hex(),'sha256':hashlib.sha256(raw).hexdigest()})
    if pe.at(0x20221fac,32).hex()!='961f2220481f22203a1f2220561f2220741f2220851f2220641f2220961f2220' or \
       pe.at(0x20221fcc,14).hex()!='0001020703040707070207070506':
        raise ValueError('Original movement speed switch table differs')
    for name,module,address,length in [('defaultSpeed','Game',0x2065b1c4,4),
        ('negativeOne','Game',0x2065c04c,4),('rigidBodyVtable','Engine',0x3085ffcc,0x200),
        ('BodyFlagContainerVtable','Engine',0x3085fe0c,32),('PhysicsUnitScale','Engine',0x30ab3be0,4),
        ('actorVelocityGameScale','Engine',0x30820370,8),('ScriptAdminVtable','Game',0x2069bebc,0xc0)]:
        raw=module_pes[module].at(address,length)
        tables.append({'name':name,'module':module,'address':f'{address:08x}','bytes':raw.hex(),'sha256':hashlib.sha256(raw).hexdigest()})
    vtable_pins=[]
    for module,base,slots in [('Engine',0x3085ffcc,{0x16c:0x30039f09,0x18c:0x3004494f,
        0x1d4:0x3001fe97,0x1f0:0x30044cc4,0x1f4:0x3002c2ff,0x1f8:0x3002108f}),
        ('Engine',0x3085fe0c,{0x1c:0x300468b7}),('Game',0x2069bebc,{0xbc:0x20010e10})]:
        for slot,expected in slots.items():
            raw=module_pes[module].at(base+slot,4)
            if struct.unpack('<I',raw)[0]!=expected:raise ValueError('Original vtable target differs')
            body,trail=jump_target(module_pes[module],expected)
            vtable_pins.append({'module':module,'table':f'{base:08x}','slot':slot,'bytes':raw.hex(),
                'entry':f'{expected:08x}','body':f'{body:08x}','jumpTrail':trail})
    if struct.unpack('<f',pe.at(0x2065b1c4,4))[0]!=1 or struct.unpack('<f',pe.at(0x2065c04c,4))[0]!=-1 or \
       struct.unpack('<f',module_pes['Engine'].at(0x30ab3be0,4))[0]!=0.009999999776482582 or \
       struct.unpack('<d',module_pes['Engine'].at(0x30820370,8))[0]!=100:
        raise ValueError('Original movement/physics numeric constant differs')
    registration_pins=[]
    for address,expected in [(0x101720d0,'83ec08'),(0x101720da,'6880322110'),
                             (0x101720e5,'6864322110'),(0x101720f5,'68f5290010'),
                             (0x10172104,'e8dd0de9ff')]:
        raw=sg.at(address,len(bytes.fromhex(expected)))
        if raw.hex()!=expected:raise ValueError('Original callback registration pin differs')
        registration_pins.append({'address':f'{address:08x}','bytes':expected})
    targets=struct.unpack('<8I',pe.at(0x20221fac,32));mapping=pe.at(0x20221fcc,14)
    speeds={str(n+1):f'{targets[index]:08x}' for n,index in enumerate(mapping)}
    literals=[]
    for module,address in [('Game',0x20688314),('Script_Game',0x10213264),('Script_Game',0x10213280),('Engine',0x308210d8)]:
        text,raw=cstring(module_pes[module],address)
        literals.append({'module':module,'address':f'{address:08x}','text':text,'bytes':raw})
    if literals[0]['text']!='OnMovementModeChanged' or literals[1]['text']!='OnMovementModeChanged':
        raise ValueError('Original movement callback name differs')
    evidence={'schema':'gothic3-movement-state-native-evidence-v1',
        'scope':'Installed PE instruction byte recovery, no native execution/gameplay validation',
        'nativeCodeExecuted':False,'testsRun':False,
        'inputBinaries':module_receipts,
        'entries':entries,'functions':functions,'instructions':instructions,'tables':tables,'literals':literals,
        'vtableTargets':vtable_pins,'registrationPins':registration_pins,
        'imports':[{'module':'Game','iat':f'{v:08x}',**imports[v]} for v in sorted(used)]+
            [{'module':'Script_Game','iat':f'{v:08x}',**sg_imports[v]} for v in sorted(sg_used)]}
    for name in ['Engine','SharedBase']:
        imps=native_imports(module_pes[name])
        selected={int(h,16) for key,rows in instructions.items() if key.startswith(name+':') for row in rows
                  for h in re.findall(r'0x([0-9a-f]{8})',row['assembly'])}&imps.keys()
        evidence['imports'] += [{'module':name,'iat':f'{v:08x}',**imps[v]} for v in sorted(selected)]
    save_json(out/'native-evidence.json',evidence)
    rules={'schema':'gothic3-movement-state-rules-v1','gameSha256':GAME_SHA,'entries':entries,
           'scope':'Examined installed movement semantics; renderer/explorer movement is not a native substitute',
           'speedModeTargets':speeds,'speedSourceOffsets':{'2':76,'3':68,'5':72,'6':132,'10':68,'13':136},
           'defaultSpeed':struct.unpack('<f',pe.at(0x2065b1c4,4))[0],
           'onMovementModeChanged':{'entry':'100029f5','body':'100d07c0','ordinaryNoEffectDomain':
              'new mode outside 7,10,12,13; previous outside 7,12,13 (previous 10 returns without effects)',
              'dispatcher':'Game getter200a4bb0, captured ScriptAdmin vtable2069bebc+bc→20010e10→2034dbe0',
              'dispatcherEffects':'CallScript rechecks game-running and entity-processing; updates the embedded admin SPU Self, Other and IntParameter before RunScript. Ordinary body inlining is available only inside an actual captured dispatcher, after original registration selection and wrapper capture.'},
           'physics':{'rigidBodyVtable':'3085ffcc','flagContainerAssignment':'3032f480',
             'setVelocity':'3032c8b0','getVelocity':'3032ccf0','gravity':'3032d370',
             'pendingVelocityCommand':4,'addFlagCommand':11,'removeFlagCommand':12,
             'velocityCommandDeduplicated':True,'flagCommandsDeduplicated':False,
             'flagPayloadSelection':'last element, pop after NxActor call; command list is FIFO',
             'numericPayloadConstructorInitialized':False,'freshActor':None},
           'callbackProfile':'Explicit captured original ScriptAdmin dispatcher must preserve source gates and embedded admin SPU writes. Original body helper requires installed registration 100029f5→100d07c0, copied Self/Other wrappers and matching captured owner CharacterMovement PS; arbitrary callback replacement/source-only entity membership is unsupported.',
           'precisionProfile':'Finite binary32 fields; nearest-even; HasZeroMagnitude tests all x87 PC24/53/64 widths and rejects disagreements; other extended arithmetic boundaries explicit',
           'unimplemented':['loaded CharacterMovement full reflected/stream state materialization',
             'CreateDependantShapes default/clone/weapontrigger/cache construction','remaining SetShapeByMode shape reconfiguration',
             'floor/water/ceiling TraceRay collision and PutToGround','full controlled translation/rotation and braking/acceleration',
             'NxActor, unlocked physical buffer application, whole scene locking/critical-section scheduling',
             'full ScriptAdmin module selection/cache, CallScript embedded SPU state and RunScript provider integration',
             'fall/swim/slide callback, effects and animation services','complete OnProcess/OnIntersect scene lifecycle']}
    save_json(out/'runtime-rules.json',rules);save_json(public/'runtime-rules.json',rules)
    files=[ROOT/'src/gothic3/movement-state.ts',Path(__file__).resolve()]
    files += [ROOT/'src/gothic3'/name for name in ['player-state.ts','dialogue.ts','script-routine.ts']]
    files += [ROOT/'tools/gothic3'/name for name in ['research_native_clock.py','research_native_combat.py',
        'research_native_inventory.py','research_routine_scripts.py','research_spu_instructions.py']]
    files += sorted(p for folder in [out,public] for p in folder.rglob('*') if p.is_file()
                    and p.name!='implementation-receipt.json')
    receipt={'schema':'gothic3-movement-state-implementation-receipt-v1',
        'scope':'Current implementation/producer/source/output byte pins; no runtime validation claim',
        'nativeCodeExecuted':False,'testsRun':False,
        'files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in files]}
    save_json(out/'implementation-receipt.json',receipt)
    print(json.dumps({'functions':len(functions),'instructions':sum(len(x) for x in instructions.values()),
        'instructionBytes':sum(len(bytes.fromhex(row['bytes'])) for rows in instructions.values() for row in rows),
        'receiptSha256':sha(out/'implementation-receipt.json')}))

if __name__=='__main__':main()
