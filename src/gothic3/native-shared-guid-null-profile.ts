/** Source admission for the selected Shared GUIDNull initializer. Captured
 * CRT context and cold image bytes establish no traversal or live state. */
import rulesDocument from '../../assets/gothic3/shared-guid-null/runtime-rules.json';
import evidenceDocument from '../../assets/gothic3/shared-guid-null/native-evidence.json';
import manifestDocument from '../../assets/gothic3/shared-guid-null/source-manifest.json';
import cppDocument from '../../assets/gothic3/shared-guid-null/tables/cppInitializers.json';
import cDocument from '../../assets/gothic3/shared-guid-null/tables/cInitializers.json';
import focusedRulesDocument from '../../assets/gothic3/script-admin-startup/runtime-rules.json';
import focusedEvidenceDocument from '../../assets/gothic3/script-admin-startup/native-evidence.json';
import initializerAsm from '../../assets/gothic3/shared-guid-null/sources/SharedBase/100e1470.asm.txt?raw';

type Immutable<T> = T extends readonly (infer Item)[] ? readonly Immutable<Item>[] :
  T extends object ? { readonly [Key in keyof T]: Immutable<T[Key]> } : T;
export interface NativeSharedImageReceipt {
  readonly module: string; readonly address: string; readonly bytes: number;
  readonly raw: string; readonly knownMask: string; readonly sha256: string;
  readonly scope: string; readonly liveValueCaptured: boolean;
  readonly section: Readonly<{ virtualAddress: number; virtualSize: number; rawSize: number;
    rawOffset: number; fileBackedBytes: number; loaderZeroFillBytes: number }>;
  readonly canonicalSlice?: Readonly<{ table: string; offset: number; independentAllocationAllowed: boolean }>;
}
export type NativeSharedImageLabel = 'guidNullSourceLiteral' | 'guidNullPayload' |
  'guidNullInitializerSlot' | 'cppInitializers' | 'cInitializers';
export interface NativeSharedGuidNullSourceProfile {
  readonly schema: string;
  readonly inputs: Immutable<typeof rulesDocument.inputs>;
  readonly rules: Immutable<typeof rulesDocument>;
  readonly evidence: Immutable<typeof evidenceDocument>;
  readonly moduleHeader: Immutable<typeof evidenceDocument.moduleHeader>;
  readonly constBytes: Immutable<typeof rulesDocument.constBytes>;
  readonly coldGlobals: Immutable<typeof rulesDocument.coldGlobals>;
  readonly initializerTables: Readonly<{ cppInitializers: Immutable<typeof cppDocument>;
    cInitializers: Immutable<typeof cDocument> }>;
}
const sharedHash = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214';
const zero16Hash = '374708fff7719dd5979ec875d56cd2286f6d3cf7ec317a3b25632aab28ec37bb';
const focusedEvidenceHash = '456ff56ca1fd8712ce26a7db35c0f5c0dfb28d2f36b2dff3206603b820bf8fd5';
const focusedRulesHash = '8b060600ec713aa480557f67a0d7a1e6be034c0ff2288a9e5b526e3915a84125';
const normalization = 'rstrip-line-whitespace; LF line endings; final newline';
// Keep admission's immutable dependency copies private; other owners retain
// their existing imported documents and mutation/lifetime contracts.
const focusedRules = structuredClone(focusedRulesDocument);
const focusedEvidence = structuredClone(focusedEvidenceDocument);
function freeze(value: unknown): void {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
}
for (const value of [rulesDocument, evidenceDocument, manifestDocument, cppDocument, cDocument,
  focusedRules, focusedEvidence]) freeze(value);
