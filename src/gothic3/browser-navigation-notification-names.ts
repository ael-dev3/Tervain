/** Selected Game.dll Navigation callback CString globals. This reproduces the
 * five audited C++ initializer/destructor pairs through the shared source
 * CString and MemoryAdmin owners; the rest of Game CRT startup is not run. */
import rulesText from '../../assets/gothic3/browser-navigation-owner/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { nativeEntityOnReadContent } from './entity-lifecycle';
import type { NativeLiveEntity, NativeLivePropertySet } from './entity-lifecycle';
import { NativeHeapCString } from './native-heap-cstring';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryAdmin } from './native-memory-admin';
import type { NativeBytePointer } from './native-pointer-geometry';
import type { OriginalEnclaveProxy, OriginalProxyInternalReference } from './native-properties';
import { OriginalEnclaveProxy as OriginalEnclaveProxyOwner } from './native-properties';
import type { NativeNavigationNotificationHost, NativeNavigationNotifyString,
  NativeNavigationContactIterator, NativeNavigationContactSlot, NativeNavigationScriptAdmin,
  NativeNavigationAreaScriptSlot, NativeNavigationPropertyName } from './navigation-notifications';
import type { NativeGameScriptAdminLookup } from './native-game-script-admin-lookup';
import type { OriginalNavigationProperties } from './navigation-reading';
import type { NativeNavigationDCCHost } from './navigation-runtime';
import type { NativeRuntimePlatform } from './native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const missing = <T>(reason: string): NativeValue<T> => ({ known: false, reason });

/** Exact capabilities supplied by the selected Navigation source-runtime
 * owners; these methods cannot resolve arbitrary world entities/property sets. */
export interface BrowserNavigationProxyEntityServices {
  resolveEntity(id20: string): NativeValue<NativeLiveEntity | null>;
  hasPropertySet(entity: NativeLiveEntity, type: 8 | 10): NativeValue<number>;
  getPropertySet(entity: NativeLiveEntity, type: 6 | 8 | 10): NativeValue<object | null>;
  getPropertyOwner(set: object): NativeValue<NativeLiveEntity | null>;
}
const rules = JSON.parse(rulesText) as {
  schema: string; inputs: { Game: string; SharedBase: string };
  methods: Record<string, { entry: string; body: string; bodyInstructionBytesSha256: string }>;
  contactRuntime: {
    entityContactVtable: { module: string; tableAddress: string; className: string; scope: string;
      slots: readonly { phase: string; slotOffset: string; slotBytes: string; thunk: string;
        thunkBytes: string; iat: string; importModule: string; importName: string }[] };
    propertyContactVtables: readonly { className: string; tableAddress: string;
      slots: readonly { phase: string; slotOffset: string; slotBytes: string; target: string;
        method: string; body: string; bodyInstructionBytesSha256: string }[] }[];
    contactIterator: { module: string; extentBytes: number; permittedTypes: readonly number[];
      currentContactPointerOffset: number; flagBytesOffset: number; resetFlagOffset: number;
      collisionTypeOffset: number; cStringOffset: number; trailingWordOffset: number;
      methods: Record<string, { entry: string; body: string; bodyInstructionBytesSha256: string }>;
      vectors: { defaultConstructor: string; clear: string; destructor: string;
        firstOffset: number; secondOffset: number; clearedOffset: number } };
    contactDispatch: { module: string; methods: Record<string, { entry: string; body: string;
      bodyInstructionBytesSha256: string }> };
  };
  proxyCopyVtable: { module: string; address: string; slotOffset: string; slotBytes: string;
    slotTarget: string; scope: string };
  coldGlobals: Record<string, { module: string; address: string; bytes: number; raw: string;
    knownMask: string; scope: string; liveValueCaptured: boolean }>;
  navigationNameInitializers: { module: string; tableAddress: string; tableBytes: number;
    tableSha256: string; tableWholeExecuted: boolean;
    initializers: readonly { name: string; tableIndex: number; tableSlot: string; tableTarget: string;
      globalSlot: string; globalBytes: number; globalRaw: string; globalKnownMask: string;
      globalScope: string; literalAddress: string; literalRaw: string; destructor: string;
      method: { entry: string; body: string; bodyInstructionBytesSha256: string } }[] };
};

