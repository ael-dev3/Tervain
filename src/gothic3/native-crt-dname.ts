/** Retained Engine CRT HeapManager/DName/Replicator primitives. These are the
 * selected physical graph operations, not a complete Microsoft demangler. */
import sourceText from '../../assets/gothic3/crt-undname/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryBacking } from './native-memory-admin';
import { NativeGameCrtOwner } from './native-game-crt';
import { admitNativeGameCrtSource, nativeGameImageReceipt } from './native-game-crt-profile';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
function fact<T>(result: NativeValue<T>, operation: string): T {
  if (!result.known) throw new Error(operation + ': ' + result.reason);
  return result.value;
}
function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function uint(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Actual native unsigned DWORD required');
}
function fresh(bytes: number): NativeHeapObjectViews {
  return new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(bytes), knownMask: new Uint8Array(bytes), freed: false });
}
function subview(fields: NativeHeapObjectViews, begin: number, length: number): NativeHeapObjectViews {
  if (begin < 0 || length < 0 || begin + length > fields.bytes.length) throw new Error('CRT subview outside its retained physical object');
  // Preserve backing identity and physical offset, including a caller's subview.
  const relative = fields.bytes.byteOffset - fields.backing.bytes.byteOffset;
  return new NativeHeapObjectViews(fields.backing, relative + begin, length);
}
interface SourceRange { address: string; bytes: number; raw: string }
interface SourceRules {
  schema: string; inputs: { Engine: string };
  constBytes: Record<string, SourceRange>;
  methods: Record<string, { entry: string; body: string; bodyInstructionBytesSha256: string }>;
}
const source = JSON.parse(sourceText) as SourceRules;
const entries: Record<string, readonly [string, string]> = {
  heapGetMemory: ['30696bf0', '5885ef8c4c2c11a760c1c5e5b72c81cdff4498c6c0f08dcc6bf4759577520076'],
  heapDestructor: ['30696606', '7240f5c4af9b71314832dede1b11ec12132e169829273dc80a516cf351961f34'],
  replicatorConstructor: ['306972b8', '10aa1a13d6a1a005ffb3959bdf9eeedf15e1ca58b9aaec8b0b204762e179dca6'],
  replicatorAppend: ['306972d6', 'e23b2baff71710fef3f17c195214bf88c727edc543ea8ddaf1fc12cd1b482c75'],
  replicatorLookup: ['30696e2d', 'e90ba5f876fa66cd09a0cc1e3dff93e458a8ae2fc1af918dfed70b3de8c19b1f'],
  dnameCopyConstructor: ['30696c93', '22eeb723a5ce45dfd1aa18fc0eac1e42f55c7056ea135450d9a86576200ec857'],
  dnameAssign: ['30696da9', '6092345761e20b79efe5f85cce1c7e3f599aab47d5ee82d240ed30c3c14bc0bf'],
  dnamePointerConstructor: ['30696ffb', '3d6d7656f2053e81460ee4e706c23afe627d8bf55b973c6df2e1be3a7239102e'],
  dnameStatusConstructor: ['30697051', 'bbce95d9c3fe1c33a20e763a9103c5fe543a8913ba978d62cda6446ec809e3a9'],
  dnameAssignStatus: ['30697237', 'be8d49c37bcd1549d1f3114d8bef973e293b488d123b2bc825c341a224c8883d'],
  dnameIsValid: ['306970b2', '96b22d177ed2a689f182acee9ce39a518b2f0e84a9291080864dbbfc209900ad'],
  dnameIsEmpty: ['306970c9', '090f282989d8b04187ed3e8fd62d8f990456f804741ff750a7d0c42fa50acb6c'],
  dnameLength: ['30697114', '0fe5d55f6f86a90523cc8f0556670ce586279a421c2d2686ac833d17dd0cf22e'],
  dnameGetString: ['30697171', 'c5e95141d6047f9c69c2b94ed990459372c66598753f6cc2b34a3e8cf850b644'],
  dnameCloneNode: ['3069731d', '294d9e288a2b84d3016bef9cd69efd7744de4aaa983888038946675365b4d3fc'],
  dnameTextNodeConstructor: ['30697364', '33d7ac0c54ed12da554b0f0187303c663c45f6aa642d518dd87a3472ab9e6903'],
  dnameIndirectNodeConstructor: ['30696ec9', '36455fc169400fdcbc45a9c4bcfad35e1f5e9dcff20c1c94c82473813b7e142b'],
  dnameTextNodeGetString: ['306973db', 'b9c6c4ce908f3b00ae5db5cec532266cd71288b2341ee043b9208ffab2648240'],
  dnameIndirectNodeLength: ['3069740c', '747076544dd68a9c3c9c8996b1583a7173480bdc8e3f390d85652048f412c284'],
  dnameIndirectNodeGetString: ['3069742a', '767bcbf8b079244670988ad0f16bbfc038c5828b8a443c7f7daf411abee88d32'],
  dnameDoPchar: ['3069760c', '14ff39f8d2f44247c299d7ffa88cf3d5bee62a238db4ede18b34da28d607b07b'],
  dnameCharConstructor: ['306976b2', '03b494be34cd2555f1dcb43badc71017867a9b3736e59ac9c366bbf5329073c5'],
  dnameTextConstructor: ['306976d8', 'b5ea63b3511900ff77580161bcfe26c89e8046b7d33d107687a9c291308cc1dd'],
  dnameDelimitedConstructor: ['30697709', 'b28a7979f8797f684584712d69fe13c6bf321b680c271447e95d3cb6accbc086'],
  dnameConcat: ['30697906', 'ad2472d219743788dec4e13650a0adec9101873ea40468a3bdd44dc446aa2e95'],
  dnamePointerConcat: ['30697968', 'e5cb7141176b76cf1f413c74f09e3906de4b015433a5ac4affcaa08aaecb02a2'],
  dnameAssignText: ['30697a0f', '497112b515454ee35aa2ecb02e759cd29b3e44aa74d6353f486b4f2e667c9887'],
  dnamePlus: ['30697b16', 'eae1aa310e597134ce69be74b6253365ae768313fe00d3037fc5360cdf1fc4ae'],
  dnameLastChar: ['30697139', '09585411a7dcbf80d194c6186ed230a1d69737aa6b8fffbf5b4994442c4500a3'],
  dnameConcatStatus: ['3069752b', '7fd5dc077cfd829437e70592606c4f5ac943ba22308f712967496a2c2e2f613a'],
  dnameNodeConcat: ['30696e63', 'a11ae770c8ade5fbf75502f3534d89fe9e721e9cacbd7709edc34a0d5e2eecde'],
  undStrncpy: ['30696f3c', '7778f334bcc5a59f32ecc12d663ac57a31e732a98e4b20d28849b48b6ccfee9d'],
  dnameStatusNodeConstructor: ['30696ef8', 'dd323b3c540365b1786c1964edc3eebcf1e4095d3ffd08b84aa2817ca04d7414'],
  dnameCharNodeLength: ['30696ea2', '194f81a127723ec366ff0b8410df190c0649a05808a94d5554d82de5af7f425b'],
  dnameCharNodeLastChar: ['30696ea6', '8a905797df24e4a1fe68a2f630971aa55b606cd6a92fed57303379d0f93a7a2d'],
  dnameCharNodeGetString: ['30696eaa', 'fa0056337c92666278e6c7abcd8865d37a30de6c4fd69098420aaf6355b8158f'],
  dnameTextNodeLength: ['30696ec5', '2e339cdc5de837ec151dbde90057caeabba18ac3ea32e7c2cffc8f95df41a6ff'],
  dnameTextNodeLastChar: ['306973c9', '38996d7d955cf4bc9a93b1c898cfd439cf057d2c230677d1bd2490d46ddac017'],
  dnameIndirectNodeLastChar: ['3069741b', 'f2c386e622c75c51e32bf72841e8b2591a235036f50a0bc27243ef3d5085f290'],
  dnameStatusNodeLength: ['30696f1d', '2e339cdc5de837ec151dbde90057caeabba18ac3ea32e7c2cffc8f95df41a6ff'],
  dnameStatusNodeLastChar: ['30696f21', '98243bf07e739751c43f4af9524f082a3baa83d05f90b778eb6687f5cba62a6c'],
  dnameStatusNodeGetString: ['30697447', '2ba077c833024726f34c1597141e08618c6e7206d5b964e952ada2603598ebf9'],
};
function admit(): void {
  if (source.schema !== 'gothic3-crt-undname-rules-v1' ||
      source.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3') {
    throw new Error('Original Engine CRT graph source input differs');
  }
  for (const [label, [entry, hash]] of Object.entries(entries)) {
    const method = source.methods[label];
    if (!method || method.entry !== entry || method.body !== entry || method.bodyInstructionBytesSha256 !== hash) {
      throw new Error('Original CRT graph method receipt differs: ' + label);
    }
  }
}
function constant(label: string, address: string, bytes: number): NativeHeapObjectViews {
  admit(); const range = source.constBytes[label];
  const raw: Record<string, string> = {
    charNodeVtable: 'a26e6930a66e6930aa6e6930', indirectNodeVtable: '0c7469301b7469302a746930',
    statusNodeVtable: '1d6f6930216f693047746930', textNodeVtable: 'c56e6930c9736930db736930',
    truncatedNameText: '203f3f2000', classKeyword: '636c6173732000',
    genericTypePrefix: '67656e657269632d747970652d00',
    templateParameterPrefix: '74656d706c6174652d706172616d657465722d00',
  };
  if (!range || range.address !== address || range.bytes !== bytes || range.raw !== raw[label]) {
    throw new Error('Original CRT graph constant differs: ' + label);
  }
  return new NativeHeapObjectViews({ identity: {}, bytes: Uint8Array.from(range.raw.match(/../g)!, byte => parseInt(byte, 16)),
    knownMask: new Uint8Array(bytes).fill(255), freed: false });
}