const profile: NativeSharedGuidNullSourceProfile = Object.freeze({
  schema: rulesDocument.schema, inputs: rulesDocument.inputs, rules: rulesDocument,
  evidence: evidenceDocument, moduleHeader: evidenceDocument.moduleHeader,
  constBytes: rulesDocument.constBytes, coldGlobals: rulesDocument.coldGlobals,
  initializerTables: Object.freeze({ cppInitializers: cppDocument, cInitializers: cDocument }),
});
function requireSource(value: boolean, label: string): void {
  if (!value) throw new Error('Original Shared GUIDNull source receipt differs: ' + label);
}
function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
const ownMethods = [
  ['guidNullInitializer', '100e1470', '100e1470-100e149c', 9, 45,
    'fe95f9b100333ef62ca804d288a0db74d3c72240b197fa4b92481e1be29d1e03',
    'a128bb0e108b0d2cbb0e108b1530bb0e10a350b11a10a134bb0e10890d54b11a10891558b11a10a35cb11a10c3',
    '597c5d7ead2e8d4a5fc3efdd4877065ce5b75d3ab89e3c67c120902331cc9a44'],
  ['cinit', '100aa632', '100aa632-100aa6c3', 50, 146,
    '41b51da16ad44681b0fb71a91e74220b1b07a950bcbd5eb4cb42c3ee734ca9c9',
    '833d68d50e1000741a6868d50e10e8bb42000085c059740bff742404ff1568d50e1059e8ad9d00006878560e10685c540e10e814feffff85c059597554565768e7b80b10e855ccffffbe00500e108bc6bf58530e103bc759730f8b0685c07402ffd083c6043bf772f1833d8c852f10005f5e741b688c852f10e85042000085c059740c6a006a026a00ff158c852f1033c0c3',
    '4092891669518d6a222a45abae6d90d297d46aa2a5268c79e307936e314c5c3f'],
  ['inittermE', '100aa47d', '100aa47d-100aa49c', 15, 32,
    '8026cc99de5f0f5083710e0c1f52beb27aede69826b267d12e8ccbe42ca3ca60',
    '568b74240833c0eb0f85c075118b0e85c97402ffd183c6043b74240c72eb5ec3',
    '659dc0fd570ee1ee627191c87d6d7f8109955375de4692265df46e369205f080'],
] as const;
const reusedMethods = [
  ['guidIsNull', '10003fd0', '10012710', '10012710-1001272e', 12, 31,
    '3b51a10464785c496b0f7a62a357ec7cb5172533ec2ceafc9ee59fc4928e2e03', 'e93be70000',
    '7ffa92cd0a5a6c33cd30a69ec8dc461c855fd07f37d39cab6721b59e804cd137',
    '3b12d8c7baa517827316cecd93535c2393b4612a757291c7b7dbf63d99a3cddb'],
  ['guidEqualsRaw', '100075f4', '10012290', '10012290-10012330', 66, 161,
    '547f5bb93125da1133935d868b524c211fef6404611e336905b1672e6a6f534c', 'e997ac0000',
    '8710dfd458c5980202fcdb7db20ea828699fd1dce349bd5e16a03f9eee9c44de',
    'd74c0c7cf5078e661f524bf532ae0eebf5cbbd3a7b5caa82d47cccd3321f1b1e'],
  ['guidDtor', '100015cd', '10012440', '10012440-10012440', 1, 1,
    'ae3f4619b0413d70d3004b9131c3752153074e45725be13b9a148978895e359e', 'e96e0e0100',
    'ed875d7134456c28d56fec2017618d7d1a67651ab561366e316c93ed5b9a39ce',
    'ea9d8fe7cffbd3664bf640652c84b8fe4c1fdda8fc4dcda7927c2e0d75795fd1'],
] as const;
const cppCallbacks = [[65, '100e1660'], [130, '100e1440'], [131, '100e1450'],
  [132, '100e1470'], [133, '100e14b0'], [134, '100e14c0'], [135, '100e14d0'],
  [136, '100e14e0'], [138, '100e14f0'], [139, '100e1500'], [140, '100e1510'],
  [141, '100e15d0'], [142, '100e1600'], [143, '100e1610'], [144, '100e1630'],
  [145, '100e1670'], [146, '100e1680']] as const;
const cCallbacks = [[65, '100a7265'], [66, '100b1854'], [67, '100b4b6b'],
  [68, '100bef05'], [69, '100ce0f5']] as const;
function tableRaw(slots: number, callbacks: readonly (readonly [number, string])[]): string {
  const targets = new Map<number, string>(callbacks);
  return Array.from({ length: slots }, (_, index) => {
    const target = targets.get(index) ?? '00000000';
    return target.slice(6, 8) + target.slice(4, 6) + target.slice(2, 4) + target.slice(0, 2);
  }).join('');
}
const tablePins = {
  cppInitializers: ['100e5000', '100e5358', 214, 856,
    'fd99f7fcf539bc68eea33517557e25e1478c48baa66261e6658f02fad3552833',
    '36b9a77e36331d980f3fe71c8ddb5a6a442189fde846689bb360b0639ff674bf', 21111, cppCallbacks],
  cInitializers: ['100e545c', '100e5678', 135, 540,
    'f215c2271c89b18acd8f55938e07e3b8905b43d4cd683f37545c961d8f87eafc',
    '0fc6f972ff2f4330e75e4d3f64f44152dac732f93404ab4b4fe41c335d1e4821', 12885, cCallbacks],
} as const;
const selectedSlot = Object.freeze({ index: 132, slot: '100e5210', target: '100e1470',
  nonNullOrdinal: 4, method: 'guidNullInitializer', slotStorage: 'guidNullInitializerSlot',
  table: 'cppInitializers', tableOffset: 528, precedingNonNullCallbacks: 3,
  selectedCallbackExecuted: false });

/** Returns the immutable original receipt, never a live allocation. The
 * selected slot is a canonical slice of the complete C++ table. */
