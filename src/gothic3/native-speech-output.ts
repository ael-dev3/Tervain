/** Original SPU CreateSoundAndChannel and StartOutput's explicit null-audio
 * branch. These are owned port allocations, not pointers into a running game.
 * Native playback, camera work and audio-module discovery require other hosts.
 */
import type { NativeKnowledge } from './combat';
import type { NativeScriptProcessingUnit, NativeSPUSchedulerAccess } from './script-routine';

const SCHEMA = 'gothic3-native-speech-output-v1';
const CHANNEL_VTABLE = 0x2067b6cc, SOUND_VTABLE = 0x2067b744;
export interface NativeSpeechAllocationSnapshot {
  readonly id: string;
  readonly bytes: 20 | 16;
  readonly words: readonly number[];
}
export interface NativeSpeechOutputCheckpoint {
  readonly schema: typeof SCHEMA;
  readonly channel: NativeSpeechAllocationSnapshot | null;
  readonly sound: NativeSpeechAllocationSnapshot | null;
}
export interface NativeSpeechOutputHost {
  /** Actual port allocation, or the native allocation-failed null result. */
  allocate(kind: 'channel' | 'sound', bytes: 20 | 16, sourceLine: 0xbc | 0xc1): NativeKnowledge<NativeSpeechAllocation | null>;
  /** Explicit runtime binding. Unknown is not interpreted as absent. */
  audioModule(): NativeKnowledge<object | null>;
}
export interface NativeSpeechOutputTrace {
  readonly operation: 'allocate' | 'word-store' | 'pointer-store' | 'resolve-self' | 'resolve-audio-module';
  readonly kind?: 'channel' | 'sound';
  readonly id?: string | null;
  readonly offset?: number;
  readonly value?: number;
  readonly source: string;
}
export interface NativeSpeechOutputExecution {
  readonly outcome: 'complete' | 'unsupported' | 'partial' | 'blocked';
  readonly nativeReturnValue: boolean | null;
  readonly trace: readonly NativeSpeechOutputTrace[];
  readonly reason: string | null;
}
const owners = new WeakMap<NativeSpeechAllocation, NativeSpeechOutput>();
function u32(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffffffff; }
function fact<T>(value: NativeKnowledge<T>, name: string): T {
  if (value.status !== 'known' || !value.source) throw new Error(name + ': ' + (value.status === 'unknown' ? value.reason : 'source receipt missing'));
  return value.value;
}
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function allocationShape(value: unknown, kind: 'channel' | 'sound'): value is NativeSpeechAllocationSnapshot {
  const bytes = kind === 'channel' ? 20 : 16;
  if (!record(value) || Object.keys(value).sort().join(',') !== 'bytes,id,words' || typeof value.id !== 'string' || !value.id ||
      value.bytes !== bytes || !Array.isArray(value.words) ||
      value.words.length !== bytes / 4 || !value.words.every(u32)) return false;
  const words = value.words;
  const expected = kind === 'channel' ? [CHANNEL_VTABLE, 0, 1, 0, 0] : [SOUND_VTABLE, 0, 1, 0];
  // This host supports only the constructed wrappers and null AudioModule;
  // accepting arbitrary mutated/FMOD-backed objects would invent capabilities.
  return expected.every((word, index) => word === words[index]);
}

/** Concrete allocated byte storage. Constructors below explicitly overwrite
 * every native word; allocator zero-fill does not stand in for those writes. */
export class NativeSpeechAllocation {
  private readonly storage: Uint32Array;
  constructor(readonly id: string, readonly bytes: 20 | 16) {
    if (!id || typeof id !== 'string' || (bytes !== 20 && bytes !== 16)) throw new Error('Actual speech allocation identity/size required');
    this.storage = new Uint32Array(bytes / 4);
  }
  store(offset: number, value: number): void {
    if (!Number.isInteger(offset) || offset < 0 || offset % 4 || offset >= this.bytes || !u32(value)) throw new Error('Invalid physical speech object word');
    this.storage[offset / 4] = value;
  }
  snapshot(): NativeSpeechAllocationSnapshot { return { id: this.id, bytes: this.bytes, words: Array.from(this.storage) }; }
}

