/** Selected SceneAdmin registered PropertyID table. Its holder, bucket heads,
 * linked nodes and entity pointers share retained physical storage. This is a
 * table subservice, not the full SceneAdmin constructor or singleton getter. */
import sourceText from '../../assets/gothic3/npc-heap/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeSceneEntityRegistry } from './entity-lifecycle';
import type { NativeLifecycleResult, NativeLiveEntity, NativeSceneLookupHost } from './entity-lifecycle';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryAdmin, NativeMemoryAllocation, NativeMemoryBacking } from './native-memory-admin';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
interface SourceRules {
  schema: string; inputs: { SharedBase: string; Engine: string }; baseRulesSha256: string;
  methods: Record<string, { entry: string; body: string; bodyInstructionBytesSha256: string }>;
}
const source = JSON.parse(sourceText) as SourceRules;
const sourceMethods = [
  ['propertyIdHash', '1000385a', '10092a60', 'a827bed9e5a7f81d61e8557ce19842a96e63f8e699cc0679b8f2cae63da70af7'],
  ['propertyIdConstructor', '1000277a', '10092aa0', 'dc84977b14b7fe430090a4a8fdc6f2ec1d116ed99bf448a0af797265e1d7e44e'],
  ['propertyIdAssign', '10001f05', '10092970', '0bf0bc0f031fa86044af4362cd5f50a09bdb132214e56b36c7dae4fc0a6f7979'],
  ['propertyIdEquals', '1000873d', '10023950', '2b1f360872ff1b2830f90839257aabacf97e1c84e65bf2700c1d680d1727a39f'],
  ['propertyIdDestructor', '10007dab', '10092ac0', '62a30219a1c1c2470fd575d2082aa5cfe0310cef091683500e7b6d98eb4e289f'],
  ['sceneSectionConstructor', '1000785b', '10010ea0', '3f8374a22d2f3ab1d73f436838290d5b6cbde12bc48fcb62d2aacdb7334ce27c'],
  ['sceneSectionAcquire', '10003d41', '10010f10', 'faccf87a8ad61b09546cf47e08a06fd337aded233c1446e307502ca1f109fea3'],
  ['sceneSectionRelease', '100076a3', '10010f20', '3a4e8b0494af0aaa05609588ec3d06923bcd63454f09db737af613bf1b5ed02f'],
  ['sceneRegisterEntity', '30005227', '304cb050', '2cd2417824f2fa4255d735e2fb5d7df51b946a29cf02e3a0cdcf43c5841717e0'],
  ['sceneUnregisterEntity', '300120a3', '304cb0b0', '1567fddc7d59137ec5d65bb108b969f04b6b2dc27f115373cb173f659f220a92'],
  ['registeredMapConstructor', '304d13a0', '304d13a0', 'fbeb64ea1d01f6ebee2e08d4b91e1dcb02f84385f0d0d59ca3321de2b9982fdd'],
  ['registeredMapGrow', '304ce950', '304ce950', '5deb78c76f4bf0a5b9964c9c4c5fdae10475d6f3ec32b6a0f3bf7b26d4fdef63'],
  ['registeredMapSlot', '304cfc00', '304cfc00', 'cc761ba414f9f8c5bff7a7a8ff93d784f128514aa6bbe98811dbce4c291951f2'],
  ['registeredMapLookup', '304ce740', '304ce740', '481eb240dc0b173d9b09581230db4eaa397121347de3d9fcde8200824c602684'],
  ['registeredMapErase', '304d0490', '304d0490', '7fa3464570da49c471728d7d154d7e370164c2f3b1b793b0b7eadfd111b0e72f'],
  ['registeredMapDeleteEntry', '304cfc80', '304cfc80', '5228ed2ff3a2830a8ec92f5dda2d7c5b930e68b3417f7e197d150c9db12258b3'],
  ['sceneGetEntity', '30020356', '304cb100', 'fd0e5ce2ab8fbd82df1ec03bc66aa8dab27b890a7c69dd7c372f5ae8e9e45528'],
  ['registeredMapConstLookup', '304cfb90', '304cfb90', '481eb240dc0b173d9b09581230db4eaa397121347de3d9fcde8200824c602684'],
] as const;
function admitSource(): void {
  if (source.schema !== 'gothic3-npc-heap-rules-v1' ||
      source.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
      source.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
      source.baseRulesSha256 !== '4f1399da573a7b77eaa218191ab8af05ffb58301d3789ce8774e22f080846a2e') {
    throw new Error('Selected PropertyID heap source inputs differ');
  }
  for (const [label, entry, body, hash] of sourceMethods) {
    const method = source.methods[label];
    if (!method || method.entry !== entry || method.body !== body || method.bodyInstructionBytesSha256 !== hash) {
      throw new Error('Selected PropertyID heap method receipt differs: ' + label);
    }
  }
}
function idBytes(id20: string): Uint8Array {
  if (!/^[0-9a-f]{40}$/.test(id20)) throw new Error('Actual twenty original PropertyID bytes required');
  return Uint8Array.from(id20.match(/../g)!, byte => parseInt(byte, 16));
}
/** SharedBase10092a60 reads DWORD0 and DWORD16; equality separately compares
 * only the first sixteen bytes. No hash cache is invented or written here. */