export function nativeSharedImageReceipt(label: NativeSharedImageLabel): NativeSharedImageReceipt {
  requireSource(rulesDocument.schema === 'gothic3-shared-guid-null-rules-v1' &&
    rulesDocument.inputs.SharedBase === sharedHash && evidenceDocument.inputs.SharedBase === sharedHash,
    'image receipt input');
  const receipt: NativeSharedImageReceipt = label === 'cppInitializers' ? cppDocument :
    label === 'cInitializers' ? cDocument : label === 'guidNullPayload' ? rulesDocument.coldGlobals.guidNullPayload :
    rulesDocument.constBytes[label];
  const address = label === 'guidNullSourceLiteral' ? '100ebb28' : label === 'guidNullPayload' ? '101ab150' :
    label === 'guidNullInitializerSlot' ? '100e5210' : tablePins[label][0];
  const bytes = label === 'guidNullInitializerSlot' ? 4 : label === 'cppInitializers' || label === 'cInitializers' ? tablePins[label][3] : 16;
  const raw = label === 'guidNullInitializerSlot' ? '70140e10' : label === 'cppInitializers' || label === 'cInitializers' ?
    tableRaw(tablePins[label][2], tablePins[label][7]) : '00'.repeat(16);
  const hash = label === 'guidNullInitializerSlot' ? '23fa7187e776035dea37132704e113b418da3831fa088c9470f4fc8782ff918c' :
    label === 'cppInitializers' || label === 'cInitializers' ? tablePins[label][4] : zero16Hash;
  const cold = label === 'guidNullPayload';
  requireSource(receipt.module === 'SharedBase' && receipt.address === address && receipt.bytes === bytes &&
    receipt.raw === raw && receipt.knownMask === 'ff'.repeat(bytes) && receipt.sha256 === hash &&
    receipt.liveValueCaptured === false && receipt.scope === (cold ? 'cold-original-image' : 'original-file-backed-constant') &&
    same(receipt.section, cold ? { virtualAddress: 1306624, virtualSize: 1807760, rawSize: 16384,
      rawOffset: 1306624, fileBackedBytes: 0, loaderZeroFillBytes: 16 } : {
      virtualAddress: 937984, virtualSize: 366840, rawSize: 368640, rawOffset: 937984,
      fileBackedBytes: bytes, loaderZeroFillBytes: 0 }), label);
  if (label === 'guidNullInitializerSlot') requireSource(same(receipt.canonicalSlice,
    { table: 'cppInitializers', offset: 528, independentAllocationAllowed: false }), 'slot canonical slice');
  return receipt;
}

let admitted = false;
/** Static source admission only. Contextual cinit/inittermE receipts remain
 * unimplemented and do not certify selected or prior callback execution. */
