/** Source-admitted Game Arena Status descriptor image and method receipts. */
import sourceText from '../../assets/gothic3/arena-status-descriptor/source.json?raw';
import type { NativeCrtSourceRules, NativeCrtImageReceipt } from './native-game-crt-profile';
const expectedText = "{\n  \"schema\": \"gothic3-arena-status-descriptor-v1\",\n  \"gameSha256\": \"b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f\",\n  \"methods\": {\n    \"statusVirtualSlot00\": {\n      \"entryVA\": \"0x2001635b\",\n      \"bodyVA\": \"0x2006fcb0\",\n      \"bodyRanges\": \"2006fcb0-2006fcb3\",\n      \"instructionCount\": 2,\n      \"bodyByteCount\": 4,\n      \"bodyInstructionBytesSha256\": \"0b78473b3a56c63ff2a64431fb600078066cbe407d3dee7ea8fd7575bd7f82d5\",\n      \"entryChain\": [\n        {\n          \"va\": \"2001635b\",\n          \"bytes\": \"e950990500\",\n          \"targetVA\": \"2006fcb0\"\n        }\n      ],\n      \"assemblySha256\": \"530f3ea393ececa858e847c28b690a7b0e0d6edf910fa3c425b5cfea9683f4f1\",\n      \"cSha256\": \"fe59a0bce8f32f6e9ecde6783081f251184a7f57347188f0edac1e0c905db554\"\n    },\n    \"statusVirtualSlot04\": {\n      \"entryVA\": \"0x2002ed52\",\n      \"bodyVA\": \"0x2006fcd0\",\n      \"bodyRanges\": \"2006fcd0-2006fcd5\",\n      \"instructionCount\": 2,\n      \"bodyByteCount\": 6,\n      \"bodyInstructionBytesSha256\": \"accecba762116532de10ac30681ff4b25ad91fe217568ec41c8ffd67b9ef2bcf\",\n      \"entryChain\": [\n        {\n          \"va\": \"2002ed52\",\n          \"bytes\": \"e9790f0400\",\n          \"targetVA\": \"2006fcd0\"\n        }\n      ],\n      \"assemblySha256\": \"1cc9962b0f51bc574b0bae06f026ab98761392f4caea1b62ad913f24d7858560\",\n      \"cSha256\": \"2d8c8467876ddbaf54452925a14e79d55a49ac69b314dfc84f1c998eef65434c\"\n    },\n    \"statusVirtualSlot08\": {\n      \"entryVA\": \"0x20022f25\",\n      \"bodyVA\": \"0x2006fce0\",\n      \"bodyRanges\": \"2006fce0-2006fce8\",\n      \"instructionCount\": 4,\n      \"bodyByteCount\": 9,\n      \"bodyInstructionBytesSha256\": \"a1b8e9c0f879a339da9b026d2fc50dd5e5d376fa4307aef97f8ca940e358ea3b\",\n      \"entryChain\": [\n        {\n          \"va\": \"20022f25\",\n          \"bytes\": \"e9b6cd0400\",\n          \"targetVA\": \"2006fce0\"\n        }\n      ],\n      \"assemblySha256\": \"5709fea5f5317b14e3667f85129a3f0b9084a61e3003c07d3134e034100a1892\",\n      \"cSha256\": \"db3e1e03494ffba204001daeb9ba09d2f65953ec9d7dffd794f6c4d9a9b737aa\"\n    },\n    \"statusVirtualSlot0c\": {\n      \"entryVA\": \"0x2000185c\",\n      \"bodyVA\": \"0x2006e520\",\n      \"bodyRanges\": \"2006e520-2006e576\",\n      \"instructionCount\": 22,\n      \"bodyByteCount\": 87,\n      \"bodyInstructionBytesSha256\": \"3ee0cc58d73385f85e2d7bcb383f6882420b2ef039788373549262fc23f6ec11\",\n      \"entryChain\": [\n        {\n          \"va\": \"2000185c\",\n          \"bytes\": \"e9efe90600\",\n          \"targetVA\": \"20070250\"\n        },\n        {\n          \"va\": \"20070250\",\n          \"bytes\": \"e968dbfaff\",\n          \"targetVA\": \"2001ddbd\"\n        },\n        {\n          \"va\": \"2001ddbd\",\n          \"bytes\": \"e95e070500\",\n          \"targetVA\": \"2006e520\"\n        }\n      ],\n      \"assemblySha256\": \"1abe026e644c35241ca5d06f29a7f3be6b3ca410eccfd97cfe7b3efaa2851584\",\n      \"cSha256\": \"d740e22ebea5067db852c69fb7c1bb058762d1ad5fc00279ae06e78f64020de0\"\n    },\n    \"statusVirtualSlot10\": {\n      \"entryVA\": \"0x2001af23\",\n      \"bodyVA\": \"0x2006fcc0\",\n      \"bodyRanges\": \"2006fcc0-2006fcc3\",\n      \"instructionCount\": 2,\n      \"bodyByteCount\": 4,\n      \"bodyInstructionBytesSha256\": \"38058506e8e859d5be73a33baa621352c08ea01f2224ee170173253757193941\",\n      \"entryChain\": [\n        {\n          \"va\": \"2001af23\",\n          \"bytes\": \"e9984d0500\",\n          \"targetVA\": \"2006fcc0\"\n        }\n      ],\n      \"assemblySha256\": \"3b064e760c557b8df6322f7249307be9540fcc080d0b983adac59a3c350972df\",\n      \"cSha256\": \"81d1d1460c5e8db8fa543135aaa5d2789033629b38a7bb7dc946da30d42dc44b\"\n    },\n    \"statusVirtualSlot14\": {\n      \"entryVA\": \"0x20026bf7\",\n      \"bodyVA\": \"0x20070260\",\n      \"bodyRanges\": \"20070260-2007027b\",\n      \"instructionCount\": 12,\n      \"bodyByteCount\": 28,\n      \"bodyInstructionBytesSha256\": \"4ce1e3d739cf2068808da0992665cfef12af85eaa2f5e3d9a5b8a03ba3f664d9\",\n      \"entryChain\": [\n        {\n          \"va\": \"20026bf7\",\n          \"bytes\": \"e964960400\",\n          \"targetVA\": \"20070260\"\n        }\n      ],\n      \"assemblySha256\": \"c2e7e0216aa5c85d04341500196c0746ceb846e4df96049fb0d99990695fb2d0\",\n      \"cSha256\": \"ec32ef0397cc66ebe95aa674045021d6403792103aba530c083c14bf74442864\"\n    },\n    \"createStatus\": {\n      \"entryVA\": \"0x2002ad8d\",\n      \"bodyVA\": \"0x20070f20\",\n      \"bodyRanges\": \"20070f20-20070f3d\",\n      \"instructionCount\": 11,\n      \"bodyByteCount\": 30,\n      \"bodyInstructionBytesSha256\": \"2444eda048b9217824b473349faef11841b534bdcc79452882dc2eec26cbd1db\",\n      \"entryChain\": [\n        {\n          \"va\": \"2002ad8d\",\n          \"bytes\": \"e98e610400\",\n          \"targetVA\": \"20070f20\"\n        }\n      ],\n      \"assemblySha256\": \"cd7e171803d08cd3b662047eb4d02e092827c41676c8f88155f1d82d592893bd\",\n      \"cSha256\": \"8448c965b8570eb57f3e74f9fea8b4117e6f73c820d2b8feb413bc842733287c\"\n    },\n    \"resetStatusStorage\": {\n      \"entryVA\": \"0x20070e90\",\n      \"bodyVA\": \"0x20070e90\",\n      \"bodyRanges\": \"20070e90-20070efa\",\n      \"instructionCount\": 47,\n      \"bodyByteCount\": 107,\n      \"bodyInstructionBytesSha256\": \"f924c60a70d7e9be4b9a241601b8e562f8e26a8f0aa564859141c63408aa3f80\",\n      \"entryChain\": [],\n      \"assemblySha256\": \"582484f0d4116cc965976ce1fabf86f649f6ee7c38de2d88a3735b4161c663e5\",\n      \"cSha256\": \"0bc40d3fb9007341fdb5c7deca977f37f1ee1f2c72cd5c5fd65b885308e2c0e9\"\n    },\n    \"statusInitializer\": {\n      \"entryVA\": \"0x204b1dd0\",\n      \"bodyVA\": \"0x204b1dd0\",\n      \"bodyRanges\": \"204b1dd0-204b1e4c\",\n      \"instructionCount\": 25,\n      \"bodyByteCount\": 125,\n      \"bodyInstructionBytesSha256\": \"bace2c837c299786cffd84f4888c6f3d9adbb34e0afabf16b6293f83dc667c1c\",\n      \"entryChain\": [],\n      \"assemblySha256\": \"99afecf4fb98e4b99c34ce6fa99fb8d7401957cf8c3a27bb381ee55486bc2a6a\",\n      \"cSha256\": \"a376dcb2bf7865cd37ba9d8ae246cebcdbe9ebd372e6c70adb708ee4af04044d\"\n    }\n  },\n  \"vtableAddress\": \"20659aec\",\n  \"vtableRaw\": \"5b63012052ed0220252f02205c18002023af0120f76b0220\",\n  \"slots\": {\n    \"00\": \"2001635b\",\n    \"04\": \"2002ed52\",\n    \"08\": \"20022f25\",\n    \"0c\": \"2000185c\",\n    \"10\": \"2001af23\",\n    \"14\": \"20026bf7\"\n  },\n  \"coldDescriptor\": {\n    \"address\": \"207b5038\",\n    \"raw\": \"000000000000000000000000000000000000000000000000000000000000000000000000\",\n    \"section\": {\n      \"virtualAddress\": 7954432,\n      \"virtualSize\": 248716,\n      \"rawSize\": 126976,\n      \"rawOffset\": 7954432,\n      \"fileBackedBytes\": 0,\n      \"loaderZeroFillBytes\": 36\n    }\n  },\n  \"nameLiteral\": {\n    \"address\": \"20657534\",\n    \"raw\": \"53746174757300\"\n  },\n  \"typeNameCache\": {\n    \"address\": \"207b4f58\",\n    \"raw\": \"000000000000000000000000\",\n    \"section\": {\n      \"virtualAddress\": 7954432,\n      \"virtualSize\": 248716,\n      \"rawSize\": 126976,\n      \"rawOffset\": 7954432,\n      \"fileBackedBytes\": 12,\n      \"loaderZeroFillBytes\": 0\n    }\n  },\n  \"priorNameResult\": {\n    \"address\": \"207b5020\",\n    \"raw\": \"00000000\",\n    \"section\": {\n      \"virtualAddress\": 7954432,\n      \"virtualSize\": 248716,\n      \"rawSize\": 126976,\n      \"rawOffset\": 7954432,\n      \"fileBackedBytes\": 0,\n      \"loaderZeroFillBytes\": 4\n    }\n  },\n  \"typeInfoDescriptor\": {\n    \"address\": \"20797e58\",\n    \"raw\": \"74636b20000000002e3f41563f24625450726f7065727479436f6e7461696e657240573467454172656e615374617475734040404000\",\n    \"section\": {\n      \"virtualAddress\": 7954432,\n      \"virtualSize\": 248716,\n      \"rawSize\": 126976,\n      \"rawOffset\": 7954432,\n      \"fileBackedBytes\": 54,\n      \"loaderZeroFillBytes\": 0\n    },\n    \"decoratedName\": \".?AV?$bTPropertyContainer@W4gEArenaStatus@@@@\"\n  },\n  \"typeNameCleanup\": {\n    \"entry\": \"200064f1\",\n    \"entryBytes\": \"e92a345400\",\n    \"body\": \"20549920\",\n    \"bodyBytes\": \"b9584f7b20ff2534887d20\",\n    \"bodyInstructionBytesSha256\": \"89ac10cc5b5555577e1f3404fda090f234ea745158c607dcd7f0e3983a4eddb5\",\n    \"destination\": \"207b4f58\",\n    \"sharedCStringDestructorIat\": \"207d8834\",\n    \"recovery\": \"Exact original PE bytes: MOV ECX,cache; JMP [CString destructor IAT]\"\n  },\n  \"sourceOnly\": true,\n  \"wholeCrtTraversalCompleted\": false\n}\n";
export function admitGameArenaStatusSource(): void {
  if (sourceText !== expectedText) throw new Error('Original Game Arena Status source differs');
}
admitGameArenaStatusSource();
const original = JSON.parse(sourceText);
function freeze(value: unknown): void {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
}
freeze(original);
export const gameArenaStatusImagePins: Readonly<Record<string, readonly [
  'coldGlobals' | 'constBytes', string, number, string, string
]>> = {
  "arenaStatusDescriptor": [
    "coldGlobals",
    "207b5038",
    36,
    "000000000000000000000000000000000000000000000000000000000000000000000000",
    "6db65fd59fd356f6729140571b5bcd6bb3b83492a16e1bf0a3884442fc3c8a0e"
  ],
  "arenaStatusClassName": [
    "coldGlobals",
    "207b4f58",
    12,
    "000000000000000000000000",
    "15ec7bf0b50732b49f8228e07d24365338f9e3ab994b00af08e5a3bffe55fd8b"
  ],
  "arenaStatusInitializerResult": [
    "coldGlobals",
    "207b5020",
    4,
    "00000000",
    "df3f619804a92fdb4057192dc43dd748ea778adc52bc498ce80524c014b81119"
  ],
  "arenaStatusTypeInfoDescriptor": [
    "coldGlobals",
    "20797e58",
    54,
    "74636b20000000002e3f41563f24625450726f7065727479436f6e7461696e657240573467454172656e615374617475734040404000",
    "fc4325a6af912feeac114700a4f0277509c19d445d3fa147885b95bf603e3be2"
  ],
  "arenaStatusLiteral": [
    "constBytes",
    "20657534",
    7,
    "53746174757300",
    "ad856ad710ebd4a4263ccaba8a0f2bc039e391799e4ef65083a87602bc883be8"
  ],
  "arenaStatusVtable": [
    "constBytes",
    "20659aec",
    24,
    "5b63012052ed0220252f02205c18002023af0120f76b0220",
    "11c9de19afa5954ae1c3c3deb7d65218e96b56d6a52c61d1320f5f3702843f01"
  ]
};
const coldGlobals: Record<string, NativeCrtImageReceipt> = {};
const constBytes: Record<string, NativeCrtImageReceipt> = {};
for (const [label, pin] of Object.entries(gameArenaStatusImagePins)) {
  Object.freeze(pin);
  (pin[0] === 'coldGlobals' ? coldGlobals : constBytes)[label] = Object.freeze({ module: 'Game', address: pin[1], bytes: pin[2],
    raw: pin[3], knownMask: 'ff'.repeat(pin[2]), sha256: pin[4],
    scope: pin[0] === 'coldGlobals' ? 'cold-original-image' : 'original-file-backed-constant', liveValueCaptured: false });
}
Object.freeze(gameArenaStatusImagePins); Object.freeze(coldGlobals); Object.freeze(constBytes);
const methods: Record<string, NativeCrtSourceRules['methods'][string]> = {};
for (const [label, value] of Object.entries(original.methods)) {
  const method = value as {entryVA:string;bodyVA:string;bodyInstructionBytesSha256:string};
  methods['arenaStatus.' + label] = Object.freeze({ ...method, module: 'Game',
    entry: method.entryVA.slice(2), body: method.bodyVA.slice(2) });
}
methods.arenaStatusClassNameDestructor = Object.freeze({module:'Game',
  entry: original.typeNameCleanup.entry, body: original.typeNameCleanup.body,
  entryChain: Object.freeze([Object.freeze({va:original.typeNameCleanup.entry,
    bytes:original.typeNameCleanup.entryBytes,targetVA:original.typeNameCleanup.body})]),
  bodyInstructionBytesSha256: original.typeNameCleanup.bodyInstructionBytesSha256});
Object.freeze(methods);
export const gameArenaStatusSourceRules: NativeCrtSourceRules = Object.freeze({
  schema: original.schema, inputs: Object.freeze({Game:original.gameSha256}),
  methods, coldGlobals, constBytes
});
export function gameArenaStatusImageReceipt(label:string): NativeCrtImageReceipt {
  admitGameArenaStatusSource();
  const result = coldGlobals[label] ?? constBytes[label];
  if (!result) throw new Error('Unknown original Arena Status image label');
  return result;
}