export class NativeSpeechOutput {
  private spu: NativeScriptProcessingUnit | null = null;
  private channel: NativeSpeechAllocation | null = null;
  private sound: NativeSpeechAllocation | null = null;
  private blocked: string | null = null;
  private active = false;
  private trace: NativeSpeechOutputTrace[] = [];
  private last: NativeSpeechOutputExecution | null = null;
  private constructor(private readonly host: NativeSpeechOutputHost, seed: NativeSpeechOutputCheckpoint) {
    if (!NativeSpeechOutput.validateCheckpoint(seed)) throw new Error('Invalid selected native speech checkpoint');
    const restore = (snapshot: NativeSpeechAllocationSnapshot | null): NativeSpeechAllocation | null => {
      if (snapshot === null) return null;
      const allocation = new NativeSpeechAllocation(snapshot.id, snapshot.bytes);
      snapshot.words.forEach((value, index) => allocation.store(index * 4, value));
      owners.set(allocation, this); return allocation;
    };
    this.channel = restore(seed.channel); this.sound = restore(seed.sound);
  }
  /** Game2036c270→2036bf90 writes SPU+6c and+70 null. */
  static fromOriginalFactory(host: NativeSpeechOutputHost): NativeSpeechOutput {
    return new NativeSpeechOutput(host, { schema: SCHEMA, channel: null, sound: null });
  }
  static fromCheckpoint(host: NativeSpeechOutputHost, checkpoint: NativeSpeechOutputCheckpoint): NativeSpeechOutput {
    return new NativeSpeechOutput(host, checkpoint);
  }
  static validateCheckpoint(value: unknown): value is NativeSpeechOutputCheckpoint {
    return record(value) && Object.keys(value).sort().join(',') === 'channel,schema,sound' && value.schema === SCHEMA &&
      (value.channel === null || allocationShape(value.channel, 'channel')) &&
      (value.sound === null || allocationShape(value.sound, 'sound')) &&
      (value.channel === null || value.sound === null || (value.channel as NativeSpeechAllocationSnapshot).id !== (value.sound as NativeSpeechAllocationSnapshot).id);
  }
  bind(spu: NativeScriptProcessingUnit): void {
    if (this.spu) throw new Error('Native speech output is already bound');
    const storage = spu.schedulerSnapshot();
    if (!storage || storage.audioChannel !== (this.channel?.id ?? null)) throw new Error('SPU+6c and retained speech channel identity differ');
    this.spu = spu;
  }
  snapshot(): NativeSpeechOutputCheckpoint {
    return { schema: SCHEMA, channel: this.channel?.snapshot() ?? null, sound: this.sound?.snapshot() ?? null };
  }
  executionSnapshot(): NativeSpeechOutputExecution | null { return this.last === null ? null : structuredClone(this.last); }
  failure(): string | null { return this.blocked; }
  private note(value: NativeSpeechOutputTrace, access: NativeSPUSchedulerAccess): void {
    this.trace.push(value);
    access.record({ operation: 'speech-' + value.operation, ...(value.id === undefined ? {} : { value: value.id }) });
  }
  private construct(allocation: NativeSpeechAllocation, kind: 'channel' | 'sound', access: NativeSPUSchedulerAccess): void {
    const store = (offset: number, value: number, source: string): void => {
      allocation.store(offset, value); this.note({ operation: 'word-store', kind, id: allocation.id, offset, value, source }, access);
    };
    // Exact constructor write order, including transient parent vtables.
    store(0, 0x100e7e1c, 'SharedBase:1004a1c2');
    store(4, 0, 'SharedBase:1004a5b7');
    store(0, 0x100e7eac, 'SharedBase:1004a5ba');
    store(8, 1, 'SharedBase:1004a5c0');
    if (kind === 'channel') {
      store(12, 0, 'Engine:300f103b'); store(16, 0, 'Engine:300f103e');
      store(0, 0x308232f4, 'Engine:300f1041'); store(0, CHANNEL_VTABLE, 'Game:203679f8');
    } else {
      store(0, 0x308233ec, 'Engine:300f5449'); store(12, 0, 'Engine:300f544f');
      store(0, SOUND_VTABLE, 'Game:20367a22');
    }
  }
  private allocate(kind: 'channel' | 'sound', access: NativeSPUSchedulerAccess): NativeSpeechAllocation | null {
    const bytes = kind === 'channel' ? 20 : 16, sourceLine = kind === 'channel' ? 0xbc : 0xc1;
    this.note({ operation: 'allocate', kind, source: kind === 'channel' ? 'Game:203679e8' : 'Game:20367a12' }, access);
    const allocation = fact(this.host.allocate(kind, bytes, sourceLine), 'native speech allocation');
    if (allocation !== null) {
      if (!(allocation instanceof NativeSpeechAllocation) || allocation.bytes !== bytes || owners.has(allocation) ||
          allocation.id === this.channel?.id || allocation.id === this.sound?.id) throw new Error('Fresh actual speech allocation required');
      owners.set(allocation, this); this.construct(allocation, kind, access);
    }
    return allocation;
  }
  /** Called inside an owned SPU scheduler scope. A known false is an executed
   * native result, including allocation writes; unknown means execution stopped.
   * Script PSRoutine ignores this native bool; no fake successful playback.
   */
  startOutput(sample: string, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): NativeKnowledge<boolean> {
    if (this.spu !== spu || !spu.ownsSchedulerAccess(access)) return { status: 'unknown', reason: 'Unbound/stale/cross-SPU speech output' };
    if (this.blocked) {
      this.last = { outcome: 'blocked', nativeReturnValue: null, trace: [], reason: this.blocked };
      return { status: 'unknown', reason: this.blocked };
    }
    if (this.active) return { status: 'unknown', reason: 'Reentrant native speech output is unsupported' };
    this.active = true; this.trace = [];
    try {
      if (typeof sample !== 'string') throw new Error('Actual native output CString required');
      if (access.storage().audioChannel !== (this.channel?.id ?? null)) throw new Error('SPU+6c changed outside its retained speech allocation');
      if (this.channel === null) {
        this.channel = this.allocate('channel', access);
        access.writeStorage('audioChannel', this.channel?.id ?? null);
        this.note({ operation: 'pointer-store', kind: 'channel', id: this.channel?.id ?? null, offset: 0x6c, source: 'Game:20367a02' }, access);
      }
      if (this.sound === null) {
        this.sound = this.allocate('sound', access);
        this.note({ operation: 'pointer-store', kind: 'sound', id: this.sound?.id ?? null, offset: 0x70, source: 'Game:20367a2c' }, access);
      }
      let result = false;
      if (this.channel !== null && this.sound !== null) {
        this.note({ operation: 'resolve-self', source: 'Game:2036b7fd' }, access);
        if (access.resolveSelf() !== null) {
          this.note({ operation: 'resolve-audio-module', source: 'Game:2036b80e' }, access);
          if (fact(this.host.audioModule(), 'actual AudioModule binding') !== null) throw new Error('Non-null AudioModule requires the unported PlayStream3D/camera host');
        }
      }
      this.last = { outcome: 'complete', nativeReturnValue: result, trace: [...this.trace], reason: null };
      return { status: 'known', value: result, source: 'Game:2036b7e0-null-audio-or-self-or-allocation-branch' };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error), partial = this.trace.length > 0;
      if (partial) this.blocked = reason;
      this.last = { outcome: partial ? 'partial' : 'unsupported', nativeReturnValue: null, trace: [...this.trace], reason };
      return { status: 'unknown', reason };
    } finally { this.active = false; }
  }
}
