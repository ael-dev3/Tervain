import rules from '../../assets/gothic3/scene-startup/runtime-rules.json';
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryAdmin, NativeMemoryAllocation } from './native-memory-admin';
import type { NativeEngineModuleAdminHost } from './native-engine-module-admin';

interface SourceRules {
  schema: string;
  inputs: { Engine: string; SharedBase: string };
  methods: Record<string, { module: string; entry: string; body: string; bodyInstructionBytesSha256: string }>;
  constBytes: Record<string, { address: string; bytes: number; raw: string; knownMask: string }>;
  inputDispatcherImports: Record<string, { iatVA: string; module: string; name: string;
    exportEntry: string; originalIatRaw: string; targetMethod: string | null; targetBody: string | null }>;

}
const source = rules as unknown as SourceRules;
const methods = {
  inputDispatcherConstructor: ['Engine', '3003f026', '30087c80', '296e133ace92171cd8b8f0a817f8ab4625997c509f9c44c16894fd6be9d8cdf3'],
  inputDispatcherCreate: ['Engine', '3000f5bf', '300877c0', 'ea72c300daabd9fce376834c5a2c23decc455e78a7ee88afc568224b8f37a6f9'],
  inputDispatcherRegister: ['Engine', '3001ca21', '30087db0', '9de59010fa22c8b9844c466ecc14c2496f3a96a950c0647bde9bdffeb0d67672'],
  inputDispatcherDestroy: ['Engine', '300235bf', '30087c00', 'd14ddbf9c2f92e33783a4dbe815fbfa11ebc42f42eb29771f3b59192ec796fb8'],
  inputDispatcherDestructor: ['Engine', '300458fe', '30087d10', '04b80425f517c2c658b1e456fa07a6ff8d5753b37dee3e2e7dd072fa7f6d005c'],
  inputReceiverConstructor: ['Engine', '30035a5d', '30103020', '3610a864ca1c4307409eef5033569430672ebf11b70962cd9afbe50e63a769b6'],
  inputReceiverIsInputEnabled: ['Engine', '30001e9c', '30102ff0', 'f82485647da88f1345396046db25899cbf8e6fe84b931a28e4691b98a1ca10b1'],
  inputReceiverGetInputPriority: ['Engine', '3000d95e', '30103010', '4bc724f3b1d0caf4fe369c18cba3102e6c4ea057f63fe1587e3973134a7f755e'],
  inputReceiverDestructor: ['Engine', '3003b5fc', '30102f80', '63b07b82488ac0e667e496db9b62d04db18c46de576b45b29e590d8de8eeb49f'],
  inputDispatcherArrayContains: ['Engine', '30006203', '300882e0', '09ebd84c88fe798f1f72e87fb8ea532f6c455c4bc66957b5c85f5ed70b9a5fa1'],
  inputDispatcherArrayAppend: ['Engine', '30029be0', '300885c0', 'd741b2e5c7b112cd7059ef25f4574ef4f0ef000bb9d648101e7e5d62ddc9a850'],
  inputDispatcherSetSession: ['Engine', '30014a79', '30087700', '3052270e1667835de53ccd0ba4b01ac46ff8853476c0e57807806d23a1e3270e'],
  inputDispatcherSetActionMapper: ['Engine', '30012a49', '30087770', 'e7de5e13bc1a32b48c900e260bd33f6d7681d0a9a3463153d806f13793aeeca0'],
  inputDispatcherInvalidate: ['Engine', '30036237', '300877b0', 'accf6b6e304995fc367958f60f92bd66734ce81e3360518e102efa607657e813'],
  moduleArrayGrow: ['Engine', '3002f1b2', '30088240', '87f48dc977cab7b88fabed72900cbfe2f40d12c5930e0fadea46d17f310f9b29'],
  objectBaseConstructor: ['SharedBase', '10007c11', '1004a1c0', 'ab7e78513c0a30ddc1692bed394d8f242bab4639e53b0e22cdd9dc43ae23a4bb'],
  objectRefBaseConstructor: ['SharedBase', '10001d07', '1004a5a0', '796d99b69ae41bdd4d9ce5e2e2a83788deab4385eabb460ac2a1a14815589b85'],
  objectRefBaseCreate: ['SharedBase', '100079fa', '1004a4b0', 'aebeb8e21d51af3c8fdc9480af5db5d502141c33236f78f065fb85702e8b41bb'],
  objectRefBaseDestroy: ['SharedBase', '10004d59', '1004a490', '56291302974454e8d43be40e77d8ed62f1098c77dbdacb1edd4b15f124fb11b4'],
  objectRefBaseDestructor: ['SharedBase', '10005998', '1004a600', '37688e781d53c0ff2703ec26a3ae52b8058a30ab02b9752b009274c0586406c5'],
  objectBaseCreate: ['SharedBase', '10008143', '1004a0b0', '2db31f4e09597946e56e859813bfdad7046d457c32332c3a882654d1e3ffdf67'],
  objectBaseDestroy: ['SharedBase', '100046ba', '1004a0a0', 'e13bde103e0acb17a3e561d4538391c12afabd8db468805c4fb9df95dd611878'],
  objectBaseDestructor: ['SharedBase', '10002946', '10049fe0', 'f85cd04e7f5a4087876296ca36c8e384f7f067081496ec5e09f811698fc8eedf'],
  objectRefBaseIsValid: ['SharedBase', '10007f81', '1004a530', '67e86a754a1aefa2d7d11681a7e4c07658e57d2b3a40370cbcc5ee5307f6a688'],
  objectRefBaseIsValidImport: ['Engine', '306378de', '306378de', 'dec01f7d84901def99acc33eafad648f480562eb852e24b640e42b5726514ba9'],
} as const;
const tables = {
  objectBaseVtable: ['100e7e1c', 0x1c], objectRefBaseVtable: ['100e7eac', 0x40],
  inputReceiverVtable: ['308257bc', 0x70], inputDispatcherVtable: ['3081cabc', 0x88],
  moduleAdminVtable: ['3081cdd4', 0x88], engineComponentVtable: ['3082553c', 0x70],
  sceneAdminVtable: ['3087c7dc', 0x70],
} as const;
const tableBytes = {
  objectBaseVtable: 'a939001040610010222a0010b686001015370010ba46001043810010',
  objectRefBaseVtable: 'b2620010817f0010cd6f0010b6860010ce730010594d0010fa790010dc100010d42200101a5500109a480010532100100a6f0010865c00104d4a00108c7e0010',
  inputReceiverVtable: 'e0330130de786330e4786330ea786330f0786330f6786330fc7863302daa0130087963300e796330147963301a7963302079633026796330accb01302c79633032796330387963303e796330447963304a79633050796330567963305c7963305ed90030a76b02309c9a01309a5b0130',
  inputDispatcherVtable: 'd4ae0030de786330e4786330ea786330f0786330bf350230bff500302daa0130087963300e796330147963301a7963302079633026796330588000302c79633032796330387963303e796330447963304a79633050796330567963305c7963305ed90030a76b02309c9a01309a5b01300626023021ca013033320030794a0130492a013064580330',
  moduleAdminVtable: 'd26b0430de786330e4786330ea786330f0786330f6e90230568304302daa0130087963300e796330147963301a7963302079633026796330e09201302c79633032796330387963303e796330447963304a79633050796330567963305c7963305ed90030a76b02309c9a01309a5b01304a640230ff64013016370430794a0130492a013064580330',
  engineComponentVtable: 'c1f50330de786330e4786330ea786330f0786330dd5302305e390030fe150130087963300e796330147963301a7963302079633026796330970703302c79633032796330387963303e796330447963304a79633050796330567963305c7963305ed90030a76b02309c9a01309a5b0130',
  sceneAdminVtable: '125c0130de7863303fc30330ea786330d62901305a580330268e0130e5b80330087963300e796330147963301a7963302079633026796330af0e02302c79633032796330387963303e796330447963304a79633050796330567963305c7963305ed90030a76b02309c9a01309a5b0130',
} as const;
const importPins = {
  objectRefBaseConstructor: ["0x30afdc08", "SharedBase.dll", "??0bCObjectRefBase@@QAE@XZ", "10001d07", "a0f1af00", "objectRefBaseConstructor", "1004a5a0"],
  objectRefBaseCreate: ["0x30afdc50", "SharedBase.dll", "?Create@bCObjectRefBase@@UAE?AW4bEResult@@XZ", "100079fa", "a0edaf00", "objectRefBaseCreate", "1004a4b0"],
  objectRefBaseDestroy: ["0x30afdc54", "SharedBase.dll", "?Destroy@bCObjectRefBase@@UAEXXZ", "10004d59", "7cedaf00", "objectRefBaseDestroy", "1004a490"],
  objectRefBaseDestructor: ["0x30afdc04", "SharedBase.dll", "??1bCObjectRefBase@@MAE@XZ", "10005998", "bef1af00", "objectRefBaseDestructor", "1004a600"],
  objectRefBaseIsValid: ["0x30afdc64", "SharedBase.dll", "?IsValid@bCObjectRefBase@@UBE_NXZ", "10007f81", "b2ecaf00", "objectRefBaseIsValid", "1004a530"],
  objectRefBaseAddReference: ["0x30afdc48", "SharedBase.dll", "?AddReference@bCObjectRefBase@@UAEKXZ", "100022d4", "04eeaf00", null, null],
  objectRefBaseReleaseReference: ["0x30afdc44", "SharedBase.dll", "?ReleaseReference@bCObjectRefBase@@UAEKXZ", "1000551a", "2ceeaf00", null, null],
  memoryGetInstance: ["0x30afdbac", "SharedBase.dll", "?GetInstance@bCMemoryAdmin@@SGAAV1@XZ", "10002aae", "1cf4af00", null, null],
  memoryFree: ["0x30afdb0c", "SharedBase.dll", "?Free@bCMemoryAdmin@@QAEXPAX@Z", "10002112", "cef8af00", null, null],
  memoryRealloc: ["0x30afdb08", "SharedBase.dll", "?Realloc@bCMemoryAdmin@@QAEPAXPAXK@Z", "10004133", "f0f8af00", null, null],
} as const;
type TableName = keyof typeof tables;
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });

