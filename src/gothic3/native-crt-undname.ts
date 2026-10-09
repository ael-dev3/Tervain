import { gameStrlenDwordCandidate } from './native-game-strlen-predicate';
import { gameClassNameFamilySpecs } from './native-game-class-name-family-source';
import { admitGamePrimitiveSource } from './native-game-primitive-source';
import { admitGameTemplateDemanglerSource } from './native-game-template-demangler-source';
/** Module-owned ___unDName. The admitted grammar currently follows the
 * ordinary, unqualified class RTTI branch; other grammar remains a boundary. */
import sourceText from '../../assets/gothic3/crt-undname/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryBacking } from './native-memory-admin';
import type { NativeEngineCrtOwner, NativeGameCrtOwner, NativeModuleCrtOwner } from './native-engine-crt-locks';
import { NativeCrtDNameFactory, NativeCrtReplicator, NativeCrtScratchArena } from './native-crt-dname';
import type { NativeCrtBytePointer, NativeCrtByteCursor, NativeCrtDNameRecord } from './native-crt-dname';
import { NativeSceneTypeInfoName } from './native-scene-startup';
import { admitNativeGameCrtSource, nativeGameImageReceipt } from './native-game-crt-profile';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
function fact<T>(result: NativeValue<T>, operation: string): T {
  if (!result.known) throw new Error(operation + ': ' + result.reason);
  return result.value;
}
interface Range { address: string; bytes: number; raw: string; knownMask?: string }
interface Rules {
  schema: string; inputs: { Engine: string };
  coldGlobals: Record<string, Range>; constBytes: Record<string, Range>;
  methods: Record<string, { entry: string; body: string; bodyInstructionBytesSha256: string }>;
}
const source = JSON.parse(sourceText) as Rules;
const methods = [
  ['unDName', '3069b26b', 'a07ca276c613d6f8d240468ab070035386e8837d81b9ae683404a257710907ee'],
  ['unDNameCleanup', '3069b305', '335131d5a4d44cd8206569f94097a31ba2a67bdea3f2bc0989f2614d5ee4ccde'],
  ['unDecoratorConstructor', '3069747a', '57a915991b983652474b9866580080b93a227b36660bcadca9d1cb9d8b65a1f7'],
  ['unDecoratorToString', '3069afb8', '48b6a45936148eb9f9f0f26208b35aa9e26b4adb62ab1e8f5ac1bd95a45857c8'],
  ['getDecoratedName', '3069a2f7', '8f89be4100f2fa6bc0f7aaccdd7c5364525b756afaa5c84575c768f1bac909d8'],
  ['getDataType', '3069b876', '4d67dbfb562a19c4aaa9b3e6ad0e8cea9d885b0e95ac513aeb7390806e8def02'],
  ['getDataIndirectType', '3069aad4', 'bedc4caa88d3af6da08000a49513460d67c66d13f826de9caeeb33a0206418c4'],
  ['getPrimaryDataType', '3069b738', 'befea1ed5b9cbe7b97a758f6be05aadf44806e95c4da44a55379d012cab1f39b'],
  ['getSimpleDataType', '3069b3b1', 'ee278a53d51e131c09ee706e30540d310ab5a4bd128464f6f5a915a68b529c5d'],
  ['getECSUDataType', '306995dd', '7c1bb22e3048ef88118274d8c75d3ad3f61b8f9da92e6b6bc2e80891f9dd470c'],
  ['getScopedName', '306994ea', '27712fde99caba7288ba719a974fe8f2d99474f7e8314fc786376c1704803fc4'],
  ['getZName', '30699300', 'f5cd2a99e27cae9769e317658aa916d61482dfdf3472378b5209efe18768d4e6'],
] as const;
function admit(): void {
  if (source.schema !== 'gothic3-crt-undname-rules-v1' ||
      source.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
      methods.some(([label, address, hash]) => source.methods[label]?.entry !== address ||
        source.methods[label]?.body !== address || source.methods[label]?.bodyInstructionBytesSha256 !== hash)) {
    throw new Error('Original Engine ___unDName source receipts differ');
  }
}
function storage(label: string, address: string, bytes: number, raw = '00'.repeat(bytes), constant = false): NativeHeapObjectViews {
  admit(); const range = (constant ? source.constBytes : source.coldGlobals)[label];
  if (!range || range.address !== address || range.bytes !== bytes || range.raw !== raw ||
      (!constant && range.knownMask !== 'ff'.repeat(bytes))) throw new Error('Original demangler storage differs: ' + label);
  return new NativeHeapObjectViews({ identity: {}, bytes: Uint8Array.from(raw.match(/../g)!, byte => parseInt(byte, 16)),
    knownMask: new Uint8Array(bytes).fill(255), freed: false });
}
function stack(bytes: number): NativeHeapObjectViews {
  return new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(bytes), knownMask: new Uint8Array(bytes), freed: false });
}
function subview(fields: NativeHeapObjectViews, offset: number, bytes: number): NativeHeapObjectViews {
  return new NativeHeapObjectViews(fields.backing, fields.bytes.byteOffset - fields.backing.bytes.byteOffset + offset, bytes);
}
interface State {
  fields: NativeHeapObjectViews; active: boolean; reentrant: boolean; boundary: string | null;
  held: boolean | null; trace: string[]; arena: NativeCrtScratchArena | null;
  decorator: NativeHeapObjectViews | null; factory: NativeCrtDNameFactory | null;
  allocator: (bytes: number) => NativeValue<NativeMemoryBacking | null>;
  free: (backing: NativeMemoryBacking) => NativeValue<void>;
}
const owners = new WeakMap<NativeModuleCrtOwner, State>();
const typeNames = new WeakMap<NativeEngineCrtOwner, NativeSceneTypeInfoName>();

