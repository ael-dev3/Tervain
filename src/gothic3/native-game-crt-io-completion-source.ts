/** Original Game standard-I/O/final-return source admission.
 * Frozen source receipts grant no handles, live PTD/cache/section/stack access,
 * Windows call, exception dispatch, caller continuation or runtime execution. */
import rulesText from '../../assets/gothic3/game-io-completion/runtime-rules.json?raw';
import evidenceText from '../../assets/gothic3/game-io-completion/native-evidence.json?raw';
import manifestText from '../../assets/gothic3/game-io-completion/source-manifest.json?raw';
import type { NativeGameIoInstruction } from './native-game-crt-io-source';
import type { NativeCrtImageReceipt } from './native-game-crt-profile';

interface MethodSource extends Readonly<Record<string, unknown>> {
  readonly module: string; readonly entry: string; readonly body: string; readonly bodyRanges: string;
  readonly instructionCount: number; readonly bodyBytes: number; readonly bodyByteCount: number;
  readonly bodyInstructionBytesSha256: string; readonly sourceRefsRoot: string;
  readonly sourceRefs: Readonly<Record<string, string>>;
}
interface ImageSource extends NativeCrtImageReceipt {
  readonly rva: string; readonly fileOffset: number | null; readonly section: Readonly<Record<string, number>>;
  readonly originalPESection: Readonly<Record<string, unknown>>;
  readonly sourceOnly: boolean; readonly runtimeOwnerAdmitted: boolean; readonly currentLiveValueCaptured: boolean;
  readonly canonicalImageLabel: string;
}
interface Dependency { readonly path: string; readonly bytes: number; readonly sha256: string }
interface OriginalMethod extends Readonly<Record<string, unknown>> {
  readonly label: string; readonly entryVA: string; readonly bodyVA: string; readonly bodyRanges: string;
  readonly instructionCount: number; readonly bodyByteCount: number;
  readonly instructions: readonly NativeGameIoInstruction[];
}
export interface NativeGameIoCompletionSourceRules extends Readonly<Record<string, unknown>> {
  readonly schema: string; readonly inputs: Readonly<Record<string, string>>;
  readonly methods: Readonly<Record<string, MethodSource>>;
  readonly instructionPoints: Readonly<Record<string, NativeGameIoInstruction>>;
  readonly sourceContextInstructionPoints: Readonly<Record<string, NativeGameIoInstruction>>;
  readonly callSites: Readonly<Record<string, NativeGameIoInstruction>>;
  readonly sourceContext: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly coldGlobals: Readonly<Record<string, ImageSource>>;
  readonly constBytes: Readonly<Record<string, ImageSource>>;
  readonly sourceDependencies: Readonly<Record<string, Readonly<Record<string, Dependency>>>>;
  readonly selectedNormalPath: Readonly<Record<string, unknown>>;
  readonly selectedHeadlessNullPath: Readonly<Record<string, unknown>>;
  readonly counts: Readonly<Record<string, number>>;
}
const rules = JSON.parse(rulesText) as NativeGameIoCompletionSourceRules;
const evidence = JSON.parse(evidenceText) as NativeGameIoCompletionSourceRules & {
  readonly originalModuleAudit: Readonly<Record<string, unknown>> & { readonly methods: readonly OriginalMethod[] };
  readonly originalGapSearch: Readonly<Record<string, unknown>> & {
    readonly corpusFiles: readonly Readonly<{ path: string; bytes: number; sha256: string }>[] };
  readonly directCallAndTailEdges: readonly unknown[];
};
const manifest = JSON.parse(manifestText) as Readonly<Record<string, unknown>> & {
  readonly files: readonly Readonly<{ location: string; path: string; bytes: number; sha256: string }>[];
};
function freeze(value: unknown): void {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
}
freeze(rules); freeze(evidence); freeze(manifest);
const methodPins: Readonly<Record<string, MethodSource>> = {"ioInit":{"module":"Game","entry":"204742ff","body":"204742ff","bodyRanges":"204742ff-20474527;20474536-2047453e","instructionCount":186,"bodyBytes":562,"bodyByteCount":562,"bodyInstructionBytesSha256":"eb6d483cbc0cdb9286f65cbe9fa791601334ad2806380b84240c29b504883fcf","entryChain":[],"sourceRefs":{"assembly":"sources/Game/204742ff.asm.txt","assemblySha256":"49198ad6297171771d955deaf1e62c364743274c9c957ce94717fedb572c4de1","c":"sources/Game/204742ff.c.txt","cSha256":"2cc60dfa073fbe1a9834cf43e7dc498b5cab040c2af14c4edf448efcb677fdff","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-attach-continuation","originalCatalog":{"address":"204742ff","name":"__ioinit","qualified_name":"__ioinit","signature":"int __cdecl __ioinit(void);","status":"decompiled","error":"","elapsed_ms":"32","body_bytes":"562","body_ranges":"204742ff-20474527;20474536-2047453e","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"6253","assembly_entry_line":"1173528","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62131},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00125.c","sha256":"1543a283a5ce7bbd1473ecd2d442590fd9e66f9369d8f3a5b4bb9b49b919ca51","line":6253,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"sehProlog4":{"module":"Game","entry":"20468570","body":"20468570","bodyRanges":"20468570-204685b4","instructionCount":21,"bodyBytes":69,"bodyByteCount":69,"bodyInstructionBytesSha256":"0a3e894695f99ac271fa039cc7153c7cdd9e3a92758aa39483cadf68e7e029f1","entryChain":[],"sourceRefs":{"assembly":"sources/Game/20468570.asm.txt","assemblySha256":"08f4b98324ef7fbbf12b6d6fc120721226addca354bf35dbaea7aa7b7392c2cc","c":"sources/Game/20468570.c.txt","cSha256":"8b38188825b6cde0ae14f26555b28d5ef27afa2310bcf2ceaf871eda29cad7ac","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-attach-continuation","originalCatalog":{"address":"20468570","name":"__SEH_prolog4","qualified_name":"__SEH_prolog4","signature":"void __SEH_prolog4(undefined4 param_1,int param_2);","status":"decompiled","error":"","elapsed_ms":"4","body_bytes":"69","body_ranges":"20468570-204685b4","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9915","assembly_entry_line":"1162673","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61960},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9915,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"sehEpilog4":{"module":"Game","entry":"204685b5","body":"204685b5","bodyRanges":"204685b5-204685c8","instructionCount":11,"bodyBytes":20,"bodyByteCount":20,"bodyInstructionBytesSha256":"39142b8d79823b8b3c0dd534ee99caf6c8cce4347b7608cfc004a14c873f7411","entryChain":[],"sourceRefs":{"assembly":"sources/Game/204685b5.asm.txt","assemblySha256":"2d541c84a4793f966ca8426769be866365a9a3179c5af116853a9054de5f9bec","c":"sources/Game/204685b5.c.txt","cSha256":"5596cfb72be1be0a5999197f4480e4447a566ec8e8a8f015f2dc0dd91fba124e","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-attach-continuation","originalCatalog":{"address":"204685b5","name":"__SEH_epilog4","qualified_name":"__SEH_epilog4","signature":"void __SEH_epilog4(void);","status":"decompiled","error":"","elapsed_ms":"1","body_bytes":"20","body_ranges":"204685b5-204685c8","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9945","assembly_entry_line":"1162695","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61961},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9945,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"sectionHelper":{"module":"Game","entry":"204741c7","body":"204741c7","bodyRanges":"204741c7-20474201;20474205-2047424c;2047427c-2047428b","instructionCount":50,"bodyBytes":147,"bodyByteCount":147,"bodyInstructionBytesSha256":"e4666cc20a730154db1404bbc0399373039275646b82e22fa0378d722eab79f9","entryChain":[],"sourceRefs":{"assembly":"sources/Game/204741c7.asm.txt","assemblySha256":"6734485aee03347a8a01abd2e3c67d11476cd8a8030af962277c128be5cf24d9","c":"sources/Game/204741c7.c.txt","cSha256":"ba58746271a6fe61aecbf69abd12eebc9b69ff3fd7b92839cc573398b6c5b470","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","originalCatalog":{"address":"204741c7","name":"___crtInitCritSecAndSpinCount","qualified_name":"___crtInitCritSecAndSpinCount","signature":"int ___crtInitCritSecAndSpinCount(undefined4 param_1,undefined4 param_2);","status":"decompiled","error":"","elapsed_ms":"14","body_bytes":"147","body_ranges":"204741c7-20474201;20474205-2047424c;2047427c-2047428b","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"6172","assembly_entry_line":"1173451","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62128},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00125.c","sha256":"1543a283a5ce7bbd1473ecd2d442590fd9e66f9369d8f3a5b4bb9b49b919ca51","line":6172,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"decodePointer":{"module":"Game","entry":"20467ddb","body":"20467ddb","bodyRanges":"20467ddb-20467e48","instructionCount":36,"bodyBytes":110,"bodyByteCount":110,"bodyInstructionBytesSha256":"cb3a88e5fa9e53d81b30478aa8d45b6777c4d25366401ea4d3cf3e85a9678ab0","entryChain":[],"sourceRefs":{"assembly":"sources/Game/20467ddb.asm.txt","assemblySha256":"e05f3a544429f8b93ee459b497b9bc8db298565c4886e9ff1282bec36ae5a1d3","c":"sources/Game/20467ddb.c.txt","cSha256":"20437957658af00c8b2661951485e6dc1ebe918f77ee0a2dd206801c14c3ac0d","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","originalCatalog":{"address":"20467ddb","name":"FUN_20467ddb","qualified_name":"FUN_20467ddb","signature":"int FUN_20467ddb(int param_1);","status":"decompiled","error":"","elapsed_ms":"9","body_bytes":"110","body_ranges":"20467ddb-20467e48","is_thunk":"false","source":"DEFAULT","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9349","assembly_entry_line":"1162010","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61941},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9349,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false}};
freeze(methodPins);
const sourceContextPins: Readonly<Record<string, unknown>> = {"ioInit":{"module":"Game","entry":"204742ff","body":"204742ff","bodyRanges":"204742ff-20474527;20474536-2047453e","instructionCount":186,"bodyBytes":562,"bodyByteCount":562,"bodyInstructionBytesSha256":"eb6d483cbc0cdb9286f65cbe9fa791601334ad2806380b84240c29b504883fcf","entryChain":[],"sourceRefs":{"assembly":"sources/Game/204742ff.asm.txt","assemblySha256":"49198ad6297171771d955deaf1e62c364743274c9c957ce94717fedb572c4de1","c":"sources/Game/204742ff.c.txt","cSha256":"2cc60dfa073fbe1a9834cf43e7dc498b5cab040c2af14c4edf448efcb677fdff","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-attach-continuation","originalCatalog":{"address":"204742ff","name":"__ioinit","qualified_name":"__ioinit","signature":"int __cdecl __ioinit(void);","status":"decompiled","error":"","elapsed_ms":"32","body_bytes":"562","body_ranges":"204742ff-20474527;20474536-2047453e","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"6253","assembly_entry_line":"1173528","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62131},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00125.c","sha256":"1543a283a5ce7bbd1473ecd2d442590fd9e66f9369d8f3a5b4bb9b49b919ca51","line":6253,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"sehProlog4":{"module":"Game","entry":"20468570","body":"20468570","bodyRanges":"20468570-204685b4","instructionCount":21,"bodyBytes":69,"bodyByteCount":69,"bodyInstructionBytesSha256":"0a3e894695f99ac271fa039cc7153c7cdd9e3a92758aa39483cadf68e7e029f1","entryChain":[],"sourceRefs":{"assembly":"sources/Game/20468570.asm.txt","assemblySha256":"08f4b98324ef7fbbf12b6d6fc120721226addca354bf35dbaea7aa7b7392c2cc","c":"sources/Game/20468570.c.txt","cSha256":"8b38188825b6cde0ae14f26555b28d5ef27afa2310bcf2ceaf871eda29cad7ac","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-attach-continuation","originalCatalog":{"address":"20468570","name":"__SEH_prolog4","qualified_name":"__SEH_prolog4","signature":"void __SEH_prolog4(undefined4 param_1,int param_2);","status":"decompiled","error":"","elapsed_ms":"4","body_bytes":"69","body_ranges":"20468570-204685b4","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9915","assembly_entry_line":"1162673","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61960},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9915,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"sehEpilog4":{"module":"Game","entry":"204685b5","body":"204685b5","bodyRanges":"204685b5-204685c8","instructionCount":11,"bodyBytes":20,"bodyByteCount":20,"bodyInstructionBytesSha256":"39142b8d79823b8b3c0dd534ee99caf6c8cce4347b7608cfc004a14c873f7411","entryChain":[],"sourceRefs":{"assembly":"sources/Game/204685b5.asm.txt","assemblySha256":"2d541c84a4793f966ca8426769be866365a9a3179c5af116853a9054de5f9bec","c":"sources/Game/204685b5.c.txt","cSha256":"5596cfb72be1be0a5999197f4480e4447a566ec8e8a8f015f2dc0dd91fba124e","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-attach-continuation","originalCatalog":{"address":"204685b5","name":"__SEH_epilog4","qualified_name":"__SEH_epilog4","signature":"void __SEH_epilog4(void);","status":"decompiled","error":"","elapsed_ms":"1","body_bytes":"20","body_ranges":"204685b5-204685c8","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9945","assembly_entry_line":"1162695","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61961},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9945,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"sectionHelper":{"module":"Game","entry":"204741c7","body":"204741c7","bodyRanges":"204741c7-20474201;20474205-2047424c;2047427c-2047428b","instructionCount":50,"bodyBytes":147,"bodyByteCount":147,"bodyInstructionBytesSha256":"e4666cc20a730154db1404bbc0399373039275646b82e22fa0378d722eab79f9","entryChain":[],"sourceRefs":{"assembly":"sources/Game/204741c7.asm.txt","assemblySha256":"6734485aee03347a8a01abd2e3c67d11476cd8a8030af962277c128be5cf24d9","c":"sources/Game/204741c7.c.txt","cSha256":"ba58746271a6fe61aecbf69abd12eebc9b69ff3fd7b92839cc573398b6c5b470","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","originalCatalog":{"address":"204741c7","name":"___crtInitCritSecAndSpinCount","qualified_name":"___crtInitCritSecAndSpinCount","signature":"int ___crtInitCritSecAndSpinCount(undefined4 param_1,undefined4 param_2);","status":"decompiled","error":"","elapsed_ms":"14","body_bytes":"147","body_ranges":"204741c7-20474201;20474205-2047424c;2047427c-2047428b","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"6172","assembly_entry_line":"1173451","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62128},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00125.c","sha256":"1543a283a5ce7bbd1473ecd2d442590fd9e66f9369d8f3a5b4bb9b49b919ca51","line":6172,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"decodePointer":{"module":"Game","entry":"20467ddb","body":"20467ddb","bodyRanges":"20467ddb-20467e48","instructionCount":36,"bodyBytes":110,"bodyByteCount":110,"bodyInstructionBytesSha256":"cb3a88e5fa9e53d81b30478aa8d45b6777c4d25366401ea4d3cf3e85a9678ab0","entryChain":[],"sourceRefs":{"assembly":"sources/Game/20467ddb.asm.txt","assemblySha256":"e05f3a544429f8b93ee459b497b9bc8db298565c4886e9ff1282bec36ae5a1d3","c":"sources/Game/20467ddb.c.txt","cSha256":"20437957658af00c8b2661951485e6dc1ebe918f77ee0a2dd206801c14c3ac0d","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","originalCatalog":{"address":"20467ddb","name":"FUN_20467ddb","qualified_name":"FUN_20467ddb","signature":"int FUN_20467ddb(int param_1);","status":"decompiled","error":"","elapsed_ms":"9","body_bytes":"110","body_ranges":"20467ddb-20467e48","is_thunk":"false","source":"DEFAULT","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9349","assembly_entry_line":"1162010","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61941},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9349,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"sectionFallback":{"module":"Game","entry":"204741b7","body":"204741b7","bodyRanges":"204741b7-204741c6","instructionCount":5,"bodyBytes":16,"bodyByteCount":16,"bodyInstructionBytesSha256":"6a9d71899ceb3082f087906258408e630305ba10629333b4d896cc95e2582953","entryChain":[],"sourceRefs":{"assembly":"sources/Game/204741b7.asm.txt","assemblySha256":"4ffb5409756dc06ee6a81ba028cc6958981b82712077fc3a5c6fb4a96f3b96ce","c":"sources/Game/204741b7.c.txt","cSha256":"86a8687f3418a0fb82166bbb6737922d12796a1646524011054245149327e378","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","originalCatalog":{"address":"204741b7","name":"___crtInitCritSecNoSpinCount@8","qualified_name":"___crtInitCritSecNoSpinCount@8","signature":"undefined4 ___crtInitCritSecNoSpinCount@8(LPCRITICAL_SECTION param_1);","status":"decompiled","error":"","elapsed_ms":"2","body_bytes":"16","body_ranges":"204741b7-204741c6","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"6157","assembly_entry_line":"1173445","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62127},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00125.c","sha256":"1543a283a5ce7bbd1473ecd2d442590fd9e66f9369d8f3a5b4bb9b49b919ca51","line":6157,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"encodePointer":{"module":"Game","entry":"20467d64","body":"20467d64","bodyRanges":"20467d64-20467dd1","instructionCount":36,"bodyBytes":110,"bodyByteCount":110,"bodyInstructionBytesSha256":"7a6aca648a5272b8b66761e76fa72b6bbeebdfd4b789904b3cc43f084e01bd63","entryChain":[],"sourceRefs":{"assembly":"sources/Game/20467d64.asm.txt","assemblySha256":"3ab56b2e3ea9eb37a3b5a6356e80707ab1d1404dada0ca259fc40dc780f27ede","c":"sources/Game/20467d64.c.txt","cSha256":"58b8657092c320f9fb9ada4d45b55525faa358d1c34ac077471918c552dab6ea","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","originalCatalog":{"address":"20467d64","name":"FUN_20467d64","qualified_name":"FUN_20467d64","signature":"int FUN_20467d64(int param_1);","status":"decompiled","error":"","elapsed_ms":"10","body_bytes":"110","body_ranges":"20467d64-20467dd1","is_thunk":"false","source":"DEFAULT","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9296","assembly_entry_line":"1161965","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61939},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9296,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"getOsPlatform":{"module":"Game","entry":"2046645f","body":"2046645f","bodyRanges":"2046645f-20466495","instructionCount":25,"bodyBytes":55,"bodyByteCount":55,"bodyInstructionBytesSha256":"8238dbabcb9734239b406d95487b627a7bc5b94028b162086f03ba7b23cef692","entryChain":[],"sourceRefs":{"assembly":"sources/Game/2046645f.asm.txt","assemblySha256":"f32a5fa770e0f1e197573f1fa90735628f3d9bf3c3e127094807e17470f12860","c":"sources/Game/2046645f.c.txt","cSha256":"388594fd095d5fda732964c5bc17a4bada960522bc284e79f9e660f588b771be","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","originalCatalog":{"address":"2046645f","name":"__get_osplatform","qualified_name":"__get_osplatform","signature":"undefined4 __get_osplatform(int *param_1);","status":"decompiled","error":"","elapsed_ms":"2","body_bytes":"55","body_ranges":"2046645f-20466495","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"7588","assembly_entry_line":"1159640","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61892},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":7588,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"getWinMajor":{"module":"Game","entry":"2046650e","body":"2046650e","bodyRanges":"2046650e-20466549","instructionCount":25,"bodyBytes":60,"bodyByteCount":60,"bodyInstructionBytesSha256":"19e3d59dee8ead8449a03d4bf3d56b285c319cb145f588b18e9f01750b216777","entryChain":[],"sourceRefs":{"assembly":"sources/Game/2046650e.asm.txt","assemblySha256":"a2bec0c939f2a7d78c81e5e3c8f9a0dca28be814b3b0916d57b91b71afa1922c","c":"sources/Game/2046650e.c.txt","cSha256":"37e09309bcf0677cdea2879a444b06b2a08bf4ce88452c61548e5b3b2c39af60","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","originalCatalog":{"address":"2046650e","name":"__get_winmajor","qualified_name":"__get_winmajor","signature":"undefined4 __get_winmajor(undefined4 *param_1);","status":"decompiled","error":"","elapsed_ms":"3","body_bytes":"60","body_ranges":"2046650e-20466549","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"7611","assembly_entry_line":"1159668","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61893},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":7611,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"pointerEncodingAvailability":{"module":"Game","entry":"20467cf8","body":"20467cf8","bodyRanges":"20467cf8-20467d63","instructionCount":48,"bodyBytes":108,"bodyByteCount":108,"bodyInstructionBytesSha256":"2bb95172deaa8938ccf70800daf9e2f5df280344fd4146477554a70cd194d2a9","entryChain":[],"sourceRefs":{"assembly":"sources/Game/20467cf8.asm.txt","assemblySha256":"1e08d33e79de3c0656e5cdcd1039ee028542fa3f5240c511f6d7e83f53e1b7f2","c":"sources/Game/20467cf8.c.txt","cSha256":"7e86b09ca17f4f4dd67d664b8496e1188334b31304b6ae4e182c04a98794874c","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","originalCatalog":{"address":"20467cf8","name":"FUN_20467cf8","qualified_name":"FUN_20467cf8","signature":"undefined4 FUN_20467cf8(void);","status":"decompiled","error":"","elapsed_ms":"7","body_bytes":"108","body_ranges":"20467cf8-20467d63","is_thunk":"false","source":"DEFAULT","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9261","assembly_entry_line":"1161911","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61938},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9261,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"callerAttach":{"module":"Game","entry":"204677e4","body":"204677e4","bodyRanges":"204677e4-204679bc","instructionCount":151,"bodyBytes":473,"bodyByteCount":473,"bodyInstructionBytesSha256":"9469f04e5cd533e1cf5aaa85553339f7e4eb4eb7f38ec894a6b4d8dd0493be27","entryChain":[],"sourceRefs":{"assembly":"sources/Game/204677e4.asm.txt","assemblySha256":"a4a927878c56cb72459412a96224ed1324905342504443123d43e73ee67864a4","c":"sources/Game/204677e4.c.txt","cSha256":"b1f50faa5c95a6000ab3a5a99dc38a7a446a3e3434e6ffb69172fb04a092a74a","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","originalCatalog":{"address":"204677e4","name":"__CRT_INIT@12","qualified_name":"__CRT_INIT@12","signature":"undefined4 __CRT_INIT@12(undefined4 param_1,int param_2,int param_3);","status":"decompiled","error":"","elapsed_ms":"29","body_bytes":"473","body_ranges":"204677e4-204679bc","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"8924","assembly_entry_line":"1161453","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61929},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":8924,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"mtInit":{"module":"Game","entry":"204681d9","body":"204681d9","bodyRanges":"204681d9-2046835c","instructionCount":109,"bodyBytes":388,"bodyByteCount":388,"bodyInstructionBytesSha256":"3e80229254d0d800267a9cf2495fd9ce8b6c4157620b1553cbc33900a041ba68","entryChain":[],"sourceRefs":{"assembly":"sources/Game/204681d9.asm.txt","assemblySha256":"c5d26169e567d1812eac0aacc35b71b59b9a71422a0528e15bed4eebb8b7f763","c":"sources/Game/204681d9.c.txt","cSha256":"663dc786ad85503da69e1fc2f5f9a2dc1b46a9dc7866b70a5ec6e8557d2998fc","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","originalCatalog":{"address":"204681d9","name":"__mtinit","qualified_name":"__mtinit","signature":"int __cdecl __mtinit(void);","status":"decompiled","error":"","elapsed_ms":"18","body_bytes":"388","body_ranges":"204681d9-2046835c","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9649","assembly_entry_line":"1162360","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61952},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9649,"status":"decompiled"},"listingOrigin":"cataloged-original-C-and-ASM-body","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"sectionFilter":{"module":"Game","entry":"2047424d","body":"2047424d","bodyRanges":"2047424d-20474263","instructionCount":9,"bodyBytes":23,"bodyByteCount":23,"bodyInstructionBytesSha256":"aefc33fcb2b8ed0e3ae7c21dd80fd55872b836b2fb2e192c4241113ce71a300e","sourceRefs":{"assembly":"sources/Game/2047424d.asm.txt","assemblySha256":"d1bad19c2537af9aa5189143f6cc45ce6f9780b9c5d3c2108aa4d717c8c74fdd"},"sourceRefsRoot":"assets/gothic3/game-crt","listingOrigin":"PE-recovered-decode-context","decodedInstructions":[{"va":"2047424d","rva":"47424d","fileOffset":4670029,"bytes":"8b45ec","instruction":"MOV EAX,dword ptr [EBP + -0x14]","assemblyLine":null},{"va":"20474250","rva":"474250","fileOffset":4670032,"bytes":"8b00","instruction":"MOV EAX,dword ptr [EAX]","assemblyLine":null},{"va":"20474252","rva":"474252","fileOffset":4670034,"bytes":"8b00","instruction":"MOV EAX,dword ptr [EAX]","assemblyLine":null},{"va":"20474254","rva":"474254","fileOffset":4670036,"bytes":"8945dc","instruction":"MOV dword ptr [EBP + -0x24],EAX","assemblyLine":null},{"va":"20474257","rva":"474257","fileOffset":4670039,"bytes":"33c9","instruction":"XOR ECX,ECX","assemblyLine":null},{"va":"20474259","rva":"474259","fileOffset":4670041,"bytes":"3d170000c0","instruction":"CMP EAX,0xc0000017","assemblyLine":null},{"va":"2047425e","rva":"47425e","fileOffset":4670046,"bytes":"0f94c1","instruction":"SETZ CL","assemblyLine":null},{"va":"20474261","rva":"474261","fileOffset":4670049,"bytes":"8bc1","instruction":"MOV EAX,ECX","assemblyLine":null},{"va":"20474263","rva":"474263","fileOffset":4670051,"bytes":"c3","instruction":"RET","assemblyLine":null}],"originalInstructions":[],"reconstructedC":null,"originalCatalog":null,"sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":true,"sourceASMGap":true,"originalCatalogGap":true,"contextOnly":true,"executionAdmitted":false,"runtimeCallable":false,"decodeIsInference":true,"recovery":"Original PE scope-table entries in 206e8e70 omitted from catalog and ASM","sourceDependency":{"package":"assets/gothic3/game-crt","method":"initCritSecExceptionFilter"}},"sectionHandler":{"module":"Game","entry":"20474264","body":"20474264","bodyRanges":"20474264-2047427b","instructionCount":6,"bodyBytes":24,"bodyByteCount":24,"bodyInstructionBytesSha256":"cd49c9e1149de8b28d65801e4ffbf3b8d25b270a2795d369cac7cdb66fef838c","sourceRefs":{"assembly":"sources/Game/20474264.asm.txt","assemblySha256":"405007511562c42d810ee2376fb144e0e8c8cce78f8186df43accccff612e657"},"sourceRefsRoot":"assets/gothic3/game-crt","listingOrigin":"PE-recovered-decode-context","decodedInstructions":[{"va":"20474264","rva":"474264","fileOffset":4670052,"bytes":"8b65e8","instruction":"MOV ESP,dword ptr [EBP + -0x18]","assemblyLine":null},{"va":"20474267","rva":"474267","fileOffset":4670055,"bytes":"817ddc170000c0","instruction":"CMP dword ptr [EBP + -0x24],0xc0000017","assemblyLine":null},{"va":"2047426e","rva":"47426e","fileOffset":4670062,"bytes":"7508","instruction":"JNZ 0x20474278","assemblyLine":null},{"va":"20474270","rva":"474270","fileOffset":4670064,"bytes":"6a08","instruction":"PUSH 0x8","assemblyLine":null},{"va":"20474272","rva":"474272","fileOffset":4670066,"bytes":"ff15a07b7d20","instruction":"CALL dword ptr [0x207d7ba0]","assemblyLine":null},{"va":"20474278","rva":"474278","fileOffset":4670072,"bytes":"8365e000","instruction":"AND dword ptr [EBP + -0x20],0x0","assemblyLine":null}],"originalInstructions":[],"reconstructedC":null,"originalCatalog":null,"sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":true,"sourceASMGap":true,"originalCatalogGap":true,"contextOnly":true,"executionAdmitted":false,"runtimeCallable":false,"decodeIsInference":true,"recovery":"Original PE scope-table entries in 206e8e70 omitted from catalog and ASM","sourceDependency":{"package":"assets/gothic3/game-crt","method":"initCritSecExceptionHandler"}},"tlsGetterDispatcher":{"module":"Game","entry":"20467e52","body":"20467e52","bodyRanges":"20467e52-20467e66","instructionCount":5,"bodyBytes":21,"bodyByteCount":21,"bodyInstructionBytesSha256":"f346d43211505defafd45cdb6e1c20fa0db7aa36cd0b3dfb39b1e4f0863a7ae4","sourceRefs":{"assembly":"sources/Game/20467e52.asm.txt","assemblySha256":"1d4b3d5a4d568ccfe2df25757f53c9edef3b3adc8304cada8b7d5c90e54032bd"},"sourceRefsRoot":"assets/gothic3/game-crt","listingOrigin":"PE-recovered-decode-context","decodedInstructions":[{"va":"20467e52","rva":"467e52","fileOffset":4619858,"bytes":"ff742404","instruction":"PUSH dword ptr [ESP + 0x4]","assemblyLine":null},{"va":"20467e56","rva":"467e56","fileOffset":4619862,"bytes":"ff3520237b20","instruction":"PUSH dword ptr [0x207b2320]","assemblyLine":null},{"va":"20467e5c","rva":"467e5c","fileOffset":4619868,"bytes":"ff158c7b7d20","instruction":"CALL dword ptr [0x207d7b8c]","assemblyLine":null},{"va":"20467e62","rva":"467e62","fileOffset":4619874,"bytes":"ffd0","instruction":"CALL EAX","assemblyLine":null},{"va":"20467e64","rva":"467e64","fileOffset":4619876,"bytes":"c20400","instruction":"RET 0x4","assemblyLine":null}],"originalInstructions":[],"reconstructedC":null,"originalCatalog":null,"sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":true,"sourceASMGap":true,"originalCatalogGap":true,"contextOnly":true,"executionAdmitted":false,"runtimeCallable":false,"decodeIsInference":true,"recovery":"Explicit original PE compiler thunk; no fabricated CSV row","sourceDependency":{"package":"assets/gothic3/game-crt","method":"tlsGetterDispatcher"}}};
freeze(sourceContextPins);
const originalMethodPins: Readonly<Record<string, unknown>> = {"ioInit":{"label":"ioInit","entryVA":"0x204742ff","bodyVA":"0x204742ff","entryChain":[],"bodyRanges":"204742ff-20474527;20474536-2047453e","reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00125.c","sha256":"1543a283a5ce7bbd1473ecd2d442590fd9e66f9369d8f3a5b4bb9b49b919ca51","line":6253,"status":"decompiled"},"instructionCount":186,"bodyByteCount":562,"bodyInstructionBytesSha256":"eb6d483cbc0cdb9286f65cbe9fa791601334ad2806380b84240c29b504883fcf","originalCatalog":{"address":"204742ff","name":"__ioinit","qualified_name":"__ioinit","signature":"int __cdecl __ioinit(void);","status":"decompiled","error":"","elapsed_ms":"32","body_bytes":"562","body_ranges":"204742ff-20474527;20474536-2047453e","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"6253","assembly_entry_line":"1173528","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62131},"sourceRefs":{"assembly":"sources/Game/204742ff.asm.txt","assemblySha256":"49198ad6297171771d955deaf1e62c364743274c9c957ce94717fedb572c4de1","c":"sources/Game/204742ff.c.txt","cSha256":"2cc60dfa073fbe1a9834cf43e7dc498b5cab040c2af14c4edf448efcb677fdff","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-attach-continuation","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"sehProlog4":{"label":"sehProlog4","entryVA":"0x20468570","bodyVA":"0x20468570","entryChain":[],"bodyRanges":"20468570-204685b4","reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9915,"status":"decompiled"},"instructionCount":21,"bodyByteCount":69,"bodyInstructionBytesSha256":"0a3e894695f99ac271fa039cc7153c7cdd9e3a92758aa39483cadf68e7e029f1","originalCatalog":{"address":"20468570","name":"__SEH_prolog4","qualified_name":"__SEH_prolog4","signature":"void __SEH_prolog4(undefined4 param_1,int param_2);","status":"decompiled","error":"","elapsed_ms":"4","body_bytes":"69","body_ranges":"20468570-204685b4","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9915","assembly_entry_line":"1162673","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61960},"sourceRefs":{"assembly":"sources/Game/20468570.asm.txt","assemblySha256":"08f4b98324ef7fbbf12b6d6fc120721226addca354bf35dbaea7aa7b7392c2cc","c":"sources/Game/20468570.c.txt","cSha256":"8b38188825b6cde0ae14f26555b28d5ef27afa2310bcf2ceaf871eda29cad7ac","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-attach-continuation","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"sehEpilog4":{"label":"sehEpilog4","entryVA":"0x204685b5","bodyVA":"0x204685b5","entryChain":[],"bodyRanges":"204685b5-204685c8","reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9945,"status":"decompiled"},"instructionCount":11,"bodyByteCount":20,"bodyInstructionBytesSha256":"39142b8d79823b8b3c0dd534ee99caf6c8cce4347b7608cfc004a14c873f7411","originalCatalog":{"address":"204685b5","name":"__SEH_epilog4","qualified_name":"__SEH_epilog4","signature":"void __SEH_epilog4(void);","status":"decompiled","error":"","elapsed_ms":"1","body_bytes":"20","body_ranges":"204685b5-204685c8","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9945","assembly_entry_line":"1162695","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61961},"sourceRefs":{"assembly":"sources/Game/204685b5.asm.txt","assemblySha256":"2d541c84a4793f966ca8426769be866365a9a3179c5af116853a9054de5f9bec","c":"sources/Game/204685b5.c.txt","cSha256":"5596cfb72be1be0a5999197f4480e4447a566ec8e8a8f015f2dc0dd91fba124e","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-attach-continuation","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"sectionHelper":{"label":"sectionHelper","entryVA":"0x204741c7","bodyVA":"0x204741c7","entryChain":[],"bodyRanges":"204741c7-20474201;20474205-2047424c;2047427c-2047428b","reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00125.c","sha256":"1543a283a5ce7bbd1473ecd2d442590fd9e66f9369d8f3a5b4bb9b49b919ca51","line":6172,"status":"decompiled"},"instructionCount":50,"bodyByteCount":147,"bodyInstructionBytesSha256":"e4666cc20a730154db1404bbc0399373039275646b82e22fa0378d722eab79f9","originalCatalog":{"address":"204741c7","name":"___crtInitCritSecAndSpinCount","qualified_name":"___crtInitCritSecAndSpinCount","signature":"int ___crtInitCritSecAndSpinCount(undefined4 param_1,undefined4 param_2);","status":"decompiled","error":"","elapsed_ms":"14","body_bytes":"147","body_ranges":"204741c7-20474201;20474205-2047424c;2047427c-2047428b","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"6172","assembly_entry_line":"1173451","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62128},"sourceRefs":{"assembly":"sources/Game/204741c7.asm.txt","assemblySha256":"6734485aee03347a8a01abd2e3c67d11476cd8a8030af962277c128be5cf24d9","c":"sources/Game/204741c7.c.txt","cSha256":"ba58746271a6fe61aecbf69abd12eebc9b69ff3fd7b92839cc573398b6c5b470","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"decodePointer":{"label":"decodePointer","entryVA":"0x20467ddb","bodyVA":"0x20467ddb","entryChain":[],"bodyRanges":"20467ddb-20467e48","reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9349,"status":"decompiled"},"instructionCount":36,"bodyByteCount":110,"bodyInstructionBytesSha256":"cb3a88e5fa9e53d81b30478aa8d45b6777c4d25366401ea4d3cf3e85a9678ab0","originalCatalog":{"address":"20467ddb","name":"FUN_20467ddb","qualified_name":"FUN_20467ddb","signature":"int FUN_20467ddb(int param_1);","status":"decompiled","error":"","elapsed_ms":"9","body_bytes":"110","body_ranges":"20467ddb-20467e48","is_thunk":"false","source":"DEFAULT","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9349","assembly_entry_line":"1162010","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61941},"sourceRefs":{"assembly":"sources/Game/20467ddb.asm.txt","assemblySha256":"e05f3a544429f8b93ee459b497b9bc8db298565c4886e9ff1282bec36ae5a1d3","c":"sources/Game/20467ddb.c.txt","cSha256":"20437957658af00c8b2661951485e6dc1ebe918f77ee0a2dd206801c14c3ac0d","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"sectionFallback":{"label":"sectionFallback","entryVA":"0x204741b7","bodyVA":"0x204741b7","entryChain":[],"bodyRanges":"204741b7-204741c6","reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00125.c","sha256":"1543a283a5ce7bbd1473ecd2d442590fd9e66f9369d8f3a5b4bb9b49b919ca51","line":6157,"status":"decompiled"},"instructionCount":5,"bodyByteCount":16,"bodyInstructionBytesSha256":"6a9d71899ceb3082f087906258408e630305ba10629333b4d896cc95e2582953","originalCatalog":{"address":"204741b7","name":"___crtInitCritSecNoSpinCount@8","qualified_name":"___crtInitCritSecNoSpinCount@8","signature":"undefined4 ___crtInitCritSecNoSpinCount@8(LPCRITICAL_SECTION param_1);","status":"decompiled","error":"","elapsed_ms":"2","body_bytes":"16","body_ranges":"204741b7-204741c6","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"6157","assembly_entry_line":"1173445","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62127},"sourceRefs":{"assembly":"sources/Game/204741b7.asm.txt","assemblySha256":"4ffb5409756dc06ee6a81ba028cc6958981b82712077fc3a5c6fb4a96f3b96ce","c":"sources/Game/204741b7.c.txt","cSha256":"86a8687f3418a0fb82166bbb6737922d12796a1646524011054245149327e378","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"encodePointer":{"label":"encodePointer","entryVA":"0x20467d64","bodyVA":"0x20467d64","entryChain":[],"bodyRanges":"20467d64-20467dd1","reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9296,"status":"decompiled"},"instructionCount":36,"bodyByteCount":110,"bodyInstructionBytesSha256":"7a6aca648a5272b8b66761e76fa72b6bbeebdfd4b789904b3cc43f084e01bd63","originalCatalog":{"address":"20467d64","name":"FUN_20467d64","qualified_name":"FUN_20467d64","signature":"int FUN_20467d64(int param_1);","status":"decompiled","error":"","elapsed_ms":"10","body_bytes":"110","body_ranges":"20467d64-20467dd1","is_thunk":"false","source":"DEFAULT","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9296","assembly_entry_line":"1161965","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61939},"sourceRefs":{"assembly":"sources/Game/20467d64.asm.txt","assemblySha256":"3ab56b2e3ea9eb37a3b5a6356e80707ab1d1404dada0ca259fc40dc780f27ede","c":"sources/Game/20467d64.c.txt","cSha256":"58b8657092c320f9fb9ada4d45b55525faa358d1c34ac077471918c552dab6ea","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"getOsPlatform":{"label":"getOsPlatform","entryVA":"0x2046645f","bodyVA":"0x2046645f","entryChain":[],"bodyRanges":"2046645f-20466495","reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":7588,"status":"decompiled"},"instructionCount":25,"bodyByteCount":55,"bodyInstructionBytesSha256":"8238dbabcb9734239b406d95487b627a7bc5b94028b162086f03ba7b23cef692","originalCatalog":{"address":"2046645f","name":"__get_osplatform","qualified_name":"__get_osplatform","signature":"undefined4 __get_osplatform(int *param_1);","status":"decompiled","error":"","elapsed_ms":"2","body_bytes":"55","body_ranges":"2046645f-20466495","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"7588","assembly_entry_line":"1159640","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61892},"sourceRefs":{"assembly":"sources/Game/2046645f.asm.txt","assemblySha256":"f32a5fa770e0f1e197573f1fa90735628f3d9bf3c3e127094807e17470f12860","c":"sources/Game/2046645f.c.txt","cSha256":"388594fd095d5fda732964c5bc17a4bada960522bc284e79f9e660f588b771be","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"getWinMajor":{"label":"getWinMajor","entryVA":"0x2046650e","bodyVA":"0x2046650e","entryChain":[],"bodyRanges":"2046650e-20466549","reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":7611,"status":"decompiled"},"instructionCount":25,"bodyByteCount":60,"bodyInstructionBytesSha256":"19e3d59dee8ead8449a03d4bf3d56b285c319cb145f588b18e9f01750b216777","originalCatalog":{"address":"2046650e","name":"__get_winmajor","qualified_name":"__get_winmajor","signature":"undefined4 __get_winmajor(undefined4 *param_1);","status":"decompiled","error":"","elapsed_ms":"3","body_bytes":"60","body_ranges":"2046650e-20466549","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"7611","assembly_entry_line":"1159668","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61893},"sourceRefs":{"assembly":"sources/Game/2046650e.asm.txt","assemblySha256":"a2bec0c939f2a7d78c81e5e3c8f9a0dca28be814b3b0916d57b91b71afa1922c","c":"sources/Game/2046650e.c.txt","cSha256":"37e09309bcf0677cdea2879a444b06b2a08bf4ce88452c61548e5b3b2c39af60","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"pointerEncodingAvailability":{"label":"pointerEncodingAvailability","entryVA":"0x20467cf8","bodyVA":"0x20467cf8","entryChain":[],"bodyRanges":"20467cf8-20467d63","reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9261,"status":"decompiled"},"instructionCount":48,"bodyByteCount":108,"bodyInstructionBytesSha256":"2bb95172deaa8938ccf70800daf9e2f5df280344fd4146477554a70cd194d2a9","originalCatalog":{"address":"20467cf8","name":"FUN_20467cf8","qualified_name":"FUN_20467cf8","signature":"undefined4 FUN_20467cf8(void);","status":"decompiled","error":"","elapsed_ms":"7","body_bytes":"108","body_ranges":"20467cf8-20467d63","is_thunk":"false","source":"DEFAULT","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9261","assembly_entry_line":"1161911","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61938},"sourceRefs":{"assembly":"sources/Game/20467cf8.asm.txt","assemblySha256":"1e08d33e79de3c0656e5cdcd1039ee028542fa3f5240c511f6d7e83f53e1b7f2","c":"sources/Game/20467cf8.c.txt","cSha256":"7e86b09ca17f4f4dd67d664b8496e1188334b31304b6ae4e182c04a98794874c","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"callerAttach":{"label":"callerAttach","entryVA":"0x204677e4","bodyVA":"0x204677e4","entryChain":[],"bodyRanges":"204677e4-204679bc","reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":8924,"status":"decompiled"},"instructionCount":151,"bodyByteCount":473,"bodyInstructionBytesSha256":"9469f04e5cd533e1cf5aaa85553339f7e4eb4eb7f38ec894a6b4d8dd0493be27","originalCatalog":{"address":"204677e4","name":"__CRT_INIT@12","qualified_name":"__CRT_INIT@12","signature":"undefined4 __CRT_INIT@12(undefined4 param_1,int param_2,int param_3);","status":"decompiled","error":"","elapsed_ms":"29","body_bytes":"473","body_ranges":"204677e4-204679bc","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"8924","assembly_entry_line":"1161453","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61929},"sourceRefs":{"assembly":"sources/Game/204677e4.asm.txt","assemblySha256":"a4a927878c56cb72459412a96224ed1324905342504443123d43e73ee67864a4","c":"sources/Game/204677e4.c.txt","cSha256":"b1f50faa5c95a6000ab3a5a99dc38a7a446a3e3434e6ffb69172fb04a092a74a","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false},"mtInit":{"label":"mtInit","entryVA":"0x204681d9","bodyVA":"0x204681d9","entryChain":[],"bodyRanges":"204681d9-2046835c","reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9649,"status":"decompiled"},"instructionCount":109,"bodyByteCount":388,"bodyInstructionBytesSha256":"3e80229254d0d800267a9cf2495fd9ce8b6c4157620b1553cbc33900a041ba68","originalCatalog":{"address":"204681d9","name":"__mtinit","qualified_name":"__mtinit","signature":"int __cdecl __mtinit(void);","status":"decompiled","error":"","elapsed_ms":"18","body_bytes":"388","body_ranges":"204681d9-2046835c","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9649","assembly_entry_line":"1162360","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61952},"sourceRefs":{"assembly":"sources/Game/204681d9.asm.txt","assemblySha256":"c5d26169e567d1812eac0aacc35b71b59b9a71422a0528e15bed4eebb8b7f763","c":"sources/Game/204681d9.c.txt","cSha256":"663dc786ad85503da69e1fc2f5f9a2dc1b46a9dc7866b70a5ec6e8557d2998fc","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false,"executionAdmitted":false}};
freeze(originalMethodPins);
const auditHeaderPin: Readonly<Record<string, unknown>> = {"module":"Game.dll","inputSha256":"b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f","functionsCsvSha256":"7683e99c3c22688b26c77eafc830f43abab471b9e9d3ca241e3157007c714018","assemblySha256":"fd23430904ab84b03e395bc4a705f5a475cc5816094603350a68e1bc2798f4dc","imports":[{"iatVA":"0x207d7b5c","module":"KERNEL32.dll","name":"GetModuleHandleA","ordinal":null},{"iatVA":"0x207d7b78","module":"KERNEL32.dll","name":"GetCurrentThreadId","ordinal":null},{"iatVA":"0x207d7b7c","module":"KERNEL32.dll","name":"HeapFree","ordinal":null},{"iatVA":"0x207d7b80","module":"KERNEL32.dll","name":"GetVersionExA","ordinal":null},{"iatVA":"0x207d7b84","module":"KERNEL32.dll","name":"HeapAlloc","ordinal":null},{"iatVA":"0x207d7b88","module":"KERNEL32.dll","name":"GetProcessHeap","ordinal":null},{"iatVA":"0x207d7b8c","module":"KERNEL32.dll","name":"TlsGetValue","ordinal":null},{"iatVA":"0x207d7b90","module":"KERNEL32.dll","name":"TlsAlloc","ordinal":null},{"iatVA":"0x207d7b94","module":"KERNEL32.dll","name":"TlsSetValue","ordinal":null},{"iatVA":"0x207d7b98","module":"KERNEL32.dll","name":"TlsFree","ordinal":null},{"iatVA":"0x207d7bbc","module":"KERNEL32.dll","name":"GetStdHandle","ordinal":null},{"iatVA":"0x207d7c10","module":"KERNEL32.dll","name":"InitializeCriticalSection","ordinal":null},{"iatVA":"0x207d7c14","module":"KERNEL32.dll","name":"SetHandleCount","ordinal":null},{"iatVA":"0x207d7c18","module":"KERNEL32.dll","name":"GetFileType","ordinal":null},{"iatVA":"0x207d7c1c","module":"KERNEL32.dll","name":"GetStartupInfoA","ordinal":null},{"iatVA":"0x207d7c94","module":"KERNEL32.dll","name":"GetProcAddress","ordinal":null},{"iatVA":"0x207d7ca0","module":"KERNEL32.dll","name":"GetCommandLineA","ordinal":null}],"verifiedAgainstOriginalPE":true};
freeze(auditHeaderPin);
const originalInstructionPins: readonly (readonly [string, string, string, number, number])[] = [
  ["2046645f","8b4c2404","MOV ECX,dword ptr [ESP + 0x4]",1159640,4613215],
  ["20466463","56","PUSH ESI",1159641,4613219],
  ["20466464","33f6","XOR ESI,ESI",1159642,4613220],
  ["20466466","3bce","CMP ECX,ESI",1159643,4613222],
  ["20466468","751d","JNZ 0x20466487",1159644,4613224],
  ["2046646a","e8133e0000","CALL 0x2046a282",1159646,4613226],
  ["2046646f","56","PUSH ESI",1159647,4613231],
  ["20466470","56","PUSH ESI",1159648,4613232],
  ["20466471","56","PUSH ESI",1159649,4613233],
  ["20466472","56","PUSH ESI",1159650,4613234],
  ["20466473","56","PUSH ESI",1159651,4613235],
  ["20466474","c70016000000","MOV dword ptr [EAX],0x16",1159652,4613236],
  ["2046647a","e88b3d0000","CALL 0x2046a20a",1159653,4613242],
  ["2046647f","83c414","ADD ESP,0x14",1159654,4613247],
  ["20466482","6a16","PUSH 0x16",1159655,4613250],
  ["20466484","58","POP EAX",1159656,4613252],
  ["20466485","5e","POP ESI",1159657,4613253],
  ["20466486","c3","RET",1159658,4613254],
  ["20466487","a12c0a7d20","MOV EAX,[0x207d0a2c]",1159660,4613255],
  ["2046648c","3bc6","CMP EAX,ESI",1159661,4613260],
  ["2046648e","74da","JZ 0x2046646a",1159662,4613262],
  ["20466490","8901","MOV dword ptr [ECX],EAX",1159663,4613264],
  ["20466492","33c0","XOR EAX,EAX",1159664,4613266],
  ["20466494","5e","POP ESI",1159665,4613268],
  ["20466495","c3","RET",1159666,4613269],
  ["2046650e","8b442404","MOV EAX,dword ptr [ESP + 0x4]",1159668,4613390],
  ["20466512","56","PUSH ESI",1159669,4613394],
  ["20466513","33f6","XOR ESI,ESI",1159670,4613395],
  ["20466515","3bc6","CMP EAX,ESI",1159671,4613397],
  ["20466517","751d","JNZ 0x20466536",1159672,4613399],
  ["20466519","e8643d0000","CALL 0x2046a282",1159674,4613401],
  ["2046651e","56","PUSH ESI",1159675,4613406],
  ["2046651f","56","PUSH ESI",1159676,4613407],
  ["20466520","56","PUSH ESI",1159677,4613408],
  ["20466521","56","PUSH ESI",1159678,4613409],
  ["20466522","56","PUSH ESI",1159679,4613410],
  ["20466523","c70016000000","MOV dword ptr [EAX],0x16",1159680,4613411],
  ["20466529","e8dc3c0000","CALL 0x2046a20a",1159681,4613417],
  ["2046652e","83c414","ADD ESP,0x14",1159682,4613422],
  ["20466531","6a16","PUSH 0x16",1159683,4613425],
  ["20466533","58","POP EAX",1159684,4613427],
  ["20466534","5e","POP ESI",1159685,4613428],
  ["20466535","c3","RET",1159686,4613429],
  ["20466536","39352c0a7d20","CMP dword ptr [0x207d0a2c],ESI",1159688,4613430],
  ["2046653c","74db","JZ 0x20466519",1159689,4613436],
  ["2046653e","8b0d380a7d20","MOV ECX,dword ptr [0x207d0a38]",1159690,4613438],
  ["20466544","8908","MOV dword ptr [EAX],ECX",1159691,4613444],
  ["20466546","33c0","XOR EAX,EAX",1159692,4613446],
  ["20466548","5e","POP ESI",1159693,4613448],
  ["20466549","c3","RET",1159694,4613449],
  ["204677e4","55","PUSH EBP",1161453,4618212],
  ["204677e5","8bec","MOV EBP,ESP",1161454,4618213],
  ["204677e7","51","PUSH ECX",1161455,4618215],
  ["204677e8","8b450c","MOV EAX,dword ptr [EBP + 0xc]",1161456,4618216],
  ["204677eb","83f801","CMP EAX,0x1",1161457,4618219],
  ["204677ee","53","PUSH EBX",1161458,4618222],
  ["204677ef","56","PUSH ESI",1161459,4618223],
  ["204677f0","57","PUSH EDI",1161460,4618224],
  ["204677f1","0f8517010000","JNZ 0x2046790e",1161461,4618225],
  ["204677f7","8b1d887b7d20","MOV EBX,dword ptr [0x207d7b88]",1161462,4618231],
  ["204677fd","bf94000000","MOV EDI,0x94",1161463,4618237],
  ["20467802","57","PUSH EDI",1161464,4618242],
  ["20467803","6a00","PUSH 0x0",1161465,4618243],
  ["20467805","ffd3","CALL EBX",1161466,4618245],
  ["20467807","50","PUSH EAX",1161467,4618247],
  ["20467808","ff15847b7d20","CALL dword ptr [0x207d7b84]",1161468,4618248],
  ["2046780e","8bf0","MOV ESI,EAX",1161469,4618254],
  ["20467810","85f6","TEST ESI,ESI",1161470,4618256],
  ["20467812","7507","JNZ 0x2046781b",1161471,4618258],
  ["20467814","33c0","XOR EAX,EAX",1161473,4618260],
  ["20467816","e99b010000","JMP 0x204679b6",1161474,4618262],
  ["2046781b","56","PUSH ESI",1161476,4618267],
  ["2046781c","893e","MOV dword ptr [ESI],EDI",1161477,4618268],
  ["2046781e","ff15807b7d20","CALL dword ptr [0x207d7b80]",1161478,4618270],
  ["20467824","85c0","TEST EAX,EAX",1161479,4618276],
  ["20467826","56","PUSH ESI",1161480,4618278],
  ["20467827","6a00","PUSH 0x0",1161481,4618279],
  ["20467829","750b","JNZ 0x20467836",1161482,4618281],
  ["2046782b","ffd3","CALL EBX",1161483,4618283],
  ["2046782d","50","PUSH EAX",1161484,4618285],
  ["2046782e","ff157c7b7d20","CALL dword ptr [0x207d7b7c]",1161485,4618286],
  ["20467834","ebde","JMP 0x20467814",1161486,4618292],
  ["20467836","8b4610","MOV EAX,dword ptr [ESI + 0x10]",1161488,4618294],
  ["20467839","8b7e0c","MOV EDI,dword ptr [ESI + 0xc]",1161489,4618297],
  ["2046783c","89450c","MOV dword ptr [EBP + 0xc],EAX",1161490,4618300],
  ["2046783f","8b4604","MOV EAX,dword ptr [ESI + 0x4]",1161491,4618303],
  ["20467842","894510","MOV dword ptr [EBP + 0x10],EAX",1161492,4618306],
  ["20467845","8b4608","MOV EAX,dword ptr [ESI + 0x8]",1161493,4618309],
  ["20467848","8945fc","MOV dword ptr [EBP + -0x4],EAX",1161494,4618312],
  ["2046784b","81e7ff7f0000","AND EDI,0x7fff",1161495,4618315],
  ["20467851","ffd3","CALL EBX",1161496,4618321],
  ["20467853","50","PUSH EAX",1161497,4618323],
  ["20467854","ff157c7b7d20","CALL dword ptr [0x207d7b7c]",1161498,4618324],
  ["2046785a","8b450c","MOV EAX,dword ptr [EBP + 0xc]",1161499,4618330],
  ["2046785d","83f802","CMP EAX,0x2",1161500,4618333],
  ["20467860","7406","JZ 0x20467868",1161501,4618336],
  ["20467862","81cf00800000","OR EDI,0x8000",1161502,4618338],
  ["20467868","8b4dfc","MOV ECX,dword ptr [EBP + -0x4]",1161504,4618344],
  ["2046786b","a32c0a7d20","MOV [0x207d0a2c],EAX",1161505,4618347],
  ["20467870","8b4510","MOV EAX,dword ptr [EBP + 0x10]",1161506,4618352],
  ["20467873","8bd0","MOV EDX,EAX",1161507,4618355],
  ["20467875","c1e208","SHL EDX,0x8",1161508,4618357],
  ["20467878","03d1","ADD EDX,ECX",1161509,4618360],
  ["2046787a","6a01","PUSH 0x1",1161510,4618362],
  ["2046787c","8915340a7d20","MOV dword ptr [0x207d0a34],EDX",1161511,4618364],
  ["20467882","a3380a7d20","MOV [0x207d0a38],EAX",1161512,4618370],
  ["20467887","890d3c0a7d20","MOV dword ptr [0x207d0a3c],ECX",1161513,4618375],
  ["2046788d","893d300a7d20","MOV dword ptr [0x207d0a30],EDI",1161514,4618381],
  ["20467893","e82df10000","CALL 0x204769c5",1161515,4618387],
  ["20467898","85c0","TEST EAX,EAX",1161516,4618392],
  ["2046789a","59","POP ECX",1161517,4618394],
  ["2046789b","0f8473ffffff","JZ 0x20467814",1161518,4618395],
  ["204678a1","e833090000","CALL 0x204681d9",1161519,4618401],
  ["204678a6","85c0","TEST EAX,EAX",1161520,4618406],
  ["204678a8","750a","JNZ 0x204678b4",1161521,4618408],
  ["204678aa","e870f10000","CALL 0x20476a1f",1161523,4618410],
  ["204678af","e960ffffff","JMP 0x20467814",1161524,4618415],
  ["204678b4","e824bf0000","CALL 0x204737dd",1161526,4618420],
  ["204678b9","ff15a07c7d20","CALL dword ptr [0x207d7ca0]",1161527,4618425],
  ["204678bf","a3602b7d20","MOV [0x207d2b60],EAX",1161528,4618431],
  ["204678c4","e86cef0000","CALL 0x20476835",1161529,4618436],
  ["204678c9","a3740a7d20","MOV [0x207d0a74],EAX",1161530,4618441],
  ["204678ce","e82cca0000","CALL 0x204742ff",1161531,4618446],
  ["204678d3","85c0","TEST EAX,EAX",1161532,4618451],
  ["204678d5","7d07","JGE 0x204678de",1161533,4618453],
  ["204678d7","e8dc050000","CALL 0x20467eb8",1161535,4618455],
  ["204678dc","ebcc","JMP 0x204678aa",1161536,4618460],
  ["204678de","e899ee0000","CALL 0x2047677c",1161538,4618462],
  ["204678e3","85c0","TEST EAX,EAX",1161539,4618467],
  ["204678e5","7c20","JL 0x20467907",1161540,4618469],
  ["204678e7","e813ec0000","CALL 0x204764ff",1161541,4618471],
  ["204678ec","85c0","TEST EAX,EAX",1161542,4618476],
  ["204678ee","7c17","JL 0x20467907",1161543,4618478],
  ["204678f0","6a00","PUSH 0x0",1161544,4618480],
  ["204678f2","e8fdecffff","CALL 0x204665f4",1161545,4618482],
  ["204678f7","85c0","TEST EAX,EAX",1161546,4618487],
  ["204678f9","59","POP ECX",1161547,4618489],
  ["204678fa","750b","JNZ 0x20467907",1161548,4618490],
  ["204678fc","ff05700a7d20","INC dword ptr [0x207d0a70]",1161549,4618492],
  ["20467902","e9ac000000","JMP 0x204679b3",1161550,4618498],
  ["20467907","e833cc0000","CALL 0x2047453f",1161552,4618503],
  ["2046790c","ebc9","JMP 0x204678d7",1161553,4618508],
  ["2046790e","33ff","XOR EDI,EDI",1161555,4618510],
  ["20467910","3bc7","CMP EAX,EDI",1161556,4618512],
  ["20467912","7535","JNZ 0x20467949",1161557,4618514],
  ["20467914","393d700a7d20","CMP dword ptr [0x207d0a70],EDI",1161558,4618516],
  ["2046791a","0f8ef4feffff","JLE 0x20467814",1161559,4618522],
  ["20467920","ff0d700a7d20","DEC dword ptr [0x207d0a70]",1161560,4618528],
  ["20467926","393d680a7d20","CMP dword ptr [0x207d0a68],EDI",1161561,4618534],
  ["2046792c","7505","JNZ 0x20467933",1161562,4618540],
  ["2046792e","e857eeffff","CALL 0x2046678a",1161563,4618542],
  ["20467933","397d10","CMP dword ptr [EBP + 0x10],EDI",1161565,4618547],
  ["20467936","757b","JNZ 0x204679b3",1161566,4618550],
  ["20467938","e802cc0000","CALL 0x2047453f",1161567,4618552],
  ["2046793d","e876050000","CALL 0x20467eb8",1161568,4618557],
  ["20467942","e8d8f00000","CALL 0x20476a1f",1161569,4618562],
  ["20467947","eb6a","JMP 0x204679b3",1161570,4618567],
  ["20467949","83f802","CMP EAX,0x2",1161572,4618569],
  ["2046794c","7559","JNZ 0x204679a7",1161573,4618572],
  ["2046794e","e81a050000","CALL 0x20467e6d",1161574,4618574],
  ["20467953","6814020000","PUSH 0x214",1161575,4618579],
  ["20467958","6a01","PUSH 0x1",1161576,4618584],
  ["2046795a","e86f0a0000","CALL 0x204683ce",1161577,4618586],
  ["2046795f","8bf0","MOV ESI,EAX",1161578,4618591],
  ["20467961","3bf7","CMP ESI,EDI",1161579,4618593],
  ["20467963","59","POP ECX",1161580,4618595],
  ["20467964","59","POP ECX",1161581,4618596],
  ["20467965","0f84a9feffff","JZ 0x20467814",1161582,4618597],
  ["2046796b","56","PUSH ESI",1161583,4618603],
  ["2046796c","ff351c237b20","PUSH dword ptr [0x207b231c]",1161584,4618604],
  ["20467972","ff358c0a7d20","PUSH dword ptr [0x207d0a8c]",1161585,4618610],
  ["20467978","e85e040000","CALL 0x20467ddb",1161586,4618616],
  ["2046797d","59","POP ECX",1161587,4618621],
  ["2046797e","ffd0","CALL EAX",1161588,4618622],
  ["20467980","85c0","TEST EAX,EAX",1161589,4618624],
  ["20467982","7417","JZ 0x2046799b",1161590,4618626],
  ["20467984","57","PUSH EDI",1161591,4618628],
  ["20467985","56","PUSH ESI",1161592,4618629],
  ["20467986","e86a050000","CALL 0x20467ef5",1161593,4618630],
  ["2046798b","59","POP ECX",1161594,4618635],
  ["2046798c","59","POP ECX",1161595,4618636],
  ["2046798d","ff15787b7d20","CALL dword ptr [0x207d7b78]",1161596,4618637],
  ["20467993","834e04ff","OR dword ptr [ESI + 0x4],0xffffffff",1161597,4618643],
  ["20467997","8906","MOV dword ptr [ESI],EAX",1161598,4618647],
  ["20467999","eb18","JMP 0x204679b3",1161599,4618649],
  ["2046799b","56","PUSH ESI",1161601,4618651],
  ["2046799c","e8c9020000","CALL 0x20467c6a",1161602,4618652],
  ["204679a1","59","POP ECX",1161603,4618657],
  ["204679a2","e96dfeffff","JMP 0x20467814",1161604,4618658],
  ["204679a7","83f803","CMP EAX,0x3",1161606,4618663],
  ["204679aa","7507","JNZ 0x204679b3",1161607,4618666],
  ["204679ac","57","PUSH EDI",1161608,4618668],
  ["204679ad","e8b2070000","CALL 0x20468164",1161609,4618669],
  ["204679b2","59","POP ECX",1161610,4618674],
  ["204679b3","33c0","XOR EAX,EAX",1161612,4618675],
  ["204679b5","40","INC EAX",1161613,4618677],
  ["204679b6","5f","POP EDI",1161615,4618678],
  ["204679b7","5e","POP ESI",1161616,4618679],
  ["204679b8","5b","POP EBX",1161617,4618680],
  ["204679b9","c9","LEAVE",1161618,4618681],
  ["204679ba","c20c00","RET 0xc",1161619,4618682],
  ["20467cf8","55","PUSH EBP",1161911,4619512],
  ["20467cf9","8bec","MOV EBP,ESP",1161912,4619513],
  ["20467cfb","51","PUSH ECX",1161913,4619515],
  ["20467cfc","51","PUSH ECX",1161914,4619516],
  ["20467cfd","53","PUSH EBX",1161915,4619517],
  ["20467cfe","56","PUSH ESI",1161916,4619518],
  ["20467cff","33f6","XOR ESI,ESI",1161917,4619519],
  ["20467d01","8d45fc","LEA EAX,[EBP + -0x4]",1161918,4619521],
  ["20467d04","46","INC ESI",1161919,4619524],
  ["20467d05","33db","XOR EBX,EBX",1161920,4619525],
  ["20467d07","50","PUSH EAX",1161921,4619527],
  ["20467d08","8975f8","MOV dword ptr [EBP + -0x8],ESI",1161922,4619528],
  ["20467d0b","895dfc","MOV dword ptr [EBP + -0x4],EBX",1161923,4619531],
  ["20467d0e","e8fbe7ffff","CALL 0x2046650e",1161924,4619534],
  ["20467d13","837dfc05","CMP dword ptr [EBP + -0x4],0x5",1161925,4619539],
  ["20467d17","59","POP ECX",1161926,4619543],
  ["20467d18","7e04","JLE 0x20467d1e",1161927,4619544],
  ["20467d1a","8bc6","MOV EAX,ESI",1161928,4619546],
  ["20467d1c","eb42","JMP 0x20467d60",1161929,4619548],
  ["20467d1e","57","PUSH EDI",1161931,4619550],
  ["20467d1f","53","PUSH EBX",1161932,4619551],
  ["20467d20","ff155c7b7d20","CALL dword ptr [0x207d7b5c]",1161933,4619552],
  ["20467d26","8b703c","MOV ESI,dword ptr [EAX + 0x3c]",1161934,4619558],
  ["20467d29","03f0","ADD ESI,EAX",1161935,4619561],
  ["20467d2b","66395e06","CMP word ptr [ESI + 0x6],BX",1161936,4619563],
  ["20467d2f","0fb74614","MOVZX EAX,word ptr [ESI + 0x14]",1161937,4619567],
  ["20467d33","8d7c3018","LEA EDI,[EAX + ESI*0x1 + 0x18]",1161938,4619571],
  ["20467d37","7623","JBE 0x20467d5c",1161939,4619575],
  ["20467d39","57","PUSH EDI",1161941,4619577],
  ["20467d3a","6888646b20","PUSH 0x206b6488",1161942,4619578],
  ["20467d3f","e89c0d0000","CALL 0x20468ae0",1161943,4619583],
  ["20467d44","85c0","TEST EAX,EAX",1161944,4619588],
  ["20467d46","59","POP ECX",1161945,4619590],
  ["20467d47","59","POP ECX",1161946,4619591],
  ["20467d48","740e","JZ 0x20467d58",1161947,4619592],
  ["20467d4a","0fb74606","MOVZX EAX,word ptr [ESI + 0x6]",1161948,4619594],
  ["20467d4e","43","INC EBX",1161949,4619598],
  ["20467d4f","83c728","ADD EDI,0x28",1161950,4619599],
  ["20467d52","3bd8","CMP EBX,EAX",1161951,4619602],
  ["20467d54","72e3","JC 0x20467d39",1161952,4619604],
  ["20467d56","eb04","JMP 0x20467d5c",1161953,4619606],
  ["20467d58","8365f800","AND dword ptr [EBP + -0x8],0x0",1161955,4619608],
  ["20467d5c","8b45f8","MOV EAX,dword ptr [EBP + -0x8]",1161957,4619612],
  ["20467d5f","5f","POP EDI",1161958,4619615],
  ["20467d60","5e","POP ESI",1161960,4619616],
  ["20467d61","5b","POP EBX",1161961,4619617],
  ["20467d62","c9","LEAVE",1161962,4619618],
  ["20467d63","c3","RET",1161963,4619619],
  ["20467d64","56","PUSH ESI",1161965,4619620],
  ["20467d65","ff3520237b20","PUSH dword ptr [0x207b2320]",1161966,4619621],
  ["20467d6b","8b358c7b7d20","MOV ESI,dword ptr [0x207d7b8c]",1161967,4619627],
  ["20467d71","ffd6","CALL ESI",1161968,4619633],
  ["20467d73","85c0","TEST EAX,EAX",1161969,4619635],
  ["20467d75","7421","JZ 0x20467d98",1161970,4619637],
  ["20467d77","a11c237b20","MOV EAX,[0x207b231c]",1161971,4619639],
  ["20467d7c","83f8ff","CMP EAX,-0x1",1161972,4619644],
  ["20467d7f","7417","JZ 0x20467d98",1161973,4619647],
  ["20467d81","50","PUSH EAX",1161974,4619649],
  ["20467d82","ff3520237b20","PUSH dword ptr [0x207b2320]",1161975,4619650],
  ["20467d88","ffd6","CALL ESI",1161976,4619656],
  ["20467d8a","ffd0","CALL EAX",1161977,4619658],
  ["20467d8c","85c0","TEST EAX,EAX",1161978,4619660],
  ["20467d8e","7408","JZ 0x20467d98",1161979,4619662],
  ["20467d90","8b80f8010000","MOV EAX,dword ptr [EAX + 0x1f8]",1161980,4619664],
  ["20467d96","eb26","JMP 0x20467dbe",1161981,4619670],
  ["20467d98","68a0646b20","PUSH 0x206b64a0",1161983,4619672],
  ["20467d9d","ff155c7b7d20","CALL dword ptr [0x207d7b5c]",1161984,4619677],
  ["20467da3","8bf0","MOV ESI,EAX",1161985,4619683],
  ["20467da5","85f6","TEST ESI,ESI",1161986,4619685],
  ["20467da7","7423","JZ 0x20467dcc",1161987,4619687],
  ["20467da9","e84affffff","CALL 0x20467cf8",1161988,4619689],
  ["20467dae","85c0","TEST EAX,EAX",1161989,4619694],
  ["20467db0","741a","JZ 0x20467dcc",1161990,4619696],
  ["20467db2","6890646b20","PUSH 0x206b6490",1161991,4619698],
  ["20467db7","56","PUSH ESI",1161992,4619703],
  ["20467db8","ff15947c7d20","CALL dword ptr [0x207d7c94]",1161993,4619704],
  ["20467dbe","85c0","TEST EAX,EAX",1161995,4619710],
  ["20467dc0","740a","JZ 0x20467dcc",1161996,4619712],
  ["20467dc2","ff742408","PUSH dword ptr [ESP + 0x8]",1161997,4619714],
  ["20467dc6","ffd0","CALL EAX",1161998,4619718],
  ["20467dc8","89442408","MOV dword ptr [ESP + 0x8],EAX",1161999,4619720],
  ["20467dcc","8b442408","MOV EAX,dword ptr [ESP + 0x8]",1162001,4619724],
  ["20467dd0","5e","POP ESI",1162002,4619728],
  ["20467dd1","c3","RET",1162003,4619729],
  ["20467ddb","56","PUSH ESI",1162010,4619739],
  ["20467ddc","ff3520237b20","PUSH dword ptr [0x207b2320]",1162011,4619740],
  ["20467de2","8b358c7b7d20","MOV ESI,dword ptr [0x207d7b8c]",1162012,4619746],
  ["20467de8","ffd6","CALL ESI",1162013,4619752],
  ["20467dea","85c0","TEST EAX,EAX",1162014,4619754],
  ["20467dec","7421","JZ 0x20467e0f",1162015,4619756],
  ["20467dee","a11c237b20","MOV EAX,[0x207b231c]",1162016,4619758],
  ["20467df3","83f8ff","CMP EAX,-0x1",1162017,4619763],
  ["20467df6","7417","JZ 0x20467e0f",1162018,4619766],
  ["20467df8","50","PUSH EAX",1162019,4619768],
  ["20467df9","ff3520237b20","PUSH dword ptr [0x207b2320]",1162020,4619769],
  ["20467dff","ffd6","CALL ESI",1162021,4619775],
  ["20467e01","ffd0","CALL EAX",1162022,4619777],
  ["20467e03","85c0","TEST EAX,EAX",1162023,4619779],
  ["20467e05","7408","JZ 0x20467e0f",1162024,4619781],
  ["20467e07","8b80fc010000","MOV EAX,dword ptr [EAX + 0x1fc]",1162025,4619783],
  ["20467e0d","eb26","JMP 0x20467e35",1162026,4619789],
  ["20467e0f","68a0646b20","PUSH 0x206b64a0",1162028,4619791],
  ["20467e14","ff155c7b7d20","CALL dword ptr [0x207d7b5c]",1162029,4619796],
  ["20467e1a","8bf0","MOV ESI,EAX",1162030,4619802],
  ["20467e1c","85f6","TEST ESI,ESI",1162031,4619804],
  ["20467e1e","7423","JZ 0x20467e43",1162032,4619806],
  ["20467e20","e8d3feffff","CALL 0x20467cf8",1162033,4619808],
  ["20467e25","85c0","TEST EAX,EAX",1162034,4619813],
  ["20467e27","741a","JZ 0x20467e43",1162035,4619815],
  ["20467e29","68b0646b20","PUSH 0x206b64b0",1162036,4619817],
  ["20467e2e","56","PUSH ESI",1162037,4619822],
  ["20467e2f","ff15947c7d20","CALL dword ptr [0x207d7c94]",1162038,4619823],
  ["20467e35","85c0","TEST EAX,EAX",1162040,4619829],
  ["20467e37","740a","JZ 0x20467e43",1162041,4619831],
  ["20467e39","ff742408","PUSH dword ptr [ESP + 0x8]",1162042,4619833],
  ["20467e3d","ffd0","CALL EAX",1162043,4619837],
  ["20467e3f","89442408","MOV dword ptr [ESP + 0x8],EAX",1162044,4619839],
  ["20467e43","8b442408","MOV EAX,dword ptr [ESP + 0x8]",1162046,4619843],
  ["20467e47","5e","POP ESI",1162047,4619847],
  ["20467e48","c3","RET",1162048,4619848],
  ["204681d9","57","PUSH EDI",1162360,4620761],
  ["204681da","68a0646b20","PUSH 0x206b64a0",1162361,4620762],
  ["204681df","ff155c7b7d20","CALL dword ptr [0x207d7b5c]",1162362,4620767],
  ["204681e5","8bf8","MOV EDI,EAX",1162363,4620773],
  ["204681e7","85ff","TEST EDI,EDI",1162364,4620775],
  ["204681e9","7509","JNZ 0x204681f4",1162365,4620777],
  ["204681eb","e8c8fcffff","CALL 0x20467eb8",1162366,4620779],
  ["204681f0","33c0","XOR EAX,EAX",1162367,4620784],
  ["204681f2","5f","POP EDI",1162368,4620786],
  ["204681f3","c3","RET",1162369,4620787],
  ["204681f4","56","PUSH ESI",1162371,4620788],
  ["204681f5","8b35947c7d20","MOV ESI,dword ptr [0x207d7c94]",1162372,4620789],
  ["204681fb","68e0646b20","PUSH 0x206b64e0",1162373,4620795],
  ["20468200","57","PUSH EDI",1162374,4620800],
  ["20468201","ffd6","CALL ESI",1162375,4620801],
  ["20468203","68d4646b20","PUSH 0x206b64d4",1162376,4620803],
  ["20468208","57","PUSH EDI",1162377,4620808],
  ["20468209","a3840a7d20","MOV [0x207d0a84],EAX",1162378,4620809],
  ["2046820e","ffd6","CALL ESI",1162379,4620814],
  ["20468210","68c8646b20","PUSH 0x206b64c8",1162380,4620816],
  ["20468215","57","PUSH EDI",1162381,4620821],
  ["20468216","a3880a7d20","MOV [0x207d0a88],EAX",1162382,4620822],
  ["2046821b","ffd6","CALL ESI",1162383,4620827],
  ["2046821d","68c0646b20","PUSH 0x206b64c0",1162384,4620829],
  ["20468222","57","PUSH EDI",1162385,4620834],
  ["20468223","a38c0a7d20","MOV [0x207d0a8c],EAX",1162386,4620835],
  ["20468228","ffd6","CALL ESI",1162387,4620840],
  ["2046822a","833d840a7d2000","CMP dword ptr [0x207d0a84],0x0",1162388,4620842],
  ["20468231","8b35947b7d20","MOV ESI,dword ptr [0x207d7b94]",1162389,4620849],
  ["20468237","a3900a7d20","MOV [0x207d0a90],EAX",1162390,4620855],
  ["2046823c","7416","JZ 0x20468254",1162391,4620860],
  ["2046823e","833d880a7d2000","CMP dword ptr [0x207d0a88],0x0",1162392,4620862],
  ["20468245","740d","JZ 0x20468254",1162393,4620869],
  ["20468247","833d8c0a7d2000","CMP dword ptr [0x207d0a8c],0x0",1162394,4620871],
  ["2046824e","7404","JZ 0x20468254",1162395,4620878],
  ["20468250","85c0","TEST EAX,EAX",1162396,4620880],
  ["20468252","7524","JNZ 0x20468278",1162397,4620882],
  ["20468254","a18c7b7d20","MOV EAX,[0x207d7b8c]",1162399,4620884],
  ["20468259","a3880a7d20","MOV [0x207d0a88],EAX",1162400,4620889],
  ["2046825e","a1987b7d20","MOV EAX,[0x207d7b98]",1162401,4620894],
  ["20468263","c705840a7d20497e4620","MOV dword ptr [0x207d0a84],0x20467e49",1162402,4620899],
  ["2046826d","89358c0a7d20","MOV dword ptr [0x207d0a8c],ESI",1162403,4620909],
  ["20468273","a3900a7d20","MOV [0x207d0a90],EAX",1162404,4620915],
  ["20468278","ff15907b7d20","CALL dword ptr [0x207d7b90]",1162406,4620920],
  ["2046827e","83f8ff","CMP EAX,-0x1",1162407,4620926],
  ["20468281","a320237b20","MOV [0x207b2320],EAX",1162408,4620929],
  ["20468286","0f84cc000000","JZ 0x20468358",1162409,4620934],
  ["2046828c","ff35880a7d20","PUSH dword ptr [0x207d0a88]",1162410,4620940],
  ["20468292","50","PUSH EAX",1162411,4620946],
  ["20468293","ffd6","CALL ESI",1162412,4620947],
  ["20468295","85c0","TEST EAX,EAX",1162413,4620949],
  ["20468297","0f84bb000000","JZ 0x20468358",1162414,4620951],
  ["2046829d","e806e5ffff","CALL 0x204667a8",1162415,4620957],
  ["204682a2","ff35840a7d20","PUSH dword ptr [0x207d0a84]",1162416,4620962],
  ["204682a8","e8b7faffff","CALL 0x20467d64",1162417,4620968],
  ["204682ad","ff35880a7d20","PUSH dword ptr [0x207d0a88]",1162418,4620973],
  ["204682b3","a3840a7d20","MOV [0x207d0a84],EAX",1162419,4620979],
  ["204682b8","e8a7faffff","CALL 0x20467d64",1162420,4620984],
  ["204682bd","ff358c0a7d20","PUSH dword ptr [0x207d0a8c]",1162421,4620989],
  ["204682c3","a3880a7d20","MOV [0x207d0a88],EAX",1162422,4620995],
  ["204682c8","e897faffff","CALL 0x20467d64",1162423,4621000],
  ["204682cd","ff35900a7d20","PUSH dword ptr [0x207d0a90]",1162424,4621005],
  ["204682d3","a38c0a7d20","MOV [0x207d0a8c],EAX",1162425,4621011],
  ["204682d8","e887faffff","CALL 0x20467d64",1162426,4621016],
  ["204682dd","83c410","ADD ESP,0x10",1162427,4621021],
  ["204682e0","a3900a7d20","MOV [0x207d0a90],EAX",1162428,4621024],
  ["204682e5","e834b30000","CALL 0x2047361e",1162429,4621029],
  ["204682ea","85c0","TEST EAX,EAX",1162430,4621034],
  ["204682ec","7465","JZ 0x20468353",1162431,4621036],
  ["204682ee","6843804620","PUSH 0x20468043",1162432,4621038],
  ["204682f3","ff35840a7d20","PUSH dword ptr [0x207d0a84]",1162433,4621043],
  ["204682f9","e8ddfaffff","CALL 0x20467ddb",1162434,4621049],
  ["204682fe","59","POP ECX",1162435,4621054],
  ["204682ff","ffd0","CALL EAX",1162436,4621055],
  ["20468301","83f8ff","CMP EAX,-0x1",1162437,4621057],
  ["20468304","a31c237b20","MOV [0x207b231c],EAX",1162438,4621060],
  ["20468309","7448","JZ 0x20468353",1162439,4621065],
  ["2046830b","6814020000","PUSH 0x214",1162440,4621067],
  ["20468310","6a01","PUSH 0x1",1162441,4621072],
  ["20468312","e8b7000000","CALL 0x204683ce",1162442,4621074],
  ["20468317","8bf0","MOV ESI,EAX",1162443,4621079],
  ["20468319","85f6","TEST ESI,ESI",1162444,4621081],
  ["2046831b","59","POP ECX",1162445,4621083],
  ["2046831c","59","POP ECX",1162446,4621084],
  ["2046831d","7434","JZ 0x20468353",1162447,4621085],
  ["2046831f","56","PUSH ESI",1162448,4621087],
  ["20468320","ff351c237b20","PUSH dword ptr [0x207b231c]",1162449,4621088],
  ["20468326","ff358c0a7d20","PUSH dword ptr [0x207d0a8c]",1162450,4621094],
  ["2046832c","e8aafaffff","CALL 0x20467ddb",1162451,4621100],
  ["20468331","59","POP ECX",1162452,4621105],
  ["20468332","ffd0","CALL EAX",1162453,4621106],
  ["20468334","85c0","TEST EAX,EAX",1162454,4621108],
  ["20468336","741b","JZ 0x20468353",1162455,4621110],
  ["20468338","6a00","PUSH 0x0",1162456,4621112],
  ["2046833a","56","PUSH ESI",1162457,4621114],
  ["2046833b","e8b5fbffff","CALL 0x20467ef5",1162458,4621115],
  ["20468340","59","POP ECX",1162459,4621120],
  ["20468341","59","POP ECX",1162460,4621121],
  ["20468342","ff15787b7d20","CALL dword ptr [0x207d7b78]",1162461,4621122],
  ["20468348","834e04ff","OR dword ptr [ESI + 0x4],0xffffffff",1162462,4621128],
  ["2046834c","8906","MOV dword ptr [ESI],EAX",1162463,4621132],
  ["2046834e","33c0","XOR EAX,EAX",1162464,4621134],
  ["20468350","40","INC EAX",1162465,4621136],
  ["20468351","eb07","JMP 0x2046835a",1162466,4621137],
  ["20468353","e860fbffff","CALL 0x20467eb8",1162468,4621139],
  ["20468358","33c0","XOR EAX,EAX",1162470,4621144],
  ["2046835a","5e","POP ESI",1162472,4621146],
  ["2046835b","5f","POP EDI",1162473,4621147],
  ["2046835c","c3","RET",1162474,4621148],
  ["20468570","6800864620","PUSH 0x20468600",1162673,4621680],
  ["20468575","64ff3500000000","PUSH dword ptr FS:[0x0]",1162674,4621685],
  ["2046857c","8b442410","MOV EAX,dword ptr [ESP + 0x10]",1162675,4621692],
  ["20468580","896c2410","MOV dword ptr [ESP + 0x10],EBP",1162676,4621696],
  ["20468584","8d6c2410","LEA EBP,[ESP + 0x10]",1162677,4621700],
  ["20468588","2be0","SUB ESP,EAX",1162678,4621704],
  ["2046858a","53","PUSH EBX",1162679,4621706],
  ["2046858b","56","PUSH ESI",1162680,4621707],
  ["2046858c","57","PUSH EDI",1162681,4621708],
  ["2046858d","a114237b20","MOV EAX,[0x207b2314]",1162682,4621709],
  ["20468592","3145fc","XOR dword ptr [EBP + -0x4],EAX",1162683,4621714],
  ["20468595","33c5","XOR EAX,EBP",1162684,4621717],
  ["20468597","50","PUSH EAX",1162685,4621719],
  ["20468598","8965e8","MOV dword ptr [EBP + -0x18],ESP",1162686,4621720],
  ["2046859b","ff75f8","PUSH dword ptr [EBP + -0x8]",1162687,4621723],
  ["2046859e","8b45fc","MOV EAX,dword ptr [EBP + -0x4]",1162688,4621726],
  ["204685a1","c745fcfeffffff","MOV dword ptr [EBP + -0x4],0xfffffffe",1162689,4621729],
  ["204685a8","8945f8","MOV dword ptr [EBP + -0x8],EAX",1162690,4621736],
  ["204685ab","8d45f0","LEA EAX,[EBP + -0x10]",1162691,4621739],
  ["204685ae","64a300000000","MOV FS:[0x0],EAX",1162692,4621742],
  ["204685b4","c3","RET",1162693,4621748],
  ["204685b5","8b4df0","MOV ECX,dword ptr [EBP + -0x10]",1162695,4621749],
  ["204685b8","64890d00000000","MOV dword ptr FS:[0x0],ECX",1162696,4621752],
  ["204685bf","59","POP ECX",1162697,4621759],
  ["204685c0","5f","POP EDI",1162698,4621760],
  ["204685c1","5f","POP EDI",1162699,4621761],
  ["204685c2","5e","POP ESI",1162700,4621762],
  ["204685c3","5b","POP EBX",1162701,4621763],
  ["204685c4","8be5","MOV ESP,EBP",1162702,4621764],
  ["204685c6","5d","POP EBP",1162703,4621766],
  ["204685c7","51","PUSH ECX",1162704,4621767],
  ["204685c8","c3","RET",1162705,4621768],
  ["204741b7","ff742404","PUSH dword ptr [ESP + 0x4]",1173445,4669879],
  ["204741bb","ff15107c7d20","CALL dword ptr [0x207d7c10]",1173446,4669883],
  ["204741c1","33c0","XOR EAX,EAX",1173447,4669889],
  ["204741c3","40","INC EAX",1173448,4669891],
  ["204741c4","c20800","RET 0x8",1173449,4669892],
  ["204741c7","6a14","PUSH 0x14",1173451,4669895],
  ["204741c9","68708e6e20","PUSH 0x206e8e70",1173452,4669897],
  ["204741ce","e89d43ffff","CALL 0x20468570",1173453,4669902],
  ["204741d3","33ff","XOR EDI,EDI",1173454,4669907],
  ["204741d5","897de4","MOV dword ptr [EBP + -0x1c],EDI",1173455,4669909],
  ["204741d8","ff359c107d20","PUSH dword ptr [0x207d109c]",1173456,4669912],
  ["204741de","e8f83bffff","CALL 0x20467ddb",1173457,4669918],
  ["204741e3","59","POP ECX",1173458,4669923],
  ["204741e4","8bf0","MOV ESI,EAX",1173459,4669924],
  ["204741e6","3bf7","CMP ESI,EDI",1173460,4669926],
  ["204741e8","7553","JNZ 0x2047423d",1173461,4669928],
  ["204741ea","8d45e4","LEA EAX,[EBP + -0x1c]",1173462,4669930],
  ["204741ed","50","PUSH EAX",1173463,4669933],
  ["204741ee","e86c22ffff","CALL 0x2046645f",1173464,4669934],
  ["204741f3","59","POP ECX",1173465,4669939],
  ["204741f4","3bc7","CMP EAX,EDI",1173466,4669940],
  ["204741f6","740d","JZ 0x20474205",1173467,4669942],
  ["204741f8","57","PUSH EDI",1173468,4669944],
  ["204741f9","57","PUSH EDI",1173469,4669945],
  ["204741fa","57","PUSH EDI",1173470,4669946],
  ["204741fb","57","PUSH EDI",1173471,4669947],
  ["204741fc","57","PUSH EDI",1173472,4669948],
  ["204741fd","e8d45effff","CALL 0x2046a0d6",1173473,4669949],
  ["20474205","837de401","CMP dword ptr [EBP + -0x1c],0x1",1173475,4669957],
  ["20474209","7421","JZ 0x2047422c",1173476,4669961],
  ["2047420b","6848e56b20","PUSH 0x206be548",1173477,4669963],
  ["20474210","ff155c7b7d20","CALL dword ptr [0x207d7b5c]",1173478,4669968],
  ["20474216","3bc7","CMP EAX,EDI",1173479,4669974],
  ["20474218","7412","JZ 0x2047422c",1173480,4669976],
  ["2047421a","6820e56b20","PUSH 0x206be520",1173481,4669978],
  ["2047421f","50","PUSH EAX",1173482,4669983],
  ["20474220","ff15947c7d20","CALL dword ptr [0x207d7c94]",1173483,4669984],
  ["20474226","8bf0","MOV ESI,EAX",1173484,4669990],
  ["20474228","3bf7","CMP ESI,EDI",1173485,4669992],
  ["2047422a","7505","JNZ 0x20474231",1173486,4669994],
  ["2047422c","beb7414720","MOV ESI,0x204741b7",1173488,4669996],
  ["20474231","56","PUSH ESI",1173490,4670001],
  ["20474232","e82d3bffff","CALL 0x20467d64",1173491,4670002],
  ["20474237","59","POP ECX",1173492,4670007],
  ["20474238","a39c107d20","MOV [0x207d109c],EAX",1173493,4670008],
  ["2047423d","897dfc","MOV dword ptr [EBP + -0x4],EDI",1173495,4670013],
  ["20474240","ff750c","PUSH dword ptr [EBP + 0xc]",1173496,4670016],
  ["20474243","ff7508","PUSH dword ptr [EBP + 0x8]",1173497,4670019],
  ["20474246","ffd6","CALL ESI",1173498,4670022],
  ["20474248","8945e0","MOV dword ptr [EBP + -0x20],EAX",1173499,4670024],
  ["2047424b","eb2f","JMP 0x2047427c",1173500,4670027],
  ["2047427c","c745fcfeffffff","MOV dword ptr [EBP + -0x4],0xfffffffe",1173502,4670076],
  ["20474283","8b45e0","MOV EAX,dword ptr [EBP + -0x20]",1173503,4670083],
  ["20474286","e82a43ffff","CALL 0x204685b5",1173504,4670086],
  ["2047428b","c3","RET",1173505,4670091],
  ["204742ff","6a54","PUSH 0x54",1173528,4670207],
  ["20474301","68908e6e20","PUSH 0x206e8e90",1173529,4670209],
  ["20474306","e86542ffff","CALL 0x20468570",1173530,4670214],
  ["2047430b","33ff","XOR EDI,EDI",1173531,4670219],
  ["2047430d","897dfc","MOV dword ptr [EBP + -0x4],EDI",1173532,4670221],
  ["20474310","8d459c","LEA EAX,[EBP + -0x64]",1173533,4670224],
  ["20474313","50","PUSH EAX",1173534,4670227],
  ["20474314","ff151c7c7d20","CALL dword ptr [0x207d7c1c]",1173535,4670228],
  ["2047431a","c745fcfeffffff","MOV dword ptr [EBP + -0x4],0xfffffffe",1173536,4670234],
  ["20474321","6a38","PUSH 0x38",1173537,4670241],
  ["20474323","6a20","PUSH 0x20",1173538,4670243],
  ["20474325","5e","POP ESI",1173539,4670245],
  ["20474326","56","PUSH ESI",1173540,4670246],
  ["20474327","e8a240ffff","CALL 0x204683ce",1173541,4670247],
  ["2047432c","59","POP ECX",1173542,4670252],
  ["2047432d","59","POP ECX",1173543,4670253],
  ["2047432e","3bc7","CMP EAX,EDI",1173544,4670254],
  ["20474330","0f8400020000","JZ 0x20474536",1173545,4670256],
  ["20474336","a3202a7d20","MOV [0x207d2a20],EAX",1173546,4670262],
  ["2047433b","8935c4297d20","MOV dword ptr [0x207d29c4],ESI",1173547,4670267],
  ["20474341","8d8800070000","LEA ECX,[EAX + 0x700]",1173548,4670273],
  ["20474347","eb29","JMP 0x20474372",1173549,4670279],
  ["20474349","c6400400","MOV byte ptr [EAX + 0x4],0x0",1173551,4670281],
  ["2047434d","8308ff","OR dword ptr [EAX],0xffffffff",1173552,4670285],
  ["20474350","c640050a","MOV byte ptr [EAX + 0x5],0xa",1173553,4670288],
  ["20474354","897808","MOV dword ptr [EAX + 0x8],EDI",1173554,4670292],
  ["20474357","c6402400","MOV byte ptr [EAX + 0x24],0x0",1173555,4670295],
  ["2047435b","c640250a","MOV byte ptr [EAX + 0x25],0xa",1173556,4670299],
  ["2047435f","c640260a","MOV byte ptr [EAX + 0x26],0xa",1173557,4670303],
  ["20474363","83c038","ADD EAX,0x38",1173558,4670307],
  ["20474366","8b0d202a7d20","MOV ECX,dword ptr [0x207d2a20]",1173559,4670310],
  ["2047436c","81c100070000","ADD ECX,0x700",1173560,4670316],
  ["20474372","3bc1","CMP EAX,ECX",1173562,4670322],
  ["20474374","72d3","JC 0x20474349",1173563,4670324],
  ["20474376","66397dce","CMP word ptr [EBP + -0x32],DI",1173564,4670326],
  ["2047437a","0f84fd000000","JZ 0x2047447d",1173565,4670330],
  ["20474380","8b45d0","MOV EAX,dword ptr [EBP + -0x30]",1173566,4670336],
  ["20474383","3bc7","CMP EAX,EDI",1173567,4670339],
  ["20474385","0f84f2000000","JZ 0x2047447d",1173568,4670341],
  ["2047438b","8b38","MOV EDI,dword ptr [EAX]",1173569,4670347],
  ["2047438d","8d5804","LEA EBX,[EAX + 0x4]",1173570,4670349],
  ["20474390","8d043b","LEA EAX,[EBX + EDI*0x1]",1173571,4670352],
  ["20474393","8945e4","MOV dword ptr [EBP + -0x1c],EAX",1173572,4670355],
  ["20474396","b800080000","MOV EAX,0x800",1173573,4670358],
  ["2047439b","3bf8","CMP EDI,EAX",1173574,4670363],
  ["2047439d","7c02","JL 0x204743a1",1173575,4670365],
  ["2047439f","8bf8","MOV EDI,EAX",1173576,4670367],
  ["204743a1","33f6","XOR ESI,ESI",1173578,4670369],
  ["204743a3","46","INC ESI",1173579,4670371],
  ["204743a4","eb52","JMP 0x204743f8",1173580,4670372],
  ["204743a6","6a38","PUSH 0x38",1173582,4670374],
  ["204743a8","6a20","PUSH 0x20",1173583,4670376],
  ["204743aa","e81f40ffff","CALL 0x204683ce",1173584,4670378],
  ["204743af","59","POP ECX",1173585,4670383],
  ["204743b0","59","POP ECX",1173586,4670384],
  ["204743b1","85c0","TEST EAX,EAX",1173587,4670385],
  ["204743b3","744d","JZ 0x20474402",1173588,4670387],
  ["204743b5","8d0cb5202a7d20","LEA ECX,[ESI*0x4 + 0x207d2a20]",1173589,4670389],
  ["204743bc","8901","MOV dword ptr [ECX],EAX",1173590,4670396],
  ["204743be","8305c4297d2020","ADD dword ptr [0x207d29c4],0x20",1173591,4670398],
  ["204743c5","8d9000070000","LEA EDX,[EAX + 0x700]",1173592,4670405],
  ["204743cb","eb26","JMP 0x204743f3",1173593,4670411],
  ["204743cd","c6400400","MOV byte ptr [EAX + 0x4],0x0",1173595,4670413],
  ["204743d1","8308ff","OR dword ptr [EAX],0xffffffff",1173596,4670417],
  ["204743d4","c640050a","MOV byte ptr [EAX + 0x5],0xa",1173597,4670420],
  ["204743d8","83600800","AND dword ptr [EAX + 0x8],0x0",1173598,4670424],
  ["204743dc","80602480","AND byte ptr [EAX + 0x24],0x80",1173599,4670428],
  ["204743e0","c640250a","MOV byte ptr [EAX + 0x25],0xa",1173600,4670432],
  ["204743e4","c640260a","MOV byte ptr [EAX + 0x26],0xa",1173601,4670436],
  ["204743e8","83c038","ADD EAX,0x38",1173602,4670440],
  ["204743eb","8b11","MOV EDX,dword ptr [ECX]",1173603,4670443],
  ["204743ed","81c200070000","ADD EDX,0x700",1173604,4670445],
  ["204743f3","3bc2","CMP EAX,EDX",1173606,4670451],
  ["204743f5","72d6","JC 0x204743cd",1173607,4670453],
  ["204743f7","46","INC ESI",1173608,4670455],
  ["204743f8","393dc4297d20","CMP dword ptr [0x207d29c4],EDI",1173610,4670456],
  ["204743fe","7ca6","JL 0x204743a6",1173611,4670462],
  ["20474400","eb06","JMP 0x20474408",1173612,4670464],
  ["20474402","8b3dc4297d20","MOV EDI,dword ptr [0x207d29c4]",1173614,4670466],
  ["20474408","8365e000","AND dword ptr [EBP + -0x20],0x0",1173616,4670472],
  ["2047440c","85ff","TEST EDI,EDI",1173617,4670476],
  ["2047440e","7e6d","JLE 0x2047447d",1173618,4670478],
  ["20474410","8b45e4","MOV EAX,dword ptr [EBP + -0x1c]",1173620,4670480],
  ["20474413","8b08","MOV ECX,dword ptr [EAX]",1173621,4670483],
  ["20474415","83f9ff","CMP ECX,-0x1",1173622,4670485],
  ["20474418","7456","JZ 0x20474470",1173623,4670488],
  ["2047441a","83f9fe","CMP ECX,-0x2",1173624,4670490],
  ["2047441d","7451","JZ 0x20474470",1173625,4670493],
  ["2047441f","8a03","MOV AL,byte ptr [EBX]",1173626,4670495],
  ["20474421","a801","TEST AL,0x1",1173627,4670497],
  ["20474423","744b","JZ 0x20474470",1173628,4670499],
  ["20474425","a808","TEST AL,0x8",1173629,4670501],
  ["20474427","750b","JNZ 0x20474434",1173630,4670503],
  ["20474429","51","PUSH ECX",1173631,4670505],
  ["2047442a","ff15187c7d20","CALL dword ptr [0x207d7c18]",1173632,4670506],
  ["20474430","85c0","TEST EAX,EAX",1173633,4670512],
  ["20474432","743c","JZ 0x20474470",1173634,4670514],
  ["20474434","8b75e0","MOV ESI,dword ptr [EBP + -0x20]",1173636,4670516],
  ["20474437","8bc6","MOV EAX,ESI",1173637,4670519],
  ["20474439","c1f805","SAR EAX,0x5",1173638,4670521],
  ["2047443c","83e61f","AND ESI,0x1f",1173639,4670524],
  ["2047443f","6bf638","IMUL ESI,ESI,0x38",1173640,4670527],
  ["20474442","033485202a7d20","ADD ESI,dword ptr [EAX*0x4 + 0x207d2a20]",1173641,4670530],
  ["20474449","8b45e4","MOV EAX,dword ptr [EBP + -0x1c]",1173642,4670537],
  ["2047444c","8b00","MOV EAX,dword ptr [EAX]",1173643,4670540],
  ["2047444e","8906","MOV dword ptr [ESI],EAX",1173644,4670542],
  ["20474450","8a03","MOV AL,byte ptr [EBX]",1173645,4670544],
  ["20474452","884604","MOV byte ptr [ESI + 0x4],AL",1173646,4670546],
  ["20474455","68a00f0000","PUSH 0xfa0",1173647,4670549],
  ["2047445a","8d460c","LEA EAX,[ESI + 0xc]",1173648,4670554],
  ["2047445d","50","PUSH EAX",1173649,4670557],
  ["2047445e","e864fdffff","CALL 0x204741c7",1173650,4670558],
  ["20474463","59","POP ECX",1173651,4670563],
  ["20474464","59","POP ECX",1173652,4670564],
  ["20474465","85c0","TEST EAX,EAX",1173653,4670565],
  ["20474467","0f84c9000000","JZ 0x20474536",1173654,4670567],
  ["2047446d","ff4608","INC dword ptr [ESI + 0x8]",1173655,4670573],
  ["20474470","ff45e0","INC dword ptr [EBP + -0x20]",1173657,4670576],
  ["20474473","43","INC EBX",1173658,4670579],
  ["20474474","8345e404","ADD dword ptr [EBP + -0x1c],0x4",1173659,4670580],
  ["20474478","397de0","CMP dword ptr [EBP + -0x20],EDI",1173660,4670584],
  ["2047447b","7c93","JL 0x20474410",1173661,4670587],
  ["2047447d","33db","XOR EBX,EBX",1173663,4670589],
  ["2047447f","8bf3","MOV ESI,EBX",1173665,4670591],
  ["20474481","6bf638","IMUL ESI,ESI,0x38",1173666,4670593],
  ["20474484","0335202a7d20","ADD ESI,dword ptr [0x207d2a20]",1173667,4670596],
  ["2047448a","8b06","MOV EAX,dword ptr [ESI]",1173668,4670602],
  ["2047448c","83f8ff","CMP EAX,-0x1",1173669,4670604],
  ["2047448f","740b","JZ 0x2047449c",1173670,4670607],
  ["20474491","83f8fe","CMP EAX,-0x2",1173671,4670609],
  ["20474494","7406","JZ 0x2047449c",1173672,4670612],
  ["20474496","804e0480","OR byte ptr [ESI + 0x4],0x80",1173673,4670614],
  ["2047449a","eb72","JMP 0x2047450e",1173674,4670618],
  ["2047449c","c6460481","MOV byte ptr [ESI + 0x4],0x81",1173676,4670620],
  ["204744a0","85db","TEST EBX,EBX",1173677,4670624],
  ["204744a2","7505","JNZ 0x204744a9",1173678,4670626],
  ["204744a4","6af6","PUSH -0xa",1173679,4670628],
  ["204744a6","58","POP EAX",1173680,4670630],
  ["204744a7","eb0a","JMP 0x204744b3",1173681,4670631],
  ["204744a9","8bc3","MOV EAX,EBX",1173683,4670633],
  ["204744ab","48","DEC EAX",1173684,4670635],
  ["204744ac","f7d8","NEG EAX",1173685,4670636],
  ["204744ae","1bc0","SBB EAX,EAX",1173686,4670638],
  ["204744b0","83c0f5","ADD EAX,-0xb",1173687,4670640],
  ["204744b3","50","PUSH EAX",1173689,4670643],
  ["204744b4","ff15bc7b7d20","CALL dword ptr [0x207d7bbc]",1173690,4670644],
  ["204744ba","8bf8","MOV EDI,EAX",1173691,4670650],
  ["204744bc","83ffff","CMP EDI,-0x1",1173692,4670652],
  ["204744bf","7443","JZ 0x20474504",1173693,4670655],
  ["204744c1","85ff","TEST EDI,EDI",1173694,4670657],
  ["204744c3","743f","JZ 0x20474504",1173695,4670659],
  ["204744c5","57","PUSH EDI",1173696,4670661],
  ["204744c6","ff15187c7d20","CALL dword ptr [0x207d7c18]",1173697,4670662],
  ["204744cc","85c0","TEST EAX,EAX",1173698,4670668],
  ["204744ce","7434","JZ 0x20474504",1173699,4670670],
  ["204744d0","893e","MOV dword ptr [ESI],EDI",1173700,4670672],
  ["204744d2","25ff000000","AND EAX,0xff",1173701,4670674],
  ["204744d7","83f802","CMP EAX,0x2",1173702,4670679],
  ["204744da","7506","JNZ 0x204744e2",1173703,4670682],
  ["204744dc","804e0440","OR byte ptr [ESI + 0x4],0x40",1173704,4670684],
  ["204744e0","eb09","JMP 0x204744eb",1173705,4670688],
  ["204744e2","83f803","CMP EAX,0x3",1173707,4670690],
  ["204744e5","7504","JNZ 0x204744eb",1173708,4670693],
  ["204744e7","804e0408","OR byte ptr [ESI + 0x4],0x8",1173709,4670695],
  ["204744eb","68a00f0000","PUSH 0xfa0",1173711,4670699],
  ["204744f0","8d460c","LEA EAX,[ESI + 0xc]",1173712,4670704],
  ["204744f3","50","PUSH EAX",1173713,4670707],
  ["204744f4","e8cefcffff","CALL 0x204741c7",1173714,4670708],
  ["204744f9","59","POP ECX",1173715,4670713],
  ["204744fa","59","POP ECX",1173716,4670714],
  ["204744fb","85c0","TEST EAX,EAX",1173717,4670715],
  ["204744fd","7437","JZ 0x20474536",1173718,4670717],
  ["204744ff","ff4608","INC dword ptr [ESI + 0x8]",1173719,4670719],
  ["20474502","eb0a","JMP 0x2047450e",1173720,4670722],
  ["20474504","804e0440","OR byte ptr [ESI + 0x4],0x40",1173722,4670724],
  ["20474508","c706feffffff","MOV dword ptr [ESI],0xfffffffe",1173723,4670728],
  ["2047450e","43","INC EBX",1173725,4670734],
  ["2047450f","83fb03","CMP EBX,0x3",1173726,4670735],
  ["20474512","0f8c67ffffff","JL 0x2047447f",1173727,4670738],
  ["20474518","ff35c4297d20","PUSH dword ptr [0x207d29c4]",1173728,4670744],
  ["2047451e","ff15147c7d20","CALL dword ptr [0x207d7c14]",1173729,4670750],
  ["20474524","33c0","XOR EAX,EAX",1173730,4670756],
  ["20474526","eb11","JMP 0x20474539",1173731,4670758],
  ["20474536","83c8ff","OR EAX,0xffffffff",1173733,4670774],
  ["20474539","e87740ffff","CALL 0x204685b5",1173735,4670777],
  ["2047453e","c3","RET",1173736,4670782]
];
freeze(originalInstructionPins);
const imagePins: Readonly<Record<string, unknown>> = {"crtSectionInitializer":{"module":"Game","address":"207d109c","rva":"7d109c","bytes":4,"raw":"00000000","knownMask":"ffffffff","sha256":"df3f619804a92fdb4057192dc43dd748ea778adc52bc498ce80524c014b81119","section":{"virtualAddress":7954432,"virtualSize":248716,"rawSize":126976,"rawOffset":7954432,"fileBackedBytes":0,"loaderZeroFillBytes":4},"originalPESection":{"name":".data","headerFileOffset":552,"characteristics":"c0000040","readable":true,"writable":true,"executable":false},"fileOffset":null,"scope":"cold-original-image","sourceOnly":true,"runtimeOwnerAdmitted":false,"liveValueCaptured":false,"currentLiveValueCaptured":false,"canonicalImageLabel":"crtSectionInitializer","sourceDependency":{"package":"assets/gothic3/game-crt","group":"coldGlobals","label":"crtSectionInitializer"},"initializationScope":"Reuses already admitted canonical Game image; never a current-value capture or later reseed"},"crtTlsIndexes":{"module":"Game","address":"207b231c","rva":"7b231c","bytes":8,"raw":"ffffffffffffffff","knownMask":"ffffffffffffffff","sha256":"12a3ae445661ce5dee78d0650d33362dec29c4f82af05e7e57fb595bbbacf0ca","section":{"virtualAddress":7954432,"virtualSize":248716,"rawSize":126976,"rawOffset":7954432,"fileBackedBytes":8,"loaderZeroFillBytes":0},"originalPESection":{"name":".data","headerFileOffset":552,"characteristics":"c0000040","readable":true,"writable":true,"executable":false},"fileOffset":8069916,"scope":"cold-original-image","sourceOnly":true,"runtimeOwnerAdmitted":false,"liveValueCaptured":false,"currentLiveValueCaptured":false,"canonicalImageLabel":"crtTlsIndexes","sourceDependency":{"package":"assets/gothic3/game-crt","group":"coldGlobals","label":"crtTlsIndexes"},"initializationScope":"Reuses already admitted canonical Game image; never a current-value capture or later reseed"},"securityCookie":{"module":"Game","address":"207b2314","rva":"7b2314","bytes":4,"raw":"4ee640bb","knownMask":"ffffffff","sha256":"ce27c3a226b06f760dc303582e2dd3ab690a1634fdced2e53b238a4e947cd75f","section":{"virtualAddress":7954432,"virtualSize":248716,"rawSize":126976,"rawOffset":7954432,"fileBackedBytes":4,"loaderZeroFillBytes":0},"originalPESection":{"name":".data","headerFileOffset":552,"characteristics":"c0000040","readable":true,"writable":true,"executable":false},"fileOffset":8069908,"scope":"cold-original-image","sourceOnly":true,"runtimeOwnerAdmitted":false,"liveValueCaptured":false,"currentLiveValueCaptured":false,"canonicalImageLabel":"securityCookie","sourceDependency":{"package":"assets/gothic3/game-crt","group":"coldGlobals","label":"securityCookie"},"initializationScope":"Reuses already admitted canonical Game image; never a current-value capture or later reseed"},"ioBlocks":{"module":"Game","address":"207d2a20","rva":"7d2a20","bytes":256,"raw":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","knownMask":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff","sha256":"5341e6b2646979a70e57653007a1f310169421ec9bdd9f1a5648f75ade005af1","section":{"virtualAddress":7954432,"virtualSize":248716,"rawSize":126976,"rawOffset":7954432,"fileBackedBytes":0,"loaderZeroFillBytes":256},"originalPESection":{"name":".data","headerFileOffset":552,"characteristics":"c0000040","readable":true,"writable":true,"executable":false},"fileOffset":null,"scope":"cold-original-image","sourceOnly":true,"runtimeOwnerAdmitted":false,"liveValueCaptured":false,"currentLiveValueCaptured":false,"canonicalImageLabel":"ioBlocks","sourceDependency":{"package":"assets/gothic3/game-io-allocation","group":"coldGlobals","label":"ioBlocks"},"initializationScope":"Reuses already admitted canonical Game image; never a current-value capture or later reseed"},"ioHandleCount":{"module":"Game","address":"207d29c4","rva":"7d29c4","bytes":4,"raw":"00000000","knownMask":"ffffffff","sha256":"df3f619804a92fdb4057192dc43dd748ea778adc52bc498ce80524c014b81119","section":{"virtualAddress":7954432,"virtualSize":248716,"rawSize":126976,"rawOffset":7954432,"fileBackedBytes":0,"loaderZeroFillBytes":4},"originalPESection":{"name":".data","headerFileOffset":552,"characteristics":"c0000040","readable":true,"writable":true,"executable":false},"fileOffset":null,"scope":"cold-original-image","sourceOnly":true,"runtimeOwnerAdmitted":false,"liveValueCaptured":false,"currentLiveValueCaptured":false,"canonicalImageLabel":"ioHandleCount","sourceDependency":{"package":"assets/gothic3/game-io-allocation","group":"coldGlobals","label":"ioHandleCount"},"initializationScope":"Reuses already admitted canonical Game image; never a current-value capture or later reseed"},"sectionInitExceptionTable":{"module":"Game","address":"206e8e70","rva":"6e8e70","bytes":28,"raw":"feffffff00000000ccffffff00000000feffffff4d42472064424720","knownMask":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffff","sha256":"36dc118036177a0d603ac06396ff6ab04814298829c3132fe7afc883ebc03901","section":{"virtualAddress":5685248,"virtualSize":2268534,"rawSize":2269184,"rawOffset":5685248,"fileBackedBytes":28,"loaderZeroFillBytes":0},"originalPESection":{"name":".rdata","headerFileOffset":512,"characteristics":"40000040","readable":true,"writable":false,"executable":false},"fileOffset":7245424,"scope":"original-file-backed-constant","sourceOnly":true,"runtimeOwnerAdmitted":false,"liveValueCaptured":false,"currentLiveValueCaptured":false,"canonicalImageLabel":"sectionInitExceptionTable","sourceDependency":{"package":"assets/gothic3/game-crt","group":"constBytes","label":"sectionInitExceptionTable"},"initializationScope":"Reuses already admitted canonical Game image; never a current-value capture or later reseed","decodedDwords":["fffffffe","00000000","ffffffcc","00000000","fffffffe","2047424d","20474264"]}};
freeze(imagePins);
const callSitePins: Readonly<Record<string, string>> = {"standardHandleCall":"204744b4","fileTypeCall":"204744c6","sectionCall":"204744f4","sectionPrologCall":"204741ce","decodeWrapperCall":"204741de","tlsGetterCall":"20467de8","tlsDispatchCall":"20467dff","flsGetterCall":"20467e01","decodeEndpointCall":"20467e3d","spinEndpointCall":"20474246","sectionEpilogCall":"20474286","sectionFinalReturn":"2047428b","setHandleCountCall":"2047451e","outerEpilogCall":"20474539","outerFinalReturn":"2047453e"};
freeze(callSitePins);
const dependencyPins: Readonly<Record<string, unknown>> = {"gameCrt":{"runtime-rules.json":{"path":"assets/gothic3/game-crt/runtime-rules.json","bytes":186024,"sha256":"9a3bbb750ec71a1edb13502a26a71ef44a8dcde366f8fd8899553cc85bf4ab86"},"native-evidence.json":{"path":"assets/gothic3/game-crt/native-evidence.json","bytes":845854,"sha256":"0378ec053fee1df7bf8911efdb27cae7be43010d66bb99af500b7c365cabd94b"},"source-manifest.json":{"path":"assets/gothic3/game-crt/source-manifest.json","bytes":44545,"sha256":"a3cc65a803fbf1d78f0d4272e4f06d089b969976a400c30144b7dd07765177ca"}},"continuation":{"runtime-rules.json":{"path":"assets/gothic3/game-attach-continuation/runtime-rules.json","bytes":69728,"sha256":"a83230b48ab739986cffa5303d803d03589912b027191e83db82d616c048087f"},"native-evidence.json":{"path":"assets/gothic3/game-attach-continuation/native-evidence.json","bytes":417933,"sha256":"a66aee7be0f74bc690f97dc3fc658f8fc62cf6ed1e824118fb8dd6f8ea1c003c"},"source-manifest.json":{"path":"assets/gothic3/game-attach-continuation/source-manifest.json","bytes":14791,"sha256":"6d1a012b9fabb98c33a1e510756cdec9e51e48f87b0a06e1cce0045e11afec56"}},"ioAllocation":{"runtime-rules.json":{"path":"assets/gothic3/game-io-allocation/runtime-rules.json","bytes":70419,"sha256":"6064708dcd0d2b98fe2c6171029b3593516455573482d78e4fca64af9a403a0d"},"native-evidence.json":{"path":"assets/gothic3/game-io-allocation/native-evidence.json","bytes":158686,"sha256":"d5318037cb3d3d5f669caac2834f79eacfa337ef5b2688a97543e0eea0c35b3e"},"source-manifest.json":{"path":"assets/gothic3/game-io-allocation/source-manifest.json","bytes":30440,"sha256":"ae407fe7bee57a2291025bd71fd75044d02dd6a7a5e37d1f859aecfad3a96b7f"}}};
freeze(dependencyPins);
const gapPin: Readonly<Record<string, unknown>> = {"sourceOnly":true,"catalogEntriesFound":0,"originalCEntriesFound":0,"originalASMRowsFound":0,"searchedEntries":["2047424d","20474264","20467e52"],"searchedInclusiveExtents":["2047424d-20474263","20474264-2047427b","20467e52-20467e66"],"corpusRecordSha256":"6446c8311cc2e24c2793282c78a6b2410e4ee76e64ae76ee76a337381c5ba209"};
freeze(gapPin);
const countsPin: Readonly<Record<string, unknown>> = {"activeBodies":5,"activeOriginalRows":304,"activeOriginalBodyBytes":908,"sourceContextInstructionPoints":1,"catalogedOriginalBodies":12,"catalogedOriginalRows":703,"catalogedOriginalBodyBytes":2118,"peRecoveredContextListings":3,"peRecoveredContextRows":20,"peRecoveredContextBytes":68,"totalContextListings":15,"totalContextRows":723,"totalContextBodyBytes":2186,"cachedDecodeOperations":25,"fullCachedSectionOperations":78,"normalTailOperations":368,"normalTotalOperations":899,"headlessTailOperations":80,"headlessTotalOperations":611};
freeze(countsPin);
const abiPin: Readonly<Record<string, unknown>> = {"sourceOnly":true,"originalWindowsCalleesCaptured":false,"nativeEndpointsExecuted":false,"scope":"Explicit virtual Win32 contract; actual private Runtime normal outcome and physical CALL proof required","standardHandle":{"callPC":"204744b4","iat":"207d7bbc","returnPC":"204744ba","callingConvention":"stdcall","argumentBytes":4},"fileType":{"callPC":"204744c6","iat":"207d7c18","returnPC":"204744cc","callingConvention":"stdcall","argumentBytes":4},"setHandleCount":{"callPC":"2047451e","iat":"207d7c14","returnPC":"20474524","callingConvention":"stdcall","argumentBytes":4},"tlsCalls":[{"callPC":"20467de8","returnPC":"20467dea","iat":"207d7b8c","callingConvention":"stdcall","argumentBytes":4},{"callPC":"20467dff","returnPC":"20467e01","iat":"207d7b8c","callingConvention":"stdcall","argumentBytes":4}],"flsGet":{"callPC":"20467e01","returnPC":"20467e03","callingConvention":"stdcall","argumentBytes":4,"indirectCurrentProcedure":true,"nativeDispatcher20467e52Entered":false},"decode":{"callPC":"20467e3d","returnPC":"20467e3f","callingConvention":"stdcall","argumentBytes":4,"indirectCurrentProcedure":true},"spin":{"callPC":"20474246","returnPC":"20474248","callingConvention":"stdcall","argumentBytes":8,"indirectCurrentProcedure":true},"sourceSection":{"callPC":"204744f4","returnPC":"204744f9","callingConvention":"cdecl","callerArgumentBytes":8},"sourceDecode":{"callPC":"204741de","returnPC":"204741e3","callingConvention":"cdecl","callerArgumentBytes":4},"normalPreservedRegisters":["EBX","ESI","EDI","EBP"],"normalPreservedFS":true,"normalUnknownRegisters":["ECX","EDX"],"normalArithmeticFlags":"unknown","unknownOutcomeGrantsCleanup":false,"escapedHostErrorIsNativeException":false,"copiedHandleLabelsMintCapabilities":false,"hostWindowsHandlesObserved":false};
freeze(abiPin);
const framePin: Readonly<Record<string, unknown>> = {"sourceOnly":true,"currentLiveValueCaptured":false,"outerEBPRelativeToInitialESP":-8,"entryESPRelativeToOuterEBP":-120,"standardImportReturnRelativeToOuterEBP":-124,"standardImportNormalESPRelativeToOuterEBP":-116,"sectionEBPRelativeToOuterEBP":-132,"sectionESPAfterPrologRelativeToSectionEBP":-52,"sectionRegistrationRelativeToSectionEBP":-16,"sectionSavedOuterFsRelativeToSectionEBP":-16,"sectionSavedESPRelativeToSectionEBP":-24,"sectionSavedRegisters":{"EBX":-40,"ESI":-44,"EDI":-48,"EBP":0},"sectionReturnRelativeToSectionEBP":4,"sectionPointerArgumentRelativeToSectionEBP":8,"sectionSpinArgumentRelativeToSectionEBP":12,"sectionSpinArgument":4000,"decodeWrapperReturnRelativeToSectionEBP":-60,"decodeArgumentRelativeToSectionEBP":-56,"decodeSavedESIRelativeToSectionEBP":-64,"deepestDecodeTLSCallRelativeToSectionEBP":-76,"spinReturnRelativeToSectionEBP":-64,"spinNormalESPRelativeToSectionEBP":-52,"selectedTailDeepestStackBytes":216,"wholeIoExistingAllocatorDepthBytes":224,"outerRegistrationRelativeToOuterEBP":-16,"outerCallerReturnRelativeToOuterEBP":4,"outerCallerReturnPC":"204678d3","outerFinalReturnPC":"2047453e","finalESPRelativeToInitialESP":0,"finalReturnConsumesOriginalCallerWord":true,"returnedFrameGrantsOperations":false,"originalHandlerExecutionOwned":false,"sourceCookieAddress":"207b2314","sourceScopeAddress":"206e8e70"};
freeze(framePin);
const importPin: Readonly<Record<string, unknown>> = {"Game":[{"iatVA":"0x207d7b5c","module":"KERNEL32.dll","name":"GetModuleHandleA","ordinal":null},{"iatVA":"0x207d7b8c","module":"KERNEL32.dll","name":"TlsGetValue","ordinal":null},{"iatVA":"0x207d7ba0","module":"KERNEL32.dll","name":"SetLastError","ordinal":null},{"iatVA":"0x207d7bbc","module":"KERNEL32.dll","name":"GetStdHandle","ordinal":null},{"iatVA":"0x207d7c10","module":"KERNEL32.dll","name":"InitializeCriticalSection","ordinal":null},{"iatVA":"0x207d7c14","module":"KERNEL32.dll","name":"SetHandleCount","ordinal":null},{"iatVA":"0x207d7c18","module":"KERNEL32.dll","name":"GetFileType","ordinal":null},{"iatVA":"0x207d7c94","module":"KERNEL32.dll","name":"GetProcAddress","ordinal":null}]};
freeze(importPin);
const currentDependencyPin: readonly string[] = ["Current canonical207d109c encoded procedure, never cold zero or reseed","Current207b231c/207b2320 and actual retained same-CRT532B PTD membership/backing","Current PTD+1fc private DecodePointer and current private spin procedure","Same returned1792B backing/current ioBlocks; true24B record+0xc aliases and physical section registration","Actual current flags/words/masks and per-call private grants; unknown preserves effects without return","Final RET consumes original204678d3 word; expired IO frame cannot replay writer or authorize caller"];
freeze(currentDependencyPin);
const normalPathPin: Readonly<Record<string, unknown>> = {"sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"scope":"Static expected three valid virtual CHAR handles/current cached spin/current PTD path; no observed execution","priorOperations":531,"addedOperations":368,"totalOperations":899,"instructionRowsSha256":"98a4d5b7b2814443e46e046d726aeb95f77a3849a74bd9852412a1f604ed27c2","nextBoundaryPC":"204678d3","nextBoundaryExecuted":false,"ioInitFinalReturnPC":"2047453e","completedRuntimeExecutionCaptured":false,"sourceBranchesForced":false};
freeze(normalPathPin);
const nullPathPin: Readonly<Record<string, unknown>> = {"sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"scope":"Static expected three genuinely normal NULL standard handles; no console initialization claim","priorOperations":531,"addedOperations":80,"totalOperations":611,"instructionRowsSha256":"ca476728c8ed51d7405a11216b1a25aea9f2837a40cc591d259dccea0b972988","nextBoundaryPC":"204678d3","nextBoundaryExecuted":false,"ioInitFinalReturnPC":"2047453e","completedRuntimeExecutionCaptured":false,"sourceBranchesForced":false};
freeze(nullPathPin);
const directTargetCatalogPins: Readonly<Record<string, unknown>> = {"20468570":{"address":"20468570","name":"__SEH_prolog4","qualified_name":"__SEH_prolog4","signature":"void __SEH_prolog4(undefined4 param_1,int param_2);","status":"decompiled","error":"","elapsed_ms":"4","body_bytes":"69","body_ranges":"20468570-204685b4","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9915","assembly_entry_line":"1162673","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61960},"204683ce":{"address":"204683ce","name":"__calloc_crt","qualified_name":"__calloc_crt","signature":"void * __cdecl __calloc_crt(size_t _Count,size_t _Size);","status":"decompiled","error":"","elapsed_ms":"4","body_bytes":"72","body_ranges":"204683ce-20468415","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9761","assembly_entry_line":"1162517","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61955},"20474372":null,"204743f8":null,"204743f3":null,"20474408":null,"204741c7":{"address":"204741c7","name":"___crtInitCritSecAndSpinCount","qualified_name":"___crtInitCritSecAndSpinCount","signature":"int ___crtInitCritSecAndSpinCount(undefined4 param_1,undefined4 param_2);","status":"decompiled","error":"","elapsed_ms":"14","body_bytes":"147","body_ranges":"204741c7-20474201;20474205-2047424c;2047427c-2047428b","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"6172","assembly_entry_line":"1173451","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62128},"2047450e":null,"204744b3":null,"204744eb":null,"20474539":null,"204685b5":{"address":"204685b5","name":"__SEH_epilog4","qualified_name":"__SEH_epilog4","signature":"void __SEH_epilog4(void);","status":"decompiled","error":"","elapsed_ms":"1","body_bytes":"20","body_ranges":"204685b5-204685c8","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9945","assembly_entry_line":"1162695","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61961},"20467ddb":{"address":"20467ddb","name":"FUN_20467ddb","qualified_name":"FUN_20467ddb","signature":"int FUN_20467ddb(int param_1);","status":"decompiled","error":"","elapsed_ms":"9","body_bytes":"110","body_ranges":"20467ddb-20467e48","is_thunk":"false","source":"DEFAULT","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9349","assembly_entry_line":"1162010","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61941},"2046645f":{"address":"2046645f","name":"__get_osplatform","qualified_name":"__get_osplatform","signature":"undefined4 __get_osplatform(int *param_1);","status":"decompiled","error":"","elapsed_ms":"2","body_bytes":"55","body_ranges":"2046645f-20466495","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"7588","assembly_entry_line":"1159640","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61892},"2046a0d6":{"address":"2046a0d6","name":"__invoke_watson","qualified_name":"__invoke_watson","signature":"void __cdecl __invoke_watson(wchar_t *param_1,wchar_t *param_2,wchar_t *param_3,uint param_4,uintptr_t param_5);","status":"decompiled","error":"","elapsed_ms":"13","body_bytes":"252","body_ranges":"2046a0d6-2046a1d1","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"282","assembly_entry_line":"1165226","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62008},"20467d64":{"address":"20467d64","name":"FUN_20467d64","qualified_name":"FUN_20467d64","signature":"int FUN_20467d64(int param_1);","status":"decompiled","error":"","elapsed_ms":"10","body_bytes":"110","body_ranges":"20467d64-20467dd1","is_thunk":"false","source":"DEFAULT","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9296","assembly_entry_line":"1161965","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61939},"2047427c":null,"20467e35":null,"20467cf8":{"address":"20467cf8","name":"FUN_20467cf8","qualified_name":"FUN_20467cf8","signature":"undefined4 FUN_20467cf8(void);","status":"decompiled","error":"","elapsed_ms":"7","body_bytes":"108","body_ranges":"20467cf8-20467d63","is_thunk":"false","source":"DEFAULT","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9261","assembly_entry_line":"1161911","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61938}};
freeze(directTargetCatalogPins);
const manifestPins: readonly (readonly [string, string, number, string])[] = [
  ["originalStudy","00_Original_Runtime/Game.dll",8228864,"b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f"],
  ["originalStudy","01_Decompiled_Code/Game_dll/full_disassembly.asm",48184406,"fd23430904ab84b03e395bc4a705f5a475cc5816094603350a68e1bc2798f4dc"],
  ["originalStudy","01_Decompiled_Code/Game_dll/functions.csv",19310392,"7683e99c3c22688b26c77eafc830f43abab471b9e9d3ca241e3157007c714018"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00001.c",482456,"73727a66d0484ae618fe57cf486d28719774719685878dc74c45ea1a26093820"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00002.c",480668,"9f92e25231e208700324fc0bb1062ce0bc5c19dfd0e2f00f23a5188692596f1b"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00003.c",461955,"9ff4eee0d041066a9ec32a5e65cb996017f4cfec2418ff306f8dd62fb8f91685"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00004.c",460496,"e75eab5b0ffc30686f2bf54144831a02442e6d06d392834396e84ff6a1c42b5f"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00005.c",563354,"6f95cf0d0c328a67a7a3c693aa332bd566d23ef400e6f77ff8f5cf70fcc27c37"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00006.c",475760,"2cc2334c8b52246aecda46fd2f61e920839f134ea74427d4c81e366fe18105b4"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00007.c",435079,"8a0cfd5391f055fad8e6fb1a5ae74ed3f97fb7cdb003eabfe7892fd207a628b1"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00008.c",514135,"8b73fb9669dadcdd9fdcbdae830a1274f8e9006f07dc607f739adc914a03e2ee"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00009.c",490101,"ce9471c8297f236fbe96b49194716bf19380c1a2f2861e47c60aea4f687834e2"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00010.c",451858,"f93645552c85f2d2abb288cb36b6f94177a729dba9ff732fadd32a2e387f2bbd"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00011.c",432047,"8a1e732ad31bebdfbfda4456c3d89919611f35fa175064efe4e262ff09bf546f"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00012.c",470035,"0b9777da1f8f678a167e4b095dbd05eda3e4a4adf9c7b2ca3f246448c791556f"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00013.c",457193,"2334c1dabf2c743dae80111c3f0290897dc4d5136955688e68293eb9e05b4084"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00014.c",535151,"0774d6e102790966e15688ae447e0dbc026585b6dd9755d352f105f25f3eac41"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00015.c",445202,"61efdb2b8048ce26e7998d6ac091579511482416b2fb82e17535623575f7f308"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00016.c",490468,"16ef8ba23903cc464851be99ab76c01b6760527acedff50474e55041aa419f7b"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00017.c",514180,"20d1668b1c064d87f92d5d6bd06b02904e7d78c9fdb98e64612fe853d5d00d1b"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00018.c",439222,"0c7f643bea6bfa8a79949116b8326851582b24d1ec79329e8e5ea2f27ef634a0"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00019.c",501938,"8a40a3902d4e6729a62a4e9f649bbd82717538898fa4638176e71c623ba806cb"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00020.c",640830,"a4d35c0bc8cfcebae65d69fd6963676870372b7d9c4f705e1d2fd98134f83d39"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00021.c",459866,"2ad8d3518ce82b1c9497803cd8c8083fd34292963f06e643ef5bf094cb5cb8a2"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00022.c",471823,"0a224803066671eea72659606bd42def7a7819236b3121c498d521916bb80960"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00023.c",454400,"457f787611d820b2f6147ce1334be068ba122640d66f2b5592bd6e6d021b899e"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00024.c",522145,"634c4d4719e18259d046fe180f8e41a919e6dc68aa45726628ca63037968ef63"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00025.c",523857,"43ff7b83397186c12534b2de0a34a50c414fb1e713a867a574191cdb6e0322f0"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00026.c",461461,"3eb3eba5488cebe5f596d95347078020e1277eae653073ef64ff2bd24cb07d35"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00027.c",465965,"14de14199866079a5ec0b674923a5c53a6bc25ec6da53e300b4186b75a7b7a0f"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00028.c",525907,"737ffe471cbccd01558461ecfe4ed6724f9b994a7418bdd7939f5f56f9f31d6e"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00029.c",478366,"f02440582155502259015a1a717b4ae732186f3ec80f7375c8666a0b80621553"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00030.c",498737,"141f923c5a64a3231091a0b0d67e92b99475ab0f85fb8b2e1259b97a840ce061"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00031.c",429635,"cf14e1eb51b72f812ad7a957a0bb921020739e875e82a82a8ea39edc1b8e3ad6"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00032.c",584933,"543b4cafc0443cf8637a5ac55979d504e2fe3acd03476386e31b47607017d6aa"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00033.c",434700,"f5d8b630b7279ee36a95f88e38937857a97d4809fad3efdb0ccf394b94be1aa1"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00034.c",509081,"df7536c8d0d94a5995e58b687a7188a2328195802e94b5f398cc2ffcbb47eeef"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00035.c",490887,"8a01dae15e0110cb109f5343f174e57590e4e0137864619bcf44d497bfa9eda7"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00036.c",466740,"d5ef284f2db173ed3db74babd20102013edfd7538ebaf0a067647654c7d0de09"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00037.c",518595,"8924ec46904125997c455348e1aab0fa63d625f0853dbc0572ff183b40eef75b"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00038.c",478028,"0659bf5b2843c4a3ffe2be973794be091f7a546d0c53a9cd414a594ff96a47aa"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00039.c",510203,"3c662ceba9afa70e20c47a054c061862c72be1c3e85b6a08e49d66a5ae63dd70"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00040.c",474689,"1f4e1a7320e23d7a4752b2ebd681bbf52b5ba6849f37c99d65e60647e24045bd"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00041.c",464987,"8b97df6f728fffd25ecb85f2bd2952ccb98d3f19e7c9d203412b61c73519f9dd"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00042.c",511085,"0a612dd82992f0862a0df6702bfa1a80f24c718780778ac153d0f231f7bd31b1"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00043.c",495799,"cd13ec0f8c72a423bf195866dfdcefa848e565aaa21816483c741140edec478a"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00044.c",476121,"3593a482e4232d65585a17de3d5f7e4b65971cbdbc114a95b00dc855d9b33083"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00045.c",486687,"4652e78cde0db4f363d7255de2e0dc4414e00df445c0e34b643afd6a37371469"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00046.c",469373,"71ef4d9a0edbd4d6efcf02dc1172c42e0153cd836056d4c94191f0d45bfdc1b7"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00047.c",398814,"861bb3c097cc8a23a3a0642d7d1f935824b255d9e12924972cbe847b2810a189"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00048.c",519200,"e05b8551a684f1830ab4d0714a6cb4c9c74bfef9593dee0050c5b03b7ffe2c8f"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00049.c",546624,"5a59bbe0270e6a759c0f2715776fc23bb689dcdcf045f2726ce08ad357e3b01e"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00050.c",447804,"4e91824306ff63f73edd041389b1ae5369996130e2c52b46e977dad287cdcd58"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00051.c",464703,"dac58fb9e60755f78c4827ebd9a8f150ddac864ed6fb8b117545f9fb9cd4f7f5"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00052.c",504333,"abc88e351f04125d898e2cab337eef23b588871d85e88d52e2fc8236dd0d9d23"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00053.c",429214,"a87e7906b4a2b36d37c01835c6f0b60c196aeda749eb00923543768234a4b474"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00054.c",521574,"680accb8986dd86cc2548144ba5a151413dedbbaf1d632323099fdbc8abe9632"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00055.c",438319,"ef957b4ac0dd618d3a141354a5e53847a34710ac5d793d7baf721315ea8d99d1"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00056.c",478910,"65fdc40994f25d53590b2d46d7481c43f1488b570d86570dd0c26409085ccd2d"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00057.c",353711,"05b5fdb8abac53f8acb9a887e0789707a7e0c98c57f8a97c41382cabab808533"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00058.c",97894,"0883167a1161c72e9008289dae9a25e39616fb009359b3e532216836a07a1f36"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00059.c",329631,"8c6a34409313377dd4e09e89b7de1723c2b2e116e022c5b55293d04e8475d566"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00060.c",345279,"22beca795e7c05aa64cd6ec2b46f5d16e947d76672bd2ac5a9e39e809bf2cb67"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00061.c",366565,"9b393ff8e71eba370c2373caf8ea258968c645fe5bc89be8aba385af06b8b347"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00062.c",436855,"39bcbbe650926c0b1dd34c81e5232093ba009f0a6de7c0781f834ecfbc5ba9a0"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00063.c",296255,"72bbd25a05414816fc1d2498275226ee6a5afbf8d7d38f2dd70782e7616fe7f6"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00064.c",395014,"4b6b02ded5ed0f5a2f4fb579a5e2073c1def471a68b2a3b5a8f40fbdec48bbb9"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00065.c",408029,"d6a033e1e13c9925826abcc92c40f18bc3ca759f4ecad02412e7e1f71874769f"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00066.c",580681,"e724b2e4e95a4802a549e449bd336ef18f647f3599776c464abcf7c50543348b"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00067.c",313964,"1939730f91f0151b677a56323ab1ad49341ab9c21942bb6554f28e28ab9c6b0a"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00068.c",454739,"29fbc1042e47f5d30405ab6a2571575771fcbed83d88b78b850d85b20302b5a6"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00069.c",437218,"cb7483ff1ae62f8e229faa5b904c44fcde0c946f98804e63640755e4a0f4a8f1"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00070.c",438891,"18192ccdef5eeae50b7f3591b95ed0e034f3c91e86012ee5b992f8677324a81b"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00071.c",393644,"dab0f27cbc1048c0e6cbbd9897ff55c53b30b99f911519db5270c468cf9f564d"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00072.c",420701,"1269ef67e351361a57e76b69103e38bc95981b9d1c63aa84536eeffd71c6affa"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00073.c",392752,"7f06b7f07c53ea91f695235c781566e074f54291164b77961766eabf6571cd23"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00074.c",463784,"5e32dde67a266e00c4943a9813e9fa6b42a90f5068ef3d017f60700dabb35f2e"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00075.c",348689,"f8fc1cb8efac6c14b2cf65d21dfdf4db88acb2326d7563d2d761d2bc213b12de"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00076.c",377642,"78475f81891fa3ea119ad5d49047ea884016283cce7c74a01d32c28cb7a19860"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00077.c",231215,"0e8013f426ce6a762f4302e637c123e81fff773422d690912866cbbcb80040cb"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00078.c",447043,"34b07f8a8c298bca7fe9a7e78400ad814f66d054cee9400154fde4ea0bb5b925"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00079.c",409513,"dc0401a91fe160dccc8adc064f31d25aaa20c743dba663d2338202f3d38e63b8"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00080.c",384443,"1c731b164440bab63b4c08f02bcad8f371d73afe51e417f9f2c284695094dbfc"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00081.c",438329,"6e8f93fa012a8bbd413e41b5e28821b97de48c8b55b9cf3a081ef3418c0af373"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00082.c",438250,"ac06e8f739c0fb2f7ffb75d21cfc0f737a22d097341e1a8c075ea620d21c51e2"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00083.c",451033,"63df47e9e8c902fc6a181612ef49fec0d4f7fe2169fa1427bd548c0d268720c6"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00084.c",427021,"50790589da46f9d60eef74e5efa5c0a956a2529620874b7b2912d76c0d7a519f"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00085.c",414504,"eceb30147d9a1c60a56ac0467923efb6ec62513bad3bef592ef7f00c0d880253"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00086.c",401141,"47c20c2a0b985d22aad98cd89fd0e90298260033818825295fd6effdc4ed2754"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00087.c",386165,"6c32dee68e935fa3ab55177f65c184cb2ce9458f1a4142d5faa5756c6e1e1c28"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00088.c",452134,"f5a5f7e17d8915bfd69d27eacf4f96fd8c9a6e0125395a8d996b07521deb7c9c"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00089.c",652937,"be22f36a59fb71ff47d7235a20e9fe787037c09d5422a85e7fda331eaa61a7f2"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00090.c",404630,"7d64d6d587bebbdfb4862b2c567ec0483829457562a8ed8997ffe79d268e5e5e"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00091.c",388185,"a2ac93703589bc1eac5d04b883a5fd958608e8a7afcbd820232b9e73ce04886b"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00092.c",409153,"f0f693551de80b2338c649ee82c9e30093aecea8690c845f313fef2aa6171cea"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00093.c",394315,"986d47330291110b0247574e631424dba376c7bfd2ad8a2adfc29fa07e4ac222"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00094.c",421991,"863c657c3537ecf59e09441bcc65279ab824c43b7c63f403fb3cfbec54e7e84e"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00095.c",471834,"1a6827c3803a58f4773737e8a3ce554708820bc62eacacc822b49aa6dde976c8"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00096.c",471173,"e19ef318566bb1c5e2db24d44b6a34acd8111c33429974be841db66c82123192"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00097.c",523737,"468dfe2526150ca0b7e090a6c3dfd220bd5d76eb69361f154cd28c82599901cd"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00098.c",415518,"550ab66dc1144dbdd061e1f8f1d0b4ce141df0e2062d9325ac670d05c0a4c26d"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00099.c",1102070,"0339c00ee86e48737df84d67adbdf97b3c1341eecc41da23056c7b27807e0a6a"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00100.c",544043,"d61204db6fa50f4bdfc69f7b1590642010970c0710377f7000f0a93ff295a5dd"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00101.c",363337,"711bf8b924e9ae42646a4b0a59291a4c11ed7a00b509a6ce976be8154d699a32"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00102.c",450646,"cda63f3a7d7bcd85a62c7cd05310f7b9f4b8980376e6720b7b08649d07d41210"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00103.c",400524,"844df2673320f304a140c7c6237b0915f348f5e3f85fa34fa2dfb1e984c0ab45"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00104.c",462431,"0e239fe200a2a80d734ab81a1fa99a8180c319b34b262bd72145a245021d5137"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00105.c",475323,"63419896739fb31ebceee6401cd187ceadb8445ae07b46f1aeb68d9faf1d30da"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00106.c",443385,"37918882b97023593d2da83789d5b242e5e1347c2997c426561a0577784f6084"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00107.c",410619,"64ce1d5d350c548cd9eda7eac78b2280b0927c18c604b6e5f323416df15a0b1e"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00108.c",632246,"156bbc24efd625233fa4e756644fc9c7a1828f2feb96151f14962f83db12999b"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00109.c",478507,"af69f48670b7495a696c0adca0e245088c5da4adab22eacfa167b3548f05f35f"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00110.c",491662,"aca5452fd6b927044d9a93258bfcc7624011ca9cb77df0b9b64f2f19c9236e19"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00111.c",378176,"fbae81b4288df8e6cf8d3aa7791f33349acffab41c48b7a16dfd2e6a9c4ee893"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00112.c",444851,"a2a81c000496fcca9d4d5b02367471d95f9f60bc0b3faa8043c022415c254717"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00113.c",541014,"6ed737f8dbc468169d2b824e9fa46bf8da3d30556341a34f7f120d3c8b37c478"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00114.c",413629,"28cac61ca723052a5e52f3e61bcdb82b151ea4660d64007abbcd4dafcea99aba"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00115.c",413891,"66f2e7b2db0cf9c89fe7a185a7f5c092019c29c396141f9bd05bc5953f4861b9"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00116.c",468760,"f191e77501ae27d599fb79fdaa182f26625d90ec7a84ed9ea8ff1d37e3c10ac6"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00117.c",418204,"2b2bee27c17bec718b69ca0d3b4dfce74bec12237df1f775f89936f4495b69cc"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00118.c",473555,"62695d96f5b1c8b6233e2f51c85965b99deb27c7e9dac1511df1f47bde2d0a4d"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00119.c",385424,"151c1af6eab84d037f3a91916099c73da077095951ca4c1b0e1e018370a7c9ed"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00120.c",455770,"28e8605ef01327556450ad718bf947506a1fe58a74d236f4d7ddbabfcc578d93"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00121.c",573341,"e2df1b6f232bdcb0917a3336a5a4889af1ae96820289b6bc38517eaee3a5348e"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00122.c",460044,"f93aa741f7aaa2389d5f7acf5b194a252bdf6a87e4a1c98a404df09c252eb5f8"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00123.c",384705,"ccc642ae244b74bad6e57ff0de605e5a50f337a3bb426c87a575e9232c163489"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c",317429,"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00125.c",814799,"1543a283a5ce7bbd1473ecd2d442590fd9e66f9369d8f3a5b4bb9b49b919ca51"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00126.c",682719,"3a1acee68ca52274d2801a35ab7733d9adb4c8403aec57edb25fde4cf8dc5b86"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00127.c",633894,"4b319550ee4e86175a9c769520d481450571635f92c0ad9cda2c015f502d7f55"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00128.c",455115,"0c1c58d6e5c51e34659b6555d219c319a6f3e0f153bd5e4ea6239260a996a9d9"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00129.c",501689,"b8c402e909186d6f8fb346508e77c7db6da04f24a0b18c7c9365f174459b3e8f"],
  ["originalStudy","01_Decompiled_Code/Game_dll/pseudocode/functions_00130.c",401019,"5c501e35aafbdc82b4236d52efe339941909f1717866ee65b35ec04027112a24"],
  ["originalStudy","01_Decompiled_Code/Game_dll/symbols.csv",23876963,"4e92a5cb597f91d1c2eb661f171a1bb097175094dc32778bd6058676afea3eac"],
  ["output","README.md",3474,"2e1b296c4afaa05671e3793f35e6e73fe0efa1d3034da550d3f5a5e6b4c2a4d5"],
  ["output","native-evidence.json",241830,"4615d07af3ad39c3fa5bef6bb6743b758a2e29402b79595966b7b35dff607983"],
  ["output","runtime-rules.json",97712,"f9fe0e7b325c17b10f8eaedd5e041168aba50d53d9654f882c1f3a05cef93dc0"],
  ["repo","assets/gothic3/game-attach-continuation/native-evidence.json",417933,"a66aee7be0f74bc690f97dc3fc658f8fc62cf6ed1e824118fb8dd6f8ea1c003c"],
  ["repo","assets/gothic3/game-attach-continuation/runtime-rules.json",69728,"a83230b48ab739986cffa5303d803d03589912b027191e83db82d616c048087f"],
  ["repo","assets/gothic3/game-attach-continuation/source-manifest.json",14791,"6d1a012b9fabb98c33a1e510756cdec9e51e48f87b0a06e1cce0045e11afec56"],
  ["repo","assets/gothic3/game-attach-continuation/sources/Game/20468570.asm.txt",870,"08f4b98324ef7fbbf12b6d6fc120721226addca354bf35dbaea7aa7b7392c2cc"],
  ["repo","assets/gothic3/game-attach-continuation/sources/Game/20468570.c.txt",851,"8b38188825b6cde0ae14f26555b28d5ef27afa2310bcf2ceaf871eda29cad7ac"],
  ["repo","assets/gothic3/game-attach-continuation/sources/Game/204685b5.asm.txt",326,"2d541c84a4793f966ca8426769be866365a9a3179c5af116853a9054de5f9bec"],
  ["repo","assets/gothic3/game-attach-continuation/sources/Game/204685b5.c.txt",357,"5596cfb72be1be0a5999197f4480e4447a566ec8e8a8f015f2dc0dd91fba124e"],
  ["repo","assets/gothic3/game-attach-continuation/sources/Game/204742ff.asm.txt",7093,"49198ad6297171771d955deaf1e62c364743274c9c957ce94717fedb572c4de1"],
  ["repo","assets/gothic3/game-attach-continuation/sources/Game/204742ff.c.txt",4375,"2cc60dfa073fbe1a9834cf43e7dc498b5cab040c2af14c4edf448efcb677fdff"],
  ["repo","assets/gothic3/game-crt/native-evidence.json",845854,"0378ec053fee1df7bf8911efdb27cae7be43010d66bb99af500b7c365cabd94b"],
  ["repo","assets/gothic3/game-crt/runtime-rules.json",186024,"9a3bbb750ec71a1edb13502a26a71ef44a8dcde366f8fd8899553cc85bf4ab86"],
  ["repo","assets/gothic3/game-crt/source-manifest.json",44545,"a3cc65a803fbf1d78f0d4272e4f06d089b969976a400c30144b7dd07765177ca"],
  ["repo","assets/gothic3/game-crt/sources/Game/2046645f.asm.txt",778,"f32a5fa770e0f1e197573f1fa90735628f3d9bf3c3e127094807e17470f12860"],
  ["repo","assets/gothic3/game-crt/sources/Game/2046645f.c.txt",442,"388594fd095d5fda732964c5bc17a4bada960522bc284e79f9e660f588b771be"],
  ["repo","assets/gothic3/game-crt/sources/Game/2046650e.asm.txt",817,"a2bec0c939f2a7d78c81e5e3c8f9a0dca28be814b3b0916d57b91b71afa1922c"],
  ["repo","assets/gothic3/game-crt/sources/Game/2046650e.c.txt",450,"37e09309bcf0677cdea2879a444b06b2a08bf4ce88452c61548e5b3b2c39af60"],
  ["repo","assets/gothic3/game-crt/sources/Game/204677e4.asm.txt",5486,"a4a927878c56cb72459412a96224ed1324905342504443123d43e73ee67864a4"],
  ["repo","assets/gothic3/game-crt/sources/Game/204677e4.c.txt",3071,"b1f50faa5c95a6000ab3a5a99dc38a7a446a3e3434e6ffb69172fb04a092a74a"],
  ["repo","assets/gothic3/game-crt/sources/Game/20467cf8.asm.txt",1634,"1e08d33e79de3c0656e5cdcd1039ee028542fa3f5240c511f6d7e83f53e1b7f2"],
  ["repo","assets/gothic3/game-crt/sources/Game/20467cf8.c.txt",791,"7e86b09ca17f4f4dd67d664b8496e1188334b31304b6ae4e182c04a98794874c"],
  ["repo","assets/gothic3/game-crt/sources/Game/20467d64.asm.txt",1319,"3ab56b2e3ea9eb37a3b5a6356e80707ab1d1404dada0ca259fc40dc780f27ede"],
  ["repo","assets/gothic3/game-crt/sources/Game/20467d64.c.txt",803,"58b8657092c320f9fb9ada4d45b55525faa358d1c34ac077471918c552dab6ea"],
  ["repo","assets/gothic3/game-crt/sources/Game/20467ddb.asm.txt",1319,"e05f3a544429f8b93ee459b497b9bc8db298565c4886e9ff1282bec36ae5a1d3"],
  ["repo","assets/gothic3/game-crt/sources/Game/20467ddb.c.txt",802,"20437957658af00c8b2661951485e6dc1ebe918f77ee0a2dd206801c14c3ac0d"],
  ["repo","assets/gothic3/game-crt/sources/Game/20467e52.asm.txt",212,"1d4b3d5a4d568ccfe2df25757f53c9edef3b3adc8304cada8b7d5c90e54032bd"],
  ["repo","assets/gothic3/game-crt/sources/Game/204681d9.asm.txt",4085,"c5d26169e567d1812eac0aacc35b71b59b9a71422a0528e15bed4eebb8b7f763"],
  ["repo","assets/gothic3/game-crt/sources/Game/204681d9.c.txt",1880,"663dc786ad85503da69e1fc2f5f9a2dc1b46a9dc7866b70a5ec6e8557d2998fc"],
  ["repo","assets/gothic3/game-crt/sources/Game/204741b7.asm.txt",185,"4ffb5409756dc06ee6a81ba028cc6958981b82712077fc3a5c6fb4a96f3b96ce"],
  ["repo","assets/gothic3/game-crt/sources/Game/204741b7.c.txt",321,"86a8687f3418a0fb82166bbb6737922d12796a1646524011054245149327e378"],
  ["repo","assets/gothic3/game-crt/sources/Game/204741c7.asm.txt",1825,"6734485aee03347a8a01abd2e3c67d11476cd8a8030af962277c128be5cf24d9"],
  ["repo","assets/gothic3/game-crt/sources/Game/204741c7.c.txt",1368,"ba58746271a6fe61aecbf69abd12eebc9b69ff3fd7b92839cc573398b6c5b470"],
  ["repo","assets/gothic3/game-crt/sources/Game/2047424d.asm.txt",339,"d1bad19c2537af9aa5189143f6cc45ce6f9780b9c5d3c2108aa4d717c8c74fdd"],
  ["repo","assets/gothic3/game-crt/sources/Game/20474264.asm.txt",287,"405007511562c42d810ee2376fb144e0e8c8cce78f8186df43accccff612e657"],
  ["repo","assets/gothic3/game-io-allocation/native-evidence.json",158686,"d5318037cb3d3d5f669caac2834f79eacfa337ef5b2688a97543e0eea0c35b3e"],
  ["repo","assets/gothic3/game-io-allocation/runtime-rules.json",70419,"6064708dcd0d2b98fe2c6171029b3593516455573482d78e4fca64af9a403a0d"],
  ["repo","assets/gothic3/game-io-allocation/source-manifest.json",30440,"ae407fe7bee57a2291025bd71fd75044d02dd6a7a5e37d1f859aecfad3a96b7f"],
  ["repo","scripts/gothic3_game_io_completion_source.py",27310,"9cddd2aca1135aee6e09acd7ef27a161eeb6ce186aa1ca95f4fecaf68d7505aa"],
  ["repo","tools/gothic3/prepare_crt_undname_source.py",28683,"f7021acfb8820e4c3bad4781a32464807972288240af7c5549cfcaee346cf699"],
  ["repo","tools/gothic3/prepare_runtime_admin_source.py",40500,"31dae731178e61ec02a46c2a517b8743c6b7d2c2ba543db22cacc50c27fc70a1"],
  ["repo","tools/gothic3/read_dialogue_native_evidence.py",11400,"27982125c2dee8c83c1f900ddd70eef7ad0d50dd1b3f5bc0ec40dd85c0127d46"]
];
freeze(manifestPins);
const manifestHeaderPin: Readonly<Record<string, unknown>> = {"schema":"gothic3-game-io-completion-source-manifest-v1","inputs":{"Game":"b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f"},"manifestSelfReferenceExcluded":true,"producerPath":"scripts/gothic3_game_io_completion_source.py","helperPaths":["tools/gothic3/prepare_crt_undname_source.py","tools/gothic3/prepare_runtime_admin_source.py","tools/gothic3/read_dialogue_native_evidence.py"],"sourceOnly":true,"runtimeOwnersImplemented":false,"currentLiveValuesCaptured":false,"wholeIoInitImplemented":false,"wholeExceptionDispatchImplemented":false,"wholeGameAttachOrCrtTraversalImplemented":false,"sourceMetadataGrantsExecution":false};
freeze(manifestHeaderPin);

let admitted = false;
function requireSource(condition: unknown, detail: string): asserts condition {
  if (!condition) throw new Error('Original Game I/O completion source differs: ' + detail);
}
function same(actual: unknown, expected: unknown, detail: string): void {
  requireSource(JSON.stringify(actual) === JSON.stringify(expected), detail);
}
function sourceFlags(value: Readonly<Record<string, unknown>>, detail: string): void {
  requireSource(value.sourceOnly === true && value.runtimeOwnersImplemented === false &&
    value.currentLiveValuesCaptured === false && value.wholeIoInitImplemented === false &&
    value.wholeExceptionDispatchImplemented === false && value.wholeGameAttachOrCrtTraversalImplemented === false &&
    value.sourceMetadataGrantsExecution === false, detail + ' source-only flags');
}
function originalPoint(pin: readonly [string, string, string, number, number]): NativeGameIoInstruction {
  const [va, bytes, instruction, assemblyLine, fileOffset] = pin;
  return Object.freeze({ va, rva: (Number.parseInt(va, 16) - 0x20000000).toString(16),
    fileOffset, bytes, instruction, assemblyLine });
}
function image(label: string): NativeCrtImageReceipt {
  const expected = imagePins[label], receipt = rules.coldGlobals[label] ?? rules.constBytes[label];
  requireSource(expected && receipt, 'unselected canonical image ' + label);
  same(receipt, expected, 'canonical source image ' + label);
  requireSource(receipt.module === 'Game' && receipt.knownMask === 'ff'.repeat(receipt.bytes) &&
    receipt.sourceOnly === true && receipt.runtimeOwnerAdmitted === false && receipt.liveValueCaptured === false &&
    receipt.currentLiveValueCaptured === false && receipt.canonicalImageLabel === label,
    'source image masks/context ' + label);
  return receipt;
}
export function admitGameIoCompletionSource(): void {
  if (admitted) return;
  sourceFlags(rules, 'rules'); sourceFlags(evidence, 'evidence'); sourceFlags(manifest, 'manifest');
  requireSource(rules.schema === 'gothic3-game-io-completion-rules-v1' &&
    evidence.schema === 'gothic3-game-io-completion-evidence-v1' &&
    manifest.schema === 'gothic3-game-io-completion-source-manifest-v1' &&
    rules.inputs.Game === 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' &&
    evidence.inputs['Game.dll'] === rules.inputs.Game, 'schema/original Game');
  requireSource(evidence.originalCatalogSha256 === '7683e99c3c22688b26c77eafc830f43abab471b9e9d3ca241e3157007c714018' &&
    evidence.originalAssemblySha256 === 'fd23430904ab84b03e395bc4a705f5a475cc5816094603350a68e1bc2798f4dc' &&
    evidence.originalSymbolsSha256 === '4e92a5cb597f91d1c2eb661f171a1bb097175094dc32778bd6058676afea3eac', 'original source input hashes');
  same(rules.methods, methodPins, 'five original methods/source refs');
  same(rules.sourceContext, sourceContextPins, '12 original/three noncallable PE contexts');
  same(rules.counts, countsPin, 'original/decoded/active/path counts');
  const { methods: originals, ...auditHeader } = evidence.originalModuleAudit;
  same(auditHeader, auditHeaderPin, 'original PE/ASM/catalog audit header');
  requireSource(originals.length === 12 && Object.keys(rules.methods).length === 5 &&
    Object.keys(rules.sourceContext).length === 15 && originalInstructionPins.length === 703,
    'cataloged source counts');
  let activeRows = 0, activeBytes = 0, totalRows = 0, totalBytes = 0;
  for (const original of originals) {
    const { instructions, ...metadata } = original;
    const expected = originalMethodPins[original.label];
    requireSource(expected && original.entryVA === original.bodyVA, 'original entry/body ' + original.label);
    same(metadata, expected, 'original C/catalog/ASM identity ' + original.label);
    requireSource(instructions.length === original.instructionCount, 'original row count ' + original.label);
    let bytes = 0;
    for (const row of instructions) {
      const pin = originalInstructionPins.find(p => p[0] === row.va);
      requireSource(pin, 'original source point ' + row.va);
      same(row, originalPoint(pin), 'original exact row ' + row.va);
      bytes += row.bytes.length / 2;
      if (Object.hasOwn(methodPins, original.label)) same(row, rules.instructionPoints[row.va], 'active exact row ' + row.va);
    }
    requireSource(bytes === original.bodyByteCount, 'original body bytes ' + original.label);
    for (const extent of original.bodyRanges.split(';')) {
      const parts = extent.split('-'), first = Number.parseInt(parts[0] ?? '', 16), last = Number.parseInt(parts[1] ?? '', 16);
      requireSource(Number.isInteger(first) && Number.isInteger(last), 'original extent ' + original.label);
      let cursor = first;
      for (const row of instructions) {
        const va = Number.parseInt(row.va, 16);
        if (first <= va && va <= last) { requireSource(va === cursor, 'extent row ' + row.va); cursor += row.bytes.length / 2; }
      }
      requireSource(cursor === last + 1, 'extent end ' + original.label);
    }
    totalRows += instructions.length; totalBytes += bytes;
    if (Object.hasOwn(methodPins, original.label)) { activeRows += instructions.length; activeBytes += bytes; }
  }
  requireSource(totalRows === 703 && totalBytes === 2118 && activeRows === 304 && activeBytes === 908 &&
    Object.keys(rules.instructionPoints).length === 304, 'full original/active row counts');
  requireSource(Object.keys(rules.sourceContextInstructionPoints).length === 1, 'caller boundary count');
  const boundaryPin = originalInstructionPins.find(p => p[0] === '204678d3');
  requireSource(boundaryPin, 'original caller TEST pin');
  same(rules.sourceContextInstructionPoints['204678d3'], originalPoint(boundaryPin), 'unexecuted caller TEST');
  requireSource(Object.keys(rules.callSites).length === 15, 'actual call/return point count');
  for (const [label, pc] of Object.entries(callSitePins)) same(rules.callSites[label], rules.instructionPoints[pc], 'call/return ' + label);
  const captured = new Set(originals.flatMap(method => [method.entryVA.slice(2), method.bodyVA.slice(2)]));
  const edges = originals.filter(method => Object.hasOwn(methodPins, method.label)).flatMap(method => method.instructions.flatMap(row => {
    const match = /^(CALL|JMP) 0x([0-9a-f]{8})$/.exec(row.instruction), target = match?.[2];
    if (!target) return [];
    requireSource(Object.hasOwn(directTargetCatalogPins, target), 'direct target ' + target);
    return [{ caller: method.label, row, target, originalCatalog: directTargetCatalogPins[target],
      originalBodyCaptured: captured.has(target), sourceOnly: true, runtimeOwnerAdmitted: false }];
  }));
  same(evidence.directCallAndTailEdges, edges, 'all source direct edges/capture membership');
  requireSource(evidence.directCallCaptureScope ===
    'Membership in twelve cataloged original entry/body source captures; no runtime execution claim', 'direct capture scope');
  same(rules.originalGapSearchSummary, gapPin, 'three genuine catalog/C/ASM gaps');
  const { corpusFiles, ...gapSummary } = evidence.originalGapSearch;
  same(gapSummary, gapPin, 'evidence genuine gap summary');
  const corpus = manifestPins.filter(p => p[0] === 'originalStudy' && p[1].startsWith('01_Decompiled_Code/Game_dll/pseudocode/') &&
    p[1].endsWith('.c')).map(p => ({ path: p[1], bytes: p[2], sha256: p[3] }));
  requireSource(corpus.length === 130, 'complete C gap corpus'); same(corpusFiles, corpus, 'original C gap corpus pins');
  requireSource(Object.keys(rules.coldGlobals).length === 5 && Object.keys(rules.constBytes).length === 1, 'existing image reuse count');
  for (const label of Object.keys(imagePins)) image(label);
  same(rules.imports, importPin, 'eight exact original IATs');
  same(rules.frameLayout, framePin, 'actual relative stack/frame/retirement layout');
  same(rules.declaredCompatibilityABI, abiPin, 'declared normal ABI/source CALL/RET PCs');
  same(rules.currentDependencyRequirements, currentDependencyPin, 'current cache/PTD/private lifetime requirements');
  // Decimal-looking hex keys enumerate first; fixed-width sorting restores VA order.
  const pcs = Object.keys(rules.instructionPoints).sort();
  const span = (a: string, b: string): string[] => pcs.filter(pc => a <= pc && pc <= b);
  const decode = [...span('20467ddb', '20467e0d'), ...span('20467e35', '20467e48')];
  const section = [...span('204741c7', '204741ce'), ...span('20468570', '204685b4'), ...span('204741d3', '204741de'),
    ...decode, ...span('204741e3', '204741e8'), ...span('2047423d', '2047424b'), ...span('2047427c', '20474286'),
    ...span('204685b5', '204685c8'), '2047428b'];
  const prefix = span('2047447f', '204744a2').filter(pc => !(pc >= '20474491' && pc <= '2047449a'));
  const identifier = span('204744a9', '204744b3');
  const slot = [...span('204744b4', '204744da'), '204744dc', '204744e0', ...span('204744eb', '204744f4'), ...section,
    ...span('204744f9', '20474502'), ...span('2047450e', '20474512')];
  const finish = [...span('20474518', '20474526'), '20474539', ...span('204685b5', '204685c8'), '2047453e'];
  const normal = [...slot, ...prefix, ...identifier, ...slot, ...prefix, ...identifier, ...slot, ...finish];
  const nullSlot = [...span('204744b4', '204744c3'), ...span('20474504', '20474512')];
  const headless = [...nullSlot, ...prefix, ...identifier, ...nullSlot, ...prefix, ...identifier, ...nullSlot, ...finish];
  requireSource(decode.length === 25 && section.length === 78 && normal.length === 368 && headless.length === 80, 'selected ledger counts');
  const { instructionAddresses: normalAddresses, ...normalMetadata } = rules.selectedNormalPath;
  same(normalMetadata, normalPathPin, '368/899 expected normal path scope'); same(normalAddresses, normal, 'actual normal source row ledger');
  const { instructionAddresses: nullAddresses, ...nullMetadata } = rules.selectedHeadlessNullPath;
  same(nullMetadata, nullPathPin, '80/611 expected NULL path scope'); same(nullAddresses, headless, 'actual NULL source row ledger');
  for (const field of ['methods', 'instructionPoints', 'sourceContextInstructionPoints', 'callSites', 'coldGlobals', 'constBytes',
    'sourceContext', 'imports', 'sourceDependencies', 'counts', 'selectedNormalPath', 'selectedHeadlessNullPath',
    'frameLayout', 'declaredCompatibilityABI', 'currentDependencyRequirements'] as const) same(rules[field], evidence[field], 'rules/evidence ' + field);
  const { files, ...manifestHeader } = manifest;
  same(manifestHeader, manifestHeaderPin, 'final producer/helpers/source manifest flags');
  requireSource(files.length === 177 && manifestPins.length === 177 &&
    new Set(files.map(row => row.location + ':' + row.path)).size === 177, 'manifest count/uniqueness');
  for (const [location, path, bytes, sha256] of manifestPins) {
    const entries = files.filter(row => row.location === location && row.path === path), entry = entries[0];
    requireSource(entry && entries.length === 1 && entry.bytes === bytes && entry.sha256 === sha256, 'manifest pin ' + path);
  }
  same(rules.sourceDependencies, dependencyPins, 'unchanged prior dependency pins');
  const dependencies = Object.values(rules.sourceDependencies).flatMap(group => Object.values(group));
  requireSource(Object.keys(rules.sourceDependencies).length === 3 && dependencies.length === 9, 'dependency count');
  for (const dependency of dependencies) {
    const pin = manifestPins.find(p => p[0] === 'repo' && p[1] === dependency.path);
    requireSource(pin && dependency.path.startsWith('assets/gothic3/') && !dependency.path.includes('/game-io-completion/'),
      'acyclic prior dependency ' + dependency.path);
    same(dependency, { path: pin[1], bytes: pin[2], sha256: pin[3] }, 'dependency manifest ' + dependency.path);
  }
  admitted = true;
}
/** Full original row or the separate unexecuted caller boundary; no operation grant. */
export function gameIoCompletionInstruction(pc: string): NativeGameIoInstruction {
  admitGameIoCompletionSource();
  requireSource(Object.hasOwn(rules.instructionPoints, pc) || Object.hasOwn(rules.sourceContextInstructionPoints, pc),
    'unselected instruction ' + pc);
  const row = rules.instructionPoints[pc] ?? rules.sourceContextInstructionPoints[pc];
  requireSource(row, 'unselected instruction ' + pc);
  return row;
}
/** Original source bytes of an already existing canonical image label; never live state. */
export function gameIoCompletionImageReceipt(label: string): NativeCrtImageReceipt {
  admitGameIoCompletionSource(); return image(label);
}
export function gameIoCompletionSource(): NativeGameIoCompletionSourceRules {
  admitGameIoCompletionSource(); return rules;
}