function tableWord(name: TableName, offset: number): string {
  const [address, bytes] = tables[name], row = source.constBytes[name];
  if (!row || row.address !== address || row.bytes !== bytes || row.raw !== tableBytes[name] || row.raw.length !== bytes * 2 ||
      !/^(?:[0-9a-f]{2})+$/.test(row.raw) || row.knownMask !== 'ff'.repeat(bytes) || offset + 4 > bytes) {
    throw new Error('Original input-dispatcher vtable receipt differs: ' + name);
  }
  const raw = Uint8Array.from(row.raw.slice(offset * 2, offset * 2 + 8).match(/../g)!, byte => parseInt(byte, 16));
  return new DataView(raw.buffer).getUint32(0, true).toString(16).padStart(8, '0');
}
function admitSource(): void {
  if (source.schema !== 'gothic3-scene-startup-rules-v1' ||
      source.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
      source.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
      Object.entries(methods).some(([name, [module, entry, body, hash]]) => source.methods[name]?.module !== module ||
        source.methods[name]?.entry !== entry || source.methods[name]?.body !== body ||
        source.methods[name]?.bodyInstructionBytesSha256 !== hash)) {
    throw new Error('Original Engine input-dispatcher method receipt differs');
  }
  for (const [name, [iatVA, module, symbol, exportEntry, raw, targetMethod, targetBody]] of Object.entries(importPins)) {
    const row = source.inputDispatcherImports[name];
    if (!row || row.iatVA !== iatVA || row.module !== module || row.name !== symbol || row.exportEntry !== exportEntry ||
        row.originalIatRaw !== raw || row.targetMethod !== targetMethod || row.targetBody !== targetBody) {
      throw new Error('Original input-dispatcher import/export mapping differs: ' + name);
    }
  }
  for (const name of Object.keys(tables) as TableName[]) tableWord(name, 0);
  for (const name of ['inputDispatcherVtable', 'moduleAdminVtable'] as const) {
    if (tableWord(name, 4) !== '306378de' || tableWord(name, 0x7c) !== '30014a79' ||
        tableWord(name, 0x80) !== '30012a49') throw new Error('Original dispatcher virtual method mapping differs');
  }
  if (tableWord('moduleAdminVtable', 0x74) !== '300164ff') throw new Error('Original ModuleAdmin registration slot differs');
  for (const name of ['engineComponentVtable', 'sceneAdminVtable'] as const) {
    if (tableWord(name, 0x60) !== '3000d95e') throw new Error('Original component default input-priority mapping differs');
  }
}