export class NativeCrtUndName {
  private readonly state: State;
  constructor(readonly crt: NativeEngineCrtOwner | NativeGameCrtOwner) {
    if (crt.module === 'Engine') admit();
    else NativeCrtScratchArena.admitGame(crt);
    let state = owners.get(crt);
    if (!state) {
      state = { fields: crt.module === 'Engine' ? storage('demanglerGlobals', '30af7c54', 60) : crt.imageStorage('demanglerGlobals'), active: false, reentrant: false,
        boundary: null, held: false, trace: [], arena: null, decorator: null, factory: null,
        allocator: bytes => crt.malloc(bytes), free: backing => crt.free(backing) };
      owners.set(crt, state);
    }
    this.state = state;
  }
  get fields(): NativeHeapObjectViews { return this.state.fields; }
  private guard(operation = 'demangler'): void {
    if (this.state.reentrant) throw new Error('Unsupported shared ___unDName reentry during ' + operation);
  }
  private call<T>(name: string, execute: () => NativeValue<T>, retain?: (value: T) => void): T {
    this.guard(name); this.state.trace.push(name + '.attempt');
    const result = execute(); if (result.known) retain?.(result.value);
    this.guard(name); const value = fact(result, name); this.state.trace.push(name); return value;
  }
  private cursor(): NativeCrtBytePointer {
    const pointer = this.fields.pointer<NativeCrtBytePointer>(32).get();
    if (!pointer) throw new Error('Original demangler cursor dereferences NULL');
    return pointer;
  }
  private byte(ahead = 0): number { const p = this.cursor(); return p.fields.readUnsigned(p.offset + ahead, 1); }
  private advance(bytes = 1): void {
    const p = this.cursor(); this.fields.pointer<NativeCrtBytePointer>(32).set({ fields: p.fields, offset: p.offset + bytes });
  }
  private flags(): number { return this.fields.readUnsigned(48); }
  private empty(factory: NativeCrtDNameFactory): NativeCrtDNameRecord { return fact(factory.empty(), 'DName.empty'); }
  /** Original Game getTemplateName prefix. Failed lower calls retain the
   * installed local tables; the native restoration belongs to its normal tail. */
  private templateName(factory: NativeCrtDNameFactory): NativeCrtDNameRecord {
    if (this.crt.module !== 'Game') throw new Error('Unowned Engine getZName template grammar');
    admitGameTemplateDemanglerSource();
    if (this.byte() !== 0x3f || this.byte(1) !== 0x24) {
      return fact(factory.status(1), 'getTemplateName.invalidPrefix');
    }
    this.advance(2); this.state.trace.push('getTemplateName.consumePrefix');
    const saved = [20,24,28].map(offset => this.fields.pointer<NativeCrtReplicator>(offset).get());
    const locals = stack(180);
    const first = new NativeCrtReplicator(factory, subview(locals, 0, 60));
    const second = new NativeCrtReplicator(factory, subview(locals, 60, 60));
    const third = new NativeCrtReplicator(factory, subview(locals, 120, 60));
    fact(first.construct(), 'getTemplateName.replicator1');
    fact(second.construct(), 'getTemplateName.replicator2');
    fact(third.construct(), 'getTemplateName.replicator3');
    const result = this.empty(factory);
    this.fields.pointer(20).set(first); this.fields.pointer(24).set(second); this.fields.pointer(28).set(third);
    this.state.trace.push('getTemplateName.installLocalReplicators');
    if (this.byte() === 0x3f) {
      this.advance(); throw new Error('Unowned getTemplateName operator-name grammar');
    }
    const current = this.byte();
    if (current >= 0x30 && current <= 0x39) throw new Error('Unowned getTemplateName identifier reference');
    const cursor: NativeCrtByteCursor = { get: () => this.fields.pointer<NativeCrtBytePointer>(32).get(),
      set: pointer => this.fields.pointer<NativeCrtBytePointer>(32).set(pointer) };
    const parsed = fact(factory.fromDelimited(cursor, 0x40, () => this.flags()), 'getTemplateName.getZName.delimited');
    const identifier = this.empty(factory);
    fact(factory.assign(identifier, parsed), 'getTemplateName.getZName.assign');
    if (second.fields.readUnsigned(0) !== 9) fact(second.append(identifier), 'getTemplateName.getZName.record');
    const returned = fact(factory.copy(identifier), 'getTemplateName.getZName.return');
    fact(factory.assign(result, returned), 'getTemplateName.assignIdentifier');
    if (result.isEmpty()) this.fields.writeUnsigned(56, 1, 1);
    this.state.trace.push('getTemplateName.identifierComplete');
    const argumentsResult = this.empty(factory);
    this.fields.writeUnsigned(57, 1, 1);
    this.state.trace.push('getTemplateArgumentList.begin');
    let firstArgument = true;
    while (argumentsResult.status === 0 && this.byte() !== 0 && this.byte() !== 0x40) {
      if (!firstArgument) fact(factory.append(argumentsResult, fact(factory.fromChar(0x2c), 'templateArguments.comma')), 'templateArguments.appendComma');
      firstArgument = false;
      const before = this.cursor();
      if (this.byte() === 0x56) {
        const primary = this.classPrimary(factory, second);
        const temporary = this.empty(factory);
        fact(factory.assign(temporary, primary), 'templateArguments.assignClassPrimary');
        const after = this.cursor();
        if (after.fields !== before.fields) throw new Error('Original template cursor backing changed');
        if (after.offset - before.offset > 1 && third.fields.readUnsigned(0) !== 9)
          fact(third.append(temporary), 'templateArguments.recordClass');
        fact(factory.append(argumentsResult, temporary), 'templateArguments.appendClassPrimary');
        continue;
      }
      if (this.byte() !== 0x57) throw new Error('Unowned getTemplateArgumentList primary data type');
      this.advance(); // getECSUDataType consumes W before getEnumType.
      const underlying = this.empty(factory);
      if (this.byte() !== 0x34) throw new Error('Unowned getEnumType underlying type');
      this.advance(); // Original case 4 returns an empty underlying type.
      const enumType = fact(factory.copy(underlying), 'getEnumType.return');
      const keyword = factory.sourceConstant('enumKeyword', '206bee18', 6);
      const keywordName = this.empty(factory);
      fact(factory.assignText(keywordName, {fields:keyword,offset:0}), 'getECSUDataType.enumKeyword');
      const qualified = fact(factory.plus(keywordName, enumType), 'getECSUDataType.enumPrefix');
      const argument = this.empty(factory);
      if (!(this.flags() & 0x8000)) fact(factory.assign(argument, qualified), 'getECSUDataType.assignEnumPrefix');
      const nameCursor: NativeCrtByteCursor = {get: () => this.fields.pointer<NativeCrtBytePointer>(32).get(),
        set: pointer => this.fields.pointer<NativeCrtBytePointer>(32).set(pointer)};
      if (this.byte() === 0x3f || (this.byte() >= 0x30 && this.byte() <= 0x39)) {
        throw new Error('Unowned template enum scoped name branch');
      }
      const enumParsed = fact(factory.fromDelimited(nameCursor, 0x40, () => this.flags()), 'templateEnum.getZName.delimited');
      const enumIdentifier = this.empty(factory);
      fact(factory.assign(enumIdentifier, enumParsed), 'templateEnum.getZName.assign');
      if (second.fields.readUnsigned(0) !== 9) fact(second.append(enumIdentifier), 'templateEnum.getZName.record');
      const scoped = this.empty(factory);
      fact(factory.assign(scoped, fact(factory.copy(enumIdentifier), 'templateEnum.getZName.return')), 'templateEnum.scoped.assign');
      if (this.byte() !== 0x40) throw new Error('Unowned template enum scope or truncated name');
      this.advance();
      fact(factory.append(argument, scoped), 'getECSUDataType.appendEnumName');
      const returnedArgument = fact(factory.copy(argument), 'getECSUDataType.returnEnum');
      const primary = this.empty(factory);
      fact(factory.assign(primary, returnedArgument), 'getSimpleDataType.assignEnum');
      const primaryReturn = fact(factory.copy(primary), 'getSimpleDataType.returnEnum');
      const temporary = this.empty(factory);
      fact(factory.assign(temporary, primaryReturn), 'templateArguments.assignPrimary');
      const after = this.cursor();
      if (after.fields !== before.fields) throw new Error('Original template cursor backing changed');
      if (after.offset - before.offset > 1 && third.fields.readUnsigned(0) !== 9) {
        fact(third.append(temporary), 'templateArguments.record');
      }
      fact(factory.append(argumentsResult, temporary), 'templateArguments.appendPrimary');
    }
    this.fields.writeUnsigned(57, 0, 1); this.state.trace.push('getTemplateArgumentList.return');
    const open = fact(factory.fromChar(0x3c), 'getTemplateName.openBracket');
    const bracketed = fact(factory.plus(open, argumentsResult), 'getTemplateName.prefixArguments');
    fact(factory.append(result, bracketed), 'getTemplateName.appendArguments');
    if (result.getLastChar() === 0x3e) fact(factory.append(result, fact(factory.fromChar(0x20), 'templateName.space')), 'templateName.appendSpace');
    fact(factory.append(result, fact(factory.fromChar(0x3e), 'templateName.closeBracket')), 'templateName.appendClose');
    for (let index=0;index<saved.length;index++) this.fields.pointer(20+index*4).set(saved[index]!);
    this.state.trace.push('getTemplateName.restoreReplicators');
    return fact(factory.copy(result), 'getTemplateName.return');
  }
  private parse(factory: NativeCrtDNameFactory, replicator: NativeCrtReplicator): NativeCrtDNameRecord {
    if (!(this.flags() & 0x2000)) throw new Error('Unowned UnDecorator symbol/declaration grammar');
    this.fields.writeUnsigned(48, this.flags() & ~0x2000); this.state.trace.push('grammar.dataType');
    let qualification = fact(factory.fromPointer(null), 'getDataType.pointerQualification');
    if (this.crt.module === 'Game' && this.byte() !== 0x3f) {
      admitGamePrimitiveSource();
      // These tokens follow the original getDataType -> getPrimaryDataType ->
      // getSimpleDataType branch with empty qualification. Pointer, reference
      // and extended types remain at their actual unsupported source boundary.
      const primitive = this.byte() === 0x5f && this.byte(1) === 0x4e ? 'Bool'
        : ({ E:'Char', G:'Short', H:'Int', J:'Long', K:'Long', M:'Float' } as Record<string,string>)[String.fromCharCode(this.byte())];
      if (!primitive) throw new Error('Unowned Game primitive getSimpleDataType branch');
      if (!qualification.isEmpty()) throw new Error('Unowned nonempty primitive data type qualification');
      const code = this.byte(); this.advance(primitive === 'Bool' ? 2 : 1);
      this.state.trace.push('getSimpleDataType.consumePrimitive');
      const constants = {
        Bool:['206bef94',5], Char:['206beff4',5], Short:['206befec',6],
        Int:['206befe8',4], Long:['206befe0',5], Float:['206befd8',6],
      } as const;
      const [address,bytes] = constants[primitive as keyof typeof constants];
      const local = this.empty(factory);
      fact(factory.assignText(local,{ fields:factory.sourceConstant('gamePrimitive'+primitive+'Keyword',address,bytes), offset:0 }),
        'getSimpleDataType.assignKeyword');
      if ([0x45,0x47,0x4b].includes(code)) {
        const prefix = this.empty(factory);
        fact(factory.assignText(prefix,{ fields:factory.sourceConstant('gamePrimitiveUnsignedKeyword','206bed08',10),offset:0 }),
          'getSimpleDataType.unsignedPrefix');
        const unsigned = fact(factory.plus(prefix,local),'getSimpleDataType.prependUnsigned');
        fact(factory.assign(local,unsigned),'getSimpleDataType.assignUnsigned');
      }
      this.state.trace.push('getSimpleDataType.primitiveReturn');
      const primary = fact(factory.copy(local),'getSimpleDataType.copyReturn');
      this.fields.writeUnsigned(48,this.flags() | 0x2000);
      return fact(factory.copy(primary),'getDecoratedName.primitiveReturn');
    }
    if (this.byte() !== 0x3f) throw new Error('Unowned getDataType branch outside selected RTTI qualification');
    this.advance(); // getDataType consumes '?' before calling getDataIndirectType.
    if (this.byte() !== 0x41) throw new Error('Unowned getDataIndirectType qualification');
    this.advance();
    const indirect = this.empty(factory);
    const word = indirect.fields.maskedWord(4);
    word.value = word.value | 0x10; word.knownMask = word.knownMask | 0x10;
    qualification = fact(factory.assign(qualification, fact(factory.copy(indirect), 'getDataIndirectType.return')), 'getDataType.assignQualification');
    if (!qualification.isEmpty()) throw new Error('Unowned nonempty primary type qualification');
    const primary = this.classPrimary(factory, replicator);
    this.fields.writeUnsigned(48, this.flags() | 0x2000);
    return fact(factory.copy(primary), 'getDecoratedName.return');
  }
  /** The same original primary-type branch is called by ordinary RTTI and
   * template argument parsing, with the currently installed name replicator. */
  private classPrimary(factory: NativeCrtDNameFactory, replicator: NativeCrtReplicator): NativeCrtDNameRecord {
    if (this.byte() !== 0x56) throw new Error('Unowned getPrimaryDataType/getSimpleDataType branch');
    this.advance(); this.advance(-1); // The simple-type default rewinds before ECSU.
    const keepKeyword = !(this.flags() & 0x8000) && !(this.flags() & 0x1000);
    this.advance(); // getECSUDataType consumes 'V'.
    const keyword = factory.sourceConstant('classKeyword', this.crt.module === 'Game' ? '206bee10' : '3089f408', 7);
    const className = this.empty(factory);
    fact(factory.assignText(className, { fields: keyword, offset: 0 }), 'getECSUDataType.classKeyword');
    const result = this.empty(factory);
    if (keepKeyword) fact(factory.assign(result, className), 'getECSUDataType.copyKeyword');
    const scoped = this.empty(factory);
    let identifier: NativeCrtDNameRecord;
    const current = this.byte();
    if (current >= 0x30 && current <= 0x39) {
      this.advance(); identifier = fact(factory.copy(fact(replicator.get(current - 0x30), 'getZName.replicator')), 'getZName.copyReference');
    } else {
      if (current === 0x3f) {
        const template = this.templateName(factory);
        const temporary = this.empty(factory);
        fact(factory.assign(temporary, template), 'getZName.assignTemplate');
        if (this.byte() === 0x40) this.advance();
        else fact(factory.assignStatus(temporary, this.byte() === 0 ? 2 : 1), 'getZName.templateTerminator');
        if (replicator.fields.readUnsigned(0) !== 9) fact(replicator.append(temporary), 'getZName.recordTemplate');
        identifier = fact(factory.copy(temporary), 'getZName.copyTemplate');
      }
      else {
      // These two prefixes select dimension/parameter services, not ordinary identifiers.
      for (const [label, engineAddress, gameAddress, size, count] of [
        ['templateParameterPrefix', '3089f3d4', '206bedd8', 20, 18],
        ['genericTypePrefix', '3089f3c4', '206bedc8', 14, 12],
      ] as const) {
        const prefix = factory.sourceConstant(label, this.crt.module === 'Game' ? gameAddress : engineAddress, size);
        const pointer = this.cursor(); let match = true;
        for (let i = 0; i <= count; i++) {
          const byte = pointer.fields.readUnsigned(pointer.offset + i, 1);
          if (byte !== prefix.readUnsigned(i, 1)) { match = false; break; }
          if (byte === 0) break;
        }
        if (match) { this.advance(count + 1); throw new Error('Unowned getZName parameter/dimension grammar'); }
      }
      const cursor: NativeCrtByteCursor = { get: () => this.fields.pointer<NativeCrtBytePointer>(32).get(),
        set: pointer => this.fields.pointer<NativeCrtBytePointer>(32).set(pointer) };
      const parsed = fact(factory.fromDelimited(cursor, 0x40, () => this.flags()), 'getZName.delimited');
      identifier = this.empty(factory); fact(factory.assign(identifier, parsed), 'getZName.assignIdentifier');
      if (replicator.fields.readUnsigned(0) !== 9) fact(replicator.append(identifier), 'getZName.recordIdentifier');
      identifier = fact(factory.copy(identifier), 'getZName.copyIdentifier');
      }
    }
    fact(factory.assign(scoped, identifier), 'getScopedName.assign');
    if (scoped.status === 0 && this.byte() !== 0 && this.byte() !== 0x40) throw new Error('Unowned getScopedName scope grammar');
    if (this.byte() === 0x40) this.advance();
    else if (this.byte() === 0) {
      if (scoped.isEmpty()) fact(factory.assignStatus(scoped, 2), 'getScopedName.emptyTruncated');
      else {
        fact(factory.status(2), 'getScopedName.truncatedPrefix');
        throw new Error('Unowned getScopedName truncated-name concatenation30697e2e');
      }
    }
    else fact(factory.assignStatus(scoped, 1), 'getScopedName.invalid');
    fact(factory.append(result, scoped), 'getECSUDataType.appendName');
    const ecsu = fact(factory.copy(result), 'getECSUDataType.return');
    const simple = this.empty(factory); fact(factory.assign(simple, ecsu), 'getSimpleDataType.assign');
    const primary = fact(factory.copy(simple), 'getSimpleDataType.return');
    return primary;
  }
  unDName(input: NativeCrtBytePointer | null, flags: number, output: NativeCrtBytePointer | null = null,
    outputBytes = 0): NativeValue<NativeCrtBytePointer | null> {
    const s = this.state;
    if (s.active) { s.reentrant = true; return unknown('Shared ' + this.crt.module + ' ___unDName is already executing'); }
    if (s.boundary) return unknown(s.boundary);
    s.active = true; s.reentrant = false;
    try {
      if (!Number.isInteger(flags) || flags < 0 || flags > 0xffff || !Number.isInteger(outputBytes) || outputBytes < 0) {
        throw new Error('Actual ushort flags and nonnegative output length required');
      }
      if (!this.call('crt.ensureLock5', () => this.crt.ensureLock(5))) return known(null);
      s.held = null; this.call('crt.lock5', () => this.crt.lock(5), () => { s.held = true; });
      const gameCallbacks = this.crt.module === 'Game' ? NativeCrtScratchArena.gameCallbacks(this.crt) : null;
      this.fields.pointer(0).set(gameCallbacks?.crtMalloc ?? s.allocator);
      this.fields.pointer(4).set(gameCallbacks?.crtFree ?? s.free);
      this.fields.writeUnsigned(16, 0); this.fields.pointer(8).set(null); this.fields.pointer(12).set(null);
      s.arena = this.crt.module === 'Game'
        ? NativeCrtScratchArena.forGame(this.crt, operation => this.guard(operation))
        : new NativeCrtScratchArena({ crtMalloc: s.allocator, crtFree: s.free },
          { fields: subview(this.fields, 0, 20), checkpoint: operation => this.guard(operation) });
      const factory = new NativeCrtDNameFactory(s.arena); s.factory = factory;
      const decorator = stack(120); s.decorator = decorator;
      const first = new NativeCrtReplicator(factory, subview(decorator, 0, 60));
      const second = new NativeCrtReplicator(factory, subview(decorator, 60, 60));
      fact(first.construct(), 'UnDecorator.replicator1'); fact(second.construct(), 'UnDecorator.replicator2');
      this.fields.pointer(36).set(input); this.fields.pointer(32).set(input);
      if (output) { this.fields.writeUnsigned(44, (outputBytes - 1) >>> 0); this.fields.pointer(40).set(output); }
      else { this.fields.pointer(40).set(null); this.fields.writeUnsigned(44, 0); }
      this.fields.writeUnsigned(48, flags); this.fields.pointer(24).set(second);
      this.fields.pointer(52).set(null); this.fields.pointer(20).set(first); this.fields.writeUnsigned(56, 0, 1);
      const parsed = this.empty(factory); const written = this.empty(factory);
      if (input) {
        if (this.byte() === 0x3f && this.byte(1) === 0x40) {
          this.advance(2); this.parse(factory, second);
          throw new Error('Unowned UnDecorator special prefix concatenation');
        }
        if (this.byte() === 0x3f && this.byte(1) === 0x24) throw new Error('Unowned UnDecorator template prefix');
        fact(factory.assign(parsed, this.parse(factory, second)), 'UnDecorator.assignParsed');
      }
      let result: NativeCrtBytePointer | null = null;
      if (parsed.status !== 3) {
        if (parsed.status === 1 || (!(this.flags() & 0x1000) && this.byte() !== 0)) {
          if (!input) throw new Error('UnDecorator original-input strlen dereferences NULL');
          fact(factory.assignText(written, input), 'UnDecorator.fallback');
        } else fact(factory.assign(written, parsed), 'UnDecorator.copyParsed');
        result = this.fields.pointer<NativeCrtBytePointer>(40).get();
        if (!result) {
          const length = written.length(); this.fields.writeUnsigned(44, length + 1);
          const backing = this.call('UnDecorator.allocateOutput', () => s.allocator((length + 8) & ~7));
          result = backing ? { fields: new NativeHeapObjectViews(backing), offset: 0 } : null;
          this.fields.pointer(40).set(result);
        }
        if (result) {
          fact(written.writeString(result, this.fields.readUnsigned(44)), 'UnDecorator.getString');
          let read = result.offset, write = result.offset;
          for (let byte = result.fields.readUnsigned(read, 1); byte !== 0; byte = result.fields.readUnsigned(read, 1)) {
            result.fields.writeUnsigned(write++, byte, 1); read++;
            if (byte === 0x20) while (result.fields.readUnsigned(read, 1) === 0x20) read++;
          }
          result.fields.writeUnsigned(write, 0, 1);
        }
      }
      this.call('HeapManager.destructor', () => s.arena!.cleanup());
      s.held = null; this.call('crt.unlock5', () => this.crt.unlock(5), () => { s.held = false; });
      // Globals keep the original dangling Replicator pointers after RET.
      // Completed frames expire; an unowned call retains a suspended prefix.
      decorator.backing.freed = true;
      return known(result);
    } catch (error) {
      s.boundary = error instanceof Error ? error.message : String(error); s.trace.push('blocked:' + s.boundary);
      return unknown(s.boundary);
    } finally { s.active = false; }
  }
  /** type_info::name always requests an independent output allocation. */
  decode(input: NativeCrtBytePointer, flags: 0x2800): NativeValue<NativeMemoryBacking | null> {
    const result = this.unDName(input, flags); if (!result.known) return result;
    if (!result.value) return known(null);
    if (result.value.offset !== 0) return unknown('Actual standalone CRT output backing required');
    return known(result.value.fields.backing as NativeMemoryBacking);
  }
  snapshot() { const s = this.state; return Object.freeze({ boundary: s.boundary, held: s.held, active: s.active,
    fields: s.fields, decorator: s.decorator, arena: s.arena?.snapshot() ?? null, trace: Object.freeze([...s.trace]) }); }
}

