/** Original Game physical calloc and first I/O block source admission.
 * Full contextual source bodies and static path ledgers grant no allocation,
 * frame, heap, image writer, Windows callee or exception-dispatch authority. */
import rulesText from '../../assets/gothic3/game-io-allocation/runtime-rules.json?raw';
import evidenceText from '../../assets/gothic3/game-io-allocation/native-evidence.json?raw';
import manifestText from '../../assets/gothic3/game-io-allocation/source-manifest.json?raw';
import type { NativeGameIoInstruction } from './native-game-crt-io-source';
import type { NativeCrtImageReceipt } from './native-game-crt-profile';

interface SourceMethod {
  readonly module: string; readonly entry: string; readonly body: string; readonly bodyRanges: string;
  readonly instructionCount: number; readonly bodyBytes: number; readonly bodyByteCount: number;
  readonly bodyInstructionBytesSha256: string; readonly entryChain: readonly unknown[];
  readonly sourceRefsRoot: string;
  readonly sourceRefs: Readonly<{ assembly: string; assemblySha256: string; c: string; cSha256: string; cNormalization: string }>;
  readonly sourceOnly: boolean; readonly runtimeOwnerAdmitted: boolean; readonly currentLiveValueCaptured: boolean;
  readonly sourceCGap: boolean; readonly sourceASMGap: boolean; readonly originalCatalogGap: boolean;
}
interface ImageSource extends NativeCrtImageReceipt {
  readonly rva: string; readonly fileOffset: number | null; readonly section: Readonly<Record<string, number>>;
  readonly originalPESection: Readonly<Record<string, unknown>>;
  readonly sourceOnly: boolean; readonly runtimeOwnerAdmitted: boolean; readonly currentLiveValueCaptured: boolean;
}
interface SourceDependency { readonly path: string; readonly bytes: number; readonly sha256: string }
export interface NativeGameIoAllocationSourceRules {
  readonly schema: string; readonly inputs: Readonly<Record<string, string>>;
  readonly methods: Readonly<Record<string, SourceMethod>>;
  readonly instructionPoints: Readonly<Record<string, NativeGameIoInstruction>>;
  readonly callSites: Readonly<Record<string, NativeGameIoInstruction>>;
  readonly coldGlobals: Readonly<Record<string, ImageSource>>;
  readonly constBytes: Readonly<Record<string, ImageSource>>;
  readonly peOnlyCode: Readonly<Record<string, ImageSource & Readonly<Record<string, unknown>>>>;
  readonly imports: Readonly<{ Game: readonly Readonly<{ iatVA: string; module: string; name: string; ordinal: number | null }>[] }>;
  readonly sourceDependencies: Readonly<Record<string, Readonly<Record<string, SourceDependency>>>>;
  readonly selectedNormalPath: Readonly<Record<string, unknown>>;
  readonly frameLayout: Readonly<Record<string, unknown>>;
  readonly declaredCompatibilityABI: Readonly<Record<string, unknown>>;
  readonly ioRecordLayout: Readonly<Record<string, unknown>>;
  readonly originalGapSearchSummary: Readonly<Record<string, unknown>>;
  readonly sourceOnly: boolean; readonly runtimeOwnersImplemented: boolean; readonly currentLiveValuesCaptured: boolean;
  readonly wholeIoInitImplemented: boolean; readonly wholeExceptionDispatchImplemented: boolean;
  readonly wholeGameAttachOrCrtTraversalImplemented: boolean; readonly sourceMetadataGrantsExecution: boolean;
}
interface OriginalMethod {
  readonly label: string; readonly entryVA: string; readonly bodyVA: string; readonly bodyRanges: string;
  readonly instructionCount: number; readonly bodyByteCount: number; readonly bodyInstructionBytesSha256: string;
  readonly entryChain: readonly unknown[]; readonly instructions: readonly NativeGameIoInstruction[];
  readonly originalCatalog: Readonly<Record<string, unknown>>;
  readonly reconstructedC: Readonly<{ path: string; sha256: string; line: number; status: string }>;
  readonly sourceRefs: SourceMethod['sourceRefs']; readonly sourceRefsRoot: string;
  readonly sourceOnly: boolean; readonly runtimeOwnerAdmitted: boolean; readonly currentLiveValueCaptured: boolean;
  readonly sourceCGap: boolean; readonly sourceASMGap: boolean; readonly originalCatalogGap: boolean;
}
const rules = JSON.parse(rulesText) as NativeGameIoAllocationSourceRules;
const evidence = JSON.parse(evidenceText) as NativeGameIoAllocationSourceRules & {
  readonly originalModuleAudit: Readonly<{ module: string; inputSha256: string; functionsCsvSha256: string;
    assemblySha256: string; verifiedAgainstOriginalPE: boolean; methods: readonly OriginalMethod[] }>;
  readonly originalCatalogSha256: string; readonly originalAssemblySha256: string; readonly originalSymbolsSha256: string;
  readonly originalGapSearch: Readonly<Record<string, unknown>> & Readonly<{
    corpusFiles: readonly Readonly<{ path: string; bytes: number; sha256: string }>[] }>;
  readonly directCallCaptureScope: string;
  readonly directCallAndTailEdges: readonly Readonly<{ caller: string; row: NativeGameIoInstruction; target: string;
    originalCatalog: Readonly<Record<string, unknown>> | null; originalBodyCaptured: boolean;
    sourceOnly: boolean; runtimeOwnerAdmitted: boolean }>[];
};
const manifest = JSON.parse(manifestText) as NativeGameIoAllocationSourceRules & {
  readonly manifestSelfReferenceExcluded: boolean; readonly producerPath: string; readonly helperPaths: readonly string[];
  readonly files: readonly Readonly<{ location: string; path: string; bytes: number; sha256: string }>[];
};
function freeze(value: unknown): void {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
}
freeze(rules); freeze(evidence); freeze(manifest);
const gameHash = 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f';
const assemblyHash = 'fd23430904ab84b03e395bc4a705f5a475cc5816094603350a68e1bc2798f4dc';
const catalogHash = '7683e99c3c22688b26c77eafc830f43abab471b9e9d3ca241e3157007c714018';
const symbolsHash = '4e92a5cb597f91d1c2eb661f171a1bb097175094dc32778bd6058676afea3eac';
const methodPins = {"callocCrt":{"module":"Game","entry":"204683ce","body":"204683ce","bodyRanges":"204683ce-20468415","instructionCount":26,"bodyBytes":72,"bodyByteCount":72,"bodyInstructionBytesSha256":"92a4fc166b55ef1e2f23fc4df51b8637d0801738d9d3b2f8433eb62979f0680f","entryChain":[],"sourceRefs":{"assembly":"sources/Game/204683ce.asm.txt","assemblySha256":"cd442e9424f49bd1777c09b465f91c27d4afe0ca2a3e6639694bf9d9a4d4aadd","c":"sources/Game/204683ce.c.txt","cSha256":"9c972ef219c62feced6baf23894b506500e76a988c0c96ab5be12d5af84fea44","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false},"callocImpl":{"module":"Game","entry":"20477c2a","body":"20477c2a","bodyRanges":"20477c2a-20477d20;20477d2f-20477d47","instructionCount":93,"bodyBytes":272,"bodyByteCount":272,"bodyInstructionBytesSha256":"1f4288c311bb2f0a738395ef8b580a92e10818c93bd0f3423218885db3b95b7c","entryChain":[],"sourceRefs":{"assembly":"sources/Game/20477c2a.asm.txt","assemblySha256":"204c9076c506c6fd69fd81264792ec536c05a973142dcbfa79b906a4208ded98","c":"sources/Game/20477c2a.c.txt","cSha256":"52be9459a10e1152c95c809a042873862b87ee61e8fc1de8b517f47dca951120","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-crt","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false},"sehProlog4":{"module":"Game","entry":"20468570","body":"20468570","bodyRanges":"20468570-204685b4","instructionCount":21,"bodyBytes":69,"bodyByteCount":69,"bodyInstructionBytesSha256":"0a3e894695f99ac271fa039cc7153c7cdd9e3a92758aa39483cadf68e7e029f1","entryChain":[],"sourceRefs":{"assembly":"sources/Game/20468570.asm.txt","assemblySha256":"08f4b98324ef7fbbf12b6d6fc120721226addca354bf35dbaea7aa7b7392c2cc","c":"sources/Game/20468570.c.txt","cSha256":"8b38188825b6cde0ae14f26555b28d5ef27afa2310bcf2ceaf871eda29cad7ac","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-attach-continuation","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false},"sehEpilog4":{"module":"Game","entry":"204685b5","body":"204685b5","bodyRanges":"204685b5-204685c8","instructionCount":11,"bodyBytes":20,"bodyByteCount":20,"bodyInstructionBytesSha256":"39142b8d79823b8b3c0dd534ee99caf6c8cce4347b7608cfc004a14c873f7411","entryChain":[],"sourceRefs":{"assembly":"sources/Game/204685b5.asm.txt","assemblySha256":"2d541c84a4793f966ca8426769be866365a9a3179c5af116853a9054de5f9bec","c":"sources/Game/204685b5.c.txt","cSha256":"5596cfb72be1be0a5999197f4480e4447a566ec8e8a8f015f2dc0dd91fba124e","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-attach-continuation","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false},"ioInit":{"module":"Game","entry":"204742ff","body":"204742ff","bodyRanges":"204742ff-20474527;20474536-2047453e","instructionCount":186,"bodyBytes":562,"bodyByteCount":562,"bodyInstructionBytesSha256":"eb6d483cbc0cdb9286f65cbe9fa791601334ad2806380b84240c29b504883fcf","entryChain":[],"sourceRefs":{"assembly":"sources/Game/204742ff.asm.txt","assemblySha256":"49198ad6297171771d955deaf1e62c364743274c9c957ce94717fedb572c4de1","c":"sources/Game/204742ff.c.txt","cSha256":"2cc60dfa073fbe1a9834cf43e7dc498b5cab040c2af14c4edf448efcb677fdff","cNormalization":"rstrip-line-whitespace; LF line endings; final newline"},"sourceRefsRoot":"assets/gothic3/game-attach-continuation","sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"sourceCGap":false,"sourceASMGap":false,"originalCatalogGap":false}};
const methodContextPins: Readonly<Record<string, Readonly<{ originalCatalog: Readonly<Record<string, unknown>>; reconstructedC: unknown }>>> = {"callocCrt":{"originalCatalog":{"address":"204683ce","name":"__calloc_crt","qualified_name":"__calloc_crt","signature":"void * __cdecl __calloc_crt(size_t _Count,size_t _Size);","status":"decompiled","error":"","elapsed_ms":"4","body_bytes":"72","body_ranges":"204683ce-20468415","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9761","assembly_entry_line":"1162517","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61955},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9761,"status":"decompiled"}},"callocImpl":{"originalCatalog":{"address":"20477c2a","name":"__calloc_impl","qualified_name":"__calloc_impl","signature":"void * __calloc_impl(uint param_1,uint param_2,undefined4 *param_3);","status":"decompiled","error":"","elapsed_ms":"15","body_bytes":"272","body_ranges":"20477c2a-20477d20;20477d2f-20477d47","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"9814","assembly_entry_line":"1178989","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62189},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00125.c","sha256":"1543a283a5ce7bbd1473ecd2d442590fd9e66f9369d8f3a5b4bb9b49b919ca51","line":9814,"status":"decompiled"}},"sehProlog4":{"originalCatalog":{"address":"20468570","name":"__SEH_prolog4","qualified_name":"__SEH_prolog4","signature":"void __SEH_prolog4(undefined4 param_1,int param_2);","status":"decompiled","error":"","elapsed_ms":"4","body_bytes":"69","body_ranges":"20468570-204685b4","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9915","assembly_entry_line":"1162673","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61960},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9915,"status":"decompiled"}},"sehEpilog4":{"originalCatalog":{"address":"204685b5","name":"__SEH_epilog4","qualified_name":"__SEH_epilog4","signature":"void __SEH_epilog4(void);","status":"decompiled","error":"","elapsed_ms":"1","body_bytes":"20","body_ranges":"204685b5-204685c8","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9945","assembly_entry_line":"1162695","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61961},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c","sha256":"ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e","line":9945,"status":"decompiled"}},"ioInit":{"originalCatalog":{"address":"204742ff","name":"__ioinit","qualified_name":"__ioinit","signature":"int __cdecl __ioinit(void);","status":"decompiled","error":"","elapsed_ms":"32","body_bytes":"562","body_ranges":"204742ff-20474527;20474536-2047453e","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"6253","assembly_entry_line":"1173528","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62131},"reconstructedC":{"path":"01_Decompiled_Code/Game_dll/pseudocode/functions_00125.c","sha256":"1543a283a5ce7bbd1473ecd2d442590fd9e66f9369d8f3a5b4bb9b49b919ca51","line":6253,"status":"decompiled"}}};
const instructionPins: readonly (readonly [string, string, string, number])[] = [
  ["204683ce","56","PUSH ESI",1162517],
  ["204683cf","57","PUSH EDI",1162518],
  ["204683d0","33f6","XOR ESI,ESI",1162519],
  ["204683d2","6a00","PUSH 0x0",1162521],
  ["204683d4","ff742414","PUSH dword ptr [ESP + 0x14]",1162522],
  ["204683d8","ff742414","PUSH dword ptr [ESP + 0x14]",1162523],
  ["204683dc","e849f80000","CALL 0x20477c2a",1162524],
  ["204683e1","8bf8","MOV EDI,EAX",1162525],
  ["204683e3","83c40c","ADD ESP,0xc",1162526],
  ["204683e6","85ff","TEST EDI,EDI",1162527],
  ["204683e8","7527","JNZ 0x20468411",1162528],
  ["204683ea","3905940a7d20","CMP dword ptr [0x207d0a94],EAX",1162529],
  ["204683f0","761f","JBE 0x20468411",1162530],
  ["204683f2","56","PUSH ESI",1162531],
  ["204683f3","ff158c7c7d20","CALL dword ptr [0x207d7c8c]",1162532],
  ["204683f9","8d86e8030000","LEA EAX,[ESI + 0x3e8]",1162533],
  ["204683ff","3b05940a7d20","CMP EAX,dword ptr [0x207d0a94]",1162534],
  ["20468405","7603","JBE 0x2046840a",1162535],
  ["20468407","83c8ff","OR EAX,0xffffffff",1162536],
  ["2046840a","83f8ff","CMP EAX,-0x1",1162538],
  ["2046840d","8bf0","MOV ESI,EAX",1162539],
  ["2046840f","75c1","JNZ 0x204683d2",1162540],
  ["20468411","8bc7","MOV EAX,EDI",1162542],
  ["20468413","5f","POP EDI",1162543],
  ["20468414","5e","POP ESI",1162544],
  ["20468415","c3","RET",1162545],
  ["20468570","6800864620","PUSH 0x20468600",1162673],
  ["20468575","64ff3500000000","PUSH dword ptr FS:[0x0]",1162674],
  ["2046857c","8b442410","MOV EAX,dword ptr [ESP + 0x10]",1162675],
  ["20468580","896c2410","MOV dword ptr [ESP + 0x10],EBP",1162676],
  ["20468584","8d6c2410","LEA EBP,[ESP + 0x10]",1162677],
  ["20468588","2be0","SUB ESP,EAX",1162678],
  ["2046858a","53","PUSH EBX",1162679],
  ["2046858b","56","PUSH ESI",1162680],
  ["2046858c","57","PUSH EDI",1162681],
  ["2046858d","a114237b20","MOV EAX,[0x207b2314]",1162682],
  ["20468592","3145fc","XOR dword ptr [EBP + -0x4],EAX",1162683],
  ["20468595","33c5","XOR EAX,EBP",1162684],
  ["20468597","50","PUSH EAX",1162685],
  ["20468598","8965e8","MOV dword ptr [EBP + -0x18],ESP",1162686],
  ["2046859b","ff75f8","PUSH dword ptr [EBP + -0x8]",1162687],
  ["2046859e","8b45fc","MOV EAX,dword ptr [EBP + -0x4]",1162688],
  ["204685a1","c745fcfeffffff","MOV dword ptr [EBP + -0x4],0xfffffffe",1162689],
  ["204685a8","8945f8","MOV dword ptr [EBP + -0x8],EAX",1162690],
  ["204685ab","8d45f0","LEA EAX,[EBP + -0x10]",1162691],
  ["204685ae","64a300000000","MOV FS:[0x0],EAX",1162692],
  ["204685b4","c3","RET",1162693],
  ["204685b5","8b4df0","MOV ECX,dword ptr [EBP + -0x10]",1162695],
  ["204685b8","64890d00000000","MOV dword ptr FS:[0x0],ECX",1162696],
  ["204685bf","59","POP ECX",1162697],
  ["204685c0","5f","POP EDI",1162698],
  ["204685c1","5f","POP EDI",1162699],
  ["204685c2","5e","POP ESI",1162700],
  ["204685c3","5b","POP EBX",1162701],
  ["204685c4","8be5","MOV ESP,EBP",1162702],
  ["204685c6","5d","POP EBP",1162703],
  ["204685c7","51","PUSH ECX",1162704],
  ["204685c8","c3","RET",1162705],
  ["204742ff","6a54","PUSH 0x54",1173528],
  ["20474301","68908e6e20","PUSH 0x206e8e90",1173529],
  ["20474306","e86542ffff","CALL 0x20468570",1173530],
  ["2047430b","33ff","XOR EDI,EDI",1173531],
  ["2047430d","897dfc","MOV dword ptr [EBP + -0x4],EDI",1173532],
  ["20474310","8d459c","LEA EAX,[EBP + -0x64]",1173533],
  ["20474313","50","PUSH EAX",1173534],
  ["20474314","ff151c7c7d20","CALL dword ptr [0x207d7c1c]",1173535],
  ["2047431a","c745fcfeffffff","MOV dword ptr [EBP + -0x4],0xfffffffe",1173536],
  ["20474321","6a38","PUSH 0x38",1173537],
  ["20474323","6a20","PUSH 0x20",1173538],
  ["20474325","5e","POP ESI",1173539],
  ["20474326","56","PUSH ESI",1173540],
  ["20474327","e8a240ffff","CALL 0x204683ce",1173541],
  ["2047432c","59","POP ECX",1173542],
  ["2047432d","59","POP ECX",1173543],
  ["2047432e","3bc7","CMP EAX,EDI",1173544],
  ["20474330","0f8400020000","JZ 0x20474536",1173545],
  ["20474336","a3202a7d20","MOV [0x207d2a20],EAX",1173546],
  ["2047433b","8935c4297d20","MOV dword ptr [0x207d29c4],ESI",1173547],
  ["20474341","8d8800070000","LEA ECX,[EAX + 0x700]",1173548],
  ["20474347","eb29","JMP 0x20474372",1173549],
  ["20474349","c6400400","MOV byte ptr [EAX + 0x4],0x0",1173551],
  ["2047434d","8308ff","OR dword ptr [EAX],0xffffffff",1173552],
  ["20474350","c640050a","MOV byte ptr [EAX + 0x5],0xa",1173553],
  ["20474354","897808","MOV dword ptr [EAX + 0x8],EDI",1173554],
  ["20474357","c6402400","MOV byte ptr [EAX + 0x24],0x0",1173555],
  ["2047435b","c640250a","MOV byte ptr [EAX + 0x25],0xa",1173556],
  ["2047435f","c640260a","MOV byte ptr [EAX + 0x26],0xa",1173557],
  ["20474363","83c038","ADD EAX,0x38",1173558],
  ["20474366","8b0d202a7d20","MOV ECX,dword ptr [0x207d2a20]",1173559],
  ["2047436c","81c100070000","ADD ECX,0x700",1173560],
  ["20474372","3bc1","CMP EAX,ECX",1173562],
  ["20474374","72d3","JC 0x20474349",1173563],
  ["20474376","66397dce","CMP word ptr [EBP + -0x32],DI",1173564],
  ["2047437a","0f84fd000000","JZ 0x2047447d",1173565],
  ["20474380","8b45d0","MOV EAX,dword ptr [EBP + -0x30]",1173566],
  ["20474383","3bc7","CMP EAX,EDI",1173567],
  ["20474385","0f84f2000000","JZ 0x2047447d",1173568],
  ["2047438b","8b38","MOV EDI,dword ptr [EAX]",1173569],
  ["2047438d","8d5804","LEA EBX,[EAX + 0x4]",1173570],
  ["20474390","8d043b","LEA EAX,[EBX + EDI*0x1]",1173571],
  ["20474393","8945e4","MOV dword ptr [EBP + -0x1c],EAX",1173572],
  ["20474396","b800080000","MOV EAX,0x800",1173573],
  ["2047439b","3bf8","CMP EDI,EAX",1173574],
  ["2047439d","7c02","JL 0x204743a1",1173575],
  ["2047439f","8bf8","MOV EDI,EAX",1173576],
  ["204743a1","33f6","XOR ESI,ESI",1173578],
  ["204743a3","46","INC ESI",1173579],
  ["204743a4","eb52","JMP 0x204743f8",1173580],
  ["204743a6","6a38","PUSH 0x38",1173582],
  ["204743a8","6a20","PUSH 0x20",1173583],
  ["204743aa","e81f40ffff","CALL 0x204683ce",1173584],
  ["204743af","59","POP ECX",1173585],
  ["204743b0","59","POP ECX",1173586],
  ["204743b1","85c0","TEST EAX,EAX",1173587],
  ["204743b3","744d","JZ 0x20474402",1173588],
  ["204743b5","8d0cb5202a7d20","LEA ECX,[ESI*0x4 + 0x207d2a20]",1173589],
  ["204743bc","8901","MOV dword ptr [ECX],EAX",1173590],
  ["204743be","8305c4297d2020","ADD dword ptr [0x207d29c4],0x20",1173591],
  ["204743c5","8d9000070000","LEA EDX,[EAX + 0x700]",1173592],
  ["204743cb","eb26","JMP 0x204743f3",1173593],
  ["204743cd","c6400400","MOV byte ptr [EAX + 0x4],0x0",1173595],
  ["204743d1","8308ff","OR dword ptr [EAX],0xffffffff",1173596],
  ["204743d4","c640050a","MOV byte ptr [EAX + 0x5],0xa",1173597],
  ["204743d8","83600800","AND dword ptr [EAX + 0x8],0x0",1173598],
  ["204743dc","80602480","AND byte ptr [EAX + 0x24],0x80",1173599],
  ["204743e0","c640250a","MOV byte ptr [EAX + 0x25],0xa",1173600],
  ["204743e4","c640260a","MOV byte ptr [EAX + 0x26],0xa",1173601],
  ["204743e8","83c038","ADD EAX,0x38",1173602],
  ["204743eb","8b11","MOV EDX,dword ptr [ECX]",1173603],
  ["204743ed","81c200070000","ADD EDX,0x700",1173604],
  ["204743f3","3bc2","CMP EAX,EDX",1173606],
  ["204743f5","72d6","JC 0x204743cd",1173607],
  ["204743f7","46","INC ESI",1173608],
  ["204743f8","393dc4297d20","CMP dword ptr [0x207d29c4],EDI",1173610],
  ["204743fe","7ca6","JL 0x204743a6",1173611],
  ["20474400","eb06","JMP 0x20474408",1173612],
  ["20474402","8b3dc4297d20","MOV EDI,dword ptr [0x207d29c4]",1173614],
  ["20474408","8365e000","AND dword ptr [EBP + -0x20],0x0",1173616],
  ["2047440c","85ff","TEST EDI,EDI",1173617],
  ["2047440e","7e6d","JLE 0x2047447d",1173618],
  ["20474410","8b45e4","MOV EAX,dword ptr [EBP + -0x1c]",1173620],
  ["20474413","8b08","MOV ECX,dword ptr [EAX]",1173621],
  ["20474415","83f9ff","CMP ECX,-0x1",1173622],
  ["20474418","7456","JZ 0x20474470",1173623],
  ["2047441a","83f9fe","CMP ECX,-0x2",1173624],
  ["2047441d","7451","JZ 0x20474470",1173625],
  ["2047441f","8a03","MOV AL,byte ptr [EBX]",1173626],
  ["20474421","a801","TEST AL,0x1",1173627],
  ["20474423","744b","JZ 0x20474470",1173628],
  ["20474425","a808","TEST AL,0x8",1173629],
  ["20474427","750b","JNZ 0x20474434",1173630],
  ["20474429","51","PUSH ECX",1173631],
  ["2047442a","ff15187c7d20","CALL dword ptr [0x207d7c18]",1173632],
  ["20474430","85c0","TEST EAX,EAX",1173633],
  ["20474432","743c","JZ 0x20474470",1173634],
  ["20474434","8b75e0","MOV ESI,dword ptr [EBP + -0x20]",1173636],
  ["20474437","8bc6","MOV EAX,ESI",1173637],
  ["20474439","c1f805","SAR EAX,0x5",1173638],
  ["2047443c","83e61f","AND ESI,0x1f",1173639],
  ["2047443f","6bf638","IMUL ESI,ESI,0x38",1173640],
  ["20474442","033485202a7d20","ADD ESI,dword ptr [EAX*0x4 + 0x207d2a20]",1173641],
  ["20474449","8b45e4","MOV EAX,dword ptr [EBP + -0x1c]",1173642],
  ["2047444c","8b00","MOV EAX,dword ptr [EAX]",1173643],
  ["2047444e","8906","MOV dword ptr [ESI],EAX",1173644],
  ["20474450","8a03","MOV AL,byte ptr [EBX]",1173645],
  ["20474452","884604","MOV byte ptr [ESI + 0x4],AL",1173646],
  ["20474455","68a00f0000","PUSH 0xfa0",1173647],
  ["2047445a","8d460c","LEA EAX,[ESI + 0xc]",1173648],
  ["2047445d","50","PUSH EAX",1173649],
  ["2047445e","e864fdffff","CALL 0x204741c7",1173650],
  ["20474463","59","POP ECX",1173651],
  ["20474464","59","POP ECX",1173652],
  ["20474465","85c0","TEST EAX,EAX",1173653],
  ["20474467","0f84c9000000","JZ 0x20474536",1173654],
  ["2047446d","ff4608","INC dword ptr [ESI + 0x8]",1173655],
  ["20474470","ff45e0","INC dword ptr [EBP + -0x20]",1173657],
  ["20474473","43","INC EBX",1173658],
  ["20474474","8345e404","ADD dword ptr [EBP + -0x1c],0x4",1173659],
  ["20474478","397de0","CMP dword ptr [EBP + -0x20],EDI",1173660],
  ["2047447b","7c93","JL 0x20474410",1173661],
  ["2047447d","33db","XOR EBX,EBX",1173663],
  ["2047447f","8bf3","MOV ESI,EBX",1173665],
  ["20474481","6bf638","IMUL ESI,ESI,0x38",1173666],
  ["20474484","0335202a7d20","ADD ESI,dword ptr [0x207d2a20]",1173667],
  ["2047448a","8b06","MOV EAX,dword ptr [ESI]",1173668],
  ["2047448c","83f8ff","CMP EAX,-0x1",1173669],
  ["2047448f","740b","JZ 0x2047449c",1173670],
  ["20474491","83f8fe","CMP EAX,-0x2",1173671],
  ["20474494","7406","JZ 0x2047449c",1173672],
  ["20474496","804e0480","OR byte ptr [ESI + 0x4],0x80",1173673],
  ["2047449a","eb72","JMP 0x2047450e",1173674],
  ["2047449c","c6460481","MOV byte ptr [ESI + 0x4],0x81",1173676],
  ["204744a0","85db","TEST EBX,EBX",1173677],
  ["204744a2","7505","JNZ 0x204744a9",1173678],
  ["204744a4","6af6","PUSH -0xa",1173679],
  ["204744a6","58","POP EAX",1173680],
  ["204744a7","eb0a","JMP 0x204744b3",1173681],
  ["204744a9","8bc3","MOV EAX,EBX",1173683],
  ["204744ab","48","DEC EAX",1173684],
  ["204744ac","f7d8","NEG EAX",1173685],
  ["204744ae","1bc0","SBB EAX,EAX",1173686],
  ["204744b0","83c0f5","ADD EAX,-0xb",1173687],
  ["204744b3","50","PUSH EAX",1173689],
  ["204744b4","ff15bc7b7d20","CALL dword ptr [0x207d7bbc]",1173690],
  ["204744ba","8bf8","MOV EDI,EAX",1173691],
  ["204744bc","83ffff","CMP EDI,-0x1",1173692],
  ["204744bf","7443","JZ 0x20474504",1173693],
  ["204744c1","85ff","TEST EDI,EDI",1173694],
  ["204744c3","743f","JZ 0x20474504",1173695],
  ["204744c5","57","PUSH EDI",1173696],
  ["204744c6","ff15187c7d20","CALL dword ptr [0x207d7c18]",1173697],
  ["204744cc","85c0","TEST EAX,EAX",1173698],
  ["204744ce","7434","JZ 0x20474504",1173699],
  ["204744d0","893e","MOV dword ptr [ESI],EDI",1173700],
  ["204744d2","25ff000000","AND EAX,0xff",1173701],
  ["204744d7","83f802","CMP EAX,0x2",1173702],
  ["204744da","7506","JNZ 0x204744e2",1173703],
  ["204744dc","804e0440","OR byte ptr [ESI + 0x4],0x40",1173704],
  ["204744e0","eb09","JMP 0x204744eb",1173705],
  ["204744e2","83f803","CMP EAX,0x3",1173707],
  ["204744e5","7504","JNZ 0x204744eb",1173708],
  ["204744e7","804e0408","OR byte ptr [ESI + 0x4],0x8",1173709],
  ["204744eb","68a00f0000","PUSH 0xfa0",1173711],
  ["204744f0","8d460c","LEA EAX,[ESI + 0xc]",1173712],
  ["204744f3","50","PUSH EAX",1173713],
  ["204744f4","e8cefcffff","CALL 0x204741c7",1173714],
  ["204744f9","59","POP ECX",1173715],
  ["204744fa","59","POP ECX",1173716],
  ["204744fb","85c0","TEST EAX,EAX",1173717],
  ["204744fd","7437","JZ 0x20474536",1173718],
  ["204744ff","ff4608","INC dword ptr [ESI + 0x8]",1173719],
  ["20474502","eb0a","JMP 0x2047450e",1173720],
  ["20474504","804e0440","OR byte ptr [ESI + 0x4],0x40",1173722],
  ["20474508","c706feffffff","MOV dword ptr [ESI],0xfffffffe",1173723],
  ["2047450e","43","INC EBX",1173725],
  ["2047450f","83fb03","CMP EBX,0x3",1173726],
  ["20474512","0f8c67ffffff","JL 0x2047447f",1173727],
  ["20474518","ff35c4297d20","PUSH dword ptr [0x207d29c4]",1173728],
  ["2047451e","ff15147c7d20","CALL dword ptr [0x207d7c14]",1173729],
  ["20474524","33c0","XOR EAX,EAX",1173730],
  ["20474526","eb11","JMP 0x20474539",1173731],
  ["20474536","83c8ff","OR EAX,0xffffffff",1173733],
  ["20474539","e87740ffff","CALL 0x204685b5",1173735],
  ["2047453e","c3","RET",1173736],
  ["20477c2a","6a0c","PUSH 0xc",1178989],
  ["20477c2c","68988f6e20","PUSH 0x206e8f98",1178990],
  ["20477c31","e83a09ffff","CALL 0x20468570",1178991],
  ["20477c36","8b4d08","MOV ECX,dword ptr [EBP + 0x8]",1178992],
  ["20477c39","33ff","XOR EDI,EDI",1178993],
  ["20477c3b","3bcf","CMP ECX,EDI",1178994],
  ["20477c3d","762e","JBE 0x20477c6d",1178995],
  ["20477c3f","6ae0","PUSH -0x20",1178996],
  ["20477c41","58","POP EAX",1178997],
  ["20477c42","33d2","XOR EDX,EDX",1178998],
  ["20477c44","f7f1","DIV ECX",1178999],
  ["20477c46","3b450c","CMP EAX,dword ptr [EBP + 0xc]",1179000],
  ["20477c49","1bc0","SBB EAX,EAX",1179001],
  ["20477c4b","40","INC EAX",1179002],
  ["20477c4c","751f","JNZ 0x20477c6d",1179003],
  ["20477c4e","e82f26ffff","CALL 0x2046a282",1179004],
  ["20477c53","c7000c000000","MOV dword ptr [EAX],0xc",1179005],
  ["20477c59","57","PUSH EDI",1179006],
  ["20477c5a","57","PUSH EDI",1179007],
  ["20477c5b","57","PUSH EDI",1179008],
  ["20477c5c","57","PUSH EDI",1179009],
  ["20477c5d","57","PUSH EDI",1179010],
  ["20477c5e","e8a725ffff","CALL 0x2046a20a",1179011],
  ["20477c63","83c414","ADD ESP,0x14",1179012],
  ["20477c66","33c0","XOR EAX,EAX",1179014],
  ["20477c68","e9d5000000","JMP 0x20477d42",1179015],
  ["20477c6d","0faf4d0c","IMUL ECX,dword ptr [EBP + 0xc]",1179017],
  ["20477c71","8bf1","MOV ESI,ECX",1179018],
  ["20477c73","897508","MOV dword ptr [EBP + 0x8],ESI",1179019],
  ["20477c76","3bf7","CMP ESI,EDI",1179020],
  ["20477c78","7503","JNZ 0x20477c7d",1179021],
  ["20477c7a","33f6","XOR ESI,ESI",1179022],
  ["20477c7c","46","INC ESI",1179023],
  ["20477c7d","33db","XOR EBX,EBX",1179025],
  ["20477c7f","895de4","MOV dword ptr [EBP + -0x1c],EBX",1179026],
  ["20477c82","83fee0","CMP ESI,-0x20",1179027],
  ["20477c85","7769","JA 0x20477cf0",1179028],
  ["20477c87","833d58167d2003","CMP dword ptr [0x207d1658],0x3",1179029],
  ["20477c8e","754b","JNZ 0x20477cdb",1179030],
  ["20477c90","83c60f","ADD ESI,0xf",1179031],
  ["20477c93","83e6f0","AND ESI,0xfffffff0",1179032],
  ["20477c96","89750c","MOV dword ptr [EBP + 0xc],ESI",1179033],
  ["20477c99","8b4508","MOV EAX,dword ptr [EBP + 0x8]",1179034],
  ["20477c9c","3b0548167d20","CMP EAX,dword ptr [0x207d1648]",1179035],
  ["20477ca2","7737","JA 0x20477cdb",1179036],
  ["20477ca4","6a04","PUSH 0x4",1179037],
  ["20477ca6","e801bbffff","CALL 0x204737ac",1179038],
  ["20477cab","59","POP ECX",1179039],
  ["20477cac","897dfc","MOV dword ptr [EBP + -0x4],EDI",1179040],
  ["20477caf","ff7508","PUSH dword ptr [EBP + 0x8]",1179041],
  ["20477cb2","e890fcffff","CALL 0x20477947",1179042],
  ["20477cb7","59","POP ECX",1179043],
  ["20477cb8","8945e4","MOV dword ptr [EBP + -0x1c],EAX",1179044],
  ["20477cbb","c745fcfeffffff","MOV dword ptr [EBP + -0x4],0xfffffffe",1179045],
  ["20477cc2","e85f000000","CALL 0x20477d26",1179046],
  ["20477cc7","8b5de4","MOV EBX,dword ptr [EBP + -0x1c]",1179047],
  ["20477cca","3bdf","CMP EBX,EDI",1179048],
  ["20477ccc","7411","JZ 0x20477cdf",1179049],
  ["20477cce","ff7508","PUSH dword ptr [EBP + 0x8]",1179050],
  ["20477cd1","57","PUSH EDI",1179051],
  ["20477cd2","53","PUSH EBX",1179052],
  ["20477cd3","e878c1feff","CALL 0x20463e50",1179053],
  ["20477cd8","83c40c","ADD ESP,0xc",1179054],
  ["20477cdb","3bdf","CMP EBX,EDI",1179056],
  ["20477cdd","7561","JNZ 0x20477d40",1179057],
  ["20477cdf","56","PUSH ESI",1179059],
  ["20477ce0","6a08","PUSH 0x8",1179060],
  ["20477ce2","ff35b4117d20","PUSH dword ptr [0x207d11b4]",1179061],
  ["20477ce8","ff15847b7d20","CALL dword ptr [0x207d7b84]",1179062],
  ["20477cee","8bd8","MOV EBX,EAX",1179063],
  ["20477cf0","3bdf","CMP EBX,EDI",1179065],
  ["20477cf2","754c","JNZ 0x20477d40",1179066],
  ["20477cf4","393de0147d20","CMP dword ptr [0x207d14e0],EDI",1179067],
  ["20477cfa","7433","JZ 0x20477d2f",1179068],
  ["20477cfc","56","PUSH ESI",1179069],
  ["20477cfd","e8dbc5ffff","CALL 0x204742dd",1179070],
  ["20477d02","59","POP ECX",1179071],
  ["20477d03","85c0","TEST EAX,EAX",1179072],
  ["20477d05","0f8572ffffff","JNZ 0x20477c7d",1179073],
  ["20477d0b","8b4510","MOV EAX,dword ptr [EBP + 0x10]",1179074],
  ["20477d0e","3bc7","CMP EAX,EDI",1179075],
  ["20477d10","0f8450ffffff","JZ 0x20477c66",1179076],
  ["20477d16","c7000c000000","MOV dword ptr [EAX],0xc",1179077],
  ["20477d1c","e945ffffff","JMP 0x20477c66",1179078],
  ["20477d2f","3bdf","CMP EBX,EDI",1179085],
  ["20477d31","750d","JNZ 0x20477d40",1179086],
  ["20477d33","8b4510","MOV EAX,dword ptr [EBP + 0x10]",1179087],
  ["20477d36","3bc7","CMP EAX,EDI",1179088],
  ["20477d38","7406","JZ 0x20477d40",1179089],
  ["20477d3a","c7000c000000","MOV dword ptr [EAX],0xc",1179090],
  ["20477d40","8bc3","MOV EAX,EBX",1179092],
  ["20477d42","e86e08ffff","CALL 0x204685b5",1179094],
  ["20477d47","c3","RET",1179095],
];
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
  ["output","README.md",3599,"520adbc6a9b60bcbffed20a2532b3685ca819488b1e12d34065d9dc0f424b5fd"],
  ["output","native-evidence.json",158686,"d5318037cb3d3d5f669caac2834f79eacfa337ef5b2688a97543e0eea0c35b3e"],
  ["output","runtime-rules.json",70419,"6064708dcd0d2b98fe2c6171029b3593516455573482d78e4fca64af9a403a0d"],
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
  ["repo","assets/gothic3/game-crt/sources/Game/204683ce.asm.txt",912,"cd442e9424f49bd1777c09b465f91c27d4afe0ca2a3e6639694bf9d9a4d4aadd"],
  ["repo","assets/gothic3/game-crt/sources/Game/204683ce.c.txt",698,"9c972ef219c62feced6baf23894b506500e76a988c0c96ab5be12d5af84fea44"],
  ["repo","assets/gothic3/game-crt/sources/Game/20477c2a.asm.txt",3389,"204c9076c506c6fd69fd81264792ec536c05a973142dcbfa79b906a4208ded98"],
  ["repo","assets/gothic3/game-crt/sources/Game/20477c2a.c.txt",1693,"52be9459a10e1152c95c809a042873862b87ee61e8fc1de8b517f47dca951120"],
  ["repo","assets/gothic3/game-io-startup/native-evidence.json",164590,"cc3c0943f3d377c9dad6dad23713aa4b578d1d035201349147b0b3effa50fed1"],
  ["repo","assets/gothic3/game-io-startup/runtime-rules.json",35810,"ce97c93fc5ed0c52bc27faa2605359cef2a2f8a3b17185ee810554c5828a3df0"],
  ["repo","assets/gothic3/game-io-startup/source-manifest.json",31658,"5fb60445d6ab3e8135e495ad3e78701dff5f2e16fc9ef3bcd4d59c3151e756c3"],
  ["repo","assets/gothic3/game-io-writer/native-evidence.json",40038,"a7ca6d1be357d34c93e551726f1d2cbed1834655e2a5ea08b54a09b591c9b361"],
  ["repo","assets/gothic3/game-io-writer/runtime-rules.json",8336,"72526fd0f0fbae101a4d81d4d0a2f41d6d68808e2063d671a30be56cddc744a4"],
  ["repo","assets/gothic3/game-io-writer/source-manifest.json",4844,"c6ddda906e032e2ee25fd57772bcf032541382b9e1e70bafdd595e978f8e5cde"],
  ["repo","scripts/gothic3_game_io_allocation_source.py",24646,"4b552b2abef567e7a98b86d29ea25f1652a9109bec4208ea23442ad951ad838b"],
  ["repo","tools/gothic3/prepare_crt_undname_source.py",28683,"f7021acfb8820e4c3bad4781a32464807972288240af7c5549cfcaee346cf699"],
  ["repo","tools/gothic3/prepare_runtime_admin_source.py",40500,"31dae731178e61ec02a46c2a517b8743c6b7d2c2ba543db22cacc50c27fc70a1"],
  ["repo","tools/gothic3/read_dialogue_native_evidence.py",11400,"27982125c2dee8c83c1f900ddd70eef7ad0d50dd1b3f5bc0ec40dd85c0127d46"],
];
const directTargetCatalogPins: Readonly<Record<string, Readonly<Record<string, unknown>> | null>> = {"20477c2a":{"address":"20477c2a","name":"__calloc_impl","qualified_name":"__calloc_impl","signature":"void * __calloc_impl(uint param_1,uint param_2,undefined4 *param_3);","status":"decompiled","error":"","elapsed_ms":"15","body_bytes":"272","body_ranges":"20477c2a-20477d20;20477d2f-20477d47","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"9814","assembly_entry_line":"1178989","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62189},"20468570":{"address":"20468570","name":"__SEH_prolog4","qualified_name":"__SEH_prolog4","signature":"void __SEH_prolog4(undefined4 param_1,int param_2);","status":"decompiled","error":"","elapsed_ms":"4","body_bytes":"69","body_ranges":"20468570-204685b4","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9915","assembly_entry_line":"1162673","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61960},"2046a282":{"address":"2046a282","name":"FUN_2046a282","qualified_name":"FUN_2046a282","signature":"undefined * FUN_2046a282(void);","status":"decompiled","error":"","elapsed_ms":"1","body_bytes":"19","body_ranges":"2046a282-2046a294","is_thunk":"false","source":"DEFAULT","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"383","assembly_entry_line":"1165346","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62013},"2046a20a":{"address":"2046a20a","name":"FUN_2046a20a","qualified_name":"FUN_2046a20a","signature":"void FUN_2046a20a(wchar_t *param_1,wchar_t *param_2,wchar_t *param_3,uint param_4,uintptr_t param_5);","status":"decompiled","error":"","elapsed_ms":"3","body_bytes":"36","body_ranges":"2046a20a-2046a22d","is_thunk":"false","source":"DEFAULT","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"332","assembly_entry_line":"1165298","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62010},"20477d42":null,"204737ac":{"address":"204737ac","name":"__lock","qualified_name":"__lock","signature":"void __cdecl __lock(int _File);","status":"decompiled","error":"","elapsed_ms":"4","body_bytes":"49","body_ranges":"204737ac-204737dc","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"5700","assembly_entry_line":"1172888","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62112},"20477947":{"address":"20477947","name":"___sbh_alloc_block","qualified_name":"___sbh_alloc_block","signature":"int * ___sbh_alloc_block(uint *param_1);","status":"decompiled","error":"","elapsed_ms":"45","body_bytes":"739","body_ranges":"20477947-20477c29","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"9644","assembly_entry_line":"1178691","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62188},"20477d26":{"address":"20477d26","name":"FUN_20477d26","qualified_name":"FUN_20477d26","signature":"void FUN_20477d26(void);","status":"decompiled","error":"","elapsed_ms":"1","body_bytes":"9","body_ranges":"20477d26-20477d2e","is_thunk":"false","source":"DEFAULT","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"9883","assembly_entry_line":"1179080","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62190},"20463e50":{"address":"20463e50","name":"_memset","qualified_name":"_memset","signature":"void * __cdecl _memset(void *_Dst,int _Val,size_t _Size);","status":"decompiled","error":"","elapsed_ms":"6","body_bytes":"122","body_ranges":"20463e50-20463ec9","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"4640","assembly_entry_line":"1156096","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61830},"204742dd":{"address":"204742dd","name":"__callnewh","qualified_name":"__callnewh","signature":"int __cdecl __callnewh(size_t _Size);","status":"decompiled","error":"","elapsed_ms":"2","body_bytes":"34","body_ranges":"204742dd-204742fe","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"6229","assembly_entry_line":"1173511","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62130},"20477c66":null,"204685b5":{"address":"204685b5","name":"__SEH_epilog4","qualified_name":"__SEH_epilog4","signature":"void __SEH_epilog4(void);","status":"decompiled","error":"","elapsed_ms":"1","body_bytes":"20","body_ranges":"204685b5-204685c8","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9945","assembly_entry_line":"1162695","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61961},"204683ce":{"address":"204683ce","name":"__calloc_crt","qualified_name":"__calloc_crt","signature":"void * __cdecl __calloc_crt(size_t _Count,size_t _Size);","status":"decompiled","error":"","elapsed_ms":"4","body_bytes":"72","body_ranges":"204683ce-20468415","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00124.c","pseudocode_line":"9761","assembly_entry_line":"1162517","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":61955},"20474372":null,"204743f8":null,"204743f3":null,"20474408":null,"204741c7":{"address":"204741c7","name":"___crtInitCritSecAndSpinCount","qualified_name":"___crtInitCritSecAndSpinCount","signature":"int ___crtInitCritSecAndSpinCount(undefined4 param_1,undefined4 param_2);","status":"decompiled","error":"","elapsed_ms":"14","body_bytes":"147","body_ranges":"204741c7-20474201;20474205-2047424c;2047427c-2047428b","is_thunk":"false","source":"ANALYSIS","pseudocode_file":"pseudocode/functions_00125.c","pseudocode_line":"6172","assembly_entry_line":"1173451","decompiler_profile":"standard","analysis_thunk_target":"","analysis_provenance_file":"","forwarder_proof_file":"","csvLine":62128},"2047450e":null,"204744b3":null,"204744eb":null,"20474539":null};
/** Source initialization pins only. Consumers must bind current canonical
 * Game image aliases; these receipts never reseed a live image or grant stores. */
export const gameIoAllocationImagePins: Readonly<Record<string, readonly [
  'coldGlobals' | 'constBytes', string, number, string, string
]>> = {"ioBlocks":["coldGlobals","207d2a20",256,"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","5341e6b2646979a70e57653007a1f310169421ec9bdd9f1a5648f75ade005af1"],"ioHandleCount":["coldGlobals","207d29c4",4,"00000000","df3f619804a92fdb4057192dc43dd748ea778adc52bc498ce80524c014b81119"],"callocEH4Scope":["constBytes","206e8f98",28,"feffffff00000000d4ffffff00000000feffffff00000000217d4720","b4056ba5650bfeaed49e6c64e2bd62c27844894baf4fbd62d4ff2ed34b32a454"]};
const imageMetadataPins: Readonly<Record<string, unknown>> = {"ioBlocks":{"module":"Game","address":"207d2a20","rva":"7d2a20","bytes":256,"raw":"00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","knownMask":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff","sha256":"5341e6b2646979a70e57653007a1f310169421ec9bdd9f1a5648f75ade005af1","section":{"virtualAddress":7954432,"virtualSize":248716,"rawSize":126976,"rawOffset":7954432,"fileBackedBytes":0,"loaderZeroFillBytes":256},"originalPESection":{"name":".data","headerFileOffset":552,"characteristics":"c0000040","readable":true,"writable":true,"executable":false},"fileOffset":null,"scope":"cold-original-image","sourceOnly":true,"runtimeOwnerAdmitted":false,"liveValueCaptured":false,"currentLiveValueCaptured":false,"sourceDependency":{"package":"assets/gothic3/game-io-startup","label":"ioBlocks"},"initializationScope":"Original PE loader zero-fill on fresh canonical Game image; never a current live Windows value or later reseed"},"ioHandleCount":{"module":"Game","address":"207d29c4","rva":"7d29c4","bytes":4,"raw":"00000000","knownMask":"ffffffff","sha256":"df3f619804a92fdb4057192dc43dd748ea778adc52bc498ce80524c014b81119","section":{"virtualAddress":7954432,"virtualSize":248716,"rawSize":126976,"rawOffset":7954432,"fileBackedBytes":0,"loaderZeroFillBytes":4},"originalPESection":{"name":".data","headerFileOffset":552,"characteristics":"c0000040","readable":true,"writable":true,"executable":false},"fileOffset":null,"scope":"cold-original-image","sourceOnly":true,"runtimeOwnerAdmitted":false,"liveValueCaptured":false,"currentLiveValueCaptured":false,"sourceDependency":{"package":"assets/gothic3/game-io-startup","label":"ioHandleCount"},"initializationScope":"Original PE loader zero-fill on fresh canonical Game image; never a current live Windows value or later reseed"},"callocEH4Scope":{"module":"Game","address":"206e8f98","rva":"6e8f98","bytes":28,"raw":"feffffff00000000d4ffffff00000000feffffff00000000217d4720","knownMask":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffff","sha256":"b4056ba5650bfeaed49e6c64e2bd62c27844894baf4fbd62d4ff2ed34b32a454","section":{"virtualAddress":5685248,"virtualSize":2268534,"rawSize":2269184,"rawOffset":5685248,"fileBackedBytes":28,"loaderZeroFillBytes":0},"originalPESection":{"name":".rdata","headerFileOffset":512,"characteristics":"40000040","readable":true,"writable":false,"executable":false},"fileOffset":7245720,"scope":"original-file-backed-constant","sourceOnly":true,"runtimeOwnerAdmitted":false,"liveValueCaptured":false,"currentLiveValueCaptured":false,"decodedDwords":["fffffffe","00000000","ffffffd4","00000000","fffffffe","00000000","20477d21"],"decodedStructure":{"gsCookieOffset":-2,"gsCookieXorOffset":0,"ehCookieOffset":-44,"ehCookieXorOffset":0,"tryLevel0":{"enclosingLevel":-2,"filter":"00000000","handler":"20477d21"}}}};
const peOnlyGapPin = {"module":"Game","address":"20477d21","rva":"477d21","bytes":5,"raw":"33ff8b750c","knownMask":"ffffffffff","sha256":"81bcb9c51fffd414142b33c8a5671886219a46e4f90d15a4d642fe27a06e86a2","section":{"virtualAddress":4096,"virtualSize":5680686,"rawSize":5681152,"rawOffset":4096,"fileBackedBytes":5,"loaderZeroFillBytes":0},"originalPESection":{"name":".text","headerFileOffset":472,"characteristics":"60000020","readable":true,"writable":false,"executable":true},"fileOffset":4685089,"scope":"original-PE-only-code-with-ASM-C-catalog-gaps","sourceOnly":true,"runtimeOwnerAdmitted":false,"liveValueCaptured":false,"currentLiveValueCaptured":false,"originalCatalogGap":true,"sourceCGap":true,"sourceASMGap":true,"originalInstructions":[],"reconstructedC":null,"runtimeCallable":false,"originalSymbols":[]};
const callSitePins = {"ioCallocCall":"20474327","wrapperImplCall":"204683dc","callocPrologCall":"20477c31","callocHeapAllocCall":"20477ce8","callocEpilogCall":"20477d42","callocFinalReturn":"20477d47","wrapperFinalReturn":"20468415","ioBlockPublication":"20474336","ioHandleCountPublication":"2047433b","ioCurrentBlockReread":"20474366","ioStartupWordRead":"20474376","ioGetStdHandleBoundary":"204744b4","wrapperSleepContext":"204683f3"};
const framePin = {"sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"addressScope":"Original relative stack relationships only; no numerical browser or native runtime VAs captured","outerEBPRelativeToInitialESP":-8,"outerESPBeforeCallRelativeToOuterEBP":-124,"ioCallPC":"20474327","ioReturnPC":"2047432c","wrapperCallPC":"204683dc","wrapperReturnPC":"204683e1","innerEBPRelativeToOuterEBP":-156,"innerESPAfterPrologRelativeToInnerEBP":-44,"innerRegistrationRelativeToInnerEBP":-16,"innerCookieRelativeToInnerEBP":-44,"innerSavedOuterFsRelativeToInnerEBP":-16,"innerSavedEspRelativeToInnerEBP":-24,"innerSavedRegisters":{"EBX":-32,"ESI":-36,"EDI":-40,"EBP":0},"innerIncomingReturnRelativeToInnerEBP":4,"innerCountRelativeToInnerEBP":8,"innerSizeRelativeToInnerEBP":12,"innerErrnoOutRelativeToInnerEBP":16,"prologReturnPC":"20477c36","epilogReturnPC":"20477d47","heapCallPC":"20477ce8","heapReturnPC":"20477cee","heapIAT":"207d7b84","heapCallReturnRelativeToInnerEBP":-60,"heapArgumentsBytes":12,"deepestSelectedStackBytes":224,"nestedPrologStackBytes":212,"innerFinalReturnPC":"204683e1","wrapperFinalReturnPC":"2047432c","afterWrapperReturnESPRelativeToOuterEBP":-124,"afterIoArgumentPopsESPRelativeToOuterEBP":-116,"outerCallerReturnPC":"204678d3","outerCallerReturnConsumed":false,"outerRegistrationRelativeToOuterEBP":-16,"outerFsRestoredByInnerEpilogExpected":true,"innerEpilogCookieCheckPresent":false,"sourceCookieAddress":"207b2314","sourceScopeAddress":"206e8f98","nextStandardHandleArgument":-10,"nextStandardHandleESPRelativeToOuterEBP":-120};
const abiPin = {"scope":"Declared virtual Win32 compatibility consistent with original caller; not native Windows callee instructions or current outputs","sourceOnly":true,"runtimeOwnerAdmitted":false,"originalWindowsCalleeCaptured":false,"nativeEndpointExecuted":false,"heapAlloc":{"callingConvention":"stdcall","argumentBytes":12,"normalReturnPC":"20477cee","normalResult":"Actual same-Game/Runtime live allocation capability or genuinely owned known NULL","unknownOutcomeIsNormalNull":false,"normalReturnRequiresActualEndpointOutcome":true,"normalUnknownRegisters":["ECX","EDX"],"normalArithmeticFlags":"unknown","normalPreservedRegisters":["EBX","ESI","EDI","EBP"],"normalPreservedFS":true},"callocImpl":{"callingConvention":"cdecl","callerArgumentBytes":12},"callocCrt":{"callingConvention":"cdecl","callerArgumentBytes":8},"unknownOutcomeGrantsCleanup":false,"escapedHostErrorIsNativeException":false};
const recordPin = {"sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"strideBytes":56,"recordsExpected":32,"zeroingAllocationBytes":1792,"sourceWrites":[{"pc":"20474349","offset":4,"width":1,"operation":"MOV","operand":0},{"pc":"2047434d","offset":0,"width":4,"operation":"OR-RMW","operand":4294967295},{"pc":"20474350","offset":5,"width":1,"operation":"MOV","operand":10},{"pc":"20474354","offset":8,"width":4,"operation":"MOV-current-EDI","operand":null},{"pc":"20474357","offset":36,"width":1,"operation":"MOV","operand":0},{"pc":"2047435b","offset":37,"width":1,"operation":"MOV","operand":10},{"pc":"2047435f","offset":38,"width":1,"operation":"MOV","operand":10}],"currentBlockRereadPC":"20474366","endOffsetBytes":1792,"endIsWritable":false,"sectionOffset":12,"sectionBytes":24,"zeroSectionIsInitializedCriticalSection":false,"standardFirstRecordFlagStorePC":"2047449c","standardFirstRecordFlags":129,"startupCountFieldOffset":50,"startupCountFieldWidth":2,"startupCountReadPC":"20474376","inheritedSkipRequiresActualKnownWord":true,"sourceBranchExpectationsGrantExecution":false};
const pathPin = {"sourceOnly":true,"runtimeOwnerAdmitted":false,"currentLiveValueCaptured":false,"scope":"Static expected mode1 non-NULL HeapAlloc / current cbReserved2=0 path; no observed execution or forced branches","calleeOperations":85,"callerCallAndCleanupOperations":5,"firstBlockTailOperations":406,"recordIterations":32,"recordStrideBytes":56,"allocationBytes":1792,"addedOperations":496,"priorOperations":35,"totalOperations":531,"instructionRowsSha256":"da86423b488c357b2c5901b99ef5c74dfcd10bb5285f8518e287d8921a03b85e","nextBoundaryPC":"204744b4","nextBoundaryIAT":"207d7bbc","nextBoundaryExecuted":false,"nativeIOCompleted":false,"nativeEHDispatchCompleted":false,"currentHeapModeExpectedButNotCaptured":1,"currentReserved2CountExpectedButNotCaptured":0};
const gapSearchPin = {"sourceOnly":true,"query":"Original ENTRY/catalog/ASM at 20477d21 and ASM extent [20477d21,20477d26)","originalCatalogRecordsFound":0,"originalCEntriesFound":0,"originalASMRowsFound":0,"corpusRecordSha256":"6446c8311cc2e24c2793282c78a6b2410e4ee76e64ae76ee76a337381c5ba209"};
const importPins = {"Game":[{"iatVA":"0x207d7b84","module":"KERNEL32.dll","name":"HeapAlloc","ordinal":null},{"iatVA":"0x207d7bbc","module":"KERNEL32.dll","name":"GetStdHandle","ordinal":null},{"iatVA":"0x207d7c8c","module":"KERNEL32.dll","name":"Sleep","ordinal":null}]};
for (const value of [methodPins, methodContextPins, instructionPins, manifestPins, directTargetCatalogPins,
  gameIoAllocationImagePins, imageMetadataPins, peOnlyGapPin, callSitePins, framePin, abiPin, recordPin, pathPin,
  gapSearchPin, importPins]) freeze(value);

function requireSource(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('Original Game calloc/I/O source differs: ' + message);
}
function same(actual: unknown, expected: unknown, label: string): void {
  requireSource(JSON.stringify(actual) === JSON.stringify(expected), label);
}
function flags(value: Readonly<Record<string, unknown>>, label: string): void {
  for (const [name, expected] of Object.entries({ sourceOnly: true, runtimeOwnersImplemented: false,
    currentLiveValuesCaptured: false, wholeIoInitImplemented: false, wholeExceptionDispatchImplemented: false,
    wholeGameAttachOrCrtTraversalImplemented: false, sourceMetadataGrantsExecution: false })) {
    requireSource(value[name] === expected, label + '.' + name);
  }
}
function point(pin: readonly [string, string, string, number]): NativeGameIoInstruction {
  const row = rules.instructionPoints[pin[0]], rva = Number.parseInt(pin[0], 16) - 0x20000000;
  requireSource(row && row.va === pin[0] && row.bytes === pin[1] && row.instruction === pin[2] &&
    row.assemblyLine === pin[3] && row.rva === rva.toString(16) && row.fileOffset === rva,
    'original instruction ' + pin[0]);
  // Every pinned range is within original readonly .text; actual RVA/offset
  // and every byte were independently checked against the original PE.
  requireSource(rva >= 0x1000 && rva + row.bytes.length / 2 <= 0x1000 + 5680686, 'original code range ' + pin[0]);
  return row;
}
function image(label: string): NativeCrtImageReceipt {
  const pin = gameIoAllocationImagePins[label];
  requireSource(pin, 'unselected image ' + label);
  const receipt = rules[pin[0]][label];
  requireSource(receipt, 'missing image ' + label);
  same(receipt, imageMetadataPins[label], 'image section/mask/provenance ' + label);
  requireSource(receipt.module === 'Game' && receipt.address === pin[1] && receipt.bytes === pin[2] &&
    receipt.raw === pin[3] && receipt.sha256 === pin[4] && receipt.knownMask === 'ff'.repeat(pin[2]) &&
    receipt.sourceOnly === true && receipt.runtimeOwnerAdmitted === false &&
    receipt.liveValueCaptured === false && receipt.currentLiveValueCaptured === false, 'image flags ' + label);
  requireSource(receipt.scope === (pin[0] === 'coldGlobals' ? 'cold-original-image' : 'original-file-backed-constant'),
    'image source scope ' + label);
  return receipt;
}
let admitted = false;
export function admitGameIoAllocationSource(): void {
  if (admitted) return; // All admitted objects are private and recursively frozen.
  requireSource(rules.schema === 'gothic3-game-io-allocation-rules-v1' && rules.inputs.Game === gameHash &&
    evidence.schema === 'gothic3-game-io-allocation-evidence-v1' && evidence.inputs['Game.dll'] === gameHash &&
    manifest.schema === 'gothic3-game-io-allocation-source-manifest-v1' && manifest.inputs.Game === gameHash, 'schema/input');
  for (const [label, document] of [['rules', rules], ['evidence', evidence], ['manifest', manifest]] as const) {
    flags(document as unknown as Readonly<Record<string, unknown>>, label);
  }
  const audit = evidence.originalModuleAudit;
  requireSource(audit.module === 'Game.dll' && audit.inputSha256 === gameHash &&
    audit.functionsCsvSha256 === catalogHash && audit.assemblySha256 === assemblyHash && audit.verifiedAgainstOriginalPE === true &&
    evidence.originalCatalogSha256 === catalogHash && evidence.originalAssemblySha256 === assemblyHash &&
    evidence.originalSymbolsSha256 === symbolsHash, 'original inputs/audit');
  requireSource(Object.keys(rules.methods).length === 5 && audit.methods.length === 5, 'body count');
  let totalRows = 0, totalBytes = 0;
  for (const [label, pin] of Object.entries(methodPins)) {
    const method = rules.methods[label], originals = audit.methods.filter(row => row.label === label), original = originals[0];
    requireSource(method && original && originals.length === 1, 'missing method ' + label);
    same(method, pin, 'method/source/context flags ' + label);
    requireSource(original.entryVA === '0x' + pin.entry && original.bodyVA === '0x' + pin.body &&
      original.bodyRanges === pin.bodyRanges && original.instructionCount === pin.instructionCount &&
      original.bodyByteCount === pin.bodyByteCount && original.bodyInstructionBytesSha256 === pin.bodyInstructionBytesSha256 &&
      original.instructions.length === pin.instructionCount && original.entryChain.length === 0 &&
      original.sourceRefsRoot === pin.sourceRefsRoot && original.sourceOnly === true &&
      original.runtimeOwnerAdmitted === false && original.currentLiveValueCaptured === false &&
      original.sourceCGap === false && original.sourceASMGap === false && original.originalCatalogGap === false,
      'original body ' + label);
    same(original.sourceRefs, pin.sourceRefs, 'original reused refs ' + label);
    const context = methodContextPins[label];
    requireSource(context, 'missing original context pin ' + label);
    same(original.originalCatalog, context.originalCatalog, 'original catalog ' + label);
    same(original.reconstructedC, context.reconstructedC, 'original C identity ' + label);
    const ranges = pin.bodyRanges.split(';').map(range => range.split('-').map(value => Number.parseInt(value, 16)));
    const originalRows = original.instructions;
    const bodyBytes = originalRows.reduce((sum, row) => sum + row.bytes.length / 2, 0);
    requireSource(bodyBytes === pin.bodyByteCount, 'original instruction byte count ' + label);
    for (const range of ranges) {
      const first = range[0], last = range[1];
      requireSource(first !== undefined && last !== undefined && Number.isInteger(first) && Number.isInteger(last), 'body range ' + label);
      let cursor = first;
      for (const row of originalRows) {
        const va = Number.parseInt(row.va, 16);
        if (first <= va && va <= last) {
          requireSource(va === cursor, 'body extent ' + label);
          cursor += row.bytes.length / 2;
        }
      }
      requireSource(cursor === last + 1, 'body extent end ' + label);
    }
    for (const row of originalRows) same(row, rules.instructionPoints[row.va], 'original row ' + row.va);
    totalRows += originalRows.length; totalBytes += bodyBytes;
  }
  requireSource(totalRows === 337 && totalBytes === 995 && Object.keys(rules.instructionPoints).length === 337 &&
    instructionPins.length === 337, 'all source row counts');
  for (const pin of instructionPins) point(pin);
  requireSource(Object.keys(rules.callSites).length === 13, 'call/field point count');
  for (const [label, pc] of Object.entries(callSitePins)) same(rules.callSites[label], rules.instructionPoints[pc], 'call/field ' + label);
  const captured = new Set(Object.values(methodPins).flatMap(pin => [pin.entry, pin.body]));
  const expectedEdges = audit.methods.flatMap(method => method.instructions.flatMap(row => {
    const match = /^(CALL|JMP) 0x([0-9a-f]{8})$/.exec(row.instruction), target = match?.[2];
    if (!target) return [];
    requireSource(Object.hasOwn(directTargetCatalogPins, target), 'direct target catalog ' + target);
    return [{ caller: method.label, row, target, originalCatalog: directTargetCatalogPins[target],
      originalBodyCaptured: captured.has(target), sourceOnly: true, runtimeOwnerAdmitted: false }];
  }));
  requireSource(expectedEdges.length === 27, 'direct edge count');
  same(evidence.directCallAndTailEdges, expectedEdges, 'source-only direct edges/captured membership');
  requireSource(evidence.directCallCaptureScope ===
    'Membership in these five exact entry/body source captures; no runtime implementation or execution claim', 'direct capture scope');
  requireSource(Object.keys(rules.coldGlobals).length === 2 && Object.keys(rules.constBytes).length === 1, 'image range count');
  for (const label of Object.keys(gameIoAllocationImagePins)) image(label);
  requireSource(Object.keys(rules.peOnlyCode).length === 1, 'PE-only gap count');
  same(rules.peOnlyCode.callocCleanupEntryPEOnly, peOnlyGapPin, 'genuine noncallable PE-only cleanup gap');
  same(rules.originalGapSearchSummary, gapSearchPin, 'original gap search');
  const { corpusFiles, ...gapSummary } = evidence.originalGapSearch;
  same(gapSummary, gapSearchPin, 'evidence gap search');
  const expectedCorpus = manifestPins.filter(pin => pin[0] === 'originalStudy' && pin[1].startsWith(
    '01_Decompiled_Code/Game_dll/pseudocode/') && pin[1].endsWith('.c')).map(pin => ({ path: pin[1], bytes: pin[2], sha256: pin[3] }));
  requireSource(expectedCorpus.length === 130, 'original C corpus count');
  same(corpusFiles, expectedCorpus, 'complete original C ENTRY gap corpus');
  same(rules.imports, importPins, 'exact original IAT imports');
  same(rules.frameLayout, framePin, 'relative physical frame layout');
  same(rules.declaredCompatibilityABI, abiPin, 'declared compatibility ABI');
  same(rules.ioRecordLayout, recordPin, 'source record field widths/order');
  const pcs = instructionPins.map(pin => pin[0]);
  const span = (first: string, last: string): string[] => pcs.filter(pc => first <= pc && pc <= last);
  const callee = [...span('204683ce', '204683dc'), ...span('20477c2a', '20477c31'), ...span('20468570', '204685b4'),
    ...span('20477c36', '20477c4c'), ...span('20477c6d', '20477c78'), ...span('20477c7d', '20477c8e'),
    ...span('20477cdb', '20477cf2'), ...span('20477d40', '20477d42'), ...span('204685b5', '204685c8'),
    '20477d47', ...span('204683e1', '204683e8'), ...span('20468411', '20468415')];
  const loop = span('20474349', '20474374');
  const tail = [...span('20474336', '20474347'), '20474372', '20474374', ...Array.from({ length: 32 }, () => loop).flat(),
    '20474376', '2047437a', ...span('2047447d', '2047448f'), ...span('2047449c', '204744a7'), '204744b3'];
  requireSource(callee.length === 85 && loop.length === 12 && tail.length === 406, 'static expected path counts');
  const { instructionAddresses, ...pathMetadata } = rules.selectedNormalPath;
  same(pathMetadata, pathPin, 'source-only static expected path scope');
  same(instructionAddresses, ['20474327', ...callee, ...span('2047432c', '20474330'), ...tail], 'static source path ledger');
  for (const label of ['methods', 'instructionPoints', 'callSites', 'coldGlobals', 'constBytes', 'peOnlyCode', 'imports',
    'sourceDependencies', 'selectedNormalPath', 'frameLayout', 'declaredCompatibilityABI', 'ioRecordLayout'] as const) {
    same(rules[label], evidence[label], 'rules/evidence ' + label);
  }
  requireSource(manifest.manifestSelfReferenceExcluded === true && manifest.producerPath ===
    'scripts/gothic3_game_io_allocation_source.py' && manifest.files.length === 163, 'manifest producer/count');
  same(manifest.helperPaths, ['tools/gothic3/prepare_crt_undname_source.py',
    'tools/gothic3/prepare_runtime_admin_source.py', 'tools/gothic3/read_dialogue_native_evidence.py'], 'actually loaded helpers');
  for (const [location, path, bytes, sha256] of manifestPins) {
    const entries = manifest.files.filter(row => row.location === location && row.path === path), entry = entries[0];
    requireSource(entry && entries.length === 1 && entry.bytes === bytes && entry.sha256 === sha256, 'manifest pin ' + path);
  }
  const dependencies = Object.values(rules.sourceDependencies).flatMap(group => Object.values(group));
  requireSource(Object.keys(rules.sourceDependencies).length === 4 && dependencies.length === 12 &&
    new Set(dependencies.map(row => row.path)).size === 12, 'dependency count');
  for (const dependency of dependencies) {
    const pin = manifestPins.find(row => row[0] === 'repo' && row[1] === dependency.path);
    requireSource(pin && dependency.path.startsWith('assets/gothic3/') && dependency.path.endsWith('.json') &&
      !dependency.path.includes('/game-io-allocation/'), 'acyclic dependency ' + dependency.path);
    same(dependency, { path: pin[1], bytes: pin[2], sha256: pin[3] }, 'dependency pin ' + dependency.path);
  }
  admitted = true;
}
/** Full original source receipt, including unowned branches and the unexecuted
 * GetStdHandle boundary. A receipt is not permission to execute that row. */
export function gameIoAllocationInstruction(pc: string): NativeGameIoInstruction {
  admitGameIoAllocationSource();
  const pin = instructionPins.find(row => row[0] === pc);
  requireSource(pin, 'unselected instruction ' + pc);
  return point(pin);
}
export function gameIoAllocationImageReceipt(label: string): NativeCrtImageReceipt {
  admitGameIoAllocationSource();
  return image(label);
}
/** Immutable admitted source context only, never a current execution proof. */
export function nativeGameIoAllocationSource(): NativeGameIoAllocationSourceRules {
  admitGameIoAllocationSource();
  return rules;
}