/** Non-NULL receivers and devices require their actual owned operations. The
 * NULL setters used by ordinary teardown need no application or device. */
export interface NativeEngineInputDispatcherHost<M extends object, R extends object = object> {
  componentFields(module: M): NativeValue<NativeHeapObjectViews>;
  invokeGetInputPriority?(module: M, fields: NativeHeapObjectViews, slot: 0x60): NativeValue<number>;
  addReference?(receiver: R, slot: 0x20): NativeValue<void>;
  releaseReference?(receiver: R, slot: 0x24): NativeValue<void>;
  applicationGetInstance?(): NativeValue<object | null>;
  applicationGetKeyboard?(application: object): NativeValue<object | null>;
  applicationGetMouse?(application: object): NativeValue<object | null>;
  keyboardClearKeyBuffer?(keyboard: object): NativeValue<void>;
  mouseClearBuffer?(mouse: object): NativeValue<void>;
}

/** eCInputDispatcher owns the first52 bytes of the exact retained object.
 * This includes ModuleAdmin's embedded base. The class owns source constructor,
 * registry and NULL teardown operations; application/device/reference overrides
 * remain capabilities, and a failed operation preserves its applied prefix. */
export class NativeEngineInputDispatcher<M extends object, R extends object = object> {
  private fields: NativeHeapObjectViews | null = null;
  private active = false;
  private reentrant = false;
  private boundary: string | null = null;
  private constructed = false;
  private destructed = false;
  private readonly trace: string[] = [];
  constructor(private readonly memory: Pick<NativeMemoryAdmin, 'realloc' | 'free'>,
    private readonly host: NativeEngineInputDispatcherHost<M, R>) { admitSource(); }

