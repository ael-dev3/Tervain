import rules from '../../assets/gothic3/script-admin-startup/runtime-rules.json';
import runtimeRules from '../../assets/gothic3/runtime-admin/runtime-rules.json';
import npcRules from '../../assets/gothic3/npc-heap/runtime-rules.json';
import type { NativeValue } from './dialogue';
import type { NativeHeapCString } from './native-heap-cstring';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryAdmin, NativeMemoryAllocation } from './native-memory-admin';
import type { NativeBytePointer } from './native-pointer-geometry';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
type Method = { module?: string; entry: string; body: string; bodyRanges: string;
  instructionCount: number; bodyBytes: number; bodyInstructionBytesSha256: string;
  entryChain?: readonly { va: string; bytes: string; targetVA: string }[];
  sourceOwner?: { package: string; method: string }; sourceDependency?: string; reusedReceipt?: string;
  callSites?: readonly { callerModule: string; callerMethod: string; va: string; bytes: string;
    instruction: string; targetEntry: string; assemblyLine: number }[] };
const source = rules as unknown as { schema: string; inputs: { SharedBase: string };
  methods: Record<string, Method>; entryAliases: Record<string, Method>;
  dependencies: Record<string, { path: string; bytes: number; sha256: string; methods: readonly string[];
    runtimeRules: { path: string; bytes: number; sha256: string } }>;
  constBytes: Record<string, { module: string; address: string; bytes: number; raw: string;
    knownMask: string; sha256: string; scope: string; liveValueCaptured: boolean }>;
  importBindings: Record<string, { module: string; iatVA: string; importModule: string;
    decoratedName: string; ordinal: number | null; originalIATBytes: string; liveImportTargetCaptured: boolean }> };
const sharedBase = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214';