export function admitNativeSharedGuidNullSource(): void {
  if (admitted) return;
  requireSource(rulesDocument.schema === 'gothic3-shared-guid-null-rules-v1' &&
    evidenceDocument.schema === 'gothic3-shared-guid-null-evidence-v1' &&
    manifestDocument.schema === 'gothic3-shared-guid-null-source-manifest-v1' &&
    focusedRules.schema === 'gothic3-script-admin-startup-rules-v1' &&
    focusedEvidence.schema === 'gothic3-script-admin-startup-evidence-v1' &&
    [rulesDocument, evidenceDocument, manifestDocument, focusedRules, focusedEvidence].every(document =>
      document.inputs.SharedBase === sharedHash), 'immutable original Shared image');
  requireSource(Object.keys(rulesDocument.methods).length === 3 && evidenceDocument.methods.length === 3,
    'own method count');
  for (const [label, address, range, count, bytes, hash, raw, asmHash] of ownMethods) {
    const rule = rulesDocument.methods[label], method = evidenceDocument.methods.find(entry => entry.label === label);
    let nextAddress = Number.parseInt(address, 16);
    requireSource(rule.module === 'SharedBase' && rule.entry === address && rule.body === address &&
      rule.bodyRanges === range && rule.instructionCount === count && rule.bodyBytes === bytes &&
      rule.bodyInstructionBytesSha256 === hash && rule.entryChain.length === 0 &&
      rule.role === (label === 'guidNullInitializer' ? 'selected-initializer' : 'context-only') &&
      rule.sourceRefs.assembly === 'sources/SharedBase/' + address + '.asm.txt' &&
      rule.sourceRefs.assemblySha256 === asmHash && !!method && method.module === 'SharedBase' &&
      method.entryVA === '0x' + address && method.bodyVA === '0x' + address && method.bodyRanges === range &&
      method.instructionCount === count && method.bodyByteCount === bytes && method.bodyInstructionBytesSha256 === hash &&
      method.entryChain.length === 0 && method.instructions.length === count &&
      method.instructions.map(row => row.bytes).join('') === raw && method.instructions.every(row => {
        const actual = Number.parseInt(row.va, 16);
        const valid = actual === nextAddress && /^(?:[0-9a-f]{2})+$/.test(row.bytes) &&
          row.fileOffset === actual - 0x10000000 && row.rva === (actual - 0x10000000).toString(16);
        nextAddress += row.bytes.length / 2;
        return valid;
      }) && nextAddress === Number.parseInt(address, 16) + bytes && same(method.sourceRefs, rule.sourceRefs), label);
  }
  const initializer = evidenceDocument.methods.find(method => method.label === 'guidNullInitializer')!;
  const initializerRule = rulesDocument.methods.guidNullInitializer;
  requireSource(initializerRule.sourceCGap === true && initializerRule.sourceASMGap === false &&
    initializerRule.originalCatalogGap === true && initializer.sourceCGap === true &&
    initializer.sourceASMGap === false && initializer.originalCatalogGap === true &&
    !('c' in initializerRule.sourceRefs) && !('reconstructedC' in initializer) &&
    initializer.originalSymbols?.length === 1 && initializer.originalSymbols[0]?.address === '100e1470' &&
    initializer.originalSymbols[0]?.name === 'LAB_100e1470' && initializer.originalSymbols[0]?.csvLine === 35011 &&
    initializerAsm === initializer.instructions.map(row => row.va + ' | ' + row.bytes + ' | ' + row.instruction).join('\n') + '\n' &&
    initializer.instructions.every((row, index) => row.assemblyLine === 235606 + index &&
      row.va === rulesDocument.layouts.guidNull.initializerDwordOperations[index]?.va &&
      row.fileOffset === Number.parseInt(row.va, 16) - 0x10000000 && row.rva === row.va.slice(3)),
    'existing ASM-only initializer provenance');
  for (const [label, cHash] of [['cinit', 'ecd254380e4b98cd0dc845744165ba3befd2fee86377012a761970bcbcfeac2d'],
    ['inittermE', '278cac8d22ca568773e4d2fa51a2fba55272ed1cfffd68a7b77e63a17d2b31e8']] as const) {
    const refs = rulesDocument.methods[label].sourceRefs;
    requireSource(refs.c === 'sources/SharedBase/' + rulesDocument.methods[label].body + '.c.txt' &&
      refs.cSha256 === cHash && refs.cNormalization === normalization, 'unchanged contextual C: ' + label);
  }
  for (const label of ['guidNullSourceLiteral', 'guidNullPayload', 'guidNullInitializerSlot', 'cppInitializers', 'cInitializers'] as const) {
    nativeSharedImageReceipt(label);
  }
  requireSource(same(rulesDocument.constBytes, evidenceDocument.constBytes) &&
    same(rulesDocument.coldGlobals, evidenceDocument.coldGlobals) &&
    same(rulesDocument.coldGlobals.guidNullPayload, focusedRules.coldGlobals.guidNullPayload), 'canonical cold payload dependency');
  for (const label of ['cppInitializers', 'cInitializers'] as const) {
    const table = profile.initializerTables[label], summary = rulesDocument.initializerTables[label];
    const [address, end, slots, bytes, hash, sourceHash, sourceBytes, callbacks] = tablePins[label];
    const nonNull = new Map<number, string>(callbacks);
    let ordinal = 0;
    requireSource(table.address === address && table.exclusiveEnd === end && table.bytes === bytes &&
      table.slots === slots && table.elementBytes === 4 && table.sha256 === hash && table.nonNullCount === callbacks.length &&
      table.wholeTableExecuted === false && table.entries.length === slots && table.entries.every((entry, index) => {
        const target = nonNull.get(index) ?? '00000000';
        if (target !== '00000000') ordinal++;
        return entry.index === index && entry.slot === (Number.parseInt(address, 16) + index * 4).toString(16) &&
          entry.target === target && entry.nonNullOrdinal === (target === '00000000' ? null : ordinal);
      }) && same(table.nonNullCallbacks, table.entries.filter(entry => entry.target !== '00000000')) &&
      same(summary.nonNullCallbacks, table.nonNullCallbacks) && summary.sourceRef.path === 'tables/' + label + '.json' &&
      summary.sourceRef.sha256 === sourceHash && summary.sourceRef.bytes === sourceBytes &&
      same(summary, evidenceDocument.initializerTables[label]), 'complete original table: ' + label);
  }
  requireSource(same(cppDocument.selectedGuidNullInitializer, selectedSlot) &&
    same(rulesDocument.initializerTables.cppInitializers.selectedGuidNullInitializer, selectedSlot) &&
    same(rulesDocument.startup.selectedGuidNullInitializer, selectedSlot), 'physical selected slot');
  for (const [label, entry, body, range, count, bytes, hash, jump, asmHash, cHash] of reusedMethods) {
    const method = rulesDocument.reusedMethods[label], canonical = focusedRules.methods[label];
    const evidence = focusedEvidence.methods.find(candidate => candidate.label === label);
    requireSource(method.module === 'SharedBase' && method.entry === entry && method.body === body &&
      method.bodyRanges === range && method.instructionCount === count && method.bodyBytes === bytes &&
      method.bodyInstructionBytesSha256 === hash && method.entryChain.length === 1 &&
      same(method.entryChain[0], { va: entry, bytes: jump, targetVA: body }) &&
      method.sourceOwner.package === 'script-admin-startup' && method.sourceOwner.method === label &&
      method.sourceDependency === 'scriptAdminStartup' && method.reusedReceipt === '../script-admin-startup/native-evidence.json' &&
      method.sourceRefs.assembly === '../script-admin-startup/sources/SharedBase/' + body + '.asm.txt' &&
      method.sourceRefs.assemblySha256 === asmHash && method.sourceRefs.c === '../script-admin-startup/sources/SharedBase/' + body + '.c.txt' &&
      method.sourceRefs.cSha256 === cHash && method.sourceRefs.cNormalization === normalization &&
      canonical.module === 'SharedBase' && canonical.entry === entry && canonical.body === body &&
      canonical.bodyRanges === range && canonical.instructionCount === count && canonical.bodyBytes === bytes &&
      canonical.bodyInstructionBytesSha256 === hash && same(canonical.entryChain, method.entryChain) &&
      canonical.sourceRefs.assembly === 'sources/SharedBase/' + body + '.asm.txt' &&
      canonical.sourceRefs.assemblySha256 === asmHash && canonical.sourceRefs.c === 'sources/SharedBase/' + body + '.c.txt' &&
      canonical.sourceRefs.cSha256 === cHash && canonical.sourceRefs.cNormalization === normalization &&
      !!evidence && evidence.bodyInstructionBytesSha256 === hash && evidence.instructionCount === count &&
      evidence.bodyByteCount === bytes && same(method, evidenceDocument.reusedMethods[label]), 'reused focused receipt: ' + label);
  }
  requireSource(Object.keys(rulesDocument.reusedMethods).length === 3 &&
    same(rulesDocument.dependencies, evidenceDocument.dependencies) && same(rulesDocument.dependencies.scriptAdminStartup, {
      path: '../script-admin-startup/native-evidence.json', bytes: 487958, sha256: focusedEvidenceHash,
      methods: ['guidIsNull', 'guidEqualsRaw', 'guidDtor'], contextualCallers: ['propertyIdSetGuid'],
      runtimeRules: { path: '../script-admin-startup/runtime-rules.json', bytes: 145603, sha256: focusedRulesHash },
      canonicalColdImage: { group: 'coldGlobals', label: 'guidNullPayload', module: 'SharedBase', address: '101ab150',
        bytes: 16, sha256: zero16Hash, independentLiveAllocationAllowed: false },
    }), 'focused evidence/rules dependency pins');
  requireSource(rulesDocument.callSites.length === 2 && same(rulesDocument.callSites, evidenceDocument.callSites), 'native focused callsites');
  for (const [index, va, raw, caller, callee, entry, body, hash, target, line] of [
    [0, '10092b5c', 'e86f14f7ff', 'propertyIdSetGuid', 'guidIsNull', '100053e9', '10092b40',
      '675e7b3cb14e0009900cbc249640e6f3738c01f4370dae1a7a62fd6a097458e6', '10003fd0', 156968],
    [1, '1001271f', 'e8d04effff', 'guidIsNull', 'guidEqualsRaw', '10003fd0', '10012710',
      '3b51a10464785c496b0f7a62a357ec7cb5172533ec2ceafc9ee59fc4928e2e03', '100075f4', 22133],
  ] as const) {
    const call = rulesDocument.callSites[index];
    requireSource(!!call && call.va === va && call.bytes === raw && call.caller === caller && call.callee === callee &&
      call.callerEntry === entry && call.callerBody === body && call.callerBodyInstructionBytesSha256 === hash &&
      call.instruction === 'CALL 0x' + target && call.assemblyLine === line && call.module === 'SharedBase' &&
      call.sourceOwner.package === 'script-admin-startup' && call.sourceOwner.method === caller &&
      call.sourceDependency === 'scriptAdminStartup' && focusedRules.methods[caller].bodyInstructionBytesSha256 === hash &&
      focusedEvidence.methods.find(method => method.label === caller)?.instructions.some(row =>
        row.va === va && row.bytes === raw && row.assemblyLine === line && row.instruction === call.instruction) === true,
      'actual original call: ' + va);
  }
  requireSource(same(rulesDocument.startup, evidenceDocument.startup) &&
    ['wholeTableExecuted', 'priorCallbacksExecuted', 'selectedBodyExecuted', 'crtTraversalImplemented',
      'contextualMethodsImplemented', 'cCallbacksExecuted', 'canonicalLiveImageEstablished'].every(flag =>
      (rulesDocument.startup as unknown as Record<string, unknown>)[flag] === false) &&
    rulesDocument.startup.precedingCppCallbacks.length === 3 && rulesDocument.startup.precedingCppCallbacks.every((entry, index) =>
      entry.target === cppCallbacks[index]?.[1] && entry.nativeRuntimeOwnerAdmitted === false &&
      entry.transitivePrerequisitesImplemented === false && entry.bodyCapturedByThisPackage === false &&
      entry.originalCatalogPresent === (index > 0) && entry.originalAssemblyEntryPresent === (index > 0)),
    'context remains unexecuted');
  requireSource(same(rulesDocument.layouts, evidenceDocument.layouts) &&
    rulesDocument.layouts.guidNull.payloadBytes === 16 && rulesDocument.layouts.guidNull.source === 'guidNullSourceLiteral' &&
    rulesDocument.layouts.guidNull.destination === 'guidNullPayload' &&
    ['validBytePresent', 'validityOrPaddingExtentEstablished', 'physicalObjectSizeEstablished',
      'initialColdZeroIsInitializedState', 'nativeGuardPresent', 'selectedInitializerRegistersCleanup',
      'selectedInitializerCallsDestructor'].every(flag =>
      (rulesDocument.layouts.guidNull as unknown as Record<string, unknown>)[flag] === false) &&
    evidenceDocument.directOperandReferences.absoluteOperandSearchOnly === true &&
    evidenceDocument.directOperandReferences.wholeMemoryWriterClosureProven === false &&
    evidenceDocument.directOperandReferences.rows.length === 19, 'selected scope and cold/live distinction');
  admitContextAndManifest();
  admitted = true;
}

