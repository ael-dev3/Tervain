import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { NativeScriptProcessingUnit } from '../../src/gothic3/script-routine';
import type { NativeRoutineEntity, NativeRoutineHost, NativeRoutineProperties, NativeSPUState } from '../../src/gothic3/script-routine';

function makeSpu(currentTask = 'ZS_Freeze', currentState = 'ZS_Freeze', detectingTask = false) {
  const properties: NativeRoutineProperties = { Routine: 'DailyRoutine', CurrentTask: currentTask, LastTask: 'PreviousTask',
    TaskPosition: 12, TaskTime: 3, StatePosition: 9, StateTime: 4, CurrentState: currentState, CurrentBreakBlock: 2 };
  const entity: NativeRoutineEntity = { id: 'actor', properties, npcPresent: true };
  const propertyHook = vi.fn<NonNullable<NativeRoutineHost['propertyHook']>>();
  const host: NativeRoutineHost = { resolveSelf: vi.fn(() => entity), propertyHook };
  const seed: NativeSPUState = { self: entity.id,
    frames: [{ position: 5, script: 'OldState', begin: false, object: null, callback: 'OldCallback', timeMilliseconds: 1500 }],
    frameCount: 1, task: currentTask, localCallback: 'OldTaskCallback', taskMilliseconds: 3000, stateMilliseconds: 4000,
    detectingTask, detectedTask: 'PreviousDetectedTask', activeInstruction: null };
  return { spu: new NativeScriptProcessingUnit(seed, host), entity, properties, host, propertyHook };
}

function expectAcceptedTask(currentTask: string, currentState: string, task: string) {
  const wrapped = makeSpu(currentTask, currentState);
  const lower = makeSpu(currentTask, currentState);
  const result = wrapped.spu.setTaskFromScriptRoutine(task);
  expect(result).toEqual(lower.spu.setTask(task, false));
  expect(result).toMatchObject({ supported: true, nativeReturnValue: null });
  expect(wrapped.spu.snapshot()).toEqual(lower.spu.snapshot());
  expect(wrapped.properties).toEqual(lower.properties);
  expect(wrapped.properties).toMatchObject({ LastTask: currentTask, CurrentTask: task, TaskPosition: 0, TaskTime: 0,
    StatePosition: 0, StateTime: 0, CurrentState: task, CurrentBreakBlock: 0 });
  expect(wrapped.spu.snapshot()).toMatchObject({ task, localCallback: '', taskMilliseconds: 0, stateMilliseconds: 0,
    frameCount: 1, frames: [expect.objectContaining({ script: task }), ...Array.from({ length: 4 }, () => expect.anything())] });
}