interface NativeCrtDNameGraphProfile {
  readonly module: 'Engine' | 'Game';
  readonly owner: NativeGameCrtOwner | null;
  admit(): void;
  constant(label: string, address: string, bytes: number): NativeHeapObjectViews;
  address(label: string): number;
}
const engineDNameGraphProfile: NativeCrtDNameGraphProfile = Object.freeze({ module: 'Engine', owner: null,
  admit, constant, address: (label: string) => {
    admit(); const range = source.constBytes[label];
    if (!range) throw new Error('Original Engine CRT graph address is not admitted: ' + label);
    return parseInt(range.address, 16);
  } });
const gameDNameGraphProfiles = new WeakMap<NativeGameCrtOwner, NativeCrtDNameGraphProfile>();
const gameScratchHosts = new WeakMap<NativeGameCrtOwner, NativeCrtScratchHost>();
const gameDNameMethodPins = [
  ['unDName','2047cca1','7a59153542d6dfa3dd5ce87fe024eabe602bbdb9be7e6ebe6dab61db400c6aa9'],
  ['unDNameCleanup','2047cd3b','cadca7e681971bfe8ee2d9516ecabcad25b3a7c320a7565b81bc5cd99c8942cc'],
  ['ensureLock','204736e9','b82b0a9bfd5d85292b7de7d7e94b6eaa309a0fd030a807438939fbf3d64c0a26'],
  ['mtInitLocks','2047361e','fdc3b3bd6a6a9e6f3938945524d9076a4b9c0e7672dc1bb642d042274f2a47fb'],
  ['mtDeleteLocks','20473667','7eb26841548ba19651fd3840bd3eff3b38e22ab02547ebd164c3d77d8875c793'],
  ['lock','204737ac','d38c92fe9ba4a577050a6108f14298a1e4319c8f40a054cb88e662b8c888c24b'],
  ['unlock','204736bc','2105e18945d52532e7c2979f396347cf51f429150f76cf26ea9370477e2228a5'],
  ['ensureLockCleanup','204737a3','7c8670c564d00524ac491f13c55e55718cd88f082aaecb91b1a141f2e86a4042'],
  ['mallocCrt','2046838e','ce7bb44e9953221ceb28425d6e1199ad59db7f780d0ceb83f1e40b3b3f9ec445'],
  ['errno','2046a282','0e0cc0d6c4d377eb8cef5833010fe4226fac61ce169f7f15a854c29ac2fd369d'],
  ['initCritSecAndSpinCount','204741c7','e4666cc20a730154db1404bbc0399373039275646b82e22fa0378d722eab79f9'],
  ['initCritSecFallback','204741b7','6a9d71899ceb3082f087906258408e630305ba10629333b4d896cc95e2582953'],
  ['heapInit','204769c5','ce939dcc3ad91e76647b492a04691ef9c17f59001477c59565acf0e60a1e34d0'],
  ['heapSelect','2047696a','55125c157c9960c0666bdff6a6e40615791f661a48f66be0f41b8c9b26a3f6fb'],
  ['getOsPlatform','2046645f','8238dbabcb9734239b406d95487b627a7bc5b94028b162086f03ba7b23cef692'],
  ['getWinMajor','2046650e','19e3d59dee8ead8449a03d4bf3d56b285c319cb145f588b18e9f01750b216777'],
  ['mtInit','204681d9','3e80229254d0d800267a9cf2495fd9ce8b6c4157620b1553cbc33900a041ba68'],
  ['crtAttach','204677e4','9469f04e5cd533e1cf5aaa85553339f7e4eb4eb7f38ec894a6b4d8dd0493be27'],
  ['unDecoratorConstructor','20478eb0','6cdc3344a10620f1f27f5ec361dcf142eb302c5f160f0811a290c42f8fed0cbf'],
  ['unDecoratorToString','2047c9ee','64b67aa0283cd06f3aa70c36c7271fe93ba11d1a0824529583166670cec9abfb'],
  ['getDecoratedName','2047bd2d','d1f9df04ac3b9fabe06a5edefa09a802c675a0c17f6c780090b781a20d75c55a'],
  ['getDataType','2047d2ac','46b012a7c059b4324d5a87f2624b5729552a9602ac2b5a8e83610065a382f682'],
  ['getDataIndirectType','2047c50a','406811e251c1d162aa8bc8d5282689896f591de4f1a642aef64f46ad2ce1584b'],
  ['getPrimaryDataType','2047d16e','1cfab994505a2c6cf818e124a9913572a8e7ae7e3b2304438001531afacbe5d6'],
  ['getSimpleDataType','2047cde7','dec106c9751f6c1987ab54b7405c657798f423a6e4bb198fa51a87d94d92339c'],
  ['getECSUDataType','2047b013','f158657392304544e387eeced61523f2ba2b7ecebc844ee1f7bf72306214ac6f'],
  ['getScopedName','2047af20','3f3e7bffd4025b3596c31ad4cf90055839c96e0d0bf4acb46f4c611353ed6e3d'],
  ['getZName','2047ad36','1c4fcf12a1cf6b0a2158bda9b72b2fd6a6f7abaff7e00e5d602cc2a055ab3d80'],
  ['dnameDelimitedConstructor','2047913f','14e57005518e956e28130cacf4ed717c0096f6b868d6dccbb98a1047f4eeab7c'],
  ['dnameDoPchar','20479042','21f45ecbe3505d49379ff3924f7175b7fb6a211816ad2a843e029bd9295fcea7'],
  ['heapGetMemory','20478626','774936df235c70bcd973832bc64d958ab076c5572fa56dd24b384f0282f02195'],
  ['heapDestructor','2047803c','7240f5c4af9b71314832dede1b11ec12132e169829273dc80a516cf351961f34'],
  ['replicatorConstructor','20478cee','10aa1a13d6a1a005ffb3959bdf9eeedf15e1ca58b9aaec8b0b204762e179dca6'],
  ['replicatorAppend','20478d0c','c397c6a3d16e75cbd3cda0cb2ea5935d43edbfd2d387841d1008cdd66f525e3e'],
  ['replicatorLookup','20478863','e90ba5f876fa66cd09a0cc1e3dff93e458a8ae2fc1af918dfed70b3de8c19b1f'],
  ['dnameCopyConstructor','204786c9','22eeb723a5ce45dfd1aa18fc0eac1e42f55c7056ea135450d9a86576200ec857'],
  ['dnameAssign','204787df','6092345761e20b79efe5f85cce1c7e3f599aab47d5ee82d240ed30c3c14bc0bf'],
  ['dnameNodeConcat','20478899','a11ae770c8ade5fbf75502f3534d89fe9e721e9cacbd7709edc34a0d5e2eecde'],
  ['dnameIndirectNodeConstructor','204788ff','e4acd38671c6aff51bf8745427d7ac5cdf7c870c0ddf3fbe2af3c12f60d06c89'],
  ['dnamePointerConstructor','20478a31','048fcca74389f77955e29f6242e67d31a5bc02709013d5c0c85559d16d7362ae'],
  ['dnameStatusConstructor','20478a87','13fcb4f86f3436e484c4896ce8b717c747b926fd9a11c8d5ccef9a728b79150b'],
  ['dnameStatusNodeConstructor','2047892e','4271e131e9fedb530c13407d8f609c5ddfad24af252f0cbe9021925b5016f157'],
  ['dnameIsValid','20478ae8','96b22d177ed2a689f182acee9ce39a518b2f0e84a9291080864dbbfc209900ad'],
  ['dnameIsEmpty','20478aff','090f282989d8b04187ed3e8fd62d8f990456f804741ff750a7d0c42fa50acb6c'],
  ['dnameLength','20478b4a','0fe5d55f6f86a90523cc8f0556670ce586279a421c2d2686ac833d17dd0cf22e'],
  ['dnameGetString','20478ba7','d32d61092521d2eae5507224e1def7ded600474009db53b535dbf9b5060ff350'],
  ['dnameAssignStatus','20478c6d','92549e749c14cdea1dfd1a8b517cc99349dd3b42b77daba7ec250bc7030cbd26'],
  ['dnameCloneNode','20478d53','72341a8053abdc185e3c2f3e029223ae2c5277b028df948df44677a861733e79'],
  ['dnameTextNodeConstructor','20478d9a','86c84ced32c6af929ee008e0a8ecf4ca42b5266712b0f7039296149dc51ca6fd'],
  ['undStrncpy','20478972','7778f334bcc5a59f32ecc12d663ac57a31e732a98e4b20d28849b48b6ccfee9d'],
  ['dnameTextNodeGetString','20478e11','b9c6c4ce908f3b00ae5db5cec532266cd71288b2341ee043b9208ffab2648240'],
  ['dnameIndirectNodeLength','20478e42','747076544dd68a9c3c9c8996b1583a7173480bdc8e3f390d85652048f412c284'],
  ['dnameIndirectNodeGetString','20478e60','767bcbf8b079244670988ad0f16bbfc038c5828b8a443c7f7daf411abee88d32'],
  ['dnameConcatStatus','20478f61','b933828fa19aba87aa27dc433078dc2f5ea197ed359f6159974d3b349f33f8db'],
  ['dnameAssignPointer','20478fda','6c8b477dfae976fae8c116e617c95d8e7cb3cfbb7c31d7f7f056f7dddfed7aac'],
  ['dnameCharConstructor','204790e8','03b494be34cd2555f1dcb43badc71017867a9b3736e59ac9c366bbf5329073c5'],
  ['dnameTextConstructor','2047910e','b5ea63b3511900ff77580161bcfe26c89e8046b7d33d107687a9c291308cc1dd'],
  ['dnameConcat','2047933c','ad2472d219743788dec4e13650a0adec9101873ea40468a3bdd44dc446aa2e95'],
  ['dnamePointerConcat','2047939e','9d1df1ea448b85f2695400f0ddc85ae1fa97883c61b9df846d8e4141a67adedc'],
  ['dnameAssignText','20479445','497112b515454ee35aa2ecb02e759cd29b3e44aa74d6353f486b4f2e667c9887'],
  ['dnamePlus','2047954c','eae1aa310e597134ce69be74b6253365ae768313fe00d3037fc5360cdf1fc4ae'],
  ['heapTerm','20476a1f','868c2a5c0c2513e2f30c43de68269b0e831f008db50344a87749aa9bffb27f2b'],
  ['malloc','20467ba7','50aa761bd1f0486a1b70619e6fed78062aafadd2b3a93fb23f36fd79f123be5b'],
  ['free','20467c6a','3f5fc78854ea9f1f767cfc155b115eb851f7d6f40a9939e546f05f04f94380cf'],
  ['freeCleanup','20467cc0','965025cf74f46720c1e4c5715f1a35cad9ff3d7c4605853842c1e72361112095'],
  ['callNewHandler','204742dd','160648d4dfe805c18330e90a7c986972b8fc124d36218225201ff8ac4decec70'],
  ['osErrorToErrno','2046a247','a91bbfd4e58fd6df8310bcee293b7d970db633c705fd26d7c84b8c6da9fec845'],
  ['encodePointer','20467d64','7a6aca648a5272b8b66761e76fa72b6bbeebdfd4b789904b3cc43f084e01bd63'],
  ['decodePointer','20467ddb','cb3a88e5fa9e53d81b30478aa8d45b6777c4d25366401ea4d3cf3e85a9678ab0'],
  ['pointerEncodingAvailability','20467cf8','2bb95172deaa8938ccf70800daf9e2f5df280344fd4146477554a70cd194d2a9'],
  ['dnameLastChar','20478b6f','09585411a7dcbf80d194c6186ed230a1d69737aa6b8fffbf5b4994442c4500a3'],
  ['dnameCharNodeLength','204788d8','194f81a127723ec366ff0b8410df190c0649a05808a94d5554d82de5af7f425b'],
  ['dnameCharNodeLastChar','204788dc','8a905797df24e4a1fe68a2f630971aa55b606cd6a92fed57303379d0f93a7a2d'],
  ['dnameCharNodeGetString','204788e0','fa0056337c92666278e6c7abcd8865d37a30de6c4fd69098420aaf6355b8158f'],
  ['dnameTextNodeLength','204788fb','2e339cdc5de837ec151dbde90057caeabba18ac3ea32e7c2cffc8f95df41a6ff'],
  ['dnameTextNodeLastChar','20478dff','38996d7d955cf4bc9a93b1c898cfd439cf057d2c230677d1bd2490d46ddac017'],
  ['dnameIndirectNodeLastChar','20478e51','f2c386e622c75c51e32bf72841e8b2591a235036f50a0bc27243ef3d5085f290'],
  ['dnameStatusNodeLength','20478953','2e339cdc5de837ec151dbde90057caeabba18ac3ea32e7c2cffc8f95df41a6ff'],
  ['dnameStatusNodeLastChar','20478957','98243bf07e739751c43f4af9524f082a3baa83d05f90b778eb6687f5cba62a6c'],
  ['dnameStatusNodeGetString','20478e7d','06ad20ab5fa464a9edb35092bbf8409e1ab1fa2e70bffb01f8dbf17a7383c38b'],
  ['typeInfoNameWrapper','204637e0','e993582193b053903a0233de11767e2e5f59a078350762db06ef08338e02abd8'],
  ['typeInfoNameBody','20468806','ae3f48bda6d41d14a3400665b49065f62042dbdc693472b12fd404ea3e3c4c5d'],
  ['typeInfoNameCleanup','204688f2','084f61fec2079ea071aa64ca396a8cf17ca74fc4087f67de3aba1218e37a4ff0'],
  ['strlen','2046dbd0','5044fc769fb26ae1772d18e3e1ef5ffc16757c910207278cab8d90af3557a7f0'],
  ['strcpyS','20475b80','e89637c58c0e259c517f45d4767114aefa4e9842a76ea63e47746a1d683170a5'],
] as const;

