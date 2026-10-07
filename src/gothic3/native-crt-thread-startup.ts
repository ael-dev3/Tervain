/** Source-owned Engine/Game __mtinit / PTD prefix. Platform indices and procedures
 * are retained capabilities; original image pointers resolve only to the same
 * physical cold objects. This does not claim a completed CRT process attach. */
import sourceText from '../../assets/gothic3/crt-bootstrap/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import { admitGameCrtStartupSource } from './native-game-crt-startup-source';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryBacking } from './native-memory-admin';
import type { NativeCrtLocalProcedure, NativeCrtLocalAllocProcedure, NativeCrtLocalGetProcedure, NativeCrtThreadDestructor } from './native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
interface Rules {
  schema: string; inputs: { Engine?: string; Game?: string };
  methods: Record<string, { entry: string; body: string; bodyInstructionBytesSha256: string }>;
  coldGlobals: Record<string, { module: string; address: string; bytes: number; raw: string; knownMask: string; scope: string; liveValueCaptured: boolean }>;
  constBytes: Rules['coldGlobals'];
}
const engineSource = JSON.parse(sourceText) as Rules;
const methods = [
  ['mtInit', '3067e2d9', '7aacad9fbf61f8d4f1d6061667043166d1dcf737aa46af55341660df2a17a7d1'],
  ['tlsAllocFallback', '3067df49', 'd9b998919205eca626e9eddae72543afff8b2a41e54ed3246f84ef8bb0ab0468'],
  ['tlsGetterDispatcher', '3067df52', 'a75b242739081e9be5b75ff40ac7e65797c7939927606c1ee04bf20caa2f8467'],
  ['getCachedPtdGetter', '3067df6d', '4f8f58f22d81ba7dea25b4e18b675412427d81d693c721f847cf17b2239ef9c3'],
  ['getPtdNoExit', '3067e0b4', 'e1d845fa4627d959d76b76fb0c27f9549c58dd1d0cda28cb91a450b0680a60ec'],
  ['initPtd', '3067dff5', '1d3fafc835b08dbbf5872d74c582da0586266e973ec93c8c93ee9ad6fe3629b8'],
  ['addLocaleRef', '3067a1f7', '9706e6bbc0429da66f46b4cbc7861c90f09630499332bfe8df6aec0ef42bc2bd'],
  ['unlockInitPtd', '3067e0ab', 'b83f780a136dd3b717c3e1c50dbc8688b1207a8b4eb47dd74a2471f54443d2a7'],
  ['mtTerm', '3067dfb8', 'b22510471669493136f845abaf9729bfbcad9770e2fa84037544609cb96c6af3'],
  ['freePtd', '3067e264', 'df90c9d5f4fea19adf529e14f2e78943bdaf0d0cdb24447bcdc88f12a5443c5c'],
  ['freePtdCallback', '3067e143', '6bb6065d74a62996658c934cea529db094a70690b7dfe4d4620e403e52253c34'],
  ['removeLocaleRef', '3067a27d', '36eec9d044699bea0e802af2fdfb42e2c942565cf70b8059273591720b250854'],
  ['errno', '306783df', '97c2bebf1410da27de8a8ccbbca41fdfd47eb2fe8af11020043dd2924f857b2a'],
  ['getFlsIndex', '3067df67', '791c0a27f7ce93d075e776504b3cfc495bb750412ab9c13846104fae08496593'],
  ['unlockFreePtdMbc', '3067e24f', 'ca5fe38352daad738734b706c26b495832069f347693228e86bd85f2b549161a'],
  ['unlockFreePtdLocale', '3067e25b', 'e0befcc9952e6d969dae7d43e84967889856fa1b56cf0202cfecb542d80b312e'],
] as const;
const coldBytes: Record<string, string> = {
  "procedureSlots": "00000000000000000000000000000000",
  "defaultLocale": "01000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f850ad30000000000000000000000000f850ad30000000000000000000000000f850ad30000000000000000000000000f850ad30000000000000000000000000f850ad300000000000000000000000000100000001000000000000000000000000000000e842ad30000000000000000040308930c8348930483689303043ad30",
  "currentLocale": "0051ad30",
  "timeLocale": "8c6c8830b02d8930ac2d8930a82d8930a42d8930a02d89309c2d8930942d89308c2d8930842d8930782d89306c2d8930642d8930582d8930542d8930502d89304c2d8930482d8930442d8930402d89303c2d8930382d8930342d8930302d89302c2d8930282d8930202d8930142d89300c2d8930042d8930442d8930fc2c8930f42c8930ec2c8930e02c8930d82c8930cc2c8930c02c8930bc2c8930b82c8930ac2c8930982c89308c2c89300904000001000000000000003043ad30",
  "mbcObject": "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000101010101010101010101010101010101010101010101010101000000000000020202020202020202020202020202020202020202020202020200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006162636465666768696a6b6c6d6e6f707172737475767778797a0000000000004142434445464748494a4b4c4d4e4f505152535455565758595a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "fallbackErrors": "0c00000008000000",
  "exceptionData": "050000c00b000000000000001d0000c00400000000000000960000c004000000000000008d0000c008000000000000008e0000c008000000000000008f0000c00800000000000000900000c00800000000000000910000c00800000000000000920000c00800000000000000930000c00800000000000000"
};
function storage(label: string, address: string, bytes: number, constant = false): NativeHeapObjectViews {
  const receipt = (constant ? engineSource.constBytes : engineSource.coldGlobals)[label];
  const expected = label === 'localeSentinel' ? '43000000' : coldBytes[label];
  if (!receipt || receipt.module !== 'Engine' || receipt.address !== address || receipt.bytes !== bytes ||
      receipt.raw.length !== bytes * 2 || receipt.raw !== expected || receipt.knownMask !== 'ff'.repeat(bytes) || receipt.scope !== 'cold-original-image' || receipt.liveValueCaptured !== false) throw new Error('Selected physical CRT thread storage differs: ' + label);
  return new NativeHeapObjectViews({ identity: Object.freeze({}), bytes: Uint8Array.from(receipt.raw.match(/../g)!, byte => parseInt(byte, 16)), knownMask: new Uint8Array(bytes).fill(255), freed: false });
}
function sub(fields: NativeHeapObjectViews, offset: number, size: number): NativeHeapObjectViews {
  return new NativeHeapObjectViews(fields.backing, fields.bytes.byteOffset - fields.backing.bytes.byteOffset + offset, size);
}
function canonical(fields: NativeHeapObjectViews, size: number): void {
  const backing = fields.backing, region = 'region' in backing ? backing.region : backing;
  const position = ('region' in backing ? backing.offset : 0) + fields.bytes.byteOffset - backing.bytes.byteOffset;
  if (fields.bytes.length !== size || fields.knownMask.length !== size || backing.freed || region.freed || position < 0 || position + size > region.bytes.length ||
      fields.bytes.buffer !== region.bytes.buffer || fields.bytes.byteOffset !== region.bytes.byteOffset + position || fields.knownMask.buffer !== region.knownMask.buffer || fields.knownMask.byteOffset !== region.knownMask.byteOffset + position) throw new Error('Actual canonical live CRT thread storage required');
}
function samePointer(a: NativeHeapObjectViews | null, b: NativeHeapObjectViews | null): boolean {
  if (a === null || b === null) return a === b;
  canonical(a, a.bytes.length); canonical(b, b.bytes.length);
  const ca = 'region' in a.backing ? a.backing.region : a.backing, cb = 'region' in b.backing ? b.backing.region : b.backing;
  return ca === cb && a.bytes.buffer === b.bytes.buffer && a.bytes.byteOffset === b.bytes.byteOffset &&
    a.knownMask.buffer === b.knownMask.buffer && a.knownMask.byteOffset === b.knownMask.byteOffset;
}
interface SourceTlsAllocator extends NativeCrtLocalAllocProcedure {
  readonly identity: object; readonly owner: object; readonly address: string;
}
interface SourceThreadDestructor extends NativeCrtThreadDestructor {
  readonly identity: object; readonly owner: object;
}
interface State {
  tlsFallbackAllocator: SourceTlsAllocator;
  destructor: SourceThreadDestructor;
  physical: Readonly<{ procedureSlots: NativeHeapObjectViews; defaultLocale: NativeHeapObjectViews; currentLocale: NativeHeapObjectViews;
    timeLocale: NativeHeapObjectViews; mbcObject: NativeHeapObjectViews; mbcRefCounter: NativeHeapObjectViews;
    fallbackErrors: NativeHeapObjectViews; exceptionData: NativeHeapObjectViews; localeSentinel: NativeHeapObjectViews }>;
  phase: 'cold' | 'initializing' | 'ready' | 'null' | 'terminated'; boundary: string | null;
  active: Set<string | object>; failed: Set<string | object>; trace: string[]; records: Set<NativeHeapObjectViews>;
}
const shared = new WeakMap<NativeModuleCrtOwner, State>();
interface PtdStorageProof {
  readonly backing: NativeHeapObjectViews['backing'];
  readonly backingIdentity: object;
  readonly backingBytes: Uint8Array; readonly backingMasks: Uint8Array;
  readonly root: NativeMemoryBacking; readonly rootIdentity: object;
  readonly rootBytes: Uint8Array; readonly rootMasks: Uint8Array;
  readonly bytes: Uint8Array; readonly masks: Uint8Array; readonly view: DataView;
  readonly position: number;
}
const ptdStorage = new WeakMap<NativeHeapObjectViews, PtdStorageProof>();
export interface NativeCrtThreadStartupHost { readonly crt: NativeModuleCrtOwner; initPointers(): NativeValue<void>; }
export class NativeCrtThreadStartup {
  private readonly source: Rules;
  private readonly s: State;
  readonly physical: State['physical'];
  private readonly destructor: NativeCrtThreadDestructor;
  /** Read-only membership proof for an already initialized CRT PTD. This never
   * acquires TLS storage, initializes a record or replays startup. */
  static canonicalPtdForCrt(crt: NativeModuleCrtOwner, value: object): NativeValue<NativeHeapObjectViews> {
    if (!NativeModuleCrtOwner.isConstructedOwner(crt)) return unknown('Actual constructed CRT owner required for PTD proof');
    const state = shared.get(crt);
    if (!state || state.phase !== 'ready' || state.boundary !== null ||
        !(value instanceof NativeHeapObjectViews) || !state.records.has(value)) {
      return unknown('Actual ready same-CRT retained PTD record required');
    }
    const proof = ptdStorage.get(value);
    if (!proof) return unknown('Actual retained PTD storage proof required');
    const backing = value.backing, root = 'region' in backing ? backing.region : backing;
    if (backing !== proof.backing || backing.identity !== proof.backingIdentity || backing.freed ||
        backing.bytes !== proof.backingBytes || backing.knownMask !== proof.backingMasks ||
        root !== proof.root || root.identity !== proof.rootIdentity || root.freed ||
        root.bytes !== proof.rootBytes || root.knownMask !== proof.rootMasks ||
        value.bytes !== proof.bytes || value.knownMask !== proof.masks || value.view !== proof.view ||
        value.bytes.length !== 532 || value.knownMask.length !== 532 || root.bytes.length !== root.knownMask.length ||
        proof.position < 0 || proof.position + 532 > root.bytes.length ||
        proof.position !== ('region' in backing ? backing.offset : 0) + value.bytes.byteOffset - backing.bytes.byteOffset ||
        value.bytes.buffer !== root.bytes.buffer || value.bytes.byteOffset !== root.bytes.byteOffset + proof.position ||
        value.knownMask.buffer !== root.knownMask.buffer || value.knownMask.byteOffset !== root.knownMask.byteOffset + proof.position ||
        value.view.buffer !== value.bytes.buffer || value.view.byteOffset !== value.bytes.byteOffset || value.view.byteLength !== 532) {
      return unknown('Actual retained live PTD physical storage required');
    }
    return known(value);
  }
  constructor(readonly host: NativeCrtThreadStartupHost) {
    const source = this.source = host.crt.module === 'Engine' ? engineSource : host.crt.sourceProfile.bootstrapRules as Rules;
    if (host.crt.module === 'Game') admitGameCrtStartupSource(source,
      [...methods.map(([label]) => label), 'initPointers', 'mtInitLocks', 'localeFree', 'free']);
    else if (source.schema !== 'gothic3-crt-bootstrap-rules-v1' || source.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
        methods.some(([label, address, hash]) => source.methods[label]?.entry !== address || source.methods[label]?.body !== address || source.methods[label]?.bodyInstructionBytesSha256 !== hash)) throw new Error('Selected Engine CRT thread methods differ');
    let state = shared.get(host.crt);
    if (!state) {
      const game = host.crt.module === 'Game';
      const physical = (label: string, address: string, bytes: number, constant = false) => {
        if (!game) return storage(label, address, bytes, constant);
        const fields = NativeModuleCrtOwner.canonicalImageForOwner(host.crt, label);
        if (!fields.known) throw new Error(fields.reason);
        return fields.value;
      };
      const mbcObject = physical('mbcObject', '30ad4bd0', 544);
      const alias = source.coldGlobals.mbcRefCounter;
      if (!alias || alias.address !== (game ? '207b2620' : '30ad4bd0') || alias.bytes !== 4 || alias.raw !== source.coldGlobals.mbcObject!.raw.slice(0, 8)) throw new Error('Source MBC refcounter alias differs');
      const tlsFallbackAllocator: SourceTlsAllocator = Object.freeze({ kind: 'alloc',
        name: game ? 'TlsAllocFallback20467e49' : 'TlsAllocFallback3067df49',
        address: source.methods.tlsAllocFallback!.entry, identity: Object.freeze({}), owner: host.crt.identity,
        // Both original compiler wrappers ignore the destructor argument and
        // invoke the lower TlsAlloc IAT. Their source pointer identities differ.
        invoke: (_callback: NativeCrtThreadDestructor) => host.crt.host.platform.tlsAlloc?.() ?? unknown('Actual TlsAlloc capability required'),
      });
      const destructor: SourceThreadDestructor = Object.freeze({
        address: source.methods.freePtdCallback!.entry as NativeCrtThreadDestructor['address'],
        identity: Object.freeze({}), owner: host.crt.identity,
        invoke: (value: object | null) => this.freePtdCallback(value as NativeHeapObjectViews | null),
      });
      state = { tlsFallbackAllocator, destructor, physical: Object.freeze({ procedureSlots: physical('procedureSlots', '30af7144', 16),
        defaultLocale: physical('defaultLocale', '30ad5100', 216), currentLocale: physical('currentLocale', '30ad51d8', 4),
        timeLocale: physical('timeLocale', '30ad4330', 188), mbcObject, mbcRefCounter: sub(mbcObject, 0, 4),
        fallbackErrors: physical('fallbackErrors', '30ad4560', 8), exceptionData: physical('exceptionData', '30ad5410', 120), localeSentinel: physical('localeSentinel', '30ad50f8', 4, true) }),
        phase: 'cold', boundary: null, active: new Set(), failed: new Set(), trace: [], records: new Set() };
      shared.set(host.crt, state);
    }
    this.s = state; this.physical = state.physical;
    this.destructor = state.destructor;
  }
  private get crt() { return this.host.crt; }
  private name(label: string): string { return label + this.source.methods[label]!.entry; }
  private imageAddress(label: string): number {
    return parseInt((this.source.coldGlobals[label] ?? this.source.constBytes[label])!.address, 16);
  }
  private get platform() { return this.crt.host.platform; }
  private gate(reason: string): never { this.s.trace.push(reason + '.boundary'); throw new Error('Unowned ' + reason); }
  private run<T>(name: string, execute: () => T, cleanup = false, key: string | object = name): NativeValue<T> {
    if (this.s.boundary && (!cleanup || this.s.failed.has(key))) return unknown(this.s.boundary);
    if (this.s.active.has(key)) { this.s.boundary ??= 'Reentrant CRT thread operation ' + name; return unknown(this.s.boundary); }
    this.s.active.add(key);
    try { const value = execute(); if (this.s.boundary && !cleanup) return unknown(this.s.boundary); return known(value); }
    catch (error) { const reason = name + ': ' + (error instanceof Error ? error.message : String(error)); this.s.boundary ??= reason; this.s.failed.add(key); return unknown(reason); }
    finally { this.s.active.delete(key); }
  }
  private call<T>(name: string, execute: () => NativeValue<T>, retain?: (value: T) => void): T {
    const before = this.s.boundary; this.s.trace.push(name + '.attempt'); const result = execute();
    if (result.known) retain?.(result.value); if (this.s.boundary !== before) throw new Error(this.s.boundary!);
    if (!result.known) throw new Error(name + ': ' + result.reason); this.s.trace.push(name); return result.value;
  }
  private local<K extends NativeCrtLocalProcedure['kind']>(value: object | null, kind: K): Extract<NativeCrtLocalProcedure, {kind:K}> {
    const procedure = value as NativeCrtLocalProcedure | null;
    const ownedSourceAllocator = kind === 'alloc' && value === this.s.tlsFallbackAllocator;
    if (!procedure || procedure.kind !== kind || (!ownedSourceAllocator && !this.platform.ownsLocalStorageProcedure?.(procedure))) this.gate('Actual same-module source or same-platform retained CRT local-storage ' + kind + ' procedure');
    return procedure as Extract<NativeCrtLocalProcedure, {kind:K}>;
  }
  private decoded<K extends NativeCrtLocalProcedure['kind']>(offset: number, kind: K): Extract<NativeCrtLocalProcedure, {kind:K}> {
    return this.local(this.call('decodePointer.slot' + offset, () => this.crt.decodePointer(this.physical.procedureSlots.pointer<object>(offset).get())), kind);
  }
  private ptd(value: object): NativeHeapObjectViews {
    if (!(value instanceof NativeHeapObjectViews)) throw new Error('Actual retained PTD pointer required'); canonical(value, 532);
    if (![...this.s.records].some(record => record.backing === value.backing && record.bytes.byteOffset === value.bytes.byteOffset && record.knownMask.byteOffset === value.knownMask.byteOffset)) throw new Error('Actual same-CRT PTD allocation required');
    return value;
  }
  private calloc(): NativeHeapObjectViews | null {
    const backing = this.call('callocCrt(1,532)', () => this.crt.callocCrt(1, 532), value => {
      if (!value) return;
      const record = new NativeHeapObjectViews(value, 0, 532), backing = record.backing;
      const root = 'region' in backing ? backing.region : backing;
      canonical(record, 532);
      ptdStorage.set(record, Object.freeze({ backing, backingIdentity: backing.identity,
        backingBytes: backing.bytes, backingMasks: backing.knownMask, root, rootIdentity: root.identity,
        rootBytes: root.bytes, rootMasks: root.knownMask, bytes: record.bytes, masks: record.knownMask,
        view: record.view, position: 'region' in backing ? backing.offset : 0 }));
      this.s.records.add(record);
    });
    return backing ? [...this.s.records].find(record => record.backing === backing)! : null;
  }
  private originalPointer(fields: NativeHeapObjectViews, offset: number, address: number, target: NativeHeapObjectViews): NativeHeapObjectViews | null {
    try { const pointer = fields.pointer<NativeHeapObjectViews>(offset).get(); if (pointer !== null) canonical(pointer, pointer.bytes.length); return pointer; }
    catch (error) { if (fields.readUnsigned(offset) === address) return target; throw error; }
  }
  private currentLocale(): NativeHeapObjectViews | null { return this.originalPointer(this.physical.currentLocale, 0, this.imageAddress('defaultLocale'), this.physical.defaultLocale); }
  private counter(fields: NativeHeapObjectViews, offset: number, delta: 1 | -1): number {
    return this.call('Interlocked' + (delta === 1 ? 'Increment' : 'Decrement') + '(+' + offset.toString(16) + ')', () => this.platform.interlockedCounter?.(sub(fields, offset, 4), delta) ?? unknown('Actual physical Interlocked endpoint required'));
  }
  private localeRefs(locale: NativeHeapObjectViews, delta: 1 | -1): void {
    canonical(locale, 216); this.counter(locale, 0, delta);
    for (const offset of [0xb0, 0xb8, 0xb4, 0xc0]) { const pointer = locale.pointer<NativeHeapObjectViews>(offset).get(); if (pointer) this.counter(pointer, 0, delta); }
    for (let cursor = 0x50; cursor <= 0xa0; cursor += 16) {
      // Source static locale sentinel is a physical pointer comparison; it has
      // no fabricated callable browser address.
      const narrowIsSentinel = locale.knownMask.subarray(cursor - 8, cursor - 4).every(mask => mask === 255) ? locale.readUnsigned(cursor - 8) === this.imageAddress('localeSentinel') : samePointer(locale.pointer<NativeHeapObjectViews>(cursor - 8).get(), this.physical.localeSentinel);
      if (!narrowIsSentinel) { const pointer = locale.pointer<NativeHeapObjectViews>(cursor).get(); if (pointer) this.counter(pointer, 0, delta); }
      const wideIsNonNull = locale.knownMask.subarray(cursor - 4, cursor).every(mask => mask === 255) ? locale.readUnsigned(cursor - 4) !== 0 : locale.pointer<object>(cursor - 4).get() !== null;
      if (wideIsNonNull) { const pointer = locale.pointer<NativeHeapObjectViews>(cursor + 4).get(); if (pointer) this.counter(pointer, 0, delta); }
    }
    const time = this.originalPointer(locale, 0xd4, this.imageAddress('timeLocale'), this.physical.timeLocale);
    if (!time) throw new Error('Source locale time pointer required'); this.counter(time, 0xb4, delta);
  }
  private initializePtd(record: NativeHeapObjectViews): void {
    this.ptd(record);
    const module = this.call('GetModuleHandleA(KERNEL32.DLL).initPtd', () => this.platform.getWin32ModuleHandle?.('KERNEL32.DLL') ?? unknown('Actual PTD module query required'));
    record.pointer<NativeHeapObjectViews>(0x5c).set(this.physical.exceptionData); record.writeUnsigned(0x14, 1); this.s.trace.push('ptd.exceptionAndSeed.store');
    if (module !== null && this.call('pointerEncodingAvailability.initPtd', () => this.crt.pointerEncodingAvailable())) {
      for (const [name, offset] of [['EncodePointer', 0x1f8], ['DecodePointer', 0x1fc]] as const) {
        const procedure = this.call('GetProcAddress(' + name + ').initPtd', () => this.platform.getWin32Procedure?.(module, name) ?? unknown('Actual PTD pointer procedure query required'));
        if (procedure !== null && procedure.name !== name) throw new Error('Matching PTD pointer procedure required'); record.pointer<object>(offset).set(procedure);
      }
    }
    record.writeUnsigned(0x70, 1); record.writeUnsigned(0xc8, 0x43, 1); record.writeUnsigned(0x14b, 0x43, 1);
    record.pointer<NativeHeapObjectViews>(0x68).set(this.physical.mbcObject); this.counter(this.physical.mbcObject, 0, 1);
    this.call('lock12.initPtd', () => this.crt.lock(12));
    record.pointer<NativeHeapObjectViews>(0x6c).set(null); const locale = this.currentLocale(); record.pointer<NativeHeapObjectViews>(0x6c).set(locale); if (!locale) throw new Error('Actual current locale pointer required'); this.localeRefs(locale, 1);
    // An ownership boundary does not represent a native SEH unwind. Preserve
    // the physical held lock if the protected callee cannot return.
    this.call(this.name('unlockInitPtd'), () => this.crt.unlock(12));
  }
  private finishPtd(record: NativeHeapObjectViews): void {
    this.initializePtd(record); const id = this.call('GetCurrentThreadId', () => this.platform.getCurrentThreadId?.() ?? unknown('Actual thread ID service required'));
    record.writeUnsigned(4, 0xffffffff); record.writeUnsigned(0, id); this.s.trace.push('ptd.threadId.store');
  }
  initialize(): NativeValue<number> {
    if (this.s.phase === 'ready') return known(1); if (this.s.phase === 'null') return known(0);
    if (this.s.phase === 'terminated') return unknown('CRT thread storage lifetime has ended');
    if (this.s.phase === 'initializing') { this.s.boundary ??= 'Reentrant ' + this.crt.module + ' __' + this.name('mtInit'); return unknown(this.s.boundary); }
    return this.run(this.name('mtInit'), () => {
      this.s.phase = 'initializing';
      const fail = () => { this.call('mtTerm.failure', () => this.terminate()); this.s.phase = 'null'; return 0; };
      const module = this.call('GetModuleHandleA(KERNEL32.DLL)', () => this.platform.getWin32ModuleHandle?.('KERNEL32.DLL') ?? unknown('Actual MT module registry required'));
      if (module === null) return fail();
      const selected: (NativeCrtLocalProcedure | null)[] = [];
      for (const [offset, name] of [[0, 'FlsAlloc'], [4, 'FlsGetValue'], [8, 'FlsSetValue'], [12, 'FlsFree']] as const) {
        const value = this.call('GetProcAddress(' + name + ')', () => this.platform.getWin32Procedure?.(module, name) ?? unknown('Actual FLS export lookup required'));
        if (value !== null && (!('kind' in value) || !this.platform.ownsLocalStorageProcedure?.(value))) throw new Error('Actual same-platform FLS procedure required');
        selected.push(value as NativeCrtLocalProcedure | null); this.physical.procedureSlots.pointer<object>(offset).set(value); this.s.trace.push('procedure.slot' + offset + '.publish');
      }
      if ([0, 4, 8].some(offset => this.physical.procedureSlots.pointer<object>(offset).get() === null) || selected[3] === null) {
        const fallback = this.platform.tlsProcedures; if (!fallback) this.gate('actual IAT TLS procedure capabilities');
        for (const [offset, value] of [[4, fallback.get], [0, this.s.tlsFallbackAllocator], [8, fallback.set], [12, fallback.free]] as const) { this.physical.procedureSlots.pointer<object>(offset).set(value); this.s.trace.push('procedure.slot' + offset + '.fallback'); }
      }
      const index = this.call('TlsAlloc.getter', () => this.platform.tlsAlloc?.() ?? unknown('Actual TlsAlloc capability required'), value => this.crt.physical.crtTlsIndexes.writeUnsigned(4, value));
      this.s.trace.push('tlsGetterIndex.publish'); if (index === 0xffffffff) { this.s.phase = 'null'; return 0; }
      const getter = this.local(this.physical.procedureSlots.pointer<object>(4).get(), 'get');
      if (!this.call('TlsSetValue.unencodedGetter', () => this.platform.tlsSetValue?.(index, getter) ?? unknown('Actual TlsSetValue getter publication required'))) { this.s.phase = 'null'; return 0; }
      this.call(this.name('initPointers'), () => this.host.initPointers());
      for (const offset of [0, 4, 8, 12]) { const encoded = this.call('encodePointer.slot' + offset, () => this.crt.encodePointer(this.physical.procedureSlots.pointer<object>(offset).get())); this.physical.procedureSlots.pointer<object>(offset).set(encoded); this.s.trace.push('procedure.slot' + offset + '.encode'); }
      if (this.call(this.name('mtInitLocks'), () => this.crt.initLocks()) === 0) return fail();
      const allocator = this.decoded(0, 'alloc');
      const ptdIndex = this.call('localStorageAlloc(destructor' + this.source.methods.freePtdCallback!.entry + ')', () => allocator.invoke(this.destructor), value => this.crt.physical.crtTlsIndexes.writeUnsigned(0, value));
      this.s.trace.push('ptdIndex.publish'); if (ptdIndex === 0xffffffff) return fail();
      const record = this.calloc(); if (record === null) return fail();
      const publicationIndex = this.crt.physical.crtTlsIndexes.readUnsigned(0);
      if (!this.call('localStorageSet.ptd', () => this.decoded(8, 'set').invoke(publicationIndex, record))) return fail();
      this.s.trace.push('ptd.publish'); this.finishPtd(record); this.s.phase = 'ready'; return 1;
    });
  }
  private cachedGetter(): NativeCrtLocalGetProcedure {
    const index = this.crt.physical.crtTlsIndexes.readUnsigned(4);
    let getter = this.call('TlsGetValue.cachedGetter', () => this.platform.tlsGetValue?.(index) ?? unknown('Actual cached getter TLS endpoint required'));
    if (getter === null) { getter = this.decoded(4, 'get'); const publicationIndex = this.crt.physical.crtTlsIndexes.readUnsigned(4); this.call('TlsSetValue.cachedGetter', () => this.platform.tlsSetValue?.(publicationIndex, getter) ?? unknown('Actual cached getter TLS store required')); }
    return this.local(getter, 'get');
  }
  getPtdNoExit(): NativeValue<NativeHeapObjectViews | null> {
    return this.run(this.name('getPtdNoExit'), () => {
      const saved = this.call('GetLastError.getPtd', () => this.platform.getWin32LastError?.() ?? unknown('Actual Win32 GetLastError required'));
      const index = this.crt.physical.crtTlsIndexes.readUnsigned(0);
      const existing = this.call('cachedGetter.getPtd', () => this.cachedGetter().invoke(index));
      let record = existing === null ? this.calloc() : this.ptd(existing);
      if (existing === null && record !== null) {
        const publicationIndex = this.crt.physical.crtTlsIndexes.readUnsigned(0);
        if (!this.call('localStorageSet.newPtd', () => this.decoded(8, 'set').invoke(publicationIndex, record))) { this.call('free.newPtdSetFailure', () => this.crt.free(record!.backing as NativeMemoryBacking)); record = null; }
        else this.finishPtd(record);
      }
      this.call('SetLastError.getPtd', () => this.platform.setWin32LastError?.(saved) ?? unknown('Actual Win32 SetLastError required')); return record;
    });
  }
  errnoSlot(): NativeValue<NativeHeapObjectViews> {
    return this.run(this.name('errno'), () => { const record = this.call('getPtdNoExit.errno', () => this.getPtdNoExit()); return record ? sub(record, 8, 4) : sub(this.physical.fallbackErrors, 0, 4); });
  }
  private releasePtd(record: NativeHeapObjectViews | null): void {
    if (!record) return; this.ptd(record);
    for (const offset of [0x24, 0x2c, 0x34, 0x3c, 0x44, 0x48]) { const value = record.pointer<NativeMemoryBacking>(offset).get(); if (value) this.call('free.ptd+' + offset.toString(16), () => this.crt.free(value)); }
    const exception = record.pointer<NativeHeapObjectViews>(0x5c).get(); if (!samePointer(exception, this.physical.exceptionData)) this.call('free.ptdException', () => this.crt.free(exception ? this.baseAllocation(exception) : null));
    this.call('lock13.freePtd', () => this.crt.lock(13));
    const mbc = record.pointer<NativeHeapObjectViews>(0x68).get(); if (mbc && this.counter(mbc, 0, -1) === 0 && !samePointer(mbc, this.physical.mbcObject)) this.call('free.ptdMbc', () => this.crt.free(this.baseAllocation(mbc)));
    this.call(this.name('unlockFreePtdMbc'), () => this.crt.unlock(13));
    this.call('lock12.freePtd', () => this.crt.lock(12));
    const locale = record.pointer<NativeHeapObjectViews>(0x6c).get(); if (locale) { this.localeRefs(locale, -1); if (!samePointer(locale, this.currentLocale()) && !samePointer(locale, this.physical.defaultLocale) && locale.readUnsigned(0) === 0) this.gate(this.name('localeFree') + ' nondefault locale'); }
    this.call(this.name('unlockFreePtdLocale'), () => this.crt.unlock(12));
    this.call('free.ptd', () => this.crt.free(record.backing as NativeMemoryBacking));
  }
  freePtdCallback(record: NativeHeapObjectViews | null): NativeValue<void> {
    const key = record === null ? 'freePtdCallbackNULL' : [...this.s.records].find(owned => owned.backing === record.backing && owned.bytes.byteOffset === record.bytes.byteOffset) ?? record;
    return this.run(this.name('freePtdCallback'), () => this.releasePtd(record), true, key);
  }
  private baseAllocation(fields: NativeHeapObjectViews): NativeMemoryBacking {
    canonical(fields, fields.bytes.length);
    if ('region' in fields.backing || fields.bytes.byteOffset !== fields.backing.bytes.byteOffset) this.gate(this.name('free') + ' unowned interior-pointer allocation');
    return fields.backing;
  }
  freePtd(record: NativeHeapObjectViews | null = null): NativeValue<void> {
    return this.run(this.name('freePtd'), () => {
      const index = this.crt.physical.crtTlsIndexes.readUnsigned(0);
      if (index !== 0xffffffff) {
        if (record === null) { const getterIndex = this.crt.physical.crtTlsIndexes.readUnsigned(4); const first = this.call('TlsGetValue.freePtd', () => this.platform.tlsGetValue?.(getterIndex) ?? unknown('Actual TLS getter required')); if (first !== null) { const dispatchIndex = this.crt.physical.crtTlsIndexes.readUnsigned(0); const dispatchGetterIndex = this.crt.physical.crtTlsIndexes.readUnsigned(4); const getter = this.call('TlsGetValue.freePtd.dispatch', () => this.platform.tlsGetValue?.(dispatchGetterIndex) ?? unknown('Actual TLS getter required')); const value = this.call('tlsGetterDispatcher.freePtd', () => this.local(getter, 'get').invoke(dispatchIndex)); record = value === null ? null : this.ptd(value); } }
        const clearIndex = this.crt.physical.crtTlsIndexes.readUnsigned(0);
        this.call('localStorageSet.clearPtd', () => this.decoded(8, 'set').invoke(clearIndex, null)); this.call('freePtdCallback', () => this.freePtdCallback(record));
      }
      const currentGetterIndex = this.crt.physical.crtTlsIndexes.readUnsigned(4);
      if (currentGetterIndex !== 0xffffffff) this.call('TlsSetValue.clearGetter', () => this.platform.tlsSetValue?.(currentGetterIndex, null) ?? unknown('Actual TLS clear getter required'));
    }, true);
  }
  terminate(): NativeValue<void> {
    if (this.s.phase === 'terminated') return known(undefined);
    return this.run(this.name('mtTerm'), () => {
      const indexes = this.crt.physical.crtTlsIndexes, index = indexes.readUnsigned(0);
      if (index !== 0xffffffff) { this.call('localStorageFree', () => this.decoded(12, 'free').invoke(index)); indexes.writeUnsigned(0, 0xffffffff); this.s.trace.push('ptdIndex.clear'); }
      const getter = indexes.readUnsigned(4); if (getter !== 0xffffffff) { this.call('TlsFree.getter', () => this.platform.tlsFree?.(getter) ?? unknown('Actual TlsFree required')); indexes.writeUnsigned(4, 0xffffffff); this.s.trace.push('tlsGetterIndex.clear'); }
      this.call('mtDeleteLocks', () => this.crt.terminateLocks()); this.s.phase = 'terminated';
    }, true);
  }
  snapshot() { return Object.freeze({ phase: this.s.boundary && this.s.phase === 'initializing' ? 'blocked' : this.s.phase, boundary: this.s.boundary, physical: this.physical,
    destructor: this.s.destructor, tlsFallbackAllocator: this.s.tlsFallbackAllocator,
    records: Object.freeze([...this.s.records]), trace: Object.freeze(this.s.trace.slice()) }); }
}
