/** The selected physical SceneAdmin constructor. This does not perform its
 * cached singleton lookup, reflected type registration or application boot. */
import sourceText from '../../assets/gothic3/scene-startup/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeHeapCString } from './native-heap-cstring';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryAdmin, NativeMemoryAllocation } from './native-memory-admin';
import { NativeScenePropertyIdHeap } from './native-scene-heap';
import type { NativeSceneHeapSection } from './native-scene-heap';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
const fact = <T>(value: NativeValue<T>, operation: string): T => {
  if (!value.known) throw new Error(operation + ': ' + value.reason);
  return value.value;
};
interface SourceRules {
  schema: string; inputs: { SharedBase: string; Engine: string };
  methods: Record<string, { entry: string; body: string; bodyInstructionBytesSha256: string }>;
  constBytes: Record<string, { address: string; raw: string }>;
}
const source = JSON.parse(sourceText) as SourceRules;
const sourceMethods = [
  ['sceneReflectedCreator', '304d1fb0', '304d1fb0', '422c45b6665d675677d4b7ffb8d095edf98ab03353072ffbaa4b87efbf2ec9c4'],
  ['sceneConstructor', '304cc660', '304cc660', '4a684cefc21f926d74e5a5e83627313924d07404f7a780a19648e854b95dc60b'],
  ['engineComponentConstructor', '300027b1', '30100fe0', 'df2868ee3837e94e262e4ad56e0887a931be41a02d78f23a7bbcc4966e25f03a'],
  ['inputReceiverConstructor', '30035a5d', '30103020', '3610a864ca1c4307409eef5033569430672ebf11b70962cd9afbe50e63a769b6'],
  ['objectBaseConstructor', '10007c11', '1004a1c0', 'ab7e78513c0a30ddc1692bed394d8f242bab4639e53b0e22cdd9dc43ae23a4bb'],
  ['objectRefBaseConstructor', '10001d07', '1004a5a0', '796d99b69ae41bdd4d9ce5e2e2a83788deab4385eabb460ac2a1a14815589b85'],
  ['registeredMapConstructor', '304d13a0', '304d13a0', 'fbeb64ea1d01f6ebee2e08d4b91e1dcb02f84385f0d0d59ca3321de2b9982fdd'],
  ['registeredMapGrow', '304ce950', '304ce950', '5deb78c76f4bf0a5b9964c9c4c5fdae10475d6f3ec32b6a0f3bf7b26d4fdef63'],
  ['entityMapConstructor', '304502a0', '304502a0', '27567ac4ea0f83ebc33790bfcbb7e3657d2f57f8e6cda5b6460caf9325985c22'],
  ['entityMapGrow', '3044ef00', '3044ef00', 'c452933f67866d0be0a472566af448eeee05aeb49565d7a1298ad8240ea1f181'],
  ['templateMapConstructor', '304d1220', '304d1220', 'a9dcb95a2060a1c4b73334c400a6484ae6d56cc163b8a1752b0ecbbcc6390c63'],
  ['templateMapGrow', '304ce8b0', '304ce8b0', '84fed2bad36cccb53e90f84e16411097df61a2d745422cadd497221ff5f48e0e'],
  ['nameMapConstructor', '304d1480', '304d1480', '188e4694316690c23976fc8b896d30e90d841e1bf9aaab57bd3d744a2c6f5120'],
  ['nameMapGrow', '304cea00', '304cea00', 'fdcbff5e04e29d33deb0d034c7ee0cbc17c7a82816682c004ef76d42db6eb60f'],
  ['unknownMapConstructor', '304d14e0', '304d14e0', 'fdfc3569ddec099964c25e65be863ecce1071b07e1f6d1a6e3e94136403e7065'],
  ['unknownMapGrow', '304ceaf0', '304ceaf0', 'eabb24dbcc42d029541b0f23f4dfb8c535f6f9e0fab9972de79a8f467dbd467b'],
  ['entityAdminConstructor', '3001d1ce', '304c8510', '80909219b414a0bb108eb2b7c6a2705ff9dc28ed878c0bfd2ea89170c130aa1e'],
  ['entityAdminInvalidate', '300210a8', '304c8390', '3864397a8b53652f5c2c8c0a18dcfa5a251443e3ce5bb7d92377d50b74cea9ef'],
  ['vectorConstructor', '10002833', '10024b70', '58367ffa2a0179375018fa0f5c26da24391e42ebe0ed8fdda35a21fc7bdc396f'],
  ['sphereConstructor', '10003634', '1002b830', '58367ffa2a0179375018fa0f5c26da24391e42ebe0ed8fdda35a21fc7bdc396f'],
  ['boxConstructor', '1000782e', '1002a580', '58367ffa2a0179375018fa0f5c26da24391e42ebe0ed8fdda35a21fc7bdc396f'],
  ['sphereClear', '10005e20', '10036c70', '78cf732bf2122ffd1f1134d597ebf1543657ad2a01b2e591eccb047e7857cd37'],
  ['boxInvalidate', '10007e28', '1002a8a0', '2135d44504fe0a1a3b20652a2893d927469cc9a45d75f69b1279c4281d2669e5'],
  ['sceneSectionSetSpinCount', '10002f27', '10010ef0', 'd605aa9c77b6ed0860440ef610bc39cd34d1f3f3d29131b1cc82f82ed7781a34'],
] as const;
function admitSource(): void {
  if (source.schema !== 'gothic3-scene-startup-rules-v1' ||
      source.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
      source.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
      sourceMethods.some(([label, entry, body, hash]) => source.methods[label]?.entry !== entry ||
        source.methods[label]?.body !== body || source.methods[label]?.bodyInstructionBytesSha256 !== hash)) {
    throw new Error('Selected physical SceneAdmin constructor receipt differs');
  }
}
function literal(label: string, address: string): number {
  const receipt = source.constBytes[label];
  const admitted = { '30826e38': '00007a43', '100e5df0': 'ffff7f7f', '100e5df4': 'ffff7fff' } as const;
  if (!receipt || receipt.address !== address || receipt.raw !== admitted[address as keyof typeof admitted]) {
    throw new Error('Selected SceneAdmin constant bytes differ: ' + label);
  }
  const bytes = Uint8Array.from(receipt.raw.match(/../g)!, byte => parseInt(byte, 16));
  return new DataView(bytes.buffer).getUint32(0, true);
}
/** Bytes, known-bit masks and pointer capabilities must refer to the same
 * physical owner and position. Sharing an ArrayBuffer alone does not establish
 * that an independently fabricated backing owns the same native pointer slot. */