/** One Engine CRT owner has one SceneAdmin descriptor/cache and type-info list. */
export function nativeSceneTypeInfoForCrt(crt: NativeEngineCrtOwner): NativeSceneTypeInfoName {
  let name = typeNames.get(crt);
  if (!name) {
    const demangler = new NativeCrtUndName(crt);
    name = new NativeSceneTypeInfoName({ undname: (input, flags) => demangler.decode(input, flags),
      crtMalloc: bytes => crt.malloc(bytes), crtFree: backing => crt.free(backing),
      lock: id => crt.lock(id), unlock: id => crt.unlock(id) }, crt.physical.crtTypeInfoList);
    typeNames.set(crt, name);
  }
  return name;
}

export type NativeGameTypeInfoTarget = 'navigation' | 'scriptAdmin' | 'arena' | 'arenaStatus' | 'layerBase' | 'objectRef' | `gameClass${string}`;
const gameTypeInfoTargets: Readonly<Record<string, {
  readonly descriptorStorage: string;
  readonly decoratedName: string;
  readonly label: string;
}>> = Object.freeze({
  ...Object.fromEntries(gameClassNameFamilySpecs.filter(spec => !spec.legacyOwner).map(spec =>
    [spec.typeTarget,Object.freeze({ descriptorStorage:spec.labels.descriptor, decoratedName:spec.decoratedName,
      label:'class-name initializer '+spec.initializer })])),
  objectRef: Object.freeze({ descriptorStorage: 'objectRefTypeInfoDescriptor',
    decoratedName: '.?AVbCObjectRefBase@@', label: 'ObjectRef base' }),
  layerBase: Object.freeze({ descriptorStorage: 'layerBaseTypeInfoDescriptor',
    decoratedName: '.?AVeCProcessibleElement@@', label: 'LayerBase property object base' }),
  arenaStatus: Object.freeze({ descriptorStorage: 'arenaStatusTypeInfoDescriptor',
    decoratedName: '.?AV?$bTPropertyContainer@W4gEArenaStatus@@@@', label: 'Arena Status container' }),
  arena: Object.freeze({ descriptorStorage: 'arenaTypeInfoDescriptor',
    decoratedName: '.?AVgCArena_PS@@', label: 'Arena' }),
  navigation: Object.freeze({ descriptorStorage: 'navigationTypeInfoDescriptor',
    decoratedName: '.?AVgCNavigation_PS@@', label: 'Navigation' }),
  scriptAdmin: Object.freeze({ descriptorStorage: 'scriptAdminTypeInfoDescriptor',
    decoratedName: '.?AVgCScriptAdmin@@', label: 'ScriptAdmin' }),
});
const gameTypeNames = new WeakMap<NativeGameCrtOwner, Map<NativeGameTypeInfoTarget, NativeGameTypeInfoName>>();
const gameTypeInfoMethods = [
  ['typeInfoNameWrapper', '204637e0', 'e993582193b053903a0233de11767e2e5f59a078350762db06ef08338e02abd8'],
  ['typeInfoNameBody', '20468806', 'ae3f48bda6d41d14a3400665b49065f62042dbdc693472b12fd404ea3e3c4c5d'],
  ['typeInfoNameCleanup', '204688f2', '084f61fec2079ea071aa64ca396a8cf17ca74fc4087f67de3aba1218e37a4ff0'],
] as const;