const contactMethodExpectations: readonly (readonly [string, string, string, string])[] = [
  ['contactIteratorConstructor', '3003e3a1', '30315c70', 'e0a75fcb0ad416b11ae20fc7b30259d3290619ca091cd0fe222a2b9825789525'],
  ['contactIteratorReset', '3000e7a0', '30315f30', '0429841cd0a5e0b2f33b2d1cf19a8af9e4dd0f9170efe889f2ea7f39cd916f00'],
  ['contactIteratorDestructor', '30027bc9', '30316670', 'f827843ee4c3c683d99d4452b566d2b554aad55ab78d2a8da44e3353de17c973'],
  ['contactIteratorVectorConstructor', '10002833', '10024b70', '58367ffa2a0179375018fa0f5c26da24391e42ebe0ed8fdda35a21fc7bdc396f'],
  ['contactIteratorVectorClear', '10005ae7', '10024e00', 'ee41e778e2d78f9d109e62d11cdc7f1a8b2a56fdcb28c768a9ec5f6762626364'],
  ['contactIteratorVectorDestructor', '10005461', '10024b80', 'ae3f4619b0413d70d3004b9131c3752153074e45725be13b9a148978895e359e'],
  ['dynamicEntityOnTouch', '3003af80', '304be5c0', '28cb1bde7afe411f7cc77472541601ac7290937de51137c5e0e2846b52f3285a'],
  ['dynamicEntityOnUntouch', '30044850', '304be760', '5b151e58b7aa4da5bc1378ead926e5f9a397d6b4426da35492cd8a6ff15c3b48'],
  ['navigationPSOnTouch', '200234ed', '202864c0', '93cf62e206a2befd4bcbf3fe328ab198e056683c503aa131e2b40cbd4ec79b40'],
  ['navigationPSOnUntouch', '2001cac1', '202864d0', '7ecb12115189f9b7f709ab2a2574e326a1d3c85a58b9df028615a9bd24ec5d29'],
  ['zonePSOnTouch', '2002cef3', '2029f300', '93cf62e206a2befd4bcbf3fe328ab198e056683c503aa131e2b40cbd4ec79b40'],
  ['zonePSOnUntouch', '20002ac7', '2029f310', '7ecb12115189f9b7f709ab2a2574e326a1d3c85a58b9df028615a9bd24ec5d29'],
  ['pathPSOnTouch', '2000707c', '20296ef0', '93cf62e206a2befd4bcbf3fe328ab198e056683c503aa131e2b40cbd4ec79b40'],
  ['pathPSOnUntouch', '2002d0c9', '20296f00', '7ecb12115189f9b7f709ab2a2574e326a1d3c85a58b9df028615a9bd24ec5d29'],
];
const expectedPropertyContactVtables = [
  ['gCNavigation_PS', '2068e8b4', 'cc', 'ed340220', '200234ed', '202864c0', 'navigationPSOnTouch', 'd4', 'c1ca0120', '2001cac1', '202864d0', 'navigationPSOnUntouch'],
  ['gCNavZone_PS', '2068fb34', 'cc', 'f3ce0220', '2002cef3', '2029f300', 'zonePSOnTouch', 'd4', 'c72a0020', '20002ac7', '2029f310', 'zonePSOnUntouch'],
  ['gCNavPath_PS', '2068f414', 'cc', '7c700020', '2000707c', '20296ef0', 'pathPSOnTouch', 'd4', 'c9d00220', '2002d0c9', '20296f00', 'pathPSOnUntouch'],
] as const;

const expected = [
  ['CurrentZoneEntityProxy', 100357, '205ce014', '2050aa10', '207bfaa0', '20656168',
    '43757272656e745a6f6e65456e7469747950726f787900', '2055bd80',
    '477bd4687a103135ccfa3d6fba1416ef6d5b8681bec37b89c8d0c8855cf55804',
    '0d2857bafb4c0d79d2292e8ccfa2f3523e0e694e495b7a11d43bd0b03ac0d5c3'],
  ['Routine', 100358, '205ce018', '2050aa40', '207bfaa4', '20656138', '526f7574696e6500', '2055bd90',
    '8adeb3800874c02a11f369115fdeb86b356e512ea35b0258f8569961281a95d6',
    'ffe3c85922d7c3a0918af315cdfb47bb13c9dbeea4acbae1bdb6e93491e505bd'],
  ['SleepingPoint', 100359, '205ce01c', '2050aa70', '207bfaa8', '20656128', '536c656570696e67506f696e7400', '2055bda0',
    '1d82e65ccca83996eee007aa26cb7e7453141ac818273952d71b07fae4540589',
    '03193631fa5f053a3e3111e7a9625f24c834300f3b09e83c7e5e1d96699d94d9'],
  ['WorkingPoint', 100360, '205ce020', '2050aaa0', '207bfaac', '20656108', '576f726b696e67506f696e7400', '2055bdb0',
    '68188f806bb7060b416f1cc23d70d5a76c6729a0953077cf5ff0085e2967f267',
    'd13652d01bc808ffb4e24f7d0a44367a141faada0f1d2be69b6d7be7901f3b79'],
  ['RelaxingPoint', 100361, '205ce024', '2050aad0', '207bfab0', '20656118', '52656c6178696e67506f696e7400', '2055bdc0',
    '6071bf7ed5373099fc5af1c5a729dbc807e5916d426431c2e095da9b30d25b93',
    '1dce64916337b8e59b2d9420271c5c6eaa7ddf1bccff04fa287cebf1566b56cd'],
] as const;