/** Returns immutable source after admission; callers still need actual
 * canonical platform-image identity and successful selected execution. */
export function nativeSharedGuidNullSource(): NativeSharedGuidNullSourceProfile {
  admitNativeSharedGuidNullSource();
  return profile;
}

function admitContextAndManifest(): void {
  // Additional immutable header/operation/manifest pins are below. They are
  // source checks, never modeled native startup operations.
  requireSource(evidenceDocument.moduleHeader.base === '10000000' && evidenceDocument.moduleHeader.sizeOfImage === 3203072,
    'module base/extent');
  const header = evidenceDocument.moduleHeader;
  const sectionPins = [
    ['.text', '10001000', '1000', 930343, 933888, 4096, '60000020', true, false, true],
    ['.rdata', '100e5000', 'e5000', 366840, 368640, 937984, '40000040', true, false, false],
    ['.data', '1013f000', '13f000', 1807760, 16384, 1306624, 'c0000040', true, true, false],
    ['.idata', '102f9000', '2f9000', 6242, 8192, 1323008, 'c0000040', true, true, false],
    ['Shared', '102fb000', '2fb000', 20712, 24576, 1331200, 'c0000040', true, true, false],
    ['.tls', '10301000', '301000', 2005, 4096, 1355776, 'c0000040', true, true, false],
    ['.rsrc', '10302000', '302000', 1670, 4096, 1359872, '40000040', true, false, false],
    ['.reloc', '10303000', '303000', 42219, 45056, 1363968, '42000040', true, false, false],
  ] as const;
  requireSource(header.sections.length === sectionPins.length && sectionPins.every((pin, index) => {
    const [name, address, rva, virtualSize, rawSize, rawOffset, characteristics, readable, writable, executable] = pin;
    return same(header.sections[index], { name, address, rva, virtualSize, rawSize, rawOffset,
      characteristics, readable, writable, executable });
  }), 'all original PE sections/access permissions');
  const module = evidenceDocument.modules.SharedBase;
  requireSource(module.module === 'SharedBase.dll' && module.inputSha256 === sharedHash &&
    module.functionsCsvSha256 === '6575dbc046d114939cf7d21c41c0f8b46033979db81d14b2bff96c19de8b91b1' &&
    module.assemblySha256 === '138421416f7ceb98d40d7d2fb9ea847b898fe804e010a70bfaff414e5f292430' &&
    module.verifiedAgainstOriginalPE === true && module.imports.length === 0 &&
    evidenceDocument.originalSymbolsSha256 === 'e2183d170e5e6d0d1f8d8afdd97fb7b0b7cdc31dfbdaea2a98545a5ecac81dc0',
    'original module provenance');
  const operations = [
    { va: '100e1470', operation: 'load', register: 'eax', storage: 'guidNullSourceLiteral', offset: 0, bytes: 4 },
    { va: '100e1475', operation: 'load', register: 'ecx', storage: 'guidNullSourceLiteral', offset: 4, bytes: 4 },
    { va: '100e147b', operation: 'load', register: 'edx', storage: 'guidNullSourceLiteral', offset: 8, bytes: 4 },
    { va: '100e1481', operation: 'store', register: 'eax', storage: 'guidNullPayload', offset: 0, bytes: 4 },
    { va: '100e1486', operation: 'load', register: 'eax', storage: 'guidNullSourceLiteral', offset: 12, bytes: 4 },
    { va: '100e148b', operation: 'store', register: 'ecx', storage: 'guidNullPayload', offset: 4, bytes: 4 },
    { va: '100e1491', operation: 'store', register: 'edx', storage: 'guidNullPayload', offset: 8, bytes: 4 },
    { va: '100e1497', operation: 'store', register: 'eax', storage: 'guidNullPayload', offset: 12, bytes: 4 },
    { va: '100e149c', operation: 'return' },
  ];
  requireSource(same(rulesDocument.layouts.guidNull.initializerDwordOperations, operations) &&
    rulesDocument.layouts.guidNull.initializerMethod === 'guidNullInitializer', 'exact retained DWORD operation order');
  const traversalPins = [['100aa65a', '6878560e10', 'PUSH 0x100e5678', 184715],
    ['100aa65f', '685c540e10', 'PUSH 0x100e545c', 184716],
    ['100aa664', 'e814feffff', 'CALL 0x100aa47d', 184717],
    ['100aa66d', '7554', 'JNZ 0x100aa6c3', 184721],
    ['100aa67b', 'be00500e10', 'MOV ESI,0x100e5000', 184726],
    ['100aa682', 'bf58530e10', 'MOV EDI,0x100e5358', 184728]] as const;
  requireSource(rulesDocument.traversalOperandPins.length === 6 &&
    same(rulesDocument.traversalOperandPins, evidenceDocument.traversalOperandPins) &&
    traversalPins.every(([va, bytes, instruction, assemblyLine], index) => {
      const row = rulesDocument.traversalOperandPins[index];
      return !!row && row.va === va && row.bytes === bytes && row.instruction === instruction &&
        row.assemblyLine === assemblyLine && row.fileOffset === Number.parseInt(va, 16) - 0x10000000 &&
        row.rva === va.slice(3);
    }), 'contextual traversal operands');
  const audit = { selectedMethods: 3, instructions: 74, bodyBytes: 223, uniqueInstructionCount: 74,
    byteMismatchCount: 0, completeSelectedBodyExtents: true, allSelectedInstructionBytesMatchOriginalPE: true,
    recoveredPEInstructions: 0, asmOnlyMethods: 1, reconstructedCExcerpts: 2, reusedMethods: 3,
    reusedInstructions: 79, reusedBodyBytes: 193, reusedCallSites: 2, cppSlots: 214,
    cppNonNullCallbacks: 17, cSlots: 135, cNonNullCallbacks: 5, tableBytes: 1396,
    sourceExcerptNormalization: normalization, nativeCodeExecuted: false, liveProcessStateCaptured: false,
    fullSharedCrtTraversalImplemented: false };
  requireSource(same(evidenceDocument.audit, audit) && same(manifestDocument.audit, audit) &&
    manifestDocument.artifactPath === 'assets/gothic3/shared-guid-null' &&
    manifestDocument.sourceLocationsExplicit === true && manifestDocument.manifestSelfReferenceExcluded === true &&
    manifestDocument.noTestsOrBuildRunByProducer === true && manifestDocument.files.length === 22 &&
    new Set(manifestDocument.files.map(file => file.path)).size === 22, 'complete static audit/manifest scope');
  admitManifestRecords();
  requireSource(same(rulesDocument.sourceDiscrepancies, evidenceDocument.sourceDiscrepancies) &&
    rulesDocument.sourceDiscrepancies.length === 1 && rulesDocument.sourceDiscrepancies[0]?.method === 'inittermE' &&
    rulesDocument.sourceDiscrepancies[0]?.originalDeclaration === 'void __initterm_e(undefined4 *param_1,undefined4 *param_2)' &&
    rulesDocument.sourceDiscrepancies[0]?.assemblyReturnRegister === 'eax' &&
    rulesDocument.sourceDiscrepancies[0]?.callerResultTestAddress === '100aa669' &&
    rulesDocument.sourceDiscrepancies[0]?.nonzeroResultBranchAddress === '100aa66d' &&
    rulesDocument.sourceDiscrepancies[0]?.reconstructedSourceModified === false, 'original C/ASM discrepancy');
}