function gameDNameGraphProfile(crt: NativeGameCrtOwner): NativeCrtDNameGraphProfile {
  if (crt.module !== 'Game' || NativeGameCrtOwner.forPlatform(crt.host) !== crt) {
    throw new Error('Canonical Game CRT owner required for the Game DName graph');
  }
  const existing = gameDNameGraphProfiles.get(crt);
  if (existing) return existing;
  const profile: NativeCrtDNameGraphProfile = Object.freeze({
    module: 'Game', owner: crt,
    admit: () => {
      admitNativeGameCrtSource();
      for (const [label, entry, hash] of gameDNameMethodPins) {
        const method = crt.sourceProfile.heapRules.methods[label];
        if (method?.module !== 'Game' || method.entry !== entry || method.body !== entry ||
            method.bodyInstructionBytesSha256 !== hash) throw new Error('Game DName source receipt differs: ' + label);
      }
    },
    constant: (label: string, address: string, bytes: number) => {
      const receipt = nativeGameImageReceipt(label);
      if (receipt.address !== address || receipt.bytes !== bytes || receipt.module !== 'Game') {
        throw new Error('Game DName image receipt differs: ' + label);
      }
      const image = crt.imageStorage(label), expected = Uint8Array.from(receipt.raw.match(/../g)!, byte => parseInt(byte, 16));
      if (image.bytes.length !== bytes || image.backing.freed || image.knownMask.some(mask => mask !== 255) ||
          image.bytes.some((byte, index) => byte !== expected[index])) {
        throw new Error('Game DName image bytes differ from their admitted receipt: ' + label);
      }
      return new NativeHeapObjectViews({ identity: {}, bytes: expected, knownMask: new Uint8Array(bytes).fill(255), freed: false });
    },
    address: (label: string) => parseInt(nativeGameImageReceipt(label).address, 16),
  });
  profile.admit(); gameDNameGraphProfiles.set(crt, profile); return profile;
}