function verifyReceipt(): void {
  const profile = rules.navigationNameInitializers;
  if (rules.schema !== 'gothic3-browser-navigation-owner-rules-v1' ||
      rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
      rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
      profile.module !== 'Game' || profile.tableAddress !== '2056c000' || profile.tableBytes !== 955408 ||
      profile.tableSha256 !== 'b03bdc863cc852e3b14ef05e1082cb8616ce78c63efe3d35e5e80e9dcea40185' ||
      profile.tableWholeExecuted !== false || profile.initializers.length !== expected.length ||
      rules.methods.stringConstructor?.body !== '100135f0' ||
      rules.methods.stringDestructor?.body !== '10012250' ||
      rules.methods.stringEqualsString?.body !== '10011600' ||
      rules.methods.stringEqualsChars?.body !== '10013b70' ||
      rules.methods.stringCompareChars?.body !== '100137c0' ||
      rules.methods.proxyGetEntity?.body !== '304c46e0' ||
      rules.methods.proxySetEntityPointer?.body !== '304c43a0' ||
      rules.methods.proxyConstructor?.body !== '304c45a0' ||
      rules.methods.proxyAssignment?.body !== '304c4270' ||
      rules.methods.proxyDestructor?.body !== '304c4680' ||
      rules.methods.proxyCopyFrom?.entry !== '30008adf' ||
      rules.methods.proxyCopyFrom?.body !== '304c4290' ||
      rules.methods.proxyCopyFrom?.bodyInstructionBytesSha256 !== '81f93e2d321601f86f81fc23f4ab15b473c4cea04151478ef440d6aa1aac5233' ||
      rules.proxyCopyVtable.module !== 'Engine' || rules.proxyCopyVtable.address !== '3087bff4' ||
      rules.proxyCopyVtable.slotOffset !== '14' || rules.proxyCopyVtable.slotBytes !== 'df8a0030' ||
      rules.proxyCopyVtable.slotTarget !== '30008adf' ||
      rules.proxyCopyVtable.scope !== 'original-Engine-PE-file-backed-vtable' ||
      rules.methods.contactEnabled?.body !== '201327e0' ||
      rules.coldGlobals.contactMask?.module !== 'Game' ||
      rules.coldGlobals.contactMask.address !== '207b8588' || rules.coldGlobals.contactMask.bytes !== 8 ||
      rules.coldGlobals.contactMask.raw !== '0000000000000000' ||
      rules.coldGlobals.contactMask.knownMask !== 'ffffffffffffffff' ||
      rules.coldGlobals.contactMask.scope !== 'cold-original-image' ||
      rules.coldGlobals.contactMask.liveValueCaptured !== false ||
      rules.contactRuntime.entityContactVtable.module !== 'Game' ||
      rules.contactRuntime.entityContactVtable.tableAddress !== '2066813c' ||
      rules.contactRuntime.entityContactVtable.className !== 'gCEntity' ||
      rules.contactRuntime.entityContactVtable.scope !== 'original-Game-PE-file-backed-vtable-and-Engine-import-thunk' ||
      rules.contactRuntime.entityContactVtable.slots.length !== 2 ||
      rules.contactRuntime.contactIterator.module !== 'Engine' ||
      rules.contactRuntime.contactIterator.extentBytes !== 0x44 ||
      rules.contactRuntime.contactIterator.permittedTypes.join(',') !== '5,8,10' ||
      rules.contactRuntime.contactIterator.currentContactPointerOffset !== 0 ||
      rules.contactRuntime.contactIterator.flagBytesOffset !== 0x30 ||
      rules.contactRuntime.contactIterator.resetFlagOffset !== 0x32 ||
      rules.contactRuntime.contactIterator.collisionTypeOffset !== 0x38 ||
      rules.contactRuntime.contactIterator.cStringOffset !== 0x3c ||
      rules.contactRuntime.contactIterator.trailingWordOffset !== 0x40 ||
      rules.contactRuntime.contactIterator.vectors.defaultConstructor !== '10002833' ||
      rules.contactRuntime.contactIterator.vectors.clear !== '10005ae7' ||
      rules.contactRuntime.contactIterator.vectors.destructor !== '10005461' ||
      rules.contactRuntime.contactIterator.vectors.firstOffset !== 0x0c ||
      rules.contactRuntime.contactIterator.vectors.secondOffset !== 0x18 ||
      rules.contactRuntime.contactIterator.vectors.clearedOffset !== 0x24 ||
      rules.contactRuntime.contactDispatch.module !== 'Engine' ||
      rules.contactRuntime.propertyContactVtables.length !== expectedPropertyContactVtables.length) {
    throw new Error('Original Navigation name/CString source receipt differs');
  }
  for (const [label, entry, body, hash] of contactMethodExpectations) {
    const method = rules.methods[label], iteratorMethod = rules.contactRuntime.contactIterator.methods[label],
      dispatchMethod = rules.contactRuntime.contactDispatch.methods[label];
    if (method?.entry !== entry || method.body !== body || method.bodyInstructionBytesSha256 !== hash) {
      throw new Error('Original contact method receipt differs: ' + label);
    }
    if (label.startsWith('contactIterator') &&
        (!iteratorMethod || iteratorMethod.entry !== entry || iteratorMethod.body !== body ||
         iteratorMethod.bodyInstructionBytesSha256 !== hash)) {
      throw new Error('Original contact iterator method receipt differs: ' + label);
    }
    if (label.startsWith('dynamicEntity') &&
        (!dispatchMethod || dispatchMethod.entry !== entry || dispatchMethod.body !== body ||
         dispatchMethod.bodyInstructionBytesSha256 !== hash)) {
      throw new Error('Original contact dispatch method receipt differs: ' + label);
    }
  }
  const entitySlots = rules.contactRuntime.entityContactVtable.slots;
  const expectedEntitySlots = [
    ['OnTouch', '174', 'e8284620', '204628e8', 'ff257c697d20', '207d697c', '?OnTouch@eCDynamicEntity@@UAEXPAVeCEntity@@AAVeCContactIterator@@@Z'],
    ['OnUntouch', '17c', 'f4284620', '204628f4', 'ff2574697d20', '207d6974', '?OnUntouch@eCDynamicEntity@@UAEXPAVeCEntity@@AAVeCContactIterator@@@Z'],
  ] as const;
  for (const [index, expectedSlot] of expectedEntitySlots.entries()) {
    const slot = entitySlots[index]!;
    if (slot.phase !== expectedSlot[0] || slot.slotOffset !== expectedSlot[1] ||
        slot.slotBytes !== expectedSlot[2] || slot.thunk !== expectedSlot[3] ||
        slot.thunkBytes !== expectedSlot[4] || slot.iat !== expectedSlot[5] ||
        slot.importModule !== 'Engine.dll' || slot.importName !== expectedSlot[6]) {
      throw new Error('Original gCEntity contact vtable/import receipt differs: ' + expectedSlot[0]);
    }
  }
  for (const [index, expectedRow] of expectedPropertyContactVtables.entries()) {
    const row = rules.contactRuntime.propertyContactVtables[index]!;
    const [className, address, touchOffset, touchBytes, touchTarget, touchBody,
      touchMethod, untouchOffset, untouchBytes, untouchTarget, untouchBody, untouchMethod] = expectedRow;
    const touch = row.slots[0], untouch = row.slots[1];
    const touchEvidence = rules.methods[touchMethod], untouchEvidence = rules.methods[untouchMethod];
    if (row.className !== className || row.tableAddress !== address || row.slots.length !== 2 ||
        touch?.phase !== 'OnTouch' || touch.slotOffset !== touchOffset || touch.slotBytes !== touchBytes ||
        touch.target !== touchTarget || touch.method !== touchMethod || touch.body !== touchBody ||
        touch.bodyInstructionBytesSha256 !== touchEvidence?.bodyInstructionBytesSha256 ||
        untouch?.phase !== 'OnUntouch' || untouch.slotOffset !== untouchOffset ||
        untouch.slotBytes !== untouchBytes || untouch.target !== untouchTarget ||
        untouch.method !== untouchMethod || untouch.body !== untouchBody ||
        untouch.bodyInstructionBytesSha256 !== untouchEvidence?.bodyInstructionBytesSha256) {
      throw new Error('Original Navigation property contact vtable receipt differs: ' + className);
    }
  }
  for (const [index, value] of expected.entries()) {
    const [name, tableIndex, tableSlot, target, globalSlot, literalAddress, literalRaw,
      destructor, initializerHash, destructorHash] = value;
    const row = profile.initializers[index]!;
    const destructorMethod = rules.methods['navigationNameDestructor' + name];
    if (row.name !== name || row.tableIndex !== tableIndex || row.tableSlot !== tableSlot ||
        row.tableTarget !== target || row.globalSlot !== globalSlot || row.globalBytes !== 4 ||
        row.globalRaw !== '00000000' || row.globalKnownMask !== 'ffffffff' ||
        row.globalScope !== 'original-Game-PE-loader-zero-fill' || row.literalAddress !== literalAddress ||
        row.literalRaw !== literalRaw || row.destructor !== destructor ||
        row.method.entry !== target || row.method.body !== target ||
        row.method.bodyInstructionBytesSha256 !== initializerHash ||
        destructorMethod?.entry !== destructor || destructorMethod.body !== destructor ||
        destructorMethod.bodyInstructionBytesSha256 !== destructorHash) {
      throw new Error('Original Navigation name initializer differs: ' + name);
    }
  }
}