/** Game's type_info::_Name_base for a pinned Game class descriptor. Its cache
 * and type-info list alias Game image storage; Engine CRT state is never used. */
export class NativeGameTypeInfoName {
  readonly descriptor: NativeHeapObjectViews;
  readonly list: NativeHeapObjectViews;
  private active = false;
  private reentrant = false;
  private boundary: string | null = null;
  private held: boolean | null = false;
  private readonly nodes: NativeMemoryBacking[] = [];
  private readonly trace: string[] = [];

  constructor(private readonly crt: NativeGameCrtOwner, private readonly demangler: NativeCrtUndName,
    readonly target: NativeGameTypeInfoTarget = 'navigation') {
    if (crt.module !== 'Game' || demangler.crt !== crt) {
      throw new Error('Matching canonical Game CRT and demangler owners required for Game type_info::Name');
    }
    admitNativeGameCrtSource();
    for (const [label, entry, hash] of gameTypeInfoMethods) {
      const method = crt.sourceProfile.heapRules.methods[label];
      if (method?.module !== 'Game' || method.entry !== entry || method.body !== entry ||
          method.bodyInstructionBytesSha256 !== hash) throw new Error('Game type_info::Name source receipt differs: ' + label);
    }
    const typeSpec = gameTypeInfoTargets[this.target];
    if (!typeSpec) throw new Error('Pinned original Game type-info target required');
    const descriptorReceipt = nativeGameImageReceipt(typeSpec.descriptorStorage);
    const listReceipt = nativeGameImageReceipt('crtTypeInfoList');
    this.descriptor = crt.imageStorage(typeSpec.descriptorStorage);
    this.list = crt.imageStorage('crtTypeInfoList');
    if (this.descriptor.bytes.length !== descriptorReceipt.bytes || this.descriptor.readUnsigned(0) !== 0x206b6374 ||
        this.list.bytes.length !== listReceipt.bytes || this.list.backing.identity !== crt.physical.crtTypeInfoList.backing.identity ||
        this.list.bytes.byteOffset !== crt.physical.crtTypeInfoList.bytes.byteOffset) {
      throw new Error('Exact physical Game ' + typeSpec.label + ' RTTI descriptor and list aliases required');
    }
    const mangled = [...typeSpec.decoratedName + '\0'].map(character => character.charCodeAt(0));
    if (mangled.some((byte, index) => this.descriptor.readUnsigned(8 + index, 1) !== byte)) {
      throw new Error('Original Game ' + typeSpec.label + ' RTTI descriptor differs');
    }
  }