function gameScratchHost(crt: NativeGameCrtOwner): NativeCrtScratchHost {
  if (crt.module !== 'Game' || NativeGameCrtOwner.forPlatform(crt.host) !== crt) {
    throw new Error('Canonical Game CRT owner required for the Game scratch arena');
  }
  let host = gameScratchHosts.get(crt);
  if (!host) {
    host = Object.freeze({ crtMalloc: (bytes: number) => crt.malloc(bytes),
      crtFree: (backing: NativeMemoryBacking) => crt.free(backing) });
    gameScratchHosts.set(crt, host);
  }
  return host;
}

export interface NativeCrtScratchHost {
  crtMalloc(bytes: number): NativeValue<NativeMemoryBacking | null>;
  crtFree(backing: NativeMemoryBacking): NativeValue<void>;
}
export interface NativeCrtBytePointer { readonly fields: NativeHeapObjectViews; readonly offset: number }
export interface NativeCrtByteCursor {
  get(): NativeCrtBytePointer | null;
  set(pointer: NativeCrtBytePointer | null): void;
}
export interface NativeCrtScratchSlice {
  readonly backing: NativeMemoryBacking;
  readonly offset: number;
  readonly requestedBytes: number;
  readonly roundedBytes: number;
  readonly fields: NativeHeapObjectViews;
}

/** Manager fields alias the first twenty bytes at30af7c54. Its callback and
 * zero stores belong to ___unDName; constructing this view performs no stores. */