function asciiCString(text: string): Uint8Array | null {
  if (typeof text !== 'string' || text.includes('\0')) return null;
  const bytes = new Uint8Array(text.length + 1);
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index); if (code > 0x7f) return null; bytes[index] = code;
  }
  return bytes;
}
function compareBytes(left: Uint8Array, right: Uint8Array): number {
  const count = Math.min(left.length, right.length);
  for (let index = 0; index < count; index++) {
    if (left[index] !== right[index]) return left[index]! < right[index]! ? -1 : 1;
  }
  return left.length === right.length ? 0 : left.length < right.length ? -1 : 1;
}
function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

/** Source-shaped stack value used only by the selected Navigation contact
 * callbacks. Its first two bCVectors remain unknown because the original
 * default constructor is a literal no-write; the third vector is cleared. */
class BrowserNavigationContactIterator implements NativeNavigationContactIterator {
  readonly identity = Object.freeze({});
  readonly backing = { identity: Object.freeze({}), bytes: new Uint8Array(0x44),
    knownMask: new Uint8Array(0x44), freed: false };
  readonly fields = new NativeHeapObjectViews(this.backing);
  readonly cString: NativeHeapCString;
  readonly trace: string[] = [];
  private ended = false;

  constructor(memory: NativeMemoryAdmin, readonly collisionType: 5 | 8 | 10) {
    this.trace.push('bCVector.default+0x0c:SharedBase10002833');
    this.trace.push('bCVector.default+0x18:SharedBase10002833');
    this.trace.push('bCVector.default+0x24:SharedBase10002833');
    this.cString = new NativeHeapCString(memory, new NativeHeapObjectViews(this.backing, 0x3c, 4));
    this.trace.push('bCString.default+0x3c:SharedBase10012d20');
    this.fields.writeUnsigned(0x38, collisionType);
    this.fields.writeUnsigned(0, 0);
    this.fields.writeUnsigned(0x30, 1, 1);
    this.fields.writeUnsigned(0x31, 0, 1);
    this.fields.writeUnsigned(0x33, 0, 1);
    this.fields.writeUnsigned(0x32, 0, 1);
    this.fields.writeUnsigned(0x34, 0, 1);
    this.fields.writeUnsigned(8, 0);
    this.fields.writeUnsigned(0x40, 0xffffffff);
    this.fields.writeUnsigned(4, 0);
    this.trace.push('bCVector.clear+0x24:SharedBase10005ae7');
    for (const offset of [0, 4, 8]) this.fields.writeUnsigned(0x24 + offset, 0);
    const cleared = this.cString.clear();
    if (!cleared.known) throw new Error('Original contact iterator bCString Clear: ' + cleared.reason);
    this.trace.push('bCString.clear+0x3c:SharedBase100149b0');
  }

  reset(): NativeValue<void> {
    if (this.ended) return missing('Contact iterator lifetime has ended');
    const pointer = this.fields.readUnsigned(0);
    this.fields.writeUnsigned(0x32, 0, 1);
    this.trace.push('eCContactIterator.ResetIterator:Engine30315f30');
    if (pointer !== 0) return missing('Non-NULL contact iterator list deletion requires original MemoryAdmin DeleteObject');
    return known(undefined);
  }

  destroy(): NativeValue<void> {
    if (this.ended) return missing('Contact iterator destructor already ran');
    const pointer = this.fields.readUnsigned(0);
    if (pointer !== 0) return missing('Non-NULL contact iterator list deletion requires original MemoryAdmin DeleteObject');
    this.fields.writeUnsigned(4, 0);
    const destroyed = this.cString.destroy();
    if (!destroyed.known) return destroyed;
    this.trace.push('eCContactIterator bCString destructor:Engine30316670');
    this.trace.push('bCVector destructor+0x24:SharedBase10005461');
    this.trace.push('bCVector destructor+0x18:SharedBase10005461');
    this.trace.push('bCVector destructor+0x0c:SharedBase10005461');
    this.ended = true;
    this.backing.freed = true;
    return known(undefined);
  }
}