function aliasesSlot(range: NativeHeapObjectViews, slot: NativeHeapObjectViews, offset: number): boolean {
  const position = (views: NativeHeapObjectViews) => {
    const backing = views.backing;
    return { identity: 'region' in backing ? backing.region.identity : backing.identity,
      begin: ('region' in backing ? backing.offset : 0) + views.bytes.byteOffset - backing.bytes.byteOffset };
  };
  const rangePosition = position(range), slotPosition = position(slot);
  return slot.bytes.buffer === range.bytes.buffer && slot.bytes.byteOffset === range.bytes.byteOffset + offset &&
    slot.knownMask.buffer === range.knownMask.buffer && slot.knownMask.byteOffset === range.knownMask.byteOffset + offset &&
    rangePosition.identity === slotPosition.identity && slotPosition.begin === rangePosition.begin + offset;
}

/** SetSpinCount operates on an already initialized native section. A cold PE
 * zero range does not establish this capability or a successful Win32 call. */
export interface NativeEntityAdminSection {
  readonly sourceAddress: '30af23d0';
  readonly identity: object;
  setSpinCount(value: 4000): NativeValue<void>;
}
/** Retained physical globals. The CString owner must already exist and its
 * four-byte slot aliases +4 of the exact twelve-byte range at30adcd28. */