export function nativePropertyIdHash(id20: string): number {
  const bytes = idBytes(id20), view = new DataView(bytes.buffer);
  return ((view.getUint32(0, true) >>> 3) + view.getUint32(16, true)) >>> 0;
}
function fact<T>(value: NativeValue<T>, operation: string): T {
  if (!value.known) throw new Error(operation + ': ' + value.reason);
  return value.value;
}

/** An actual initialized selected platform section for Engine30af24f4.
 * The source constructor does not acquire it. Mutating operations require
 * this capability; cold zero bytes never establish initialized ownership. */
export interface NativeSceneHeapSection {
  readonly sourceAddress: '30af24f4';
  readonly identity: object;
  acquire(): NativeValue<void>;
  release(): NativeValue<void>;
}
export interface NativeSceneHeapHost {
  readonly memory: Pick<NativeMemoryAdmin, 'getInstance' | 'newObject' | 'realloc' | 'deleteObject'>;
  readonly section?: NativeSceneHeapSection;
}
interface PropertyIdNode {
  readonly allocation: NativeMemoryAllocation;
  readonly views: NativeHeapObjectViews;
}
type Phase = 'cold' | 'constructing' | 'ready' | 'blocked';

export class NativeScenePropertyIdHeap {
  /** Exact selected holder owner, not a fabricated MemHeap allocation. It may
   * be replaced with a retained embedded SceneAdmin+14 backing by the host. */
  readonly holder: NativeHeapObjectViews;
  private phase: Phase = 'cold';
  private boundary: string | null = null;
  /** NULL means a selected section callback may have changed its depth before
   * failing to establish its result. It is not an inferred entered/idle state. */
  private entered: boolean | null = false;
  private active = false;
  private reentrantAttempt = false;
  private readonly nodes = new Set<PropertyIdNode>();
  private readonly trace: string[] = [];
  constructor(readonly host: NativeSceneHeapHost, holderBacking?: NativeMemoryBacking | NativeHeapObjectViews) {
    admitSource();
    const backing = holderBacking ?? { identity: {}, bytes: new Uint8Array(16), knownMask: new Uint8Array(16), freed: false };
    if (backing instanceof NativeHeapObjectViews) {
      if (backing.bytes.length !== 16) throw new Error('Actual sixteen-byte embedded registered-table holder required');
      this.holder = backing;
    } else this.holder = new NativeHeapObjectViews(backing, 0, 16);
  }
  private guard(): void {
    if (this.reentrantAttempt) throw new Error('A callback attempted unsupported reentrant registered-table mutation');
    if (this.phase === 'blocked') throw new Error(this.boundary!);
  }
  private store(views: NativeHeapObjectViews, offset: number, value: number): void {
    this.guard(); views.writeUnsigned(offset, value); this.guard();
  }
  private pointer<T extends object>(views: NativeHeapObjectViews, offset: number, value: T | null): void {
    this.guard(); views.pointer<T>(offset).set(value); this.guard();
  }
  private call<T>(operation: string, body: () => NativeValue<T>, retain?: (value: T) => void): T {
    this.guard();
    this.trace.push(operation + '.attempt');
    const response = body();
    // A known platform acquisition/release has already changed its owned
    // depth, even when the callback also attempted unsupported reentry.
    if (response.known) retain?.(response.value);
    this.guard();
    const value = fact(response, operation); this.trace.push(operation); return value;
  }
  private attempt<T>(body: () => T): NativeValue<T> {
    if (this.active) {
      this.reentrantAttempt = true;
      return unknown('Registered-table operation is already executing');
    }
    if (this.phase === 'blocked') return unknown(this.boundary!);
    this.active = true; this.reentrantAttempt = false;
    try { const value = body(); this.guard(); return known(value); }
    catch (error) {
      this.phase = 'blocked'; this.boundary = error instanceof Error ? error.message : String(error);
      this.trace.push('blocked:' + this.boundary); return unknown(this.boundary);
    } finally { this.active = false; }
  }
  initialize(): NativeValue<void> {
    if (this.active) return this.attempt(() => undefined);
    if (this.phase === 'ready') return known(undefined);
    if (this.phase === 'constructing') return unknown('Selected registered table constructor is already executing');
    return this.attempt(() => {
      this.phase = 'constructing';
      for (const offset of [0, 4, 8, 12]) this.store(this.holder, offset, 0);
      this.trace.push('table.holder.zero');
      // Engine304d13a0 -> Grow(43,0): default growth8 gives51 DWORDs.
      this.call('table.MemoryAdmin.GetInstance', () => this.host.memory.getInstance());
      const backing = this.call('table.Realloc.NULL.204', () => this.host.memory.realloc(null, 204));
      this.pointer(this.holder, 0, backing);
      if (!backing) throw new Error('Source registered-table memset dereferences NULL Realloc result');
      const table = new NativeHeapObjectViews(backing, 0, 204);
      for (let offset = 0; offset < 204; offset += 4) this.store(table, offset, 0);
      this.store(this.holder, 8, 51); this.trace.push('table.capacity.51');
      this.store(this.holder, 4, 43);
      for (let offset = 0; offset < 172; offset += 4) this.store(table, offset, 0);
      this.trace.push('table.bucketCount.43'); this.phase = 'ready';
    });
  }
  private table(): NativeHeapObjectViews {
    if (this.phase !== 'ready') throw new Error(this.boundary ?? 'Actual completed registered-table constructor required');
    if (this.holder.readUnsigned(4) !== 43 || this.holder.readUnsigned(8) !== 51) {
      throw new Error('Selected source registered-table count/capacity differs');
    }
    const backing = this.holder.pointer<NativeMemoryAllocation>(0).get();
    if (!backing || backing.requestedBytes !== 204) throw new Error('Actual retained204B registered-table allocation required');
    return new NativeHeapObjectViews(backing, 0, 204);
  }
  private owned(node: PropertyIdNode): PropertyIdNode {
    if (!this.nodes.has(node) || node.allocation.freed) throw new Error('Registered chain pointer lacks a live owned28B node');
    return node;
  }
  private equal(node: PropertyIdNode, id20: string): boolean {
    const bytes = idBytes(id20), value = new DataView(bytes.buffer);
    for (const offset of [0, 4, 8, 12]) {
      if (this.owned(node).views.readUnsigned(offset) !== value.getUint32(offset, true)) return false;
    }
    return true;
  }
  private next(node: PropertyIdNode): PropertyIdNode | null {
    const next = this.owned(node).views.pointer<PropertyIdNode>(24).get();
    return next ? this.owned(next) : null;
  }
  private find(id20: string): { bucket: number; node: PropertyIdNode | null; previous: PropertyIdNode | null } {
    const table = this.table(), bucket = nativePropertyIdHash(id20) % this.holder.readUnsigned(4);
    let node = table.pointer<PropertyIdNode>(bucket * 4).get(), previous: PropertyIdNode | null = null;
    const visited = new Set<PropertyIdNode>();
    while (node) {
      this.owned(node);
      if (visited.has(node)) throw new Error('Registered table chain contains a cycle outside the selected source profile');
      visited.add(node);
      if (this.equal(node, id20)) return { bucket, node, previous };
      previous = node; node = this.next(node);
    }
    return { bucket, node: null, previous };
  }
  private synchronized<T>(body: () => T): NativeValue<T> {
    return this.attempt(() => {
      this.table();
      const section = this.host.section;
      if (!section || section.sourceAddress !== '30af24f4' || !section.identity ||
          typeof section.acquire !== 'function' || typeof section.release !== 'function') {
        throw new Error('Actual initialized registered-table section30af24f4 is unowned');
      }
      if (this.entered !== false) throw new Error('Entered or unestablished registered-table section is outside the selected source profile');
      this.entered = null;
      this.call('scene.section.acquire', () => section.acquire(), () => { this.entered = true; });
      const value = body();
      this.entered = null;
      this.call('scene.section.release', () => section.release(), () => { this.entered = false; });
      return value;
    });
  }
  register(entity: NativeLiveEntity | null): NativeValue<boolean> {
    if (entity === null) return known(false); // Source returns before CS acquire.
    return this.synchronized(() => {
      this.guard(); const valid = entity.isValid(); this.guard();
      if (!valid) { entity.create(); this.guard(); this.trace.push('entity.virtualCreate.returnIgnored'); }
      const id20 = entity.propertyId20, found = this.find(id20);
      let node = found.node;
      if (!node) {
        const allocation = this.call('node.newObject.28.0x199', () => this.host.memory.newObject(28, 0x199));
        if (!allocation) throw new Error('Source PropertyID assignment dereferences NULL new28B node');
        const views = new NativeHeapObjectViews(allocation, 0, 28);
        node = { allocation, views }; this.nodes.add(node);
        // SharedBase constructor, then operator= from a different entity ID.
        for (const offset of [12, 8, 4, 0, 16]) this.store(views, offset, 0);
        const bytes = idBytes(id20), value = new DataView(bytes.buffer);
        for (const offset of [0, 4, 8, 12]) this.store(views, offset, value.getUint32(offset, true));
        this.store(views, 16, 0); this.trace.push('node.PropertyID.construct.assign16.clearDWORD16');
        const table = this.table(), head = table.pointer<PropertyIdNode>(found.bucket * 4).get();
        this.pointer(views, 24, head ? this.owned(head) : null);
        this.pointer(table, found.bucket * 4, node);
        this.store(this.holder, 12, (this.holder.readUnsigned(12) + 1) >>> 0);
        this.trace.push('node.linkAtBucketHead.countIncrement');
      }
      this.pointer(node.views, 20, entity);
      this.trace.push('node.entityPointer.assign'); return true;
    });
  }
  unregister(entity: NativeLiveEntity | null): NativeValue<boolean> {
    if (entity === null) return known(false);
    return this.synchronized(() => {
      const found = this.find(entity.propertyId20);
      if (!found.node) return false;
      const node = found.node, next = this.next(node);
      if (found.previous) this.pointer(found.previous.views, 24, next);
      else this.pointer(this.table(), found.bucket * 4, next);
      this.trace.push('node.unlinkByID');
      for (const offset of [12, 8, 4, 0, 16]) this.store(node.views, offset, 0);
      this.trace.push('node.PropertyID.destructor.zero20');
      this.call('node.MemoryAdmin.GetInstance', () => this.host.memory.getInstance());
      this.call('node.MemoryAdmin.DeleteObject', () => this.host.memory.deleteObject(node.allocation));
      this.store(this.holder, 12, (this.holder.readUnsigned(12) - 1) >>> 0);
      this.trace.push('node.countDecrement'); return true;
    });
  }
  /** Engine304cb100's first table lookup is unlocked. NULL is a known table
   * result; missing spatial/template services remain distinct prerequisites. */
  lookup(id20: string): NativeValue<NativeLiveEntity | null> {
    if (this.phase !== 'ready') return unknown(this.boundary ?? 'Actual completed registered-table constructor required');
    try {
      const found = this.find(id20);
      return known(found.node ? found.node.views.pointer<NativeLiveEntity>(20).get() : null);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  snapshot() {
    let backing: NativeMemoryAllocation | null = null, bucketCount: number | null = null;
    let capacity: number | null = null, entryCount: number | null = null;
    try { backing = this.holder.pointer<NativeMemoryAllocation>(0).get(); } catch { /* explicit unknown prefix */ }
    try { bucketCount = this.holder.readUnsigned(4); capacity = this.holder.readUnsigned(8); entryCount = this.holder.readUnsigned(12); } catch { /* explicit unknown prefix */ }
    return Object.freeze({ phase: this.phase, boundary: this.boundary, entered: this.entered,
      holder: this.holder, backing, bucketCount, capacity, entryCount,
      retainedNodes: Object.freeze([...this.nodes].map(node => Object.freeze({ allocation: node.allocation, views: node.views }))),
      trace: Object.freeze(this.trace.slice()) });
  }
}

/** Compatible registry surface. Every first-table operation is overridden;
 * the base class's logical map is never authoritative for these owners. */
export class NativeHeapSceneEntityRegistry extends NativeSceneEntityRegistry {
  constructor(readonly heap: NativeScenePropertyIdHeap) { super(); }
  initialize(): NativeValue<void> { return this.heap.initialize(); }
  override register(entity: NativeLiveEntity | null): NativeLifecycleResult<boolean> {
    return this.run(op => op.callback('SceneAdmin.RegisterEntity physical table', () => this.heap.register(entity)));
  }
  override unregister(entity: NativeLiveEntity | null): NativeLifecycleResult<boolean> {
    return this.run(op => op.callback('SceneAdmin.UnregisterEntity physical table', () => this.heap.unregister(entity)));
  }
  override readNodeIdentity(entity: NativeLiveEntity, nodeVersion: number, readId: () => NativeValue<string>): NativeLifecycleResult<1> {
    return this.run(op => {
      if (!Number.isInteger(nodeVersion) || nodeVersion < 0 || nodeVersion > 0xffff) throw new Error('Native Node version requires uint16');
      op.callback('Node.Read unregister old ID', () => this.heap.unregister(entity));
      const serialized = op.callback('Node.Read serialized PropertyID', readId);
      idBytes(serialized);
      op.write('Node.Read ID.copy16/clear trailing DWORD', () => { entity.propertyId20 = serialized.slice(0, 32) + '00000000'; });
      op.callback('Node.Read register new ID', () => this.heap.register(entity));
      entity.sourceReadStage = 'node-id-read'; return 1;
    });
  }
  override findRegistered(id20: string): NativeLiveEntity | null {
    return fact(this.heap.lookup(id20), 'SceneAdmin registered-table lookup');
  }
  override getEntity(id20: string, hint: number, host: NativeSceneLookupHost): NativeValue<NativeLiveEntity | null> {
    try { idBytes(id20); } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
    if (!Number.isInteger(hint)) return unknown('Native entity-type hint requires int');
    if (hint === 0) {
      const registered = this.heap.lookup(id20);
      if (!registered.known || registered.value !== null) return registered;
    }
    if (hint === 0 || hint === 1) {
      const spatial = host.findSpatial(id20);
      if (!spatial.known || spatial.value !== null) return spatial;
    } else if (hint !== 2) return known(null);
    return host.findTemplate(id20);
  }
}