/** Retains the exact browser source entity resolved by the selected proxy ID.
 * It models the referenced entity pointer's GetEntity/ReleaseReference pair;
 * it does not extend the entity or source-runtime lifetime. */
class BrowserResolvedNavigationProxyReference implements OriginalProxyInternalReference {
  readonly identity: string;
  private referenceCount = 1;
  private live = true;
  constructor(private readonly entity: NativeLiveEntity) {
    this.identity = 'browser-navigation-proxy-reference:' + entity.identity;
  }
  getEntity(): NativeValue<NativeLiveEntity | null> {
    return this.live ? known(this.entity) : missing('Resolved Navigation proxy internal reference was released');
  }
  addReference(): NativeValue<void> {
    if (!this.live || this.referenceCount < 1) return missing('Resolved Navigation proxy internal reference is not live');
    this.referenceCount++;
    return known(undefined);
  }
  releaseReference(): NativeValue<void> {
    if (!this.live || this.referenceCount < 1) return missing('Resolved Navigation proxy internal reference was already released');
    if (--this.referenceCount === 0) this.live = false;
    return known(undefined);
  }
}

/** Browser-owned lower CString/module-name service. It admits five static
 * globals from the original CRT table and uses actual MemoryAdmin CString
 * holders. It also admits selected gCEntity contact dispatch and verified
 * no-op Navigation property-set callbacks; other callback owners remain
 * explicit boundaries. */
export class BrowserNavigationNotificationNames {
  private readonly staticStorage = { identity: Object.freeze({}), bytes: new Uint8Array(expected.length * 4),
    knownMask: new Uint8Array(expected.length * 4).fill(255), freed: false };
  private readonly contactMaskStorage = { identity: Object.freeze({}), bytes: new Uint8Array(8),
    knownMask: new Uint8Array(8).fill(255), freed: false };
  private readonly names = new Map<NativeNavigationPropertyName, NativeHeapCString>();
  private readonly temporaries = new Map<NativeNavigationNotifyString, NativeHeapCString>();
  private readonly temporaryProxies = new Set<OriginalEnclaveProxy>();
  private readonly contactIterators = new Set<BrowserNavigationContactIterator>();
  private readonly borrowedInputs = new Set<object>();
  private readonly navigationActors = new WeakSet<NativeLiveEntity>();
  private scriptAdminLookup: Pick<NativeGameScriptAdminLookup<NativeNavigationScriptAdmin, object>, 'getInstance'> | null = null;
  private proxyEntityServices: BrowserNavigationProxyEntityServices | null = null;
  private proxyResolutionAttempted = false;
  private state: 'cold' | 'running' | 'ready' | 'blocked' = 'cold';
  private boundary: string | null = null;
  readonly host: NativeNavigationNotificationHost;

  constructor(private readonly memory: NativeMemoryAdmin, private readonly platform: NativeRuntimePlatform) {
    verifyReceipt();
    this.host = Object.freeze({
      constructString: (text: string) => this.constructString(text),
      destroyString: (value: NativeNavigationNotifyString) => this.destroyString(value),
      equalsNameString: (name: NativeNavigationPropertyName, value: NativeNavigationNotifyString) => this.equalsNameString(name, value),
      equalsNameChars: (name: 'SleepingPoint' | 'WorkingPoint' | 'RelaxingPoint', text: string) => this.equalsNameChars(name, text),
      getProxyEntity: (proxy: OriginalEnclaveProxy) => this.getProxyEntity(proxy),
      constructProxy: () => this.constructProxy(),
      assignProxy: (destination: OriginalEnclaveProxy, source: OriginalEnclaveProxy) => this.assignProxy(destination, source),
      destroyProxy: (proxy: OriginalEnclaveProxy) => this.destroyProxy(proxy),
      hasPropertySet: (entity: NativeLiveEntity, type: 8 | 10) => this.proxyEntityServices?.hasPropertySet(entity, type) ??
        this.notConnected<number>('eCEntity GetPropertySet'),
      getPropertySet: (entity: NativeLiveEntity, type: 6 | 8 | 10) => type === 6
        ? this.getNavigationActorPropertySet(entity)
        : this.proxyEntityServices?.getPropertySet(entity, type) ??
          this.notConnected<object | null>('eCEntity GetPropertySet'),
      getPropertyOwner: (set: object) => this.proxyEntityServices?.getPropertyOwner(set) ??
        this.notConnected<NativeLiveEntity | null>('Navigation area property owner'),
      getNavigationOwner: (properties: OriginalNavigationProperties): NativeValue<NativeLiveEntity | null> => {
        try {
          properties.exact();
          const owner = properties.owner as NativeLiveEntity | null;
          if (owner !== null) this.navigationActors.add(owner);
          return known<NativeLiveEntity | null>(owner);
        }
        catch (error) { return missing<NativeLiveEntity | null>(error instanceof Error ? error.message : String(error)); }
      },
      registerDcc: (_set: object, _dcc: NativeNavigationDCCHost) => this.notConnected<void>('Navigation DCC registration'),
      deregisterDcc: (_set: object, _dcc: NativeNavigationDCCHost | null) => this.notConnected<void>('Navigation DCC deregistration'),
      contactNotificationsEnabled: (entity: NativeLiveEntity) => this.contactNotificationsEnabled(entity),
      constructContactIterator: (type: 5 | 8 | 10) => this.constructContactIterator(type),
      destroyContactIterator: (iterator: NativeNavigationContactIterator) => this.destroyContactIterator(iterator),
      captureContactSlot: (receiver: NativeLiveEntity, phase: 'enter' | 'exit') => this.captureContactSlot(receiver, phase),
      scriptAdmin: () => this.scriptAdminLookup?.getInstance() ??
        this.notConnected<NativeNavigationScriptAdmin | null>('Game ScriptAdmin getter'),
      captureAreaScriptSlot: (_admin: NativeNavigationScriptAdmin) =>
        this.notConnected<NativeNavigationAreaScriptSlot>('Navigation area script vtable slot'),
      pointNotification: (_properties: OriginalNavigationProperties, _phase: 'enter' | 'exit', _name: 'SleepingPoint' | 'WorkingPoint' | 'RelaxingPoint') =>
        this.notConnected<void>('Navigation point ref-count/cache callback'),
      routineNotification: (_properties: OriginalNavigationProperties) => this.notConnected<void>('Navigation Routine callback'),
    });
  }