export interface NativeSceneAdminGlobals {
  readonly sourceAddress: '30adcd28';
  readonly views: NativeHeapObjectViews;
  readonly name: NativeHeapCString;
}
export interface NativeSceneModuleAdmin {
  readonly identity: object;
  readonly vtableRegistrationSlot: 0x74;
  registerSceneComponent(scene: NativeConstructedSceneAdmin): NativeValue<void>;
}
export interface NativeSceneAdminConstructionHost {
  readonly memory: NativeMemoryAdmin;
  readonly registeredSection?: NativeSceneHeapSection;
  readonly entitySection?: NativeEntityAdminSection;
  readonly globals?: NativeSceneAdminGlobals;
  getModuleAdmin?(): NativeValue<NativeSceneModuleAdmin | null>;
}
export interface NativeSceneAdminMap {
  readonly offset: 0x14 | 0x24 | 0x34 | 0x44 | 0x54;
  readonly holder: NativeHeapObjectViews;
  readonly backing: NativeMemoryAllocation | null;
}
export interface NativeConstructedSceneAdmin {
  readonly allocation: NativeMemoryAllocation;
  readonly views: NativeHeapObjectViews;
  readonly registeredTable: NativeScenePropertyIdHeap;
  readonly maps: readonly NativeSceneAdminMap[];
}
type Phase = 'cold' | 'constructing' | 'ready' | 'null' | 'blocked';

/** Lower constructor route after an actual reflected owner has selected the
 * original348B/tag0xc4 request. Constructor failure keeps every applied byte,
 * retained allocation and external effect; it is latched and never replayed. */
