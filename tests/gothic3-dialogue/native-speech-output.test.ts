import { describe, expect, it } from 'vitest';
import { NativeSpeechAllocation, NativeSpeechOutput } from '../../src/gothic3/native-speech-output';
import type { NativeSpeechOutputCheckpoint, NativeSpeechOutputHost } from '../../src/gothic3/native-speech-output';
import type { NativeKnowledge } from '../../src/gothic3/combat';
import { NativeInstructionProxyRegistry, NativeInstructionScheduler, NativeSPUFrameSchedule } from '../../src/gothic3/script-instructions';
import type { NativeRoutineEntity, NativeSPUSchedulerAccess } from '../../src/gothic3/script-routine';

const known = <T>(value: T): NativeKnowledge<T> => ({ status: 'known', value, source: 'test:explicit-native-speech-host' });
function fixture(checkpoint?: NativeSpeechOutputCheckpoint) {
  const entity: NativeRoutineEntity = { id: 'bandit', npcPresent: true, properties: {
    Routine: '', CurrentTask: '', LastTask: '', TaskPosition: 0, TaskTime: 0,
    StatePosition: 0, StateTime: 0, CurrentState: '', CurrentBreakBlock: 0 } };
  let selfPresent = true, audio: NativeKnowledge<object | null> = known(null);
  const calls: string[] = [], failAllocation = new Set<string>();
  let allocator: NativeSpeechOutputHost['allocate'] = (kind, bytes, line) => {
    calls.push('allocate:' + kind + ':' + bytes + ':' + line);
    return known(failAllocation.has(kind) ? null : new NativeSpeechAllocation('bandit:death-speech-' + kind, bytes));
  };
  const host: NativeSpeechOutputHost = {
    allocate: (...args) => allocator(...args),
    audioModule: () => { calls.push('audio'); return audio; },
  };
  const scheduler = NativeInstructionScheduler.fromOriginalFactory({
    resolveSelf: id => { calls.push('resolve-self'); return selfPresent && id === entity.id ? entity : null; },
    propertyHook: () => {},
  }, NativeSPUFrameSchedule.fromOriginalLoader(), { precisionBits: 53, rounding: 'nearest-even', capturedNativeEnvironment: false },
  new NativeInstructionProxyRegistry([]), { entityProcessingEnabled: () => true, script: () => null });
  scheduler.spu.setSelfEntity(entity.id);
  if (checkpoint) scheduler.spu.dispatchScheduler(access => { access.writeStorage('audioChannel', checkpoint.channel?.id ?? null); return null; });
  const speech = checkpoint ? NativeSpeechOutput.fromCheckpoint(host, checkpoint) : NativeSpeechOutput.fromOriginalFactory(host);
  speech.bind(scheduler.spu); calls.length = 0;
  let lastAccess: NativeSPUSchedulerAccess | null = null;
  const start = (): NativeKnowledge<boolean> => {
    let output!: NativeKnowledge<boolean>;
    const dispatch = scheduler.spu.dispatchScheduler(access => {
      lastAccess = access; output = speech.startOutput('SVM_Hum_Warrior_Hard_DEAD_English.wav', scheduler.spu, access); return null;
    });
    expect(dispatch.supported).toBe(true); return output;
  };
  return { entity, scheduler, speech, host, calls, failAllocation, start,
    access: () => lastAccess!, setSelf: (value: boolean) => { selfPresent = value; },
    setAudio: (value: NativeKnowledge<object | null>) => { audio = value; },
    setAllocator: (value: NativeSpeechOutputHost['allocate']) => { allocator = value; } };
}