  private guard(): void {
    if (this.reentrant) throw new Error('Unsupported mutating input-dispatcher reentry');
  }
  private call<T>(operation: string, body: () => NativeValue<T>): T {
    this.guard(); this.trace.push(operation + '.attempt');
    const result = body(); this.guard();
    if (!result.known) throw new Error(operation + ': ' + result.reason);
    this.trace.push(operation); return result.value;
  }
  private execute<T>(operation: string, body: () => T): NativeValue<T> {
    if (this.boundary) return unknown(this.boundary);
    if (this.destructed) return unknown('Engine input-dispatcher lifetime has ended');
    if (this.active) { this.reentrant = true; return unknown('Engine input dispatcher is already executing'); }
    this.active = true; this.reentrant = false;
    try { const value = body(); this.guard(); return known(value); }
    catch (error) {
      this.boundary = operation + ': ' + (error instanceof Error ? error.message : String(error));
      this.trace.push('blocked:' + this.boundary); return unknown(this.boundary);
    } finally { this.active = false; }
  }
  private owner(fields?: NativeHeapObjectViews): NativeHeapObjectViews {
    if (!this.fields || !this.constructed) throw new Error('Original input-dispatcher constructor has not completed');
    if (fields && fields !== this.fields) throw new Error('The same retained dispatcher object is required');
    return this.fields;
  }
  private storeVtable(fields: NativeHeapObjectViews, name: TableName): void {
    tableWord(name, 0); fields.writeUnsigned(0, parseInt(tables[name][0], 16));
    this.trace.push('vtable.' + tables[name][0]);
  }
  private vtableAddress(fields: NativeHeapObjectViews): string {
    if (fields.maskedWord(0).knownMask === 0xffffffff) return fields.readUnsigned(0).toString(16).padStart(8, '0');
    const pointer = fields.pointer<{ module: string; address: string }>(0).get();
    if (pointer?.module !== 'Engine' || !/^[0-9a-f]{8}$/.test(pointer.address)) {
      throw new Error('Actual Engine virtual table capability is required');
    }
    return pointer.address;
  }
  private selectedVirtual(fields: NativeHeapObjectViews, slot: number, expected: string): void {
    const address = this.vtableAddress(fields);
    const table = (Object.keys(tables) as TableName[]).find(name => tables[name][0] === address);
    if (!table || tableWord(table, slot) !== expected) throw new Error('Unowned actual dispatcher virtual+' + slot.toString(16));
  }
  private baseCreate(fields: NativeHeapObjectViews): void {
    // ObjectBase::Create returns1; ObjectRefBase then ORs the high validity bit.
    this.trace.push('ObjectBase.Create1004a0b0');
    fields.writeUnsigned(8, (fields.readUnsigned(8) | 0x80000000) >>> 0);
    this.trace.push('ObjectRefBase.Create1004a4b0');
  }
  construct(fields: NativeHeapObjectViews): NativeValue<void> {
    return this.execute('InputDispatcher.ctor30087c80', () => {
      if (this.fields) throw new Error('Input-dispatcher constructor cannot be replayed');
      if (!(fields instanceof NativeHeapObjectViews) || fields.bytes.length < 52) throw new Error('Actual retained52-byte dispatcher base is required');
      this.fields = fields;
      this.storeVtable(fields, 'objectBaseVtable');
      fields.pointer(4).set(null); this.storeVtable(fields, 'objectRefBaseVtable'); fields.writeUnsigned(8, 1);
      this.storeVtable(fields, 'inputReceiverVtable'); fields.writeUnsigned(0x0c, 1, 1);
      this.storeVtable(fields, 'inputDispatcherVtable');
      fields.pointer(0x10).set(null); fields.writeUnsigned(0x14, 0); fields.writeUnsigned(0x18, 0);
      fields.pointer(0x1c).set(null); fields.writeUnsigned(0x20, 0); fields.writeUnsigned(0x24, 0);
      fields.pointer(0x28).set(null); fields.pointer(0x2c).set(null);
      fields.writeUnsigned(0x30, 1, 1);
      this.baseCreate(fields); this.constructed = true;
    });
  }
  create(fields?: NativeHeapObjectViews): NativeValue<void> {
    return this.execute('InputDispatcher.Create300877c0', () => this.baseCreate(this.owner(fields)));
  }
  private contains(offset: 0x10 | 0x1c, module: M): boolean {
    const fields = this.owner(), count = fields.readUnsigned(offset + 4);
    if (count === 0) return false;
    if (count > 0x7fffffff) throw new Error('Input array nonzero high-bit count is outside admitted backing ownership');
    const allocation = fields.pointer<NativeMemoryAllocation>(offset).get();
    if (!allocation) throw new Error('Nonempty input list dereferences NULL backing');
    const array = new NativeHeapObjectViews(allocation);
    for (let index = count - 1; index >= 0; index--) if (array.pointer<M>(index * 4).get() === module) return true;
    return false;
  }
  private append(offset: 0x10 | 0x1c, module: M): void {
    const fields = this.owner(), count = fields.readUnsigned(offset + 4), capacity = fields.readUnsigned(offset + 8);
    if (count > 0x7ffffffe || capacity > 0x7fffffff) throw new Error('Input array signed-overflow growth is not admitted');
    const required = count + 1;
    if (capacity < required) {
      const old = fields.pointer<NativeMemoryAllocation>(offset).get();
      const copied: (M | null)[] = [];
      if (count && !old) throw new Error('Input list has a nonzero count with NULL backing');
      if (old) {
        const array = new NativeHeapObjectViews(old);
        for (let index = 0; index < count; index++) copied.push(array.pointer<M>(index * 4).get());
      }
      const nextCapacity = required + Math.min(0x400, Math.max(8, capacity >> 3));
      if (nextCapacity > 0x3fffffff) throw new Error('Input pointer-array byte extent overflows selected ownership');
      const resized = this.call('array.Realloc.' + nextCapacity * 4, () => this.memory.realloc(old, nextCapacity * 4));
      fields.pointer<NativeMemoryAllocation>(offset).set(resized); this.trace.push('array.realloc-store');
      if (!resized) throw new Error('Input array-grow NULL reaches source memset dereference');
      const array = new NativeHeapObjectViews(resized);
      if (nextCapacity * 4 > array.bytes.length) throw new Error('Input Realloc returned a shorter pointer-array backing');
      // Rebind moved opaque pointer capabilities over the copied native slots.
      copied.forEach((value, index) => array.pointer<M>(index * 4).set(value));
      const clearEnd = count + nextCapacity - capacity;
      if (clearEnd > nextCapacity) throw new Error('Input array source memset exceeds its new capacity');
      for (let index = count; index < clearEnd; index++) array.writeUnsigned(index * 4, 0);
      this.trace.push('array.memset'); fields.writeUnsigned(offset + 8, nextCapacity); this.trace.push('array.capacity');
    }
    fields.writeUnsigned(offset + 4, required); this.trace.push('array.count');
    const current = fields.pointer<NativeMemoryAllocation>(offset).get();
    if (!current) throw new Error('Input append dereferences NULL backing');
    new NativeHeapObjectViews(current).pointer<M>(count * 4).set(module); this.trace.push('array.append');
  }
  registerModule(module: M): NativeValue<1> {
    return this.execute('InputDispatcher.RegisterModule30087db0', () => {
      this.owner();
      const fields = this.call('component.physical-fields', () => this.host.componentFields(module));
      if (!(fields instanceof NativeHeapObjectViews)) throw new Error('Actual component physical input receiver is required');
      if (fields.readUnsigned(0x0c, 1) !== 1) return 1 as const;
      if (this.contains(0x10, module) || this.contains(0x1c, module)) return 1 as const;
      let priority: number;
      const address = this.vtableAddress(fields);
      const table = (Object.keys(tables) as TableName[]).find(name => tables[name][0] === address);
      if (table && tableWord(table, 0x60) === '3000d95e') {
        priority = 0; this.trace.push('component.GetInputPriority30103010');
      } else {
        if (!this.host.invokeGetInputPriority) throw new Error('Actual component virtual+60 priority owner is unavailable');
        priority = this.call('component.virtual60', () => this.host.invokeGetInputPriority!(module, fields, 0x60));
        if (!Number.isInteger(priority) || priority < -0x80000000 || priority > 0xffffffff) throw new Error('Original DWORD input priority is required');
        priority |= 0;
      }
      if (priority === 0 || priority === 1) this.append(priority === 0 ? 0x10 : 0x1c, module);
      return 1 as const;
    });
  }
  private assignReceiver(offset: 0x28 | 0x2c, receiver: R | null): void {
    const fields = this.owner(), old = fields.pointer<R>(offset).get();
    if (old) {
      if (!this.host.releaseReference) throw new Error('Actual receiver virtual+24 ReleaseReference owner is unavailable');
      this.call('receiver.ReleaseReference24', () => this.host.releaseReference!(old, 0x24));
      fields.pointer<R>(offset).set(null); this.trace.push('receiver.clear.' + offset.toString(16));
    }
    fields.pointer<R>(offset).set(receiver); this.trace.push('receiver.assign.' + offset.toString(16));
    if (receiver) {
      if (!this.host.addReference) throw new Error('Actual receiver virtual+20 AddReference owner is unavailable');
      this.call('receiver.AddReference20', () => this.host.addReference!(receiver, 0x20));
    }
  }
  private setSessionBody(receiver: R | null): void {
    this.owner();
    if (receiver) {
      const host = this.host;
      if (!host.applicationGetInstance) throw new Error('Actual Application.GetInstance owner is unavailable');
      const app1 = this.call('Application.GetInstance.keyboard', () => host.applicationGetInstance!());
      if (!app1 || !host.applicationGetKeyboard) throw new Error('Actual Application.GetKeyboard owner is unavailable');
      const keyboard = this.call('Application.GetKeyboard', () => host.applicationGetKeyboard!(app1));
      const app2 = this.call('Application.GetInstance.mouse', () => host.applicationGetInstance!());
      if (!app2 || !host.applicationGetMouse) throw new Error('Actual Application.GetMouse owner is unavailable');
      const mouse = this.call('Application.GetMouse', () => host.applicationGetMouse!(app2));
      if (!keyboard || !host.keyboardClearKeyBuffer) throw new Error('Actual Keyboard.ClearKeyBuffer owner is unavailable');
      this.call('Keyboard.ClearKeyBuffer', () => host.keyboardClearKeyBuffer!(keyboard));
      if (!mouse || !host.mouseClearBuffer) throw new Error('Actual Mouse.ClearBuffer owner is unavailable');
      this.call('Mouse.ClearBuffer', () => host.mouseClearBuffer!(mouse));
    }
    this.assignReceiver(0x28, receiver);
  }
  setSession(receiver: R | null): NativeValue<void> {
    return this.execute('InputDispatcher.SetSession30087700', () => this.setSessionBody(receiver));
  }
  setActionMapper(receiver: R | null): NativeValue<void> {
    return this.execute('InputDispatcher.SetActionMapper30087770', () => this.assignReceiver(0x2c, receiver));
  }
  private invalidateBody(): void {
    const fields = this.owner(); fields.pointer(0x28).set(null); fields.pointer(0x2c).set(null);
    fields.writeUnsigned(0x30, 1, 1); this.trace.push('InputDispatcher.Invalidate300877b0');
  }
  invalidate(): NativeValue<void> {
    return this.execute('InputDispatcher.Invalidate300877b0', () => this.invalidateBody());
  }
  private releaseArray(offset: 0x10 | 0x1c): void {
    const fields = this.owner(), allocation = fields.pointer<NativeMemoryAllocation>(offset).get();
    if (!allocation) return;
    this.call('array.Free.' + offset.toString(16), () => this.memory.free(allocation));
    fields.pointer(offset).set(null); fields.writeUnsigned(offset + 4, 0); fields.writeUnsigned(offset + 8, 0);
  }
  private isValidBody(): boolean {
    const fields = this.owner(); this.selectedVirtual(fields, 4, '306378de');
    this.trace.push('ObjectRefBase.IsValid1004a530'); return (fields.readUnsigned(8) & 0x80000000) !== 0;
  }
  private destroyBody(): void {
    const fields = this.owner(); this.releaseArray(0x1c); this.releaseArray(0x10);
    this.selectedVirtual(fields, 0x7c, '30014a79'); this.setSessionBody(null);
    this.selectedVirtual(fields, 0x80, '30012a49'); this.assignReceiver(0x2c, null);
    this.invalidateBody();
    if (this.isValidBody()) {
      fields.writeUnsigned(8, fields.readUnsigned(8) & 0x7fffffff);
      this.trace.push('ObjectRefBase.Destroy.validity-clear');
      this.isValidBody(); // ObjectBase::Destroy tail-calls IsValid again.
    }
  }
  destroy(fields?: NativeHeapObjectViews): NativeValue<void> {
    return this.execute('InputDispatcher.Destroy30087c00', () => { this.owner(fields); this.destroyBody(); });
  }
  destruct(fields?: NativeHeapObjectViews): NativeValue<void> {
    return this.execute('InputDispatcher.dtor30087d10', () => {
      const owner = this.owner(fields); this.storeVtable(owner, 'inputDispatcherVtable'); this.destroyBody();
      this.releaseArray(0x1c); this.releaseArray(0x1c); this.releaseArray(0x10); this.releaseArray(0x10);
      this.storeVtable(owner, 'inputReceiverVtable'); this.storeVtable(owner, 'objectRefBaseVtable');
      owner.pointer(4).set(null); this.storeVtable(owner, 'objectBaseVtable'); this.destructed = true;
    });
  }
  moduleAdminOperations(): Pick<NativeEngineModuleAdminHost<M>, 'constructInputDispatcher' | 'createInputDispatcher' |
    'registerInputModule' | 'destroyInputDispatcher' | 'destructInputDispatcher'> {
    return {
      constructInputDispatcher: fields => this.construct(fields),
      createInputDispatcher: fields => this.create(fields),
      registerInputModule: module => {
        const result = this.registerModule(module); return result.known ? known(undefined) : result;
      },
      destroyInputDispatcher: fields => this.destroy(fields),
      destructInputDispatcher: fields => this.destruct(fields),
    };
  }
  snapshot() {
    return Object.freeze({ constructed: this.constructed, destructed: this.destructed,
      boundary: this.boundary, fields: this.fields, trace: Object.freeze([...this.trace]) });
  }
}