function admitManifestRecords(): void {
  const records = [
    ["assets/gothic3/script-admin-startup/native-evidence.json", "repo", 487958, "456ff56ca1fd8712ce26a7db35c0f5c0dfb28d2f36b2dff3206603b820bf8fd5"],
    ["assets/gothic3/script-admin-startup/runtime-rules.json", "repo", 145603, "8b060600ec713aa480557f67a0d7a1e6be034c0ff2288a9e5b526e3915a84125"],
    ["assets/gothic3/script-admin-startup/sources/SharedBase/10012290.asm.txt", "repo", 2197, "8710dfd458c5980202fcdb7db20ea828699fd1dce349bd5e16a03f9eee9c44de"],
    ["assets/gothic3/script-admin-startup/sources/SharedBase/10012290.c.txt", "repo", 957, "d74c0c7cf5078e661f524bf532ae0eebf5cbbd3a7b5caa82d47cccd3321f1b1e"],
    ["assets/gothic3/script-admin-startup/sources/SharedBase/10012440.asm.txt", "repo", 20, "ed875d7134456c28d56fec2017618d7d1a67651ab561366e316c93ed5b9a39ce"],
    ["assets/gothic3/script-admin-startup/sources/SharedBase/10012440.c.txt", "repo", 103, "ea9d8fe7cffbd3664bf640652c84b8fe4c1fdda8fc4dcda7927c2e0d75795fd1"],
    ["assets/gothic3/script-admin-startup/sources/SharedBase/10012710.asm.txt", "repo", 378, "7ffa92cd0a5a6c33cd30a69ec8dc461c855fd07f37d39cab6721b59e804cd137"],
    ["assets/gothic3/script-admin-startup/sources/SharedBase/10012710.c.txt", "repo", 301, "3b12d8c7baa517827316cecd93535c2393b4612a757291c7b7dbf63d99a3cddb"],
    ["assets/gothic3/shared-guid-null/README.md", "output", 2356, "5b49c2cbef87756a423ad485915afba89e40febbac92f2e03f81f83ba6ac897f"],
    ["assets/gothic3/shared-guid-null/native-evidence.json", "output", 29516, "c340d5b10e223fef6dd25b94852ee6771ff13b2d0d2e394aa78006f526a38e04"],
    ["assets/gothic3/shared-guid-null/runtime-rules.json", "output", 14537, "d30afbb07080d5c3b8e6904c183f130d447c1e320d3525f2b15caa08ec8c8c86"],
    ["assets/gothic3/shared-guid-null/sources/SharedBase/100aa47d.asm.txt", "output", 496, "659dc0fd570ee1ee627191c87d6d7f8109955375de4692265df46e369205f080"],
    ["assets/gothic3/shared-guid-null/sources/SharedBase/100aa47d.c.txt", "output", 426, "278cac8d22ca568773e4d2fa51a2fba55272ed1cfffd68a7b77e63a17d2b31e8"],
    ["assets/gothic3/shared-guid-null/sources/SharedBase/100aa632.asm.txt", "output", 1707, "4092891669518d6a222a45abae6d90d297d46aa2a5268c79e307936e314c5c3f"],
    ["assets/gothic3/shared-guid-null/sources/SharedBase/100aa632.c.txt", "output", 883, "ecd254380e4b98cd0dc845744165ba3befd2fee86377012a761970bcbcfeac2d"],
    ["assets/gothic3/shared-guid-null/sources/SharedBase/100e1470.asm.txt", "output", 428, "597c5d7ead2e8d4a5fc3efdd4877065ce5b75d3ab89e3c67c120902331cc9a44"],
    ["assets/gothic3/shared-guid-null/tables/cInitializers.json", "output", 12885, "0fc6f972ff2f4330e75e4d3f64f44152dac732f93404ab4b4fe41c335d1e4821"],
    ["assets/gothic3/shared-guid-null/tables/cppInitializers.json", "output", 21111, "36b9a77e36331d980f3fe71c8ddb5a6a442189fde846689bb360b0639ff674bf"],
    ["tools/gothic3/prepare_crt_undname_source.py", "repo", 28683, "f7021acfb8820e4c3bad4781a32464807972288240af7c5549cfcaee346cf699"],
    ["tools/gothic3/prepare_runtime_admin_source.py", "repo", 40500, "31dae731178e61ec02a46c2a517b8743c6b7d2c2ba543db22cacc50c27fc70a1"],
    ["tools/gothic3/prepare_shared_guid_null_source.py", "producer", 28635, "3ad68faee6f27a39b39b0560125c37158b37316960cae837bae0d600dc7d3b0e"],
    ["tools/gothic3/read_dialogue_native_evidence.py", "repo", 11400, "27982125c2dee8c83c1f900ddd70eef7ad0d50dd1b3f5bc0ec40dd85c0127d46"],
  ] as const;
  requireSource(records.length === manifestDocument.files.length && records.every(([path, location, bytes, sha256], index) =>
    same(manifestDocument.files[index], { path, location, bytes, sha256 })), 'exact source/producer/dependency manifest records');
  const references = [
    ["10012719", "6850b11a10", 22131],
    ["10012882", "3d50b11a10", 22265],
    ["1001288d", "8b1550b11a10", 22270],
    ["10012895", "a154b11a10", 22272],
    ["1001289d", "8b1558b11a10", 22274],
    ["100128a6", "a15cb11a10", 22276],
    ["100129a5", "81f950b11a10", 22362],
    ["100129c6", "8b1550b11a10", 22371],
    ["100129cc", "8b0d54b11a10", 22372],
    ["100129d8", "8b1558b11a10", 22374],
    ["100129e4", "8b0d5cb11a10", 22376],
    ["100e1470", "a128bb0e10", 235606],
    ["100e1475", "8b0d2cbb0e10", 235607],
    ["100e147b", "8b1530bb0e10", 235608],
    ["100e1481", "a350b11a10", 235609],
    ["100e1486", "a134bb0e10", 235610],
    ["100e148b", "890d54b11a10", 235611],
    ["100e1491", "891558b11a10", 235612],
    ["100e1497", "a35cb11a10", 235613],
  ] as const;
  requireSource(references.every(([va, bytes, line], index) => {
    const row = evidenceDocument.directOperandReferences.rows[index];
    return !!row && row.va === va && row.bytes === bytes && row.assemblyLine === line &&
      row.fileOffset === Number.parseInt(va, 16) - 0x10000000 && row.rva === va.slice(3);
  }), 'bounded original absolute-operand references');
}
