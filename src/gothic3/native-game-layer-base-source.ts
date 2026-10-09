/** Generated original Game LayerBase source admission; no initializer execution. */
import sourceText from '../../assets/gothic3/layer-base-class-name/source.json?raw';
import type { NativeCrtSourceRules, NativeCrtImageReceipt } from './native-game-crt-profile';
import type { NativeGameIoInstruction } from './native-game-crt-io-source';
const expected = {
  "schema": "gothic3-layer-base-class-name-evidence-v1",
  "module": {
    "module": "Game.dll",
    "inputSha256": "b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f",
    "functionsCsvSha256": "7683e99c3c22688b26c77eafc830f43abab471b9e9d3ca241e3157007c714018",
    "assemblySha256": "fd23430904ab84b03e395bc4a705f5a475cc5816094603350a68e1bc2798f4dc",
    "methods": [
      {
        "label": "layerBaseClassName",
        "entryVA": "0x2000e8d6",
        "bodyVA": "0x20047000",
        "entryChain": [
          {
            "va": "2000e8d6",
            "bytes": "e925870300",
            "targetVA": "20047000"
          }
        ],
        "bodyRanges": "20047000-20047056",
        "instructions": [
          {
            "va": "20047000",
            "rva": "47000",
            "fileOffset": 290816,
            "bytes": "a188457b20",
            "instruction": "MOV EAX,[0x207b4588]",
            "assemblyLine": 72245
          },
          {
            "va": "20047005",
            "rva": "47005",
            "fileOffset": 290821,
            "bytes": "a801",
            "instruction": "TEST AL,0x1",
            "assemblyLine": 72246
          },
          {
            "va": "20047007",
            "rva": "47007",
            "fileOffset": 290823,
            "bytes": "7514",
            "instruction": "JNZ 0x2004701d",
            "assemblyLine": 72247
          },
          {
            "va": "20047009",
            "rva": "47009",
            "fileOffset": 290825,
            "bytes": "8b0d60477b20",
            "instruction": "MOV ECX,dword ptr [0x207b4760]",
            "assemblyLine": 72248
          },
          {
            "va": "2004700f",
            "rva": "4700f",
            "fileOffset": 290831,
            "bytes": "83c801",
            "instruction": "OR EAX,0x1",
            "assemblyLine": 72249
          },
          {
            "va": "20047012",
            "rva": "47012",
            "fileOffset": 290834,
            "bytes": "a388457b20",
            "instruction": "MOV [0x207b4588],EAX",
            "assemblyLine": 72250
          },
          {
            "va": "20047017",
            "rva": "47017",
            "fileOffset": 290839,
            "bytes": "890d84457b20",
            "instruction": "MOV dword ptr [0x207b4584],ECX",
            "assemblyLine": 72251
          },
          {
            "va": "2004701d",
            "rva": "4701d",
            "fileOffset": 290845,
            "bytes": "a802",
            "instruction": "TEST AL,0x2",
            "assemblyLine": 72253
          },
          {
            "va": "2004701f",
            "rva": "4701f",
            "fileOffset": 290847,
            "bytes": "7530",
            "instruction": "JNZ 0x20047051",
            "assemblyLine": 72254
          },
          {
            "va": "20047021",
            "rva": "47021",
            "fileOffset": 290849,
            "bytes": "83c802",
            "instruction": "OR EAX,0x2",
            "assemblyLine": 72255
          },
          {
            "va": "20047024",
            "rva": "47024",
            "fileOffset": 290852,
            "bytes": "68180a7d20",
            "instruction": "PUSH 0x207d0a18",
            "assemblyLine": 72256
          },
          {
            "va": "20047029",
            "rva": "47029",
            "fileOffset": 290857,
            "bytes": "b904607920",
            "instruction": "MOV ECX,0x20796004",
            "assemblyLine": 72257
          },
          {
            "va": "2004702e",
            "rva": "4702e",
            "fileOffset": 290862,
            "bytes": "a388457b20",
            "instruction": "MOV [0x207b4588],EAX",
            "assemblyLine": 72258
          },
          {
            "va": "20047033",
            "rva": "47033",
            "fileOffset": 290867,
            "bytes": "e8a8c74100",
            "instruction": "CALL 0x204637e0",
            "assemblyLine": 72259
          },
          {
            "va": "20047038",
            "rva": "47038",
            "fileOffset": 290872,
            "bytes": "50",
            "instruction": "PUSH EAX",
            "assemblyLine": 72260
          },
          {
            "va": "20047039",
            "rva": "47039",
            "fileOffset": 290873,
            "bytes": "6880457b20",
            "instruction": "PUSH 0x207b4580",
            "assemblyLine": 72261
          },
          {
            "va": "2004703e",
            "rva": "4703e",
            "fileOffset": 290878,
            "bytes": "ff1530887d20",
            "instruction": "CALL dword ptr [0x207d8830]",
            "assemblyLine": 72262
          },
          {
            "va": "20047044",
            "rva": "47044",
            "fileOffset": 290884,
            "bytes": "6849460320",
            "instruction": "PUSH 0x20034649",
            "assemblyLine": 72263
          },
          {
            "va": "20047049",
            "rva": "47049",
            "fileOffset": 290889,
            "bytes": "e880c74100",
            "instruction": "CALL 0x204637ce",
            "assemblyLine": 72264
          },
          {
            "va": "2004704e",
            "rva": "4704e",
            "fileOffset": 290894,
            "bytes": "83c404",
            "instruction": "ADD ESP,0x4",
            "assemblyLine": 72265
          },
          {
            "va": "20047051",
            "rva": "47051",
            "fileOffset": 290897,
            "bytes": "b880457b20",
            "instruction": "MOV EAX,0x207b4580",
            "assemblyLine": 72267
          },
          {
            "va": "20047056",
            "rva": "47056",
            "fileOffset": 290902,
            "bytes": "c3",
            "instruction": "RET",
            "assemblyLine": 72268
          }
        ],
        "reconstructedC": {
          "path": "01_Decompiled_Code/Game_dll/pseudocode/functions_00057.c",
          "sha256": "05b5fdb8abac53f8acb9a887e0789707a7e0c98c57f8a97c41382cabab808533",
          "line": 9039,
          "status": "decompiled"
        },
        "instructionCount": 22,
        "bodyByteCount": 87,
        "bodyInstructionBytesSha256": "397f8354b9dea8bdcd6605af2cd82b8c00c0abf97e5a06cba56b0e733e7a7ec2"
      },
      {
        "label": "layerBaseClassNameInitializer",
        "entryVA": "0x204b11b0",
        "bodyVA": "0x204b11b0",
        "bodyRanges": "204b11b0-204b11ba",
        "instructions": [
          {
            "va": "204b11b0",
            "bytes": "e821d7b5ff",
            "instruction": "CALL 0x2000e8d6",
            "fileOffset": 4919728,
            "rva": "004b11b0",
            "assemblyLine": 1
          },
          {
            "va": "204b11b5",
            "bytes": "a360477b20",
            "instruction": "MOV [0x207b4760],EAX",
            "fileOffset": 4919733,
            "rva": "004b11b5",
            "assemblyLine": 2
          },
          {
            "va": "204b11ba",
            "bytes": "c3",
            "instruction": "RET",
            "fileOffset": 4919738,
            "rva": "004b11ba",
            "assemblyLine": 3
          }
        ],
        "entryChain": [],
        "bodyInstructionBytesSha256": "9ef3a3702a68d5acc912a540b56a92930392f736c54362248a9ef0c2b76a29ff",
        "recoveryOrigin": {
          "kind": "supplemental-ghidra-recovery",
          "ghidraVersion": "12.1.4",
          "functionCreatedInSeparateProject": true,
          "catalogGap": true,
          "functionMetadata": {
            "address": "204b11b0",
            "name": "FUN_204b11b0",
            "qualified_name": "FUN_204b11b0",
            "signature": "void FUN_204b11b0(void);",
            "status": "decompiled",
            "error": "",
            "elapsed_ms": "5",
            "body_bytes": "11",
            "body_ranges": "204b11b0-204b11ba",
            "is_thunk": "false",
            "source": "DEFAULT",
            "pseudocode_file": "pseudocode/entry_204b11b0.c",
            "pseudocode_line": "3"
          }
        },
        "functionCatalogEntryPresent": false,
        "sourceRefs": {
          "assembly": {
            "path": "sources/Game/204b11b0.asm.txt",
            "sha256": "afa0d66a727f9a7b5b27a016fdb518e4ba1346db15be1973fd6dec079111bc1d"
          },
          "c": {
            "path": "sources/Game/204b11b0.c.txt",
            "sha256": "249a7b1bc92cbc0ff28a2a06dad23b6aa24dba17c75e553f9b93a397e0cfba35"
          }
        },
        "verifiedAgainstOriginalPE": true
      },
      {
        "label": "layerBaseClassNameDestructor",
        "entryVA": "0x20034649",
        "bodyVA": "0x20549180",
        "bodyRanges": "20549180-2054918a",
        "instructions": [
          {
            "va": "20549180",
            "bytes": "b980457b20",
            "instruction": "MOV ECX,0x207b4580",
            "assemblyLine": 1256775,
            "fileOffset": 5542272
          },
          {
            "va": "20549185",
            "bytes": "ff2534887d20",
            "instruction": "JMP dword ptr [0x207d8834]",
            "assemblyLine": 1256776,
            "fileOffset": 5542277
          }
        ],
        "entryChain": [
          {
            "va": "20034649",
            "bytes": "e9324b5100",
            "targetVA": "20549180"
          }
        ],
        "bodyInstructionBytesSha256": "c90a8c5cb71d1c5a452241b572312562b7aee48b6f9020dac6ec432519ff388e",
        "recoveryOrigin": "explicit-original-disassembly-extent",
        "functionCatalogEntryPresent": false,
        "verifiedAgainstOriginalPE": true
      }
    ],
    "constants": [
      {
        "label": "distanceDefaultMultiplier",
        "va": "0x2065b1c4",
        "kind": "float",
        "value": 1.0,
        "bytes": "0000803f",
        "fileOffset": 6664644
      },
      {
        "label": "distanceNpcTargetMultiplier",
        "va": "0x2065cf5c",
        "kind": "float",
        "value": 0.25,
        "bytes": "0000803e",
        "fileOffset": 6672220
      },
      {
        "label": "missingEntityDistance",
        "va": "0x206afae8",
        "kind": "float",
        "value": 99999.0,
        "bytes": "804fc347",
        "fileOffset": 7011048
      }
    ],
    "imports": [
      {
        "iatVA": "0x207d8830",
        "module": "SharedBase.dll",
        "name": "?UnMangle@bCClassNameBase@@SG?AVbCString@@PBD@Z",
        "ordinal": null
      }
    ],
    "tables": [
      {
        "label": "deliveryCompletionTargets",
        "va": "0x20338088",
        "fileOffset": 3375240,
        "bytes": "2c80332084803320",
        "elementBytes": 4,
        "values": [
          "0x2033802c",
          "0x20338084"
        ]
      },
      {
        "label": "deliveryCompletionTypeMap",
        "va": "0x20338090",
        "fileOffset": 3375248,
        "bytes": "00000000000000000001000000",
        "elementBytes": 1,
        "values": [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          1,
          0,
          0,
          0
        ]
      },
      {
        "label": "infoEndCallbackTargets",
        "va": "0x20439354",
        "fileOffset": 4428628,
        "bytes": "3b84432034874320408743202188432002894320a28f43201d8e4320e98e43208b874320d68743206c884320b788432013914320",
        "elementBytes": 4,
        "values": [
          "0x2043843b",
          "0x20438734",
          "0x20438740",
          "0x20438821",
          "0x20438902",
          "0x20438fa2",
          "0x20438e1d",
          "0x20438ee9",
          "0x2043878b",
          "0x204387d6",
          "0x2043886c",
          "0x204388b7",
          "0x20439113"
        ]
      },
      {
        "label": "infoEndCondition6Through34Map",
        "va": "0x20439388",
        "fileOffset": 4428680,
        "bytes": "000c0c0c0c010c0c0203040c050c0c000c0c0c0c060708090c0c0c0a0b",
        "elementBytes": 1,
        "values": [
          0,
          12,
          12,
          12,
          12,
          1,
          12,
          12,
          2,
          3,
          4,
          12,
          5,
          12,
          12,
          0,
          12,
          12,
          12,
          12,
          6,
          7,
          8,
          9,
          12,
          12,
          12,
          10,
          11
        ]
      }
    ],
    "verifiedAgainstOriginalPE": true
  },
  "images": [
    {
      "label": "layerBaseClassName",
      "address": "207b4580",
      "bytes": 12,
      "raw": "000000000000000000000000",
      "sha256": "15ec7bf0b50732b49f8228e07d24365338f9e3ab994b00af08e5a3bffe55fd8b",
      "liveValueCaptured": false
    },
    {
      "label": "layerBaseInitializerResult",
      "address": "207b4760",
      "bytes": 4,
      "raw": "00000000",
      "sha256": "df3f619804a92fdb4057192dc43dd748ea778adc52bc498ce80524c014b81119",
      "liveValueCaptured": false
    },
    {
      "label": "layerBaseInitializerSlot",
      "address": "2056c104",
      "bytes": 4,
      "raw": "b0114b20",
      "sha256": "6ecb53cbc2461307d77e090740cc14badeedd9b024526e8fabcb06582f2c9fe2",
      "liveValueCaptured": false
    },
    {
      "label": "layerBaseTypeInfoDescriptor",
      "address": "20796004",
      "bytes": 36,
      "raw": "74636b20000000002e3f4156654350726f6365737369626c65456c656d656e7440400000",
      "sha256": "2fc381366e85932f91e0ffa7394d26a6b0de93f78671fdae6dcf227cd415e990",
      "liveValueCaptured": false
    }
  ],
  "decoratedName": ".?AVeCProcessibleElement@@",
  "imports": [
    {
      "iatVA": "0x207d8830",
      "module": "SharedBase.dll",
      "name": "?UnMangle@bCClassNameBase@@SG?AVbCString@@PBD@Z",
      "ordinal": null
    },
    {
      "iatVA": "0x207d8834",
      "module": "SharedBase.dll",
      "name": "??1bCString@@QAE@XZ",
      "ordinal": null
    }
  ],
  "producerSha256": "7cfe646ca77b836d87bfeb12da41f8b9f24a42f39898ab1b10cc875e8d77011d",
  "sourceOnly": true,
  "executionAdmitted": false,
  "wholeCrtTraversalCompleted": false,
  "fullCampaignCompleted": false
} as const;
const source: typeof expected = JSON.parse(sourceText);
function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right, key) && equal(left[key], right[key]));
}
function freeze(value: unknown): void {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
}
freeze(source);
export function admitGameLayerBaseSource(): void {
  if (!equal(source, expected)) throw new Error('Original Game LayerBase class-name source differs');
}
admitGameLayerBaseSource();
const coldGlobals: Record<string, NativeCrtImageReceipt> = {};
const constBytes: Record<string, NativeCrtImageReceipt> = {};
export const gameLayerBaseImagePins: Record<string, readonly ['coldGlobals' | 'constBytes', string, number, string, string]> = {};
for (const image of source.images) {
  const kind = image.label === 'layerBaseInitializerSlot' ? 'constBytes' : 'coldGlobals';
  const receipt = { ...image, module: 'Game', knownMask: 'ff'.repeat(image.bytes),
    scope: kind === 'constBytes' ? 'original-file-backed-constant' : 'cold-original-image' };
  (kind === 'constBytes' ? constBytes : coldGlobals)[image.label] = receipt;
  gameLayerBaseImagePins[image.label] = [kind, image.address, image.bytes, image.raw, image.sha256];
}
export const gameLayerBaseSourceRules: NativeCrtSourceRules = {
  schema: source.schema, inputs: { Game: source.module.inputSha256 },
  methods: Object.fromEntries(source.module.methods.map(method => [method.label, {
    ...method, module: 'Game', entry: method.entryVA.slice(2), body: method.bodyVA.slice(2),
  }])), coldGlobals, constBytes, imports: { Game: source.imports },
};
freeze(gameLayerBaseSourceRules);
freeze(gameLayerBaseImagePins);
export function gameLayerBaseImageReceipt(label: string): NativeCrtImageReceipt {
  admitGameLayerBaseSource();
  const pin = gameLayerBaseImagePins[label];
  if (!pin) throw new Error('Unknown original Game LayerBase image label');
  return gameLayerBaseSourceRules[pin[0]][label]!;
}
/** Only the three independently verified initializer rows are interpreted. */
export function gameLayerBaseInitializerInstruction(address: string): NativeGameIoInstruction {
  admitGameLayerBaseSource();
  const initializer = source.module.methods.find(method => method.label === 'layerBaseClassNameInitializer')!;
  const row = initializer.instructions.find(point => point.va === address);
  if (!row) throw new Error('Unowned original LayerBase initializer instruction: ' + address);
  return row;
}