function pinMethod(method: Method | undefined, entry: string, body: string, extent: string,
  count: number, bytes: number, hash: string): void {
  if (!method || method.entry !== entry || method.body !== body || method.bodyRanges !== extent ||
      method.instructionCount !== count || method.bodyBytes !== bytes || method.bodyInstructionBytesSha256 !== hash) {
    throw new Error('Original GUID text lower method differs: ' + entry);
  }
}
function assertSource(): void {
  if (source.schema !== 'gothic3-script-admin-startup-rules-v1' || source.inputs.SharedBase !== sharedBase ||
      runtimeRules.schema !== 'gothic3-runtime-admin-rules-v1' || runtimeRules.inputs.SharedBase !== sharedBase ||
      npcRules.schema !== 'gothic3-npc-heap-rules-v1' || npcRules.inputs.SharedBase !== sharedBase) {
    throw new Error('Original GUID text source receipt differs');
  }
  for (const [label, entry, body, extent, count, bytes, hash, thunk] of [
    ['guidSetText', '10008175', '10012790', '10012790-1001281d', 57, 142,
      '08a0405a66687fafb6e5696ab41a3bf12a56ed6059aade4787798e25375bf34e', 'e916a60000'],
    ['guidEqualsRaw', '100075f4', '10012290', '10012290-10012330', 66, 161,
      '547f5bb93125da1133935d868b524c211fef6404611e336905b1672e6a6f534c', 'e997ac0000'],
  ] as const) {
    const method = source.methods[label];
    pinMethod(method, entry, body, extent, count, bytes, hash);
    if (method?.module !== 'SharedBase' || method.entryChain?.length !== 1 ||
        method.entryChain[0]?.va !== entry || method.entryChain[0]?.bytes !== thunk || method.entryChain[0]?.targetVA !== body) {
      throw new Error('Original GUID text entry chain differs: ' + entry);
    }
  }
  for (const [label, owner, canonical, entry, body, extent, count, bytes, hash, chain] of [
    ['memoryGetInstance', 'runtime-admin', runtimeRules.methods.memoryGetInstance, '10002aae', '10020bf0', '10020bf0-10020c39', 16, 74,
      '79302e58eb88b69239f60db781967e6c265bf12fff7f5da8f5efcdb022e9a454',
      [['10002aae', 'e93de10100', '10020bf0']]],
    ['memoryMalloc', 'npc-heap', npcRules.methods.memoryMalloc, '10003cd8', '1003d410', '1003d410-1003d4a4', 44, 149,
      'd97007fcb58bd7d0b0c6ec9c49f58763fba8bdfb6127c9078ddf1159fc8af676',
      [['10003cd8', 'e923ce0100', '10020b00'], ['10020b00', 'e93c69feff', '10007441'], ['10007441', 'e9ca5f0300', '1003d410']]],
    ['memoryFree', 'runtime-admin', runtimeRules.methods.memoryFree, '10002112', '1003cb50', '1003cb50-1003cbdd', 41, 142,
      '0b7a758064cd662abf7f88e315720a3a28cdaf0d0e4e381f28db493c8cf9c3a2',
      [['10002112', 'e9d9e90100', '10020af0'], ['10020af0', 'e97450feff', '10005b69'], ['10005b69', 'e9e26f0300', '1003cb50']]],
  ] as const) {
    const alias = source.entryAliases[label];
    pinMethod(canonical, entry, body, extent, count, bytes, hash);
    pinMethod(alias, entry, body, extent, count, bytes, hash);
    if (alias?.module !== 'SharedBase' || alias.sourceOwner?.package !== owner || alias.sourceOwner?.method !== label ||
        alias.entryChain?.length !== chain.length || chain.some(([va, raw, target], index) =>
          alias.entryChain?.[index]?.va !== va || alias.entryChain?.[index]?.bytes !== raw || alias.entryChain?.[index]?.targetVA !== target)) {
      throw new Error('Original GUID allocator alias differs: ' + entry);
    }
  }
  for (const [label, dependency, receipt, calls] of [
    ['memoryGetInstance', 'runtimeAdmin', '../runtime-admin/native-evidence.json',
      [['100127d3', 'e8d602ffff', '10002aae', 22203], ['10012808', 'e8a102ffff', '10002aae', 22223]]],
    ['memoryMalloc', 'npcHeap', '../npc-heap/native-evidence.json', [['100127da', 'e8f914ffff', '10003cd8', 22205]]],
    ['memoryFree', 'runtimeAdmin', '../runtime-admin/native-evidence.json', [['1001280f', 'e8fef8feff', '10002112', 22225]]],
  ] as const) {
    const alias = source.entryAliases[label];
    if (alias?.sourceDependency !== dependency || alias.reusedReceipt !== receipt || alias.callSites?.length !== calls.length ||
        calls.some(([va, bytes, target, line], index) => {
          const call = alias.callSites?.[index];
          return call?.callerModule !== 'SharedBase' || call.callerMethod !== 'guidSetText' || call.va !== va ||
            call.bytes !== bytes || call.targetEntry !== target || call.instruction !== 'CALL 0x' + target || call.assemblyLine !== line;
        })) throw new Error('Original GUID lower callsite linkage differs: ' + label);
  }
  for (const [label, path, bytes, hash, methods, rulesPath, rulesBytes, rulesHash] of [
    ['npcHeap', '../npc-heap/native-evidence.json', 201370, '43df9152efdae1430dd40eafe484059a916366022f8f482a9e491b5fd6db4d13',
      ['memoryMalloc'], '../npc-heap/runtime-rules.json', 67235, 'fd10d3c26179c1e828458936c322c0bd727f3dafede192b2e5294782b045336e'],
    ['runtimeAdmin', '../runtime-admin/native-evidence.json', 981963, 'f95836ff2371128333c2d90ba3cd00a0820bd909f04b5dd5ec3a53a8c285ecb9',
      ['memoryGetInstance', 'memoryFree'], '../runtime-admin/runtime-rules.json', 372698, '8f4f8a4cc4e73334385309c78743069c8fef4e682eea72c1716a6a0bf45c5576'],
  ] as const) {
    const dependency = source.dependencies[label];
    if (dependency?.path !== path || dependency.bytes !== bytes || dependency.sha256 !== hash ||
        dependency.methods?.length !== methods.length || methods.some((method, index) => dependency.methods[index] !== method) ||
        dependency.runtimeRules?.path !== rulesPath || dependency.runtimeRules.bytes !== rulesBytes || dependency.runtimeRules.sha256 !== rulesHash) {
      throw new Error('Original GUID lower source dependency differs: ' + label);
    }
  }
  const empty = source.constBytes.guidEmptyLiteral;
  if (!empty || empty.module !== 'SharedBase' || empty.address !== '100e5e10' || empty.bytes !== 3 ||
      empty.raw !== '7b7d00' || empty.knownMask !== 'ffffff' ||
      empty.sha256 !== '68e9e86b6926cc2b37df96b5e61bb8cabdab276272bb73f6767e420c3ead0663' ||
      empty.scope !== 'original-file-backed-constant' || empty.liveValueCaptured !== false) {
    throw new Error('Original GUID empty literal differs');
  }
  for (const [address, dll, name, raw] of [
    ['102f963c', 'KERNEL32.dll', 'MultiByteToWideChar', 'a49c2f00'],
    ['102f9a30', 'ole32.dll', 'IIDFromString', '7a9f2f00'],
  ] as const) {
    const binding = source.importBindings['SharedBase:' + address];
    if (!binding || binding.module !== 'SharedBase' || binding.iatVA !== address || binding.importModule !== dll ||
        binding.decoratedName !== name || binding.ordinal !== null || binding.originalIATBytes !== raw ||
        binding.liveImportTargetCaptured !== false) throw new Error('Original GUID platform IAT differs: ' + address);
  }
}

