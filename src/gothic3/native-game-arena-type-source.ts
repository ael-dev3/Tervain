/** Original Game Arena source admission. Capturing these receipts grants no
 * initializer traversal or virtual-call execution capability. */
import sourceText from '../../assets/gothic3/arena-type/source.json?raw';
import type { NativeCrtSourceRules, NativeCrtImageReceipt } from './native-game-crt-profile';
const expected = {
  "schema": "gothic3-arena-type-source-v1",
  "inputs": {
    "Game": "b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f"
  },
  "methods": {
    "arenaTypeSingleton": {
      "module": "Game",
      "entry": "2000d152",
      "body": "2006ebf0",
      "bodyRanges": "2006ebf0-2006ec4f",
      "entryChain": [
        {
          "va": "2000d152",
          "bytes": "e9991a0600",
          "targetVA": "2006ebf0"
        }
      ],
      "instructionCount": 21,
      "bodyByteCount": 96,
      "bodyInstructionBytesSha256": "f203714b168cdfaa5807b6d6f880b9b074b780e55821de0be63e7644904980c1",
      "sourceRefs": {
        "assembly": "2006ebf0.asm.txt",
        "assemblySha256": "a40fd12e858168c1bb8ba954f1e7f5ac9052d8d4cdfe318407d9596e0797f939",
        "c": "2006ebf0.c.txt",
        "cSha256": "64a29954a276c1ffbb4b869d5062a865093ef3d4204cf1703914abf03f05033d"
      },
      "sourceCGap": false
    },
    "arenaTypeCleanup": {
      "module": "Game",
      "entry": "20549930",
      "body": "20549930",
      "bodyRanges": "20549930-2054994f",
      "entryChain": [],
      "instructionCount": 5,
      "bodyByteCount": 32,
      "bodyInstructionBytesSha256": "deb4b542c216c8ae9e45dc2e55ccc6def84202c4c6521999451412e4dfd30bd0",
      "sourceRefs": {
        "assembly": "20549930.asm.txt",
        "assemblySha256": "91e6ee837a3c07319ced8ce81d14a4f97ed46966a81656d8d29ab0f292e15d95"
      },
      "sourceCGap": true
    }
  },
  "coldGlobals": {
    "arenaTypeAndGuard": {
      "module": "Game",
      "address": "207b4f64",
      "bytes": 64,
      "raw": "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      "knownMask": "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      "sha256": "f5a5fd42d16a20302798ef6ed309979b43003d2320d9f0e8ea9831a92759fb4b",
      "section": {
        "virtualAddress": 7954432,
        "virtualSize": 248716,
        "rawSize": 126976,
        "rawOffset": 7954432,
        "fileBackedBytes": 64,
        "loaderZeroFillBytes": 0
      },
      "scope": "cold-original-image",
      "liveValueCaptured": false
    }
  },
  "imports": {
    "Game": [
      {
        "iatVA": "0x207d870c",
        "module": "SharedBase.dll",
        "name": "??0bCPropertyObjectTypeBase@@IAE@_N@Z",
        "ordinal": null
      },
      {
        "iatVA": "0x207d8710",
        "module": "SharedBase.dll",
        "name": "??0bCPropertyObjectFactory@@QAE@ABVbCString@@@Z",
        "ordinal": null
      },
      {
        "iatVA": "0x207d8714",
        "module": "SharedBase.dll",
        "name": "?RegisterTemplate@bCPropertyObjectSingleton@@QAE_NPBVbCPropertyObjectTypeBase@@@Z",
        "ordinal": null
      },
      {
        "iatVA": "0x207d87a0",
        "module": "SharedBase.dll",
        "name": "??1bCPropertyObjectFactory@@UAE@XZ",
        "ordinal": null
      },
      {
        "iatVA": "0x207d87a4",
        "module": "SharedBase.dll",
        "name": "??1bCPropertyObjectTypeBase@@UAE@XZ",
        "ordinal": null
      },
      {
        "iatVA": "0x207d8868",
        "module": "SharedBase.dll",
        "name": "?GetInstance@bCPropertyObjectSingleton@@SGAAV1@XZ",
        "ordinal": null
      }
    ]
  },
  "layout": {
    "objectBytes": 60,
    "guardOffset": 60,
    "baseOffset": 0,
    "baseBytes": 24,
    "factoryOffset": 24,
    "factoryBytes": 24,
    "untouchedTailOffset": 48,
    "untouchedTailBytes": 12,
    "typeVtable": "2065915c"
  },
  "sourceOnly": true,
  "wholeCrtTraversalCompleted": false,
  "runtimeRegistrationCompleted": false,
  "producerSha256": "a0a7ffe9fc407437a0b6e9bed7b3879fca7cc13afa6f454d6095923c19d9778d"
} as const;
const source = JSON.parse(sourceText) as NativeCrtSourceRules;
function freeze(value: unknown): void {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
}
freeze(source);
function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const left = a as Record<string,unknown>, right = b as Record<string,unknown>;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right,key) && equal(left[key],right[key]));
}
export function admitGameArenaTypeSource(): void {
  if (!equal(source, expected)) throw new Error('Original Game Arena type source differs');
}
export const gameArenaTypeSourceRules = source;
export const gameArenaTypeImagePins: Readonly<Record<string, readonly [
  'coldGlobals' | 'constBytes', string, number, string, string
]>> = {
  "arenaTypeAndGuard": [
    "coldGlobals",
    "207b4f64",
    64,
    "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "f5a5fd42d16a20302798ef6ed309979b43003d2320d9f0e8ea9831a92759fb4b"
  ]
};
for (const pin of Object.values(gameArenaTypeImagePins)) Object.freeze(pin);
Object.freeze(gameArenaTypeImagePins);
export function gameArenaTypeImageReceipt(label: string): NativeCrtImageReceipt {
  admitGameArenaTypeSource();
  const pin = gameArenaTypeImagePins[label];
  if (!pin) throw new Error('Unknown original Game Arena image label');
  return source[pin[0]][label]!;
}
