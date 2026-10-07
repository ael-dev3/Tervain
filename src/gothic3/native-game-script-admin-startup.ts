/** Selected original Game C++ initializer bodies. This owner does not walk the
 * CRT initializer table or assume that its 1,672 earlier callbacks ran. */
import rules from '../../assets/gothic3/script-admin-startup/runtime-rules.json';
import cstringTextRules from '../../assets/gothic3/cstring-text-construction/runtime-rules.json';
import npcHeapRules from '../../assets/gothic3/npc-heap/runtime-rules.json';
import type { NativeValue } from './dialogue';
import { NativeGameCrtOwner } from './native-game-crt';
import { NativeGameExitTable } from './native-game-crt-exit-table';
import type { NativeGameCrtCallback } from './native-game-crt-exit-table';
import { NativeGameScriptAdminClassName } from './native-game-script-admin-class-name';
import { NativeHeapCString } from './native-heap-cstring';
import { NativeHeapObjectViews } from './native-heap-views';
import { NativeGuidText, nativeGuidPayloadEquals } from './native-guid-text';
import type { NativeGuidTextPlatform } from './native-guid-text';
import type { NativeMemoryAdmin, NativeMemoryBacking } from './native-memory-admin';
import type { NativeBytePointer } from './native-pointer-geometry';
import { nativeGameImageReceipt } from './native-game-crt-profile';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
const token = Object.freeze({});
const owners = new WeakMap<NativeGameCrtOwner, NativeGameScriptAdminStartup>();
type Initializer = 'root' | 'propertyId' | 'accessor';
type Cleanup = Initializer | 'type';

/** Each service must own the indicated original lower routine and its physical
 * arguments. Missing services return an explicit boundary. Supplying this
 * interface does not establish a complete property factory or native module. */
export interface NativeScriptAdminStartupHost {
  typeBaseCtor?(type: NativeHeapObjectViews, enabled: 1): NativeValue<void>;
  factoryCtor?(factory: NativeHeapObjectViews, name: NativeHeapCString): NativeValue<void>;
  singletonGetInstance?(): NativeValue<NativeHeapObjectViews>;
  registerTemplate?(singleton: NativeHeapObjectViews, type: NativeHeapObjectViews): NativeValue<number>;
  initializeWrapper?(wrapper: NativeHeapObjectViews, isRoot: 1): NativeValue<number>;
  /** Lower Win32 conversion/OLE writers used by the concrete Shared GUID owner. */
  guidTextPlatform?: NativeGuidTextPlatform;
  /** Actual SharedBase101ab150 payload, preserving any preceding native writes. */
  guidNullPayload?(): NativeValue<NativeHeapObjectViews>;
  queryNewObject?(singleton: NativeHeapObjectViews, name: NativeHeapCString): NativeValue<NativeHeapObjectViews | null>;
  /** Load the target's CURRENT vtable and dispatch this byte offset at call time. */
  propertyVirtual?(object: NativeHeapObjectViews, byteOffset: 48 | 52): NativeValue<number>;
  errorAdminPanicState?(): NativeValue<number>;
  wrapperDestroy?(wrapper: NativeHeapObjectViews): NativeValue<void>;
  smartptrDestructor?(wrapper: NativeHeapObjectViews): NativeValue<void>;
  factoryDtor?(factory: NativeHeapObjectViews): NativeValue<void>;
  typeBaseDtor?(type: NativeHeapObjectViews): NativeValue<void>;
}