export class NativeCrtScratchArena {
  readonly fields: NativeHeapObjectViews;
  readonly graphProfile: NativeCrtDNameGraphProfile;
  readonly gameOwner: NativeGameCrtOwner | null;
  private active = false;
  private reentrant = false;
  private boundary: string | null = null;
  private readonly blocks: NativeMemoryBacking[] = [];
  private readonly slices: NativeCrtScratchSlice[] = [];
  private readonly allocations: NativeMemoryBacking[] = [];
  constructor(private readonly host: NativeCrtScratchHost,
    private readonly options: { fields: NativeHeapObjectViews; checkpoint?: (operation: string) => void;
      gameOwner?: NativeGameCrtOwner }) {
    this.gameOwner = options.gameOwner ?? null;
    if (this.gameOwner) {
      this.graphProfile = gameDNameGraphProfile(this.gameOwner);
      if (host !== gameScratchHost(this.gameOwner)) throw new Error('Game scratch callbacks must be the canonical Game CRT owner');
      const globals = this.gameOwner.imageStorage('demanglerGlobals');
      if (options.fields.backing.identity !== globals.backing.identity ||
          options.fields.bytes.byteOffset - options.fields.backing.bytes.byteOffset !==
            globals.bytes.byteOffset - globals.backing.bytes.byteOffset || options.fields.bytes.length !== globals.bytes.length) {
        throw new Error('Game scratch arena must alias the physical Game demangler globals');
      }
    } else {
      admit(); this.graphProfile = engineDNameGraphProfile;
    }
    this.fields = subview(options.fields, 0, 20);
  }
  static forGame(crt: NativeGameCrtOwner, checkpoint?: (operation: string) => void): NativeCrtScratchArena {
    return new NativeCrtScratchArena(gameScratchHost(crt), {
      fields: crt.imageStorage('demanglerGlobals'), checkpoint, gameOwner: crt,
    });
  }
  static admitGame(crt: NativeGameCrtOwner): void { gameDNameGraphProfile(crt); gameScratchHost(crt); }
  static gameCallbacks(crt: NativeGameCrtOwner): NativeCrtScratchHost { return gameScratchHost(crt); }
  check(operation: string): void {
    if (this.reentrant) throw new Error('Unsupported reentry into CRT scratch arena');
    if (this.boundary) throw new Error(this.boundary);
    this.options.checkpoint?.(operation);
    if (this.reentrant) throw new Error('Unsupported reentry into CRT scratch arena');
  }
  private run<T>(operation: string, body: () => T): NativeValue<T> {
    if (this.active) { this.reentrant = true; return unknown('CRT scratch arena is already executing'); }
    this.active = true;
    try { this.check(operation); return known(body()); }
    catch (error) { this.boundary ??= message(error); return unknown(this.boundary); }
    finally { this.active = false; }
  }
  private malloc(bytes: number): NativeMemoryBacking | null {
    const callback = this.fields.pointer<object>(0).get();
    if (callback !== this.host.crtMalloc) throw new Error('CRT scratch allocator callback is not owned');
    this.check('heapGetMemory.malloc.before');
    const result = this.host.crtMalloc(bytes);
    // Retain a returned capability before a post-call guard. No source stores
    // follow an unknown/reentrant callback, but its allocation has happened.
    if (result.known && result.value) this.allocations.push(result.value);
    this.check('heapGetMemory.malloc.after');
    const backing = fact(result, 'CRT scratch malloc');
    if (backing && (typeof backing.identity !== 'object' || backing.identity === null || backing.freed ||
        backing.bytes.length < bytes || backing.bytes.length !== backing.knownMask.length ||
        this.allocations.slice(0, -1).some(previous => previous === backing || previous.identity === backing.identity))) {
      throw new Error('Actual fresh CRT scratch allocation required');
    }
    return backing;
  }
  allocate(bytes: number, direct = false): NativeValue<NativeCrtScratchSlice | null> {
    return this.run('heapGetMemory', () => {
      uint(bytes); let rounded = ((bytes + 7) >>> 0) & 0xfffffff8; rounded >>>= 0;
      if (direct) {
        const backing = this.malloc(rounded);
        if (!backing) return null;
        const slice = { backing, offset: 0, requestedBytes: bytes, roundedBytes: rounded,
          fields: new NativeHeapObjectViews(backing, 0, rounded) };
        this.slices.push(slice); return slice;
      }
      if (!rounded) rounded = 8;
      const remaining = this.fields.readUnsigned(16);
      if (remaining < rounded) {
        if (rounded > 4096) return null;
        const backing = this.malloc(4104);
        if (!backing) return null;
        const block = new NativeHeapObjectViews(backing);
        block.pointer<NativeMemoryBacking>(0).set(null);
        const tail = this.fields.pointer<NativeMemoryBacking>(12).get();
        if (tail) new NativeHeapObjectViews(tail).pointer<NativeMemoryBacking>(0).set(backing);
        else this.fields.pointer<NativeMemoryBacking>(8).set(backing);
        this.fields.pointer<NativeMemoryBacking>(12).set(backing);
        this.fields.writeUnsigned(16, 4096 - rounded);
        this.blocks.push(backing);
      } else this.fields.writeUnsigned(16, remaining - rounded);
      const backing = this.fields.pointer<NativeMemoryBacking>(12).get();
      if (!backing || !this.blocks.includes(backing)) throw new Error('CRT scratch tail has no owned block capability');
      const offset = 4 + this.fields.readUnsigned(16);
      const slice = { backing, offset, requestedBytes: bytes, roundedBytes: rounded,
        fields: new NativeHeapObjectViews(backing, offset, rounded) };
      this.slices.push(slice); return slice;
    });
  }
  cleanup(): NativeValue<void> {
    return this.run('heapDestructor', () => {
      const callback = this.fields.pointer<object>(4).get();
      if (!callback) return;
      if (callback !== this.host.crtFree) throw new Error('CRT scratch free callback is not owned');
      const visited = new Set<NativeMemoryBacking>();
      for (;;) {
        const block = this.fields.pointer<NativeMemoryBacking>(8).get();
        this.fields.pointer<NativeMemoryBacking>(12).set(block);
        if (!block) return;
        if (visited.has(block) || !this.blocks.includes(block)) throw new Error('CRT scratch linked block is not owned');
        visited.add(block);
        const next = new NativeHeapObjectViews(block).pointer<NativeMemoryBacking>(0).get();
        this.fields.pointer<NativeMemoryBacking>(8).set(next);
        this.check('heapDestructor.free.before');
        const result = this.host.crtFree(block);
        this.check('heapDestructor.free.after');
        fact(result, 'CRT scratch free');
        // _free is void. An owned HeapFree failure may store errno and return
        // without ending this block's lifetime; HeapManager still continues.
      }
    });
  }
  snapshot(): { fields: NativeHeapObjectViews; blocks: readonly NativeMemoryBacking[];
    allocations: readonly NativeMemoryBacking[]; slices: readonly NativeCrtScratchSlice[]; boundary: string | null } {
    return { fields: this.fields, blocks: [...this.blocks], allocations: [...this.allocations],
      slices: [...this.slices], boundary: this.boundary };
  }
}

export type NativeCrtDNameNodeKind = 'char' | 'text' | 'indirect' | 'status';
export class NativeCrtDNameNode {
  constructor(readonly factory: NativeCrtDNameFactory, readonly kind: NativeCrtDNameNodeKind,
    readonly slice: NativeCrtScratchSlice) {}
  get fields(): NativeHeapObjectViews { return this.slice.fields; }
  get next(): NativeCrtDNameNode | null { return this.fields.pointer<NativeCrtDNameNode>(4).get(); }
}
export class NativeCrtDNameRecord {
  constructor(readonly factory: NativeCrtDNameFactory, readonly fields: NativeHeapObjectViews) {
    if (fields.bytes.length !== 8) throw new Error('Physical eight-byte DName record required');
  }
  get head(): NativeCrtDNameNode | null { return this.fields.pointer<NativeCrtDNameNode>(0).get(); }
  get status(): number {
    const word = this.fields.maskedWord(4);
    if ((word.knownMask & 15) !== 15) throw new Error('DName status nibble contains unowned bits');
    return (word.value << 28) >> 28;
  }
  isValid(): boolean { const status = this.status; return status === 0 || status === 2; }
  isEmpty(): boolean { return this.head === null || !this.isValid(); }
  length(): number { return this.factory.length(this); }
  getLastChar(): number { return this.factory.lastChar(this); }
  writeString(destination: NativeCrtBytePointer | null, maxBytes: number): NativeValue<NativeCrtBytePointer | null> {
    return this.factory.writeString(this, destination, maxBytes);
  }
}

/** Each method follows the selected source stores. Graph authority is retained
 * node/record pointer slots; metadata is used only to admit virtual dispatch. */
