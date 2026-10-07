/** Original Game ioInit/SEH source admission. Only the connected incoming
 * call, prolog and STARTUPINFOA argument prefix execute in this checkpoint.
 * Epilog, writer and exception closures remain unexecuted source context. */
import rulesText from '../../assets/gothic3/game-io-startup/runtime-rules.json?raw';
import type { NativeCrtImageReceipt, NativeCrtSourceRules } from './native-game-crt-profile';

export interface NativeGameIoInstruction {
  readonly va: string; readonly rva: string; readonly fileOffset: number;
  readonly bytes: string; readonly instruction: string; readonly assemblyLine: number;
}
interface IoImageReceipt extends NativeCrtImageReceipt {
  readonly originalPESection?: Readonly<{ name: string; characteristics: string;
    readable: boolean; writable: boolean; executable: boolean }>;
}
interface IoSourceRules extends NativeCrtSourceRules {
  readonly methods: Readonly<Record<string, NativeCrtSourceRules['methods'][string] & {
    readonly module: string; readonly instructionCount: number; readonly bodyByteCount: number;
    readonly bodyRanges: string;
    readonly sourceOnly: boolean; readonly runtimeOwnerAdmitted: boolean; readonly currentLiveValueCaptured: boolean;
  }>>;
  readonly constBytes: Readonly<Record<string, IoImageReceipt>>;
  readonly instructionPoints: Readonly<Record<string, NativeGameIoInstruction>>;
  readonly frameLayout: Readonly<Record<string, unknown>>;
  readonly peOnlyCode: Readonly<Record<string, NativeCrtImageReceipt & {
    readonly sourceOnly: boolean; readonly runtimeOwnerAdmitted: boolean; readonly currentLiveValueCaptured: boolean;
    readonly originalCatalogGap: boolean; readonly sourceCGap: boolean; readonly sourceASMGap: boolean;
    readonly originalInstructions: readonly unknown[]; readonly reconstructedC: unknown;
  }>>;
}
const rules = JSON.parse(rulesText) as IoSourceRules;
function freeze(value: unknown): void {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
}
freeze(rules);
export const gameIoStartupImagePins = Object.freeze({
  ioInitEH4Scope: Object.freeze(['constBytes', '206e8e90', 28,
    'feffffff000000008cffffff00000000feffffff284547202c454720',
    '353a6a24a2117c555964b0376368ed7ab9098f5b16e6ea2cac68b158a7c803cc'] as const),
});
const methods = Object.freeze({
  ioInit: Object.freeze(['204742ff', 186, 562, '204742ff-20474527;20474536-2047453e',
    'eb6d483cbc0cdb9286f65cbe9fa791601334ad2806380b84240c29b504883fcf'] as const),
  sehProlog4: Object.freeze(['20468570', 21, 69, '20468570-204685b4',
    '0a3e894695f99ac271fa039cc7153c7cdd9e3a92758aa39483cadf68e7e029f1'] as const),
  sehEpilog4: Object.freeze(['204685b5', 11, 20, '204685b5-204685c8',
    '39142b8d79823b8b3c0dd534ee99caf6c8cce4347b7608cfc004a14c873f7411'] as const),
  exceptHandler4: Object.freeze(['20468600', 125, 406, '20468600-20468795',
    '303933b4b85da98d14e1f304f3d2cd949eef1a19d5a7290a943562ebf7d39c6d'] as const),
});
const instructionPins = Object.freeze([
  ['204678ce', 'e82cca0000', 'CALL 0x204742ff'],
  ['204678d3', '85c0', 'TEST EAX,EAX'],
  ['204742ff', '6a54', 'PUSH 0x54'],
  ['20474301', '68908e6e20', 'PUSH 0x206e8e90'],
  ['20474306', 'e86542ffff', 'CALL 0x20468570'],
  ['20468570', '6800864620', 'PUSH 0x20468600'],
  ['20468575', '64ff3500000000', 'PUSH dword ptr FS:[0x0]'],
  ['2046857c', '8b442410', 'MOV EAX,dword ptr [ESP + 0x10]'],
  ['20468580', '896c2410', 'MOV dword ptr [ESP + 0x10],EBP'],
  ['20468584', '8d6c2410', 'LEA EBP,[ESP + 0x10]'],
  ['20468588', '2be0', 'SUB ESP,EAX'],
  ['2046858a', '53', 'PUSH EBX'],
  ['2046858b', '56', 'PUSH ESI'],
  ['2046858c', '57', 'PUSH EDI'],
  ['2046858d', 'a114237b20', 'MOV EAX,[0x207b2314]'],
  ['20468592', '3145fc', 'XOR dword ptr [EBP + -0x4],EAX'],
  ['20468595', '33c5', 'XOR EAX,EBP'],
  ['20468597', '50', 'PUSH EAX'],
  ['20468598', '8965e8', 'MOV dword ptr [EBP + -0x18],ESP'],
  ['2046859b', 'ff75f8', 'PUSH dword ptr [EBP + -0x8]'],
  ['2046859e', '8b45fc', 'MOV EAX,dword ptr [EBP + -0x4]'],
  ['204685a1', 'c745fcfeffffff', 'MOV dword ptr [EBP + -0x4],0xfffffffe'],
  ['204685a8', '8945f8', 'MOV dword ptr [EBP + -0x8],EAX'],
  ['204685ab', '8d45f0', 'LEA EAX,[EBP + -0x10]'],
  ['204685ae', '64a300000000', 'MOV FS:[0x0],EAX'],
  ['204685b4', 'c3', 'RET'],
  ['2047430b', '33ff', 'XOR EDI,EDI'],
  ['2047430d', '897dfc', 'MOV dword ptr [EBP + -0x4],EDI'],
  ['20474310', '8d459c', 'LEA EAX,[EBP + -0x64]'],
  ['20474313', '50', 'PUSH EAX'],
  ['20474314', 'ff151c7c7d20', 'CALL dword ptr [0x207d7c1c]'],
  ['20474539', 'e87740ffff', 'CALL 0x204685b5'],
  ['2047453e', 'c3', 'RET'],
] as const);