  private notConnected<T>(operation: string): NativeValue<T> {
    return missing('Original ' + operation + ' owner is not connected');
  }

  /** Connect only a getter backed by the retained source globals and its real
   * class-name, ModuleAdmin and RTTI owners. The area CallScript slot remains a
   * separate prerequisite. */
  connectScriptAdminLookup(lookup: Pick<NativeGameScriptAdminLookup<NativeNavigationScriptAdmin, object>, 'getInstance'>): void {
    if (!lookup || typeof lookup.getInstance !== 'function' || this.scriptAdminLookup) {
      throw new Error('One retained source ScriptAdmin lookup owner is required');
    }
    this.scriptAdminLookup = lookup;
  }

  /** Connect the selected SceneAdmin-backed entity/property table before a
   * Navigation proxy is resolved. The source runtime can resolve only its own
   * catalog IDs and exact selected Navigation property sets. */
  connectProxyEntityServices(services: BrowserNavigationProxyEntityServices): void {
    if (!services || typeof services.resolveEntity !== 'function' || this.proxyResolutionAttempted ||
        (this.proxyEntityServices !== null && this.proxyEntityServices !== services)) {
      throw new Error('Navigation proxy entity resolver is already selected or has been used');
    }
    this.proxyEntityServices = services;
  }

  private getProxyEntity(proxy: OriginalEnclaveProxy): NativeValue<NativeLiveEntity | null> {
    this.proxyResolutionAttempted = true;
    try {
      const internal = proxy.internal;
      if (internal !== null) {
        return internal instanceof BrowserResolvedNavigationProxyReference
          ? internal.getEntity()
          : missing('Original Navigation proxy internal GetEntity owner is not connected');
      }
      const rawId = proxy.propertyID();
      if (!/^[0-9a-f]{40}$/.test(rawId)) return missing('Original Navigation proxy PropertyID storage is invalid');
      if (/^0{32}/.test(rawId)) return known(null); // Source IsValid false branch.
      const services = this.proxyEntityServices;
      if (!services) return this.notConnected<NativeLiveEntity | null>('Engine proxy ResolveEntity/SceneAdmin');
      const id = rawId.slice(0, 32) + '00000000';
      const resolved = services.resolveEntity(id);
      if (!resolved.known || resolved.value === null) return resolved;
      if (resolved.value.propertyId20.slice(0, 32) !== id.slice(0, 32)) {
        return missing('Resolved Navigation source entity ID differs from the proxy ID');
      }
      const reference = new BrowserResolvedNavigationProxyReference(resolved.value);
      proxy.cacheResolvedEntity(id, reference, () => {});
      return reference.getEntity();
    } catch (error) { return missing(error instanceof Error ? error.message : String(error)); }
  }

  /** Engine GetPropertySet6 during the Navigation actor transition reads the
   * actor's current sorted PS array. At this callback point it may be absent:
   * a later serialized property-set read must not be treated as already added. */
  private getNavigationActorPropertySet(entity: NativeLiveEntity): NativeValue<object | null> {
    if (!this.navigationActors.has(entity)) return missing('Actual Navigation actor property owner is not the selected current owner');
    const content = nativeEntityOnReadContent(entity);
    if (!content.known) return content;
    const word = entity.propertyTypeBits[0];
    if (!Number.isInteger(word)) return missing('Native actor property-type bitset word is unavailable');
    // Engine GetPropertySet calls OnReadContent first, then returns NULL
    // immediately when this bit is clear. The set is added later in this read.
    if (((word! >>> 6) & 1) === 0) return known(null);
    return missing('Nested Navigation actor SearchForEntity with type-6 bit set is not connected');
  }

  /** Game201327e0 lazily initializes its global mask to 0x800000, then checks
   * that bit in the entity's first flags DWORD. Unknown flag bits stay unknown. */
  private contactNotificationsEnabled(entity: NativeLiveEntity): NativeValue<number> {
    try {
      const globals = new NativeHeapObjectViews(this.contactMaskStorage);
      const initialized = globals.readUnsigned(4);
      if ((initialized & 1) === 0) {
        globals.writeUnsigned(4, initialized | 1);
        globals.writeUnsigned(0, 0x800000);
      }
      const mask = globals.readUnsigned(0);
      if (!mask || (entity.flags.knownMask & mask) !== mask) {
        return missing('Original contact-notification entity flag bits are not initialized');
      }
      return known(Number((entity.flags.value & mask) !== 0));
    } catch (error) { return missing(error instanceof Error ? error.message : String(error)); }
  }

  private constructContactIterator(type: 5 | 8 | 10): NativeValue<NativeNavigationContactIterator> {
    if (!rules.contactRuntime.contactIterator.permittedTypes.includes(type)) {
      return missing('Original eCContactIterator type is outside the Navigation callback profile');
    }
    try {
      const iterator = new BrowserNavigationContactIterator(this.memory, type);
      this.contactIterators.add(iterator);
      return known(iterator);
    } catch (error) { return missing(error instanceof Error ? error.message : String(error)); }
  }