export class NativeCrtDNameFactory {
  private active = false;
  private boundary: string | null = null;
  private reentrant = false;
  private readonly nodes = new WeakSet<NativeCrtDNameNode>();
  private readonly records = new WeakSet<NativeCrtDNameRecord>();
  private readonly vtables: Record<NativeCrtDNameNodeKind, NativeHeapObjectViews>;
  private readonly truncated: NativeHeapObjectViews;
  private readonly graphProfile: NativeCrtDNameGraphProfile;
  constructor(readonly arena: NativeCrtScratchArena) {
    this.graphProfile = arena.graphProfile;
    this.vtables = {
      char: this.graphProfile.constant('charNodeVtable', this.graphProfile.module === 'Game' ? '206bec94' : '3089f28c', 12),
      indirect: this.graphProfile.constant('indirectNodeVtable', this.graphProfile.module === 'Game' ? '206beca4' : '3089f29c', 12),
      status: this.graphProfile.constant('statusNodeVtable', this.graphProfile.module === 'Game' ? '206becb4' : '3089f2ac', 12),
      text: this.graphProfile.constant('textNodeVtable', this.graphProfile.module === 'Game' ? '206becc4' : '3089f2bc', 12),
    };
    this.truncated = this.graphProfile.constant('truncatedNameText', this.graphProfile.module === 'Game' ? '206becd0' : '3089f2c8', 5);
  }
  sourceConstant(label: string, address: string, bytes: number): NativeHeapObjectViews {
    return this.graphProfile.constant(label, address, bytes);
  }
  check(operation: string): void {
    if (this.reentrant) throw new Error('Unsupported reentry into CRT DName graph');
    if (this.boundary) throw new Error(this.boundary);
    this.arena.check(operation);
  }
  run<T>(operation: string, body: () => T): NativeValue<T> {
    if (this.active) { this.reentrant = true; return unknown('CRT DName graph is already executing'); }
    this.active = true;
    try { this.check(operation); return known(body()); }
    catch (error) { this.boundary ??= message(error); return unknown(this.boundary); }
    finally { this.active = false; }
  }
  private record(fields = fresh(8)): NativeCrtDNameRecord {
    const result = new NativeCrtDNameRecord(this, fields); this.records.add(result); return result;
  }
  private own(record: NativeCrtDNameRecord): void {
    this.check('DName.read');
    if (!this.records.has(record) || record.factory !== this) throw new Error('DName record has no owned physical capability');
  }
  private setBits(record: NativeCrtDNameRecord, mask: number, value: number): void {
    this.check('DName.store'); const word = record.fields.maskedWord(4);
    const oldMask = word.knownMask; word.value = ((word.value & ~mask) | (value & mask)) >>> 0;
    word.knownMask = (oldMask | mask) >>> 0;
  }
  private copyBits(target: NativeCrtDNameRecord, input: NativeCrtDNameRecord, mask: number): void {
    this.check('DName.copyBits'); const to = target.fields.maskedWord(4), from = input.fields.maskedWord(4);
    const knownMask = ((to.knownMask & ~mask) | (from.knownMask & mask)) >>> 0;
    to.value = ((to.value & ~mask) | (from.value & mask)) >>> 0; to.knownMask = knownMask;
  }
  private head(record: NativeCrtDNameRecord, node: NativeCrtDNameNode | null): void {
    this.check('DName.head.store'); record.fields.pointer<NativeCrtDNameNode>(0).set(node);
  }
  private allocation(bytes: number): NativeCrtScratchSlice | null {
    const result = fact(this.arena.allocate(bytes), 'HeapManager.getMemory'); this.check('DName.allocation.after'); return result;
  }
  private node(kind: NativeCrtDNameNodeKind, slice: NativeCrtScratchSlice): NativeCrtDNameNode {
    const node = new NativeCrtDNameNode(this, kind, slice); this.nodes.add(node);
    node.fields.pointer<NativeCrtDNameNode>(4).set(null);
    const label = { char: 'charNodeVtable', text: 'textNodeVtable', indirect: 'indirectNodeVtable',
      status: 'statusNodeVtable' }[kind];
    node.fields.writeUnsigned(0, this.graphProfile.address(label));
    return node;
  }
  private statusNode(status: number): NativeCrtDNameNode | null {
    const slice = this.allocation(16); if (!slice) return null;
    const node = this.node('status', slice); node.fields.writeUnsigned(8, status >>> 0);
    node.fields.writeUnsigned(12, status === 2 ? 4 : 0); return node;
  }
  private indirectNode(slice: NativeCrtScratchSlice, record: NativeCrtDNameRecord | null): NativeCrtDNameNode {
    const node = this.node('indirect', slice);
    if (record && (record.status === 1 || record.status === 3)) record = null;
    node.fields.pointer<NativeCrtDNameRecord>(8).set(record); return node;
  }
  empty(fields?: NativeHeapObjectViews): NativeValue<NativeCrtDNameRecord> {
    return this.run('DName.empty', () => { const record = this.record(fields);
      this.setBits(record, 0xfff, 0); this.head(record, null); return record; });
  }
  status(status: number, fields?: NativeHeapObjectViews): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameStatusConstructor', () => this.statusRaw(status, fields));
  }
  private statusRaw(status: number, fields?: NativeHeapObjectViews): NativeCrtDNameRecord {
    const record = this.record(fields); this.setBits(record, 15, status === 1 || status === 3 ? status : 0);
    const node = this.statusNode(status); this.setBits(record, 0xff0, 0); this.head(record, node);
    if (!node) this.setBits(record, 12, 0), this.setBits(record, 3, 3);
    return record;
  }
  private strlen(input: NativeCrtBytePointer): number {
    let length = 0; while (input.fields.readUnsigned(input.offset + length, 1)) length++; return length;
  }
  private strncpy(input: NativeCrtBytePointer, destination: NativeCrtBytePointer, count: number): void {
    uint(count);
    for (let index = 0; index < count; index++) {
      this.check('undStrncpy.byte'); const byte = input.fields.readUnsigned(input.offset + index, 1);
      destination.fields.writeUnsigned(destination.offset + index, byte, 1); if (!byte) break;
    }
  }
  private doPchar(record: NativeCrtDNameRecord, input: NativeCrtBytePointer | null, length: number): void {
    uint(length); const status = record.status;
    if (status === 1 || status === 3) return;
    if (record.head) { this.assignStatusRaw(record, 3); return; }
    if (!input || !length) { this.setBits(record, 14, 0); this.setBits(record, 1, 1); return; }
    const slice = this.allocation(length === 1 ? 12 : 16);
    let node: NativeCrtDNameNode | null = null;
    if (slice) {
      if (length === 1) {
        // Source reads the input byte before the three constructor stores.
        const byte = input.fields.readUnsigned(input.offset, 1);
        node = this.node('char', slice); node.fields.writeUnsigned(8, byte, 1);
      } else {
        node = this.node('text', slice);
        const payload = this.allocation(length);
        node.fields.pointer<NativeCrtScratchSlice>(8).set(payload); node.fields.writeUnsigned(12, length);
        if (payload) this.strncpy(input, { fields: payload.fields, offset: 0 }, length);
      }
    }
    this.head(record, node); if (!node) this.setBits(record, 12, 0), this.setBits(record, 3, 3);
  }
  fromBytes(input: NativeCrtBytePointer | null, fields?: NativeHeapObjectViews): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameTextConstructor', () => { const record = this.record(fields);
      this.setBits(record, 0xfff, 0); this.head(record, null);
      if (input) this.doPchar(record, input, this.strlen(input)); return record; });
  }
  assignText(target: NativeCrtDNameRecord, input: NativeCrtBytePointer): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameAssignText', () => {
      this.own(target); this.setBits(target, 0x8f0, 0);
      this.doPchar(target, input, this.strlen(input)); return target;
    });
  }
  fromChar(byte: number, fields?: NativeHeapObjectViews): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameCharConstructor', () => {
      if (!Number.isInteger(byte) || byte < 0 || byte > 255) throw new Error('Actual unsigned native character byte required');
      const record = this.record(fields); this.head(record, null); this.setBits(record, 0xfff, 0);
      if (byte) { const input = fresh(1); input.writeUnsigned(0, byte, 1); this.doPchar(record, { fields: input, offset: 0 }, 1); }
      return record;
    });
  }
  fromDelimited(cursor: NativeCrtByteCursor, delimiter: number, readFlags: () => number,
    fields?: NativeHeapObjectViews): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameDelimitedConstructor', () => {
      if (!Number.isInteger(delimiter) || delimiter < 0 || delimiter > 255) throw new Error('Actual native delimiter byte required');
      const record = this.record(fields); this.setBits(record, 0xfff, 0); this.head(record, null);
      const input = cursor.get();
      if (!input) { this.setBits(record, 14, 0); this.setBits(record, 1, 1); return record; }
      let pointer = input, length = 0, byte = pointer.fields.readUnsigned(pointer.offset, 1);
      if (!byte) { this.setBits(record, 13, 0); this.setBits(record, 2, 2); return record; }
      while (byte && byte !== delimiter) {
        const allowed = byte === 0x5f || byte === 0x24 || byte === 0x3c || byte === 0x3e || byte === 0x2d ||
          (byte >= 0x61 && byte <= 0x7a) || (byte >= 0x41 && byte <= 0x5a) || (byte >= 0x30 && byte <= 0x39) ||
          (byte >= 0x80 && byte <= 0xfe);
        if (!allowed && !(readFlags() & 0x10000)) {
          this.setBits(record, 14, 0); this.setBits(record, 1, 1); return record;
        }
        length++; pointer = { fields: pointer.fields, offset: pointer.offset + 1 };
        this.check('DName.cursor.store'); cursor.set(pointer); byte = pointer.fields.readUnsigned(pointer.offset, 1);
      }
      this.doPchar(record, input, length);
      pointer = cursor.get()!; byte = pointer.fields.readUnsigned(pointer.offset, 1);
      if (byte) {
        this.check('DName.cursor.store'); cursor.set({ fields: pointer.fields, offset: pointer.offset + 1 });
        if (byte === delimiter) this.setBits(record, 15, 0);
        else { this.head(record, null); this.setBits(record, 12, 0); this.setBits(record, 3, 3); }
      } else if (!record.status) { this.setBits(record, 13, 0); this.setBits(record, 2, 2); }
      return record;
    });
  }
  private copyRaw(input: NativeCrtDNameRecord, fields?: NativeHeapObjectViews): NativeCrtDNameRecord {
    this.own(input); const record = this.record(fields);
    for (const mask of [15, 16, 32, 64, 128]) this.copyBits(record, input, mask);
    this.head(record, input.head);
    for (const mask of [256, 512, 1024, 2048]) this.copyBits(record, input, mask);
    return record;
  }
  copy(input: NativeCrtDNameRecord, fields?: NativeHeapObjectViews): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameCopyConstructor', () => this.copyRaw(input, fields));
  }
  private assignRaw(target: NativeCrtDNameRecord, input: NativeCrtDNameRecord): NativeCrtDNameRecord {
    this.own(target); this.own(input);
    if (target.isValid()) {
      for (const mask of [15, 16, 32, 64, 128, 2048]) this.copyBits(target, input, mask);
      this.head(target, input.head);
    }
    return target;
  }
  assign(target: NativeCrtDNameRecord, input: NativeCrtDNameRecord): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameAssign', () => this.assignRaw(target, input));
  }
  fromPointer(input: NativeCrtDNameRecord | null, fields?: NativeHeapObjectViews): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnamePointerConstructor', () => {
      if (input) this.own(input); const record = this.record(fields);
      if (input) { const slice = this.allocation(12); const node = slice ? this.indirectNode(slice, input) : null;
        this.head(record, node); this.setBits(record, 15, node ? 0 : 3); }
      else { this.setBits(record, 15, 0); this.head(record, null); }
      this.setBits(record, 0xff0, 0); return record;
    });
  }
  private clone(node: NativeCrtDNameNode): NativeCrtDNameNode | null {
    this.ownNode(node, false); const slice = this.allocation(12); if (!slice) return null;
    const recordSlice = this.allocation(8); let record: NativeCrtDNameRecord | null = null;
    if (recordSlice) { record = this.record(recordSlice.fields); this.setBits(record, 0xfff, 0); this.head(record, node); }
    return this.indirectNode(slice, record);
  }
  private ownNode(node: NativeCrtDNameNode, dispatch = true): void {
    this.check('DNameNode.virtual');
    if (!this.nodes.has(node) || node.factory !== this) throw new Error('CRT DName node is not owned');
    if (!dispatch) return;
    const label = { char: 'charNodeVtable', text: 'textNodeVtable', indirect: 'indirectNodeVtable',
      status: 'statusNodeVtable' }[node.kind];
    const address = this.graphProfile.address(label);
    if (node.fields.readUnsigned(0) !== address) throw new Error('CRT DName virtual table differs from retained source');
    // The actual three virtual function DWORDs are admitted source bytes.
    this.vtables[node.kind].readUnsigned(0);
  }
  private *chain(head: NativeCrtDNameNode | null): Generator<NativeCrtDNameNode> {
    const seen = new Set<NativeCrtDNameNode>();
    for (let node = head; node; node = node.next) {
      this.ownNode(node, false); if (seen.has(node)) throw new Error('Cyclic CRT DName node chain is unsupported');
      seen.add(node); yield node;
    }
  }
  private nodeAppend(target: NativeCrtDNameNode, input: NativeCrtDNameNode | null): void {
    if (!input) return;
    let last = target; for (const node of this.chain(target)) last = node;
    this.check('DNameNode.next.store'); last.fields.pointer<NativeCrtDNameNode>(4).set(input);
  }
  private assignStatusRaw(target: NativeCrtDNameRecord, status: number): NativeCrtDNameRecord {
    this.own(target);
    if (status === 1 || status === 3) { this.head(target, null); if (target.status !== 3) this.setBits(target, 15, status); }
    else if (target.isValid()) {
      this.setBits(target, 0x8f0, 0); const node = this.statusNode(status); this.head(target, node);
      if (!node) this.setBits(target, 12, 0), this.setBits(target, 3, 3);
    }
    return target;
  }
  assignStatus(target: NativeCrtDNameRecord, status: number): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameAssignStatus', () => this.assignStatusRaw(target, status));
  }
  private appendStatusRaw(target: NativeCrtDNameRecord, status: number): NativeCrtDNameRecord {
    this.own(target);
    if (target.isEmpty() || status === 1 || status === 3) return this.assignStatusRaw(target, status);
    const statusNode = this.statusNode(status);
    if (!statusNode) this.head(target, null);
    else { const node = this.clone(target.head!); this.head(target, node); if (node) this.nodeAppend(node, statusNode); }
    if (!target.head) this.setBits(target, 12, 0), this.setBits(target, 3, 3);
    return target;
  }
  appendStatus(target: NativeCrtDNameRecord, status: number): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameConcatStatus', () => this.appendStatusRaw(target, status));
  }
  private appendRaw(target: NativeCrtDNameRecord, input: NativeCrtDNameRecord): NativeCrtDNameRecord {
    this.own(target); this.own(input);
    if (input.isEmpty()) return this.appendStatusRaw(target, input.status);
    if (target.isEmpty()) return this.assignRaw(target, input);
    const clone = this.clone(target.head!); this.head(target, clone);
    if (clone) this.nodeAppend(clone, input.head); else this.setBits(target, 12, 0), this.setBits(target, 3, 3);
    return target;
  }
  append(target: NativeCrtDNameRecord, input: NativeCrtDNameRecord): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameConcat', () => this.appendRaw(target, input));
  }
  plus(left: NativeCrtDNameRecord, right: NativeCrtDNameRecord, fields?: NativeHeapObjectViews): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnamePlus', () => {
      const result = this.copyRaw(left, fields);
      if (result.isEmpty()) return this.assignRaw(result, right);
      return right.isEmpty() ? this.appendStatusRaw(result, right.status) : this.appendRaw(result, right);
    });
  }
  private walk<T>(record: NativeCrtDNameRecord, visited: Set<NativeCrtDNameRecord>, body: () => T): T {
    this.own(record); if (visited.has(record)) throw new Error('Cyclic indirect CRT DName graph is unsupported');
    visited.add(record); try { return body(); } finally { visited.delete(record); }
  }
  private nodeLength(node: NativeCrtDNameNode, visited: Set<NativeCrtDNameRecord>): number {
    this.ownNode(node);
    if (node.kind === 'char') return 1;
    if (node.kind === 'text' || node.kind === 'status') return node.fields.readUnsigned(12) | 0;
    const record = node.fields.pointer<NativeCrtDNameRecord>(8).get(); return record ? this.lengthRaw(record, visited) : 0;
  }
  private lengthRaw(record: NativeCrtDNameRecord, visited: Set<NativeCrtDNameRecord>): number {
    return this.walk(record, visited, () => {
      if (record.isEmpty()) return 0; let sum = 0;
      for (const node of this.chain(record.head)) sum = (sum + this.nodeLength(node, visited)) | 0;
      return sum;
    });
  }
  length(record: NativeCrtDNameRecord): number { return this.lengthRaw(record, new Set()); }
  private lastRaw(record: NativeCrtDNameRecord, visited: Set<NativeCrtDNameRecord>): number {
    return this.walk(record, visited, () => {
      if (record.isEmpty()) return 0;
      let node: NativeCrtDNameNode | null = null;
      for (const item of this.chain(record.head)) if (this.nodeLength(item, visited) !== 0) node = item;
      if (!node) return 0;
      if (node.kind === 'char') return node.fields.readUnsigned(8, 1);
      if (node.kind === 'status') return node.fields.readUnsigned(8) === 2 ? 32 : 0;
      if (node.kind === 'indirect') { const ref = node.fields.pointer<NativeCrtDNameRecord>(8).get(); return ref ? this.lastRaw(ref, visited) : 0; }
      const length = node.fields.readUnsigned(12); if (!length) return 0;
      const payload = node.fields.pointer<NativeCrtScratchSlice>(8).get();
      if (!payload) throw new Error('Nonzero text-node length has NULL payload');
      return payload.fields.readUnsigned(length - 1, 1);
    });
  }
  lastChar(record: NativeCrtDNameRecord): number { return this.lastRaw(record, new Set()); }
  private nodeString(node: NativeCrtDNameNode, destination: NativeCrtBytePointer, count: number,
    visited: Set<NativeCrtDNameRecord>): NativeCrtBytePointer | null {
    this.ownNode(node); if (!count) return null;
    if (node.kind === 'char') { destination.fields.writeUnsigned(destination.offset, node.fields.readUnsigned(8, 1), 1); return destination; }
    if (node.kind === 'indirect') {
      const record = node.fields.pointer<NativeCrtDNameRecord>(8).get();
      return record ? this.stringRaw(record, destination, count, visited) : null;
    }
    count = Math.min(count, node.fields.readUnsigned(12) | 0);
    if (!count) return null;
    if (node.kind === 'status') {
      if (node.fields.readUnsigned(8) !== 2) return null;
      this.strncpy({ fields: this.truncated, offset: 0 }, destination, count); return destination;
    }
    const payload = node.fields.pointer<NativeCrtScratchSlice>(8).get(); if (!payload) return null;
    this.strncpy({ fields: payload.fields, offset: 0 }, destination, count); return destination;
  }
  private stringRaw(record: NativeCrtDNameRecord, destination: NativeCrtBytePointer | null, maxBytes: number,
    visited: Set<NativeCrtDNameRecord>): NativeCrtBytePointer | null {
    return this.walk(record, visited, () => {
      uint(maxBytes); let remaining = maxBytes, cursor = destination;
      if (!record.isEmpty()) {
        if (!destination) {
          remaining = (this.lengthRaw(record, new Set()) + 1) >>> 0;
          const slice = this.allocation(remaining); if (!slice) return null;
          destination = { fields: slice.fields, offset: 0 }; cursor = destination;
        }
        for (const node of this.chain(record.head)) {
          if ((remaining | 0) <= 0) break;
          let count = this.nodeLength(node, visited);
          if (count) {
            if (((remaining - count) | 0) < 0) count = remaining;
            if (this.nodeString(node, cursor!, count, visited)) {
              remaining = (remaining - count) >>> 0; cursor = { fields: cursor!.fields, offset: cursor!.offset + count };
            }
          }
        }
      } else if (!destination) return null;
      this.check('DName.getString.NUL'); cursor!.fields.writeUnsigned(cursor!.offset, 0, 1); return destination;
    });
  }
  writeString(record: NativeCrtDNameRecord, destination: NativeCrtBytePointer | null,
    maxBytes: number): NativeValue<NativeCrtBytePointer | null> {
    return this.run('dnameGetString', () => this.stringRaw(record, destination, maxBytes, new Set()));
  }
  /** Replicator calls this inside its own operation, following allocation then
   * copy-constructor source order without an extra stack allocation. */
  replicate(input: NativeCrtDNameRecord): NativeCrtDNameRecord | null {
    const slice = this.allocation(8); return slice ? this.copyRaw(input, slice.fields) : null;
  }
}