export interface NativeMultiByteToWideCharArguments {
  readonly codePage: 0;
  readonly flags: 0;
  readonly input: NativeBytePointer;
  readonly inputBytes: -1;
  readonly output: NativeBytePointer | null;
  /** Raw EBX DWORD bits, including the query's original return value. */
  readonly outputCharacters: number;
}
/** Explicit lower platform writers. They read live pointers and apply writes
 * to the supplied backing/masks; the caller never consumes copied text. */
export interface NativeGuidTextPlatform {
  multiByteToWideChar(args: NativeMultiByteToWideCharArguments): NativeValue<number>;
  iidFromString(input: NativeBytePointer | null, outputGuidPrefix16: NativeHeapObjectViews): NativeValue<number>;
}

function dword(value: number): number {
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0xffffffff) throw new Error('Native GUID platform result must retain DWORD bits');
  return value >>> 0;
}

/** SharedBase100075f4->10012290. A known differing bit proves the DWORD CMP
 * branch even when other bits are unknown; the reached byte loads still need
 * their actual values. Unresolved comparisons stop at that DWORD. */
export function nativeGuidPayloadEquals(left: NativeHeapObjectViews, right: NativeHeapObjectViews): NativeValue<0 | 1> {
  try {
    assertSource();
    for (let offset = 0; offset < 16; offset += 4) {
      const leftWord = left.maskedWord(offset), leftValue = leftWord.value;
      const rightWord = right.maskedWord(offset), rightValue = rightWord.value;
      const leftMask = leftWord.knownMask, rightMask = rightWord.knownMask;
      if (leftMask === 0xffffffff && rightMask === 0xffffffff && leftValue === rightValue) continue;
      if (((leftValue ^ rightValue) & leftMask & rightMask) === 0) {
        return unknown('Original GUID DWORD comparison has unresolved bits at +' + offset.toString(16));
      }
      for (let byte = 0; byte < 4; byte++) {
        const a = left.readUnsigned(offset + byte, 1), b = right.readUnsigned(offset + byte, 1);
        if (a !== b) return known(0);
      }
      return known(1); // Original byte fallback returns after its fourth pair.
    }
    return known(1);
  } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
}

/** bCGuid::SetData(bCString const&)10008175->10012790. Construction binds the
 * existing20-byte receiver and performs no native clear or other store. */