const methodPins = [
  ['typeSingleton', 'Game', '2001a311', '203526e0', '35ab80a12ed7f2c6c2d696aa1bd5d89ad65b874230bd92c19da4bdd146b0632f'],
  ['propertyWrapperCtor', 'SharedBase', '10007130', '10089290', 'f6758286f43a8d2f4a26d4ab190ae4d5a89ebd7bd9631fb13db1f70c4a5691c1'],
  ['creatorPropertyIdName', 'SharedBase', '10002ee1', '100932e0', '9863a1f5cb3900a553b368a07c2cc0735813b9b2c087667cccd2babd5e224777'],
  ['creatorDtor', 'SharedBase', '10007356', '10093200', '915087f1f71432d30343acfb01cb92e0cc697ab3b8cfe6fab713d6c878aa0b2f'],
  ['propertyIdGuidCtor', 'SharedBase', '1000459d', '10092ba0', '0edae761d70075a219ecd32f06ff1a1aa850ac769d8739464846679a7d193e71'],
  ['propertyIdSetGuid', 'SharedBase', '100053e9', '10092b40', '675e7b3cb14e0009900cbc249640e6f3738c01f4370dae1a7a62fd6a097458e6'],
  ['propertyIdDtor', 'SharedBase', '10007dab', '10092ac0', '62a30219a1c1c2470fd575d2082aa5cfe0310cef091683500e7b6d98eb4e289f'],
  ['guidTextCtor', 'SharedBase', '10001528', '10012ae0', '18cb32d48cabedddca37515ff2d61990f377dfa71ffe930330002c5b15738984'],
  ['guidDtor', 'SharedBase', '100015cd', '10012440', 'ae3f4619b0413d70d3004b9131c3752153074e45725be13b9a148978895e359e'],
  ['guidIsNull', 'SharedBase', '10003fd0', '10012710', '3b51a10464785c496b0f7a62a357ec7cb5172533ec2ceafc9ee59fc4928e2e03'],
  ['guidIsValid', 'SharedBase', '10006abe', '10012450', '47af619b3e220babf4669a6ad04ded74eac128808c50b426ef20410162316d2c'],
  ['guidGetGuidConst', 'SharedBase', '10008be3', '10012460', '58367ffa2a0179375018fa0f5c26da24391e42ebe0ed8fdda35a21fc7bdc396f'],
  ['guidEqualsRaw', 'SharedBase', '100075f4', '10012290', '547f5bb93125da1133935d868b524c211fef6404611e336905b1672e6a6f534c'],
  ['wrapperDestroy', 'Game', '20005489', '20350d00', '63d2647de00319c80682ae69d33bebf4a68fbc9b0bb2755ad85442b3e6869bf2'],
  ['smartptrDestructor', 'Game', '20033a46', '20350c90', 'b8d17fb79244e177bdfdbb3dc680ddfe2f8cd9b16dd22c9c04458c29253f9e29'],
  ['factoryDtor', 'SharedBase', '10002f86', '1008d110', 'eead719707a13201e1cd468ecfd91bcd383b1a0246fd15a15de08cee1216c83c'],
  ['typeBaseDtor', 'SharedBase', '10001e1a', '100880a0', '8486b7a063c0d4369cb54297da8f4236128958875e998c2bebedfb130626413f'],
] as const;
const gamePins = [
  ['scriptAdminRootInitializer', '2051dc90', '94f75ce0f53d0a83cb49e17bce605f8b679250c949f87d23c19a02ee61de0185'],
  ['scriptAdminPropertyIdInitializer', '2051dcf0', '255b329eef015eb66e28cb10319355e23b9c952e9e6af0e6618959059884d0b3'],
  ['scriptAdminAccessorInitializer', '2051dd50', 'b634dac5e8d06f655bb6a1b3553c97c340405aeb3248c2a27f820bac8a84bf76'],
  ['scriptAdminRootCleanup', '20561940', '39ccc802b4091de27ee022153e4fafeb9dcccef26754a1abeeeff9aecfede247'],
  ['scriptAdminPropertyIdCleanup', '205618e0', '7da2a5c0df18633569b307a88f0e46f1a2acd42876be547787b5367b5cbcd46c'],
  ['scriptAdminAccessorCleanup', '20561930', 'e917a077c7f1315048cc9ec7a6b127096fd1169bf8bdfeffc0b9a25f5a6ace95'],
  ['scriptAdminTypeCleanup', '20561900', 'a2e725a108d57c2bfdad64959889467d2738081f9a8a6a065e9a084d02b8998c'],
] as const;
const selected = {
  root: ['scriptAdminRootInitializerSlot', '2051dc90', 'scriptAdminRootCleanup'],
  propertyId: ['scriptAdminPropertyIdInitializerSlot', '2051dcf0', 'scriptAdminPropertyIdCleanup'],
  accessor: ['scriptAdminAccessorInitializerSlot', '2051dd50', 'scriptAdminAccessorCleanup'],
} as const;