  private guard(): void {
    if (this.reentrant) throw new Error('Unsupported reentry into Game CRT type_info::Name');
  }
  private call<T>(name: string, body: () => NativeValue<T>, retain?: (value: T) => void): T {
    this.guard(); this.trace.push(name + '.attempt');
    const result = body(); if (result.known) retain?.(result.value);
    this.guard(); const value = fact(result, name); this.trace.push(name); return value;
  }
  private strlen(text: NativeHeapObjectViews): number {
    // 2046dbd0 first peels to a DWORD boundary with unaligned DWORD loads and
    // low-byte tests, then applies the original 0x7efefeff / 0x81010100
    // predicate, rereading candidate DWORDs before ordered byte tests.
    const geometry = fact(this.crt.byteGeometry().resolveNativePointer({ fields: text, offset: 0 }),
      'Game _strlen pointer geometry');
    let offset = 0, residue: number = geometry.modulo4;
    while (residue !== 0) {
      this.trace.push('Game._strlen.load.unaligned+' + offset.toString(16));
      const loaded = text.maskedWord(offset, 4);
      if ((loaded.knownMask & 0xff) !== 0xff) throw new Error('Game _strlen low-byte mask is unknown at +' + offset.toString(16));
      if ((loaded.value & 0xff) === 0) return offset;
      offset++; residue = (residue + 1) & 3;
    }
    for (;;) {
      this.trace.push('Game._strlen.load.dword+' + offset.toString(16));
      const loaded = text.maskedWord(offset, 4), value = loaded.value >>> 0, knownMask = loaded.knownMask >>> 0;
      const decision = gameStrlenDwordCandidate(value, knownMask);
      if (!decision.known) throw new Error(decision.reason + ' at +' + offset.toString(16));
      const candidate = decision.value;
      if (!candidate) { offset += 4; continue; }

      this.trace.push('Game._strlen.candidate-reread+' + offset.toString(16));
      const reread = text.maskedWord(offset, 4), candidateWord = reread.value >>> 0, candidateMask = reread.knownMask >>> 0;
      for (let index = 0; index < 4; index++) {
        if (((candidateMask >>> (index * 8)) & 0xff) !== 0xff) {
          throw new Error('Game _strlen candidate byte mask is unknown at +' + (offset + index).toString(16));
        }
        if (((candidateWord >>> (index * 8)) & 0xff) === 0) {
          this.trace.push('Game._strlen.return' + (offset + index)); return offset + index;
        }
      }
      offset += 4;
    }
  }
  getName(): NativeValue<NativeMemoryBacking | null> {
    if (this.active) { this.reentrant = true; return unknown('Game type_info::Name is already executing'); }
    if (this.boundary) return unknown(this.boundary);
    this.active = true; this.reentrant = false;
    try {
      // The original cached branch returns the pointer without scanning it.
      const cached = this.descriptor.pointer<NativeMemoryBacking>(4).get();
      if (cached) return known(cached);
      const temporary = this.call('Game.___unDName.0x2800', () => this.demangler.decode(
        { fields: this.descriptor, offset: 9 }, 0x2800));
      if (!temporary) return known(null);
      const text = new NativeHeapObjectViews(temporary);
      let length = this.strlen(text);
      while (length > 0 && text.readUnsigned(length - 1, 1) === 0x20) text.writeUnsigned(--length, 0, 1);
      this.held = null;
      this.call('Game.crt.lock.14', () => this.crt.lock(14), () => { this.held = true; });
      if (this.descriptor.pointer<NativeMemoryBacking>(4).get() === null) {
        const node = this.call('Game.crt.malloc.8', () => this.crt.malloc(8), allocation => { if (allocation) this.nodes.push(allocation); });
        if (node) {
          const destination = this.call('Game.crt.malloc.name', () => this.crt.malloc(length + 1));
          this.guard();
          // _Name_base publishes the cache before its successful strcpy_s path.
          this.descriptor.pointer<NativeMemoryBacking>(4).set(destination);
          if (destination) {
            const output = new NativeHeapObjectViews(destination);
            for (let offset = 0; offset <= length; offset++) output.writeUnsigned(offset, text.readUnsigned(offset, 1), 1);
            const links = new NativeHeapObjectViews(node, 0, 8);
            links.pointer<NativeMemoryBacking>(0).set(destination);
            links.pointer<NativeMemoryBacking>(4).set(this.list.pointer<NativeMemoryBacking>(4).get());
            this.list.pointer<NativeMemoryBacking>(4).set(node); this.trace.push('Game.crt.typeInfoList.link');
          } else this.call('Game.crt.free.node', () => this.crt.free(node));
        }
      }
      this.call('Game.crt.free.undname', () => this.crt.free(temporary));
      this.held = null;
      this.call('Game.crt.unlock.14', () => this.crt.unlock(14), () => { this.held = false; });
      this.guard(); return known(this.descriptor.pointer<NativeMemoryBacking>(4).get());
    } catch (error) {
      this.boundary = error instanceof Error ? error.message : String(error);
      this.trace.push('blocked:' + this.boundary); return unknown(this.boundary);
    } finally { this.active = false; }
  }
  snapshot() { return Object.freeze({ boundary: this.boundary, held: this.held,
    nodes: Object.freeze([...this.nodes]), trace: Object.freeze([...this.trace]) }); }
}

export function nativeGameTypeInfoForCrt(crt: NativeGameCrtOwner,
  target: NativeGameTypeInfoTarget = 'navigation'): NativeGameTypeInfoName {
  let names = gameTypeNames.get(crt);
  if (!names) { names = new Map(); gameTypeNames.set(crt, names); }
  let name = names.get(target);
  if (!name) {
    name = new NativeGameTypeInfoName(crt, new NativeCrtUndName(crt), target);
    names.set(target, name);
  }
  return name;
}