describe('native speech object allocation and null AudioModule branch', () => {
  it('executes exact channel/sound constructor writes before returning native false', () => {
    const f = fixture(), before = f.scheduler.spu.snapshot();
    expect(f.start()).toMatchObject({ status: 'known', value: false });
    expect(f.calls).toEqual(['allocate:channel:20:188', 'allocate:sound:16:193', 'resolve-self', 'audio']);
    expect(f.speech.snapshot()).toEqual({ schema: 'gothic3-native-speech-output-v1',
      channel: { id: 'bandit:death-speech-channel', bytes: 20, words: [0x2067b6cc, 0, 1, 0, 0] },
      sound: { id: 'bandit:death-speech-sound', bytes: 16, words: [0x2067b744, 0, 1, 0] } });
    const stores = f.speech.executionSnapshot()!.trace.filter(row => row.operation === 'word-store');
    expect(stores.map(row => [row.kind, row.offset, row.value])).toEqual([
      ['channel', 0, 0x100e7e1c], ['channel', 4, 0], ['channel', 0, 0x100e7eac], ['channel', 8, 1],
      ['channel', 12, 0], ['channel', 16, 0], ['channel', 0, 0x308232f4], ['channel', 0, 0x2067b6cc],
      ['sound', 0, 0x100e7e1c], ['sound', 4, 0], ['sound', 0, 0x100e7eac], ['sound', 8, 1],
      ['sound', 0, 0x308233ec], ['sound', 12, 0], ['sound', 0, 0x2067b744],
    ]);
    expect(f.scheduler.spu.schedulerSnapshot()?.audioChannel).toBe('bandit:death-speech-channel');
    expect(f.scheduler.spu.snapshot()).toEqual(before); // Allocation does not schedule instructions/tasks.
    expect(f.speech.executionSnapshot()).toMatchObject({ outcome: 'complete', nativeReturnValue: false });
  });

  it('still allocates sound after failed channel allocation and retries only the missing object', () => {
    const f = fixture(); f.failAllocation.add('channel');
    expect(f.start()).toMatchObject({ status: 'known', value: false });
    expect(f.calls).toEqual(['allocate:channel:20:188', 'allocate:sound:16:193']);
    expect(f.speech.snapshot().channel).toBeNull(); expect(f.speech.snapshot().sound).not.toBeNull();
    expect(f.scheduler.spu.schedulerSnapshot()?.audioChannel).toBeNull();
    f.failAllocation.delete('channel'); f.calls.length = 0;
    expect(f.start()).toMatchObject({ status: 'known', value: false });
    expect(f.calls).toEqual(['allocate:channel:20:188', 'resolve-self', 'audio']);
  });

  it('returns false for an absent Self after allocation without looking up AudioModule', () => {
    const f = fixture(); f.setSelf(false);
    expect(f.start()).toMatchObject({ status: 'known', value: false });
    expect(f.calls).toEqual(['allocate:channel:20:188', 'allocate:sound:16:193', 'resolve-self']);
    expect(f.speech.snapshot().sound).not.toBeNull();
  });

  it('retains the allocation prefix and blocks retry if AudioModule is unknown', () => {
    const f = fixture(); f.setAudio({ status: 'unknown', reason: 'Module registry is unavailable' });
    expect(f.start()).toMatchObject({ status: 'unknown' });
    expect(f.speech.executionSnapshot()).toMatchObject({ outcome: 'partial', nativeReturnValue: null });
    expect(f.speech.snapshot().channel).not.toBeNull();
    const count = f.calls.length; f.setAudio(known(null));
    expect(f.start()).toMatchObject({ status: 'unknown' });
    expect(f.calls).toHaveLength(count); expect(f.speech.executionSnapshot()?.outcome).toBe('blocked');
  });

  it('keeps a non-null AudioModule unsupported without inventing playback', () => {
    const f = fixture(); f.setAudio(known({ actual: 'module' }));
    expect(f.start()).toMatchObject({ status: 'unknown', reason: expect.stringContaining('PlayStream3D') });
    expect(f.speech.executionSnapshot()?.trace.at(-1)?.operation).toBe('resolve-audio-module');
  });

  it('rejects stale and foreign scheduler scope capabilities before mutation', () => {
    const f = fixture(), foreign = fixture(); f.start();
    const before = f.speech.snapshot(), count = f.calls.length;
    expect(f.speech.startOutput('sample', f.scheduler.spu, f.access())).toMatchObject({ status: 'unknown' });
    foreign.scheduler.spu.dispatchScheduler(access => {
      expect(f.speech.startOutput('sample', foreign.scheduler.spu, access)).toMatchObject({ status: 'unknown' }); return null;
    });
    expect(f.speech.snapshot()).toEqual(before); expect(f.calls).toHaveLength(count);
  });

  it('rejects reused actual allocation storage and reports only the applied channel prefix', () => {
    const f = fixture();
    const reused = new NativeSpeechAllocation('shared', 20);
    f.setAllocator(() => known(reused));
    expect(f.start()).toMatchObject({ status: 'unknown', reason: 'Fresh actual speech allocation required' });
    expect(f.speech.snapshot().channel?.id).toBe('shared'); expect(f.speech.snapshot().sound).toBeNull();
    expect(f.speech.executionSnapshot()?.outcome).toBe('partial');
  });

  it('does not transfer an already-owned channel allocation to a different SPU', () => {
    const first = fixture(), second = fixture(), channel = new NativeSpeechAllocation('retained-channel', 20);
    first.setAllocator((kind, bytes) => known(kind === 'channel' ? channel : new NativeSpeechAllocation('first-sound', bytes)));
    expect(first.start()).toMatchObject({ status: 'known', value: false });
    second.setAllocator(() => known(channel));
    expect(second.start()).toMatchObject({ status: 'unknown', reason: 'Fresh actual speech allocation required' });
    expect(second.speech.snapshot()).toMatchObject({ channel: null, sound: null });
    expect(first.speech.snapshot().channel?.id).toBe('retained-channel');
  });

  it('restores owned allocations with the same SPU channel identity and skips reallocation', () => {
    const f = fixture(); f.start(); const saved = f.speech.snapshot();
    const restored = fixture(saved);
    expect(restored.start()).toMatchObject({ status: 'known', value: false });
    expect(restored.calls).toEqual(['resolve-self', 'audio']); expect(restored.speech.snapshot()).toEqual(saved);
    const unbound = fixture();
    expect(() => NativeSpeechOutput.fromCheckpoint(unbound.host, saved).bind(unbound.scheduler.spu)).toThrow('identity differ');
  });

  it('validates exact selected object words, distinct identities, and snapshot structure', () => {
    const f = fixture(); f.start(); const saved = f.speech.snapshot();
    expect(NativeSpeechOutput.validateCheckpoint(saved)).toBe(true);
    const changed = { ...saved, channel: { ...saved.channel!, words: [...saved.channel!.words] } };
    changed.channel.words[4] = 1; expect(NativeSpeechOutput.validateCheckpoint(changed)).toBe(false);
    const reused = { ...saved, sound: { ...saved.sound!, id: saved.channel!.id } };
    expect(NativeSpeechOutput.validateCheckpoint(reused)).toBe(false);
    expect(NativeSpeechOutput.validateCheckpoint({ ...saved, unproven: true })).toBe(false);
    expect(() => NativeSpeechOutput.fromCheckpoint(f.host, reused)).toThrow('Invalid selected native speech checkpoint');
  });
});