function window(fields: NativeHeapObjectViews, offset: number, bytes: number): NativeHeapObjectViews {
  return new NativeHeapObjectViews(fields.backing,
    fields.bytes.byteOffset - fields.backing.bytes.byteOffset + offset, bytes);
}
export class NativeGameScriptAdminStartup {
  readonly root: NativeHeapObjectViews;
  readonly propertyId: NativeHeapObjectViews;
  readonly accessor: NativeHeapObjectViews;
  readonly type: NativeHeapObjectViews;
  readonly factory: NativeHeapObjectViews;
  private readonly typeAndGuard: NativeHeapObjectViews;
  private readonly name: NativeGameScriptAdminClassName;
  private readonly exit: NativeGameExitTable;
  private readonly completed = new Set<Initializer>();
  private readonly registered = new Map<Cleanup, NativeGameCrtCallback>();
  private readonly destroyed = new Set<Cleanup>();
  private readonly cleanupFailed = new Map<Cleanup, string>();
  private readonly trace: string[] = [];
  private active: Initializer | 'type' | 'cleanup' | null = null;
  private boundary: string | null = null;
  private typeBoundary: string | null = null;
  private interruption: string | null = null;
  private frame: NativeMemoryBacking | null = null;
  private temporaryText: NativeHeapCString | null = null;
  private temporaryGuid: NativeGuidText | null = null;