export class NativeGuidText {
  private readonly prefix: NativeHeapObjectViews;
  private readonly trace: string[] = [];
  private blocked: string | null = null;
  private active = false;
  private wideAllocation: NativeMemoryAllocation | null = null;
  private queryCharacters: number | null = null;
  private requestBytes: number | null = null;
  constructor(private readonly memory: NativeMemoryAdmin, readonly guid: NativeHeapObjectViews,
    private readonly platform?: NativeGuidTextPlatform, private readonly interrupted?: () => string | null) {
    assertSource();
    if (guid.bytes.length !== 20) throw new Error('Actual twenty-byte native GUID receiver required');
    this.prefix = new NativeHeapObjectViews(guid.backing, guid.bytes.byteOffset - guid.backing.bytes.byteOffset, 16);
  }
  private call<T>(label: string, invoke: () => NativeValue<T>): T {
    this.trace.push(label + '.attempt');
    const result = invoke();
    if (this.blocked) throw new Error(this.blocked);
    const interruption = this.interrupted?.();
    if (interruption) throw new Error(interruption);
    if (!result.known) throw new Error(label + ': ' + result.reason);
    this.trace.push(label + '.return'); return result.value;
  }
  private missing<T>(label: string): NativeValue<T> { return unknown('Original GUID lower platform writer required: ' + label); }

  setData(text: NativeHeapCString): NativeValue<number> {
    if (this.active) {
      this.blocked = 'Reentrant original GUID SetData is unowned';
      return unknown(this.blocked);
    }
    if (this.blocked) return unknown(this.blocked);
    if (!text.usesMemoryAdmin(this.memory)) return unknown('CString and GUID text owner require the same retained MemoryAdmin');
    this.active = true;
    try {
      const empty = this.call('SharedBase.guid-empty100e5e10', () => this.memory.guidEmptyLiteralPointer());
      const equal = this.call('SharedBase.CString.Equals10013b70', () => text.equalsText(empty));
      if (equal !== 0) {
        this.guid.writeUnsigned(16, 0, 1);
        this.trace.push('guid-empty.valid0.return1'); return known(1);
      }
      const queryInput = this.call('SharedBase.CString.GetText100127b7', () => text.getTextPointer());
      const query = this.call('KERNEL32.MultiByteToWideChar100127c7', () => this.platform?.multiByteToWideChar({
        codePage: 0, flags: 0, input: queryInput, inputBytes: -1, output: null, outputCharacters: 0,
      }) ?? this.missing<number>('MultiByteToWideChar'));
      const characters = dword(query), requestBytes = (characters + characters) >>> 0;
      this.queryCharacters = characters; this.requestBytes = requestBytes;
      const allocateOwner = this.call('SharedBase.MemoryAdmin.GetInstance100127d3', () => this.memory.getInstance());
      const wide = this.call('SharedBase.MemoryAdmin.Malloc100127da', () => allocateOwner.malloc(requestBytes));
      this.wideAllocation = wide;
      const output: NativeBytePointer | null = wide === null ? null :
        Object.freeze({ fields: new NativeHeapObjectViews(wide), offset: 0 });
      // Allocation callbacks may mutate, replace or free the CString holder.
      const fillInput = this.call('SharedBase.CString.GetText100127e3', () => text.getTextPointer());
      this.call('KERNEL32.MultiByteToWideChar100127f1', () => this.platform?.multiByteToWideChar({
        codePage: 0, flags: 0, input: fillInput, inputBytes: -1, output, outputCharacters: characters,
      }) ?? this.missing<number>('MultiByteToWideChar')); // EAX is ignored.
      const hresult = this.call('ole32.IIDFromString100127f9', () => this.platform?.iidFromString(output, this.prefix) ?? this.missing<number>('IIDFromString'));
      this.guid.writeUnsigned(16, dword(hresult) === 0 ? 1 : 0, 1);
      this.trace.push('guid-validity.store10012805');
      const freeOwner = this.call('SharedBase.MemoryAdmin.GetInstance10012808', () => this.memory.getInstance());
      this.call('SharedBase.MemoryAdmin.Free1001280f', () => freeOwner.free(wide));
      const valid = this.guid.readUnsigned(16, 1);
      this.trace.push('guid-validity.reload10012814'); return known(valid);
    } catch (error) {
      this.blocked = error instanceof Error ? error.message : String(error);
      this.trace.push('blocked:' + this.blocked); return unknown(this.blocked);
    } finally { this.active = false; }
  }
  snapshot() { return Object.freeze({ receiver: this.guid, wideAllocation: this.wideAllocation,
    queryCharacters: this.queryCharacters, requestBytes: this.requestBytes, blocked: this.blocked,
    trace: Object.freeze([...this.trace]) }); }
}