describe('Script PSRoutine::SetTask freeze wrapper', () => {
  it.each(['ZS_Follow', '', 'ZS_Unconscious_extra'])('delegates any requested task outside ZS_Freeze: %j', (task) => {
    expectAcceptedTask('CurrentOrdinaryTask', 'CurrentOrdinaryState', task);
  });

  it.each(['ZS_Follow', '', 'ZS_Unconscious_extra', 'PrefixZS_LieKnockDown', 'ZS_PiercedKO_extra', 'ZS_dead', 'ZS_stumble'])
    ('returns native void without effects when frozen and requested task is not an exception: %j', (task) => {
      const { spu, properties, propertyHook } = makeSpu();
      const before = spu.snapshot(), beforeProperties = structuredClone(properties), beforeRevision = spu.revision();
      expect(spu.setTaskFromScriptRoutine(task)).toEqual({ supported: true, nativeReturnValue: null,
        beforeRevision, afterRevision: beforeRevision, trace: [] });
      expect(spu.snapshot()).toEqual(before);
      expect(properties).toEqual(beforeProperties);
      expect(propertyHook).not.toHaveBeenCalled();
      expect(spu.failure()).toBeNull();
    });

  it.each(['ZS_Unconscious', 'ZS_LieKnockDown', 'ZS_LieKnockOut', 'ZS_SitKnockDown', 'ZS_PiercedKO'])
    ('allows the exact source frozen-task exception %s', (task) => {
      expectAcceptedTask('ZS_Freeze', 'ZS_Freeze', task);
    });

  it.each(['Dead', 'ZS_Dead', 'CustomDeadSuffix', 'Stumble', 'ZS_Stumble', 'PrefixStumbleSuffix'])
    ('searches the requested task for its source substring from index zero: %s', (task) => {
      expectAcceptedTask('ZS_Freeze', 'ZS_Freeze', task);
    });

  it('allows arbitrary requested tasks when the exact current state is the smalltalk partner loop', () => {
    expectAcceptedTask('ZS_Freeze', 'ZS_Smalltalk_Partner_Loop', 'ZS_Follow');
    const { spu } = makeSpu('ZS_Freeze', 'PrefixZS_Smalltalk_Partner_Loop');
    expect(spu.setTaskFromScriptRoutine('ZS_Follow')).toMatchObject({ supported: true, nativeReturnValue: null, trace: [] });
    expect(spu.snapshot().task).toBe('ZS_Freeze');
  });

  it('checks routine presence before the lower setter detection branch', () => {
    const { spu, entity, propertyHook } = makeSpu('ZS_Freeze', 'ZS_Freeze', true);
    entity.properties = null;
    const before = spu.snapshot();
    expect(spu.setTaskFromScriptRoutine('ZS_Dead')).toMatchObject({ supported: true, nativeReturnValue: null, trace: [] });
    expect(spu.snapshot()).toEqual(before);
    expect(propertyHook).not.toHaveBeenCalled();
    expect(spu.setTask('ZS_Dead')).toMatchObject({ supported: true, nativeReturnValue: null,
      trace: [{ operation: 'detected-task', value: 'ZS_Dead' }] });
    expect(spu.snapshot().detectedTask).toBe('ZS_Dead');
  });

  it('does not bypass the freeze gate during task detection, but preserves detection for allowed names', () => {
    const { spu, properties, propertyHook } = makeSpu('ZS_Freeze', 'ZS_Freeze', true);
    const beforeProperties = structuredClone(properties);
    expect(spu.setTaskFromScriptRoutine('ZS_Follow')).toMatchObject({ supported: true, nativeReturnValue: null, trace: [] });
    expect(spu.snapshot().detectedTask).toBe('PreviousDetectedTask');
    expect(spu.setTaskFromScriptRoutine('ZS_Dead')).toMatchObject({ supported: true, nativeReturnValue: null,
      trace: [{ operation: 'detected-task', value: 'ZS_Dead' }] });
    expect(properties).toEqual(beforeProperties);
    expect(propertyHook).not.toHaveBeenCalled();
    expect(spu.snapshot()).toMatchObject({ task: 'ZS_Freeze', detectedTask: 'ZS_Dead', detectingTask: true });
  });

  it('does not require lower write hooks for a rejected freeze request and retains lower preflight failures for accepted ones', () => {
    const { spu, host, properties } = makeSpu();
    host.propertyHook = undefined;
    const before = spu.snapshot(), beforeProperties = structuredClone(properties);
    expect(spu.setTaskFromScriptRoutine('ZS_Follow')).toMatchObject({ supported: true, nativeReturnValue: null, trace: [] });
    expect(spu.setTaskFromScriptRoutine('ZS_Dead')).toMatchObject({ supported: false, partial: false,
      reason: 'Complete ScriptRoutine property hooks are unresolved', trace: [] });
    expect(spu.snapshot()).toEqual(before);
    expect(properties).toEqual(beforeProperties);
    expect(spu.failure()).toBeNull();
  });

  it('preserves a delegated host failure and the already-applied lower setter prefix', () => {
    const { spu, properties, propertyHook } = makeSpu();
    propertyHook.mockImplementation((phase, _entity, _properties, property) => {
      if (phase === 'enter' && property === 'CurrentTask') throw new Error('CurrentTask notifier stopped');
    });
    const result = spu.setTaskFromScriptRoutine('ZS_Dead');
    expect(result).toMatchObject({ supported: false, partial: true, reason: 'CurrentTask notifier stopped' });
    expect(result.trace).toEqual([
      { operation: 'property-enter', entity: 'actor', property: 'LastTask' },
      { operation: 'property-write', entity: 'actor', property: 'LastTask', value: 'ZS_Freeze' },
      { operation: 'property-exit', entity: 'actor', property: 'LastTask' },
      { operation: 'property-enter', entity: 'actor', property: 'CurrentTask' },
    ]);
    expect(properties).toMatchObject({ LastTask: 'ZS_Freeze', CurrentTask: 'ZS_Freeze' });
    expect(spu.failure()).toBe('CurrentTask notifier stopped');
    const revision = spu.revision();
    expect(spu.setTaskFromScriptRoutine('ZS_Unconscious')).toMatchObject({ supported: false, partial: false,
      beforeRevision: revision, afterRevision: revision, trace: [] });
  });

  it('rejects unresolved wrapper operands and gate fields without changing state', () => {
    const { spu, properties } = makeSpu();
    const before = spu.snapshot();
    expect(spu.setTaskFromScriptRoutine(undefined as unknown as string)).toMatchObject({ supported: false, partial: false });
    properties.CurrentTask = undefined as unknown as string;
    expect(spu.setTaskFromScriptRoutine('ZS_Dead')).toMatchObject({ supported: false, partial: false,
      reason: 'Script routine CurrentTask is unresolved' });
    properties.CurrentTask = 'ZS_Freeze';
    properties.CurrentState = undefined as unknown as string;
    expect(spu.setTaskFromScriptRoutine('ZS_Dead')).toMatchObject({ supported: false, partial: false,
      reason: 'Frozen script routine CurrentState is unresolved' });
    expect(spu.snapshot()).toEqual(before);
  });

  it.each(['ZS_Dead\0ZS_Follow', 'ZS_Follow\0Dead'])('rejects unsupported embedded NUL CString operands: %s', (name) => {
    const { spu, properties } = makeSpu();
    properties.CurrentTask = 'ZS_Freeze';
    const before = spu.snapshot();
    expect(spu.setTaskFromScriptRoutine(name)).toMatchObject({ supported: false, partial: false,
      reason: 'Embedded NUL is outside the browser Script CString profile' });
    expect(spu.snapshot()).toEqual(before);
  });
});