  private constructor(readonly crt: NativeGameCrtOwner, private readonly memory: NativeMemoryAdmin,
    private readonly host: NativeScriptAdminStartupHost, constructionToken: object) {
    if (constructionToken !== token || NativeGameCrtOwner.forPlatform(crt.host) !== crt) throw new Error('Canonical Game CRT owner required');
    const methods = rules.methods as Record<string, { module: string; entry: string; body: string; bodyInstructionBytesSha256: string }>;
    if (rules.schema !== 'gothic3-script-admin-startup-rules-v1' ||
      rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
      rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
      methodPins.some(([label, module, entry, body, hash]) => methods[label]?.module !== module ||
        methods[label]?.entry !== entry || methods[label]?.body !== body || methods[label]?.bodyInstructionBytesSha256 !== hash)) {
      throw new Error('Selected ScriptAdmin lower source receipt differs');
    }
    for (const [label, entry, hash] of gamePins) {
      const method = crt.sourceProfile.heapRules.methods[label];
      if (!method || method.module !== 'Game' || method.entry !== entry || method.body !== entry || method.bodyInstructionBytesSha256 !== hash) {
        throw new Error('Selected Game ScriptAdmin callback receipt differs: ' + label);
      }
    }
    for (const [iat, method] of [
      ['207d87b8', 'propertyWrapperCtor'], ['207d870c', 'typeBaseCtor'],
      ['207d8710', 'factoryCtor'], ['207d8868', 'singletonGetInstance'],
      ['207d8714', 'registerTemplate'], ['207d86b8', 'guidTextCtor'],
      ['207d86ac', 'propertyIdGuidCtor'], ['207d86b0', 'guidDtor'],
      ['207d86b4', 'creatorPropertyIdName'], ['207d88d4', 'propertyIdDtor'],
      ['207d88d0', 'creatorDtor'],
    ] as const) {
      const binding = rules.importBindings['Game:' + iat as keyof typeof rules.importBindings];
      if (!binding || !('targetModule' in binding) || binding.targetModule !== 'SharedBase' ||
        !('selectedMethod' in binding) || binding.selectedMethod !== method ||
        !('exportEntry' in binding) || binding.exportEntry !== methods[method]?.entry ||
        !('body' in binding) || binding.body !== methods[method]?.body || binding.liveImportTargetCaptured !== false) {
        throw new Error('Original Game ScriptAdmin IAT binding differs: ' + iat);
      }
    }
    for (const [iat, name, raw, canonical, entry, body, extent, count, bytes, hash, thunk] of [
      ['207d890c', '??0bCString@@QAE@PBD@Z', 'c28f7d00', cstringTextRules.methods.textConstructor,
        '10003ba7', '100135f0', '100135f0-1001364a', 42, 91, '1bb0b6450709549da4589f055cb6f9780becea05ea8cefcd75e37701a22d0be5', 'e944fa0000'],
      ['207d8834', '??1bCString@@QAE@XZ', '348e7d00', npcHeapRules.methods.cstringDestructor,
        '100060c3', '10012250', '10012250-10012279', 15, 42, 'b072045e99aec22a89a355e2803eb75e933a4700c1296da707f69c00a08214de', 'e988c10000'],
    ] as const) {
      const binding = rules.importBindings['Game:' + iat as keyof typeof rules.importBindings];
      if (cstringTextRules.schema !== 'gothic3-cstring-text-construction-rules-v1' || npcHeapRules.schema !== 'gothic3-npc-heap-rules-v1' ||
          cstringTextRules.inputs.SharedBase !== rules.inputs.SharedBase || npcHeapRules.inputs.SharedBase !== rules.inputs.SharedBase ||
          canonical.module !== 'SharedBase' || canonical.entry !== entry || canonical.body !== body || canonical.bodyRanges !== extent ||
          canonical.instructionCount !== count || canonical.bodyBytes !== bytes || canonical.bodyInstructionBytesSha256 !== hash ||
          !binding || binding.module !== 'Game' || binding.iatVA !== iat || binding.importModule !== 'SharedBase.dll' ||
          binding.decoratedName !== name || binding.ordinal !== null || binding.originalIATBytes !== raw ||
          !('targetModule' in binding) || binding.targetModule !== 'SharedBase' ||
          !('exportEntry' in binding) || binding.exportEntry !== entry || !('body' in binding) || binding.body !== body ||
          !('selectedMethod' in binding) || binding.selectedMethod !== null || !('entryChain' in binding) ||
          binding.entryChain.length !== 1 || binding.entryChain[0]?.va !== entry || binding.entryChain[0]?.bytes !== thunk ||
          binding.entryChain[0]?.targetVA !== body || binding.liveImportTargetCaptured !== false) {
        throw new Error('Original Game CString IAT/lower receipt differs: ' + iat);
      }
    }
    for (const [label, address, bytes, hash] of [
      ['scriptAdminPropertyTypeVtable', '2069b6fc', 40, '609bd4c2d8014d7af269f776371d8cdeb545bde619a3f00293e56894757defb2'],
      ['scriptAdminWrapperVtable', '2069b734', 68, '997e41cb046a19dbebbb302e32996fc99fb6ab204da1dbb3910952fbabf3bace'],
    ] as const) {
      const table = rules.constBytes[label];
      if (table.module !== 'Game' || table.address !== address || table.bytes !== bytes || table.sha256 !== hash) {
        throw new Error('Original ScriptAdmin vtable receipt differs: ' + label);
      }
    }
    const staticObjects = crt.imageStorage('scriptAdminStartupObjects');
    this.typeAndGuard = crt.imageStorage('scriptAdminPropertyTypeAndGuard');
    if (nativeGameImageReceipt('scriptAdminStartupObjects').address !== '207cbf04' || staticObjects.bytes.length !== 40 ||
      nativeGameImageReceipt('scriptAdminPropertyTypeAndGuard').address !== '207cbe78' || this.typeAndGuard.bytes.length !== 64) {
      throw new Error('Actual ScriptAdmin canonical static storage required');
    }
    this.root = window(staticObjects, 0, 16);
    this.propertyId = window(staticObjects, 16, 20);
    this.accessor = window(staticObjects, 36, 4);
    this.type = window(this.typeAndGuard, 0, 24);
    // Selected constructor/destructor access24 bytes. The next12 bytes before
    // the guard are an unclassified image span, not a proven factory sizeof.
    this.factory = window(this.typeAndGuard, 24, 24);
    this.name = NativeGameScriptAdminClassName.forCrt(crt, memory);
    this.exit = NativeGameExitTable.forCrt(crt);
  }

  static forCrt(crt: NativeGameCrtOwner, memory: NativeMemoryAdmin, host: NativeScriptAdminStartupHost): NativeGameScriptAdminStartup {
    const previous = owners.get(crt);
    if (previous) {
      if (previous.memory !== memory || previous.host !== host) throw new Error('ScriptAdmin startup cannot change its retained heap/lower owners');
      return previous;
    }
    const owner = new NativeGameScriptAdminStartup(crt, memory, host, token);
    owners.set(crt, owner); return owner;
  }

