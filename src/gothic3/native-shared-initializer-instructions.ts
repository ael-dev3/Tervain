/** Original admitted SharedBase initializer syntax; no runtime authority. */
export const sharedInitializerHeader=Object.freeze({"address": "10000000", "raw": "4d5a90000300000004000000ffff0000b800000000000000400000000000000000000000000000000000000000000000000000000000000000000000f00000000e1fba0e00b409cd21b8014ccd21546869732070726f6772616d2063616e6e6f742062652072756e20696e20444f53206d6f64652e0d0d0a24000000000000005122a96d1543c73e1543c73e1543c73e3285ba3e3b43c73e3285aa3eb143c73e3285bc3e0043c73e1543c63eb043c73e3285a93ebe43c73e3285bd3e1443c73e3285bb3e1443c73e3285bf3e1443c73e526963681543c73e000000000000000000000000000000000000000000000000504500004c01080042ffa0470000000000000000e00022210b01080000400e0000902200000000001bdd0a000010000000500e000000001000100000001000000400000000000000040000000000000000e0300000100000000000000200000000001000001000000000100000100000000000001000000060970f009851040000902f00dc00000000203000860600000000000000000000000000000000000000303000687f0000a05d0e001c00000000000000000000000000000000000000705e0f001800000048400f00400000000000000000000000a0952f00c40400000000000000000000000000000000000000000000000000002e7465787400000027320e000010000000400e0000100000000000000000000000000000200000602e72646174610000f898050000500e0000a0050000500e00000000000000000000000000400000402e6461746100000090951b0000f013000040000000f01300000000000000000000000000400000c02e696461746100006218000000902f000020000000301400000000000000000000000000400000c05368617265640000e850000000b02f000060000000501400000000000000000000000000400000c02e746c7300000000d5070000001030000010000000b01400000000000000000000000000400000c02e7273726300000086060000002030000010000000c01400000000000000000000000000400000402e72656c6f630000eba400000030300000b0000000d0140000000000000000000000000040000042", "bytes": 808, "sha256": "c7ce61ba6cf382ccf9417ec15d15b55e36f9766a73cc3a8dda440879f735d6d3", "scope": "cold-original-image", "liveValueCaptured": false});
export interface SharedInitializerInstruction {readonly address:string;readonly bytes:string;readonly instruction:string;}
const rows:readonly (readonly string[])[] = [
  [
    "100aa632",
    "833d68d50e1000",
    "CMP dword ptr [0x100ed568],0x0"
  ],
  [
    "100aa639",
    "741a",
    "JZ 0x100aa655"
  ],
  [
    "100aa63b",
    "6868d50e10",
    "PUSH 0x100ed568"
  ],
  [
    "100aa640",
    "e8bb420000",
    "CALL 0x100ae900"
  ],
  [
    "100aa645",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100aa647",
    "59",
    "POP ECX"
  ],
  [
    "100aa648",
    "740b",
    "JZ 0x100aa655"
  ],
  [
    "100aa64a",
    "ff742404",
    "PUSH dword ptr [ESP + 0x4]"
  ],
  [
    "100aa64e",
    "ff1568d50e10",
    "CALL dword ptr [0x100ed568]"
  ],
  [
    "100aa654",
    "59",
    "POP ECX"
  ],
  [
    "100aa655",
    "e8ad9d0000",
    "CALL 0x100b4407"
  ],
  [
    "100aa65a",
    "6878560e10",
    "PUSH 0x100e5678"
  ],
  [
    "100aa65f",
    "685c540e10",
    "PUSH 0x100e545c"
  ],
  [
    "100aa664",
    "e814feffff",
    "CALL 0x100aa47d"
  ],
  [
    "100aa669",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100aa66b",
    "59",
    "POP ECX"
  ],
  [
    "100aa66c",
    "59",
    "POP ECX"
  ],
  [
    "100aa66d",
    "7554",
    "JNZ 0x100aa6c3"
  ],
  [
    "100aa66f",
    "56",
    "PUSH ESI"
  ],
  [
    "100aa670",
    "57",
    "PUSH EDI"
  ],
  [
    "100aa671",
    "68e7b80b10",
    "PUSH 0x100bb8e7"
  ],
  [
    "100aa676",
    "e855ccffff",
    "CALL 0x100a72d0"
  ],
  [
    "100aa67b",
    "be00500e10",
    "MOV ESI,0x100e5000"
  ],
  [
    "100aa680",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100aa682",
    "bf58530e10",
    "MOV EDI,0x100e5358"
  ],
  [
    "100aa687",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100aa689",
    "59",
    "POP ECX"
  ],
  [
    "100aa68a",
    "730f",
    "JNC 0x100aa69b"
  ],
  [
    "100aa68c",
    "8b06",
    "MOV EAX,dword ptr [ESI]"
  ],
  [
    "100aa68e",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100aa690",
    "7402",
    "JZ 0x100aa694"
  ],
  [
    "100aa692",
    "ffd0",
    "CALL EAX"
  ],
  [
    "100aa694",
    "83c604",
    "ADD ESI,0x4"
  ],
  [
    "100aa697",
    "3bf7",
    "CMP ESI,EDI"
  ],
  [
    "100aa699",
    "72f1",
    "JC 0x100aa68c"
  ],
  [
    "100aa69b",
    "833d8c852f1000",
    "CMP dword ptr [0x102f858c],0x0"
  ],
  [
    "100aa6a2",
    "5f",
    "POP EDI"
  ],
  [
    "100aa6a3",
    "5e",
    "POP ESI"
  ],
  [
    "100aa6a4",
    "741b",
    "JZ 0x100aa6c1"
  ],
  [
    "100aa6a6",
    "688c852f10",
    "PUSH 0x102f858c"
  ],
  [
    "100aa6ab",
    "e850420000",
    "CALL 0x100ae900"
  ],
  [
    "100aa6b0",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100aa6b2",
    "59",
    "POP ECX"
  ],
  [
    "100aa6b3",
    "740c",
    "JZ 0x100aa6c1"
  ],
  [
    "100aa6b5",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100aa6b7",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100aa6b9",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100aa6bb",
    "ff158c852f10",
    "CALL dword ptr [0x102f858c]"
  ],
  [
    "100aa6c1",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100aa6c3",
    "c3",
    "RET"
  ],
  [
    "100ae900",
    "55",
    "PUSH EBP"
  ],
  [
    "100ae901",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100ae903",
    "6afe",
    "PUSH -0x2"
  ],
  [
    "100ae905",
    "68c0880f10",
    "PUSH 0x100f88c0"
  ],
  [
    "100ae90a",
    "6800ec0a10",
    "PUSH 0x100aec00"
  ],
  [
    "100ae90f",
    "64a100000000",
    "MOV EAX,FS:[0x0]"
  ],
  [
    "100ae915",
    "50",
    "PUSH EAX"
  ],
  [
    "100ae916",
    "83ec08",
    "SUB ESP,0x8"
  ],
  [
    "100ae919",
    "53",
    "PUSH EBX"
  ],
  [
    "100ae91a",
    "56",
    "PUSH ESI"
  ],
  [
    "100ae91b",
    "57",
    "PUSH EDI"
  ],
  [
    "100ae91c",
    "a16c0d1410",
    "MOV EAX,[0x10140d6c]"
  ],
  [
    "100ae921",
    "3145f8",
    "XOR dword ptr [EBP + -0x8],EAX"
  ],
  [
    "100ae924",
    "33c5",
    "XOR EAX,EBP"
  ],
  [
    "100ae926",
    "50",
    "PUSH EAX"
  ],
  [
    "100ae927",
    "8d45f0",
    "LEA EAX,[EBP + -0x10]"
  ],
  [
    "100ae92a",
    "64a300000000",
    "MOV FS:[0x0],EAX"
  ],
  [
    "100ae930",
    "8965e8",
    "MOV dword ptr [EBP + -0x18],ESP"
  ],
  [
    "100ae933",
    "c745fc00000000",
    "MOV dword ptr [EBP + -0x4],0x0"
  ],
  [
    "100ae93a",
    "6800000010",
    "PUSH 0x10000000"
  ],
  [
    "100ae93f",
    "e83cffffff",
    "CALL 0x100ae880"
  ],
  [
    "100ae944",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "100ae947",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100ae949",
    "7455",
    "JZ 0x100ae9a0"
  ],
  [
    "100ae94b",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100ae94e",
    "2d00000010",
    "SUB EAX,0x10000000"
  ],
  [
    "100ae953",
    "50",
    "PUSH EAX"
  ],
  [
    "100ae954",
    "6800000010",
    "PUSH 0x10000000"
  ],
  [
    "100ae959",
    "e852ffffff",
    "CALL 0x100ae8b0"
  ],
  [
    "100ae95e",
    "83c408",
    "ADD ESP,0x8"
  ],
  [
    "100ae961",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100ae963",
    "743b",
    "JZ 0x100ae9a0"
  ],
  [
    "100ae965",
    "8b4024",
    "MOV EAX,dword ptr [EAX + 0x24]"
  ],
  [
    "100ae968",
    "c1e81f",
    "SHR EAX,0x1f"
  ],
  [
    "100ae96b",
    "f7d0",
    "NOT EAX"
  ],
  [
    "100ae96d",
    "83e001",
    "AND EAX,0x1"
  ],
  [
    "100ae970",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100ae977",
    "8b4df0",
    "MOV ECX,dword ptr [EBP + -0x10]"
  ],
  [
    "100ae97a",
    "64890d00000000",
    "MOV dword ptr FS:[0x0],ECX"
  ],
  [
    "100ae981",
    "59",
    "POP ECX"
  ],
  [
    "100ae982",
    "5f",
    "POP EDI"
  ],
  [
    "100ae983",
    "5e",
    "POP ESI"
  ],
  [
    "100ae984",
    "5b",
    "POP EBX"
  ],
  [
    "100ae985",
    "8be5",
    "MOV ESP,EBP"
  ],
  [
    "100ae987",
    "5d",
    "POP EBP"
  ],
  [
    "100ae988",
    "c3",
    "RET"
  ],
  [
    "100ae9a0",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100ae9a7",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100ae9a9",
    "8b4df0",
    "MOV ECX,dword ptr [EBP + -0x10]"
  ],
  [
    "100ae9ac",
    "64890d00000000",
    "MOV dword ptr FS:[0x0],ECX"
  ],
  [
    "100ae9b3",
    "59",
    "POP ECX"
  ],
  [
    "100ae9b4",
    "5f",
    "POP EDI"
  ],
  [
    "100ae9b5",
    "5e",
    "POP ESI"
  ],
  [
    "100ae9b6",
    "5b",
    "POP EBX"
  ],
  [
    "100ae9b7",
    "8be5",
    "MOV ESP,EBP"
  ],
  [
    "100ae9b9",
    "5d",
    "POP EBP"
  ],
  [
    "100ae9ba",
    "c3",
    "RET"
  ],
  [
    "100ae880",
    "8b4c2404",
    "MOV ECX,dword ptr [ESP + 0x4]"
  ],
  [
    "100ae884",
    "6681394d5a",
    "CMP word ptr [ECX],0x5a4d"
  ],
  [
    "100ae889",
    "7403",
    "JZ 0x100ae88e"
  ],
  [
    "100ae88b",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100ae88d",
    "c3",
    "RET"
  ],
  [
    "100ae88e",
    "8b413c",
    "MOV EAX,dword ptr [ECX + 0x3c]"
  ],
  [
    "100ae891",
    "03c1",
    "ADD EAX,ECX"
  ],
  [
    "100ae893",
    "813850450000",
    "CMP dword ptr [EAX],0x4550"
  ],
  [
    "100ae899",
    "75f0",
    "JNZ 0x100ae88b"
  ],
  [
    "100ae89b",
    "33c9",
    "XOR ECX,ECX"
  ],
  [
    "100ae89d",
    "668178180b01",
    "CMP word ptr [EAX + 0x18],0x10b"
  ],
  [
    "100ae8a3",
    "0f94c1",
    "SETZ CL"
  ],
  [
    "100ae8a6",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "100ae8a8",
    "c3",
    "RET"
  ],
  [
    "100ae8b0",
    "8b442404",
    "MOV EAX,dword ptr [ESP + 0x4]"
  ],
  [
    "100ae8b4",
    "8b483c",
    "MOV ECX,dword ptr [EAX + 0x3c]"
  ],
  [
    "100ae8b7",
    "03c8",
    "ADD ECX,EAX"
  ],
  [
    "100ae8b9",
    "0fb74114",
    "MOVZX EAX,word ptr [ECX + 0x14]"
  ],
  [
    "100ae8bd",
    "53",
    "PUSH EBX"
  ],
  [
    "100ae8be",
    "56",
    "PUSH ESI"
  ],
  [
    "100ae8bf",
    "0fb77106",
    "MOVZX ESI,word ptr [ECX + 0x6]"
  ],
  [
    "100ae8c3",
    "33d2",
    "XOR EDX,EDX"
  ],
  [
    "100ae8c5",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "100ae8c7",
    "57",
    "PUSH EDI"
  ],
  [
    "100ae8c8",
    "8d440818",
    "LEA EAX,[EAX + ECX*0x1 + 0x18]"
  ],
  [
    "100ae8cc",
    "761e",
    "JBE 0x100ae8ec"
  ],
  [
    "100ae8ce",
    "8b7c2414",
    "MOV EDI,dword ptr [ESP + 0x14]"
  ],
  [
    "100ae8d2",
    "8b480c",
    "MOV ECX,dword ptr [EAX + 0xc]"
  ],
  [
    "100ae8d5",
    "3bf9",
    "CMP EDI,ECX"
  ],
  [
    "100ae8d7",
    "7209",
    "JC 0x100ae8e2"
  ],
  [
    "100ae8d9",
    "8b5808",
    "MOV EBX,dword ptr [EAX + 0x8]"
  ],
  [
    "100ae8dc",
    "03d9",
    "ADD EBX,ECX"
  ],
  [
    "100ae8de",
    "3bfb",
    "CMP EDI,EBX"
  ],
  [
    "100ae8e0",
    "720c",
    "JC 0x100ae8ee"
  ],
  [
    "100ae8e2",
    "83c201",
    "ADD EDX,0x1"
  ],
  [
    "100ae8e5",
    "83c028",
    "ADD EAX,0x28"
  ],
  [
    "100ae8e8",
    "3bd6",
    "CMP EDX,ESI"
  ],
  [
    "100ae8ea",
    "72e6",
    "JC 0x100ae8d2"
  ],
  [
    "100ae8ec",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100ae8ee",
    "5f",
    "POP EDI"
  ],
  [
    "100ae8ef",
    "5e",
    "POP ESI"
  ],
  [
    "100ae8f0",
    "5b",
    "POP EBX"
  ],
  [
    "100ae8f1",
    "c3",
    "RET"
  ],
  [
    "100a78fe",
    "e88bffffff",
    "CALL 0x100a788e"
  ],
  [
    "100a7903",
    "e883cb0000",
    "CALL 0x100b448b"
  ],
  [
    "100a7908",
    "837c240400",
    "CMP dword ptr [ESP + 0x4],0x0"
  ],
  [
    "100a790d",
    "a324642f10",
    "MOV [0x102f6424],EAX"
  ],
  [
    "100a7912",
    "7405",
    "JZ 0x100a7919"
  ],
  [
    "100a7914",
    "e80dcb0000",
    "CALL 0x100b4426"
  ],
  [
    "100a7919",
    "dbe2",
    "FNCLEX"
  ],
  [
    "100a791b",
    "c3",
    "RET"
  ],
  [
    "100a788e",
    "b8e6430b10",
    "MOV EAX,0x100b43e6"
  ],
  [
    "100a7893",
    "a380141410",
    "MOV [0x10141480],EAX"
  ],
  [
    "100a7898",
    "c705841414108b3a0b10",
    "MOV dword ptr [0x10141484],0x100b3a8b"
  ],
  [
    "100a78a2",
    "c70588141410493a0b10",
    "MOV dword ptr [0x10141488],0x100b3a49"
  ],
  [
    "100a78ac",
    "c7058c1414107d3a0b10",
    "MOV dword ptr [0x1014148c],0x100b3a7d"
  ],
  [
    "100a78b6",
    "c70590141410f3390b10",
    "MOV dword ptr [0x10141490],0x100b39f3"
  ],
  [
    "100a78c0",
    "a394141410",
    "MOV [0x10141494],EAX"
  ],
  [
    "100a78c5",
    "c7059814141060430b10",
    "MOV dword ptr [0x10141498],0x100b4360"
  ],
  [
    "100a78cf",
    "c7059c141410093a0b10",
    "MOV dword ptr [0x1014149c],0x100b3a09"
  ],
  [
    "100a78d9",
    "c705a014141073390b10",
    "MOV dword ptr [0x101414a0],0x100b3973"
  ],
  [
    "100a78e3",
    "c705a414141002390b10",
    "MOV dword ptr [0x101414a4],0x100b3902"
  ],
  [
    "100a78ed",
    "c3",
    "RET"
  ],
  [
    "100b4407",
    "56",
    "PUSH ESI"
  ],
  [
    "100b4408",
    "57",
    "PUSH EDI"
  ],
  [
    "100b4409",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100b440b",
    "8db780141410",
    "LEA ESI,[EDI + 0x10141480]"
  ],
  [
    "100b4411",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100b4413",
    "e8639effff",
    "CALL 0x100ae27b"
  ],
  [
    "100b4418",
    "83c704",
    "ADD EDI,0x4"
  ],
  [
    "100b441b",
    "83ff28",
    "CMP EDI,0x28"
  ],
  [
    "100b441e",
    "59",
    "POP ECX"
  ],
  [
    "100b441f",
    "8906",
    "MOV dword ptr [ESI],EAX"
  ],
  [
    "100b4421",
    "72e8",
    "JC 0x100b440b"
  ],
  [
    "100b4423",
    "5f",
    "POP EDI"
  ],
  [
    "100b4424",
    "5e",
    "POP ESI"
  ],
  [
    "100b4425",
    "c3",
    "RET"
  ],
  [
    "100b448b",
    "684cde0e10",
    "PUSH 0x100ede4c"
  ],
  [
    "100b4490",
    "ff1568972f10",
    "CALL dword ptr [0x102f9768]"
  ],
  [
    "100b4496",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b4498",
    "7415",
    "JZ 0x100b44af"
  ],
  [
    "100b449a",
    "6830de0e10",
    "PUSH 0x100ede30"
  ],
  [
    "100b449f",
    "50",
    "PUSH EAX"
  ],
  [
    "100b44a0",
    "ff1548962f10",
    "CALL dword ptr [0x102f9648]"
  ],
  [
    "100b44a6",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b44a8",
    "7405",
    "JZ 0x100b44af"
  ],
  [
    "100b44aa",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100b44ac",
    "ffd0",
    "CALL EAX"
  ],
  [
    "100b44ae",
    "c3",
    "RET"
  ],
  [
    "100b44af",
    "e99bffffff",
    "JMP 0x100b444f"
  ],
  [
    "100b444f",
    "55",
    "PUSH EBP"
  ],
  [
    "100b4450",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100b4452",
    "83ec18",
    "SUB ESP,0x18"
  ],
  [
    "100b4455",
    "dd0528de0e10",
    "FLD double ptr [0x100ede28]"
  ],
  [
    "100b445b",
    "dd5df0",
    "FSTP double ptr [EBP + -0x10]"
  ],
  [
    "100b445e",
    "dd0520de0e10",
    "FLD double ptr [0x100ede20]"
  ],
  [
    "100b4464",
    "dd5de8",
    "FSTP double ptr [EBP + -0x18]"
  ],
  [
    "100b4467",
    "dd45e8",
    "FLD double ptr [EBP + -0x18]"
  ],
  [
    "100b446a",
    "dc75f0",
    "FDIV double ptr [EBP + -0x10]"
  ],
  [
    "100b446d",
    "dc4df0",
    "FMUL double ptr [EBP + -0x10]"
  ],
  [
    "100b4470",
    "dc6de8",
    "FSUBR double ptr [EBP + -0x18]"
  ],
  [
    "100b4473",
    "dd5df8",
    "FSTP double ptr [EBP + -0x8]"
  ],
  [
    "100b4476",
    "d9e8",
    "FLD1"
  ],
  [
    "100b4478",
    "dc5df8",
    "FCOMP double ptr [EBP + -0x8]"
  ],
  [
    "100b447b",
    "dfe0",
    "FNSTSW AX"
  ],
  [
    "100b447d",
    "f6c405",
    "TEST AH,0x5"
  ],
  [
    "100b4480",
    "7a05",
    "JP 0x100b4487"
  ],
  [
    "100b4482",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100b4484",
    "40",
    "INC EAX"
  ],
  [
    "100b4485",
    "c9",
    "LEAVE"
  ],
  [
    "100b4486",
    "c3",
    "RET"
  ],
  [
    "100b4487",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100b4489",
    "c9",
    "LEAVE"
  ],
  [
    "100b448a",
    "c3",
    "RET"
  ],
  [
    "100ae27b",
    "56",
    "PUSH ESI"
  ],
  [
    "100ae27c",
    "ff35480b1410",
    "PUSH dword ptr [0x10140b48]"
  ],
  [
    "100ae282",
    "8b35b8972f10",
    "MOV ESI,dword ptr [0x102f97b8]"
  ],
  [
    "100ae288",
    "ffd6",
    "CALL ESI"
  ],
  [
    "100ae28a",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100ae28c",
    "7421",
    "JZ 0x100ae2af"
  ],
  [
    "100ae28e",
    "a1440b1410",
    "MOV EAX,[0x10140b44]"
  ],
  [
    "100ae293",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100ae296",
    "7417",
    "JZ 0x100ae2af"
  ],
  [
    "100ae298",
    "50",
    "PUSH EAX"
  ],
  [
    "100ae299",
    "ff35480b1410",
    "PUSH dword ptr [0x10140b48]"
  ],
  [
    "100ae29f",
    "ffd6",
    "CALL ESI"
  ],
  [
    "100ae2a1",
    "ffd0",
    "CALL EAX"
  ],
  [
    "100ae2a3",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100ae2a5",
    "7408",
    "JZ 0x100ae2af"
  ],
  [
    "100ae2a7",
    "8b80f8010000",
    "MOV EAX,dword ptr [EAX + 0x1f8]"
  ],
  [
    "100ae2ad",
    "eb26",
    "JMP 0x100ae2d5"
  ],
  [
    "100ae2af",
    "6884d20e10",
    "PUSH 0x100ed284"
  ],
  [
    "100ae2b4",
    "ff1568972f10",
    "CALL dword ptr [0x102f9768]"
  ],
  [
    "100ae2ba",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100ae2bc",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "100ae2be",
    "7423",
    "JZ 0x100ae2e3"
  ],
  [
    "100ae2c0",
    "e84affffff",
    "CALL 0x100ae20f"
  ],
  [
    "100ae2c5",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100ae2c7",
    "741a",
    "JZ 0x100ae2e3"
  ],
  [
    "100ae2c9",
    "68d0d60e10",
    "PUSH 0x100ed6d0"
  ],
  [
    "100ae2ce",
    "56",
    "PUSH ESI"
  ],
  [
    "100ae2cf",
    "ff1548962f10",
    "CALL dword ptr [0x102f9648]"
  ],
  [
    "100ae2d5",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100ae2d7",
    "740a",
    "JZ 0x100ae2e3"
  ],
  [
    "100ae2d9",
    "ff742408",
    "PUSH dword ptr [ESP + 0x8]"
  ],
  [
    "100ae2dd",
    "ffd0",
    "CALL EAX"
  ],
  [
    "100ae2df",
    "89442408",
    "MOV dword ptr [ESP + 0x8],EAX"
  ],
  [
    "100ae2e3",
    "8b442408",
    "MOV EAX,dword ptr [ESP + 0x8]"
  ],
  [
    "100ae2e7",
    "5e",
    "POP ESI"
  ],
  [
    "100ae2e8",
    "c3",
    "RET"
  ],
  [
    "100aa47d",
    "56",
    "PUSH ESI"
  ],
  [
    "100aa47e",
    "8b742408",
    "MOV ESI,dword ptr [ESP + 0x8]"
  ],
  [
    "100aa482",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100aa484",
    "eb0f",
    "JMP 0x100aa495"
  ],
  [
    "100aa486",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100aa488",
    "7511",
    "JNZ 0x100aa49b"
  ],
  [
    "100aa48a",
    "8b0e",
    "MOV ECX,dword ptr [ESI]"
  ],
  [
    "100aa48c",
    "85c9",
    "TEST ECX,ECX"
  ],
  [
    "100aa48e",
    "7402",
    "JZ 0x100aa492"
  ],
  [
    "100aa490",
    "ffd1",
    "CALL ECX"
  ],
  [
    "100aa492",
    "83c604",
    "ADD ESI,0x4"
  ],
  [
    "100aa495",
    "3b74240c",
    "CMP ESI,dword ptr [ESP + 0xc]"
  ],
  [
    "100aa499",
    "72eb",
    "JC 0x100aa486"
  ],
  [
    "100aa49b",
    "5e",
    "POP ESI"
  ],
  [
    "100aa49c",
    "c3",
    "RET"
  ],
  [
    "100a7265",
    "56",
    "PUSH ESI"
  ],
  [
    "100a7266",
    "6a04",
    "PUSH 0x4"
  ],
  [
    "100a7268",
    "6a20",
    "PUSH 0x20"
  ],
  [
    "100a726a",
    "e8a17c0000",
    "CALL 0x100aef10"
  ],
  [
    "100a726f",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100a7271",
    "56",
    "PUSH ESI"
  ],
  [
    "100a7272",
    "e804700000",
    "CALL 0x100ae27b"
  ],
  [
    "100a7277",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100a727a",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "100a727c",
    "a384852f10",
    "MOV [0x102f8584],EAX"
  ],
  [
    "100a7281",
    "a380852f10",
    "MOV [0x102f8580],EAX"
  ],
  [
    "100a7286",
    "7505",
    "JNZ 0x100a728d"
  ],
  [
    "100a7288",
    "6a18",
    "PUSH 0x18"
  ],
  [
    "100a728a",
    "58",
    "POP EAX"
  ],
  [
    "100a728b",
    "5e",
    "POP ESI"
  ],
  [
    "100a728c",
    "c3",
    "RET"
  ],
  [
    "100a728d",
    "832600",
    "AND dword ptr [ESI],0x0"
  ],
  [
    "100a7290",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100a7292",
    "5e",
    "POP ESI"
  ],
  [
    "100a7293",
    "c3",
    "RET"
  ],
  [
    "100aef10",
    "56",
    "PUSH ESI"
  ],
  [
    "100aef11",
    "57",
    "PUSH EDI"
  ],
  [
    "100aef12",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100aef14",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100aef16",
    "ff742414",
    "PUSH dword ptr [ESP + 0x14]"
  ],
  [
    "100aef1a",
    "ff742414",
    "PUSH dword ptr [ESP + 0x14]"
  ],
  [
    "100aef1e",
    "e8731f0100",
    "CALL 0x100c0e96"
  ],
  [
    "100aef23",
    "8bf8",
    "MOV EDI,EAX"
  ],
  [
    "100aef25",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100aef28",
    "85ff",
    "TEST EDI,EDI"
  ],
  [
    "100aef2a",
    "7527",
    "JNZ 0x100aef53"
  ],
  [
    "100aef2c",
    "3905b4642f10",
    "CMP dword ptr [0x102f64b4],EAX"
  ],
  [
    "100aef32",
    "761f",
    "JBE 0x100aef53"
  ],
  [
    "100aef34",
    "56",
    "PUSH ESI"
  ],
  [
    "100aef35",
    "ff15e4952f10",
    "CALL dword ptr [0x102f95e4]"
  ],
  [
    "100aef3b",
    "8d86e8030000",
    "LEA EAX,[ESI + 0x3e8]"
  ],
  [
    "100aef41",
    "3b05b4642f10",
    "CMP EAX,dword ptr [0x102f64b4]"
  ],
  [
    "100aef47",
    "7603",
    "JBE 0x100aef4c"
  ],
  [
    "100aef49",
    "83c8ff",
    "OR EAX,0xffffffff"
  ],
  [
    "100aef4c",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100aef4f",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100aef51",
    "75c1",
    "JNZ 0x100aef14"
  ],
  [
    "100aef53",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100aef55",
    "5f",
    "POP EDI"
  ],
  [
    "100aef56",
    "5e",
    "POP ESI"
  ],
  [
    "100aef57",
    "c3",
    "RET"
  ],
  [
    "100b1854",
    "833d88852f1000",
    "CMP dword ptr [0x102f8588],0x0"
  ],
  [
    "100b185b",
    "7512",
    "JNZ 0x100b186f"
  ],
  [
    "100b185d",
    "6afd",
    "PUSH -0x3"
  ],
  [
    "100b185f",
    "e856feffff",
    "CALL 0x100b16ba"
  ],
  [
    "100b1864",
    "59",
    "POP ECX"
  ],
  [
    "100b1865",
    "c70588852f1001000000",
    "MOV dword ptr [0x102f8588],0x1"
  ],
  [
    "100b186f",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100b1871",
    "c3",
    "RET"
  ],
  [
    "100b4b6b",
    "83253c852f1000",
    "AND dword ptr [0x102f853c],0x0"
  ],
  [
    "100b4b72",
    "e81e950100",
    "CALL 0x100ce095"
  ],
  [
    "100b4b77",
    "a33c852f10",
    "MOV [0x102f853c],EAX"
  ],
  [
    "100b4b7c",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100b4b7e",
    "c3",
    "RET"
  ],
  [
    "100ce095",
    "55",
    "PUSH EBP"
  ],
  [
    "100ce096",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100ce098",
    "83ec18",
    "SUB ESP,0x18"
  ],
  [
    "100ce09b",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100ce09d",
    "53",
    "PUSH EBX"
  ],
  [
    "100ce09e",
    "8945fc",
    "MOV dword ptr [EBP + -0x4],EAX"
  ],
  [
    "100ce0a1",
    "8945f4",
    "MOV dword ptr [EBP + -0xc],EAX"
  ],
  [
    "100ce0a4",
    "8945f8",
    "MOV dword ptr [EBP + -0x8],EAX"
  ],
  [
    "100ce0a7",
    "53",
    "PUSH EBX"
  ],
  [
    "100ce0a8",
    "9c",
    "PUSHFD"
  ],
  [
    "100ce0a9",
    "58",
    "POP EAX"
  ],
  [
    "100ce0aa",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100ce0ac",
    "3500002000",
    "XOR EAX,0x200000"
  ],
  [
    "100ce0b1",
    "50",
    "PUSH EAX"
  ],
  [
    "100ce0b2",
    "9d",
    "POPFD"
  ],
  [
    "100ce0b3",
    "9c",
    "PUSHFD"
  ],
  [
    "100ce0b4",
    "5a",
    "POP EDX"
  ],
  [
    "100ce0b5",
    "2bd1",
    "SUB EDX,ECX"
  ],
  [
    "100ce0b7",
    "741f",
    "JZ 0x100ce0d8"
  ],
  [
    "100ce0b9",
    "51",
    "PUSH ECX"
  ],
  [
    "100ce0ba",
    "9d",
    "POPFD"
  ],
  [
    "100ce0bb",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100ce0bd",
    "0fa2",
    "CPUID"
  ],
  [
    "100ce0bf",
    "8945f4",
    "MOV dword ptr [EBP + -0xc],EAX"
  ],
  [
    "100ce0c2",
    "895de8",
    "MOV dword ptr [EBP + -0x18],EBX"
  ],
  [
    "100ce0c5",
    "8955ec",
    "MOV dword ptr [EBP + -0x14],EDX"
  ],
  [
    "100ce0c8",
    "894df0",
    "MOV dword ptr [EBP + -0x10],ECX"
  ],
  [
    "100ce0cb",
    "b801000000",
    "MOV EAX,0x1"
  ],
  [
    "100ce0d0",
    "0fa2",
    "CPUID"
  ],
  [
    "100ce0d2",
    "8955fc",
    "MOV dword ptr [EBP + -0x4],EDX"
  ],
  [
    "100ce0d5",
    "8945f8",
    "MOV dword ptr [EBP + -0x8],EAX"
  ],
  [
    "100ce0d8",
    "5b",
    "POP EBX"
  ],
  [
    "100ce0d9",
    "f745fc00000004",
    "TEST dword ptr [EBP + -0x4],0x4000000"
  ],
  [
    "100ce0e0",
    "740e",
    "JZ 0x100ce0f0"
  ],
  [
    "100ce0e2",
    "e85effffff",
    "CALL 0x100ce045"
  ],
  [
    "100ce0e7",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100ce0e9",
    "7405",
    "JZ 0x100ce0f0"
  ],
  [
    "100ce0eb",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100ce0ed",
    "40",
    "INC EAX"
  ],
  [
    "100ce0ee",
    "eb02",
    "JMP 0x100ce0f2"
  ],
  [
    "100ce0f0",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100ce0f2",
    "5b",
    "POP EBX"
  ],
  [
    "100ce0f3",
    "c9",
    "LEAVE"
  ],
  [
    "100ce0f4",
    "c3",
    "RET"
  ],
  [
    "100ce045",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "100ce047",
    "68c08e0f10",
    "PUSH 0x100f8ec0"
  ],
  [
    "100ce04c",
    "e8170bfeff",
    "CALL 0x100aeb68"
  ],
  [
    "100ce051",
    "8365fc00",
    "AND dword ptr [EBP + -0x4],0x0"
  ],
  [
    "100ce055",
    "660f28c1",
    "MOVAPD XMM0,XMM1"
  ],
  [
    "100ce059",
    "c745e401000000",
    "MOV dword ptr [EBP + -0x1c],0x1"
  ],
  [
    "100ce060",
    "eb23",
    "JMP 0x100ce085"
  ],
  [
    "100ce085",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100ce08c",
    "8b45e4",
    "MOV EAX,dword ptr [EBP + -0x1c]"
  ],
  [
    "100ce08f",
    "e8190bfeff",
    "CALL 0x100aebad"
  ],
  [
    "100ce094",
    "c3",
    "RET"
  ],
  [
    "100aeb68",
    "6800ec0a10",
    "PUSH 0x100aec00"
  ],
  [
    "100aeb6d",
    "64ff3500000000",
    "PUSH dword ptr FS:[0x0]"
  ],
  [
    "100aeb74",
    "8b442410",
    "MOV EAX,dword ptr [ESP + 0x10]"
  ],
  [
    "100aeb78",
    "896c2410",
    "MOV dword ptr [ESP + 0x10],EBP"
  ],
  [
    "100aeb7c",
    "8d6c2410",
    "LEA EBP,[ESP + 0x10]"
  ],
  [
    "100aeb80",
    "2be0",
    "SUB ESP,EAX"
  ],
  [
    "100aeb82",
    "53",
    "PUSH EBX"
  ],
  [
    "100aeb83",
    "56",
    "PUSH ESI"
  ],
  [
    "100aeb84",
    "57",
    "PUSH EDI"
  ],
  [
    "100aeb85",
    "a16c0d1410",
    "MOV EAX,[0x10140d6c]"
  ],
  [
    "100aeb8a",
    "3145fc",
    "XOR dword ptr [EBP + -0x4],EAX"
  ],
  [
    "100aeb8d",
    "33c5",
    "XOR EAX,EBP"
  ],
  [
    "100aeb8f",
    "50",
    "PUSH EAX"
  ],
  [
    "100aeb90",
    "8965e8",
    "MOV dword ptr [EBP + -0x18],ESP"
  ],
  [
    "100aeb93",
    "ff75f8",
    "PUSH dword ptr [EBP + -0x8]"
  ],
  [
    "100aeb96",
    "8b45fc",
    "MOV EAX,dword ptr [EBP + -0x4]"
  ],
  [
    "100aeb99",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100aeba0",
    "8945f8",
    "MOV dword ptr [EBP + -0x8],EAX"
  ],
  [
    "100aeba3",
    "8d45f0",
    "LEA EAX,[EBP + -0x10]"
  ],
  [
    "100aeba6",
    "64a300000000",
    "MOV FS:[0x0],EAX"
  ],
  [
    "100aebac",
    "c3",
    "RET"
  ],
  [
    "100aebad",
    "8b4df0",
    "MOV ECX,dword ptr [EBP + -0x10]"
  ],
  [
    "100aebb0",
    "64890d00000000",
    "MOV dword ptr FS:[0x0],ECX"
  ],
  [
    "100aebb7",
    "59",
    "POP ECX"
  ],
  [
    "100aebb8",
    "5f",
    "POP EDI"
  ],
  [
    "100aebb9",
    "5f",
    "POP EDI"
  ],
  [
    "100aebba",
    "5e",
    "POP ESI"
  ],
  [
    "100aebbb",
    "5b",
    "POP EBX"
  ],
  [
    "100aebbc",
    "8be5",
    "MOV ESP,EBP"
  ],
  [
    "100aebbe",
    "5d",
    "POP EBP"
  ],
  [
    "100aebbf",
    "51",
    "PUSH ECX"
  ],
  [
    "100aebc0",
    "c3",
    "RET"
  ],
  [
    "100bef05",
    "a100852f10",
    "MOV EAX,[0x102f8500]"
  ],
  [
    "100bef0a",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100bef0c",
    "56",
    "PUSH ESI"
  ],
  [
    "100bef0d",
    "6a14",
    "PUSH 0x14"
  ],
  [
    "100bef0f",
    "5e",
    "POP ESI"
  ],
  [
    "100bef10",
    "7507",
    "JNZ 0x100bef19"
  ],
  [
    "100bef12",
    "b800020000",
    "MOV EAX,0x200"
  ],
  [
    "100bef17",
    "eb06",
    "JMP 0x100bef1f"
  ],
  [
    "100bef19",
    "3bc6",
    "CMP EAX,ESI"
  ],
  [
    "100bef1b",
    "7d07",
    "JGE 0x100bef24"
  ],
  [
    "100bef1d",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100bef1f",
    "a300852f10",
    "MOV [0x102f8500],EAX"
  ],
  [
    "100bef24",
    "6a04",
    "PUSH 0x4"
  ],
  [
    "100bef26",
    "50",
    "PUSH EAX"
  ],
  [
    "100bef27",
    "e8e4fffeff",
    "CALL 0x100aef10"
  ],
  [
    "100bef2c",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100bef2e",
    "59",
    "POP ECX"
  ],
  [
    "100bef2f",
    "59",
    "POP ECX"
  ],
  [
    "100bef30",
    "a3c0712f10",
    "MOV [0x102f71c0],EAX"
  ],
  [
    "100bef35",
    "751e",
    "JNZ 0x100bef55"
  ],
  [
    "100bef37",
    "6a04",
    "PUSH 0x4"
  ],
  [
    "100bef39",
    "56",
    "PUSH ESI"
  ],
  [
    "100bef3a",
    "893500852f10",
    "MOV dword ptr [0x102f8500],ESI"
  ],
  [
    "100bef40",
    "e8cbfffeff",
    "CALL 0x100aef10"
  ],
  [
    "100bef45",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100bef47",
    "59",
    "POP ECX"
  ],
  [
    "100bef48",
    "59",
    "POP ECX"
  ],
  [
    "100bef49",
    "a3c0712f10",
    "MOV [0x102f71c0],EAX"
  ],
  [
    "100bef4e",
    "7505",
    "JNZ 0x100bef55"
  ],
  [
    "100bef50",
    "6a1a",
    "PUSH 0x1a"
  ],
  [
    "100bef52",
    "58",
    "POP EAX"
  ],
  [
    "100bef53",
    "5e",
    "POP ESI"
  ],
  [
    "100bef54",
    "c3",
    "RET"
  ],
  [
    "100bef55",
    "33d2",
    "XOR EDX,EDX"
  ],
  [
    "100bef57",
    "b990171410",
    "MOV ECX,0x10141790"
  ],
  [
    "100bef5c",
    "eb05",
    "JMP 0x100bef63"
  ],
  [
    "100bef5e",
    "a1c0712f10",
    "MOV EAX,[0x102f71c0]"
  ],
  [
    "100bef63",
    "890c02",
    "MOV dword ptr [EDX + EAX*0x1],ECX"
  ],
  [
    "100bef66",
    "83c120",
    "ADD ECX,0x20"
  ],
  [
    "100bef69",
    "83c204",
    "ADD EDX,0x4"
  ],
  [
    "100bef6c",
    "81f9101a1410",
    "CMP ECX,0x10141a10"
  ],
  [
    "100bef72",
    "7cea",
    "JL 0x100bef5e"
  ],
  [
    "100bef74",
    "6afe",
    "PUSH -0x2"
  ],
  [
    "100bef76",
    "5e",
    "POP ESI"
  ],
  [
    "100bef77",
    "33d2",
    "XOR EDX,EDX"
  ],
  [
    "100bef79",
    "b9a0171410",
    "MOV ECX,0x101417a0"
  ],
  [
    "100bef7e",
    "57",
    "PUSH EDI"
  ],
  [
    "100bef7f",
    "8bfa",
    "MOV EDI,EDX"
  ],
  [
    "100bef81",
    "83e71f",
    "AND EDI,0x1f"
  ],
  [
    "100bef84",
    "6bff38",
    "IMUL EDI,EDI,0x38"
  ],
  [
    "100bef87",
    "8bc2",
    "MOV EAX,EDX"
  ],
  [
    "100bef89",
    "c1f805",
    "SAR EAX,0x5"
  ],
  [
    "100bef8c",
    "8b0485c0702f10",
    "MOV EAX,dword ptr [EAX*0x4 + 0x102f70c0]"
  ],
  [
    "100bef93",
    "8b0407",
    "MOV EAX,dword ptr [EDI + EAX*0x1]"
  ],
  [
    "100bef96",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100bef99",
    "7408",
    "JZ 0x100befa3"
  ],
  [
    "100bef9b",
    "3bc6",
    "CMP EAX,ESI"
  ],
  [
    "100bef9d",
    "7404",
    "JZ 0x100befa3"
  ],
  [
    "100bef9f",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100befa1",
    "7502",
    "JNZ 0x100befa5"
  ],
  [
    "100befa3",
    "8931",
    "MOV dword ptr [ECX],ESI"
  ],
  [
    "100befa5",
    "83c120",
    "ADD ECX,0x20"
  ],
  [
    "100befa8",
    "42",
    "INC EDX"
  ],
  [
    "100befa9",
    "81f900181410",
    "CMP ECX,0x10141800"
  ],
  [
    "100befaf",
    "7cce",
    "JL 0x100bef7f"
  ],
  [
    "100befb1",
    "5f",
    "POP EDI"
  ],
  [
    "100befb2",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100befb4",
    "5e",
    "POP ESI"
  ],
  [
    "100befb5",
    "c3",
    "RET"
  ],
  [
    "100ce0f5",
    "e89bffffff",
    "CALL 0x100ce095"
  ],
  [
    "100ce0fa",
    "a34c852f10",
    "MOV [0x102f854c],EAX"
  ],
  [
    "100ce0ff",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100ce101",
    "c3",
    "RET"
  ],
  [
    "100a72d0",
    "ff742404",
    "PUSH dword ptr [ESP + 0x4]"
  ],
  [
    "100a72d4",
    "e8bbffffff",
    "CALL 0x100a7294"
  ],
  [
    "100a72d9",
    "f7d8",
    "NEG EAX"
  ],
  [
    "100a72db",
    "1bc0",
    "SBB EAX,EAX"
  ],
  [
    "100a72dd",
    "f7d8",
    "NEG EAX"
  ],
  [
    "100a72df",
    "59",
    "POP ECX"
  ],
  [
    "100a72e0",
    "48",
    "DEC EAX"
  ],
  [
    "100a72e1",
    "c3",
    "RET"
  ],
  [
    "100a7294",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "100a7296",
    "6830860f10",
    "PUSH 0x100f8630"
  ],
  [
    "100a729b",
    "e8c8780000",
    "CALL 0x100aeb68"
  ],
  [
    "100a72a0",
    "e8ae310000",
    "CALL 0x100aa453"
  ],
  [
    "100a72a5",
    "8365fc00",
    "AND dword ptr [EBP + -0x4],0x0"
  ],
  [
    "100a72a9",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100a72ac",
    "e8fbfeffff",
    "CALL 0x100a71ac"
  ],
  [
    "100a72b1",
    "59",
    "POP ECX"
  ],
  [
    "100a72b2",
    "8945e4",
    "MOV dword ptr [EBP + -0x1c],EAX"
  ],
  [
    "100a72b5",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100a72bc",
    "e809000000",
    "CALL 0x100a72ca"
  ],
  [
    "100a72c1",
    "8b45e4",
    "MOV EAX,dword ptr [EBP + -0x1c]"
  ],
  [
    "100a72c4",
    "e8e4780000",
    "CALL 0x100aebad"
  ],
  [
    "100a72c9",
    "c3",
    "RET"
  ],
  [
    "100a71ac",
    "51",
    "PUSH ECX"
  ],
  [
    "100a71ad",
    "53",
    "PUSH EBX"
  ],
  [
    "100a71ae",
    "55",
    "PUSH EBP"
  ],
  [
    "100a71af",
    "56",
    "PUSH ESI"
  ],
  [
    "100a71b0",
    "57",
    "PUSH EDI"
  ],
  [
    "100a71b1",
    "ff3584852f10",
    "PUSH dword ptr [0x102f8584]"
  ],
  [
    "100a71b7",
    "e836710000",
    "CALL 0x100ae2f2"
  ],
  [
    "100a71bc",
    "ff3580852f10",
    "PUSH dword ptr [0x102f8580]"
  ],
  [
    "100a71c2",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100a71c4",
    "89742418",
    "MOV dword ptr [ESP + 0x18],ESI"
  ],
  [
    "100a71c8",
    "e825710000",
    "CALL 0x100ae2f2"
  ],
  [
    "100a71cd",
    "8bf8",
    "MOV EDI,EAX"
  ],
  [
    "100a71cf",
    "3bfe",
    "CMP EDI,ESI"
  ],
  [
    "100a71d1",
    "59",
    "POP ECX"
  ],
  [
    "100a71d2",
    "59",
    "POP ECX"
  ],
  [
    "100a71d3",
    "0f8284000000",
    "JC 0x100a725d"
  ],
  [
    "100a71d9",
    "8bdf",
    "MOV EBX,EDI"
  ],
  [
    "100a71db",
    "2bde",
    "SUB EBX,ESI"
  ],
  [
    "100a71dd",
    "8d6b04",
    "LEA EBP,[EBX + 0x4]"
  ],
  [
    "100a71e0",
    "83fd04",
    "CMP EBP,0x4"
  ],
  [
    "100a71e3",
    "7278",
    "JC 0x100a725d"
  ],
  [
    "100a71e5",
    "56",
    "PUSH ESI"
  ],
  [
    "100a71e6",
    "e8eb9e0000",
    "CALL 0x100b10d6"
  ],
  [
    "100a71eb",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100a71ed",
    "3bf5",
    "CMP ESI,EBP"
  ],
  [
    "100a71ef",
    "59",
    "POP ECX"
  ],
  [
    "100a71f0",
    "734a",
    "JNC 0x100a723c"
  ],
  [
    "100a71f2",
    "b800080000",
    "MOV EAX,0x800"
  ],
  [
    "100a71f7",
    "3bf0",
    "CMP ESI,EAX"
  ],
  [
    "100a71f9",
    "7302",
    "JNC 0x100a71fd"
  ],
  [
    "100a71fb",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100a71fd",
    "03c6",
    "ADD EAX,ESI"
  ],
  [
    "100a71ff",
    "3bc6",
    "CMP EAX,ESI"
  ],
  [
    "100a7201",
    "7210",
    "JC 0x100a7213"
  ],
  [
    "100a7203",
    "50",
    "PUSH EAX"
  ],
  [
    "100a7204",
    "ff742414",
    "PUSH dword ptr [ESP + 0x14]"
  ],
  [
    "100a7208",
    "e84b7d0000",
    "CALL 0x100aef58"
  ],
  [
    "100a720d",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100a720f",
    "59",
    "POP ECX"
  ],
  [
    "100a7210",
    "59",
    "POP ECX"
  ],
  [
    "100a7211",
    "7517",
    "JNZ 0x100a722a"
  ],
  [
    "100a7213",
    "8d4610",
    "LEA EAX,[ESI + 0x10]"
  ],
  [
    "100a7216",
    "3bc6",
    "CMP EAX,ESI"
  ],
  [
    "100a7218",
    "7243",
    "JC 0x100a725d"
  ],
  [
    "100a721a",
    "50",
    "PUSH EAX"
  ],
  [
    "100a721b",
    "ff742414",
    "PUSH dword ptr [ESP + 0x14]"
  ],
  [
    "100a721f",
    "e8347d0000",
    "CALL 0x100aef58"
  ],
  [
    "100a7224",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100a7226",
    "59",
    "POP ECX"
  ],
  [
    "100a7227",
    "59",
    "POP ECX"
  ],
  [
    "100a7228",
    "7433",
    "JZ 0x100a725d"
  ],
  [
    "100a722a",
    "c1fb02",
    "SAR EBX,0x2"
  ],
  [
    "100a722d",
    "50",
    "PUSH EAX"
  ],
  [
    "100a722e",
    "8d3c98",
    "LEA EDI,[EAX + EBX*0x4]"
  ],
  [
    "100a7231",
    "e845700000",
    "CALL 0x100ae27b"
  ],
  [
    "100a7236",
    "59",
    "POP ECX"
  ],
  [
    "100a7237",
    "a384852f10",
    "MOV [0x102f8584],EAX"
  ],
  [
    "100a723c",
    "ff742418",
    "PUSH dword ptr [ESP + 0x18]"
  ],
  [
    "100a7240",
    "e836700000",
    "CALL 0x100ae27b"
  ],
  [
    "100a7245",
    "8907",
    "MOV dword ptr [EDI],EAX"
  ],
  [
    "100a7247",
    "83c704",
    "ADD EDI,0x4"
  ],
  [
    "100a724a",
    "57",
    "PUSH EDI"
  ],
  [
    "100a724b",
    "e82b700000",
    "CALL 0x100ae27b"
  ],
  [
    "100a7250",
    "59",
    "POP ECX"
  ],
  [
    "100a7251",
    "a380852f10",
    "MOV [0x102f8580],EAX"
  ],
  [
    "100a7256",
    "8b44241c",
    "MOV EAX,dword ptr [ESP + 0x1c]"
  ],
  [
    "100a725a",
    "59",
    "POP ECX"
  ],
  [
    "100a725b",
    "eb02",
    "JMP 0x100a725f"
  ],
  [
    "100a725d",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100a725f",
    "5f",
    "POP EDI"
  ],
  [
    "100a7260",
    "5e",
    "POP ESI"
  ],
  [
    "100a7261",
    "5d",
    "POP EBP"
  ],
  [
    "100a7262",
    "5b",
    "POP EBX"
  ],
  [
    "100a7263",
    "59",
    "POP ECX"
  ],
  [
    "100a7264",
    "c3",
    "RET"
  ],
  [
    "100ae2f2",
    "56",
    "PUSH ESI"
  ],
  [
    "100ae2f3",
    "ff35480b1410",
    "PUSH dword ptr [0x10140b48]"
  ],
  [
    "100ae2f9",
    "8b35b8972f10",
    "MOV ESI,dword ptr [0x102f97b8]"
  ],
  [
    "100ae2ff",
    "ffd6",
    "CALL ESI"
  ],
  [
    "100ae301",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100ae303",
    "7421",
    "JZ 0x100ae326"
  ],
  [
    "100ae305",
    "a1440b1410",
    "MOV EAX,[0x10140b44]"
  ],
  [
    "100ae30a",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100ae30d",
    "7417",
    "JZ 0x100ae326"
  ],
  [
    "100ae30f",
    "50",
    "PUSH EAX"
  ],
  [
    "100ae310",
    "ff35480b1410",
    "PUSH dword ptr [0x10140b48]"
  ],
  [
    "100ae316",
    "ffd6",
    "CALL ESI"
  ],
  [
    "100ae318",
    "ffd0",
    "CALL EAX"
  ],
  [
    "100ae31a",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100ae31c",
    "7408",
    "JZ 0x100ae326"
  ],
  [
    "100ae31e",
    "8b80fc010000",
    "MOV EAX,dword ptr [EAX + 0x1fc]"
  ],
  [
    "100ae324",
    "eb26",
    "JMP 0x100ae34c"
  ],
  [
    "100ae326",
    "6884d20e10",
    "PUSH 0x100ed284"
  ],
  [
    "100ae32b",
    "ff1568972f10",
    "CALL dword ptr [0x102f9768]"
  ],
  [
    "100ae331",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100ae333",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "100ae335",
    "7423",
    "JZ 0x100ae35a"
  ],
  [
    "100ae337",
    "e8d3feffff",
    "CALL 0x100ae20f"
  ],
  [
    "100ae33c",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100ae33e",
    "741a",
    "JZ 0x100ae35a"
  ],
  [
    "100ae340",
    "68e0d60e10",
    "PUSH 0x100ed6e0"
  ],
  [
    "100ae345",
    "56",
    "PUSH ESI"
  ],
  [
    "100ae346",
    "ff1548962f10",
    "CALL dword ptr [0x102f9648]"
  ],
  [
    "100ae34c",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100ae34e",
    "740a",
    "JZ 0x100ae35a"
  ],
  [
    "100ae350",
    "ff742408",
    "PUSH dword ptr [ESP + 0x8]"
  ],
  [
    "100ae354",
    "ffd0",
    "CALL EAX"
  ],
  [
    "100ae356",
    "89442408",
    "MOV dword ptr [ESP + 0x8],EAX"
  ],
  [
    "100ae35a",
    "8b442408",
    "MOV EAX,dword ptr [ESP + 0x8]"
  ],
  [
    "100ae35e",
    "5e",
    "POP ESI"
  ],
  [
    "100ae35f",
    "c3",
    "RET"
  ],
  [
    "100b10d6",
    "6a10",
    "PUSH 0x10"
  ],
  [
    "100b10d8",
    "68a08b0f10",
    "PUSH 0x100f8ba0"
  ],
  [
    "100b10dd",
    "e886daffff",
    "CALL 0x100aeb68"
  ],
  [
    "100b10e2",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100b10e4",
    "8b5d08",
    "MOV EBX,dword ptr [EBP + 0x8]"
  ],
  [
    "100b10e7",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100b10e9",
    "3bdf",
    "CMP EBX,EDI"
  ],
  [
    "100b10eb",
    "0f95c0",
    "SETNZ AL"
  ],
  [
    "100b10ee",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100b10f0",
    "751d",
    "JNZ 0x100b110f"
  ],
  [
    "100b10f2",
    "e8dadcffff",
    "CALL 0x100aedd1"
  ],
  [
    "100b10f7",
    "c70016000000",
    "MOV dword ptr [EAX],0x16"
  ],
  [
    "100b10fd",
    "57",
    "PUSH EDI"
  ],
  [
    "100b10fe",
    "57",
    "PUSH EDI"
  ],
  [
    "100b10ff",
    "57",
    "PUSH EDI"
  ],
  [
    "100b1100",
    "57",
    "PUSH EDI"
  ],
  [
    "100b1101",
    "57",
    "PUSH EDI"
  ],
  [
    "100b1102",
    "e8cbd0ffff",
    "CALL 0x100ae1d2"
  ],
  [
    "100b1107",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100b110a",
    "83c8ff",
    "OR EAX,0xffffffff"
  ],
  [
    "100b110d",
    "eb53",
    "JMP 0x100b1162"
  ],
  [
    "100b110f",
    "833d30852f1003",
    "CMP dword ptr [0x102f8530],0x3"
  ],
  [
    "100b1116",
    "7538",
    "JNZ 0x100b1150"
  ],
  [
    "100b1118",
    "6a04",
    "PUSH 0x4"
  ],
  [
    "100b111a",
    "e873a70000",
    "CALL 0x100bb892"
  ],
  [
    "100b111f",
    "59",
    "POP ECX"
  ],
  [
    "100b1120",
    "897dfc",
    "MOV dword ptr [EBP + -0x4],EDI"
  ],
  [
    "100b1123",
    "53",
    "PUSH EBX"
  ],
  [
    "100b1124",
    "e850b10000",
    "CALL 0x100bc279"
  ],
  [
    "100b1129",
    "59",
    "POP ECX"
  ],
  [
    "100b112a",
    "8945e0",
    "MOV dword ptr [EBP + -0x20],EAX"
  ],
  [
    "100b112d",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100b112f",
    "740b",
    "JZ 0x100b113c"
  ],
  [
    "100b1131",
    "8b73fc",
    "MOV ESI,dword ptr [EBX + -0x4]"
  ],
  [
    "100b1134",
    "83ee09",
    "SUB ESI,0x9"
  ],
  [
    "100b1137",
    "8975e4",
    "MOV dword ptr [EBP + -0x1c],ESI"
  ],
  [
    "100b113a",
    "eb03",
    "JMP 0x100b113f"
  ],
  [
    "100b113c",
    "8b75e4",
    "MOV ESI,dword ptr [EBP + -0x1c]"
  ],
  [
    "100b113f",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100b1146",
    "e825000000",
    "CALL 0x100b1170"
  ],
  [
    "100b114b",
    "397de0",
    "CMP dword ptr [EBP + -0x20],EDI"
  ],
  [
    "100b114e",
    "7510",
    "JNZ 0x100b1160"
  ],
  [
    "100b1150",
    "53",
    "PUSH EBX"
  ],
  [
    "100b1151",
    "57",
    "PUSH EDI"
  ],
  [
    "100b1152",
    "ff35c86a2f10",
    "PUSH dword ptr [0x102f6ac8]"
  ],
  [
    "100b1158",
    "ff1578962f10",
    "CALL dword ptr [0x102f9678]"
  ],
  [
    "100b115e",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100b1160",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100b1162",
    "e846daffff",
    "CALL 0x100aebad"
  ],
  [
    "100b1167",
    "c3",
    "RET"
  ],
  [
    "100aa453",
    "6a08",
    "PUSH 0x8"
  ],
  [
    "100aa455",
    "e838140100",
    "CALL 0x100bb892"
  ],
  [
    "100aa45a",
    "59",
    "POP ECX"
  ],
  [
    "100aa45b",
    "c3",
    "RET"
  ],
  [
    "100aa45c",
    "6a08",
    "PUSH 0x8"
  ],
  [
    "100aa45e",
    "e83f130100",
    "CALL 0x100bb7a2"
  ],
  [
    "100aa463",
    "59",
    "POP ECX"
  ],
  [
    "100aa464",
    "c3",
    "RET"
  ],
  [
    "100a72ca",
    "e88d310000",
    "CALL 0x100aa45c"
  ],
  [
    "100a72cf",
    "c3",
    "RET"
  ],
  [
    "100e1660",
    "68f0300e10",
    "push 0x100e30f0"
  ],
  [
    "100e1665",
    "e8665cfcff",
    "call 0x100a72d0"
  ],
  [
    "100e166a",
    "59",
    "pop ecx"
  ],
  [
    "100e166b",
    "c3",
    "ret"
  ],
  [
    "100e1440",
    "68d0260e10",
    "PUSH 0x100e26d0"
  ],
  [
    "100e1445",
    "e8865efcff",
    "CALL 0x100a72d0"
  ],
  [
    "100e144a",
    "59",
    "POP ECX"
  ],
  [
    "100e144b",
    "c3",
    "RET"
  ],
  [
    "100e1450",
    "68a07d1910",
    "PUSH 0x10197da0"
  ],
  [
    "100e1455",
    "ff15f4952f10",
    "CALL dword ptr [0x102f95f4]"
  ],
  [
    "100e145b",
    "6810280e10",
    "PUSH 0x100e2810"
  ],
  [
    "100e1460",
    "e86b5efcff",
    "CALL 0x100a72d0"
  ],
  [
    "100e1465",
    "59",
    "POP ECX"
  ],
  [
    "100e1466",
    "c3",
    "RET"
  ],
  [
    "100e1470",
    "a128bb0e10",
    "mov eax, dword ptr [0x100ebb28]"
  ],
  [
    "100e1475",
    "8b0d2cbb0e10",
    "mov ecx, dword ptr [0x100ebb2c]"
  ],
  [
    "100e147b",
    "8b1530bb0e10",
    "mov edx, dword ptr [0x100ebb30]"
  ],
  [
    "100e1481",
    "a350b11a10",
    "mov dword ptr [0x101ab150], eax"
  ],
  [
    "100e1486",
    "a134bb0e10",
    "mov eax, dword ptr [0x100ebb34]"
  ],
  [
    "100e148b",
    "890d54b11a10",
    "mov dword ptr [0x101ab154], ecx"
  ],
  [
    "100e1491",
    "891558b11a10",
    "mov dword ptr [0x101ab158], edx"
  ],
  [
    "100e1497",
    "a35cb11a10",
    "mov dword ptr [0x101ab15c], eax"
  ],
  [
    "100e149c",
    "c3",
    "ret"
  ],
  [
    "100e14b0",
    "6830290e10",
    "PUSH 0x100e2930"
  ],
  [
    "100e14b5",
    "e8165efcff",
    "CALL 0x100a72d0"
  ],
  [
    "100e14ba",
    "59",
    "POP ECX"
  ],
  [
    "100e14bb",
    "c3",
    "RET"
  ],
  [
    "100e14c0",
    "6840290e10",
    "PUSH 0x100e2940"
  ],
  [
    "100e14c5",
    "e8065efcff",
    "CALL 0x100a72d0"
  ],
  [
    "100e14ca",
    "59",
    "POP ECX"
  ],
  [
    "100e14cb",
    "c3",
    "RET"
  ],
  [
    "100e14d0",
    "6850290e10",
    "PUSH 0x100e2950"
  ],
  [
    "100e14d5",
    "e8f65dfcff",
    "CALL 0x100a72d0"
  ],
  [
    "100e14da",
    "59",
    "POP ECX"
  ],
  [
    "100e14db",
    "c3",
    "RET"
  ],
  [
    "100e14e0",
    "6860290e10",
    "PUSH 0x100e2960"
  ],
  [
    "100e14e5",
    "e8e65dfcff",
    "CALL 0x100a72d0"
  ],
  [
    "100e14ea",
    "59",
    "POP ECX"
  ],
  [
    "100e14eb",
    "c3",
    "RET"
  ],
  [
    "100e14f0",
    "68002a0e10",
    "PUSH 0x100e2a00"
  ],
  [
    "100e14f5",
    "e8d65dfcff",
    "CALL 0x100a72d0"
  ],
  [
    "100e14fa",
    "59",
    "POP ECX"
  ],
  [
    "100e14fb",
    "c3",
    "RET"
  ],
  [
    "100e1500",
    "68102a0e10",
    "PUSH 0x100e2a10"
  ],
  [
    "100e1505",
    "e8c65dfcff",
    "CALL 0x100a72d0"
  ],
  [
    "100e150a",
    "59",
    "POP ECX"
  ],
  [
    "100e150b",
    "c3",
    "RET"
  ],
  [
    "100e1510",
    "51",
    "PUSH ECX"
  ],
  [
    "100e1511",
    "685c9b0e10",
    "PUSH 0x100e9b5c"
  ],
  [
    "100e1516",
    "8d4c2404",
    "LEA ECX,[ESP + 0x4]"
  ],
  [
    "100e151a",
    "e88826f2ff",
    "CALL 0x10003ba7"
  ],
  [
    "100e151f",
    "8b0424",
    "MOV EAX,dword ptr [ESP]"
  ],
  [
    "100e1522",
    "33d2",
    "XOR EDX,EDX"
  ],
  [
    "100e1524",
    "3bc2",
    "CMP EAX,EDX"
  ],
  [
    "100e1526",
    "a318462f10",
    "MOV [0x102f4618],EAX"
  ],
  [
    "100e152b",
    "7408",
    "JZ 0x100e1535"
  ],
  [
    "100e152d",
    "668340fc01",
    "ADD word ptr [EAX + -0x4],0x1"
  ],
  [
    "100e1532",
    "8b0424",
    "MOV EAX,dword ptr [ESP]"
  ],
  [
    "100e1535",
    "0f57c0",
    "XORPS XMM0,XMM0"
  ],
  [
    "100e1538",
    "8d0c24",
    "LEA ECX,[ESP]"
  ],
  [
    "100e153b",
    "85c9",
    "TEST ECX,ECX"
  ],
  [
    "100e153d",
    "891528462f10",
    "MOV dword ptr [0x102f4628],EDX"
  ],
  [
    "100e1543",
    "89152c462f10",
    "MOV dword ptr [0x102f462c],EDX"
  ],
  [
    "100e1549",
    "891530462f10",
    "MOV dword ptr [0x102f4630],EDX"
  ],
  [
    "100e154f",
    "891534462f10",
    "MOV dword ptr [0x102f4634],EDX"
  ],
  [
    "100e1555",
    "891538462f10",
    "MOV dword ptr [0x102f4638],EDX"
  ],
  [
    "100e155b",
    "89153c462f10",
    "MOV dword ptr [0x102f463c],EDX"
  ],
  [
    "100e1561",
    "89151c462f10",
    "MOV dword ptr [0x102f461c],EDX"
  ],
  [
    "100e1567",
    "f30f110520462f10",
    "MOVSS dword ptr [0x102f4620],XMM0"
  ],
  [
    "100e156f",
    "7423",
    "JZ 0x100e1594"
  ],
  [
    "100e1571",
    "3bc2",
    "CMP EAX,EDX"
  ],
  [
    "100e1573",
    "741f",
    "JZ 0x100e1594"
  ],
  [
    "100e1575",
    "668140fcffff",
    "ADD word ptr [EAX + -0x4],0xffff"
  ],
  [
    "100e157b",
    "0fb748fc",
    "MOVZX ECX,word ptr [EAX + -0x4]"
  ],
  [
    "100e157f",
    "83c0f8",
    "ADD EAX,-0x8"
  ],
  [
    "100e1582",
    "663bca",
    "CMP CX,DX"
  ],
  [
    "100e1585",
    "770d",
    "JA 0x100e1594"
  ],
  [
    "100e1587",
    "50",
    "PUSH EAX"
  ],
  [
    "100e1588",
    "e82115f2ff",
    "CALL 0x10002aae"
  ],
  [
    "100e158d",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100e158f",
    "e87e0bf2ff",
    "CALL 0x10002112"
  ],
  [
    "100e1594",
    "68402b0e10",
    "PUSH 0x100e2b40"
  ],
  [
    "100e1599",
    "e8325dfcff",
    "CALL 0x100a72d0"
  ],
  [
    "100e159e",
    "83c408",
    "ADD ESP,0x8"
  ],
  [
    "100e15a1",
    "c3",
    "RET"
  ],
  [
    "100135f0",
    "53",
    "PUSH EBX"
  ],
  [
    "100135f1",
    "8b5c2408",
    "MOV EBX,dword ptr [ESP + 0x8]"
  ],
  [
    "100135f5",
    "85db",
    "TEST EBX,EBX"
  ],
  [
    "100135f7",
    "56",
    "PUSH ESI"
  ],
  [
    "100135f8",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100135fa",
    "7509",
    "JNZ 0x10013605"
  ],
  [
    "100135fc",
    "891e",
    "MOV dword ptr [ESI],EBX"
  ],
  [
    "100135fe",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "10013600",
    "5e",
    "POP ESI"
  ],
  [
    "10013601",
    "5b",
    "POP EBX"
  ],
  [
    "10013602",
    "c20400",
    "RET 0x4"
  ],
  [
    "10013605",
    "8bc3",
    "MOV EAX,EBX"
  ],
  [
    "10013607",
    "8d5001",
    "LEA EDX,[EAX + 0x1]"
  ],
  [
    "1001360a",
    "8d9b00000000",
    "LEA EBX,[EBX]"
  ],
  [
    "10013610",
    "8a08",
    "MOV CL,byte ptr [EAX]"
  ],
  [
    "10013612",
    "83c001",
    "ADD EAX,0x1"
  ],
  [
    "10013615",
    "84c9",
    "TEST CL,CL"
  ],
  [
    "10013617",
    "75f7",
    "JNZ 0x10013610"
  ],
  [
    "10013619",
    "2bc2",
    "SUB EAX,EDX"
  ],
  [
    "1001361b",
    "57",
    "PUSH EDI"
  ],
  [
    "1001361c",
    "8bf8",
    "MOV EDI,EAX"
  ],
  [
    "1001361e",
    "741d",
    "JZ 0x1001363d"
  ],
  [
    "10013620",
    "57",
    "PUSH EDI"
  ],
  [
    "10013621",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "10013623",
    "e83d47ffff",
    "CALL 0x10007d65"
  ],
  [
    "10013628",
    "8b06",
    "MOV EAX,dword ptr [ESI]"
  ],
  [
    "1001362a",
    "57",
    "PUSH EDI"
  ],
  [
    "1001362b",
    "53",
    "PUSH EBX"
  ],
  [
    "1001362c",
    "50",
    "PUSH EAX"
  ],
  [
    "1001362d",
    "e8ce430900",
    "CALL 0x100a7a00"
  ],
  [
    "10013632",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "10013635",
    "5f",
    "POP EDI"
  ],
  [
    "10013636",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "10013638",
    "5e",
    "POP ESI"
  ],
  [
    "10013639",
    "5b",
    "POP EBX"
  ],
  [
    "1001363a",
    "c20400",
    "RET 0x4"
  ],
  [
    "1001363d",
    "5f",
    "POP EDI"
  ],
  [
    "1001363e",
    "c70600000000",
    "MOV dword ptr [ESI],0x0"
  ],
  [
    "10013644",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "10013646",
    "5e",
    "POP ESI"
  ],
  [
    "10013647",
    "5b",
    "POP EBX"
  ],
  [
    "10013648",
    "c20400",
    "RET 0x4"
  ],
  [
    "10013240",
    "56",
    "PUSH ESI"
  ],
  [
    "10013241",
    "8b742408",
    "MOV ESI,dword ptr [ESP + 0x8]"
  ],
  [
    "10013245",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "10013247",
    "57",
    "PUSH EDI"
  ],
  [
    "10013248",
    "8bf9",
    "MOV EDI,ECX"
  ],
  [
    "1001324a",
    "7507",
    "JNZ 0x10013253"
  ],
  [
    "1001324c",
    "8937",
    "MOV dword ptr [EDI],ESI"
  ],
  [
    "1001324e",
    "5f",
    "POP EDI"
  ],
  [
    "1001324f",
    "5e",
    "POP ESI"
  ],
  [
    "10013250",
    "c20400",
    "RET 0x4"
  ],
  [
    "10013253",
    "8d4609",
    "LEA EAX,[ESI + 0x9]"
  ],
  [
    "10013256",
    "50",
    "PUSH EAX"
  ],
  [
    "10013257",
    "e852f8feff",
    "CALL 0x10002aae"
  ],
  [
    "1001325c",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1001325e",
    "e8750affff",
    "CALL 0x10003cd8"
  ],
  [
    "10013263",
    "8930",
    "MOV dword ptr [EAX],ESI"
  ],
  [
    "10013265",
    "66c740040100",
    "MOV word ptr [EAX + 0x4],0x1"
  ],
  [
    "1001326b",
    "83c008",
    "ADD EAX,0x8"
  ],
  [
    "1001326e",
    "8907",
    "MOV dword ptr [EDI],EAX"
  ],
  [
    "10013270",
    "5f",
    "POP EDI"
  ],
  [
    "10013271",
    "c6043000",
    "MOV byte ptr [EAX + ESI*0x1],0x0"
  ],
  [
    "10013275",
    "5e",
    "POP ESI"
  ],
  [
    "10013276",
    "c20400",
    "RET 0x4"
  ],
  [
    "10003ba7",
    "e944fa0000",
    "JMP 0x100135f0"
  ],
  [
    "10007d65",
    "e9d6b40000",
    "JMP 0x10013240"
  ]
];
const instructions=new Map<string,SharedInitializerInstruction>(rows.map(([address,bytes,instruction])=>
  [address!,Object.freeze({address:address!,bytes:bytes!,instruction:instruction!})]));
export function sharedInitializerInstruction(address:string):SharedInitializerInstruction {
  const row=instructions.get(address);if(!row)throw new Error('Unowned SharedBase initializer instruction '+address);return row;
}