export class NativeCrtReplicator {
  readonly fields: NativeHeapObjectViews;
  private invalid: NativeCrtDNameRecord | null = null;
  private unavailable: NativeCrtDNameRecord | null = null;
  constructor(readonly factory: NativeCrtDNameFactory, fields: NativeHeapObjectViews) {
    this.fields = subview(fields, 0, 60);
  }
  construct(): NativeValue<void> {
    const invalid = this.factory.status(3, subview(this.fields, 44, 8));
    if (!invalid.known) return invalid; this.invalid = invalid.value;
    const unavailable = this.factory.status(1, subview(this.fields, 52, 8));
    if (!unavailable.known) return unavailable; this.unavailable = unavailable.value;
    return this.factory.run('replicatorConstructor.count', () => this.fields.writeUnsigned(0, 0xffffffff));
  }
  append(input: NativeCrtDNameRecord): NativeValue<void> {
    return this.factory.run('replicatorAppend', () => {
      if (this.fields.readUnsigned(0) !== 9 && !input.isEmpty()) {
        const record = this.factory.replicate(input);
        if (record) {
          const count = (this.fields.readUnsigned(0) + 1) >>> 0;
          this.fields.writeUnsigned(0, count); this.fields.pointer<NativeCrtDNameRecord>(4 + count * 4).set(record);
        }
      }
    });
  }
  get(index: number): NativeValue<NativeCrtDNameRecord> {
    return this.factory.run('replicatorLookup', () => {
      uint(index);
      if (!this.invalid || !this.unavailable) throw new Error('Replicator constructor prefix is incomplete');
      if (index >= 10) return this.invalid;
      const count = this.fields.readUnsigned(0);
      if (count === 0xffffffff || (count | 0) < index) return this.unavailable;
      const record = this.fields.pointer<NativeCrtDNameRecord>(4 + index * 4).get();
      if (!record) throw new Error('Replicator selected slot has NULL DName record'); return record;
    });
  }
}
