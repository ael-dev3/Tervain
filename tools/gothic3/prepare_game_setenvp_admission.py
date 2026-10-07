"""Emit immutable Game environment source admission pins from source documents.
No TypeScript is executed. Not an original-source or runtime dependency.
"""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
package = root / 'assets/gothic3/game-setenvp'
documents = {label: json.loads((package / filename).read_text(encoding='utf-8'))
    for label, filename in [('rules', 'runtime-rules.json'), ('evidence', 'native-evidence.json'),
                            ('ledger', 'source-reference-ledger.json'), ('manifest', 'source-manifest.json')]}
assert documents['rules']['counts']['getterRows'] == 528
assert documents['rules']['counts']['instructionRows'] == 377
image_pins = {label: [group, receipt['address'], receipt['bytes'], receipt['raw'], receipt['sha256']]
    for group, labels in [('coldGlobals', ['envp', 'environmentAllocated']), ('constBytes', ['freeEH4Scope'])]
    for label in labels for receipt in [documents['rules'][group][label]]}
template = '''/** Strict original Game environment source admission.
 * This module grants no current memory, import, frame or execution capability.
 * Relocation requires regeneration of actual producer/manifest pins. */
import rulesText from '../../assets/gothic3/game-setenvp/runtime-rules.json?raw';
import evidenceText from '../../assets/gothic3/game-setenvp/native-evidence.json?raw';
import ledgerText from '../../assets/gothic3/game-setenvp/source-reference-ledger.json?raw';
import manifestText from '../../assets/gothic3/game-setenvp/source-manifest.json?raw';
import type { NativeGameIoInstruction } from './native-game-crt-io-source';
import type { NativeCrtImageReceipt } from './native-game-crt-profile';

export interface NativeGameSetEnvpMethodReceipt {
  readonly module: string; readonly entry: string; readonly body: string; readonly bodyRanges: string;
  readonly instructionCount: number; readonly bodyBytes: number; readonly bodyByteCount: number;
  readonly bodyInstructionBytesSha256: string; readonly sourceOnly: boolean;
  readonly executionAdmitted: boolean; readonly runtimeOwnerAdmitted: boolean;
  readonly contextOnly: boolean; readonly currentLiveValueCaptured: boolean;
  readonly sourceRefs: Readonly<Record<string,string>>; readonly sourceRefsRoot: string;
}
export interface NativeGameSetEnvpSourceRules {
  readonly schema: string; readonly inputs: Readonly<{Game:string}>;
  readonly methods: Readonly<Record<string,NativeGameSetEnvpMethodReceipt>>;
  readonly contextOriginalMethods: Readonly<Record<string,NativeGameSetEnvpMethodReceipt>>;
  readonly instructionPoints: Readonly<Record<string,NativeGameIoInstruction>>;
  readonly callerInstructionPoints: Readonly<Record<string,NativeGameIoInstruction>>;
  readonly coldGlobals: Readonly<Record<string,NativeCrtImageReceipt>>;
  readonly constBytes: Readonly<Record<string,NativeCrtImageReceipt>>;
  readonly peOnlyCode: Readonly<Record<string,Readonly<Record<string,unknown>>>>;
  readonly counts: Readonly<Record<string,number>>;
  readonly selectedNormalPath: Readonly<Record<string,unknown>>;
  readonly callAndTailSites: readonly Readonly<Record<string,unknown>>[];
  readonly sourceDependencies: Readonly<Record<string,Readonly<Record<string,unknown>>>>;
  readonly imports: Readonly<Record<string,readonly Readonly<Record<string,unknown>>[]>>;
  readonly contextImports: Readonly<Record<string,readonly Readonly<Record<string,unknown>>[]>>;
  readonly sourceOnly: boolean; readonly executionAdmitted: boolean;
  readonly runtimeOwnerAdmitted: boolean; readonly liveValueCaptured: boolean;
  readonly currentLiveValueCaptured: boolean;
}
const rules = JSON.parse(rulesText) as NativeGameSetEnvpSourceRules;
const evidence: unknown = JSON.parse(evidenceText);
const ledger: unknown = JSON.parse(ledgerText);
const manifest: unknown = JSON.parse(manifestText);
const pins: Readonly<Record<string,unknown>> = __DOCUMENTS__;
const instructionPCs:readonly string[] = __INSTRUCTION_PCS__;
export const gameSetEnvpImagePins:Readonly<Record<string,readonly [
  'coldGlobals'|'constBytes',string,number,string,string
]>> = __IMAGE_PINS__;
function freeze(value:unknown):void {
  if(value!==null && typeof value==='object' && !Object.isFrozen(value)) {
    for(const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
}
freeze(rules);freeze(evidence);freeze(ledger);freeze(manifest);freeze(pins);freeze(instructionPCs);freeze(gameSetEnvpImagePins);
function equal(actual:unknown,expected:unknown):boolean {
  if(actual===expected)return true;
  if(actual===null || expected===null || typeof actual!=='object' || typeof expected!=='object')return false;
  if(Array.isArray(actual)!==Array.isArray(expected))return false;
  const a=actual as Record<string,unknown>,b=expected as Record<string,unknown>;
  const keys=Object.keys(a).sort(),other=Object.keys(b).sort();
  return keys.length===other.length && keys.every((key,i)=>key===other[i] && equal(a[key],b[key]));
}
function requireSame(actual:unknown,expected:unknown,label:string):void {
  if(!equal(actual,expected))throw new Error('Original Game environment source differs: '+label);
}
let admitted=false;
export function admitGameSetEnvpSource():void {
  if(admitted)return;
  requireSame(rules,pins.rules,'complete rules and conditional source scope');
  requireSame(evidence,pins.evidence,'original PE/catalog/C/ASM receipts and genuine gaps');
  requireSame(ledger,pins.ledger,'exact reused listings and focused dependencies');
  requireSame(manifest,pins.manifest,'actual producer, loaded helpers, original inputs and outputs');
  if(rules.schema!=='gothic3-game-setenvp-rules-v1' ||
      rules.inputs.Game!=='b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
      rules.sourceOnly!==true || rules.executionAdmitted!==false || rules.runtimeOwnerAdmitted!==false ||
      rules.liveValueCaptured!==false || rules.currentLiveValueCaptured!==false) {
    throw new Error('Original Game environment source scope differs');
  }
  const keys=Object.keys(rules.instructionPoints).sort();
  requireSame(keys,instructionPCs,'exact original instruction PCs sorted by VA');
  if(keys.length!==528 || rules.counts.methods!==8 || rules.counts.instructionRows!==377 ||
      rules.counts.bodyBytes!==1022 || rules.counts.reusedSourceFiles!==22 ||
      rules.counts.focusedDependencyJsonFiles!==12)throw new Error('Original Game environment counts differ');
  for(const pc of keys) {
    const point=rules.instructionPoints[pc];
    if(!point || point.va!==pc || !/^[0-9a-f]{8}$/.test(pc) || !/^(?:[0-9a-f]{2})+$/.test(point.bytes) ||
        parseInt(pc,16)-parseInt(point.rva,16)!==0x20000000 || !Number.isSafeInteger(point.fileOffset)) {
      throw new Error('Original Game environment instruction differs: '+pc);
    }
  }
  if(Object.hasOwn(rules.instructionPoints,'20476593') || Object.hasOwn(rules.instructionPoints,'20477d21') ||
      Object.hasOwn(rules.instructionPoints,'20467cc0') || Object.hasOwn(rules.instructionPoints,'204665f4')) {
    throw new Error('Noncallable Game environment context became an instruction');
  }
  for(const [label,pin] of Object.entries(gameSetEnvpImagePins)) {
    const [group,address,bytes,raw,hash]=pin,receipt=rules[group][label];
    if(!receipt || receipt.module!=='Game' || receipt.address!==address || receipt.bytes!==bytes ||
        receipt.raw!==raw || receipt.sha256!==hash || receipt.knownMask!=='ff'.repeat(bytes) ||
        receipt.liveValueCaptured!==false || receipt.scope!==(group==='coldGlobals'?
          'cold-original-image':'original-file-backed-constant'))throw new Error('Original Game environment image differs: '+label);
  }
  admitted=true;
}
export function gameSetEnvpInstruction(pc:string):NativeGameIoInstruction {
  admitGameSetEnvpSource();
  const point=rules.instructionPoints[pc];
  if(!point)throw new Error('No admitted original Game environment instruction: '+pc);
  return point;
}
export function gameSetEnvpSource():NativeGameSetEnvpSourceRules {
  admitGameSetEnvpSource();return rules;
}
export function gameSetEnvpImageReceipt(label:string):NativeCrtImageReceipt {
  admitGameSetEnvpSource();
  const receipt=rules.coldGlobals[label]??rules.constBytes[label];
  if(!receipt)throw new Error('No admitted original Game environment image receipt: '+label);
  return receipt;
}
'''
text = template.replace('__DOCUMENTS__', json.dumps(documents, separators=(',', ':'), ensure_ascii=False))
text = text.replace('__IMAGE_PINS__', json.dumps(image_pins, separators=(',', ':')))
text = text.replace('__INSTRUCTION_PCS__', json.dumps(sorted(documents['rules']['instructionPoints']), separators=(',', ':')))
target = root / 'src/gothic3/native-game-crt-setenvp-source.ts'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(text, encoding='utf-8', newline='\n')
print(json.dumps({'path': str(target), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                  'bytes': target.stat().st_size, 'typeScriptExecuted': False}))