  private call<T>(label: string, body: () => NativeValue<T>): T {
    this.trace.push(label + '.attempt');
    const result = body();
    if (this.interruption) throw new Error(this.interruption);
    if (!result.known) throw new Error(label + ': ' + result.reason);
    this.trace.push(label + '.return'); return result.value;
  }
  private missing<T>(label: string): NativeValue<T> { return unknown('Original lower owner required: ' + label); }
  private register(cleanup: Cleanup, label: string): void {
    const callback = this.call('Game._atexit.callback', () => this.exit.callbackForMethod(label));
    const result = this.call('Game._atexit204637ce', () => this.exit.atexit(callback));
    // Native callers ignore the known -1 return; only successful registration
    // retains a cleanup capability for later explicit invocation.
    if (result === 0) this.registered.set(cleanup, callback);
    else this.trace.push('Game._atexit.return-minus-one');
  }

  /** Game2001a311->203526e0. Guarded reentry returns the same static address,
   * including during partial lower construction; it does not reconstruct it. */
  getPropertyType(): NativeValue<NativeHeapObjectViews> {
    let ownsActivity = false;
    try {
      if ((this.typeAndGuard.readUnsigned(60, 1) & 1) !== 0) return known(this.type);
      if (this.typeBoundary) return unknown(this.typeBoundary);
      if (this.active === null) {
        this.active = 'type'; this.interruption = null; ownsActivity = true;
      }
      const flags = this.typeAndGuard.readUnsigned(60);
      this.typeAndGuard.writeUnsigned(60, (flags | 1) >>> 0);
      this.trace.push('Game.ScriptAdmin.type.guard1');
      this.call('SharedBase.typeBaseCtor10088020', () => this.host.typeBaseCtor?.(this.type, 1) ?? this.missing('typeBaseCtor'));
      this.type.writeUnsigned(0, 0x2069b6fc);
      const name = this.call('Game.ScriptAdmin.class-name', () => this.name.get());
      this.call('SharedBase.factoryCtor1008d0a0', () => this.host.factoryCtor?.(this.factory, name) ?? this.missing('factoryCtor'));
      const singleton = this.call('SharedBase.singletonGetInstance10090750', () => this.host.singletonGetInstance?.() ?? this.missing<NativeHeapObjectViews>('singletonGetInstance'));
      this.call('SharedBase.registerTemplate100904d0', () => this.host.registerTemplate?.(singleton, this.type) ?? this.missing('registerTemplate'));
      this.register('type', 'scriptAdminTypeCleanup');
      return known(this.type);
    } catch (error) {
      this.typeBoundary = error instanceof Error ? error.message : String(error);
      return unknown(this.typeBoundary);
    } finally { if (ownsActivity) this.active = null; }
  }

  private initializeRoot(): void {
    // The first AND is itself a native store, before the vtable/flags stores.
    const masked = (this.root.readUnsigned(4) & 0xf8000007) >>> 0;
    this.root.writeUnsigned(4, masked);
    const reread = this.root.readUnsigned(4);
    const count = (((reread & 0xfffffff8) + 8) & 0x07fffff8) >>> 0;
    this.root.writeUnsigned(0, 0x100ea224);
    this.root.writeUnsigned(4, (count | (reread & 0xf8000002) | 2) >>> 0);
    this.root.pointer<NativeHeapObjectViews>(8).set(null);
    this.root.writeUnsigned(0, 0x2069b734);
    const type = this.call('Game.ScriptAdmin.typeSingleton', () => this.getPropertyType());
    this.root.pointer<NativeHeapObjectViews>(12).set(type);
    this.root.pointer<NativeHeapObjectViews>(8).set(null);
    this.call('Game.initializeWrapper20356730.root1', () => this.host.initializeWrapper?.(this.root, 1) ?? this.missing('initializeWrapper'));
    this.register('root', selected.root[2]);
  }