describe('original-byte Script SetTask wrapper receipt', () => {
  it('binds the export alias, complete contiguous body and every source string literal', async () => {
    const root = resolve(process.cwd(), 'assets/gothic3/routines');
    const evidence = JSON.parse(await readFile(resolve(root, 'script-set-task-evidence.json'), 'utf8'));
    expect(evidence.input.sha256).toBe('9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08');
    const alias = Buffer.from(evidence.aliasBytes, 'hex');
    expect(alias[0]).toBe(0xe9);
    expect(parseInt(evidence.entry, 16) + 5 + alias.readInt32LE(1)).toBe(parseInt(evidence.body, 16));
    expect(evidence.instructions).toHaveLength(72);
    let nextAddress = parseInt(evidence.body, 16);
    const chunks: Buffer[] = [];
    for (const instruction of evidence.instructions) {
      expect(parseInt(instruction.address, 16)).toBe(nextAddress);
      const bytes = Buffer.from(instruction.bytes, 'hex');
      chunks.push(bytes); nextAddress += bytes.length;
    }
    const body = Buffer.concat(chunks);
    expect(body.length).toBe(214);
    expect(createHash('sha256').update(body).digest('hex')).toBe(evidence.bodySha256);
    expect(evidence.constants.map((constant: { value: string }) => constant.value)).toEqual([
      'ZS_Freeze', 'ZS_Smalltalk_Partner_Loop', 'ZS_Unconscious', 'ZS_LieKnockDown', 'ZS_LieKnockOut',
      'ZS_SitKnockDown', 'ZS_PiercedKO', 'Dead', 'Stumble',
    ]);
    for (const constant of evidence.constants) {
      expect(Buffer.from(constant.bytes, 'hex').toString('ascii')).toBe(constant.value + '\0');
      expect(evidence.instructions).toContainEqual(expect.objectContaining({ assembly: 'PUSH 0x' + constant.address }));
    }
    for (const excerpt of evidence.excerpts) {
      expect(createHash('sha256').update(await readFile(resolve(root, excerpt.path))).digest('hex')).toBe(excerpt.sha256);
    }
    expect(evidence.nativeBoundary).toMatchObject({ substringStartIndex: 0,
      delegate: { iat: '100b7c18', native: 'Game.dll::gCScriptRoutine_PS::AISetTask' },
      argumentDestructorIat: '100b8558' });
    expect(evidence.allInstructionBytesMatch).toBe(true);
  });
});