export function gameIoStartupInstruction(address: string): NativeGameIoInstruction {
  const pin = instructionPins.find(entry => entry[0] === address);
  const rows = Object.values(rules.instructionPoints ?? {}).filter(row => row.va === address);
  const row = rows[0];
  const rva = Number.parseInt(address, 16) - 0x20000000;
  if (!pin || !row || rows.some(other => other.bytes !== row.bytes || other.instruction !== row.instruction) ||
      row.bytes !== pin[1] || row.instruction !== pin[2] || row.rva !== rva.toString(16) || row.fileOffset !== rva ||
      !Number.isSafeInteger(row.assemblyLine) || row.assemblyLine < 1) {
    throw new Error('Original Game I/O instruction receipt differs at' + address);
  }
  return row;
}
export function gameIoStartupImageReceipt(label: string): NativeCrtImageReceipt {
  if (label !== 'ioInitEH4Scope') throw new Error('Game I/O startup has no active image admission for' + label);
  const [group, address, bytes, raw, hash] = gameIoStartupImagePins.ioInitEH4Scope;
  const receipt = rules[group]?.[label], section = receipt?.originalPESection;
  if (!receipt || receipt.module !== 'Game' || receipt.address !== address || receipt.bytes !== bytes ||
      receipt.raw !== raw || receipt.knownMask !== 'ff'.repeat(bytes) || receipt.sha256 !== hash ||
      receipt.scope !== 'original-file-backed-constant' || receipt.liveValueCaptured !== false ||
      section?.name !== '.rdata' || section.characteristics !== '40000040' ||
      section.readable !== true || section.writable !== false || section.executable !== false) {
    throw new Error('Original readonly Game ioInit EH4 scope receipt differs');
  }
  return receipt;
}
export function admitGameIoStartupSource(): void {
  if (rules.schema !== 'gothic3-game-io-startup-rules-v1' ||
      rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f') {
    throw new Error('Original Game I/O startup source differs');
  }
  for (const [label, pin] of Object.entries(methods)) {
    const method = rules.methods[label];
    if (!method || method.module !== 'Game' || method.entry !== pin[0] || method.body !== pin[0] ||
        method.instructionCount !== pin[1] || method.bodyByteCount !== pin[2] || method.bodyRanges !== pin[3] ||
        method.bodyInstructionBytesSha256 !== pin[4] || method.sourceOnly !== true || method.runtimeOwnerAdmitted !== false ||
        method.currentLiveValueCaptured !== false) throw new Error('Original Game I/O method differs:' + label);
  }
  for (const pin of instructionPins) gameIoStartupInstruction(pin[0]);
  gameIoStartupImageReceipt('ioInitEH4Scope');
  const framePins = {
    ebpRelativeToEntryStack: -4, espAfterPrologRelativeToEBP: -0x74, registrationRelativeToEBP: -0x10,
    startupInfoRelativeToEBP: -0x64, startupInfoBytes: 68, originalLocalAllocationBytes: 0x54,
    frameCookieRelativeToEBP: -0x74, encodedScopeRelativeToEBP: -8, tryLevelRelativeToEBP: -4,
    savedEspRelativeToEBP: -0x18, incomingCallerReturnRelativeToEBP: 4,
    callerReturnPC: '204678d3', prologReturnPC: '2047430b', epilogReturnPC: '2047453e',
    callerReturnSlotConsumedAt: '2047453e', callerSlotSurvivesEpilog: true,
    runtimeBoundaryIsNativeException: false, sourceOnly: true, runtimeOwnerAdmitted: false,
    currentLiveValueCaptured: false,
  };
  for (const [name, expected] of Object.entries(framePins)) {
    if (rules.frameLayout?.[name] !== expected) throw new Error('Original Game I/O frame relation differs:' + name);
  }
  for (const [label, address, bytes, raw, hash] of [
    ['ioInitFilterPEOnly', '20474528', 4, '33c040c3', '194f81a127723ec366ff0b8410df190c0649a05808a94d5554d82de5af7f425b'],
    ['ioInitHandlerPrefixPEOnly', '2047452c', 10, '8b65e8c745fcfeffffff', '4c2c27ef3945820c17ab500b2545b225acab624302304c4c4c256352b589121e'],
  ] as const) {
    const gap = rules.peOnlyCode?.[label];
    if (!gap || gap.module !== 'Game' || gap.address !== address || gap.bytes !== bytes || gap.raw !== raw || gap.sha256 !== hash ||
        gap.knownMask !== 'ff'.repeat(bytes) || gap.scope !== 'original-PE-only-code-with-ASM-C-catalog-gaps' ||
        gap.sourceOnly !== true || gap.runtimeOwnerAdmitted !== false || gap.currentLiveValueCaptured !== false ||
        gap.originalCatalogGap !== true || gap.sourceCGap !== true || gap.sourceASMGap !== true ||
        !Array.isArray(gap.originalInstructions) || gap.originalInstructions.length !== 0 || gap.reconstructedC !== null) {
      throw new Error('Original noncallable Game I/O PE-only gap differs:' + label);
    }
  }
  const startup = rules.imports?.Game?.find(receipt => receipt.iatVA === '0x207d7c1c');
  if (!startup || startup.module !== 'KERNEL32.dll' || startup.name !== 'GetStartupInfoA' || startup.ordinal !== null) {
    throw new Error('Original Game GetStartupInfoA import differs');
  }
}
/** Frozen source metadata only; it cannot activate a handler or continue a frame. */
export function nativeGameIoStartupSource(): IoSourceRules { return rules; }