  /** bCPropertyID ctor/dtor clear five DWORDs in the installed store order. */
  private clearPropertyId(): void {
    for (const offset of [12, 8, 4, 0, 16]) this.propertyId.writeUnsigned(offset, 0);
  }
  private setPropertyIdFromGuid(guid: NativeHeapObjectViews): number {
    if (guid.readUnsigned(16, 1) === 0) return 0;
    // IsNull tests validity again before the short-circuit payload comparison.
    if (guid.readUnsigned(16, 1) !== 0) {
      const nullPayload = this.call('SharedBase.Guid.NullPayload101ab150', () => this.host.guidNullPayload?.() ?? this.missing<NativeHeapObjectViews>('guidNullPayload'));
      const isNull = this.call('SharedBase.Guid.EqualsRaw10012290', () => nativeGuidPayloadEquals(guid, nullPayload));
      if (isNull === 1) return 0;
    }
    this.propertyId.writeUnsigned(16, 0);
    for (const offset of [0, 4, 8, 12]) this.propertyId.writeUnsigned(offset, guid.readUnsigned(offset));
    this.propertyId.writeUnsigned(16, 0); return 1;
  }
  private initializePropertyId(): void {
    // SUB ESP,18 allocates uninitialized stack storage, not zero-filled data.
    this.frame = { identity: Object.freeze({}), bytes: new Uint8Array(24), knownMask: new Uint8Array(24), freed: false };
    const frame = new NativeHeapObjectViews(this.frame);
    const stringSlot = window(frame, 0, 4), guid = window(frame, 4, 20);
    this.temporaryText = NativeHeapCString.beginTextConstruction(this.memory, stringSlot, () => this.interruption);
    const literal = this.call<NativeBytePointer>('Game.ScriptAdmin.canonical-guid-literal2069c090', () =>
      this.crt.host.platform.registerCanonicalGameGuidLiteral?.(this.crt) ?? this.missing<NativeBytePointer>('canonical Game GUID literal mapping'));
    this.call('SharedBase.CString.textCtor.IAT207d890c', () => this.temporaryText!.constructText(literal));
    // Text ctor10012ae0 ignores SetData's BOOL and returns its actual this.
    this.temporaryGuid = new NativeGuidText(this.memory, guid, this.host.guidTextPlatform, () => this.interruption);
    this.call('SharedBase.Guid.SetData10012790', () => this.temporaryGuid!.setData(this.temporaryText!));
    this.clearPropertyId();
    this.setPropertyIdFromGuid(guid); // Native constructor ignores this BOOL.
    this.trace.push('SharedBase.Guid.dtor10012440.RET');
    this.call('SharedBase.CString.dtor.IAT207d8834', () => this.temporaryText!.destroy());
    this.register('propertyId', selected.propertyId[2]);
    this.frame.freed = true; // Only the source ADD ESP expires this stack frame.
  }

  private virtual(object: NativeHeapObjectViews, offset: 48 | 52): void {
    this.call('SharedBase.property.current-vtable+' + offset.toString(16), () => this.host.propertyVirtual?.(object, offset) ?? this.missing('propertyVirtual'));
  }
  private initializeAccessor(): void {
    const name = this.call('Game.ScriptAdmin.class-name', () => this.name.get());
    this.accessor.pointer<NativeHeapObjectViews>(0).set(null);
    const singleton = this.call('SharedBase.singletonGetInstance10090750', () => this.host.singletonGetInstance?.() ?? this.missing<NativeHeapObjectViews>('singletonGetInstance'));
    // The PropertyID argument passed by Game is unused by100932e0.
    const returned = this.call('SharedBase.QueryNewObject10090590', () => this.host.queryNewObject?.(singleton, name) ?? this.missing<NativeHeapObjectViews | null>('queryNewObject'));
    if (returned) this.virtual(returned, 48);
    const current = this.accessor.pointer<NativeHeapObjectViews>(0).get();
    if (current) {
      this.virtual(current, 52);
      this.accessor.pointer<NativeHeapObjectViews>(0).set(null);
    }
    this.accessor.pointer<NativeHeapObjectViews>(0).set(returned);
    if (returned) this.virtual(returned, 52);
    // No store follows the final callback: its slot mutations are preserved.
    this.register('accessor', selected.accessor[2]);
  }