export class NativeSceneAdminConstruction {
  private phase: Phase = 'cold';
  private boundary: string | null = null;
  private active = false;
  private reentrantAttempt = false;
  private allocation: NativeMemoryAllocation | null = null;
  private owner: NativeConstructedSceneAdmin | null = null;
  private readonly maps: NativeSceneAdminMap[] = [];
  private readonly retainedAllocations = new Set<NativeMemoryAllocation>();
  private readonly trace: string[] = [];
  constructor(readonly host: NativeSceneAdminConstructionHost) { admitSource(); }
  private guard(): void {
    if (this.reentrantAttempt) throw new Error('A callback attempted unsupported reentrant SceneAdmin construction');
    if (this.phase === 'blocked') throw new Error(this.boundary!);
    if (this.allocation?.freed || this.allocation?.region.freed) throw new Error('SceneAdmin constructor allocation lifetime has ended');
  }
  private write(views: NativeHeapObjectViews, offset: number, value: number, width: 1 | 2 | 4 = 4): void {
    this.guard(); views.writeUnsigned(offset, value, width); this.guard();
  }
  private pointer<T extends object>(views: NativeHeapObjectViews, offset: number, value: T | null): void {
    this.guard(); views.pointer<T>(offset).set(value); this.guard();
  }
  private call<T>(operation: string, execute: () => NativeValue<T>, retain?: (value: T) => void): T {
    this.guard(); this.trace.push(operation + '.attempt');
    const response = execute();
    // Known allocation/callback effects precede the guard's possible failure.
    if (response.known) retain?.(response.value);
    this.guard(); const value = fact(response, operation); this.trace.push(operation); return value;
  }
  private tableMemory() {
    const execute = <T>(body: () => NativeValue<T>): NativeValue<T> => {
      this.guard(); const result = body(); this.guard(); return result;
    };
    return {
      getInstance: () => execute(() => this.host.memory.getInstance()),
      newObject: (bytes: number, tag: number) => execute(() => this.host.memory.newObject(bytes, tag)),
      realloc: (allocation: NativeMemoryAllocation | null, bytes: number) => execute(() => {
        const result = this.host.memory.realloc(allocation, bytes);
        if (result.known && result.value) this.retainedAllocations.add(result.value);
        return result;
      }),
      deleteObject: (allocation: NativeMemoryAllocation | null) => execute(() => this.host.memory.deleteObject(allocation)),
    };
  }
  private subview(offset: number, bytes: number): NativeHeapObjectViews {
    return new NativeHeapObjectViews(this.allocation!, offset, bytes);
  }
  private base(views: NativeHeapObjectViews): void {
    this.write(views, 0, 0x100e7e1c); this.trace.push('base.ObjectBase.1004a1c0');
    this.pointer(views, 4, null); this.write(views, 0, 0x100e7eac); this.write(views, 8, 1);
    this.trace.push('base.ObjectRefBase.1004a5a0');
    this.write(views, 0, 0x308257bc); this.write(views, 12, 1, 1);
    this.trace.push('base.InputReceiver.30103020');
    this.write(views, 16, 1, 1); this.write(views, 17, 1, 1); this.write(views, 0, 0x3082553c);
    this.trace.push('base.EngineComponent.30100fe0');
    this.write(views, 0, 0x3087c7dc); this.trace.push('scene.vtable.3087c7dc');
  }
  private genericMap(offset: 0x24 | 0x34 | 0x44 | 0x54): void {
    const holder = this.subview(offset, 16);
    let retainedBacking: NativeMemoryAllocation | null = null;
    const record = Object.freeze({ offset, holder, get backing() { return retainedBacking; } });
    this.maps.push(record);
    for (const field of [0, 4, 8, 12]) this.write(holder, field, 0);
    this.trace.push('map.' + offset.toString(16) + '.holder.zero');
    this.call('map.' + offset.toString(16) + '.MemoryAdmin.GetInstance', () => this.host.memory.getInstance());
    const backing = this.call('map.' + offset.toString(16) + '.Realloc.NULL.204',
      () => this.host.memory.realloc(null, 204), value => {
        retainedBacking = value; if (value) this.retainedAllocations.add(value);
      });
    this.pointer(holder, 0, backing);
    if (!backing) throw new Error('SceneAdmin+' + offset.toString(16) + ' source map memset dereferences NULL Realloc result');
    const table = new NativeHeapObjectViews(backing, 0, 204);
    for (let field = 0; field < 204; field += 4) this.write(table, field, 0);
    this.write(holder, 8, 51); this.trace.push('map.' + offset.toString(16) + '.capacity.51');
    this.write(holder, 4, 43);
    for (let field = 0; field < 172; field += 4) this.write(table, field, 0);
    this.trace.push('map.' + offset.toString(16) + '.bucketCount.43');
  }
  private clearSphere(entity: NativeHeapObjectViews, offset: number): void {
    this.write(entity, offset, literal('sphereClearRadius', '100e5df4'));
    for (const field of [4, 8, 12]) this.write(entity, offset + field, 0);
    this.trace.push('entity.sphereClear.' + offset.toString(16));
  }
  private entityAdmin(): void {
    const entity = this.subview(0x68, 0xc8);
    this.write(entity, 0, 0x100e7e1c); this.trace.push('entity.ObjectBase.1004a1c0');
    this.write(entity, 0, 0x3087c154);
    for (const field of [4, 8, 12]) this.write(entity, field, 0);
    // These imported default sphere/vector constructors return this and write
    // no fields. Preserve allocator facts; these calls allocate no storage.
    for (const field of [0x10, 0x20, 0x30]) this.trace.push('entity.sphereConstructor.noStores.' + field.toString(16));
    for (const field of [0x44, 0x50, 0x5c, 0x68]) this.trace.push('entity.vectorConstructor.noStores.' + field.toString(16));
    this.trace.push('entity.sphereConstructor.noStores.74');
    for (const field of [0x8c, 0x90, 0x94]) this.write(entity, field, 0);
    // Source stores each pointer before the two narrow WORD header fields.
    for (const field of [0xa0, 0xa8, 0xb0]) {
      this.pointer(entity, field + 4, null); this.write(entity, field, 0, 2); this.write(entity, field + 2, 0, 2);
    }
    this.write(entity, 0xb8, 0); this.pointer(entity, 0xc0, null);
    this.write(entity, 0xbc, 0, 2); this.write(entity, 0xbe, 0, 2);
    this.clearSphere(entity, 0x10); this.clearSphere(entity, 0x20);
    this.write(entity, 0xc5, 0, 1); this.write(entity, 0xb8, 0); this.write(entity, 0x84, 0);
    this.write(entity, 0x88, 0, 1); this.write(entity, 0xbe, 0, 2); this.write(entity, 0xc4, 0, 1);
    this.write(entity, 0x40, literal('entityAdminCreateFloat', '30826e38'));
    this.write(entity, 0x98, 0x04800008); this.write(entity, 0x9c, 0x42);
    this.trace.push('entity.Create.304c8390');
    const section = this.host.entitySection;
    if (!section || section.sourceAddress !== '30af23d0' || !section.identity || typeof section.setSpinCount !== 'function') {
      throw new Error('Actual initialized EntityAdmin section30af23d0 required before SetSpinCount4000');
    }
    this.call('entity.section30af23d0.SetSpinCount.4000', () => section.setSpinCount(4000));
    this.trace.push('entity.constructor.304c8510.complete');
  }
  private tail(views: NativeHeapObjectViews): void {
    for (const field of [0x138, 0x13c, 0x140]) this.write(views, field, 0);
    this.trace.push('scene.boxConstructor.noStores.144');
    this.write(views, 0x64, 0, 1);
    const globals = this.host.globals;
    if (!globals || globals.sourceAddress !== '30adcd28' || globals.views.bytes.length !== 12 ||
        !(globals.name instanceof NativeHeapCString) || globals.name.slot.bytes.length !== 4 ||
        !aliasesSlot(globals.views, globals.name.slot, 4)) {
      throw new Error('Actual SceneAdmin globals30adcd28/2c/30 and aliased existing CString owner required');
    }
    this.write(globals.views, 8, 0); this.trace.push('scene.global30adcd30.zero');
    this.write(globals.views, 0, 1); this.trace.push('scene.global30adcd28.one');
    this.call('scene.globalCString30adcd2c.Clear', () => globals.name.clear());
    this.write(views, 0x130, 0); this.write(views, 0x134, 0);
    for (const field of [0, 4, 8]) this.write(views, 0x144 + field, literal('boxInvalidMinimum', '100e5df0'));
    for (const field of [12, 16, 20]) this.write(views, 0x144 + field, literal('boxInvalidMaximum', '100e5df4'));
    this.trace.push('scene.boxInvalidate.144');
    if (!this.host.getModuleAdmin) throw new Error('Actual ModuleAdminGetInstance3002e9ec startup required before SceneAdmin registration');
    const module = this.call('scene.ModuleAdmin.GetInstance', () => this.host.getModuleAdmin!());
    if (!module) throw new Error('Source SceneAdmin registration dereferences NULL ModuleAdmin result');
    if (!module.identity || module.vtableRegistrationSlot !== 0x74 || typeof module.registerSceneComponent !== 'function') {
      throw new Error('Actual selected ModuleAdmin vtable+74 registration capability required');
    }
    this.call('scene.ModuleAdmin.vtable74.register', () => module.registerSceneComponent(this.owner!));
  }
  construct(): NativeValue<NativeConstructedSceneAdmin | null> {
    if (this.active) { this.reentrantAttempt = true; return unknown('SceneAdmin construction is already executing'); }
    if (this.phase === 'blocked') return unknown(this.boundary!);
    if (this.phase === 'ready') {
      try { this.guard(); return known(this.owner); } catch (error) { return unknown(String(error)); }
    }
    if (this.phase === 'null') return known(null);
    this.active = true; this.reentrantAttempt = false; this.phase = 'constructing';
    try {
      const allocation = this.call('scene.newObject.348.0xc4', () => this.host.memory.newObject(348, 0xc4),
        value => { this.allocation = value; if (value) this.retainedAllocations.add(value); });
      if (!allocation) { this.phase = 'null'; return known(null); }
      if (allocation.requestedBytes !== 348 || allocation.capacity !== 384) throw new Error('Actual reflected348B SceneAdmin allocation in384B pool required');
      const views = new NativeHeapObjectViews(allocation, 0, 348);
      this.base(views);
      const constructionHost = this.host;
      const registeredTable = new NativeScenePropertyIdHeap({ memory: this.tableMemory(),
        get section() { return constructionHost.registeredSection; } }, this.subview(0x14, 16));
      const mapList = this.maps;
      this.owner = Object.freeze({ allocation, views, registeredTable, get maps() { return Object.freeze([...mapList]); } });
      this.maps.push(Object.freeze({ offset: 0x14, holder: registeredTable.holder,
        get backing() { return registeredTable.snapshot().backing; } }));
      this.trace.push('map.14.constructor.attempt');
      this.call('map.14.constructor', () => registeredTable.initialize());
      for (const offset of [0x24, 0x34, 0x44, 0x54] as const) this.genericMap(offset);
      this.entityAdmin(); this.tail(views); this.guard(); this.phase = 'ready';
      this.trace.push('scene.constructor.304cc660.complete'); return known(this.owner);
    } catch (error) {
      this.phase = 'blocked'; this.boundary = error instanceof Error ? error.message : String(error);
      this.trace.push('blocked:' + this.boundary); return unknown(this.boundary);
    } finally { this.active = false; }
  }
  snapshot() {
    return { phase: this.phase, boundary: this.boundary, allocation: this.allocation, owner: this.owner,
      maps: [...this.maps], retainedAllocations: [...this.retainedAllocations], trace: [...this.trace] };
  }
}
