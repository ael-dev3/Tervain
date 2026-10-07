/** Original Game startup-info caller source admission. These frozen receipts
 * grant no frame capability, Windows invocation, allocation or return authority.
 * Normal void/stdcall4 effects are a declared compatibility ABI; the installed
 * Windows callee and current process outputs were not captured. */
import rulesText from '../../assets/gothic3/game-io-writer/runtime-rules.json?raw';
import evidenceText from '../../assets/gothic3/game-io-writer/native-evidence.json?raw';
import manifestText from '../../assets/gothic3/game-io-writer/source-manifest.json?raw';
import type { NativeGameIoInstruction } from './native-game-crt-io-source';

interface SourceMethod {
  readonly module: string; readonly entry: string; readonly body: string;
  readonly bodyRanges: string; readonly instructionCount: number;
  readonly bodyBytes: number; readonly bodyByteCount: number; readonly bodyInstructionBytesSha256: string;
  readonly entryChain: readonly unknown[];
  readonly sourceRefsRoot: string;
  readonly sourceRefs: Readonly<{ assembly: string; assemblySha256: string; c: string; cSha256: string; cNormalization: string }>;
  readonly sourceOnly: boolean; readonly runtimeOwnerAdmitted: boolean; readonly currentLiveValueCaptured: boolean;
  readonly sourceCGap: boolean; readonly sourceASMGap: boolean; readonly originalCatalogGap: boolean;
}
interface SourceDependency { readonly path: string; readonly bytes: number; readonly sha256: string }
export interface NativeGameIoWriterSourceRules {
  readonly schema: string; readonly inputs: Readonly<{ Game: string }>;
  readonly methods: Readonly<Record<string, SourceMethod>>;
  readonly instructionPoints: Readonly<Record<string, NativeGameIoInstruction>>;
  readonly sourceContextInstructionPoints: Readonly<Record<string, NativeGameIoInstruction>>;
  readonly selectedContinuation: Readonly<Record<string, unknown>>;
  readonly frameLayout: Readonly<Record<string, unknown>>;
  readonly declaredCompatibilityABI: Readonly<Record<string, unknown>>;
  readonly originalCodeSection: Readonly<Record<string, unknown>>;
  readonly imports: Readonly<{ Game: readonly Readonly<{ iatVA: string; module: string; name: string; ordinal: number | null }>[] }>;
  readonly sourceDependencies: Readonly<Record<string, Readonly<Record<string, SourceDependency>>>>;
  readonly sourceOnly: boolean; readonly runtimeOwnersImplemented: boolean; readonly currentLiveValuesCaptured: boolean;
  readonly wholeIoInitImplemented: boolean; readonly wholeExceptionDispatchImplemented: boolean;
  readonly wholeGameAttachOrCrtTraversalImplemented: boolean; readonly allocationAdmitted: boolean;
}
interface OriginalMethod {
  readonly label: string; readonly entryVA: string; readonly bodyVA: string; readonly bodyRanges: string;
  readonly instructionCount: number; readonly bodyByteCount: number; readonly bodyInstructionBytesSha256: string;
  readonly instructions: readonly NativeGameIoInstruction[];
  readonly originalCatalog: Readonly<Record<string, unknown>>;
  readonly reconstructedC: Readonly<{ path: string; sha256: string; line: number; status: string }>;
  readonly sourceRefs: SourceMethod['sourceRefs']; readonly sourceRefsRoot: string;
  readonly sourceOnly: boolean; readonly runtimeOwnerAdmitted: boolean; readonly currentLiveValueCaptured: boolean;
  readonly sourceCGap: boolean; readonly sourceASMGap: boolean; readonly originalCatalogGap: boolean;
}
const rules = JSON.parse(rulesText) as NativeGameIoWriterSourceRules;
const evidence = JSON.parse(evidenceText) as NativeGameIoWriterSourceRules & {
  readonly originalModuleAudit: Readonly<{ module: string; inputSha256: string; functionsCsvSha256: string;
    assemblySha256: string; verifiedAgainstOriginalPE: boolean; methods: readonly OriginalMethod[] }>;
  readonly originalCatalogSha256: string; readonly originalAssemblySha256: string;
  readonly boundaryTargetOriginalCatalog: OriginalMethod['originalCatalog'];
};
const manifest = JSON.parse(manifestText) as NativeGameIoWriterSourceRules & {
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
const methodPins = Object.freeze({
  ioInit: Object.freeze(['204742ff', 186, 562, '204742ff-20474527;20474536-2047453e',
    'eb6d483cbc0cdb9286f65cbe9fa791601334ad2806380b84240c29b504883fcf',
    'assets/gothic3/game-attach-continuation',
    '49198ad6297171771d955deaf1e62c364743274c9c957ce94717fedb572c4de1',
    '2cc60dfa073fbe1a9834cf43e7dc498b5cab040c2af14c4edf448efcb677fdff',
    '01_Decompiled_Code/Game_dll/pseudocode/functions_00125.c',
    '1543a283a5ce7bbd1473ecd2d442590fd9e66f9369d8f3a5b4bb9b49b919ca51', 6253, 62131, '__ioinit'] as const),
  callocCrt: Object.freeze(['204683ce', 26, 72, '204683ce-20468415',
    '92a4fc166b55ef1e2f23fc4df51b8637d0801738d9d3b2f8433eb62979f0680f',
    'assets/gothic3/game-crt',
    'cd442e9424f49bd1777c09b465f91c27d4afe0ca2a3e6639694bf9d9a4d4aadd',
    '9c972ef219c62feced6baf23894b506500e76a988c0c96ab5be12d5af84fea44',
    '01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c',
    'ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e', 9761, 61955, '__calloc_crt'] as const),
});
const instructionPins = Object.freeze([
  ['20474314', 'ff151c7c7d20', 'CALL dword ptr [0x207d7c1c]', 1173535],
  ['2047431a', 'c745fcfeffffff', 'MOV dword ptr [EBP + -0x4],0xfffffffe', 1173536],
  ['20474321', '6a38', 'PUSH 0x38', 1173537],
  ['20474323', '6a20', 'PUSH 0x20', 1173538],
  ['20474325', '5e', 'POP ESI', 1173539],
  ['20474326', '56', 'PUSH ESI', 1173540],
  ['20474327', 'e8a240ffff', 'CALL 0x204683ce', 1173541],
] as const);
const contextPins = Object.freeze([
  ['20474310', '8d459c', 'LEA EAX,[EBP + -0x64]', 1173533],
  ['20474313', '50', 'PUSH EAX', 1173534],
  ['20474376', '66397dce', 'CMP word ptr [EBP + -0x32],DI', 1173564],
  ['20474380', '8b45d0', 'MOV EAX,dword ptr [EBP + -0x30]', 1173566],
] as const);
const manifestPins = Object.freeze([
  ['originalStudy', '00_Original_Runtime/Game.dll', 8228864, gameHash],
  ['originalStudy', '01_Decompiled_Code/Game_dll/full_disassembly.asm', 48184406, assemblyHash],
  ['originalStudy', '01_Decompiled_Code/Game_dll/functions.csv', 19310392, catalogHash],
  ['originalStudy', '01_Decompiled_Code/Game_dll/pseudocode/functions_00124.c', 317429, 'ed1fdab7b0ac494318118b652a0989780f3c6e6c4f65bb2658ea67af57e9b61e'],
  ['originalStudy', '01_Decompiled_Code/Game_dll/pseudocode/functions_00125.c', 814799, '1543a283a5ce7bbd1473ecd2d442590fd9e66f9369d8f3a5b4bb9b49b919ca51'],
  ['output', 'README.md', 2564, '31203f6aedebbed76fb5d38a49f23bec9dda53fc06244558c2f40e4155fc9feb'],
  ['output', 'native-evidence.json', 40038, 'a7ca6d1be357d34c93e551726f1d2cbed1834655e2a5ea08b54a09b591c9b361'],
  ['output', 'runtime-rules.json', 8336, '72526fd0f0fbae101a4d81d4d0a2f41d6d68808e2063d671a30be56cddc744a4'],
  ['repo', 'assets/gothic3/game-attach-continuation/native-evidence.json', 417933, 'a66aee7be0f74bc690f97dc3fc658f8fc62cf6ed1e824118fb8dd6f8ea1c003c'],
  ['repo', 'assets/gothic3/game-attach-continuation/runtime-rules.json', 69728, 'a83230b48ab739986cffa5303d803d03589912b027191e83db82d616c048087f'],
  ['repo', 'assets/gothic3/game-attach-continuation/source-manifest.json', 14791, '6d1a012b9fabb98c33a1e510756cdec9e51e48f87b0a06e1cce0045e11afec56'],
  ['repo', 'assets/gothic3/game-attach-continuation/sources/Game/204742ff.asm.txt', 7093, '49198ad6297171771d955deaf1e62c364743274c9c957ce94717fedb572c4de1'],
  ['repo', 'assets/gothic3/game-attach-continuation/sources/Game/204742ff.c.txt', 4375, '2cc60dfa073fbe1a9834cf43e7dc498b5cab040c2af14c4edf448efcb677fdff'],
  ['repo', 'assets/gothic3/game-crt/native-evidence.json', 845854, '0378ec053fee1df7bf8911efdb27cae7be43010d66bb99af500b7c365cabd94b'],
  ['repo', 'assets/gothic3/game-crt/runtime-rules.json', 186024, '9a3bbb750ec71a1edb13502a26a71ef44a8dcde366f8fd8899553cc85bf4ab86'],
  ['repo', 'assets/gothic3/game-crt/source-manifest.json', 44545, 'a3cc65a803fbf1d78f0d4272e4f06d089b969976a400c30144b7dd07765177ca'],
  ['repo', 'assets/gothic3/game-crt/sources/Game/204683ce.asm.txt', 912, 'cd442e9424f49bd1777c09b465f91c27d4afe0ca2a3e6639694bf9d9a4d4aadd'],
  ['repo', 'assets/gothic3/game-crt/sources/Game/204683ce.c.txt', 698, '9c972ef219c62feced6baf23894b506500e76a988c0c96ab5be12d5af84fea44'],
  ['repo', 'assets/gothic3/game-io-startup/native-evidence.json', 164590, 'cc3c0943f3d377c9dad6dad23713aa4b578d1d035201349147b0b3effa50fed1'],
  ['repo', 'assets/gothic3/game-io-startup/runtime-rules.json', 35810, 'ce97c93fc5ed0c52bc27faa2605359cef2a2f8a3b17185ee810554c5828a3df0'],
  ['repo', 'assets/gothic3/game-io-startup/source-manifest.json', 31658, '5fb60445d6ab3e8135e495ad3e78701dff5f2e16fc9ef3bcd4d59c3151e756c3'],
  ['repo', 'scripts/gothic3_game_io_writer_source.py', 17679, '9ae233756c7da4c83592bf15f04e6bcf7477b7e320a980f16801da2c0420db83'],
  ['repo', 'tools/gothic3/prepare_crt_undname_source.py', 28683, 'f7021acfb8820e4c3bad4781a32464807972288240af7c5549cfcaee346cf699'],
  ['repo', 'tools/gothic3/prepare_runtime_admin_source.py', 40500, '31dae731178e61ec02a46c2a517b8743c6b7d2c2ba543db22cacc50c27fc70a1'],
  ['repo', 'tools/gothic3/read_dialogue_native_evidence.py', 11400, '27982125c2dee8c83c1f900ddd70eef7ad0d50dd1b3f5bc0ec40dd85c0127d46'],
] as const);

function requireSource(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('Original Game startup-info source differs: ' + message);
}
function same(actual: unknown, expected: unknown, label: string): void {
  requireSource(JSON.stringify(actual) === JSON.stringify(expected), label);
}
function flags(value: Readonly<Record<string, unknown>>, label: string): void {
  for (const [name, expected] of Object.entries({ sourceOnly: true, runtimeOwnersImplemented: false,
    currentLiveValuesCaptured: false, wholeIoInitImplemented: false, wholeExceptionDispatchImplemented: false,
    wholeGameAttachOrCrtTraversalImplemented: false, allocationAdmitted: false })) {
    requireSource(value[name] === expected, label + '.' + name);
  }
}
function point(group: NativeGameIoWriterSourceRules['instructionPoints'],
  pin: readonly [string, string, string, number]): NativeGameIoInstruction {
  const rows = Object.values(group).filter(row => row.va === pin[0]);
  const row = rows[0], rva = Number.parseInt(pin[0], 16) - 0x20000000;
  requireSource(rows.length === 1 && row?.bytes === pin[1] && row.instruction === pin[2] &&
    row.assemblyLine === pin[3] && row.rva === rva.toString(16) && row.fileOffset === rva, 'instruction ' + pin[0]);
  const original = evidence.originalModuleAudit.methods.find(method => method.label === 'ioInit')?.instructions
    .filter(receipt => receipt.va === pin[0]);
  requireSource(original?.length === 1, 'caller source row ' + pin[0]);
  same(row, original[0], 'caller original receipt ' + pin[0]);
  return row;
}
/** The final boundary row is an original receipt, not permission to CALL it. */
export function gameIoWriterStartupInstruction(pc: string): NativeGameIoInstruction {
  const pin = instructionPins.find(row => row[0] === pc);
  requireSource(pin, 'unselected instruction ' + pc);
  return point(rules.instructionPoints, pin);
}

export function admitGameIoWriterSource(): void {
  requireSource(rules.schema === 'gothic3-game-io-writer-rules-v1' && rules.inputs.Game === gameHash &&
    evidence.schema === 'gothic3-game-io-writer-evidence-v1' &&
    (evidence.inputs as unknown as Record<string, string>)['Game.dll'] === gameHash &&
    manifest.schema === 'gothic3-game-io-writer-source-manifest-v1' && manifest.inputs.Game === gameHash, 'schema/input');
  for (const [label, document] of [['rules', rules], ['evidence', evidence], ['manifest', manifest]] as const) {
    flags(document as unknown as Readonly<Record<string, unknown>>, label);
  }
  const audit = evidence.originalModuleAudit;
  requireSource(audit.module === 'Game.dll' && audit.inputSha256 === gameHash &&
    audit.functionsCsvSha256 === catalogHash && audit.assemblySha256 === assemblyHash &&
    audit.verifiedAgainstOriginalPE === true && evidence.originalCatalogSha256 === catalogHash &&
    evidence.originalAssemblySha256 === assemblyHash, 'original module audit');
  requireSource(Object.keys(rules.methods).length === 2 && audit.methods.length === 2, 'context method count');
  for (const [label, pin] of Object.entries(methodPins)) {
    const method = rules.methods[label], originals = audit.methods.filter(row => row.label === label), original = originals[0];
    requireSource(original, 'missing context evidence ' + label);
    requireSource(originals.length === 1 && method?.module === 'Game' && method.entry === pin[0] && method.body === pin[0] &&
      method.instructionCount === pin[1] && method.bodyByteCount === pin[2] && method.bodyBytes === pin[2] &&
      method.bodyRanges === pin[3] && method.bodyInstructionBytesSha256 === pin[4] && method.sourceRefsRoot === pin[5] &&
      method.entryChain.length === 0 && method.sourceOnly === true && method.runtimeOwnerAdmitted === false &&
      method.currentLiveValueCaptured === false && method.sourceCGap === false && method.sourceASMGap === false &&
      method.originalCatalogGap === false, 'context method ' + label);
    const refs = { assembly: 'sources/Game/' + pin[0] + '.asm.txt', assemblySha256: pin[6],
      c: 'sources/Game/' + pin[0] + '.c.txt', cSha256: pin[7],
      cNormalization: 'rstrip-line-whitespace; LF line endings; final newline' };
    same(method.sourceRefs, refs, 'source refs ' + label);
    requireSource(original.entryVA === '0x' + pin[0] && original.bodyVA === '0x' + pin[0] &&
      original.bodyRanges === pin[3] && original.instructionCount === pin[1] && original.bodyByteCount === pin[2] &&
      original.bodyInstructionBytesSha256 === pin[4] && original.instructions.length === pin[1] &&
      original.instructions.reduce((sum, row) => sum + row.bytes.length / 2, 0) === pin[2] &&
      original.sourceRefsRoot === pin[5] && original.sourceOnly === true && original.runtimeOwnerAdmitted === false &&
      original.currentLiveValueCaptured === false && original.sourceCGap === false && original.sourceASMGap === false &&
      original.originalCatalogGap === false, 'context evidence ' + label);
    same(original.sourceRefs, refs, 'evidence source refs ' + label);
    same(original.reconstructedC, { path: pin[8], sha256: pin[9], line: pin[10], status: 'decompiled' }, 'original C ' + label);
    const catalog = original.originalCatalog;
    requireSource(catalog.address === pin[0] && catalog.name === pin[12] && catalog.status === 'decompiled' &&
      catalog.body_bytes === String(pin[2]) && catalog.body_ranges === pin[3] && catalog.csvLine === pin[11] &&
      catalog.pseudocode_file === pin[8].slice('01_Decompiled_Code/Game_dll/'.length) &&
      catalog.pseudocode_line === String(pin[10]), 'original catalog ' + label);
  }
  same(evidence.boundaryTargetOriginalCatalog, audit.methods.find(row => row.label === 'callocCrt')?.originalCatalog,
    'unexecuted boundary target catalog');
  requireSource(Object.keys(rules.instructionPoints).length === 7 && Object.keys(rules.sourceContextInstructionPoints).length === 4,
    'instruction point counts');
  for (const pin of instructionPins) gameIoWriterStartupInstruction(pin[0]);
  for (const pin of contextPins) point(rules.sourceContextInstructionPoints, pin);
  same(rules.originalCodeSection, { name: '.text', headerFileOffset: 472, characteristics: '60000020',
    virtualSize: 5680686, rva: '1000', rawSize: 5681152, rawFileOffset: 4096,
    readable: true, writable: false, executable: true }, 'original code section');
  same(rules.imports, { Game: [{ iatVA: '0x207d7c1c', module: 'KERNEL32.dll', name: 'GetStartupInfoA', ordinal: null }] }, 'import');
  same(rules.selectedContinuation, { sourceOnly: true, runtimeOwnerAdmitted: false, currentLiveValueCaptured: false,
    instructionAddresses: instructionPins.slice(0, 6).map(pin => pin[0]), instructionCount: 6, instructionBytes: 19,
    instructionBytesSha256: 'fb344c545d2e32d35f807077897ca4e6fe954c35e2c8ee7fd2c305a22ee7473c',
    postCallInstructionCount: 5, postCallInstructionBytes: 13, startPC: '20474314', normalReturnPC: '2047431a',
    endExclusivePC: '20474327', nextBoundaryPC: '20474327', nextBoundaryTarget: '204683ce', nextBoundaryExecuted: false,
    wholeIoInitImplemented: false, allocationAdmitted: false }, 'bounded selection');
  same(rules.frameLayout, { sourceOnly: true, runtimeOwnerAdmitted: false, currentLiveValueCaptured: false,
    addressScope: 'Relative original caller relationships; no host or browser numerical x86 addresses captured',
    startupInfoRelativeToEBP: -100, startupInfoBytes: 68, argumentBytes: 4,
    espBeforeCallRelativeToEBP: -120, pendingReturnRelativeToEBP: -124, espAfterNormalReturnRelativeToEBP: -116,
    tryLevelRelativeToEBP: -4, protectedTryLevelBeforeCall: 0, inactiveTryLevelAfterNormalReturn: -2,
    callPC: '20474314', iat: '207d7c1c', returnPC: '2047431a', nextBoundaryPC: '20474327',
    nextBoundaryTarget: '204683ce', nextBoundaryExecuted: false, callocCount: 32, callocElementBytes: 56,
    callocArgumentsESPRelativeToEBP: -124,
    fields: { cbReserved2: { offset: 50, bytes: 2, relativeToEBP: -50, consumerPC: '20474376', sourceOnly: true },
      lpReserved2: { offset: 52, bytes: 4, relativeToEBP: -48, consumerPC: '20474380', sourceOnly: true } },
    incomingCallerReturnPC: '204678d3', callerReturnSlotConsumed: false, ioInitReturned: false,
    startupInfoZeroInitializedByCaller: false, currentOutputBytesCaptured: false, currentOutputMaskCaptured: false }, 'frame relations');
  same(rules.declaredCompatibilityABI, {
    scope: 'Declared virtual Win32 compatibility ABI, consistent with the captured caller; not original callee instructions or observed native state',
    sourceOnly: true, runtimeOwnerAdmitted: false, originalWindowsCalleeCaptured: false, nativeEndpointExecuted: false,
    callingConvention: 'stdcall', normalReturnType: 'void', normalCalleeArgumentBytes: 4, normalReturnPC: '2047431a',
    normalVolatileNumericalRegisters: ['EAX', 'ECX', 'EDX'],
    normalVolatileRegisterValuePolicy: 'unknown unless supplied by separately owned ABI effects',
    normalPreservedRegisters: ['EBX', 'ESI', 'EDI', 'EBP'], normalPreservedFS: true,
    normalReturnRequiresActualNormalEndpointOutcome: true, unknownOutcomeGrantsCleanup: false,
    escapedHostErrorIsNativeException: false }, 'declared compatibility ABI');
  for (const label of ['methods', 'instructionPoints', 'sourceContextInstructionPoints', 'selectedContinuation',
    'frameLayout', 'declaredCompatibilityABI', 'originalCodeSection', 'imports', 'sourceDependencies'] as const) {
    same(rules[label], evidence[label], 'rules/evidence ' + label);
  }
  requireSource(manifest.manifestSelfReferenceExcluded === true &&
    manifest.producerPath === 'scripts/gothic3_game_io_writer_source.py' && manifest.files.length === manifestPins.length,
    'manifest producer/count');
  same(manifest.helperPaths, ['tools/gothic3/prepare_crt_undname_source.py',
    'tools/gothic3/prepare_runtime_admin_source.py', 'tools/gothic3/read_dialogue_native_evidence.py'], 'loaded helpers');
  for (const [location, path, bytes, hash] of manifestPins) {
    const entries = manifest.files.filter(row => row.location === location && row.path === path);
    const entry = entries[0];
    requireSource(entry, 'missing manifest pin ' + path);
    requireSource(entries.length === 1 && entry.bytes === bytes && entry.sha256 === hash, 'manifest pin ' + path);
  }
  const dependencyPins = Object.fromEntries(manifestPins.filter(pin => pin[0] === 'repo' &&
    pin[1].startsWith('assets/') && pin[1].endsWith('.json')).map(pin => [pin[1], { path: pin[1], bytes: pin[2], sha256: pin[3] }]));
  const dependencies = Object.values(rules.sourceDependencies).flatMap(group => Object.values(group));
  requireSource(Object.keys(rules.sourceDependencies).length === 3 && dependencies.length === 9, 'dependency count');
  for (const dependency of dependencies) same(dependency, dependencyPins[dependency.path], 'dependency ' + dependency.path);
  requireSource(new Set(dependencies.map(dependency => dependency.path)).size === 9, 'unique dependencies');
}
/** Admitted immutable source context only. It is not a current execution proof. */
export function nativeGameIoWriterSource(): NativeGameIoWriterSourceRules {
  admitGameIoWriterSource();
  return rules;
}