  /** Execute one selected body at its actual table slot. This is an explicit
   * body entry, not evidence that CRT traversal or preceding startup completed. */
  invokeInitializer(initializer: Initializer): NativeValue<void> {
    if (this.active) {
      this.interruption = 'Selected ScriptAdmin initializer reentry is unowned';
      return unknown(this.interruption);
    }
    if (this.boundary) return unknown(this.boundary);
    if (this.completed.has(initializer)) return unknown('Repeated native static construction is outside this selected startup owner');
    this.active = initializer;
    this.interruption = null;
    try {
      const [slot, target] = selected[initializer];
      if (this.crt.imageStorage(slot).readUnsigned(0) !== Number.parseInt(target, 16)) throw new Error('Original selected initializer slot differs');
      this.trace.push('Game.initializer.' + target);
      if (initializer === 'root') this.initializeRoot();
      else if (initializer === 'propertyId') this.initializePropertyId();
      else this.initializeAccessor();
      this.completed.add(initializer); return known(undefined);
    } catch (error) {
      this.boundary = error instanceof Error ? error.message : String(error);
      this.trace.push('blocked:' + this.boundary); return unknown(this.boundary);
    } finally { this.active = null; }
  }

  /** Selected callbacks only. The CRT exit-table traversal remains separate. */
  invokeRegisteredCleanup(callback: NativeGameCrtCallback): NativeValue<void> {
    const cleanup = [...this.registered].find(([, retained]) => retained === callback)?.[0];
    if (!cleanup) return unknown('Actual successfully registered ScriptAdmin cleanup capability required');
    if (this.active) {
      this.interruption = 'Concurrent selected ScriptAdmin cleanup is unowned';
      return unknown(this.interruption);
    }
    if (this.destroyed.has(cleanup)) return unknown('Repeated selected ScriptAdmin cleanup is unowned');
    const failure = this.cleanupFailed.get(cleanup);
    if (failure) return unknown(failure);
    this.active = 'cleanup';
    this.interruption = null;
    try {
      if (cleanup === 'root') {
        this.root.writeUnsigned(0, 0x2069b734);
        this.call('Game.wrapperDestroy20350d00', () => this.host.wrapperDestroy?.(this.root) ?? this.missing('wrapperDestroy'));
        this.call('Game.smartptrDestructor20350c90', () => this.host.smartptrDestructor?.(this.root) ?? this.missing('smartptrDestructor'));
      } else if (cleanup === 'type') {
        this.type.writeUnsigned(0, 0x2069b6fc);
        this.call('SharedBase.factoryDtor1008d110', () => this.host.factoryDtor?.(this.factory) ?? this.missing('factoryDtor'));
        this.call('SharedBase.typeBaseDtor100880a0', () => this.host.typeBaseDtor?.(this.type) ?? this.missing('typeBaseDtor'));
      } else if (cleanup === 'propertyId') this.clearPropertyId();
      else {
        const panic = this.call('SharedBase.ErrorAdmin.IsInPanicState', () => this.host.errorAdminPanicState?.() ?? this.missing<number>('errorAdminPanicState'));
        if ((panic & 255) === 0) {
          const current = this.accessor.pointer<NativeHeapObjectViews>(0).get();
          if (current) { this.virtual(current, 52); this.accessor.pointer<NativeHeapObjectViews>(0).set(null); }
          this.accessor.pointer<NativeHeapObjectViews>(0).set(null);
        }
      }
      this.destroyed.add(cleanup); return known(undefined);
    } catch (error) {
      this.boundary = error instanceof Error ? error.message : String(error);
      this.cleanupFailed.set(cleanup, this.boundary);
      return unknown(this.boundary);
    } finally { this.active = null; }
  }

  snapshot() { return Object.freeze({ boundary: this.boundary, typeBoundary: this.typeBoundary,
    completed: Object.freeze([...this.completed]), registered: Object.freeze([...this.registered]),
    destroyed: Object.freeze([...this.destroyed]), cleanupFailed: Object.freeze([...this.cleanupFailed]),
    frame: this.frame, temporaryText: this.temporaryText, temporaryGuid: this.temporaryGuid,
    trace: Object.freeze([...this.trace]), crtTraversalCompleted: false, nativeModuleInstantiated: false }); }
}
