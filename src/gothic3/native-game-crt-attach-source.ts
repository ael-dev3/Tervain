/** Original Game command-line/environment continuation admission. Only the
 * connected environment/scalar-copy owners use these receipts; other captured
 * methods, C/C++ tables and vector bodies remain source context. */
import sourceText from '../../assets/gothic3/game-attach-continuation/runtime-rules.json?raw';
import type { NativeCrtImageReceipt, NativeCrtSourceRules } from './native-game-crt-profile';

type ImagePin = readonly ['coldGlobals' | 'constBytes', string, number, string, string];
interface ContinuationRules extends NativeCrtSourceRules {
  readonly methods: Readonly<Record<string, NativeCrtSourceRules['methods'][string] & {
    readonly instructionCount: number; readonly bodyByteCount: number;
  }>>;
}
const rules = JSON.parse(sourceText) as ContinuationRules;
function freeze(value: unknown): void {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
}
freeze(rules);
export const gameContinuationImagePins: Readonly<Record<string, ImagePin>> = Object.freeze({
  "environmentMode": Object.freeze(["coldGlobals","207d11b0",4,"00000000","df3f619804a92fdb4057192dc43dd748ea778adc52bc498ce80524c014b81119"] as const),
  "commandLinePointer": Object.freeze(["coldGlobals","207d2b60",4,"00000000","df3f619804a92fdb4057192dc43dd748ea778adc52bc498ce80524c014b81119"] as const),
  "environmentBlock": Object.freeze(["coldGlobals","207d0a74",4,"00000000","df3f619804a92fdb4057192dc43dd748ea778adc52bc498ce80524c014b81119"] as const),
  "sse2Flag207d2b50": Object.freeze(["coldGlobals","207d2b50",4,"00000000","df3f619804a92fdb4057192dc43dd748ea778adc52bc498ce80524c014b81119"] as const),
  "memcpyForwardAlignment": Object.freeze(["constBytes","20463f58",16,"3f462090683f4620943f4620b83f4620","3336231dd59d9d68dd61de5001d07055059302f363512a1286a07df232311aa6"] as const),
  "memcpyForwardDwords": Object.freeze(["constBytes","20463fd8",32,"3b404620284046202040462018404620104046200840462000404620f83f4620","46df32e22b197bed7bbb2efebc146e8ba0b53d4e8770de577920e064767f4a0e"] as const),
  "memcpyForwardTail": Object.freeze(["constBytes","20464044",16,"544046205c404620684046207c404620","f8dd107ffdcaca97c9b71f4753425de1e73b01e63af24e68c2ac719db8f45820"] as const),
  "memcpyBackwardAlignment": Object.freeze(["constBytes","204640e4",16,"41462090f44046201841462040414620","ac694c1cf43bc597a3a7503644548bf32d1ba2e3df3d33d248fc056ee74cd42a"] as const),
  "memcpyBackwardDwords": Object.freeze(["constBytes","20464174",32,"944146209c414620a4414620ac414620b4414620bc414620c4414620d7414620","b5a26505990206089fc9a62f559fcecaa18abb6eac710733fc1bcde843254843"] as const),
  "memcpyBackwardTail": Object.freeze(["constBytes","204641e0",16,"f0414620f8414620084246201c424620","73159c14e4252df6a69363cb0622b63f9ab00dd44439135be604f775bee8aac8"] as const),
});
const methods = Object.freeze({
  "crtGetEnvironmentStringsA": Object.freeze(["20476835","20476835",132,309,"47dc43d75db5b302d67ae8bff4bad683a4a9c2c829fbf85bcc1d4f862fd8687d"] as const),
  "ioInit": Object.freeze(["204742ff","204742ff",186,562,"eb6d483cbc0cdb9286f65cbe9fa791601334ad2806380b84240c29b504883fcf"] as const),
  "crtAttach": Object.freeze(["204677e4","204677e4",151,473,"9469f04e5cd533e1cf5aaa85553339f7e4eb4eb7f38ec894a6b4d8dd0493be27"] as const),
  "memcpy": Object.freeze(["20463ed0","20463ed0",247,711,"f838a57733ec436508f0b40ed0f262cc84bb134c359061028cf5786c6b33e8ac"] as const),
});
const imports = Object.freeze([
  ['207d7ca0', 'GetCommandLineA'], ['207d7c3c', 'GetEnvironmentStringsW'],
  ['207d7b64', 'GetLastError'], ['207d7be4', 'WideCharToMultiByte'],
  ['207d7c38', 'FreeEnvironmentStringsW'], ['207d7c34', 'GetEnvironmentStrings'],
  ['207d7c30', 'FreeEnvironmentStringsA'],
] as const);
export function admitGameEnvironmentSource(): void {
  if (rules.schema !== 'gothic3-game-attach-continuation-rules-v1' ||
      rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f') {
    throw new Error('Original Game attach continuation source differs');
  }
  for (const [label, pin] of Object.entries(methods)) {
    const method = rules.methods[label];
    if (!method || method.module !== 'Game' || method.entry !== pin[0] || method.body !== pin[1] ||
        method.instructionCount !== pin[2] || method.bodyByteCount !== pin[3] ||
        method.bodyInstructionBytesSha256 !== pin[4]) {
      throw new Error('Original Game continuation method differs: ' + label);
    }
  }
  for (const label of Object.keys(gameContinuationImagePins)) gameContinuationImageReceipt(label);
  for (const [address, name] of imports) {
    const receipt = rules.imports?.Game?.find(entry => entry.iatVA === '0x' + address);
    if (!receipt || receipt.module !== 'KERNEL32.dll' || receipt.name !== name || receipt.ordinal !== null) {
      throw new Error('Original Game continuation import differs: ' + name);
    }
  }
}
export function gameContinuationImageReceipt(label: string): NativeCrtImageReceipt {
  const pin = gameContinuationImagePins[label];
  if (!pin) throw new Error('Game continuation storage has no original source admission: ' + label);
  const [group, address, bytes, raw, hash] = pin, receipt = rules[group][label];
  if (!receipt || receipt.module !== 'Game' || receipt.address !== address || receipt.bytes !== bytes ||
      receipt.raw !== raw || receipt.sha256 !== hash || receipt.knownMask !== 'ff'.repeat(bytes) ||
      receipt.scope !== (group === 'coldGlobals' ? 'cold-original-image' : 'original-file-backed-constant') ||
      receipt.liveValueCaptured !== false) throw new Error('Original Game continuation storage differs: ' + label);
  return receipt;
}
/** PCs from the original151-row Game crtAttach caller, not inferred Engine offsets. */
export const gameAttachContinuationInstructionPoints = Object.freeze({
  commandLineCall: '204678b9', commandLineIat: '207d7ca0', commandLineStore: '204678bf',
  environmentCall: '204678c4', environmentTarget: '20476835', environmentStore: '204678c9',
  ioInitCall: '204678ce', ioInitTarget: '204742ff',
});