  private destroyContactIterator(iterator: NativeNavigationContactIterator): NativeValue<void> {
    if (!(iterator instanceof BrowserNavigationContactIterator) || !this.contactIterators.has(iterator)) {
      return missing('Actual live eCContactIterator stack owner required');
    }
    const destroyed = iterator.destroy();
    if (destroyed.known) this.contactIterators.delete(iterator);
    return destroyed;
  }

  /** Game gCEntity slots +0x174/+0x17c import Engine's inherited dynamic
   * entity handlers. The captured phase is retained across iterator creation. */
  private captureContactSlot(receiver: NativeLiveEntity,
    phase: 'enter' | 'exit'): NativeValue<NativeNavigationContactSlot> {
    if (receiver.kind !== 'gCEntity' || !this.navigationActors.has(receiver)) {
      return missing('Selected original gCEntity Navigation actor is required for this contact slot');
    }
    return known<NativeNavigationContactSlot>(Object.freeze({ invoke: (other: NativeLiveEntity | null,
      iterator: NativeNavigationContactIterator): NativeValue<void> => {
      if (!(iterator instanceof BrowserNavigationContactIterator) || !this.contactIterators.has(iterator)) {
        return missing<void>('Actual live eCContactIterator argument required by gCEntity contact virtual');
      }
      return this.dispatchDynamicEntityContact(receiver, other, iterator, phase);
    } }));
  }

  /** Engine GetPropertySet(14) calls OnReadContent and returns NULL immediately
   * when the type bit is clear. A set type bit reaches the original sorted
   * search/collision callback path, which is not part of this selected read. */
  private getContactCollisionShape(entity: NativeLiveEntity): NativeValue<NativeLivePropertySet<object> | null> {
    const content = nativeEntityOnReadContent(entity);
    if (!content.known) return content;
    const word = entity.propertyTypeBits[0];
    if (!Number.isInteger(word)) return missing('Original contact GetPropertySet(14) type-bit word is unavailable');
    if (((word! >>> 14) & 1) === 0) return known(null);
    return missing('Original eCEntity GetPropertySet(14) sorted search and collision-shape callback are not connected');
  }

  private navigationPropertyContact(receiver: NativeLiveEntity, set: NativeLivePropertySet<object>,
    phase: 'enter' | 'exit'): NativeValue<void> {
    if (receiver.kind !== 'gCEntity' || set.className !== 'gCNavigation_PS' || set.propertyType !== 6) {
      return missing('Original ' + set.className + (phase === 'enter' ? ' OnTouch' : ' OnUntouch') + ' callback owner is not connected');
    }
    // The selected actor Navigation slot forwards to the empty Engine base callback.
    return known(undefined);
  }

  /** Engine eCDynamicEntity::OnTouch/OnUntouch in source order. Only the
   * verified Navigation PS callbacks are dispatched; any other attached class
   * remains a hard boundary after preserving earlier iterator resets. */
  private dispatchDynamicEntityContact(receiver: NativeLiveEntity, other: NativeLiveEntity | null,
    iterator: BrowserNavigationContactIterator, phase: 'enter' | 'exit'): NativeValue<void> {
    if (receiver.kind !== 'gCEntity') return missing('Original gCEntity contact receiver required');
    if (phase === 'enter' || other !== null) {
      const collisionShape = this.getContactCollisionShape(receiver);
      if (!collisionShape.known) return collisionShape;
      if (other !== null && collisionShape.value !== null) {
        return missing(phase === 'enter'
          ? 'Original eCCollisionShape_PS OnPreTouch callback owner is not connected'
          : 'Original eCCollisionShape_PS OnUntouch callback owner is not connected');
      }
    }
    let index = 0;
    while (index < receiver.propertySets.length) {
      if (index < receiver.propertySets.length) {
        const set = receiver.propertySets[index];
        if (!set) return missing('Original contact property-set array entry is unavailable');
        if (set.isValid()) {
          const callback = this.navigationPropertyContact(receiver, set, phase);
          if (!callback.known) return callback;
          const reset = iterator.reset();
          if (!reset.known) return reset;
        }
      }
      index++;
    }
    return known(undefined);
  }

  /** Exact selected Engine304c45a0 constructor state: original vtable,
   * zero PropertyID and NULL internal reference. */
  private constructProxy(): NativeValue<OriginalEnclaveProxy> {
    const proxy = OriginalEnclaveProxyOwner.fromConstructor();
    this.temporaryProxies.add(proxy);
    return known(proxy);
  }

  /** Engine304c4680 proxy destruction releases a retained internal owner and
   * destroys the embedded PropertyID. */
  private destroyProxy(proxy: OriginalEnclaveProxy): NativeValue<void> {
    if (!this.temporaryProxies.has(proxy)) return missing('Actual live temporary Navigation proxy owner required');
    try {
      proxy.clearEntityPointer(() => {});
      this.temporaryProxies.delete(proxy);
      return known(undefined);
    } catch (error) { return missing(error instanceof Error ? error.message : String(error)); }
  }

  /** Engine300021c1 -> 304c4270 dispatches eCEntityProxy::CopyFrom through
   * vtable slot +0x14. The selected owner model preserves its AddRef/release/ID
   * copy/pointer-store order and requires a live temporary destination. */
  private assignProxy(destination: OriginalEnclaveProxy, source: OriginalEnclaveProxy): NativeValue<void> {
    if (!this.temporaryProxies.has(destination)) return missing('Actual live temporary Navigation proxy destination required');
    try { destination.copyFrom(source, () => {}); return known(undefined); }
    catch (error) { return missing(error instanceof Error ? error.message : String(error)); }
  }

  /** Selected C++ initializer callbacks are replayed once in table order. Each
   * completed constructor registers its exact source destructor in the shared
   * reverse-order shutdown stack; whole Game.dll CRT startup is not implied. */
  initialize(): NativeValue<void> {
    if (this.state === 'ready') return known(undefined);
    if (this.state === 'blocked') return missing(this.boundary!);
    if (this.state === 'running') return missing('Reentrant selected Navigation name initialization');
    this.state = 'running';
    for (const [index, row] of rules.navigationNameInitializers.initializers.entries()) {
      const name = row.name as NativeNavigationPropertyName;
      const slot = new NativeHeapObjectViews(this.staticStorage, index * 4, 4);
      const cstring = NativeHeapCString.beginTextConstruction(this.memory, slot);
      this.names.set(name, cstring);
      const literal = row.literalRaw.match(/../g)!.map(byte => Number.parseInt(byte, 16));
      const image = this.platform.registerOriginalGameCStringLiteral(row.literalAddress,
        Uint8Array.from(literal));
      if (!image.known) return this.block('Game.dll literal image range: ' + image.reason);
      const source: NativeBytePointer = { fields: new NativeHeapObjectViews(image.value), offset: 0 };
      const constructed = cstring.constructText(source);
      if (!constructed.known) return this.block('Game.dll CString initializer ' + row.method.entry + ': ' + constructed.reason);
      const registered = this.platform.registerShutdown(row.destructor, this, () => cstring.destroy());
      if (!registered.known) return this.block('Game.dll CString destructor registration ' + row.destructor + ': ' + registered.reason);
    }
    this.state = 'ready'; return known(undefined);
  }

  private block(reason: string): NativeValue<void> {
    this.state = 'blocked'; this.boundary = reason; return missing(reason);
  }

  private staticName(name: NativeNavigationPropertyName): NativeValue<NativeHeapCString> {
    const initialized = this.initialize(); if (!initialized.known) return initialized;
    const cstring = this.names.get(name);
    return cstring ? known(cstring) : missing('Name is not one of the selected Game.dll Navigation globals');
  }

  private readText(cstring: NativeHeapCString): NativeValue<Uint8Array> { return cstring.textBytes(); }

  private constructString(text: string): NativeValue<NativeNavigationNotifyString> {
    const input = asciiCString(text);
    if (!input) return missing('Selected Navigation callback CString requires non-NUL ASCII input bytes');
    const literalHex = [...input].map(byte => byte.toString(16).padStart(2, '0')).join('');
    const originalLiteral = rules.navigationNameInitializers.initializers.find(row => row.literalRaw === literalHex);
    let source: NativeBytePointer;
    if (originalLiteral) {
      const literal = this.platform.registerOriginalGameCStringLiteral(originalLiteral.literalAddress, input);
      if (!literal.known) return literal;
      source = { fields: new NativeHeapObjectViews(literal.value), offset: 0 };
    } else {
      // This is a bounded browser bridge for a callback argument whose live
      // original byte owner is not part of the selected NPC source profile.
      const allocated = this.memory.malloc(input.length);
      if (!allocated.known) return allocated;
      if (allocated.value === null) return missing('Selected Native CString input bridge allocation returned NULL');
      allocated.value.bytes.set(input); allocated.value.knownMask.fill(255, 0, input.length);
      this.borrowedInputs.add(allocated.value);
      source = { fields: new NativeHeapObjectViews(allocated.value), offset: 0 };
    }
    const slotBacking = { identity: Object.freeze({}), bytes: new Uint8Array(4),
      knownMask: new Uint8Array(4).fill(255), freed: false };
    const cstring = NativeHeapCString.beginTextConstruction(this.memory, new NativeHeapObjectViews(slotBacking));
    const token: NativeNavigationNotifyString = Object.freeze({ identity: Object.freeze({}) });
    this.temporaries.set(token, cstring);
    const constructed = cstring.constructText(source);
    return constructed.known ? known(token) : constructed;
  }

  private destroyString(value: NativeNavigationNotifyString): NativeValue<void> {
    const cstring = this.temporaries.get(value);
    if (!cstring) return missing('Actual live temporary Navigation CString owner required');
    const destroyed = cstring.destroy();
    if (destroyed.known) this.temporaries.delete(value);
    return destroyed;
  }

  private equalsNameString(name: NativeNavigationPropertyName,
    value: NativeNavigationNotifyString): NativeValue<number> {
    const source = this.staticName(name); if (!source.known) return source;
    const target = this.temporaries.get(value);
    if (!target) return missing('Actual live temporary Navigation CString owner required');
    const left = this.readText(source.value); if (!left.known) return left;
    const right = this.readText(target); if (!right.known) return right;
    return known(Number(equalBytes(left.value, right.value)));
  }

  private equalsNameChars(name: 'SleepingPoint' | 'WorkingPoint' | 'RelaxingPoint',
    text: string): NativeValue<number> {
    const source = this.staticName(name); if (!source.known) return source;
    const left = this.readText(source.value); if (!left.known) return left;
    const right = asciiCString(text);
    if (!right) return missing('Original bCString::Compare(char const*) input must be NUL-free ASCII');
    return known(Number(compareBytes(left.value, right.subarray(0, right.length - 1)) === 0));
  }

  snapshot() {
    return Object.freeze({ state: this.state, boundary: this.boundary,
      staticNames: Object.freeze([...this.names.keys()]), liveTemporaryCount: this.temporaries.size,
      retainedBorrowedInputCount: this.borrowedInputs.size,
      staticCString: Object.freeze([...this.names.entries()].map(([name, cstring]) =>
        Object.freeze({ name, ...cstring.snapshot() }))) });
  }
}
