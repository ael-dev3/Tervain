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
    "100e15d0",
    "6840a30e10",
    "PUSH 0x100ea340"
  ],
  [
    "100e15d5",
    "b9d0472f10",
    "MOV ECX,0x102f47d0"
  ],
  [
    "100e15da",
    "e8c825f2ff",
    "CALL 0x10003ba7"
  ],
  [
    "100e15df",
    "68202f0e10",
    "PUSH 0x100e2f20"
  ],
  [
    "100e15e4",
    "e8e75cfcff",
    "CALL 0x100a72d0"
  ],
  [
    "100e15e9",
    "59",
    "POP ECX"
  ],
  [
    "100e15ea",
    "c3",
    "RET"
  ],
  [
    "100e1600",
    "e89a4bf2ff",
    "call 0x1000619f"
  ],
  [
    "100e1605",
    "a3bc482f10",
    "mov dword ptr [0x102f48bc], eax"
  ],
  [
    "100e160a",
    "c3",
    "ret"
  ],
  [
    "1008e900",
    "a1ec472f10",
    "MOV EAX,[0x102f47ec]"
  ],
  [
    "1008e905",
    "a801",
    "TEST AL,0x1"
  ],
  [
    "1008e907",
    "7514",
    "JNZ 0x1008e91d"
  ],
  [
    "1008e909",
    "8b0dbc482f10",
    "MOV ECX,dword ptr [0x102f48bc]"
  ],
  [
    "1008e90f",
    "83c801",
    "OR EAX,0x1"
  ],
  [
    "1008e912",
    "a3ec472f10",
    "MOV [0x102f47ec],EAX"
  ],
  [
    "1008e917",
    "890de8472f10",
    "MOV dword ptr [0x102f47e8],ECX"
  ],
  [
    "1008e91d",
    "a802",
    "TEST AL,0x2"
  ],
  [
    "1008e91f",
    "752f",
    "JNZ 0x1008e950"
  ],
  [
    "1008e921",
    "83c802",
    "OR EAX,0x2"
  ],
  [
    "1008e924",
    "6884642f10",
    "PUSH 0x102f6484"
  ],
  [
    "1008e929",
    "b948011410",
    "MOV ECX,0x10140148"
  ],
  [
    "1008e92e",
    "a3ec472f10",
    "MOV [0x102f47ec],EAX"
  ],
  [
    "1008e933",
    "e861870100",
    "CALL 0x100a7099"
  ],
  [
    "1008e938",
    "50",
    "PUSH EAX"
  ],
  [
    "1008e939",
    "68e4472f10",
    "PUSH 0x102f47e4"
  ],
  [
    "1008e93e",
    "e88a9ff7ff",
    "CALL 0x100088cd"
  ],
  [
    "1008e943",
    "68ff790010",
    "PUSH 0x100079ff"
  ],
  [
    "1008e948",
    "e883890100",
    "CALL 0x100a72d0"
  ],
  [
    "1008e94d",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "1008e950",
    "b8e4472f10",
    "MOV EAX,0x102f47e4"
  ],
  [
    "1008e955",
    "c3",
    "RET"
  ],
  [
    "100a7099",
    "ff742404",
    "PUSH dword ptr [ESP + 0x4]"
  ],
  [
    "100a709d",
    "51",
    "PUSH ECX"
  ],
  [
    "100a709e",
    "e85f980000",
    "CALL 0x100b0902"
  ],
  [
    "100a70a3",
    "59",
    "POP ECX"
  ],
  [
    "100a70a4",
    "59",
    "POP ECX"
  ],
  [
    "100a70a5",
    "c20400",
    "RET 0x4"
  ],
  [
    "100b0902",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "100b0904",
    "68208b0f10",
    "PUSH 0x100f8b20"
  ],
  [
    "100b0909",
    "e85ae2ffff",
    "CALL 0x100aeb68"
  ],
  [
    "100b090e",
    "8b7d08",
    "MOV EDI,dword ptr [EBP + 0x8]"
  ],
  [
    "100b0911",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100b0913",
    "395f04",
    "CMP dword ptr [EDI + 0x4],EBX"
  ],
  [
    "100b0916",
    "0f85c6000000",
    "JNZ 0x100b09e2"
  ],
  [
    "100b091c",
    "6800280000",
    "PUSH 0x2800"
  ],
  [
    "100b0921",
    "68a4a90a10",
    "PUSH 0x100aa9a4"
  ],
  [
    "100b0926",
    "68f6aa0a10",
    "PUSH 0x100aaaf6"
  ],
  [
    "100b092b",
    "53",
    "PUSH EBX"
  ],
  [
    "100b092c",
    "8d4709",
    "LEA EAX,[EDI + 0x9]"
  ],
  [
    "100b092f",
    "50",
    "PUSH EAX"
  ],
  [
    "100b0930",
    "53",
    "PUSH EBX"
  ],
  [
    "100b0931",
    "e80c580100",
    "CALL 0x100c6142"
  ],
  [
    "100b0936",
    "83c418",
    "ADD ESP,0x18"
  ],
  [
    "100b0939",
    "8945e4",
    "MOV dword ptr [EBP + -0x1c],EAX"
  ],
  [
    "100b093c",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100b093e",
    "7507",
    "JNZ 0x100b0947"
  ],
  [
    "100b0940",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100b0942",
    "e99e000000",
    "JMP 0x100b09e5"
  ],
  [
    "100b0947",
    "50",
    "PUSH EAX"
  ],
  [
    "100b0948",
    "e833210000",
    "CALL 0x100b2a80"
  ],
  [
    "100b094d",
    "59",
    "POP ECX"
  ],
  [
    "100b094e",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100b0950",
    "eb0d",
    "JMP 0x100b095f"
  ],
  [
    "100b0952",
    "4e",
    "DEC ESI"
  ],
  [
    "100b0953",
    "8b45e4",
    "MOV EAX,dword ptr [EBP + -0x1c]"
  ],
  [
    "100b0956",
    "03c6",
    "ADD EAX,ESI"
  ],
  [
    "100b0958",
    "803820",
    "CMP byte ptr [EAX],0x20"
  ],
  [
    "100b095b",
    "7507",
    "JNZ 0x100b0964"
  ],
  [
    "100b095d",
    "8818",
    "MOV byte ptr [EAX],BL"
  ],
  [
    "100b095f",
    "3bf3",
    "CMP ESI,EBX"
  ],
  [
    "100b0961",
    "77ef",
    "JA 0x100b0952"
  ],
  [
    "100b0963",
    "4e",
    "DEC ESI"
  ],
  [
    "100b0964",
    "6a0e",
    "PUSH 0xe"
  ],
  [
    "100b0966",
    "e827af0000",
    "CALL 0x100bb892"
  ],
  [
    "100b096b",
    "59",
    "POP ECX"
  ],
  [
    "100b096c",
    "895dfc",
    "MOV dword ptr [EBP + -0x4],EBX"
  ],
  [
    "100b096f",
    "395f04",
    "CMP dword ptr [EDI + 0x4],EBX"
  ],
  [
    "100b0972",
    "7559",
    "JNZ 0x100b09cd"
  ],
  [
    "100b0974",
    "6a08",
    "PUSH 0x8"
  ],
  [
    "100b0976",
    "e87ba1ffff",
    "CALL 0x100aaaf6"
  ],
  [
    "100b097b",
    "59",
    "POP ECX"
  ],
  [
    "100b097c",
    "8bd8",
    "MOV EBX,EAX"
  ],
  [
    "100b097e",
    "85db",
    "TEST EBX,EBX"
  ],
  [
    "100b0980",
    "744b",
    "JZ 0x100b09cd"
  ],
  [
    "100b0982",
    "83c602",
    "ADD ESI,0x2"
  ],
  [
    "100b0985",
    "56",
    "PUSH ESI"
  ],
  [
    "100b0986",
    "e86ba1ffff",
    "CALL 0x100aaaf6"
  ],
  [
    "100b098b",
    "59",
    "POP ECX"
  ],
  [
    "100b098c",
    "894704",
    "MOV dword ptr [EDI + 0x4],EAX"
  ],
  [
    "100b098f",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b0991",
    "7433",
    "JZ 0x100b09c6"
  ],
  [
    "100b0993",
    "ff75e4",
    "PUSH dword ptr [EBP + -0x1c]"
  ],
  [
    "100b0996",
    "56",
    "PUSH ESI"
  ],
  [
    "100b0997",
    "50",
    "PUSH EAX"
  ],
  [
    "100b0998",
    "e88c040100",
    "CALL 0x100c0e29"
  ],
  [
    "100b099d",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100b09a0",
    "33c9",
    "XOR ECX,ECX"
  ],
  [
    "100b09a2",
    "3bc1",
    "CMP EAX,ECX"
  ],
  [
    "100b09a4",
    "740d",
    "JZ 0x100b09b3"
  ],
  [
    "100b09a6",
    "51",
    "PUSH ECX"
  ],
  [
    "100b09a7",
    "51",
    "PUSH ECX"
  ],
  [
    "100b09a8",
    "51",
    "PUSH ECX"
  ],
  [
    "100b09a9",
    "51",
    "PUSH ECX"
  ],
  [
    "100b09aa",
    "51",
    "PUSH ECX"
  ],
  [
    "100b09ab",
    "e8eed6ffff",
    "CALL 0x100ae09e"
  ],
  [
    "100b09b3",
    "8b4704",
    "MOV EAX,dword ptr [EDI + 0x4]"
  ],
  [
    "100b09b6",
    "8903",
    "MOV dword ptr [EBX],EAX"
  ],
  [
    "100b09b8",
    "8b450c",
    "MOV EAX,dword ptr [EBP + 0xc]"
  ],
  [
    "100b09bb",
    "8b4804",
    "MOV ECX,dword ptr [EAX + 0x4]"
  ],
  [
    "100b09be",
    "894b04",
    "MOV dword ptr [EBX + 0x4],ECX"
  ],
  [
    "100b09c1",
    "895804",
    "MOV dword ptr [EAX + 0x4],EBX"
  ],
  [
    "100b09c4",
    "eb07",
    "JMP 0x100b09cd"
  ],
  [
    "100b09c6",
    "53",
    "PUSH EBX"
  ],
  [
    "100b09c7",
    "e8d89fffff",
    "CALL 0x100aa9a4"
  ],
  [
    "100b09cc",
    "59",
    "POP ECX"
  ],
  [
    "100b09cd",
    "ff75e4",
    "PUSH dword ptr [EBP + -0x1c]"
  ],
  [
    "100b09d0",
    "e8cf9fffff",
    "CALL 0x100aa9a4"
  ],
  [
    "100b09d5",
    "59",
    "POP ECX"
  ],
  [
    "100b09d6",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100b09dd",
    "e80c000000",
    "CALL 0x100b09ee"
  ],
  [
    "100b09e2",
    "8b4704",
    "MOV EAX,dword ptr [EDI + 0x4]"
  ],
  [
    "100b09e5",
    "e8c3e1ffff",
    "CALL 0x100aebad"
  ],
  [
    "100b09ea",
    "c3",
    "RET"
  ],
  [
    "100c6142",
    "6884000000",
    "PUSH 0x84"
  ],
  [
    "100c6147",
    "68808e0f10",
    "PUSH 0x100f8e80"
  ],
  [
    "100c614c",
    "e8178afeff",
    "CALL 0x100aeb68"
  ],
  [
    "100c6151",
    "8b7d14",
    "MOV EDI,dword ptr [EBP + 0x14]"
  ],
  [
    "100c6154",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100c6156",
    "3bfe",
    "CMP EDI,ESI"
  ],
  [
    "100c6158",
    "7504",
    "JNZ 0x100c615e"
  ],
  [
    "100c615a",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c615c",
    "eb78",
    "JMP 0x100c61d6"
  ],
  [
    "100c615e",
    "6a05",
    "PUSH 0x5"
  ],
  [
    "100c6160",
    "e86a56ffff",
    "CALL 0x100bb7cf"
  ],
  [
    "100c6165",
    "59",
    "POP ECX"
  ],
  [
    "100c6166",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c6168",
    "74f0",
    "JZ 0x100c615a"
  ],
  [
    "100c616a",
    "6a05",
    "PUSH 0x5"
  ],
  [
    "100c616c",
    "e82157ffff",
    "CALL 0x100bb892"
  ],
  [
    "100c6171",
    "59",
    "POP ECX"
  ],
  [
    "100c6172",
    "8975fc",
    "MOV dword ptr [EBP + -0x4],ESI"
  ],
  [
    "100c6175",
    "893d1c6f2f10",
    "MOV dword ptr [0x102f6f1c],EDI"
  ],
  [
    "100c617b",
    "8b4518",
    "MOV EAX,dword ptr [EBP + 0x18]"
  ],
  [
    "100c617e",
    "a3206f2f10",
    "MOV [0x102f6f20],EAX"
  ],
  [
    "100c6183",
    "89352c6f2f10",
    "MOV dword ptr [0x102f6f2c],ESI"
  ],
  [
    "100c6189",
    "8935246f2f10",
    "MOV dword ptr [0x102f6f24],ESI"
  ],
  [
    "100c618f",
    "8935286f2f10",
    "MOV dword ptr [0x102f6f28],ESI"
  ],
  [
    "100c6195",
    "0fb7451c",
    "MOVZX EAX,word ptr [EBP + 0x1c]"
  ],
  [
    "100c6199",
    "50",
    "PUSH EAX"
  ],
  [
    "100c619a",
    "56",
    "PUSH ESI"
  ],
  [
    "100c619b",
    "ff7510",
    "PUSH dword ptr [EBP + 0x10]"
  ],
  [
    "100c619e",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100c61a1",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100c61a4",
    "8d8d6cffffff",
    "LEA ECX,[EBP + 0xffffff6c]"
  ],
  [
    "100c61aa",
    "e8a2c1ffff",
    "CALL 0x100c2351"
  ],
  [
    "100c61af",
    "8d8d6cffffff",
    "LEA ECX,[EBP + 0xffffff6c]"
  ],
  [
    "100c61b5",
    "e8d5fcffff",
    "CALL 0x100c5e8f"
  ],
  [
    "100c61ba",
    "8945e4",
    "MOV dword ptr [EBP + -0x1c],EAX"
  ],
  [
    "100c61bd",
    "b91c6f2f10",
    "MOV ECX,0x102f6f1c"
  ],
  [
    "100c61c2",
    "e816b3ffff",
    "CALL 0x100c14dd"
  ],
  [
    "100c61c7",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100c61ce",
    "e809000000",
    "CALL 0x100c61dc"
  ],
  [
    "100c61d3",
    "8b45e4",
    "MOV EAX,dword ptr [EBP + -0x1c]"
  ],
  [
    "100c61d6",
    "e8d289feff",
    "CALL 0x100aebad"
  ],
  [
    "100c61db",
    "c3",
    "RET"
  ],
  [
    "100bb7cf",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "100bb7d1",
    "68988c0f10",
    "PUSH 0x100f8c98"
  ],
  [
    "100bb7d6",
    "e88d33ffff",
    "CALL 0x100aeb68"
  ],
  [
    "100bb7db",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100bb7dd",
    "47",
    "INC EDI"
  ],
  [
    "100bb7de",
    "897de4",
    "MOV dword ptr [EBP + -0x1c],EDI"
  ],
  [
    "100bb7e1",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100bb7e3",
    "391dc86a2f10",
    "CMP dword ptr [0x102f6ac8],EBX"
  ],
  [
    "100bb7e9",
    "7518",
    "JNZ 0x100bb803"
  ],
  [
    "100bb7eb",
    "e84957ffff",
    "CALL 0x100b0f39"
  ],
  [
    "100bb7f0",
    "6a1e",
    "PUSH 0x1e"
  ],
  [
    "100bb7f2",
    "e88255ffff",
    "CALL 0x100b0d79"
  ],
  [
    "100bb7f7",
    "68ff000000",
    "PUSH 0xff"
  ],
  [
    "100bb7fc",
    "e83decfeff",
    "CALL 0x100aa43e"
  ],
  [
    "100bb801",
    "59",
    "POP ECX"
  ],
  [
    "100bb802",
    "59",
    "POP ECX"
  ],
  [
    "100bb803",
    "8b7508",
    "MOV ESI,dword ptr [EBP + 0x8]"
  ],
  [
    "100bb806",
    "8d34f5b8141410",
    "LEA ESI,[ESI*0x8 + 0x101414b8]"
  ],
  [
    "100bb80d",
    "391e",
    "CMP dword ptr [ESI],EBX"
  ],
  [
    "100bb80f",
    "7404",
    "JZ 0x100bb815"
  ],
  [
    "100bb811",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100bb813",
    "eb6e",
    "JMP 0x100bb883"
  ],
  [
    "100bb815",
    "6a18",
    "PUSH 0x18"
  ],
  [
    "100bb817",
    "e8b436ffff",
    "CALL 0x100aeed0"
  ],
  [
    "100bb81c",
    "59",
    "POP ECX"
  ],
  [
    "100bb81d",
    "8bf8",
    "MOV EDI,EAX"
  ],
  [
    "100bb81f",
    "3bfb",
    "CMP EDI,EBX"
  ],
  [
    "100bb821",
    "750f",
    "JNZ 0x100bb832"
  ],
  [
    "100bb823",
    "e8a935ffff",
    "CALL 0x100aedd1"
  ],
  [
    "100bb828",
    "c7000c000000",
    "MOV dword ptr [EAX],0xc"
  ],
  [
    "100bb82e",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100bb830",
    "eb51",
    "JMP 0x100bb883"
  ],
  [
    "100bb832",
    "6a0a",
    "PUSH 0xa"
  ],
  [
    "100bb834",
    "e859000000",
    "CALL 0x100bb892"
  ],
  [
    "100bb839",
    "59",
    "POP ECX"
  ],
  [
    "100bb83a",
    "895dfc",
    "MOV dword ptr [EBP + -0x4],EBX"
  ],
  [
    "100bb83d",
    "391e",
    "CMP dword ptr [ESI],EBX"
  ],
  [
    "100bb83f",
    "752c",
    "JNZ 0x100bb86d"
  ],
  [
    "100bb841",
    "68a00f0000",
    "PUSH 0xfa0"
  ],
  [
    "100bb846",
    "57",
    "PUSH EDI"
  ],
  [
    "100bb847",
    "e8db060000",
    "CALL 0x100bbf27"
  ],
  [
    "100bb84c",
    "59",
    "POP ECX"
  ],
  [
    "100bb84d",
    "59",
    "POP ECX"
  ],
  [
    "100bb84e",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100bb850",
    "7517",
    "JNZ 0x100bb869"
  ],
  [
    "100bb852",
    "57",
    "PUSH EDI"
  ],
  [
    "100bb853",
    "e84cf1feff",
    "CALL 0x100aa9a4"
  ],
  [
    "100bb858",
    "59",
    "POP ECX"
  ],
  [
    "100bb859",
    "e87335ffff",
    "CALL 0x100aedd1"
  ],
  [
    "100bb85e",
    "c7000c000000",
    "MOV dword ptr [EAX],0xc"
  ],
  [
    "100bb864",
    "895de4",
    "MOV dword ptr [EBP + -0x1c],EBX"
  ],
  [
    "100bb867",
    "eb0b",
    "JMP 0x100bb874"
  ],
  [
    "100bb869",
    "893e",
    "MOV dword ptr [ESI],EDI"
  ],
  [
    "100bb86b",
    "eb07",
    "JMP 0x100bb874"
  ],
  [
    "100bb86d",
    "57",
    "PUSH EDI"
  ],
  [
    "100bb86e",
    "e831f1feff",
    "CALL 0x100aa9a4"
  ],
  [
    "100bb873",
    "59",
    "POP ECX"
  ],
  [
    "100bb874",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100bb87b",
    "e809000000",
    "CALL 0x100bb889"
  ],
  [
    "100bb880",
    "8b45e4",
    "MOV EAX,dword ptr [EBP + -0x1c]"
  ],
  [
    "100bb883",
    "e82533ffff",
    "CALL 0x100aebad"
  ],
  [
    "100bb888",
    "c3",
    "RET"
  ],
  [
    "100aeed0",
    "56",
    "PUSH ESI"
  ],
  [
    "100aeed1",
    "57",
    "PUSH EDI"
  ],
  [
    "100aeed2",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100aeed4",
    "ff74240c",
    "PUSH dword ptr [ESP + 0xc]"
  ],
  [
    "100aeed8",
    "e819bcffff",
    "CALL 0x100aaaf6"
  ],
  [
    "100aeedd",
    "8bf8",
    "MOV EDI,EAX"
  ],
  [
    "100aeedf",
    "85ff",
    "TEST EDI,EDI"
  ],
  [
    "100aeee1",
    "59",
    "POP ECX"
  ],
  [
    "100aeee2",
    "7527",
    "JNZ 0x100aef0b"
  ],
  [
    "100aeee4",
    "3905b4642f10",
    "CMP dword ptr [0x102f64b4],EAX"
  ],
  [
    "100aeeea",
    "761f",
    "JBE 0x100aef0b"
  ],
  [
    "100aeeec",
    "56",
    "PUSH ESI"
  ],
  [
    "100aeeed",
    "ff15e4952f10",
    "CALL dword ptr [0x102f95e4]"
  ],
  [
    "100aeef3",
    "8d86e8030000",
    "LEA EAX,[ESI + 0x3e8]"
  ],
  [
    "100aeef9",
    "3b05b4642f10",
    "CMP EAX,dword ptr [0x102f64b4]"
  ],
  [
    "100aeeff",
    "7603",
    "JBE 0x100aef04"
  ],
  [
    "100aef01",
    "83c8ff",
    "OR EAX,0xffffffff"
  ],
  [
    "100aef04",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100aef07",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100aef09",
    "75c9",
    "JNZ 0x100aeed4"
  ],
  [
    "100aef0b",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100aef0d",
    "5f",
    "POP EDI"
  ],
  [
    "100aef0e",
    "5e",
    "POP ESI"
  ],
  [
    "100aef0f",
    "c3",
    "RET"
  ],
  [
    "100bb892",
    "55",
    "PUSH EBP"
  ],
  [
    "100bb893",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100bb895",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100bb898",
    "56",
    "PUSH ESI"
  ],
  [
    "100bb899",
    "8d34c5b8141410",
    "LEA ESI,[EAX*0x8 + 0x101414b8]"
  ],
  [
    "100bb8a0",
    "833e00",
    "CMP dword ptr [ESI],0x0"
  ],
  [
    "100bb8a3",
    "7513",
    "JNZ 0x100bb8b8"
  ],
  [
    "100bb8a5",
    "50",
    "PUSH EAX"
  ],
  [
    "100bb8a6",
    "e824ffffff",
    "CALL 0x100bb7cf"
  ],
  [
    "100bb8ab",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100bb8ad",
    "59",
    "POP ECX"
  ],
  [
    "100bb8ae",
    "7508",
    "JNZ 0x100bb8b8"
  ],
  [
    "100bb8b0",
    "6a11",
    "PUSH 0x11"
  ],
  [
    "100bb8b2",
    "e83debfeff",
    "CALL 0x100aa3f4"
  ],
  [
    "100bb8b7",
    "59",
    "POP ECX"
  ],
  [
    "100bb8b8",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100bb8ba",
    "ff1504962f10",
    "CALL dword ptr [0x102f9604]"
  ],
  [
    "100bb8c0",
    "5e",
    "POP ESI"
  ],
  [
    "100bb8c1",
    "5d",
    "POP EBP"
  ],
  [
    "100bb8c2",
    "c3",
    "RET"
  ],
  [
    "100bb7a2",
    "55",
    "PUSH EBP"
  ],
  [
    "100bb7a3",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100bb7a5",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100bb7a8",
    "ff34c5b8141410",
    "PUSH dword ptr [EAX*0x8 + 0x101414b8]"
  ],
  [
    "100bb7af",
    "ff1508962f10",
    "CALL dword ptr [0x102f9608]"
  ],
  [
    "100bb7b5",
    "5d",
    "POP EBP"
  ],
  [
    "100bb7b6",
    "c3",
    "RET"
  ],
  [
    "100bb889",
    "6a0a",
    "PUSH 0xa"
  ],
  [
    "100bb88b",
    "e812ffffff",
    "CALL 0x100bb7a2"
  ],
  [
    "100bb890",
    "59",
    "POP ECX"
  ],
  [
    "100bb891",
    "c3",
    "RET"
  ],
  [
    "100c0e29",
    "8b4c2404",
    "MOV ECX,dword ptr [ESP + 0x4]"
  ],
  [
    "100c0e2d",
    "53",
    "PUSH EBX"
  ],
  [
    "100c0e2e",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100c0e30",
    "3bcb",
    "CMP ECX,EBX"
  ],
  [
    "100c0e32",
    "56",
    "PUSH ESI"
  ],
  [
    "100c0e33",
    "57",
    "PUSH EDI"
  ],
  [
    "100c0e34",
    "7408",
    "JZ 0x100c0e3e"
  ],
  [
    "100c0e36",
    "8b7c2414",
    "MOV EDI,dword ptr [ESP + 0x14]"
  ],
  [
    "100c0e3a",
    "3bfb",
    "CMP EDI,EBX"
  ],
  [
    "100c0e3c",
    "771b",
    "JA 0x100c0e59"
  ],
  [
    "100c0e3e",
    "e88edffeff",
    "CALL 0x100aedd1"
  ],
  [
    "100c0e43",
    "6a16",
    "PUSH 0x16"
  ],
  [
    "100c0e45",
    "5e",
    "POP ESI"
  ],
  [
    "100c0e46",
    "8930",
    "MOV dword ptr [EAX],ESI"
  ],
  [
    "100c0e48",
    "53",
    "PUSH EBX"
  ],
  [
    "100c0e49",
    "53",
    "PUSH EBX"
  ],
  [
    "100c0e4a",
    "53",
    "PUSH EBX"
  ],
  [
    "100c0e4b",
    "53",
    "PUSH EBX"
  ],
  [
    "100c0e4c",
    "53",
    "PUSH EBX"
  ],
  [
    "100c0e4d",
    "e880d3feff",
    "CALL 0x100ae1d2"
  ],
  [
    "100c0e52",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100c0e55",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100c0e57",
    "eb31",
    "JMP 0x100c0e8a"
  ],
  [
    "100c0e59",
    "8b742418",
    "MOV ESI,dword ptr [ESP + 0x18]"
  ],
  [
    "100c0e5d",
    "3bf3",
    "CMP ESI,EBX"
  ],
  [
    "100c0e5f",
    "7504",
    "JNZ 0x100c0e65"
  ],
  [
    "100c0e61",
    "8819",
    "MOV byte ptr [ECX],BL"
  ],
  [
    "100c0e63",
    "ebd9",
    "JMP 0x100c0e3e"
  ],
  [
    "100c0e65",
    "8bd1",
    "MOV EDX,ECX"
  ],
  [
    "100c0e67",
    "8a06",
    "MOV AL,byte ptr [ESI]"
  ],
  [
    "100c0e69",
    "8802",
    "MOV byte ptr [EDX],AL"
  ],
  [
    "100c0e6b",
    "42",
    "INC EDX"
  ],
  [
    "100c0e6c",
    "46",
    "INC ESI"
  ],
  [
    "100c0e6d",
    "3ac3",
    "CMP AL,BL"
  ],
  [
    "100c0e6f",
    "7403",
    "JZ 0x100c0e74"
  ],
  [
    "100c0e71",
    "4f",
    "DEC EDI"
  ],
  [
    "100c0e72",
    "75f3",
    "JNZ 0x100c0e67"
  ],
  [
    "100c0e74",
    "3bfb",
    "CMP EDI,EBX"
  ],
  [
    "100c0e76",
    "7510",
    "JNZ 0x100c0e88"
  ],
  [
    "100c0e78",
    "8819",
    "MOV byte ptr [ECX],BL"
  ],
  [
    "100c0e7a",
    "e852dffeff",
    "CALL 0x100aedd1"
  ],
  [
    "100c0e7f",
    "6a22",
    "PUSH 0x22"
  ],
  [
    "100c0e81",
    "59",
    "POP ECX"
  ],
  [
    "100c0e82",
    "8908",
    "MOV dword ptr [EAX],ECX"
  ],
  [
    "100c0e84",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100c0e86",
    "ebc0",
    "JMP 0x100c0e48"
  ],
  [
    "100c0e88",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c0e8a",
    "5f",
    "POP EDI"
  ],
  [
    "100c0e8b",
    "5e",
    "POP ESI"
  ],
  [
    "100c0e8c",
    "5b",
    "POP EBX"
  ],
  [
    "100c0e8d",
    "c3",
    "RET"
  ],
  [
    "100b09ee",
    "6a0e",
    "PUSH 0xe"
  ],
  [
    "100b09f0",
    "e8adad0000",
    "CALL 0x100bb7a2"
  ],
  [
    "100b09f5",
    "59",
    "POP ECX"
  ],
  [
    "100b09f6",
    "c3",
    "RET"
  ],
  [
    "100b2a80",
    "8b4c2404",
    "MOV ECX,dword ptr [ESP + 0x4]"
  ],
  [
    "100b2a84",
    "f7c103000000",
    "TEST ECX,0x3"
  ],
  [
    "100b2a8a",
    "7424",
    "JZ 0x100b2ab0"
  ],
  [
    "100b2a8c",
    "8a01",
    "MOV AL,byte ptr [ECX]"
  ],
  [
    "100b2a8e",
    "83c101",
    "ADD ECX,0x1"
  ],
  [
    "100b2a91",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100b2a93",
    "744e",
    "JZ 0x100b2ae3"
  ],
  [
    "100b2a95",
    "f7c103000000",
    "TEST ECX,0x3"
  ],
  [
    "100b2a9b",
    "75ef",
    "JNZ 0x100b2a8c"
  ],
  [
    "100b2a9d",
    "0500000000",
    "ADD EAX,0x0"
  ],
  [
    "100b2aa2",
    "8da42400000000",
    "LEA ESP,[ESP]"
  ],
  [
    "100b2aa9",
    "8da42400000000",
    "LEA ESP,[ESP]"
  ],
  [
    "100b2ab0",
    "8b01",
    "MOV EAX,dword ptr [ECX]"
  ],
  [
    "100b2ab2",
    "bafffefe7e",
    "MOV EDX,0x7efefeff"
  ],
  [
    "100b2ab7",
    "03d0",
    "ADD EDX,EAX"
  ],
  [
    "100b2ab9",
    "83f0ff",
    "XOR EAX,0xffffffff"
  ],
  [
    "100b2abc",
    "33c2",
    "XOR EAX,EDX"
  ],
  [
    "100b2abe",
    "83c104",
    "ADD ECX,0x4"
  ],
  [
    "100b2ac1",
    "a900010181",
    "TEST EAX,0x81010100"
  ],
  [
    "100b2ac6",
    "74e8",
    "JZ 0x100b2ab0"
  ],
  [
    "100b2ac8",
    "8b41fc",
    "MOV EAX,dword ptr [ECX + -0x4]"
  ],
  [
    "100b2acb",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100b2acd",
    "7432",
    "JZ 0x100b2b01"
  ],
  [
    "100b2acf",
    "84e4",
    "TEST AH,AH"
  ],
  [
    "100b2ad1",
    "7424",
    "JZ 0x100b2af7"
  ],
  [
    "100b2ad3",
    "a90000ff00",
    "TEST EAX,0xff0000"
  ],
  [
    "100b2ad8",
    "7413",
    "JZ 0x100b2aed"
  ],
  [
    "100b2ada",
    "a9000000ff",
    "TEST EAX,0xff000000"
  ],
  [
    "100b2adf",
    "7402",
    "JZ 0x100b2ae3"
  ],
  [
    "100b2ae1",
    "ebcd",
    "JMP 0x100b2ab0"
  ],
  [
    "100b2ae3",
    "8d41ff",
    "LEA EAX,[ECX + -0x1]"
  ],
  [
    "100b2ae6",
    "8b4c2404",
    "MOV ECX,dword ptr [ESP + 0x4]"
  ],
  [
    "100b2aea",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100b2aec",
    "c3",
    "RET"
  ],
  [
    "100b2aed",
    "8d41fe",
    "LEA EAX,[ECX + -0x2]"
  ],
  [
    "100b2af0",
    "8b4c2404",
    "MOV ECX,dword ptr [ESP + 0x4]"
  ],
  [
    "100b2af4",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100b2af6",
    "c3",
    "RET"
  ],
  [
    "100b2af7",
    "8d41fd",
    "LEA EAX,[ECX + -0x3]"
  ],
  [
    "100b2afa",
    "8b4c2404",
    "MOV ECX,dword ptr [ESP + 0x4]"
  ],
  [
    "100b2afe",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100b2b00",
    "c3",
    "RET"
  ],
  [
    "100b2b01",
    "8d41fc",
    "LEA EAX,[ECX + -0x4]"
  ],
  [
    "100b2b04",
    "8b4c2404",
    "MOV ECX,dword ptr [ESP + 0x4]"
  ],
  [
    "100b2b08",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100b2b0a",
    "c3",
    "RET"
  ],
  [
    "100c14dd",
    "56",
    "PUSH ESI"
  ],
  [
    "100c14de",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100c14e0",
    "837e0400",
    "CMP dword ptr [ESI + 0x4],0x0"
  ],
  [
    "100c14e4",
    "741b",
    "JZ 0x100c1501"
  ],
  [
    "100c14e6",
    "eb0f",
    "JMP 0x100c14f7"
  ],
  [
    "100c14e8",
    "8b460c",
    "MOV EAX,dword ptr [ESI + 0xc]"
  ],
  [
    "100c14eb",
    "8b00",
    "MOV EAX,dword ptr [EAX]"
  ],
  [
    "100c14ed",
    "ff760c",
    "PUSH dword ptr [ESI + 0xc]"
  ],
  [
    "100c14f0",
    "894608",
    "MOV dword ptr [ESI + 0x8],EAX"
  ],
  [
    "100c14f3",
    "ff5604",
    "CALL dword ptr [ESI + 0x4]"
  ],
  [
    "100c14f6",
    "59",
    "POP ECX"
  ],
  [
    "100c14f7",
    "8b4608",
    "MOV EAX,dword ptr [ESI + 0x8]"
  ],
  [
    "100c14fa",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c14fc",
    "89460c",
    "MOV dword ptr [ESI + 0xc],EAX"
  ],
  [
    "100c14ff",
    "75e7",
    "JNZ 0x100c14e8"
  ],
  [
    "100c1501",
    "5e",
    "POP ESI"
  ],
  [
    "100c1502",
    "c3",
    "RET"
  ],
  [
    "100c61dc",
    "6a05",
    "PUSH 0x5"
  ],
  [
    "100c61de",
    "e8bf55ffff",
    "CALL 0x100bb7a2"
  ],
  [
    "100c61e3",
    "59",
    "POP ECX"
  ],
  [
    "100c61e4",
    "c3",
    "RET"
  ],
  [
    "100aa9a4",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "100aa9a6",
    "6870860f10",
    "PUSH 0x100f8670"
  ],
  [
    "100aa9ab",
    "e8b8410000",
    "CALL 0x100aeb68"
  ],
  [
    "100aa9b0",
    "8b7508",
    "MOV ESI,dword ptr [EBP + 0x8]"
  ],
  [
    "100aa9b3",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "100aa9b5",
    "7475",
    "JZ 0x100aaa2c"
  ],
  [
    "100aa9b7",
    "833d30852f1003",
    "CMP dword ptr [0x102f8530],0x3"
  ],
  [
    "100aa9be",
    "7543",
    "JNZ 0x100aaa03"
  ],
  [
    "100aa9c0",
    "6a04",
    "PUSH 0x4"
  ],
  [
    "100aa9c2",
    "e8cb0e0100",
    "CALL 0x100bb892"
  ],
  [
    "100aa9c7",
    "59",
    "POP ECX"
  ],
  [
    "100aa9c8",
    "8365fc00",
    "AND dword ptr [EBP + -0x4],0x0"
  ],
  [
    "100aa9cc",
    "56",
    "PUSH ESI"
  ],
  [
    "100aa9cd",
    "e8a7180100",
    "CALL 0x100bc279"
  ],
  [
    "100aa9d2",
    "59",
    "POP ECX"
  ],
  [
    "100aa9d3",
    "8945e4",
    "MOV dword ptr [EBP + -0x1c],EAX"
  ],
  [
    "100aa9d6",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100aa9d8",
    "7409",
    "JZ 0x100aa9e3"
  ],
  [
    "100aa9da",
    "56",
    "PUSH ESI"
  ],
  [
    "100aa9db",
    "50",
    "PUSH EAX"
  ],
  [
    "100aa9dc",
    "e8c3180100",
    "CALL 0x100bc2a4"
  ],
  [
    "100aa9e1",
    "59",
    "POP ECX"
  ],
  [
    "100aa9e2",
    "59",
    "POP ECX"
  ],
  [
    "100aa9e3",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100aa9ea",
    "e80b000000",
    "CALL 0x100aa9fa"
  ],
  [
    "100aa9ef",
    "837de400",
    "CMP dword ptr [EBP + -0x1c],0x0"
  ],
  [
    "100aa9f3",
    "7537",
    "JNZ 0x100aaa2c"
  ],
  [
    "100aa9f5",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100aa9f8",
    "eb0a",
    "JMP 0x100aaa04"
  ],
  [
    "100aaa03",
    "56",
    "PUSH ESI"
  ],
  [
    "100aaa04",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100aaa06",
    "ff35c86a2f10",
    "PUSH dword ptr [0x102f6ac8]"
  ],
  [
    "100aaa0c",
    "ff1574962f10",
    "CALL dword ptr [0x102f9674]"
  ],
  [
    "100aaa12",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100aaa14",
    "7516",
    "JNZ 0x100aaa2c"
  ],
  [
    "100aaa16",
    "e8b6430000",
    "CALL 0x100aedd1"
  ],
  [
    "100aaa1b",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100aaa1d",
    "ff1580972f10",
    "CALL dword ptr [0x102f9780]"
  ],
  [
    "100aaa23",
    "50",
    "PUSH EAX"
  ],
  [
    "100aaa24",
    "e86d430000",
    "CALL 0x100aed96"
  ],
  [
    "100aaa29",
    "8906",
    "MOV dword ptr [ESI],EAX"
  ],
  [
    "100aaa2b",
    "59",
    "POP ECX"
  ],
  [
    "100aaa2c",
    "e87c410000",
    "CALL 0x100aebad"
  ],
  [
    "100aaa31",
    "c3",
    "RET"
  ],
  [
    "100c2048",
    "55",
    "PUSH EBP"
  ],
  [
    "100c2049",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100c204b",
    "56",
    "PUSH ESI"
  ],
  [
    "100c204c",
    "57",
    "PUSH EDI"
  ],
  [
    "100c204d",
    "8bf9",
    "MOV EDI,ECX"
  ],
  [
    "100c204f",
    "e84cffffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c2054",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c2056",
    "756c",
    "JNZ 0x100c20c4"
  ],
  [
    "100c2058",
    "394508",
    "CMP dword ptr [EBP + 0x8],EAX"
  ],
  [
    "100c205b",
    "751e",
    "JNZ 0x100c207b"
  ],
  [
    "100c205d",
    "e889ffffff",
    "CALL 0x100c1feb"
  ],
  [
    "100c2062",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100c2064",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100c2066",
    "46",
    "INC ESI"
  ],
  [
    "100c2067",
    "56",
    "PUSH ESI"
  ],
  [
    "100c2068",
    "b91c6f2f10",
    "MOV ECX,0x102f6f1c"
  ],
  [
    "100c206d",
    "e855faffff",
    "CALL 0x100c1ac7"
  ],
  [
    "100c2072",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c2074",
    "894508",
    "MOV dword ptr [EBP + 0x8],EAX"
  ],
  [
    "100c2077",
    "7457",
    "JZ 0x100c20d0"
  ],
  [
    "100c2079",
    "eb03",
    "JMP 0x100c207e"
  ],
  [
    "100c207b",
    "8b750c",
    "MOV ESI,dword ptr [EBP + 0xc]"
  ],
  [
    "100c207e",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c2081",
    "53",
    "PUSH EBX"
  ],
  [
    "100c2082",
    "8bde",
    "MOV EBX,ESI"
  ],
  [
    "100c2084",
    "8b37",
    "MOV ESI,dword ptr [EDI]"
  ],
  [
    "100c2086",
    "89450c",
    "MOV dword ptr [EBP + 0xc],EAX"
  ],
  [
    "100c2089",
    "eb2f",
    "JMP 0x100c20ba"
  ],
  [
    "100c208b",
    "85db",
    "TEST EBX,EBX"
  ],
  [
    "100c208d",
    "7e2f",
    "JLE 0x100c20be"
  ],
  [
    "100c208f",
    "8b06",
    "MOV EAX,dword ptr [ESI]"
  ],
  [
    "100c2091",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c2093",
    "ff10",
    "CALL dword ptr [EAX]"
  ],
  [
    "100c2095",
    "8bf8",
    "MOV EDI,EAX"
  ],
  [
    "100c2097",
    "85ff",
    "TEST EDI,EDI"
  ],
  [
    "100c2099",
    "741c",
    "JZ 0x100c20b7"
  ],
  [
    "100c209b",
    "8bc3",
    "MOV EAX,EBX"
  ],
  [
    "100c209d",
    "2bc7",
    "SUB EAX,EDI"
  ],
  [
    "100c209f",
    "7902",
    "JNS 0x100c20a3"
  ],
  [
    "100c20a1",
    "8bfb",
    "MOV EDI,EBX"
  ],
  [
    "100c20a3",
    "8b06",
    "MOV EAX,dword ptr [ESI]"
  ],
  [
    "100c20a5",
    "57",
    "PUSH EDI"
  ],
  [
    "100c20a6",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100c20a9",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c20ab",
    "ff5008",
    "CALL dword ptr [EAX + 0x8]"
  ],
  [
    "100c20ae",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c20b0",
    "7405",
    "JZ 0x100c20b7"
  ],
  [
    "100c20b2",
    "2bdf",
    "SUB EBX,EDI"
  ],
  [
    "100c20b4",
    "017d0c",
    "ADD dword ptr [EBP + 0xc],EDI"
  ],
  [
    "100c20b7",
    "8b7604",
    "MOV ESI,dword ptr [ESI + 0x4]"
  ],
  [
    "100c20ba",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "100c20bc",
    "75cd",
    "JNZ 0x100c208b"
  ],
  [
    "100c20be",
    "8b450c",
    "MOV EAX,dword ptr [EBP + 0xc]"
  ],
  [
    "100c20c1",
    "5b",
    "POP EBX"
  ],
  [
    "100c20c2",
    "eb09",
    "JMP 0x100c20cd"
  ],
  [
    "100c20c4",
    "837d0800",
    "CMP dword ptr [EBP + 0x8],0x0"
  ],
  [
    "100c20c8",
    "7406",
    "JZ 0x100c20d0"
  ],
  [
    "100c20ca",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c20cd",
    "c60000",
    "MOV byte ptr [EAX],0x0"
  ],
  [
    "100c20d0",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c20d3",
    "5f",
    "POP EDI"
  ],
  [
    "100c20d4",
    "5e",
    "POP ESI"
  ],
  [
    "100c20d5",
    "5d",
    "POP EBP"
  ],
  [
    "100c20d6",
    "c20800",
    "RET 0x8"
  ],
  [
    "100c2301",
    "8b4908",
    "MOV ECX,dword ptr [ECX + 0x8]"
  ],
  [
    "100c2304",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c2306",
    "3bc8",
    "CMP ECX,EAX"
  ],
  [
    "100c2308",
    "7411",
    "JZ 0x100c231b"
  ],
  [
    "100c230a",
    "39442404",
    "CMP dword ptr [ESP + 0x4],EAX"
  ],
  [
    "100c230e",
    "740b",
    "JZ 0x100c231b"
  ],
  [
    "100c2310",
    "39442408",
    "CMP dword ptr [ESP + 0x8],EAX"
  ],
  [
    "100c2314",
    "7405",
    "JZ 0x100c231b"
  ],
  [
    "100c2316",
    "e92dfdffff",
    "JMP 0x100c2048"
  ],
  [
    "100c231b",
    "c20800",
    "RET 0x8"
  ],
  [
    "100c22b2",
    "8b410c",
    "MOV EAX,dword ptr [ECX + 0xc]"
  ],
  [
    "100c22b5",
    "8b542408",
    "MOV EDX,dword ptr [ESP + 0x8]"
  ],
  [
    "100c22b9",
    "3bd0",
    "CMP EDX,EAX"
  ],
  [
    "100c22bb",
    "7e02",
    "JLE 0x100c22bf"
  ],
  [
    "100c22bd",
    "8bd0",
    "MOV EDX,EAX"
  ],
  [
    "100c22bf",
    "8b4908",
    "MOV ECX,dword ptr [ECX + 0x8]"
  ],
  [
    "100c22c2",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c22c4",
    "3bc8",
    "CMP ECX,EAX"
  ],
  [
    "100c22c6",
    "7418",
    "JZ 0x100c22e0"
  ],
  [
    "100c22c8",
    "39442404",
    "CMP dword ptr [ESP + 0x4],EAX"
  ],
  [
    "100c22cc",
    "7412",
    "JZ 0x100c22e0"
  ],
  [
    "100c22ce",
    "3bd0",
    "CMP EDX,EAX"
  ],
  [
    "100c22d0",
    "740e",
    "JZ 0x100c22e0"
  ],
  [
    "100c22d2",
    "52",
    "PUSH EDX"
  ],
  [
    "100c22d3",
    "ff742408",
    "PUSH dword ptr [ESP + 0x8]"
  ],
  [
    "100c22d7",
    "8bd1",
    "MOV EDX,ECX"
  ],
  [
    "100c22d9",
    "e835fbffff",
    "CALL 0x100c1e13"
  ],
  [
    "100c22de",
    "59",
    "POP ECX"
  ],
  [
    "100c22df",
    "59",
    "POP ECX"
  ],
  [
    "100c22e0",
    "c20800",
    "RET 0x8"
  ],
  [
    "100c1feb",
    "57",
    "PUSH EDI"
  ],
  [
    "100c1fec",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100c1fee",
    "e8adffffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c1ff3",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c1ff5",
    "7515",
    "JNZ 0x100c200c"
  ],
  [
    "100c1ff7",
    "56",
    "PUSH ESI"
  ],
  [
    "100c1ff8",
    "8b31",
    "MOV ESI,dword ptr [ECX]"
  ],
  [
    "100c1ffa",
    "eb0b",
    "JMP 0x100c2007"
  ],
  [
    "100c1ffc",
    "8b06",
    "MOV EAX,dword ptr [ESI]"
  ],
  [
    "100c1ffe",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c2000",
    "ff10",
    "CALL dword ptr [EAX]"
  ],
  [
    "100c2002",
    "8b7604",
    "MOV ESI,dword ptr [ESI + 0x4]"
  ],
  [
    "100c2005",
    "03f8",
    "ADD EDI,EAX"
  ],
  [
    "100c2007",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "100c2009",
    "75f1",
    "JNZ 0x100c1ffc"
  ],
  [
    "100c200b",
    "5e",
    "POP ESI"
  ],
  [
    "100c200c",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100c200e",
    "5f",
    "POP EDI"
  ],
  [
    "100c200f",
    "c3",
    "RET"
  ],
  [
    "100c22e3",
    "8b4908",
    "MOV ECX,dword ptr [ECX + 0x8]"
  ],
  [
    "100c22e6",
    "85c9",
    "TEST ECX,ECX"
  ],
  [
    "100c22e8",
    "7405",
    "JZ 0x100c22ef"
  ],
  [
    "100c22ea",
    "e9fcfcffff",
    "JMP 0x100c1feb"
  ],
  [
    "100c22ef",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c22f1",
    "c3",
    "RET"
  ],
  [
    "100c1d9c",
    "8b410c",
    "MOV EAX,dword ptr [ECX + 0xc]"
  ],
  [
    "100c1d9f",
    "c3",
    "RET"
  ],
  [
    "100c27dd",
    "56",
    "PUSH ESI"
  ],
  [
    "100c27de",
    "57",
    "PUSH EDI"
  ],
  [
    "100c27df",
    "8b7c240c",
    "MOV EDI,dword ptr [ESP + 0xc]"
  ],
  [
    "100c27e3",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100c27e5",
    "8bcf",
    "MOV ECX,EDI"
  ],
  [
    "100c27e7",
    "e8b4f7ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c27ec",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c27ee",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c27f0",
    "7411",
    "JZ 0x100c2803"
  ],
  [
    "100c27f2",
    "8b4704",
    "MOV EAX,dword ptr [EDI + 0x4]"
  ],
  [
    "100c27f5",
    "c1e01c",
    "SHL EAX,0x1c"
  ],
  [
    "100c27f8",
    "c1f81c",
    "SAR EAX,0x1c"
  ],
  [
    "100c27fb",
    "50",
    "PUSH EAX"
  ],
  [
    "100c27fc",
    "e801fcffff",
    "CALL 0x100c2402"
  ],
  [
    "100c2801",
    "eb35",
    "JMP 0x100c2838"
  ],
  [
    "100c2803",
    "e898f7ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c2808",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c280a",
    "7408",
    "JZ 0x100c2814"
  ],
  [
    "100c280c",
    "57",
    "PUSH EDI"
  ],
  [
    "100c280d",
    "e86ef4ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c2812",
    "eb24",
    "JMP 0x100c2838"
  ],
  [
    "100c2814",
    "8b0e",
    "MOV ECX,dword ptr [ESI]"
  ],
  [
    "100c2816",
    "e8d9f9ffff",
    "CALL 0x100c21f4"
  ],
  [
    "100c281b",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c281d",
    "8906",
    "MOV dword ptr [ESI],EAX"
  ],
  [
    "100c281f",
    "740b",
    "JZ 0x100c282c"
  ],
  [
    "100c2821",
    "ff37",
    "PUSH dword ptr [EDI]"
  ],
  [
    "100c2823",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c2825",
    "e810f5ffff",
    "CALL 0x100c1d3a"
  ],
  [
    "100c282a",
    "eb0c",
    "JMP 0x100c2838"
  ],
  [
    "100c282c",
    "8b4604",
    "MOV EAX,dword ptr [ESI + 0x4]"
  ],
  [
    "100c282f",
    "83e0f3",
    "AND EAX,0xfffffff3"
  ],
  [
    "100c2832",
    "83c803",
    "OR EAX,0x3"
  ],
  [
    "100c2835",
    "894604",
    "MOV dword ptr [ESI + 0x4],EAX"
  ],
  [
    "100c2838",
    "5f",
    "POP EDI"
  ],
  [
    "100c2839",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100c283b",
    "5e",
    "POP ESI"
  ],
  [
    "100c283c",
    "c20400",
    "RET 0x4"
  ],
  [
    "100c21f4",
    "53",
    "PUSH EBX"
  ],
  [
    "100c21f5",
    "56",
    "PUSH ESI"
  ],
  [
    "100c21f6",
    "57",
    "PUSH EDI"
  ],
  [
    "100c21f7",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100c21f9",
    "8bf9",
    "MOV EDI,ECX"
  ],
  [
    "100c21fb",
    "be1c6f2f10",
    "MOV ESI,0x102f6f1c"
  ],
  [
    "100c2200",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "100c2202",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c2204",
    "e8bef8ffff",
    "CALL 0x100c1ac7"
  ],
  [
    "100c2209",
    "8bd8",
    "MOV EBX,EAX"
  ],
  [
    "100c220b",
    "85db",
    "TEST EBX,EBX"
  ],
  [
    "100c220d",
    "7426",
    "JZ 0x100c2235"
  ],
  [
    "100c220f",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100c2211",
    "6a08",
    "PUSH 0x8"
  ],
  [
    "100c2213",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c2215",
    "e8adf8ffff",
    "CALL 0x100c1ac7"
  ],
  [
    "100c221a",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c221c",
    "740b",
    "JZ 0x100c2229"
  ],
  [
    "100c221e",
    "81600400f0ffff",
    "AND dword ptr [EAX + 0x4],0xfffff000"
  ],
  [
    "100c2225",
    "8938",
    "MOV dword ptr [EAX],EDI"
  ],
  [
    "100c2227",
    "eb02",
    "JMP 0x100c222b"
  ],
  [
    "100c2229",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c222b",
    "50",
    "PUSH EAX"
  ],
  [
    "100c222c",
    "8bcb",
    "MOV ECX,EBX"
  ],
  [
    "100c222e",
    "e86dfbffff",
    "CALL 0x100c1da0"
  ],
  [
    "100c2233",
    "eb02",
    "JMP 0x100c2237"
  ],
  [
    "100c2235",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c2237",
    "5f",
    "POP EDI"
  ],
  [
    "100c2238",
    "5e",
    "POP ESI"
  ],
  [
    "100c2239",
    "5b",
    "POP EBX"
  ],
  [
    "100c223a",
    "c3",
    "RET"
  ],
  [
    "100c1d3a",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "100c1d3c",
    "8b4c2404",
    "MOV ECX,dword ptr [ESP + 0x4]"
  ],
  [
    "100c1d40",
    "85c9",
    "TEST ECX,ECX"
  ],
  [
    "100c1d42",
    "741c",
    "JZ 0x100c1d60"
  ],
  [
    "100c1d44",
    "8b5004",
    "MOV EDX,dword ptr [EAX + 0x4]"
  ],
  [
    "100c1d47",
    "85d2",
    "TEST EDX,EDX"
  ],
  [
    "100c1d49",
    "7412",
    "JZ 0x100c1d5d"
  ],
  [
    "100c1d4b",
    "56",
    "PUSH ESI"
  ],
  [
    "100c1d4c",
    "eb02",
    "JMP 0x100c1d50"
  ],
  [
    "100c1d4e",
    "8bd6",
    "MOV EDX,ESI"
  ],
  [
    "100c1d50",
    "8b7204",
    "MOV ESI,dword ptr [EDX + 0x4]"
  ],
  [
    "100c1d53",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "100c1d55",
    "75f7",
    "JNZ 0x100c1d4e"
  ],
  [
    "100c1d57",
    "894a04",
    "MOV dword ptr [EDX + 0x4],ECX"
  ],
  [
    "100c1d5a",
    "5e",
    "POP ESI"
  ],
  [
    "100c1d5b",
    "eb03",
    "JMP 0x100c1d60"
  ],
  [
    "100c1d5d",
    "894804",
    "MOV dword ptr [EAX + 0x4],ECX"
  ],
  [
    "100c1d60",
    "c20400",
    "RET 0x4"
  ],
  [
    "100c1da0",
    "8b542404",
    "MOV EDX,dword ptr [ESP + 0x4]"
  ],
  [
    "100c1da4",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "100c1da6",
    "83600400",
    "AND dword ptr [EAX + 0x4],0x0"
  ],
  [
    "100c1daa",
    "85d2",
    "TEST EDX,EDX"
  ],
  [
    "100c1dac",
    "c7009c290f10",
    "MOV dword ptr [EAX],0x100f299c"
  ],
  [
    "100c1db2",
    "7415",
    "JZ 0x100c1dc9"
  ],
  [
    "100c1db4",
    "8b4a04",
    "MOV ECX,dword ptr [EDX + 0x4]"
  ],
  [
    "100c1db7",
    "c1e11c",
    "SHL ECX,0x1c"
  ],
  [
    "100c1dba",
    "c1f91c",
    "SAR ECX,0x1c"
  ],
  [
    "100c1dbd",
    "83f901",
    "CMP ECX,0x1"
  ],
  [
    "100c1dc0",
    "7405",
    "JZ 0x100c1dc7"
  ],
  [
    "100c1dc2",
    "83f903",
    "CMP ECX,0x3"
  ],
  [
    "100c1dc5",
    "7502",
    "JNZ 0x100c1dc9"
  ],
  [
    "100c1dc7",
    "33d2",
    "XOR EDX,EDX"
  ],
  [
    "100c1dc9",
    "895008",
    "MOV dword ptr [EAX + 0x8],EDX"
  ],
  [
    "100c1dcc",
    "c20400",
    "RET 0x4"
  ],
  [
    "100c43c1",
    "55",
    "PUSH EBP"
  ],
  [
    "100c43c2",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100c43c4",
    "83ec18",
    "SUB ESP,0x18"
  ],
  [
    "100c43c7",
    "56",
    "PUSH ESI"
  ],
  [
    "100c43c8",
    "8b7508",
    "MOV ESI,dword ptr [EBP + 0x8]"
  ],
  [
    "100c43cb",
    "832600",
    "AND dword ptr [ESI],0x0"
  ],
  [
    "100c43ce",
    "81660400f0ffff",
    "AND dword ptr [ESI + 0x4],0xfffff000"
  ],
  [
    "100c43d5",
    "57",
    "PUSH EDI"
  ],
  [
    "100c43d6",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100c43d9",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100c43db",
    "50",
    "PUSH EAX"
  ],
  [
    "100c43dc",
    "e8f6fdffff",
    "CALL 0x100c41d7"
  ],
  [
    "100c43e1",
    "59",
    "POP ECX"
  ],
  [
    "100c43e2",
    "59",
    "POP ECX"
  ],
  [
    "100c43e3",
    "50",
    "PUSH EAX"
  ],
  [
    "100c43e4",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c43e6",
    "e895d8ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c43eb",
    "f646040f",
    "TEST byte ptr [ESI + 0x4],0xf"
  ],
  [
    "100c43ef",
    "bfec2a0f10",
    "MOV EDI,0x100f2aec"
  ],
  [
    "100c43f4",
    "7539",
    "JNZ 0x100c442f"
  ],
  [
    "100c43f6",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c43fb",
    "8a00",
    "MOV AL,byte ptr [EAX]"
  ],
  [
    "100c43fd",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100c43ff",
    "742e",
    "JZ 0x100c442f"
  ],
  [
    "100c4401",
    "3c40",
    "CMP AL,0x40"
  ],
  [
    "100c4403",
    "7435",
    "JZ 0x100c443a"
  ],
  [
    "100c4405",
    "56",
    "PUSH ESI"
  ],
  [
    "100c4406",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100c4409",
    "50",
    "PUSH EAX"
  ],
  [
    "100c440a",
    "57",
    "PUSH EDI"
  ],
  [
    "100c440b",
    "8d45f0",
    "LEA EAX,[EBP + -0x10]"
  ],
  [
    "100c440e",
    "50",
    "PUSH EAX"
  ],
  [
    "100c440f",
    "8d45e8",
    "LEA EAX,[EBP + -0x18]"
  ],
  [
    "100c4412",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4413",
    "e8c70f0000",
    "CALL 0x100c53df"
  ],
  [
    "100c4418",
    "59",
    "POP ECX"
  ],
  [
    "100c4419",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c441b",
    "e8e5e8ffff",
    "CALL 0x100c2d05"
  ],
  [
    "100c4420",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c4422",
    "e8c6e5ffff",
    "CALL 0x100c29ed"
  ],
  [
    "100c4427",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4428",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c442a",
    "e851d8ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c442f",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c4434",
    "8a00",
    "MOV AL,byte ptr [EAX]"
  ],
  [
    "100c4436",
    "3c40",
    "CMP AL,0x40"
  ],
  [
    "100c4438",
    "7508",
    "JNZ 0x100c4442"
  ],
  [
    "100c443a",
    "ff053c6f2f10",
    "INC dword ptr [0x102f6f3c]"
  ],
  [
    "100c4440",
    "eb5d",
    "JMP 0x100c449f"
  ],
  [
    "100c4442",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100c4444",
    "741b",
    "JZ 0x100c4461"
  ],
  [
    "100c4446",
    "8b4604",
    "MOV EAX,dword ptr [ESI + 0x4]"
  ],
  [
    "100c4449",
    "832600",
    "AND dword ptr [ESI],0x0"
  ],
  [
    "100c444c",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c444e",
    "83e10f",
    "AND ECX,0xf"
  ],
  [
    "100c4451",
    "80f903",
    "CMP CL,0x3"
  ],
  [
    "100c4454",
    "7449",
    "JZ 0x100c449f"
  ],
  [
    "100c4456",
    "83e0f1",
    "AND EAX,0xfffffff1"
  ],
  [
    "100c4459",
    "83c801",
    "OR EAX,0x1"
  ],
  [
    "100c445c",
    "894604",
    "MOV dword ptr [ESI + 0x4],EAX"
  ],
  [
    "100c445f",
    "eb3e",
    "JMP 0x100c449f"
  ],
  [
    "100c4461",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c4463",
    "e838dbffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c4468",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c446a",
    "7409",
    "JZ 0x100c4475"
  ],
  [
    "100c446c",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100c446e",
    "e89bdcffff",
    "CALL 0x100c210e"
  ],
  [
    "100c4473",
    "eb2a",
    "JMP 0x100c449f"
  ],
  [
    "100c4475",
    "56",
    "PUSH ESI"
  ],
  [
    "100c4476",
    "8d45e8",
    "LEA EAX,[EBP + -0x18]"
  ],
  [
    "100c4479",
    "50",
    "PUSH EAX"
  ],
  [
    "100c447a",
    "57",
    "PUSH EDI"
  ],
  [
    "100c447b",
    "8d45f0",
    "LEA EAX,[EBP + -0x10]"
  ],
  [
    "100c447e",
    "50",
    "PUSH EAX"
  ],
  [
    "100c447f",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100c4481",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c4484",
    "e89fdaffff",
    "CALL 0x100c1f28"
  ],
  [
    "100c4489",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c448b",
    "e875e8ffff",
    "CALL 0x100c2d05"
  ],
  [
    "100c4490",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c4492",
    "e856e5ffff",
    "CALL 0x100c29ed"
  ],
  [
    "100c4497",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4498",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c449a",
    "e8e1d7ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c449f",
    "5f",
    "POP EDI"
  ],
  [
    "100c44a0",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100c44a2",
    "5e",
    "POP ESI"
  ],
  [
    "100c44a3",
    "c9",
    "LEAVE"
  ],
  [
    "100c44a4",
    "c3",
    "RET"
  ],
  [
    "100c41d7",
    "55",
    "PUSH EBP"
  ],
  [
    "100c41d8",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100c41da",
    "83ec38",
    "SUB ESP,0x38"
  ],
  [
    "100c41dd",
    "a16c0d1410",
    "MOV EAX,[0x10140d6c]"
  ],
  [
    "100c41e2",
    "33c5",
    "XOR EAX,EBP"
  ],
  [
    "100c41e4",
    "8945fc",
    "MOV dword ptr [EBP + -0x4],EAX"
  ],
  [
    "100c41e7",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c41ec",
    "8a10",
    "MOV DL,byte ptr [EAX]"
  ],
  [
    "100c41ee",
    "0fbeca",
    "MOVSX ECX,DL"
  ],
  [
    "100c41f1",
    "56",
    "PUSH ESI"
  ],
  [
    "100c41f2",
    "8b7508",
    "MOV ESI,dword ptr [EBP + 0x8]"
  ],
  [
    "100c41f5",
    "83e930",
    "SUB ECX,0x30"
  ],
  [
    "100c41f8",
    "83f909",
    "CMP ECX,0x9"
  ],
  [
    "100c41fb",
    "8975d8",
    "MOV dword ptr [EBP + -0x28],ESI"
  ],
  [
    "100c41fe",
    "7721",
    "JA 0x100c4221"
  ],
  [
    "100c4200",
    "40",
    "INC EAX"
  ],
  [
    "100c4201",
    "51",
    "PUSH ECX"
  ],
  [
    "100c4202",
    "8b0d346f2f10",
    "MOV ECX,dword ptr [0x102f6f34]"
  ],
  [
    "100c4208",
    "a33c6f2f10",
    "MOV [0x102f6f3c],EAX"
  ],
  [
    "100c420d",
    "e8f2daffff",
    "CALL 0x100c1d04"
  ],
  [
    "100c4212",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4213",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c4215",
    "e850d9ffff",
    "CALL 0x100c1b6a"
  ],
  [
    "100c421a",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100c421c",
    "e993010000",
    "JMP 0x100c43b4"
  ],
  [
    "100c4221",
    "8365e400",
    "AND dword ptr [EBP + -0x1c],0x0"
  ],
  [
    "100c4225",
    "8165e800f0ffff",
    "AND dword ptr [EBP + -0x18],0xfffff000"
  ],
  [
    "100c422c",
    "80fa3f",
    "CMP DL,0x3f"
  ],
  [
    "100c422f",
    "7548",
    "JNZ 0x100c4279"
  ],
  [
    "100c4231",
    "8d45dc",
    "LEA EAX,[EBP + -0x24]"
  ],
  [
    "100c4234",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100c4236",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4237",
    "e848feffff",
    "CALL 0x100c4084"
  ],
  [
    "100c423c",
    "59",
    "POP ECX"
  ],
  [
    "100c423d",
    "59",
    "POP ECX"
  ],
  [
    "100c423e",
    "50",
    "PUSH EAX"
  ],
  [
    "100c423f",
    "8d4de4",
    "LEA ECX,[EBP + -0x1c]"
  ],
  [
    "100c4242",
    "e839daffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c4247",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c424c",
    "8a08",
    "MOV CL,byte ptr [EAX]"
  ],
  [
    "100c424e",
    "40",
    "INC EAX"
  ],
  [
    "100c424f",
    "80f940",
    "CMP CL,0x40"
  ],
  [
    "100c4252",
    "a33c6f2f10",
    "MOV [0x102f6f3c],EAX"
  ],
  [
    "100c4257",
    "0f842e010000",
    "JZ 0x100c438b"
  ],
  [
    "100c425d",
    "48",
    "DEC EAX"
  ],
  [
    "100c425e",
    "33c9",
    "XOR ECX,ECX"
  ],
  [
    "100c4260",
    "a33c6f2f10",
    "MOV [0x102f6f3c],EAX"
  ],
  [
    "100c4265",
    "3808",
    "CMP byte ptr [EAX],CL"
  ],
  [
    "100c4267",
    "0f94c1",
    "SETZ CL"
  ],
  [
    "100c426a",
    "41",
    "INC ECX"
  ],
  [
    "100c426b",
    "51",
    "PUSH ECX"
  ],
  [
    "100c426c",
    "8d4de4",
    "LEA ECX,[EBP + -0x1c]"
  ],
  [
    "100c426f",
    "e89adeffff",
    "CALL 0x100c210e"
  ],
  [
    "100c4274",
    "e912010000",
    "JMP 0x100c438b"
  ],
  [
    "100c4279",
    "53",
    "PUSH EBX"
  ],
  [
    "100c427a",
    "57",
    "PUSH EDI"
  ],
  [
    "100c427b",
    "b9d82a0f10",
    "MOV ECX,0x100f2ad8"
  ],
  [
    "100c4280",
    "6a12",
    "PUSH 0x12"
  ],
  [
    "100c4282",
    "8bf9",
    "MOV EDI,ECX"
  ],
  [
    "100c4284",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100c4286",
    "5b",
    "POP EBX"
  ],
  [
    "100c4287",
    "8a16",
    "MOV DL,byte ptr [ESI]"
  ],
  [
    "100c4289",
    "84d2",
    "TEST DL,DL"
  ],
  [
    "100c428b",
    "7409",
    "JZ 0x100c4296"
  ],
  [
    "100c428d",
    "3a17",
    "CMP DL,byte ptr [EDI]"
  ],
  [
    "100c428f",
    "7505",
    "JNZ 0x100c4296"
  ],
  [
    "100c4291",
    "46",
    "INC ESI"
  ],
  [
    "100c4292",
    "47",
    "INC EDI"
  ],
  [
    "100c4293",
    "4b",
    "DEC EBX"
  ],
  [
    "100c4294",
    "75f1",
    "JNZ 0x100c4287"
  ],
  [
    "100c4296",
    "0fb616",
    "MOVZX EDX,byte ptr [ESI]"
  ],
  [
    "100c4299",
    "0fb637",
    "MOVZX ESI,byte ptr [EDI]"
  ],
  [
    "100c429c",
    "2bd6",
    "SUB EDX,ESI"
  ],
  [
    "100c429e",
    "7505",
    "JNZ 0x100c42a5"
  ],
  [
    "100c42a0",
    "83c013",
    "ADD EAX,0x13"
  ],
  [
    "100c42a3",
    "eb2c",
    "JMP 0x100c42d1"
  ],
  [
    "100c42a5",
    "b9c82a0f10",
    "MOV ECX,0x100f2ac8"
  ],
  [
    "100c42aa",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "100c42ac",
    "8bf9",
    "MOV EDI,ECX"
  ],
  [
    "100c42ae",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100c42b0",
    "5b",
    "POP EBX"
  ],
  [
    "100c42b1",
    "8a16",
    "MOV DL,byte ptr [ESI]"
  ],
  [
    "100c42b3",
    "84d2",
    "TEST DL,DL"
  ],
  [
    "100c42b5",
    "7409",
    "JZ 0x100c42c0"
  ],
  [
    "100c42b7",
    "3a17",
    "CMP DL,byte ptr [EDI]"
  ],
  [
    "100c42b9",
    "7505",
    "JNZ 0x100c42c0"
  ],
  [
    "100c42bb",
    "46",
    "INC ESI"
  ],
  [
    "100c42bc",
    "47",
    "INC EDI"
  ],
  [
    "100c42bd",
    "4b",
    "DEC EBX"
  ],
  [
    "100c42be",
    "75f1",
    "JNZ 0x100c42b1"
  ],
  [
    "100c42c0",
    "0fb616",
    "MOVZX EDX,byte ptr [ESI]"
  ],
  [
    "100c42c3",
    "0fb637",
    "MOVZX ESI,byte ptr [EDI]"
  ],
  [
    "100c42c6",
    "2bd6",
    "SUB EDX,ESI"
  ],
  [
    "100c42c8",
    "0f85a3000000",
    "JNZ 0x100c4371"
  ],
  [
    "100c42ce",
    "83c00d",
    "ADD EAX,0xd"
  ],
  [
    "100c42d1",
    "a33c6f2f10",
    "MOV [0x102f6f3c],EAX"
  ],
  [
    "100c42d6",
    "8d45dc",
    "LEA EAX,[EBP + -0x24]"
  ],
  [
    "100c42d9",
    "50",
    "PUSH EAX"
  ],
  [
    "100c42da",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100c42dc",
    "e884f2ffff",
    "CALL 0x100c3565"
  ],
  [
    "100c42e1",
    "66f7054c6f2f100040",
    "TEST word ptr [0x102f6f4c],0x4000"
  ],
  [
    "100c42ea",
    "59",
    "POP ECX"
  ],
  [
    "100c42eb",
    "744b",
    "JZ 0x100c4338"
  ],
  [
    "100c42ed",
    "6a10",
    "PUSH 0x10"
  ],
  [
    "100c42ef",
    "8d45ec",
    "LEA EAX,[EBP + -0x14]"
  ],
  [
    "100c42f2",
    "50",
    "PUSH EAX"
  ],
  [
    "100c42f3",
    "8d4ddc",
    "LEA ECX,[EBP + -0x24]"
  ],
  [
    "100c42f6",
    "e84dddffff",
    "CALL 0x100c2048"
  ],
  [
    "100c42fb",
    "8d45ec",
    "LEA EAX,[EBP + -0x14]"
  ],
  [
    "100c42fe",
    "50",
    "PUSH EAX"
  ],
  [
    "100c42ff",
    "e81836feff",
    "CALL 0x100a791c"
  ],
  [
    "100c4304",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4305",
    "ff15506f2f10",
    "CALL dword ptr [0x102f6f50]"
  ],
  [
    "100c430b",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c430d",
    "59",
    "POP ECX"
  ],
  [
    "100c430e",
    "59",
    "POP ECX"
  ],
  [
    "100c430f",
    "8d4de4",
    "LEA ECX,[EBP + -0x1c]"
  ],
  [
    "100c4312",
    "7408",
    "JZ 0x100c431c"
  ],
  [
    "100c4314",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4315",
    "e8cce5ffff",
    "CALL 0x100c28e6"
  ],
  [
    "100c431a",
    "eb6d",
    "JMP 0x100c4389"
  ],
  [
    "100c431c",
    "68c42a0f10",
    "PUSH 0x100f2ac4"
  ],
  [
    "100c4321",
    "e8c0e5ffff",
    "CALL 0x100c28e6"
  ],
  [
    "100c4326",
    "68782a0f10",
    "PUSH 0x100f2a78"
  ],
  [
    "100c432b",
    "8d45c8",
    "LEA EAX,[EBP + -0x38]"
  ],
  [
    "100c432e",
    "50",
    "PUSH EAX"
  ],
  [
    "100c432f",
    "8d45dc",
    "LEA EAX,[EBP + -0x24]"
  ],
  [
    "100c4332",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4333",
    "8d45d0",
    "LEA EAX,[EBP + -0x30]"
  ],
  [
    "100c4336",
    "eb1d",
    "JMP 0x100c4355"
  ],
  [
    "100c4338",
    "68c42a0f10",
    "PUSH 0x100f2ac4"
  ],
  [
    "100c433d",
    "8d4de4",
    "LEA ECX,[EBP + -0x1c]"
  ],
  [
    "100c4340",
    "e8a1e5ffff",
    "CALL 0x100c28e6"
  ],
  [
    "100c4345",
    "68782a0f10",
    "PUSH 0x100f2a78"
  ],
  [
    "100c434a",
    "8d45d0",
    "LEA EAX,[EBP + -0x30]"
  ],
  [
    "100c434d",
    "50",
    "PUSH EAX"
  ],
  [
    "100c434e",
    "8d45dc",
    "LEA EAX,[EBP + -0x24]"
  ],
  [
    "100c4351",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4352",
    "8d45c8",
    "LEA EAX,[EBP + -0x38]"
  ],
  [
    "100c4355",
    "56",
    "PUSH ESI"
  ],
  [
    "100c4356",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4357",
    "e859e9ffff",
    "CALL 0x100c2cb5"
  ],
  [
    "100c435c",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100c435f",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c4361",
    "e89fe9ffff",
    "CALL 0x100c2d05"
  ],
  [
    "100c4366",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4367",
    "8d4de4",
    "LEA ECX,[EBP + -0x1c]"
  ],
  [
    "100c436a",
    "e86ee4ffff",
    "CALL 0x100c27dd"
  ],
  [
    "100c436f",
    "eb18",
    "JMP 0x100c4389"
  ],
  [
    "100c4371",
    "6a40",
    "PUSH 0x40"
  ],
  [
    "100c4373",
    "683c6f2f10",
    "PUSH 0x102f6f3c"
  ],
  [
    "100c4378",
    "8d4dd0",
    "LEA ECX,[EBP + -0x30]"
  ],
  [
    "100c437b",
    "e860e2ffff",
    "CALL 0x100c25e0"
  ],
  [
    "100c4380",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4381",
    "8d4de4",
    "LEA ECX,[EBP + -0x1c]"
  ],
  [
    "100c4384",
    "e8f7d8ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c4389",
    "5f",
    "POP EDI"
  ],
  [
    "100c438a",
    "5b",
    "POP EBX"
  ],
  [
    "100c438b",
    "807d0c00",
    "CMP byte ptr [EBP + 0xc],0x0"
  ],
  [
    "100c438f",
    "7414",
    "JZ 0x100c43a5"
  ],
  [
    "100c4391",
    "8b0d346f2f10",
    "MOV ECX,dword ptr [0x102f6f34]"
  ],
  [
    "100c4397",
    "833909",
    "CMP dword ptr [ECX],0x9"
  ],
  [
    "100c439a",
    "7409",
    "JZ 0x100c43a5"
  ],
  [
    "100c439c",
    "8d45e4",
    "LEA EAX,[EBP + -0x1c]"
  ],
  [
    "100c439f",
    "50",
    "PUSH EAX"
  ],
  [
    "100c43a0",
    "e808deffff",
    "CALL 0x100c21ad"
  ],
  [
    "100c43a5",
    "8b4dd8",
    "MOV ECX,dword ptr [EBP + -0x28]"
  ],
  [
    "100c43a8",
    "8d45e4",
    "LEA EAX,[EBP + -0x1c]"
  ],
  [
    "100c43ab",
    "50",
    "PUSH EAX"
  ],
  [
    "100c43ac",
    "e8b9d7ffff",
    "CALL 0x100c1b6a"
  ],
  [
    "100c43b1",
    "8b45d8",
    "MOV EAX,dword ptr [EBP + -0x28]"
  ],
  [
    "100c43b4",
    "8b4dfc",
    "MOV ECX,dword ptr [EBP + -0x4]"
  ],
  [
    "100c43b7",
    "33cd",
    "XOR ECX,EBP"
  ],
  [
    "100c43b9",
    "5e",
    "POP ESI"
  ],
  [
    "100c43ba",
    "e809befeff",
    "CALL 0x100b01c8"
  ],
  [
    "100c43bf",
    "c9",
    "LEAVE"
  ],
  [
    "100c43c0",
    "c3",
    "RET"
  ],
  [
    "100c25e0",
    "55",
    "PUSH EBP"
  ],
  [
    "100c25e1",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100c25e3",
    "53",
    "PUSH EBX"
  ],
  [
    "100c25e4",
    "56",
    "PUSH ESI"
  ],
  [
    "100c25e5",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100c25e7",
    "81660400f0ffff",
    "AND dword ptr [ESI + 0x4],0xfffff000"
  ],
  [
    "100c25ee",
    "8b4604",
    "MOV EAX,dword ptr [ESI + 0x4]"
  ],
  [
    "100c25f1",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100c25f3",
    "57",
    "PUSH EDI"
  ],
  [
    "100c25f4",
    "8b7d08",
    "MOV EDI,dword ptr [EBP + 0x8]"
  ],
  [
    "100c25f7",
    "891e",
    "MOV dword ptr [ESI],EBX"
  ],
  [
    "100c25f9",
    "8b0f",
    "MOV ECX,dword ptr [EDI]"
  ],
  [
    "100c25fb",
    "3bcb",
    "CMP ECX,EBX"
  ],
  [
    "100c25fd",
    "0f8486000000",
    "JZ 0x100c2689"
  ],
  [
    "100c2603",
    "3819",
    "CMP byte ptr [ECX],BL"
  ],
  [
    "100c2605",
    "0f849d000000",
    "JZ 0x100c26a8"
  ],
  [
    "100c260b",
    "8b17",
    "MOV EDX,dword ptr [EDI]"
  ],
  [
    "100c260d",
    "8a02",
    "MOV AL,byte ptr [EDX]"
  ],
  [
    "100c260f",
    "3a450c",
    "CMP AL,byte ptr [EBP + 0xc]"
  ],
  [
    "100c2612",
    "744b",
    "JZ 0x100c265f"
  ],
  [
    "100c2614",
    "3c5f",
    "CMP AL,0x5f"
  ],
  [
    "100c2616",
    "743c",
    "JZ 0x100c2654"
  ],
  [
    "100c2618",
    "3c24",
    "CMP AL,0x24"
  ],
  [
    "100c261a",
    "7438",
    "JZ 0x100c2654"
  ],
  [
    "100c261c",
    "3c3c",
    "CMP AL,0x3c"
  ],
  [
    "100c261e",
    "7434",
    "JZ 0x100c2654"
  ],
  [
    "100c2620",
    "3c3e",
    "CMP AL,0x3e"
  ],
  [
    "100c2622",
    "7430",
    "JZ 0x100c2654"
  ],
  [
    "100c2624",
    "3c2d",
    "CMP AL,0x2d"
  ],
  [
    "100c2626",
    "742c",
    "JZ 0x100c2654"
  ],
  [
    "100c2628",
    "3c61",
    "CMP AL,0x61"
  ],
  [
    "100c262a",
    "7c04",
    "JL 0x100c2630"
  ],
  [
    "100c262c",
    "3c7a",
    "CMP AL,0x7a"
  ],
  [
    "100c262e",
    "7e24",
    "JLE 0x100c2654"
  ],
  [
    "100c2630",
    "3c41",
    "CMP AL,0x41"
  ],
  [
    "100c2632",
    "7c04",
    "JL 0x100c2638"
  ],
  [
    "100c2634",
    "3c5a",
    "CMP AL,0x5a"
  ],
  [
    "100c2636",
    "7e1c",
    "JLE 0x100c2654"
  ],
  [
    "100c2638",
    "3c30",
    "CMP AL,0x30"
  ],
  [
    "100c263a",
    "7c04",
    "JL 0x100c2640"
  ],
  [
    "100c263c",
    "3c39",
    "CMP AL,0x39"
  ],
  [
    "100c263e",
    "7e14",
    "JLE 0x100c2654"
  ],
  [
    "100c2640",
    "3c80",
    "CMP AL,0x80"
  ],
  [
    "100c2642",
    "7204",
    "JC 0x100c2648"
  ],
  [
    "100c2644",
    "3cfe",
    "CMP AL,0xfe"
  ],
  [
    "100c2646",
    "760c",
    "JBE 0x100c2654"
  ],
  [
    "100c2648",
    "f7054c6f2f1000000100",
    "TEST dword ptr [0x102f6f4c],0x10000"
  ],
  [
    "100c2652",
    "7432",
    "JZ 0x100c2686"
  ],
  [
    "100c2654",
    "43",
    "INC EBX"
  ],
  [
    "100c2655",
    "42",
    "INC EDX"
  ],
  [
    "100c2656",
    "8bc2",
    "MOV EAX,EDX"
  ],
  [
    "100c2658",
    "8917",
    "MOV dword ptr [EDI],EDX"
  ],
  [
    "100c265a",
    "803800",
    "CMP byte ptr [EAX],0x0"
  ],
  [
    "100c265d",
    "75ac",
    "JNZ 0x100c260b"
  ],
  [
    "100c265f",
    "53",
    "PUSH EBX"
  ],
  [
    "100c2660",
    "51",
    "PUSH ECX"
  ],
  [
    "100c2661",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c2663",
    "e87bfeffff",
    "CALL 0x100c24e3"
  ],
  [
    "100c2668",
    "8b07",
    "MOV EAX,dword ptr [EDI]"
  ],
  [
    "100c266a",
    "8a08",
    "MOV CL,byte ptr [EAX]"
  ],
  [
    "100c266c",
    "84c9",
    "TEST CL,CL"
  ],
  [
    "100c266e",
    "7431",
    "JZ 0x100c26a1"
  ],
  [
    "100c2670",
    "40",
    "INC EAX"
  ],
  [
    "100c2671",
    "3a4d0c",
    "CMP CL,byte ptr [EBP + 0xc]"
  ],
  [
    "100c2674",
    "8907",
    "MOV dword ptr [EDI],EAX"
  ],
  [
    "100c2676",
    "7423",
    "JZ 0x100c269b"
  ],
  [
    "100c2678",
    "8b4604",
    "MOV EAX,dword ptr [ESI + 0x4]"
  ],
  [
    "100c267b",
    "83e0f3",
    "AND EAX,0xfffffff3"
  ],
  [
    "100c267e",
    "83c803",
    "OR EAX,0x3"
  ],
  [
    "100c2681",
    "832600",
    "AND dword ptr [ESI],0x0"
  ],
  [
    "100c2684",
    "eb09",
    "JMP 0x100c268f"
  ],
  [
    "100c2686",
    "8b4604",
    "MOV EAX,dword ptr [ESI + 0x4]"
  ],
  [
    "100c2689",
    "83e0f1",
    "AND EAX,0xfffffff1"
  ],
  [
    "100c268c",
    "83c801",
    "OR EAX,0x1"
  ],
  [
    "100c268f",
    "894604",
    "MOV dword ptr [ESI + 0x4],EAX"
  ],
  [
    "100c2692",
    "5f",
    "POP EDI"
  ],
  [
    "100c2693",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100c2695",
    "5e",
    "POP ESI"
  ],
  [
    "100c2696",
    "5b",
    "POP EBX"
  ],
  [
    "100c2697",
    "5d",
    "POP EBP"
  ],
  [
    "100c2698",
    "c20800",
    "RET 0x8"
  ],
  [
    "100c269b",
    "836604f0",
    "AND dword ptr [ESI + 0x4],0xfffffff0"
  ],
  [
    "100c269f",
    "ebf1",
    "JMP 0x100c2692"
  ],
  [
    "100c26a1",
    "8b4604",
    "MOV EAX,dword ptr [ESI + 0x4]"
  ],
  [
    "100c26a4",
    "a80f",
    "TEST AL,0xf"
  ],
  [
    "100c26a6",
    "75ea",
    "JNZ 0x100c2692"
  ],
  [
    "100c26a8",
    "83e0f2",
    "AND EAX,0xfffffff2"
  ],
  [
    "100c26ab",
    "83c802",
    "OR EAX,0x2"
  ],
  [
    "100c26ae",
    "ebdf",
    "JMP 0x100c268f"
  ],
  [
    "100c21ad",
    "56",
    "PUSH ESI"
  ],
  [
    "100c21ae",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100c21b0",
    "833e09",
    "CMP dword ptr [ESI],0x9"
  ],
  [
    "100c21b3",
    "7439",
    "JZ 0x100c21ee"
  ],
  [
    "100c21b5",
    "8b4c2408",
    "MOV ECX,dword ptr [ESP + 0x8]"
  ],
  [
    "100c21b9",
    "e8e2fdffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c21be",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c21c0",
    "752c",
    "JNZ 0x100c21ee"
  ],
  [
    "100c21c2",
    "50",
    "PUSH EAX"
  ],
  [
    "100c21c3",
    "6a08",
    "PUSH 0x8"
  ],
  [
    "100c21c5",
    "b91c6f2f10",
    "MOV ECX,0x102f6f1c"
  ],
  [
    "100c21ca",
    "e8f8f8ffff",
    "CALL 0x100c1ac7"
  ],
  [
    "100c21cf",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c21d1",
    "740d",
    "JZ 0x100c21e0"
  ],
  [
    "100c21d3",
    "ff742408",
    "PUSH dword ptr [ESP + 0x8]"
  ],
  [
    "100c21d7",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c21d9",
    "e88cf9ffff",
    "CALL 0x100c1b6a"
  ],
  [
    "100c21de",
    "eb02",
    "JMP 0x100c21e2"
  ],
  [
    "100c21e0",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c21e2",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c21e4",
    "7408",
    "JZ 0x100c21ee"
  ],
  [
    "100c21e6",
    "ff06",
    "INC dword ptr [ESI]"
  ],
  [
    "100c21e8",
    "8b0e",
    "MOV ECX,dword ptr [ESI]"
  ],
  [
    "100c21ea",
    "89448e04",
    "MOV dword ptr [ESI + ECX*0x4 + 0x4],EAX"
  ],
  [
    "100c21ee",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100c21f0",
    "5e",
    "POP ESI"
  ],
  [
    "100c21f1",
    "c20400",
    "RET 0x4"
  ],
  [
    "100c1f89",
    "8b4104",
    "MOV EAX,dword ptr [ECX + 0x4]"
  ],
  [
    "100c1f8c",
    "c1e01c",
    "SHL EAX,0x1c"
  ],
  [
    "100c1f8f",
    "c1f81c",
    "SAR EAX,0x1c"
  ],
  [
    "100c1f92",
    "7408",
    "JZ 0x100c1f9c"
  ],
  [
    "100c1f94",
    "83f802",
    "CMP EAX,0x2"
  ],
  [
    "100c1f97",
    "7403",
    "JZ 0x100c1f9c"
  ],
  [
    "100c1f99",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c1f9b",
    "c3",
    "RET"
  ],
  [
    "100c1f9c",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c1f9e",
    "40",
    "INC EAX"
  ],
  [
    "100c1f9f",
    "c3",
    "RET"
  ],
  [
    "100b01c8",
    "3b0d6c0d1410",
    "CMP ECX,dword ptr [0x10140d6c]"
  ],
  [
    "100b01ce",
    "7502",
    "JNZ 0x100b01d2"
  ],
  [
    "100b01d0",
    "f3c3",
    "RET"
  ],
  [
    "100b01d2",
    "e9e1110100",
    "JMP 0x100c13b8"
  ],
  [
    "100c28e6",
    "8b442404",
    "MOV EAX,dword ptr [ESP + 0x4]"
  ],
  [
    "100c28ea",
    "56",
    "PUSH ESI"
  ],
  [
    "100c28eb",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100c28ed",
    "8166040ff7ffff",
    "AND dword ptr [ESI + 0x4],0xfffff70f"
  ],
  [
    "100c28f4",
    "33c9",
    "XOR ECX,ECX"
  ],
  [
    "100c28f6",
    "3808",
    "CMP byte ptr [EAX],CL"
  ],
  [
    "100c28f8",
    "7407",
    "JZ 0x100c2901"
  ],
  [
    "100c28fa",
    "41",
    "INC ECX"
  ],
  [
    "100c28fb",
    "803c0100",
    "CMP byte ptr [ECX + EAX*0x1],0x0"
  ],
  [
    "100c28ff",
    "75f9",
    "JNZ 0x100c28fa"
  ],
  [
    "100c2901",
    "51",
    "PUSH ECX"
  ],
  [
    "100c2902",
    "50",
    "PUSH EAX"
  ],
  [
    "100c2903",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c2905",
    "e8d9fbffff",
    "CALL 0x100c24e3"
  ],
  [
    "100c290a",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100c290c",
    "5e",
    "POP ESI"
  ],
  [
    "100c290d",
    "c20400",
    "RET 0x4"
  ],
  [
    "100c24e3",
    "56",
    "PUSH ESI"
  ],
  [
    "100c24e4",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100c24e6",
    "8b4604",
    "MOV EAX,dword ptr [ESI + 0x4]"
  ],
  [
    "100c24e9",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c24eb",
    "c1e11c",
    "SHL ECX,0x1c"
  ],
  [
    "100c24ee",
    "c1f91c",
    "SAR ECX,0x1c"
  ],
  [
    "100c24f1",
    "83f901",
    "CMP ECX,0x1"
  ],
  [
    "100c24f4",
    "0f848b000000",
    "JZ 0x100c2585"
  ],
  [
    "100c24fa",
    "83f903",
    "CMP ECX,0x3"
  ],
  [
    "100c24fd",
    "0f8482000000",
    "JZ 0x100c2585"
  ],
  [
    "100c2503",
    "53",
    "PUSH EBX"
  ],
  [
    "100c2504",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100c2506",
    "391e",
    "CMP dword ptr [ESI],EBX"
  ],
  [
    "100c2508",
    "740b",
    "JZ 0x100c2515"
  ],
  [
    "100c250a",
    "6a03",
    "PUSH 0x3"
  ],
  [
    "100c250c",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c250e",
    "e8fbfbffff",
    "CALL 0x100c210e"
  ],
  [
    "100c2513",
    "eb6f",
    "JMP 0x100c2584"
  ],
  [
    "100c2515",
    "57",
    "PUSH EDI"
  ],
  [
    "100c2516",
    "8b7c2410",
    "MOV EDI,dword ptr [ESP + 0x10]"
  ],
  [
    "100c251a",
    "3bfb",
    "CMP EDI,EBX"
  ],
  [
    "100c251c",
    "745c",
    "JZ 0x100c257a"
  ],
  [
    "100c251e",
    "8b4c2414",
    "MOV ECX,dword ptr [ESP + 0x14]"
  ],
  [
    "100c2522",
    "3bcb",
    "CMP ECX,EBX"
  ],
  [
    "100c2524",
    "7454",
    "JZ 0x100c257a"
  ],
  [
    "100c2526",
    "2bcb",
    "SUB ECX,EBX"
  ],
  [
    "100c2528",
    "742d",
    "JZ 0x100c2557"
  ],
  [
    "100c252a",
    "49",
    "DEC ECX"
  ],
  [
    "100c252b",
    "53",
    "PUSH EBX"
  ],
  [
    "100c252c",
    "b91c6f2f10",
    "MOV ECX,0x102f6f1c"
  ],
  [
    "100c2531",
    "742c",
    "JZ 0x100c255f"
  ],
  [
    "100c2533",
    "6a10",
    "PUSH 0x10"
  ],
  [
    "100c2535",
    "e88df5ffff",
    "CALL 0x100c1ac7"
  ],
  [
    "100c253a",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100c253c",
    "740e",
    "JZ 0x100c254c"
  ],
  [
    "100c253e",
    "ff742414",
    "PUSH dword ptr [ESP + 0x14]"
  ],
  [
    "100c2542",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c2544",
    "57",
    "PUSH EDI"
  ],
  [
    "100c2545",
    "e8f1fcffff",
    "CALL 0x100c223b"
  ],
  [
    "100c254a",
    "eb02",
    "JMP 0x100c254e"
  ],
  [
    "100c254c",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c254e",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100c2550",
    "8906",
    "MOV dword ptr [ESI],EAX"
  ],
  [
    "100c2552",
    "752f",
    "JNZ 0x100c2583"
  ],
  [
    "100c2554",
    "8b4604",
    "MOV EAX,dword ptr [ESI + 0x4]"
  ],
  [
    "100c2557",
    "83e0f3",
    "AND EAX,0xfffffff3"
  ],
  [
    "100c255a",
    "83c803",
    "OR EAX,0x3"
  ],
  [
    "100c255d",
    "eb21",
    "JMP 0x100c2580"
  ],
  [
    "100c255f",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "100c2561",
    "e861f5ffff",
    "CALL 0x100c1ac7"
  ],
  [
    "100c2566",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100c2568",
    "74e2",
    "JZ 0x100c254c"
  ],
  [
    "100c256a",
    "8a0f",
    "MOV CL,byte ptr [EDI]"
  ],
  [
    "100c256c",
    "895804",
    "MOV dword ptr [EAX + 0x4],EBX"
  ],
  [
    "100c256f",
    "c7008c290f10",
    "MOV dword ptr [EAX],0x100f298c"
  ],
  [
    "100c2575",
    "884808",
    "MOV byte ptr [EAX + 0x8],CL"
  ],
  [
    "100c2578",
    "ebd4",
    "JMP 0x100c254e"
  ],
  [
    "100c257a",
    "83e0f1",
    "AND EAX,0xfffffff1"
  ],
  [
    "100c257d",
    "83c801",
    "OR EAX,0x1"
  ],
  [
    "100c2580",
    "894604",
    "MOV dword ptr [ESI + 0x4],EAX"
  ],
  [
    "100c2583",
    "5f",
    "POP EDI"
  ],
  [
    "100c2584",
    "5b",
    "POP EBX"
  ],
  [
    "100c2585",
    "5e",
    "POP ESI"
  ],
  [
    "100c2586",
    "c20800",
    "RET 0x8"
  ],
  [
    "100c223b",
    "53",
    "PUSH EBX"
  ],
  [
    "100c223c",
    "8b5c2408",
    "MOV EBX,dword ptr [ESP + 0x8]"
  ],
  [
    "100c2240",
    "56",
    "PUSH ESI"
  ],
  [
    "100c2241",
    "57",
    "PUSH EDI"
  ],
  [
    "100c2242",
    "8b7c2414",
    "MOV EDI,dword ptr [ESP + 0x14]"
  ],
  [
    "100c2246",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c2248",
    "3bf8",
    "CMP EDI,EAX"
  ],
  [
    "100c224a",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100c224c",
    "894604",
    "MOV dword ptr [ESI + 0x4],EAX"
  ],
  [
    "100c224f",
    "c706bc290f10",
    "MOV dword ptr [ESI],0x100f29bc"
  ],
  [
    "100c2255",
    "7514",
    "JNZ 0x100c226b"
  ],
  [
    "100c2257",
    "3bd8",
    "CMP EBX,EAX"
  ],
  [
    "100c2259",
    "7437",
    "JZ 0x100c2292"
  ],
  [
    "100c225b",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100c225d",
    "3803",
    "CMP byte ptr [EBX],AL"
  ],
  [
    "100c225f",
    "7406",
    "JZ 0x100c2267"
  ],
  [
    "100c2261",
    "47",
    "INC EDI"
  ],
  [
    "100c2262",
    "38041f",
    "CMP byte ptr [EDI + EBX*0x1],AL"
  ],
  [
    "100c2265",
    "75fa",
    "JNZ 0x100c2261"
  ],
  [
    "100c2267",
    "3bf8",
    "CMP EDI,EAX"
  ],
  [
    "100c2269",
    "7427",
    "JZ 0x100c2292"
  ],
  [
    "100c226b",
    "3bd8",
    "CMP EBX,EAX"
  ],
  [
    "100c226d",
    "7423",
    "JZ 0x100c2292"
  ],
  [
    "100c226f",
    "50",
    "PUSH EAX"
  ],
  [
    "100c2270",
    "57",
    "PUSH EDI"
  ],
  [
    "100c2271",
    "b91c6f2f10",
    "MOV ECX,0x102f6f1c"
  ],
  [
    "100c2276",
    "e84cf8ffff",
    "CALL 0x100c1ac7"
  ],
  [
    "100c227b",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c227d",
    "894608",
    "MOV dword ptr [ESI + 0x8],EAX"
  ],
  [
    "100c2280",
    "897e0c",
    "MOV dword ptr [ESI + 0xc],EDI"
  ],
  [
    "100c2283",
    "7413",
    "JZ 0x100c2298"
  ],
  [
    "100c2285",
    "57",
    "PUSH EDI"
  ],
  [
    "100c2286",
    "50",
    "PUSH EAX"
  ],
  [
    "100c2287",
    "8bd3",
    "MOV EDX,EBX"
  ],
  [
    "100c2289",
    "e885fbffff",
    "CALL 0x100c1e13"
  ],
  [
    "100c228e",
    "59",
    "POP ECX"
  ],
  [
    "100c228f",
    "59",
    "POP ECX"
  ],
  [
    "100c2290",
    "eb06",
    "JMP 0x100c2298"
  ],
  [
    "100c2292",
    "894608",
    "MOV dword ptr [ESI + 0x8],EAX"
  ],
  [
    "100c2295",
    "89460c",
    "MOV dword ptr [ESI + 0xc],EAX"
  ],
  [
    "100c2298",
    "5f",
    "POP EDI"
  ],
  [
    "100c2299",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100c229b",
    "5e",
    "POP ESI"
  ],
  [
    "100c229c",
    "5b",
    "POP EBX"
  ],
  [
    "100c229d",
    "c20800",
    "RET 0x8"
  ],
  [
    "100c1e13",
    "837c240800",
    "CMP dword ptr [ESP + 0x8],0x0"
  ],
  [
    "100c1e18",
    "8b4c2404",
    "MOV ECX,dword ptr [ESP + 0x4]"
  ],
  [
    "100c1e1c",
    "7410",
    "JZ 0x100c1e2e"
  ],
  [
    "100c1e1e",
    "8a02",
    "MOV AL,byte ptr [EDX]"
  ],
  [
    "100c1e20",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100c1e22",
    "8801",
    "MOV byte ptr [ECX],AL"
  ],
  [
    "100c1e24",
    "7408",
    "JZ 0x100c1e2e"
  ],
  [
    "100c1e26",
    "41",
    "INC ECX"
  ],
  [
    "100c1e27",
    "42",
    "INC EDX"
  ],
  [
    "100c1e28",
    "ff4c2408",
    "DEC dword ptr [ESP + 0x8]"
  ],
  [
    "100c1e2c",
    "75f0",
    "JNZ 0x100c1e1e"
  ],
  [
    "100c1e2e",
    "8b442404",
    "MOV EAX,dword ptr [ESP + 0x4]"
  ],
  [
    "100c1e32",
    "c3",
    "RET"
  ],
  [
    "100c44b4",
    "55",
    "PUSH EBP"
  ],
  [
    "100c44b5",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100c44b7",
    "a14c6f2f10",
    "MOV EAX,[0x102f6f4c]"
  ],
  [
    "100c44bc",
    "83ec18",
    "SUB ESP,0x18"
  ],
  [
    "100c44bf",
    "53",
    "PUSH EBX"
  ],
  [
    "100c44c0",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c44c2",
    "c1e90f",
    "SHR ECX,0xf"
  ],
  [
    "100c44c5",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100c44c7",
    "f7d1",
    "NOT ECX"
  ],
  [
    "100c44c9",
    "43",
    "INC EBX"
  ],
  [
    "100c44ca",
    "23cb",
    "AND ECX,EBX"
  ],
  [
    "100c44cc",
    "56",
    "PUSH ESI"
  ],
  [
    "100c44cd",
    "7406",
    "JZ 0x100c44d5"
  ],
  [
    "100c44cf",
    "66a90010",
    "TEST AX,0x1000"
  ],
  [
    "100c44d3",
    "7402",
    "JZ 0x100c44d7"
  ],
  [
    "100c44d5",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100c44d7",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c44dc",
    "0fbe00",
    "MOVSX EAX,byte ptr [EAX]"
  ],
  [
    "100c44df",
    "8365f800",
    "AND dword ptr [EBP + -0x8],0x0"
  ],
  [
    "100c44e3",
    "be00f0ffff",
    "MOV ESI,0xfffff000"
  ],
  [
    "100c44e8",
    "2175fc",
    "AND dword ptr [EBP + -0x4],ESI"
  ],
  [
    "100c44eb",
    "ff053c6f2f10",
    "INC dword ptr [0x102f6f3c]"
  ],
  [
    "100c44f1",
    "83e800",
    "SUB EAX,0x0"
  ],
  [
    "100c44f4",
    "0f84a0000000",
    "JZ 0x100c459a"
  ],
  [
    "100c44fa",
    "83e854",
    "SUB EAX,0x54"
  ],
  [
    "100c44fd",
    "7453",
    "JZ 0x100c4552"
  ],
  [
    "100c44ff",
    "48",
    "DEC EAX"
  ],
  [
    "100c4500",
    "7449",
    "JZ 0x100c454b"
  ],
  [
    "100c4502",
    "48",
    "DEC EAX"
  ],
  [
    "100c4503",
    "743f",
    "JZ 0x100c4544"
  ],
  [
    "100c4505",
    "48",
    "DEC EAX"
  ],
  [
    "100c4506",
    "7414",
    "JZ 0x100c451c"
  ],
  [
    "100c4508",
    "48",
    "DEC EAX"
  ],
  [
    "100c4509",
    "740a",
    "JZ 0x100c4515"
  ],
  [
    "100c450b",
    "48",
    "DEC EAX"
  ],
  [
    "100c450c",
    "7551",
    "JNZ 0x100c455f"
  ],
  [
    "100c450e",
    "682c2b0f10",
    "PUSH 0x100f2b2c"
  ],
  [
    "100c4513",
    "eb42",
    "JMP 0x100c4557"
  ],
  [
    "100c4515",
    "68202b0f10",
    "PUSH 0x100f2b20"
  ],
  [
    "100c451a",
    "eb3b",
    "JMP 0x100c4557"
  ],
  [
    "100c451c",
    "8d45f0",
    "LEA EAX,[EBP + -0x10]"
  ],
  [
    "100c451f",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4520",
    "8bd9",
    "MOV EBX,ECX"
  ],
  [
    "100c4522",
    "e84de9ffff",
    "CALL 0x100c2e74"
  ],
  [
    "100c4527",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4528",
    "8d45e8",
    "LEA EAX,[EBP + -0x18]"
  ],
  [
    "100c452b",
    "68182b0f10",
    "PUSH 0x100f2b18"
  ],
  [
    "100c4530",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4531",
    "e87fe7ffff",
    "CALL 0x100c2cb5"
  ],
  [
    "100c4536",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100c4539",
    "50",
    "PUSH EAX"
  ],
  [
    "100c453a",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c453d",
    "e83ed7ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c4542",
    "eb1b",
    "JMP 0x100c455f"
  ],
  [
    "100c4544",
    "68102b0f10",
    "PUSH 0x100f2b10"
  ],
  [
    "100c4549",
    "eb0c",
    "JMP 0x100c4557"
  ],
  [
    "100c454b",
    "68082b0f10",
    "PUSH 0x100f2b08"
  ],
  [
    "100c4550",
    "eb05",
    "JMP 0x100c4557"
  ],
  [
    "100c4552",
    "68002b0f10",
    "PUSH 0x100f2b00"
  ],
  [
    "100c4557",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c455a",
    "e887e3ffff",
    "CALL 0x100c28e6"
  ],
  [
    "100c455f",
    "8365f000",
    "AND dword ptr [EBP + -0x10],0x0"
  ],
  [
    "100c4563",
    "2175f4",
    "AND dword ptr [EBP + -0xc],ESI"
  ],
  [
    "100c4566",
    "85db",
    "TEST EBX,EBX"
  ],
  [
    "100c4568",
    "740c",
    "JZ 0x100c4576"
  ],
  [
    "100c456a",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100c456d",
    "50",
    "PUSH EAX"
  ],
  [
    "100c456e",
    "8d4df0",
    "LEA ECX,[EBP + -0x10]"
  ],
  [
    "100c4571",
    "e80ad7ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c4576",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100c4579",
    "50",
    "PUSH EAX"
  ],
  [
    "100c457a",
    "e842feffff",
    "CALL 0x100c43c1"
  ],
  [
    "100c457f",
    "59",
    "POP ECX"
  ],
  [
    "100c4580",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100c4583",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4584",
    "8d4df0",
    "LEA ECX,[EBP + -0x10]"
  ],
  [
    "100c4587",
    "e851e2ffff",
    "CALL 0x100c27dd"
  ],
  [
    "100c458c",
    "8b4d08",
    "MOV ECX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c458f",
    "8d45f0",
    "LEA EAX,[EBP + -0x10]"
  ],
  [
    "100c4592",
    "50",
    "PUSH EAX"
  ],
  [
    "100c4593",
    "e8d2d5ffff",
    "CALL 0x100c1b6a"
  ],
  [
    "100c4598",
    "eb13",
    "JMP 0x100c45ad"
  ],
  [
    "100c459a",
    "8b4d08",
    "MOV ECX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c459d",
    "ff0d3c6f2f10",
    "DEC dword ptr [0x102f6f3c]"
  ],
  [
    "100c45a3",
    "68f22a0f10",
    "PUSH 0x100f2af2"
  ],
  [
    "100c45a8",
    "e802e0ffff",
    "CALL 0x100c25af"
  ],
  [
    "100c45ad",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c45b0",
    "5e",
    "POP ESI"
  ],
  [
    "100c45b1",
    "5b",
    "POP EBX"
  ],
  [
    "100c45b2",
    "c9",
    "LEAVE"
  ],
  [
    "100c45b3",
    "c3",
    "RET"
  ],
  [
    "100c6288",
    "55",
    "PUSH EBP"
  ],
  [
    "100c6289",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100c628b",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c6290",
    "8a00",
    "MOV AL,byte ptr [EAX]"
  ],
  [
    "100c6292",
    "83ec24",
    "SUB ESP,0x24"
  ],
  [
    "100c6295",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100c6297",
    "53",
    "PUSH EBX"
  ],
  [
    "100c6298",
    "56",
    "PUSH ESI"
  ],
  [
    "100c6299",
    "57",
    "PUSH EDI"
  ],
  [
    "100c629a",
    "0f8432030000",
    "JZ 0x100c65d2"
  ],
  [
    "100c62a0",
    "ff053c6f2f10",
    "INC dword ptr [0x102f6f3c]"
  ],
  [
    "100c62a6",
    "8365f400",
    "AND dword ptr [EBP + -0xc],0x0"
  ],
  [
    "100c62aa",
    "0fb6f8",
    "MOVZX EDI,AL"
  ],
  [
    "100c62ad",
    "be00f0ffff",
    "MOV ESI,0xfffff000"
  ],
  [
    "100c62b2",
    "2175f8",
    "AND dword ptr [EBP + -0x8],ESI"
  ],
  [
    "100c62b5",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100c62b7",
    "83cbff",
    "OR EBX,0xffffffff"
  ],
  [
    "100c62ba",
    "83f84e",
    "CMP EAX,0x4e"
  ],
  [
    "100c62bd",
    "7f52",
    "JG 0x100c6311"
  ],
  [
    "100c62bf",
    "0f84fd010000",
    "JZ 0x100c64c2"
  ],
  [
    "100c62c5",
    "83e843",
    "SUB EAX,0x43"
  ],
  [
    "100c62c8",
    "83f80a",
    "CMP EAX,0xa"
  ],
  [
    "100c62cb",
    "0f87dc010000",
    "JA 0x100c64ad"
  ],
  [
    "100c62d1",
    "0fb68004660c10",
    "MOVZX EAX,byte ptr [EAX + 0x100c6604]"
  ],
  [
    "100c62d8",
    "ff2485ec650c10",
    "JMP dword ptr [EAX*0x4 + 0x100c65ec]"
  ],
  [
    "100c62df",
    "6814b60e10",
    "PUSH 0x100eb614"
  ],
  [
    "100c62e4",
    "e9b3010000",
    "JMP 0x100c649c"
  ],
  [
    "100c62e9",
    "68f8b50e10",
    "PUSH 0x100eb5f8"
  ],
  [
    "100c62ee",
    "e9a9010000",
    "JMP 0x100c649c"
  ],
  [
    "100c62f3",
    "68f4b50e10",
    "PUSH 0x100eb5f4"
  ],
  [
    "100c62f8",
    "e99f010000",
    "JMP 0x100c649c"
  ],
  [
    "100c62fd",
    "6800b60e10",
    "PUSH 0x100eb600"
  ],
  [
    "100c6302",
    "e995010000",
    "JMP 0x100c649c"
  ],
  [
    "100c6307",
    "682cb60e10",
    "PUSH 0x100eb62c"
  ],
  [
    "100c630c",
    "e98b010000",
    "JMP 0x100c649c"
  ],
  [
    "100c6311",
    "83f84f",
    "CMP EAX,0x4f"
  ],
  [
    "100c6314",
    "0f849b010000",
    "JZ 0x100c64b5"
  ],
  [
    "100c631a",
    "0f8e8d010000",
    "JLE 0x100c64ad"
  ],
  [
    "100c6320",
    "83f853",
    "CMP EAX,0x53"
  ],
  [
    "100c6323",
    "0f8e7d010000",
    "JLE 0x100c64a6"
  ],
  [
    "100c6329",
    "83f858",
    "CMP EAX,0x58"
  ],
  [
    "100c632c",
    "0f8465010000",
    "JZ 0x100c6497"
  ],
  [
    "100c6332",
    "83f85f",
    "CMP EAX,0x5f"
  ],
  [
    "100c6335",
    "0f8572010000",
    "JNZ 0x100c64ad"
  ],
  [
    "100c633b",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c6340",
    "8a00",
    "MOV AL,byte ptr [EAX]"
  ],
  [
    "100c6342",
    "ff053c6f2f10",
    "INC dword ptr [0x102f6f3c]"
  ],
  [
    "100c6348",
    "8845ff",
    "MOV byte ptr [EBP + -0x1],AL"
  ],
  [
    "100c634b",
    "0fb6c0",
    "MOVZX EAX,AL"
  ],
  [
    "100c634e",
    "83f84d",
    "CMP EAX,0x4d"
  ],
  [
    "100c6351",
    "0f8f83000000",
    "JG 0x100c63da"
  ],
  [
    "100c6357",
    "83f84c",
    "CMP EAX,0x4c"
  ],
  [
    "100c635a",
    "7d74",
    "JGE 0x100c63d0"
  ],
  [
    "100c635c",
    "83f847",
    "CMP EAX,0x47"
  ],
  [
    "100c635f",
    "7f4c",
    "JG 0x100c63ad"
  ],
  [
    "100c6361",
    "83f846",
    "CMP EAX,0x46"
  ],
  [
    "100c6364",
    "7d3d",
    "JGE 0x100c63a3"
  ],
  [
    "100c6366",
    "83f824",
    "CMP EAX,0x24"
  ],
  [
    "100c6369",
    "7416",
    "JZ 0x100c6381"
  ],
  [
    "100c636b",
    "83c0bc",
    "ADD EAX,-0x44"
  ],
  [
    "100c636e",
    "83f801",
    "CMP EAX,0x1"
  ],
  [
    "100c6371",
    "0f87b8000000",
    "JA 0x100c642f"
  ],
  [
    "100c6377",
    "68c02c0f10",
    "PUSH 0x100f2cc0"
  ],
  [
    "100c637c",
    "e91b010000",
    "JMP 0x100c649c"
  ],
  [
    "100c6381",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100c6384",
    "8d45e4",
    "LEA EAX,[EBP + -0x1c]"
  ],
  [
    "100c6387",
    "50",
    "PUSH EAX"
  ],
  [
    "100c6388",
    "e8fbfeffff",
    "CALL 0x100c6288"
  ],
  [
    "100c638d",
    "50",
    "PUSH EAX"
  ],
  [
    "100c638e",
    "68b82c0f10",
    "PUSH 0x100f2cb8"
  ],
  [
    "100c6393",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100c6396",
    "e81ac9ffff",
    "CALL 0x100c2cb5"
  ],
  [
    "100c639b",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100c639e",
    "e93f020000",
    "JMP 0x100c65e2"
  ],
  [
    "100c63a3",
    "68b02c0f10",
    "PUSH 0x100f2cb0"
  ],
  [
    "100c63a8",
    "e9ef000000",
    "JMP 0x100c649c"
  ],
  [
    "100c63ad",
    "83f848",
    "CMP EAX,0x48"
  ],
  [
    "100c63b0",
    "7c7d",
    "JL 0x100c642f"
  ],
  [
    "100c63b2",
    "83f849",
    "CMP EAX,0x49"
  ],
  [
    "100c63b5",
    "7e0f",
    "JLE 0x100c63c6"
  ],
  [
    "100c63b7",
    "83f84b",
    "CMP EAX,0x4b"
  ],
  [
    "100c63ba",
    "7f73",
    "JG 0x100c642f"
  ],
  [
    "100c63bc",
    "6808b60e10",
    "PUSH 0x100eb608"
  ],
  [
    "100c63c1",
    "e9d6000000",
    "JMP 0x100c649c"
  ],
  [
    "100c63c6",
    "68a82c0f10",
    "PUSH 0x100f2ca8"
  ],
  [
    "100c63cb",
    "e9cc000000",
    "JMP 0x100c649c"
  ],
  [
    "100c63d0",
    "689c2c0f10",
    "PUSH 0x100f2c9c"
  ],
  [
    "100c63d5",
    "e9c2000000",
    "JMP 0x100c649c"
  ],
  [
    "100c63da",
    "83f84e",
    "CMP EAX,0x4e"
  ],
  [
    "100c63dd",
    "0f84ad000000",
    "JZ 0x100c6490"
  ],
  [
    "100c63e3",
    "83f84f",
    "CMP EAX,0x4f"
  ],
  [
    "100c63e6",
    "7455",
    "JZ 0x100c643d"
  ],
  [
    "100c63e8",
    "83f857",
    "CMP EAX,0x57"
  ],
  [
    "100c63eb",
    "7449",
    "JZ 0x100c6436"
  ],
  [
    "100c63ed",
    "83c0a8",
    "ADD EAX,-0x58"
  ],
  [
    "100c63f0",
    "83f801",
    "CMP EAX,0x1"
  ],
  [
    "100c63f3",
    "773a",
    "JA 0x100c642f"
  ],
  [
    "100c63f5",
    "8d45ec",
    "LEA EAX,[EBP + -0x14]"
  ],
  [
    "100c63f8",
    "ff0d3c6f2f10",
    "DEC dword ptr [0x102f6f3c]"
  ],
  [
    "100c63fe",
    "50",
    "PUSH EAX"
  ],
  [
    "100c63ff",
    "e8b0e0ffff",
    "CALL 0x100c44b4"
  ],
  [
    "100c6404",
    "59",
    "POP ECX"
  ],
  [
    "100c6405",
    "50",
    "PUSH EAX"
  ],
  [
    "100c6406",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c6409",
    "e872b8ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c640e",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c6411",
    "e88abbffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c6416",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c6418",
    "0f84ba000000",
    "JZ 0x100c64d8"
  ],
  [
    "100c641e",
    "8d45f4",
    "LEA EAX,[EBP + -0xc]"
  ],
  [
    "100c6421",
    "8b4d08",
    "MOV ECX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c6424",
    "50",
    "PUSH EAX"
  ],
  [
    "100c6425",
    "e840b7ffff",
    "CALL 0x100c1b6a"
  ],
  [
    "100c642a",
    "e9b3010000",
    "JMP 0x100c65e2"
  ],
  [
    "100c642f",
    "68942c0f10",
    "PUSH 0x100f2c94"
  ],
  [
    "100c6434",
    "eb66",
    "JMP 0x100c649c"
  ],
  [
    "100c6436",
    "688c2c0f10",
    "PUSH 0x100f2c8c"
  ],
  [
    "100c643b",
    "eb5f",
    "JMP 0x100c649c"
  ],
  [
    "100c643d",
    "6afe",
    "PUSH -0x2"
  ],
  [
    "100c643f",
    "5b",
    "POP EBX"
  ],
  [
    "100c6440",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100c6443",
    "8365f400",
    "AND dword ptr [EBP + -0xc],0x0"
  ],
  [
    "100c6447",
    "2175f8",
    "AND dword ptr [EBP + -0x8],ESI"
  ],
  [
    "100c644a",
    "8d4dec",
    "LEA ECX,[EBP + -0x14]"
  ],
  [
    "100c644d",
    "e818b7ffff",
    "CALL 0x100c1b6a"
  ],
  [
    "100c6452",
    "83fbfe",
    "CMP EBX,-0x2"
  ],
  [
    "100c6455",
    "0f851c010000",
    "JNZ 0x100c6577"
  ],
  [
    "100c645b",
    "814df080000000",
    "OR dword ptr [EBP + -0x10],0x80"
  ],
  [
    "100c6462",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100c6464",
    "8d45ec",
    "LEA EAX,[EBP + -0x14]"
  ],
  [
    "100c6467",
    "50",
    "PUSH EAX"
  ],
  [
    "100c6468",
    "8d45f4",
    "LEA EAX,[EBP + -0xc]"
  ],
  [
    "100c646b",
    "50",
    "PUSH EAX"
  ],
  [
    "100c646c",
    "8d45e4",
    "LEA EAX,[EBP + -0x1c]"
  ],
  [
    "100c646f",
    "50",
    "PUSH EAX"
  ],
  [
    "100c6470",
    "e866fbffff",
    "CALL 0x100c5fdb"
  ],
  [
    "100c6475",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100c6478",
    "f645e880",
    "TEST byte ptr [EBP + -0x18],0x80"
  ],
  [
    "100c647c",
    "750d",
    "JNZ 0x100c648b"
  ],
  [
    "100c647e",
    "6860270f10",
    "PUSH 0x100f2760"
  ],
  [
    "100c6483",
    "8d4de4",
    "LEA ECX,[EBP + -0x1c]"
  ],
  [
    "100c6486",
    "e84bc6ffff",
    "CALL 0x100c2ad6"
  ],
  [
    "100c648b",
    "8d45e4",
    "LEA EAX,[EBP + -0x1c]"
  ],
  [
    "100c648e",
    "eb91",
    "JMP 0x100c6421"
  ],
  [
    "100c6490",
    "681cb60e10",
    "PUSH 0x100eb61c"
  ],
  [
    "100c6495",
    "eb05",
    "JMP 0x100c649c"
  ],
  [
    "100c6497",
    "682c2a0f10",
    "PUSH 0x100f2a2c"
  ],
  [
    "100c649c",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c649f",
    "e842c4ffff",
    "CALL 0x100c28e6"
  ],
  [
    "100c64a4",
    "eb32",
    "JMP 0x100c64d8"
  ],
  [
    "100c64a6",
    "8bdf",
    "MOV EBX,EDI"
  ],
  [
    "100c64a8",
    "83e303",
    "AND EBX,0x3"
  ],
  [
    "100c64ab",
    "eb22",
    "JMP 0x100c64cf"
  ],
  [
    "100c64ad",
    "8d45dc",
    "LEA EAX,[EBP + -0x24]"
  ],
  [
    "100c64b0",
    "e943ffffff",
    "JMP 0x100c63f8"
  ],
  [
    "100c64b5",
    "680c2a0f10",
    "PUSH 0x100f2a0c"
  ],
  [
    "100c64ba",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c64bd",
    "e824c4ffff",
    "CALL 0x100c28e6"
  ],
  [
    "100c64c2",
    "6824b60e10",
    "PUSH 0x100eb624"
  ],
  [
    "100c64c7",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c64ca",
    "e807c6ffff",
    "CALL 0x100c2ad6"
  ],
  [
    "100c64cf",
    "83fbff",
    "CMP EBX,-0x1"
  ],
  [
    "100c64d2",
    "0f8568ffffff",
    "JNZ 0x100c6440"
  ],
  [
    "100c64d8",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100c64da",
    "83e843",
    "SUB EAX,0x43"
  ],
  [
    "100c64dd",
    "744d",
    "JZ 0x100c652c"
  ],
  [
    "100c64df",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100c64e1",
    "59",
    "POP ECX"
  ],
  [
    "100c64e2",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100c64e4",
    "7438",
    "JZ 0x100c651e"
  ],
  [
    "100c64e6",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100c64e8",
    "7434",
    "JZ 0x100c651e"
  ],
  [
    "100c64ea",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100c64ec",
    "7430",
    "JZ 0x100c651e"
  ],
  [
    "100c64ee",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100c64f0",
    "742c",
    "JZ 0x100c651e"
  ],
  [
    "100c64f2",
    "83e814",
    "SUB EAX,0x14"
  ],
  [
    "100c64f5",
    "7553",
    "JNZ 0x100c654a"
  ],
  [
    "100c64f7",
    "0fb645ff",
    "MOVZX EAX,byte ptr [EBP + -0x1]"
  ],
  [
    "100c64fb",
    "83e845",
    "SUB EAX,0x45"
  ],
  [
    "100c64fe",
    "7410",
    "JZ 0x100c6510"
  ],
  [
    "100c6500",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100c6502",
    "740c",
    "JZ 0x100c6510"
  ],
  [
    "100c6504",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100c6506",
    "7408",
    "JZ 0x100c6510"
  ],
  [
    "100c6508",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100c650a",
    "7404",
    "JZ 0x100c6510"
  ],
  [
    "100c650c",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100c650e",
    "753a",
    "JNZ 0x100c654a"
  ],
  [
    "100c6510",
    "8d45f4",
    "LEA EAX,[EBP + -0xc]"
  ],
  [
    "100c6513",
    "50",
    "PUSH EAX"
  ],
  [
    "100c6514",
    "68002a0f10",
    "PUSH 0x100f2a00"
  ],
  [
    "100c6519",
    "8d45dc",
    "LEA EAX,[EBP + -0x24]"
  ],
  [
    "100c651c",
    "eb1a",
    "JMP 0x100c6538"
  ],
  [
    "100c651e",
    "8d45f4",
    "LEA EAX,[EBP + -0xc]"
  ],
  [
    "100c6521",
    "50",
    "PUSH EAX"
  ],
  [
    "100c6522",
    "68002a0f10",
    "PUSH 0x100f2a00"
  ],
  [
    "100c6527",
    "8d45e4",
    "LEA EAX,[EBP + -0x1c]"
  ],
  [
    "100c652a",
    "eb0c",
    "JMP 0x100c6538"
  ],
  [
    "100c652c",
    "8d45f4",
    "LEA EAX,[EBP + -0xc]"
  ],
  [
    "100c652f",
    "50",
    "PUSH EAX"
  ],
  [
    "100c6530",
    "68842c0f10",
    "PUSH 0x100f2c84"
  ],
  [
    "100c6535",
    "8d45ec",
    "LEA EAX,[EBP + -0x14]"
  ],
  [
    "100c6538",
    "50",
    "PUSH EAX"
  ],
  [
    "100c6539",
    "e877c7ffff",
    "CALL 0x100c2cb5"
  ],
  [
    "100c653e",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100c6541",
    "50",
    "PUSH EAX"
  ],
  [
    "100c6542",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c6545",
    "e836b7ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c654a",
    "8b4d0c",
    "MOV ECX,dword ptr [EBP + 0xc]"
  ],
  [
    "100c654d",
    "e84ebaffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c6552",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c6554",
    "0f85c4feffff",
    "JNZ 0x100c641e"
  ],
  [
    "100c655a",
    "51",
    "PUSH ECX"
  ],
  [
    "100c655b",
    "8d45dc",
    "LEA EAX,[EBP + -0x24]"
  ],
  [
    "100c655e",
    "6a20",
    "PUSH 0x20"
  ],
  [
    "100c6560",
    "50",
    "PUSH EAX"
  ],
  [
    "100c6561",
    "e80bc7ffff",
    "CALL 0x100c2c71"
  ],
  [
    "100c6566",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100c6569",
    "50",
    "PUSH EAX"
  ],
  [
    "100c656a",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c656d",
    "e86bc2ffff",
    "CALL 0x100c27dd"
  ],
  [
    "100c6572",
    "e9a7feffff",
    "JMP 0x100c641e"
  ],
  [
    "100c6577",
    "8b4d0c",
    "MOV ECX,dword ptr [EBP + 0xc]"
  ],
  [
    "100c657a",
    "e821baffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c657f",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c6581",
    "7438",
    "JZ 0x100c65bb"
  ],
  [
    "100c6583",
    "f6c301",
    "TEST BL,0x1"
  ],
  [
    "100c6586",
    "7421",
    "JZ 0x100c65a9"
  ],
  [
    "100c6588",
    "687c2c0f10",
    "PUSH 0x100f2c7c"
  ],
  [
    "100c658d",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c6590",
    "e851c3ffff",
    "CALL 0x100c28e6"
  ],
  [
    "100c6595",
    "f6c302",
    "TEST BL,0x2"
  ],
  [
    "100c6598",
    "7421",
    "JZ 0x100c65bb"
  ],
  [
    "100c659a",
    "68702c0f10",
    "PUSH 0x100f2c70"
  ],
  [
    "100c659f",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c65a2",
    "e82fc5ffff",
    "CALL 0x100c2ad6"
  ],
  [
    "100c65a7",
    "eb12",
    "JMP 0x100c65bb"
  ],
  [
    "100c65a9",
    "f6c302",
    "TEST BL,0x2"
  ],
  [
    "100c65ac",
    "740d",
    "JZ 0x100c65bb"
  ],
  [
    "100c65ae",
    "68642c0f10",
    "PUSH 0x100f2c64"
  ],
  [
    "100c65b3",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c65b6",
    "e82bc3ffff",
    "CALL 0x100c28e6"
  ],
  [
    "100c65bb",
    "6a2a",
    "PUSH 0x2a"
  ],
  [
    "100c65bd",
    "8d45ec",
    "LEA EAX,[EBP + -0x14]"
  ],
  [
    "100c65c0",
    "50",
    "PUSH EAX"
  ],
  [
    "100c65c1",
    "8d45f4",
    "LEA EAX,[EBP + -0xc]"
  ],
  [
    "100c65c4",
    "50",
    "PUSH EAX"
  ],
  [
    "100c65c5",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100c65c8",
    "e80efaffff",
    "CALL 0x100c5fdb"
  ],
  [
    "100c65cd",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100c65d0",
    "eb10",
    "JMP 0x100c65e2"
  ],
  [
    "100c65d2",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100c65d5",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100c65d7",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100c65da",
    "e8b4c6ffff",
    "CALL 0x100c2c93"
  ],
  [
    "100c65df",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100c65e2",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c65e5",
    "5f",
    "POP EDI"
  ],
  [
    "100c65e6",
    "5e",
    "POP ESI"
  ],
  [
    "100c65e7",
    "5b",
    "POP EBX"
  ],
  [
    "100c65e8",
    "c9",
    "LEAVE"
  ],
  [
    "100c65e9",
    "c3",
    "RET"
  ],
  [
    "100c1c80",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "100c1c82",
    "56",
    "PUSH ESI"
  ],
  [
    "100c1c83",
    "8b7004",
    "MOV ESI,dword ptr [EAX + 0x4]"
  ],
  [
    "100c1c86",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c1c88",
    "c1e11c",
    "SHL ECX,0x1c"
  ],
  [
    "100c1c8b",
    "c1f91c",
    "SAR ECX,0x1c"
  ],
  [
    "100c1c8e",
    "7405",
    "JZ 0x100c1c95"
  ],
  [
    "100c1c90",
    "83f902",
    "CMP ECX,0x2"
  ],
  [
    "100c1c93",
    "7562",
    "JNZ 0x100c1cf7"
  ],
  [
    "100c1c95",
    "8b4c2408",
    "MOV ECX,dword ptr [ESP + 0x8]"
  ],
  [
    "100c1c99",
    "8b5104",
    "MOV EDX,dword ptr [ECX + 0x4]"
  ],
  [
    "100c1c9c",
    "c1e21c",
    "SHL EDX,0x1c"
  ],
  [
    "100c1c9f",
    "c1fa1c",
    "SAR EDX,0x1c"
  ],
  [
    "100c1ca2",
    "33d6",
    "XOR EDX,ESI"
  ],
  [
    "100c1ca4",
    "83e20f",
    "AND EDX,0xf"
  ],
  [
    "100c1ca7",
    "33d6",
    "XOR EDX,ESI"
  ],
  [
    "100c1ca9",
    "895004",
    "MOV dword ptr [EAX + 0x4],EDX"
  ],
  [
    "100c1cac",
    "8b7104",
    "MOV ESI,dword ptr [ECX + 0x4]"
  ],
  [
    "100c1caf",
    "33f2",
    "XOR ESI,EDX"
  ],
  [
    "100c1cb1",
    "83e610",
    "AND ESI,0x10"
  ],
  [
    "100c1cb4",
    "33f2",
    "XOR ESI,EDX"
  ],
  [
    "100c1cb6",
    "897004",
    "MOV dword ptr [EAX + 0x4],ESI"
  ],
  [
    "100c1cb9",
    "8b5104",
    "MOV EDX,dword ptr [ECX + 0x4]"
  ],
  [
    "100c1cbc",
    "33d6",
    "XOR EDX,ESI"
  ],
  [
    "100c1cbe",
    "83e220",
    "AND EDX,0x20"
  ],
  [
    "100c1cc1",
    "33d6",
    "XOR EDX,ESI"
  ],
  [
    "100c1cc3",
    "895004",
    "MOV dword ptr [EAX + 0x4],EDX"
  ],
  [
    "100c1cc6",
    "8b7104",
    "MOV ESI,dword ptr [ECX + 0x4]"
  ],
  [
    "100c1cc9",
    "33f2",
    "XOR ESI,EDX"
  ],
  [
    "100c1ccb",
    "83e640",
    "AND ESI,0x40"
  ],
  [
    "100c1cce",
    "33f2",
    "XOR ESI,EDX"
  ],
  [
    "100c1cd0",
    "897004",
    "MOV dword ptr [EAX + 0x4],ESI"
  ],
  [
    "100c1cd3",
    "8b5104",
    "MOV EDX,dword ptr [ECX + 0x4]"
  ],
  [
    "100c1cd6",
    "33d6",
    "XOR EDX,ESI"
  ],
  [
    "100c1cd8",
    "81e280000000",
    "AND EDX,0x80"
  ],
  [
    "100c1cde",
    "33d6",
    "XOR EDX,ESI"
  ],
  [
    "100c1ce0",
    "895004",
    "MOV dword ptr [EAX + 0x4],EDX"
  ],
  [
    "100c1ce3",
    "8b7104",
    "MOV ESI,dword ptr [ECX + 0x4]"
  ],
  [
    "100c1ce6",
    "33f2",
    "XOR ESI,EDX"
  ],
  [
    "100c1ce8",
    "81e600080000",
    "AND ESI,0x800"
  ],
  [
    "100c1cee",
    "33f2",
    "XOR ESI,EDX"
  ],
  [
    "100c1cf0",
    "897004",
    "MOV dword ptr [EAX + 0x4],ESI"
  ],
  [
    "100c1cf3",
    "8b09",
    "MOV ECX,dword ptr [ECX]"
  ],
  [
    "100c1cf5",
    "8908",
    "MOV dword ptr [EAX],ECX"
  ],
  [
    "100c1cf7",
    "5e",
    "POP ESI"
  ],
  [
    "100c1cf8",
    "c20400",
    "RET 0x4"
  ],
  [
    "100c29ed",
    "56",
    "PUSH ESI"
  ],
  [
    "100c29ee",
    "8b742408",
    "MOV ESI,dword ptr [ESP + 0x8]"
  ],
  [
    "100c29f2",
    "51",
    "PUSH ECX"
  ],
  [
    "100c29f3",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c29f5",
    "e870f1ffff",
    "CALL 0x100c1b6a"
  ],
  [
    "100c29fa",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c29fc",
    "e89ff5ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c2a01",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c2a03",
    "740b",
    "JZ 0x100c2a10"
  ],
  [
    "100c2a05",
    "ff74240c",
    "PUSH dword ptr [ESP + 0xc]"
  ],
  [
    "100c2a09",
    "e872f2ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c2a0e",
    "eb28",
    "JMP 0x100c2a38"
  ],
  [
    "100c2a10",
    "8b4c240c",
    "MOV ECX,dword ptr [ESP + 0xc]"
  ],
  [
    "100c2a14",
    "e887f5ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c2a19",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c2a1b",
    "7413",
    "JZ 0x100c2a30"
  ],
  [
    "100c2a1d",
    "8b4104",
    "MOV EAX,dword ptr [ECX + 0x4]"
  ],
  [
    "100c2a20",
    "c1e01c",
    "SHL EAX,0x1c"
  ],
  [
    "100c2a23",
    "c1f81c",
    "SAR EAX,0x1c"
  ],
  [
    "100c2a26",
    "50",
    "PUSH EAX"
  ],
  [
    "100c2a27",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c2a29",
    "e8d4f9ffff",
    "CALL 0x100c2402"
  ],
  [
    "100c2a2e",
    "eb08",
    "JMP 0x100c2a38"
  ],
  [
    "100c2a30",
    "51",
    "PUSH ECX"
  ],
  [
    "100c2a31",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100c2a33",
    "e8a5fdffff",
    "CALL 0x100c27dd"
  ],
  [
    "100c2a38",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100c2a3a",
    "5e",
    "POP ESI"
  ],
  [
    "100c2a3b",
    "c20800",
    "RET 0x8"
  ],
  [
    "100c1b6a",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "100c1b6c",
    "8b4c2404",
    "MOV ECX,dword ptr [ESP + 0x4]"
  ],
  [
    "100c1b70",
    "8b5104",
    "MOV EDX,dword ptr [ECX + 0x4]"
  ],
  [
    "100c1b73",
    "c1e21c",
    "SHL EDX,0x1c"
  ],
  [
    "100c1b76",
    "c1fa1c",
    "SAR EDX,0x1c"
  ],
  [
    "100c1b79",
    "335004",
    "XOR EDX,dword ptr [EAX + 0x4]"
  ],
  [
    "100c1b7c",
    "56",
    "PUSH ESI"
  ],
  [
    "100c1b7d",
    "83e20f",
    "AND EDX,0xf"
  ],
  [
    "100c1b80",
    "315004",
    "XOR dword ptr [EAX + 0x4],EDX"
  ],
  [
    "100c1b83",
    "8b5104",
    "MOV EDX,dword ptr [ECX + 0x4]"
  ],
  [
    "100c1b86",
    "8b7004",
    "MOV ESI,dword ptr [EAX + 0x4]"
  ],
  [
    "100c1b89",
    "33d6",
    "XOR EDX,ESI"
  ],
  [
    "100c1b8b",
    "83e210",
    "AND EDX,0x10"
  ],
  [
    "100c1b8e",
    "33d6",
    "XOR EDX,ESI"
  ],
  [
    "100c1b90",
    "895004",
    "MOV dword ptr [EAX + 0x4],EDX"
  ],
  [
    "100c1b93",
    "8b7104",
    "MOV ESI,dword ptr [ECX + 0x4]"
  ],
  [
    "100c1b96",
    "33f2",
    "XOR ESI,EDX"
  ],
  [
    "100c1b98",
    "83e620",
    "AND ESI,0x20"
  ],
  [
    "100c1b9b",
    "33f2",
    "XOR ESI,EDX"
  ],
  [
    "100c1b9d",
    "897004",
    "MOV dword ptr [EAX + 0x4],ESI"
  ],
  [
    "100c1ba0",
    "8b5104",
    "MOV EDX,dword ptr [ECX + 0x4]"
  ],
  [
    "100c1ba3",
    "33d6",
    "XOR EDX,ESI"
  ],
  [
    "100c1ba5",
    "83e240",
    "AND EDX,0x40"
  ],
  [
    "100c1ba8",
    "33d6",
    "XOR EDX,ESI"
  ],
  [
    "100c1baa",
    "895004",
    "MOV dword ptr [EAX + 0x4],EDX"
  ],
  [
    "100c1bad",
    "8b7104",
    "MOV ESI,dword ptr [ECX + 0x4]"
  ],
  [
    "100c1bb0",
    "33f2",
    "XOR ESI,EDX"
  ],
  [
    "100c1bb2",
    "81e680000000",
    "AND ESI,0x80"
  ],
  [
    "100c1bb8",
    "33f2",
    "XOR ESI,EDX"
  ],
  [
    "100c1bba",
    "897004",
    "MOV dword ptr [EAX + 0x4],ESI"
  ],
  [
    "100c1bbd",
    "8b11",
    "MOV EDX,dword ptr [ECX]"
  ],
  [
    "100c1bbf",
    "8910",
    "MOV dword ptr [EAX],EDX"
  ],
  [
    "100c1bc1",
    "8bd6",
    "MOV EDX,ESI"
  ],
  [
    "100c1bc3",
    "335104",
    "XOR EDX,dword ptr [ECX + 0x4]"
  ],
  [
    "100c1bc6",
    "81e200010000",
    "AND EDX,0x100"
  ],
  [
    "100c1bcc",
    "315004",
    "XOR dword ptr [EAX + 0x4],EDX"
  ],
  [
    "100c1bcf",
    "8b5104",
    "MOV EDX,dword ptr [ECX + 0x4]"
  ],
  [
    "100c1bd2",
    "8b7004",
    "MOV ESI,dword ptr [EAX + 0x4]"
  ],
  [
    "100c1bd5",
    "33d6",
    "XOR EDX,ESI"
  ],
  [
    "100c1bd7",
    "81e200020000",
    "AND EDX,0x200"
  ],
  [
    "100c1bdd",
    "33d6",
    "XOR EDX,ESI"
  ],
  [
    "100c1bdf",
    "895004",
    "MOV dword ptr [EAX + 0x4],EDX"
  ],
  [
    "100c1be2",
    "8b7104",
    "MOV ESI,dword ptr [ECX + 0x4]"
  ],
  [
    "100c1be5",
    "33f2",
    "XOR ESI,EDX"
  ],
  [
    "100c1be7",
    "81e600040000",
    "AND ESI,0x400"
  ],
  [
    "100c1bed",
    "33f2",
    "XOR ESI,EDX"
  ],
  [
    "100c1bef",
    "897004",
    "MOV dword ptr [EAX + 0x4],ESI"
  ],
  [
    "100c1bf2",
    "8b4904",
    "MOV ECX,dword ptr [ECX + 0x4]"
  ],
  [
    "100c1bf5",
    "33ce",
    "XOR ECX,ESI"
  ],
  [
    "100c1bf7",
    "81e100080000",
    "AND ECX,0x800"
  ],
  [
    "100c1bfd",
    "33ce",
    "XOR ECX,ESI"
  ],
  [
    "100c1bff",
    "894804",
    "MOV dword ptr [EAX + 0x4],ECX"
  ],
  [
    "100c1c02",
    "5e",
    "POP ESI"
  ],
  [
    "100c1c03",
    "c20400",
    "RET 0x4"
  ],
  [
    "100c1fa0",
    "833900",
    "CMP dword ptr [ECX],0x0"
  ],
  [
    "100c1fa3",
    "740c",
    "JZ 0x100c1fb1"
  ],
  [
    "100c1fa5",
    "e8dfffffff",
    "CALL 0x100c1f89"
  ],
  [
    "100c1faa",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c1fac",
    "7403",
    "JZ 0x100c1fb1"
  ],
  [
    "100c1fae",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c1fb0",
    "c3",
    "RET"
  ],
  [
    "100c1fb1",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c1fb3",
    "40",
    "INC EAX"
  ],
  [
    "100c1fb4",
    "c3",
    "RET"
  ],
  [
    "100c59ab",
    "55",
    "PUSH EBP"
  ],
  [
    "100c59ac",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100c59ae",
    "83ec54",
    "SUB ESP,0x54"
  ],
  [
    "100c59b1",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c59b6",
    "8a00",
    "MOV AL,byte ptr [EAX]"
  ],
  [
    "100c59b8",
    "53",
    "PUSH EBX"
  ],
  [
    "100c59b9",
    "56",
    "PUSH ESI"
  ],
  [
    "100c59ba",
    "be00f0ffff",
    "MOV ESI,0xfffff000"
  ],
  [
    "100c59bf",
    "2175e0",
    "AND dword ptr [EBP + -0x20],ESI"
  ],
  [
    "100c59c2",
    "57",
    "PUSH EDI"
  ],
  [
    "100c59c3",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100c59c5",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100c59c7",
    "897ddc",
    "MOV dword ptr [EBP + -0x24],EDI"
  ],
  [
    "100c59ca",
    "c645ff00",
    "MOV byte ptr [EBP + -0x1],0x0"
  ],
  [
    "100c59ce",
    "0f843c040000",
    "JZ 0x100c5e10"
  ],
  [
    "100c59d4",
    "3c24",
    "CMP AL,0x24"
  ],
  [
    "100c59d6",
    "7533",
    "JNZ 0x100c5a0b"
  ],
  [
    "100c59d8",
    "ff7518",
    "PUSH dword ptr [EBP + 0x18]"
  ],
  [
    "100c59db",
    "8d45ff",
    "LEA EAX,[EBP + -0x1]"
  ],
  [
    "100c59de",
    "50",
    "PUSH EAX"
  ],
  [
    "100c59df",
    "8d4510",
    "LEA EAX,[EBP + 0x10]"
  ],
  [
    "100c59e2",
    "50",
    "PUSH EAX"
  ],
  [
    "100c59e3",
    "8d45e4",
    "LEA EAX,[EBP + -0x1c]"
  ],
  [
    "100c59e6",
    "50",
    "PUSH EAX"
  ],
  [
    "100c59e7",
    "e89ed6ffff",
    "CALL 0x100c308a"
  ],
  [
    "100c59ec",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100c59ef",
    "8d4de4",
    "LEA ECX,[EBP + -0x1c]"
  ],
  [
    "100c59f2",
    "e8a9c5ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c59f7",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c59f9",
    "7510",
    "JNZ 0x100c5a0b"
  ],
  [
    "100c59fb",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "100c59fd",
    "8b4d08",
    "MOV ECX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c5a00",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5a01",
    "e864c1ffff",
    "CALL 0x100c1b6a"
  ],
  [
    "100c5a06",
    "e97c040000",
    "JMP 0x100c5e87"
  ],
  [
    "100c5a0b",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c5a10",
    "8a00",
    "MOV AL,byte ptr [EAX]"
  ],
  [
    "100c5a12",
    "33c9",
    "XOR ECX,ECX"
  ],
  [
    "100c5a14",
    "3c41",
    "CMP AL,0x41"
  ],
  [
    "100c5a16",
    "0f9cc1",
    "SETL CL"
  ],
  [
    "100c5a19",
    "2175f0",
    "AND dword ptr [EBP + -0x10],ESI"
  ],
  [
    "100c5a1c",
    "0fbed8",
    "MOVSX EBX,AL"
  ],
  [
    "100c5a1f",
    "6a20",
    "PUSH 0x20"
  ],
  [
    "100c5a21",
    "897dec",
    "MOV dword ptr [EBP + -0x14],EDI"
  ],
  [
    "100c5a24",
    "49",
    "DEC ECX"
  ],
  [
    "100c5a25",
    "83e12b",
    "AND ECX,0x2b"
  ],
  [
    "100c5a28",
    "83c116",
    "ADD ECX,0x16"
  ],
  [
    "100c5a2b",
    "2bd9",
    "SUB EBX,ECX"
  ],
  [
    "100c5a2d",
    "2175e8",
    "AND dword ptr [EBP + -0x18],ESI"
  ],
  [
    "100c5a30",
    "897de4",
    "MOV dword ptr [EBP + -0x1c],EDI"
  ],
  [
    "100c5a33",
    "5e",
    "POP ESI"
  ],
  [
    "100c5a34",
    "8bc3",
    "MOV EAX,EBX"
  ],
  [
    "100c5a36",
    "83e804",
    "SUB EAX,0x4"
  ],
  [
    "100c5a39",
    "0f84aa000000",
    "JZ 0x100c5ae9"
  ],
  [
    "100c5a3f",
    "48",
    "DEC EAX"
  ],
  [
    "100c5a40",
    "745b",
    "JZ 0x100c5a9d"
  ],
  [
    "100c5a42",
    "83e803",
    "SUB EAX,0x3"
  ],
  [
    "100c5a45",
    "0f8541010000",
    "JNZ 0x100c5b8c"
  ],
  [
    "100c5a4b",
    "a14c6f2f10",
    "MOV EAX,[0x102f6f4c]"
  ],
  [
    "100c5a50",
    "d1e8",
    "SHR EAX,0x1"
  ],
  [
    "100c5a52",
    "f7d0",
    "NOT EAX"
  ],
  [
    "100c5a54",
    "a801",
    "TEST AL,0x1"
  ],
  [
    "100c5a56",
    "0f84da000000",
    "JZ 0x100c5b36"
  ],
  [
    "100c5a5c",
    "8d4dec",
    "LEA ECX,[EBP + -0x14]"
  ],
  [
    "100c5a5f",
    "e83cc5ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c5a64",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5a66",
    "6a08",
    "PUSH 0x8"
  ],
  [
    "100c5a68",
    "0f85b7000000",
    "JNZ 0x100c5b25"
  ],
  [
    "100c5a6e",
    "e83bc0ffff",
    "CALL 0x100c1aae"
  ],
  [
    "100c5a73",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "100c5a76",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5a77",
    "8d45d4",
    "LEA EAX,[EBP + -0x2c]"
  ],
  [
    "100c5a7a",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5a7b",
    "8d45cc",
    "LEA EAX,[EBP + -0x34]"
  ],
  [
    "100c5a7e",
    "56",
    "PUSH ESI"
  ],
  [
    "100c5a7f",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5a80",
    "8d4dec",
    "LEA ECX,[EBP + -0x14]"
  ],
  [
    "100c5a83",
    "e84fd2ffff",
    "CALL 0x100c2cd7"
  ],
  [
    "100c5a88",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c5a8a",
    "e876d2ffff",
    "CALL 0x100c2d05"
  ],
  [
    "100c5a8f",
    "8d4dec",
    "LEA ECX,[EBP + -0x14]"
  ],
  [
    "100c5a92",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5a93",
    "e8e8c1ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c5a98",
    "e999000000",
    "JMP 0x100c5b36"
  ],
  [
    "100c5a9d",
    "a14c6f2f10",
    "MOV EAX,[0x102f6f4c]"
  ],
  [
    "100c5aa2",
    "d1e8",
    "SHR EAX,0x1"
  ],
  [
    "100c5aa4",
    "f7d0",
    "NOT EAX"
  ],
  [
    "100c5aa6",
    "a801",
    "TEST AL,0x1"
  ],
  [
    "100c5aa8",
    "0f8488000000",
    "JZ 0x100c5b36"
  ],
  [
    "100c5aae",
    "8d4de4",
    "LEA ECX,[EBP + -0x1c]"
  ],
  [
    "100c5ab1",
    "e8eac4ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c5ab6",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5ab8",
    "6a09",
    "PUSH 0x9"
  ],
  [
    "100c5aba",
    "7523",
    "JNZ 0x100c5adf"
  ],
  [
    "100c5abc",
    "e8edbfffff",
    "CALL 0x100c1aae"
  ],
  [
    "100c5ac1",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "100c5ac4",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5ac5",
    "8d45c4",
    "LEA EAX,[EBP + -0x3c]"
  ],
  [
    "100c5ac8",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5ac9",
    "56",
    "PUSH ESI"
  ],
  [
    "100c5aca",
    "8d45bc",
    "LEA EAX,[EBP + -0x44]"
  ],
  [
    "100c5acd",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5ace",
    "e804d2ffff",
    "CALL 0x100c2cd7"
  ],
  [
    "100c5ad3",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c5ad5",
    "e82bd2ffff",
    "CALL 0x100c2d05"
  ],
  [
    "100c5ada",
    "8d4de4",
    "LEA ECX,[EBP + -0x1c]"
  ],
  [
    "100c5add",
    "ebb3",
    "JMP 0x100c5a92"
  ],
  [
    "100c5adf",
    "e8cabfffff",
    "CALL 0x100c1aae"
  ],
  [
    "100c5ae4",
    "8d4de4",
    "LEA ECX,[EBP + -0x1c]"
  ],
  [
    "100c5ae7",
    "eb44",
    "JMP 0x100c5b2d"
  ],
  [
    "100c5ae9",
    "a14c6f2f10",
    "MOV EAX,[0x102f6f4c]"
  ],
  [
    "100c5aee",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c5af0",
    "d1e9",
    "SHR ECX,0x1"
  ],
  [
    "100c5af2",
    "f7d1",
    "NOT ECX"
  ],
  [
    "100c5af4",
    "f6c101",
    "TEST CL,0x1"
  ],
  [
    "100c5af7",
    "743d",
    "JZ 0x100c5b36"
  ],
  [
    "100c5af9",
    "c1e811",
    "SHR EAX,0x11"
  ],
  [
    "100c5afc",
    "f7d0",
    "NOT EAX"
  ],
  [
    "100c5afe",
    "a801",
    "TEST AL,0x1"
  ],
  [
    "100c5b00",
    "7434",
    "JZ 0x100c5b36"
  ],
  [
    "100c5b02",
    "8d4dec",
    "LEA ECX,[EBP + -0x14]"
  ],
  [
    "100c5b05",
    "e896c4ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c5b0a",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5b0c",
    "6a07",
    "PUSH 0x7"
  ],
  [
    "100c5b0e",
    "7515",
    "JNZ 0x100c5b25"
  ],
  [
    "100c5b10",
    "e899bfffff",
    "CALL 0x100c1aae"
  ],
  [
    "100c5b15",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "100c5b18",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5b19",
    "8d45b4",
    "LEA EAX,[EBP + -0x4c]"
  ],
  [
    "100c5b1c",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5b1d",
    "8d45ac",
    "LEA EAX,[EBP + -0x54]"
  ],
  [
    "100c5b20",
    "e959ffffff",
    "JMP 0x100c5a7e"
  ],
  [
    "100c5b25",
    "e884bfffff",
    "CALL 0x100c1aae"
  ],
  [
    "100c5b2a",
    "8d4dec",
    "LEA ECX,[EBP + -0x14]"
  ],
  [
    "100c5b2d",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "100c5b30",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5b31",
    "e8b0cdffff",
    "CALL 0x100c28e6"
  ],
  [
    "100c5b36",
    "ff053c6f2f10",
    "INC dword ptr [0x102f6f3c]"
  ],
  [
    "100c5b3c",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c5b41",
    "803824",
    "CMP byte ptr [EAX],0x24"
  ],
  [
    "100c5b44",
    "7527",
    "JNZ 0x100c5b6d"
  ],
  [
    "100c5b46",
    "ff7518",
    "PUSH dword ptr [EBP + 0x18]"
  ],
  [
    "100c5b49",
    "8d45ff",
    "LEA EAX,[EBP + -0x1]"
  ],
  [
    "100c5b4c",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5b4d",
    "8d4510",
    "LEA EAX,[EBP + 0x10]"
  ],
  [
    "100c5b50",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5b51",
    "8d45f4",
    "LEA EAX,[EBP + -0xc]"
  ],
  [
    "100c5b54",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5b55",
    "e830d5ffff",
    "CALL 0x100c308a"
  ],
  [
    "100c5b5a",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100c5b5d",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c5b60",
    "e83bc4ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c5b65",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5b67",
    "0f849b020000",
    "JZ 0x100c5e08"
  ],
  [
    "100c5b6d",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c5b72",
    "8a00",
    "MOV AL,byte ptr [EAX]"
  ],
  [
    "100c5b74",
    "33c9",
    "XOR ECX,ECX"
  ],
  [
    "100c5b76",
    "3c41",
    "CMP AL,0x41"
  ],
  [
    "100c5b78",
    "0f9cc1",
    "SETL CL"
  ],
  [
    "100c5b7b",
    "0fbed8",
    "MOVSX EBX,AL"
  ],
  [
    "100c5b7e",
    "49",
    "DEC ECX"
  ],
  [
    "100c5b7f",
    "83e12b",
    "AND ECX,0x2b"
  ],
  [
    "100c5b82",
    "83c116",
    "ADD ECX,0x16"
  ],
  [
    "100c5b85",
    "2bd9",
    "SUB EBX,ECX"
  ],
  [
    "100c5b87",
    "e9a8feffff",
    "JMP 0x100c5a34"
  ],
  [
    "100c5b8c",
    "ff053c6f2f10",
    "INC dword ptr [0x102f6f3c]"
  ],
  [
    "100c5b92",
    "83fb1f",
    "CMP EBX,0x1f"
  ],
  [
    "100c5b95",
    "0f8790000000",
    "JA 0x100c5c2b"
  ],
  [
    "100c5b9b",
    "ff7510",
    "PUSH dword ptr [EBP + 0x10]"
  ],
  [
    "100c5b9e",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c5ba1",
    "e8e3c9ffff",
    "CALL 0x100c2589"
  ],
  [
    "100c5ba6",
    "8d45f4",
    "LEA EAX,[EBP + -0xc]"
  ],
  [
    "100c5ba9",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5baa",
    "8d45ac",
    "LEA EAX,[EBP + -0x54]"
  ],
  [
    "100c5bad",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5bae",
    "8d4ddc",
    "LEA ECX,[EBP + -0x24]"
  ],
  [
    "100c5bb1",
    "e837ceffff",
    "CALL 0x100c29ed"
  ],
  [
    "100c5bb6",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5bb7",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c5bba",
    "e8c1c0ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c5bbf",
    "8d4dec",
    "LEA ECX,[EBP + -0x14]"
  ],
  [
    "100c5bc2",
    "e8d9c3ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c5bc7",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5bc9",
    "7524",
    "JNZ 0x100c5bef"
  ],
  [
    "100c5bcb",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "100c5bcd",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5bce",
    "8d45ac",
    "LEA EAX,[EBP + -0x54]"
  ],
  [
    "100c5bd1",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5bd2",
    "56",
    "PUSH ESI"
  ],
  [
    "100c5bd3",
    "8d45b4",
    "LEA EAX,[EBP + -0x4c]"
  ],
  [
    "100c5bd6",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5bd7",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c5bda",
    "e8f8d0ffff",
    "CALL 0x100c2cd7"
  ],
  [
    "100c5bdf",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c5be1",
    "e807ceffff",
    "CALL 0x100c29ed"
  ],
  [
    "100c5be6",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5be7",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c5bea",
    "e891c0ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c5bef",
    "8d4de4",
    "LEA ECX,[EBP + -0x1c]"
  ],
  [
    "100c5bf2",
    "e8a9c3ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c5bf7",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5bf9",
    "7522",
    "JNZ 0x100c5c1d"
  ],
  [
    "100c5bfb",
    "8d45f4",
    "LEA EAX,[EBP + -0xc]"
  ],
  [
    "100c5bfe",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5bff",
    "8d45ac",
    "LEA EAX,[EBP + -0x54]"
  ],
  [
    "100c5c02",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5c03",
    "56",
    "PUSH ESI"
  ],
  [
    "100c5c04",
    "8d45b4",
    "LEA EAX,[EBP + -0x4c]"
  ],
  [
    "100c5c07",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5c08",
    "e8cad0ffff",
    "CALL 0x100c2cd7"
  ],
  [
    "100c5c0d",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c5c0f",
    "e8d9cdffff",
    "CALL 0x100c29ed"
  ],
  [
    "100c5c14",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5c15",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c5c18",
    "e863c0ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c5c1d",
    "f6c310",
    "TEST BL,0x10"
  ],
  [
    "100c5c20",
    "0f84ad000000",
    "JZ 0x100c5cd3"
  ],
  [
    "100c5c26",
    "397d18",
    "CMP dword ptr [EBP + 0x18],EDI"
  ],
  [
    "100c5c29",
    "7407",
    "JZ 0x100c5c32"
  ],
  [
    "100c5c2b",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100c5c2d",
    "e94d020000",
    "JMP 0x100c5e7f"
  ],
  [
    "100c5c32",
    "807d1000",
    "CMP byte ptr [EBP + 0x10],0x0"
  ],
  [
    "100c5c36",
    "7459",
    "JZ 0x100c5c91"
  ],
  [
    "100c5c38",
    "8d45f4",
    "LEA EAX,[EBP + -0xc]"
  ],
  [
    "100c5c3b",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5c3c",
    "8d45ac",
    "LEA EAX,[EBP + -0x54]"
  ],
  [
    "100c5c3f",
    "68ec2a0f10",
    "PUSH 0x100f2aec"
  ],
  [
    "100c5c44",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5c45",
    "e86bd0ffff",
    "CALL 0x100c2cb5"
  ],
  [
    "100c5c4a",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100c5c4d",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5c4e",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c5c51",
    "e82ac0ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c5c56",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c5c5b",
    "803800",
    "CMP byte ptr [EAX],0x0"
  ],
  [
    "100c5c5e",
    "8d45f4",
    "LEA EAX,[EBP + -0xc]"
  ],
  [
    "100c5c61",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5c62",
    "8d45ac",
    "LEA EAX,[EBP + -0x54]"
  ],
  [
    "100c5c65",
    "7414",
    "JZ 0x100c5c7b"
  ],
  [
    "100c5c67",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5c68",
    "8d45b4",
    "LEA EAX,[EBP + -0x4c]"
  ],
  [
    "100c5c6b",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5c6c",
    "e86ef7ffff",
    "CALL 0x100c53df"
  ],
  [
    "100c5c71",
    "59",
    "POP ECX"
  ],
  [
    "100c5c72",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c5c74",
    "e874cdffff",
    "CALL 0x100c29ed"
  ],
  [
    "100c5c79",
    "eb0b",
    "JMP 0x100c5c86"
  ],
  [
    "100c5c7b",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100c5c7d",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5c7e",
    "e810d0ffff",
    "CALL 0x100c2c93"
  ],
  [
    "100c5c83",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100c5c86",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5c87",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c5c8a",
    "e8f1bfffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c5c8f",
    "eb1d",
    "JMP 0x100c5cae"
  ],
  [
    "100c5c91",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c5c96",
    "803800",
    "CMP byte ptr [EAX],0x0"
  ],
  [
    "100c5c99",
    "741e",
    "JZ 0x100c5cb9"
  ],
  [
    "100c5c9b",
    "8d45ac",
    "LEA EAX,[EBP + -0x54]"
  ],
  [
    "100c5c9e",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5c9f",
    "e83bf7ffff",
    "CALL 0x100c53df"
  ],
  [
    "100c5ca4",
    "59",
    "POP ECX"
  ],
  [
    "100c5ca5",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5ca6",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c5ca9",
    "e82bc4ffff",
    "CALL 0x100c20d9"
  ],
  [
    "100c5cae",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c5cb3",
    "8a00",
    "MOV AL,byte ptr [EAX]"
  ],
  [
    "100c5cb5",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100c5cb7",
    "750c",
    "JNZ 0x100c5cc5"
  ],
  [
    "100c5cb9",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100c5cbb",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c5cbe",
    "e83fc7ffff",
    "CALL 0x100c2402"
  ],
  [
    "100c5cc3",
    "eb0e",
    "JMP 0x100c5cd3"
  ],
  [
    "100c5cc5",
    "ff053c6f2f10",
    "INC dword ptr [0x102f6f3c]"
  ],
  [
    "100c5ccb",
    "3c40",
    "CMP AL,0x40"
  ],
  [
    "100c5ccd",
    "0f8558ffffff",
    "JNZ 0x100c5c2b"
  ],
  [
    "100c5cd3",
    "a14c6f2f10",
    "MOV EAX,[0x102f6f4c]"
  ],
  [
    "100c5cd8",
    "d1e8",
    "SHR EAX,0x1"
  ],
  [
    "100c5cda",
    "f7d0",
    "NOT EAX"
  ],
  [
    "100c5cdc",
    "a801",
    "TEST AL,0x1"
  ],
  [
    "100c5cde",
    "8bc3",
    "MOV EAX,EBX"
  ],
  [
    "100c5ce0",
    "7434",
    "JZ 0x100c5d16"
  ],
  [
    "100c5ce2",
    "83e00c",
    "AND EAX,0xc"
  ],
  [
    "100c5ce5",
    "3c0c",
    "CMP AL,0xc"
  ],
  [
    "100c5ce7",
    "7547",
    "JNZ 0x100c5d30"
  ],
  [
    "100c5ce9",
    "397d18",
    "CMP dword ptr [EBP + 0x18],EDI"
  ],
  [
    "100c5cec",
    "0f8539ffffff",
    "JNZ 0x100c5c2b"
  ],
  [
    "100c5cf2",
    "8d45f4",
    "LEA EAX,[EBP + -0xc]"
  ],
  [
    "100c5cf5",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5cf6",
    "8d45ac",
    "LEA EAX,[EBP + -0x54]"
  ],
  [
    "100c5cf9",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5cfa",
    "8d45b4",
    "LEA EAX,[EBP + -0x4c]"
  ],
  [
    "100c5cfd",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5cfe",
    "e8f7e8ffff",
    "CALL 0x100c45fa"
  ],
  [
    "100c5d03",
    "59",
    "POP ECX"
  ],
  [
    "100c5d04",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c5d06",
    "e8e2ccffff",
    "CALL 0x100c29ed"
  ],
  [
    "100c5d0b",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5d0c",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c5d0f",
    "e86cbfffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c5d14",
    "eb1a",
    "JMP 0x100c5d30"
  ],
  [
    "100c5d16",
    "83e00c",
    "AND EAX,0xc"
  ],
  [
    "100c5d19",
    "3c0c",
    "CMP AL,0xc"
  ],
  [
    "100c5d1b",
    "7513",
    "JNZ 0x100c5d30"
  ],
  [
    "100c5d1d",
    "8d45ac",
    "LEA EAX,[EBP + -0x54]"
  ],
  [
    "100c5d20",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5d21",
    "e8d4e8ffff",
    "CALL 0x100c45fa"
  ],
  [
    "100c5d26",
    "59",
    "POP ECX"
  ],
  [
    "100c5d27",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5d28",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c5d2b",
    "e8a9c3ffff",
    "CALL 0x100c20d9"
  ],
  [
    "100c5d30",
    "f6c302",
    "TEST BL,0x2"
  ],
  [
    "100c5d33",
    "741e",
    "JZ 0x100c5d53"
  ],
  [
    "100c5d35",
    "8d45f4",
    "LEA EAX,[EBP + -0xc]"
  ],
  [
    "100c5d38",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5d39",
    "8d45ac",
    "LEA EAX,[EBP + -0x54]"
  ],
  [
    "100c5d3c",
    "68502c0f10",
    "PUSH 0x100f2c50"
  ],
  [
    "100c5d41",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5d42",
    "e86ecfffff",
    "CALL 0x100c2cb5"
  ],
  [
    "100c5d47",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100c5d4a",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5d4b",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c5d4e",
    "e82dbfffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c5d53",
    "f6c301",
    "TEST BL,0x1"
  ],
  [
    "100c5d56",
    "741e",
    "JZ 0x100c5d76"
  ],
  [
    "100c5d58",
    "8d45f4",
    "LEA EAX,[EBP + -0xc]"
  ],
  [
    "100c5d5b",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5d5c",
    "8d45ac",
    "LEA EAX,[EBP + -0x54]"
  ],
  [
    "100c5d5f",
    "68482c0f10",
    "PUSH 0x100f2c48"
  ],
  [
    "100c5d64",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5d65",
    "e84bcfffff",
    "CALL 0x100c2cb5"
  ],
  [
    "100c5d6a",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100c5d6d",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5d6e",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c5d71",
    "e80abfffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c5d76",
    "397d18",
    "CMP dword ptr [EBP + 0x18],EDI"
  ],
  [
    "100c5d79",
    "757c",
    "JNZ 0x100c5df7"
  ],
  [
    "100c5d7b",
    "8b550c",
    "MOV EDX,dword ptr [EBP + 0xc]"
  ],
  [
    "100c5d7e",
    "8bca",
    "MOV ECX,EDX"
  ],
  [
    "100c5d80",
    "e81bc2ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c5d85",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5d87",
    "754b",
    "JNZ 0x100c5dd4"
  ],
  [
    "100c5d89",
    "8b5a04",
    "MOV EBX,dword ptr [EDX + 0x4]"
  ],
  [
    "100c5d8c",
    "f6c310",
    "TEST BL,0x10"
  ],
  [
    "100c5d8f",
    "7534",
    "JNZ 0x100c5dc5"
  ],
  [
    "100c5d91",
    "8b4d14",
    "MOV ECX,dword ptr [EBP + 0x14]"
  ],
  [
    "100c5d94",
    "e807c2ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c5d99",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5d9b",
    "7528",
    "JNZ 0x100c5dc5"
  ],
  [
    "100c5d9d",
    "52",
    "PUSH EDX"
  ],
  [
    "100c5d9e",
    "8d45ac",
    "LEA EAX,[EBP + -0x54]"
  ],
  [
    "100c5da1",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5da2",
    "56",
    "PUSH ESI"
  ],
  [
    "100c5da3",
    "8d45b4",
    "LEA EAX,[EBP + -0x4c]"
  ],
  [
    "100c5da6",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5da7",
    "51",
    "PUSH ECX"
  ],
  [
    "100c5da8",
    "8d45bc",
    "LEA EAX,[EBP + -0x44]"
  ],
  [
    "100c5dab",
    "56",
    "PUSH ESI"
  ],
  [
    "100c5dac",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5dad",
    "e8bfceffff",
    "CALL 0x100c2c71"
  ],
  [
    "100c5db2",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100c5db5",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c5db7",
    "e81bcfffff",
    "CALL 0x100c2cd7"
  ],
  [
    "100c5dbc",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c5dbe",
    "e82accffff",
    "CALL 0x100c29ed"
  ],
  [
    "100c5dc3",
    "eb29",
    "JMP 0x100c5dee"
  ],
  [
    "100c5dc5",
    "84db",
    "TEST BL,BL"
  ],
  [
    "100c5dc7",
    "52",
    "PUSH EDX"
  ],
  [
    "100c5dc8",
    "7917",
    "JNS 0x100c5de1"
  ],
  [
    "100c5dca",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c5dcd",
    "e8aebeffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c5dd2",
    "eb23",
    "JMP 0x100c5df7"
  ],
  [
    "100c5dd4",
    "8b4d14",
    "MOV ECX,dword ptr [EBP + 0x14]"
  ],
  [
    "100c5dd7",
    "e8c4c1ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c5ddc",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5dde",
    "7517",
    "JNZ 0x100c5df7"
  ],
  [
    "100c5de0",
    "51",
    "PUSH ECX"
  ],
  [
    "100c5de1",
    "8d45ac",
    "LEA EAX,[EBP + -0x54]"
  ],
  [
    "100c5de4",
    "56",
    "PUSH ESI"
  ],
  [
    "100c5de5",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5de6",
    "e886ceffff",
    "CALL 0x100c2c71"
  ],
  [
    "100c5deb",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100c5dee",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5def",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100c5df2",
    "e8e6c9ffff",
    "CALL 0x100c27dd"
  ],
  [
    "100c5df7",
    "834df810",
    "OR dword ptr [EBP + -0x8],0x10"
  ],
  [
    "100c5dfb",
    "807dff00",
    "CMP byte ptr [EBP + -0x1],0x0"
  ],
  [
    "100c5dff",
    "7407",
    "JZ 0x100c5e08"
  ],
  [
    "100c5e01",
    "814df800020000",
    "OR dword ptr [EBP + -0x8],0x200"
  ],
  [
    "100c5e08",
    "8d45f4",
    "LEA EAX,[EBP + -0xc]"
  ],
  [
    "100c5e0b",
    "e9edfbffff",
    "JMP 0x100c59fd"
  ],
  [
    "100c5e10",
    "397d18",
    "CMP dword ptr [EBP + 0x18],EDI"
  ],
  [
    "100c5e13",
    "7568",
    "JNZ 0x100c5e7d"
  ],
  [
    "100c5e15",
    "8b550c",
    "MOV EDX,dword ptr [EBP + 0xc]"
  ],
  [
    "100c5e18",
    "8bca",
    "MOV ECX,EDX"
  ],
  [
    "100c5e1a",
    "e881c1ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c5e1f",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5e21",
    "754b",
    "JNZ 0x100c5e6e"
  ],
  [
    "100c5e23",
    "f6420410",
    "TEST byte ptr [EDX + 0x4],0x10"
  ],
  [
    "100c5e27",
    "7535",
    "JNZ 0x100c5e5e"
  ],
  [
    "100c5e29",
    "8b4d14",
    "MOV ECX,dword ptr [EBP + 0x14]"
  ],
  [
    "100c5e2c",
    "e86fc1ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c5e31",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5e33",
    "7529",
    "JNZ 0x100c5e5e"
  ],
  [
    "100c5e35",
    "52",
    "PUSH EDX"
  ],
  [
    "100c5e36",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100c5e39",
    "8d45ac",
    "LEA EAX,[EBP + -0x54]"
  ],
  [
    "100c5e3c",
    "6a20",
    "PUSH 0x20"
  ],
  [
    "100c5e3e",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5e3f",
    "51",
    "PUSH ECX"
  ],
  [
    "100c5e40",
    "8d45b4",
    "LEA EAX,[EBP + -0x4c]"
  ],
  [
    "100c5e43",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100c5e45",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5e46",
    "e848ceffff",
    "CALL 0x100c2c93"
  ],
  [
    "100c5e4b",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100c5e4e",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c5e50",
    "e882ceffff",
    "CALL 0x100c2cd7"
  ],
  [
    "100c5e55",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c5e57",
    "e891cbffff",
    "CALL 0x100c29ed"
  ],
  [
    "100c5e5c",
    "eb29",
    "JMP 0x100c5e87"
  ],
  [
    "100c5e5e",
    "52",
    "PUSH EDX"
  ],
  [
    "100c5e5f",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100c5e61",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100c5e64",
    "e82aceffff",
    "CALL 0x100c2c93"
  ],
  [
    "100c5e69",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100c5e6c",
    "eb19",
    "JMP 0x100c5e87"
  ],
  [
    "100c5e6e",
    "8b4d14",
    "MOV ECX,dword ptr [EBP + 0x14]"
  ],
  [
    "100c5e71",
    "e82ac1ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c5e76",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5e78",
    "7503",
    "JNZ 0x100c5e7d"
  ],
  [
    "100c5e7a",
    "51",
    "PUSH ECX"
  ],
  [
    "100c5e7b",
    "ebe2",
    "JMP 0x100c5e5f"
  ],
  [
    "100c5e7d",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100c5e7f",
    "8b4d08",
    "MOV ECX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c5e82",
    "e8a1c0ffff",
    "CALL 0x100c1f28"
  ],
  [
    "100c5e87",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c5e8a",
    "5f",
    "POP EDI"
  ],
  [
    "100c5e8b",
    "5e",
    "POP ESI"
  ],
  [
    "100c5e8c",
    "5b",
    "POP EBX"
  ],
  [
    "100c5e8d",
    "c9",
    "LEAVE"
  ],
  [
    "100c5e8e",
    "c3",
    "RET"
  ],
  [
    "100c2589",
    "56",
    "PUSH ESI"
  ],
  [
    "100c258a",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100c258c",
    "832600",
    "AND dword ptr [ESI],0x0"
  ],
  [
    "100c258f",
    "81660400f0ffff",
    "AND dword ptr [ESI + 0x4],0xfffff000"
  ],
  [
    "100c2596",
    "807c240800",
    "CMP byte ptr [ESP + 0x8],0x0"
  ],
  [
    "100c259b",
    "740c",
    "JZ 0x100c25a9"
  ],
  [
    "100c259d",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100c259f",
    "8d44240c",
    "LEA EAX,[ESP + 0xc]"
  ],
  [
    "100c25a3",
    "50",
    "PUSH EAX"
  ],
  [
    "100c25a4",
    "e83affffff",
    "CALL 0x100c24e3"
  ],
  [
    "100c25a9",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100c25ab",
    "5e",
    "POP ESI"
  ],
  [
    "100c25ac",
    "c20400",
    "RET 0x4"
  ],
  [
    "100c51ce",
    "55",
    "PUSH EBP"
  ],
  [
    "100c51cf",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100c51d1",
    "83ec20",
    "SUB ESP,0x20"
  ],
  [
    "100c51d4",
    "56",
    "PUSH ESI"
  ],
  [
    "100c51d5",
    "be00200000",
    "MOV ESI,0x2000"
  ],
  [
    "100c51da",
    "85354c6f2f10",
    "TEST dword ptr [0x102f6f4c],ESI"
  ],
  [
    "100c51e0",
    "57",
    "PUSH EDI"
  ],
  [
    "100c51e1",
    "742e",
    "JZ 0x100c5211"
  ],
  [
    "100c51e3",
    "81254c6f2f10ffdfffff",
    "AND dword ptr [0x102f6f4c],0xffffdfff"
  ],
  [
    "100c51ed",
    "8d45f0",
    "LEA EAX,[EBP + -0x10]"
  ],
  [
    "100c51f0",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100c51f2",
    "50",
    "PUSH EAX"
  ],
  [
    "100c51f3",
    "e855150000",
    "CALL 0x100c674d"
  ],
  [
    "100c51f8",
    "09354c6f2f10",
    "OR dword ptr [0x102f6f4c],ESI"
  ],
  [
    "100c51fe",
    "59",
    "POP ECX"
  ],
  [
    "100c51ff",
    "59",
    "POP ECX"
  ],
  [
    "100c5200",
    "8d45f0",
    "LEA EAX,[EBP + -0x10]"
  ],
  [
    "100c5203",
    "8b4d08",
    "MOV ECX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c5206",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5207",
    "e85ec9ffff",
    "CALL 0x100c1b6a"
  ],
  [
    "100c520c",
    "e9c7010000",
    "JMP 0x100c53d8"
  ],
  [
    "100c5211",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c5216",
    "8a08",
    "MOV CL,byte ptr [EAX]"
  ],
  [
    "100c5218",
    "80f93f",
    "CMP CL,0x3f"
  ],
  [
    "100c521b",
    "0f85a9010000",
    "JNZ 0x100c53ca"
  ],
  [
    "100c5221",
    "40",
    "INC EAX"
  ],
  [
    "100c5222",
    "a33c6f2f10",
    "MOV [0x102f6f3c],EAX"
  ],
  [
    "100c5227",
    "3808",
    "CMP byte ptr [EAX],CL"
  ],
  [
    "100c5229",
    "7523",
    "JNZ 0x100c524e"
  ],
  [
    "100c522b",
    "384801",
    "CMP byte ptr [EAX + 0x1],CL"
  ],
  [
    "100c522e",
    "751e",
    "JNZ 0x100c524e"
  ],
  [
    "100c5230",
    "8d45f0",
    "LEA EAX,[EBP + -0x10]"
  ],
  [
    "100c5233",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5234",
    "e895ffffff",
    "CALL 0x100c51ce"
  ],
  [
    "100c5239",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c523e",
    "59",
    "POP ECX"
  ],
  [
    "100c523f",
    "eb06",
    "JMP 0x100c5247"
  ],
  [
    "100c5241",
    "40",
    "INC EAX"
  ],
  [
    "100c5242",
    "a33c6f2f10",
    "MOV [0x102f6f3c],EAX"
  ],
  [
    "100c5247",
    "803800",
    "CMP byte ptr [EAX],0x0"
  ],
  [
    "100c524a",
    "75f5",
    "JNZ 0x100c5241"
  ],
  [
    "100c524c",
    "ebb2",
    "JMP 0x100c5200"
  ],
  [
    "100c524e",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100c5251",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5252",
    "e85df3ffff",
    "CALL 0x100c45b4"
  ],
  [
    "100c5257",
    "59",
    "POP ECX"
  ],
  [
    "100c5258",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c525b",
    "e840cdffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c5260",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5262",
    "750b",
    "JNZ 0x100c526f"
  ],
  [
    "100c5264",
    "f645fc20",
    "TEST byte ptr [EBP + -0x4],0x20"
  ],
  [
    "100c5268",
    "7405",
    "JZ 0x100c526f"
  ],
  [
    "100c526a",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100c526c",
    "47",
    "INC EDI"
  ],
  [
    "100c526d",
    "eb02",
    "JMP 0x100c5271"
  ],
  [
    "100c526f",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100c5271",
    "8b75fc",
    "MOV ESI,dword ptr [EBP + -0x4]"
  ],
  [
    "100c5274",
    "c1ee0b",
    "SHR ESI,0xb"
  ],
  [
    "100c5277",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c527a",
    "83e601",
    "AND ESI,0x1"
  ],
  [
    "100c527d",
    "e807cdffff",
    "CALL 0x100c1f89"
  ],
  [
    "100c5282",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5284",
    "7508",
    "JNZ 0x100c528e"
  ],
  [
    "100c5286",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100c5289",
    "e975ffffff",
    "JMP 0x100c5203"
  ],
  [
    "100c528e",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c5293",
    "8a00",
    "MOV AL,byte ptr [EAX]"
  ],
  [
    "100c5295",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100c5297",
    "0f8496000000",
    "JZ 0x100c5333"
  ],
  [
    "100c529d",
    "3c40",
    "CMP AL,0x40"
  ],
  [
    "100c529f",
    "0f848e000000",
    "JZ 0x100c5333"
  ],
  [
    "100c52a5",
    "8d45f0",
    "LEA EAX,[EBP + -0x10]"
  ],
  [
    "100c52a8",
    "50",
    "PUSH EAX"
  ],
  [
    "100c52a9",
    "e831010000",
    "CALL 0x100c53df"
  ],
  [
    "100c52ae",
    "59",
    "POP ECX"
  ],
  [
    "100c52af",
    "8d4df0",
    "LEA ECX,[EBP + -0x10]"
  ],
  [
    "100c52b2",
    "e8e9ccffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c52b7",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c52b9",
    "7578",
    "JNZ 0x100c5333"
  ],
  [
    "100c52bb",
    "3805546f2f10",
    "CMP byte ptr [0x102f6f54],AL"
  ],
  [
    "100c52c1",
    "7447",
    "JZ 0x100c530a"
  ],
  [
    "100c52c3",
    "a2546f2f10",
    "MOV [0x102f6f54],AL"
  ],
  [
    "100c52c8",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "100c52ca",
    "50",
    "PUSH EAX"
  ],
  [
    "100c52cb",
    "8d45e8",
    "LEA EAX,[EBP + -0x18]"
  ],
  [
    "100c52ce",
    "50",
    "PUSH EAX"
  ],
  [
    "100c52cf",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c52d2",
    "e816d7ffff",
    "CALL 0x100c29ed"
  ],
  [
    "100c52d7",
    "50",
    "PUSH EAX"
  ],
  [
    "100c52d8",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c52db",
    "e8a0c9ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c52e0",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c52e5",
    "803840",
    "CMP byte ptr [EAX],0x40"
  ],
  [
    "100c52e8",
    "7449",
    "JZ 0x100c5333"
  ],
  [
    "100c52ea",
    "8d45e8",
    "LEA EAX,[EBP + -0x18]"
  ],
  [
    "100c52ed",
    "50",
    "PUSH EAX"
  ],
  [
    "100c52ee",
    "e8ec000000",
    "CALL 0x100c53df"
  ],
  [
    "100c52f3",
    "59",
    "POP ECX"
  ],
  [
    "100c52f4",
    "50",
    "PUSH EAX"
  ],
  [
    "100c52f5",
    "8d4df0",
    "LEA ECX,[EBP + -0x10]"
  ],
  [
    "100c52f8",
    "e883c9ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c52fd",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100c5300",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5301",
    "8d45e8",
    "LEA EAX,[EBP + -0x18]"
  ],
  [
    "100c5304",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5305",
    "8d45e0",
    "LEA EAX,[EBP + -0x20]"
  ],
  [
    "100c5308",
    "eb0b",
    "JMP 0x100c5315"
  ],
  [
    "100c530a",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100c530d",
    "50",
    "PUSH EAX"
  ],
  [
    "100c530e",
    "8d45e0",
    "LEA EAX,[EBP + -0x20]"
  ],
  [
    "100c5311",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5312",
    "8d45e8",
    "LEA EAX,[EBP + -0x18]"
  ],
  [
    "100c5315",
    "68ec2a0f10",
    "PUSH 0x100f2aec"
  ],
  [
    "100c531a",
    "50",
    "PUSH EAX"
  ],
  [
    "100c531b",
    "8d4df0",
    "LEA ECX,[EBP + -0x10]"
  ],
  [
    "100c531e",
    "e8e2d9ffff",
    "CALL 0x100c2d05"
  ],
  [
    "100c5323",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c5325",
    "e8c3d6ffff",
    "CALL 0x100c29ed"
  ],
  [
    "100c532a",
    "50",
    "PUSH EAX"
  ],
  [
    "100c532b",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c532e",
    "e84dc9ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c5333",
    "85ff",
    "TEST EDI,EDI"
  ],
  [
    "100c5335",
    "7410",
    "JZ 0x100c5347"
  ],
  [
    "100c5337",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c533a",
    "e861ccffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c533f",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5341",
    "7504",
    "JNZ 0x100c5347"
  ],
  [
    "100c5343",
    "834dfc20",
    "OR dword ptr [EBP + -0x4],0x20"
  ],
  [
    "100c5347",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "100c5349",
    "ba00080000",
    "MOV EDX,0x800"
  ],
  [
    "100c534e",
    "7403",
    "JZ 0x100c5353"
  ],
  [
    "100c5350",
    "0955fc",
    "OR dword ptr [EBP + -0x4],EDX"
  ],
  [
    "100c5353",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c5356",
    "e845ccffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c535b",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c535d",
    "0f8523ffffff",
    "JNZ 0x100c5286"
  ],
  [
    "100c5363",
    "66f745fc0001",
    "TEST word ptr [EBP + -0x4],0x100"
  ],
  [
    "100c5369",
    "0f8517ffffff",
    "JNZ 0x100c5286"
  ],
  [
    "100c536f",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c5374",
    "8a00",
    "MOV AL,byte ptr [EAX]"
  ],
  [
    "100c5376",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100c5378",
    "740e",
    "JZ 0x100c5388"
  ],
  [
    "100c537a",
    "3c40",
    "CMP AL,0x40"
  ],
  [
    "100c537c",
    "7404",
    "JZ 0x100c5382"
  ],
  [
    "100c537e",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100c5380",
    "eb4e",
    "JMP 0x100c53d0"
  ],
  [
    "100c5382",
    "ff053c6f2f10",
    "INC dword ptr [0x102f6f3c]"
  ],
  [
    "100c5388",
    "66f7054c6f2f100010",
    "TEST word ptr [0x102f6f4c],0x1000"
  ],
  [
    "100c5391",
    "7427",
    "JZ 0x100c53ba"
  ],
  [
    "100c5393",
    "85ff",
    "TEST EDI,EDI"
  ],
  [
    "100c5395",
    "7523",
    "JNZ 0x100c53ba"
  ],
  [
    "100c5397",
    "8555fc",
    "TEST dword ptr [EBP + -0x4],EDX"
  ],
  [
    "100c539a",
    "751e",
    "JNZ 0x100c53ba"
  ],
  [
    "100c539c",
    "217df0",
    "AND dword ptr [EBP + -0x10],EDI"
  ],
  [
    "100c539f",
    "8165f400f0ffff",
    "AND dword ptr [EBP + -0xc],0xfffff000"
  ],
  [
    "100c53a6",
    "8d45f0",
    "LEA EAX,[EBP + -0x10]"
  ],
  [
    "100c53a9",
    "50",
    "PUSH EAX"
  ],
  [
    "100c53aa",
    "8d45e0",
    "LEA EAX,[EBP + -0x20]"
  ],
  [
    "100c53ad",
    "50",
    "PUSH EAX"
  ],
  [
    "100c53ae",
    "e8d9f2ffff",
    "CALL 0x100c468c"
  ],
  [
    "100c53b3",
    "59",
    "POP ECX"
  ],
  [
    "100c53b4",
    "59",
    "POP ECX"
  ],
  [
    "100c53b5",
    "e9ccfeffff",
    "JMP 0x100c5286"
  ],
  [
    "100c53ba",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100c53bd",
    "50",
    "PUSH EAX"
  ],
  [
    "100c53be",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100c53c1",
    "e8c6f2ffff",
    "CALL 0x100c468c"
  ],
  [
    "100c53c6",
    "59",
    "POP ECX"
  ],
  [
    "100c53c7",
    "59",
    "POP ECX"
  ],
  [
    "100c53c8",
    "eb0e",
    "JMP 0x100c53d8"
  ],
  [
    "100c53ca",
    "84c9",
    "TEST CL,CL"
  ],
  [
    "100c53cc",
    "75b0",
    "JNZ 0x100c537e"
  ],
  [
    "100c53ce",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100c53d0",
    "8b4d08",
    "MOV ECX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c53d3",
    "e850cbffff",
    "CALL 0x100c1f28"
  ],
  [
    "100c53d8",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c53db",
    "5f",
    "POP EDI"
  ],
  [
    "100c53dc",
    "5e",
    "POP ESI"
  ],
  [
    "100c53dd",
    "c9",
    "LEAVE"
  ],
  [
    "100c53de",
    "c3",
    "RET"
  ],
  [
    "100c674d",
    "55",
    "PUSH EBP"
  ],
  [
    "100c674e",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100c6750",
    "83ec18",
    "SUB ESP,0x18"
  ],
  [
    "100c6753",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100c6756",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c6759",
    "e874b7ffff",
    "CALL 0x100c1ed2"
  ],
  [
    "100c675e",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c6763",
    "8a00",
    "MOV AL,byte ptr [EAX]"
  ],
  [
    "100c6765",
    "33c9",
    "XOR ECX,ECX"
  ],
  [
    "100c6767",
    "3ac1",
    "CMP AL,CL"
  ],
  [
    "100c6769",
    "747d",
    "JZ 0x100c67e8"
  ],
  [
    "100c676b",
    "3c3f",
    "CMP AL,0x3f"
  ],
  [
    "100c676d",
    "7448",
    "JZ 0x100c67b7"
  ],
  [
    "100c676f",
    "3c58",
    "CMP AL,0x58"
  ],
  [
    "100c6771",
    "7410",
    "JZ 0x100c6783"
  ],
  [
    "100c6773",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100c6776",
    "50",
    "PUSH EAX"
  ],
  [
    "100c6777",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100c677a",
    "e890feffff",
    "CALL 0x100c660f"
  ],
  [
    "100c677f",
    "59",
    "POP ECX"
  ],
  [
    "100c6780",
    "59",
    "POP ECX"
  ],
  [
    "100c6781",
    "eb76",
    "JMP 0x100c67f9"
  ],
  [
    "100c6783",
    "ff053c6f2f10",
    "INC dword ptr [0x102f6f3c]"
  ],
  [
    "100c6789",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c678c",
    "e80fb8ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c6791",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c6793",
    "740f",
    "JZ 0x100c67a4"
  ],
  [
    "100c6795",
    "8b4d08",
    "MOV ECX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c6798",
    "682c2a0f10",
    "PUSH 0x100f2a2c"
  ],
  [
    "100c679d",
    "e80dbeffff",
    "CALL 0x100c25af"
  ],
  [
    "100c67a2",
    "eb55",
    "JMP 0x100c67f9"
  ],
  [
    "100c67a4",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100c67a7",
    "50",
    "PUSH EAX"
  ],
  [
    "100c67a8",
    "68a02a0f10",
    "PUSH 0x100f2aa0"
  ],
  [
    "100c67ad",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100c67b0",
    "e800c5ffff",
    "CALL 0x100c2cb5"
  ],
  [
    "100c67b5",
    "eb3f",
    "JMP 0x100c67f6"
  ],
  [
    "100c67b7",
    "ff053c6f2f10",
    "INC dword ptr [0x102f6f3c]"
  ],
  [
    "100c67bd",
    "8165f400f0ffff",
    "AND dword ptr [EBP + -0xc],0xfffff000"
  ],
  [
    "100c67c4",
    "51",
    "PUSH ECX"
  ],
  [
    "100c67c5",
    "8d45f0",
    "LEA EAX,[EBP + -0x10]"
  ],
  [
    "100c67c8",
    "50",
    "PUSH EAX"
  ],
  [
    "100c67c9",
    "51",
    "PUSH ECX"
  ],
  [
    "100c67ca",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100c67cd",
    "50",
    "PUSH EAX"
  ],
  [
    "100c67ce",
    "8d45e8",
    "LEA EAX,[EBP + -0x18]"
  ],
  [
    "100c67d1",
    "50",
    "PUSH EAX"
  ],
  [
    "100c67d2",
    "894df0",
    "MOV dword ptr [EBP + -0x10],ECX"
  ],
  [
    "100c67d5",
    "e8d1f1ffff",
    "CALL 0x100c59ab"
  ],
  [
    "100c67da",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100c67dd",
    "50",
    "PUSH EAX"
  ],
  [
    "100c67de",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c67e1",
    "e89ab4ffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c67e6",
    "eb8b",
    "JMP 0x100c6773"
  ],
  [
    "100c67e8",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100c67eb",
    "50",
    "PUSH EAX"
  ],
  [
    "100c67ec",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100c67ee",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100c67f1",
    "e89dc4ffff",
    "CALL 0x100c2c93"
  ],
  [
    "100c67f6",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100c67f9",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c67fc",
    "c9",
    "LEAVE"
  ],
  [
    "100c67fd",
    "c3",
    "RET"
  ],
  [
    "100c1ed2",
    "837c240400",
    "CMP dword ptr [ESP + 0x4],0x0"
  ],
  [
    "100c1ed7",
    "56",
    "PUSH ESI"
  ],
  [
    "100c1ed8",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100c1eda",
    "7438",
    "JZ 0x100c1f14"
  ],
  [
    "100c1edc",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100c1ede",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "100c1ee0",
    "b91c6f2f10",
    "MOV ECX,0x102f6f1c"
  ],
  [
    "100c1ee5",
    "e8ddfbffff",
    "CALL 0x100c1ac7"
  ],
  [
    "100c1eea",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c1eec",
    "740d",
    "JZ 0x100c1efb"
  ],
  [
    "100c1eee",
    "ff742408",
    "PUSH dword ptr [ESP + 0x8]"
  ],
  [
    "100c1ef2",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c1ef4",
    "e8a7feffff",
    "CALL 0x100c1da0"
  ],
  [
    "100c1ef9",
    "eb02",
    "JMP 0x100c1efd"
  ],
  [
    "100c1efb",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c1efd",
    "8906",
    "MOV dword ptr [ESI],EAX"
  ],
  [
    "100c1eff",
    "f7d8",
    "NEG EAX"
  ],
  [
    "100c1f01",
    "1bc0",
    "SBB EAX,EAX"
  ],
  [
    "100c1f03",
    "83e0fd",
    "AND EAX,0xfffffffd"
  ],
  [
    "100c1f06",
    "83c003",
    "ADD EAX,0x3"
  ],
  [
    "100c1f09",
    "334604",
    "XOR EAX,dword ptr [ESI + 0x4]"
  ],
  [
    "100c1f0c",
    "83e00f",
    "AND EAX,0xf"
  ],
  [
    "100c1f0f",
    "314604",
    "XOR dword ptr [ESI + 0x4],EAX"
  ],
  [
    "100c1f12",
    "eb07",
    "JMP 0x100c1f1b"
  ],
  [
    "100c1f14",
    "836604f0",
    "AND dword ptr [ESI + 0x4],0xfffffff0"
  ],
  [
    "100c1f18",
    "832600",
    "AND dword ptr [ESI],0x0"
  ],
  [
    "100c1f1b",
    "8166040ff0ffff",
    "AND dword ptr [ESI + 0x4],0xfffff00f"
  ],
  [
    "100c1f22",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100c1f24",
    "5e",
    "POP ESI"
  ],
  [
    "100c1f25",
    "c20400",
    "RET 0x4"
  ],
  [
    "100c660f",
    "55",
    "PUSH EBP"
  ],
  [
    "100c6610",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100c6612",
    "83ec18",
    "SUB ESP,0x18"
  ],
  [
    "100c6615",
    "56",
    "PUSH ESI"
  ],
  [
    "100c6616",
    "8b353c6f2f10",
    "MOV ESI,dword ptr [0x102f6f3c]"
  ],
  [
    "100c661c",
    "0fbe06",
    "MOVSX EAX,byte ptr [ESI]"
  ],
  [
    "100c661f",
    "33d2",
    "XOR EDX,EDX"
  ],
  [
    "100c6621",
    "b900f0ffff",
    "MOV ECX,0xfffff000"
  ],
  [
    "100c6626",
    "214dfc",
    "AND dword ptr [EBP + -0x4],ECX"
  ],
  [
    "100c6629",
    "2bc2",
    "SUB EAX,EDX"
  ],
  [
    "100c662b",
    "8955f8",
    "MOV dword ptr [EBP + -0x8],EDX"
  ],
  [
    "100c662e",
    "0f8403010000",
    "JZ 0x100c6737"
  ],
  [
    "100c6634",
    "83e824",
    "SUB EAX,0x24"
  ],
  [
    "100c6637",
    "746c",
    "JZ 0x100c66a5"
  ],
  [
    "100c6639",
    "83e81d",
    "SUB EAX,0x1d"
  ],
  [
    "100c663c",
    "7438",
    "JZ 0x100c6676"
  ],
  [
    "100c663e",
    "48",
    "DEC EAX"
  ],
  [
    "100c663f",
    "7412",
    "JZ 0x100c6653"
  ],
  [
    "100c6641",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100c6644",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100c6647",
    "e83cfcffff",
    "CALL 0x100c6288"
  ],
  [
    "100c664c",
    "59",
    "POP ECX"
  ],
  [
    "100c664d",
    "59",
    "POP ECX"
  ],
  [
    "100c664e",
    "e9f4000000",
    "JMP 0x100c6747"
  ],
  [
    "100c6653",
    "68642c0f10",
    "PUSH 0x100f2c64"
  ],
  [
    "100c6658",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c665b",
    "e886c2ffff",
    "CALL 0x100c28e6"
  ],
  [
    "100c6660",
    "8b4d0c",
    "MOV ECX,dword ptr [EBP + 0xc]"
  ],
  [
    "100c6663",
    "e838b9ffff",
    "CALL 0x100c1fa0"
  ],
  [
    "100c6668",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c666a",
    "750a",
    "JNZ 0x100c6676"
  ],
  [
    "100c666c",
    "6a20",
    "PUSH 0x20"
  ],
  [
    "100c666e",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c6671",
    "e8f6c3ffff",
    "CALL 0x100c2a6c"
  ],
  [
    "100c6676",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100c6679",
    "8d4df0",
    "LEA ECX,[EBP + -0x10]"
  ],
  [
    "100c667c",
    "e8e9b4ffff",
    "CALL 0x100c1b6a"
  ],
  [
    "100c6681",
    "ff053c6f2f10",
    "INC dword ptr [0x102f6f3c]"
  ],
  [
    "100c6687",
    "834df410",
    "OR dword ptr [EBP + -0xc],0x10"
  ],
  [
    "100c668b",
    "6a26",
    "PUSH 0x26"
  ],
  [
    "100c668d",
    "8d45f0",
    "LEA EAX,[EBP + -0x10]"
  ],
  [
    "100c6690",
    "50",
    "PUSH EAX"
  ],
  [
    "100c6691",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100c6694",
    "50",
    "PUSH EAX"
  ],
  [
    "100c6695",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100c6698",
    "e83ef9ffff",
    "CALL 0x100c5fdb"
  ],
  [
    "100c669d",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100c66a0",
    "e9a2000000",
    "JMP 0x100c6747"
  ],
  [
    "100c66a5",
    "8a4601",
    "MOV AL,byte ptr [ESI + 0x1]"
  ],
  [
    "100c66a8",
    "3c24",
    "CMP AL,0x24"
  ],
  [
    "100c66aa",
    "7417",
    "JZ 0x100c66c3"
  ],
  [
    "100c66ac",
    "3ac2",
    "CMP AL,DL"
  ],
  [
    "100c66ae",
    "0f8483000000",
    "JZ 0x100c6737"
  ],
  [
    "100c66b4",
    "8b4d08",
    "MOV ECX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c66b7",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100c66b9",
    "e86ab8ffff",
    "CALL 0x100c1f28"
  ],
  [
    "100c66be",
    "e984000000",
    "JMP 0x100c6747"
  ],
  [
    "100c66c3",
    "46",
    "INC ESI"
  ],
  [
    "100c66c4",
    "46",
    "INC ESI"
  ],
  [
    "100c66c5",
    "89353c6f2f10",
    "MOV dword ptr [0x102f6f3c],ESI"
  ],
  [
    "100c66cb",
    "0fbe06",
    "MOVSX EAX,byte ptr [ESI]"
  ],
  [
    "100c66ce",
    "2bc2",
    "SUB EAX,EDX"
  ],
  [
    "100c66d0",
    "7465",
    "JZ 0x100c6737"
  ],
  [
    "100c66d2",
    "83e841",
    "SUB EAX,0x41"
  ],
  [
    "100c66d5",
    "7449",
    "JZ 0x100c6720"
  ],
  [
    "100c66d7",
    "48",
    "DEC EAX"
  ],
  [
    "100c66d8",
    "7430",
    "JZ 0x100c670a"
  ],
  [
    "100c66da",
    "48",
    "DEC EAX"
  ],
  [
    "100c66db",
    "75d7",
    "JNZ 0x100c66b4"
  ],
  [
    "100c66dd",
    "214df4",
    "AND dword ptr [EBP + -0xc],ECX"
  ],
  [
    "100c66e0",
    "52",
    "PUSH EDX"
  ],
  [
    "100c66e1",
    "8d45f0",
    "LEA EAX,[EBP + -0x10]"
  ],
  [
    "100c66e4",
    "50",
    "PUSH EAX"
  ],
  [
    "100c66e5",
    "52",
    "PUSH EDX"
  ],
  [
    "100c66e6",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100c66e9",
    "8d45e8",
    "LEA EAX,[EBP + -0x18]"
  ],
  [
    "100c66ec",
    "46",
    "INC ESI"
  ],
  [
    "100c66ed",
    "50",
    "PUSH EAX"
  ],
  [
    "100c66ee",
    "89353c6f2f10",
    "MOV dword ptr [0x102f6f3c],ESI"
  ],
  [
    "100c66f4",
    "8955f0",
    "MOV dword ptr [EBP + -0x10],EDX"
  ],
  [
    "100c66f7",
    "e8aff2ffff",
    "CALL 0x100c59ab"
  ],
  [
    "100c66fc",
    "50",
    "PUSH EAX"
  ],
  [
    "100c66fd",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100c6700",
    "e883fbffff",
    "CALL 0x100c6288"
  ],
  [
    "100c6705",
    "83c41c",
    "ADD ESP,0x1c"
  ],
  [
    "100c6708",
    "eb3d",
    "JMP 0x100c6747"
  ],
  [
    "100c670a",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100c670c",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100c670f",
    "46",
    "INC ESI"
  ],
  [
    "100c6710",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100c6713",
    "89353c6f2f10",
    "MOV dword ptr [0x102f6f3c],ESI"
  ],
  [
    "100c6719",
    "e852d1ffff",
    "CALL 0x100c3870"
  ],
  [
    "100c671e",
    "eb24",
    "JMP 0x100c6744"
  ],
  [
    "100c6720",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100c6723",
    "46",
    "INC ESI"
  ],
  [
    "100c6724",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100c6727",
    "89353c6f2f10",
    "MOV dword ptr [0x102f6f3c],ESI"
  ],
  [
    "100c672d",
    "e838efffff",
    "CALL 0x100c566a"
  ],
  [
    "100c6732",
    "e915ffffff",
    "JMP 0x100c664c"
  ],
  [
    "100c6737",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100c673a",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100c673c",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100c673f",
    "e84fc5ffff",
    "CALL 0x100c2c93"
  ],
  [
    "100c6744",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100c6747",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c674a",
    "5e",
    "POP ESI"
  ],
  [
    "100c674b",
    "c9",
    "LEAVE"
  ],
  [
    "100c674c",
    "c3",
    "RET"
  ],
  [
    "100c5e8f",
    "55",
    "PUSH EBP"
  ],
  [
    "100c5e90",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100c5e92",
    "83ec20",
    "SUB ESP,0x20"
  ],
  [
    "100c5e95",
    "8365f800",
    "AND dword ptr [EBP + -0x8],0x0"
  ],
  [
    "100c5e99",
    "8365f000",
    "AND dword ptr [EBP + -0x10],0x0"
  ],
  [
    "100c5e9d",
    "b800f0ffff",
    "MOV EAX,0xfffff000"
  ],
  [
    "100c5ea2",
    "2145fc",
    "AND dword ptr [EBP + -0x4],EAX"
  ],
  [
    "100c5ea5",
    "2145f4",
    "AND dword ptr [EBP + -0xc],EAX"
  ],
  [
    "100c5ea8",
    "a1406f2f10",
    "MOV EAX,[0x102f6f40]"
  ],
  [
    "100c5ead",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5eaf",
    "7474",
    "JZ 0x100c5f25"
  ],
  [
    "100c5eb1",
    "80383f",
    "CMP byte ptr [EAX],0x3f"
  ],
  [
    "100c5eb4",
    "755c",
    "JNZ 0x100c5f12"
  ],
  [
    "100c5eb6",
    "8a4001",
    "MOV AL,byte ptr [EAX + 0x1]"
  ],
  [
    "100c5eb9",
    "3c40",
    "CMP AL,0x40"
  ],
  [
    "100c5ebb",
    "7524",
    "JNZ 0x100c5ee1"
  ],
  [
    "100c5ebd",
    "83053c6f2f1002",
    "ADD dword ptr [0x102f6f3c],0x2"
  ],
  [
    "100c5ec4",
    "8d45e8",
    "LEA EAX,[EBP + -0x18]"
  ],
  [
    "100c5ec7",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5ec8",
    "e801f3ffff",
    "CALL 0x100c51ce"
  ],
  [
    "100c5ecd",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5ece",
    "8d45e0",
    "LEA EAX,[EBP + -0x20]"
  ],
  [
    "100c5ed1",
    "685c2c0f10",
    "PUSH 0x100f2c5c"
  ],
  [
    "100c5ed6",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5ed7",
    "e8d9cdffff",
    "CALL 0x100c2cb5"
  ],
  [
    "100c5edc",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100c5edf",
    "eb3b",
    "JMP 0x100c5f1c"
  ],
  [
    "100c5ee1",
    "3c24",
    "CMP AL,0x24"
  ],
  [
    "100c5ee3",
    "752d",
    "JNZ 0x100c5f12"
  ],
  [
    "100c5ee5",
    "8d45e0",
    "LEA EAX,[EBP + -0x20]"
  ],
  [
    "100c5ee8",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100c5eea",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5eeb",
    "e894e1ffff",
    "CALL 0x100c4084"
  ],
  [
    "100c5ef0",
    "59",
    "POP ECX"
  ],
  [
    "100c5ef1",
    "59",
    "POP ECX"
  ],
  [
    "100c5ef2",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5ef3",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c5ef6",
    "e885bdffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c5efb",
    "8b45fc",
    "MOV EAX,dword ptr [EBP + -0x4]"
  ],
  [
    "100c5efe",
    "240f",
    "AND AL,0xf"
  ],
  [
    "100c5f00",
    "3c01",
    "CMP AL,0x1"
  ],
  [
    "100c5f02",
    "7521",
    "JNZ 0x100c5f25"
  ],
  [
    "100c5f04",
    "a1406f2f10",
    "MOV EAX,[0x102f6f40]"
  ],
  [
    "100c5f09",
    "8365fcf0",
    "AND dword ptr [EBP + -0x4],0xfffffff0"
  ],
  [
    "100c5f0d",
    "a33c6f2f10",
    "MOV [0x102f6f3c],EAX"
  ],
  [
    "100c5f12",
    "8d45e0",
    "LEA EAX,[EBP + -0x20]"
  ],
  [
    "100c5f15",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5f16",
    "e8b3f2ffff",
    "CALL 0x100c51ce"
  ],
  [
    "100c5f1b",
    "59",
    "POP ECX"
  ],
  [
    "100c5f1c",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5f1d",
    "8d4df8",
    "LEA ECX,[EBP + -0x8]"
  ],
  [
    "100c5f20",
    "e85bbdffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c5f25",
    "8b45fc",
    "MOV EAX,dword ptr [EBP + -0x4]"
  ],
  [
    "100c5f28",
    "c1e01c",
    "SHL EAX,0x1c"
  ],
  [
    "100c5f2b",
    "c1f81c",
    "SAR EAX,0x1c"
  ],
  [
    "100c5f2e",
    "83f803",
    "CMP EAX,0x3"
  ],
  [
    "100c5f31",
    "7504",
    "JNZ 0x100c5f37"
  ],
  [
    "100c5f33",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c5f35",
    "c9",
    "LEAVE"
  ],
  [
    "100c5f36",
    "c3",
    "RET"
  ],
  [
    "100c5f37",
    "83f801",
    "CMP EAX,0x1"
  ],
  [
    "100c5f3a",
    "7423",
    "JZ 0x100c5f5f"
  ],
  [
    "100c5f3c",
    "66f7054c6f2f100010",
    "TEST word ptr [0x102f6f4c],0x1000"
  ],
  [
    "100c5f45",
    "750a",
    "JNZ 0x100c5f51"
  ],
  [
    "100c5f47",
    "a13c6f2f10",
    "MOV EAX,[0x102f6f3c]"
  ],
  [
    "100c5f4c",
    "803800",
    "CMP byte ptr [EAX],0x0"
  ],
  [
    "100c5f4f",
    "750e",
    "JNZ 0x100c5f5f"
  ],
  [
    "100c5f51",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100c5f54",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5f55",
    "8d4df0",
    "LEA ECX,[EBP + -0x10]"
  ],
  [
    "100c5f58",
    "e823bdffff",
    "CALL 0x100c1c80"
  ],
  [
    "100c5f5d",
    "eb0e",
    "JMP 0x100c5f6d"
  ],
  [
    "100c5f5f",
    "ff35406f2f10",
    "PUSH dword ptr [0x102f6f40]"
  ],
  [
    "100c5f65",
    "8d4df0",
    "LEA ECX,[EBP + -0x10]"
  ],
  [
    "100c5f68",
    "e879c9ffff",
    "CALL 0x100c28e6"
  ],
  [
    "100c5f6d",
    "a1446f2f10",
    "MOV EAX,[0x102f6f44]"
  ],
  [
    "100c5f72",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5f74",
    "7525",
    "JNZ 0x100c5f9b"
  ],
  [
    "100c5f76",
    "8d4df0",
    "LEA ECX,[EBP + -0x10]"
  ],
  [
    "100c5f79",
    "e86dc0ffff",
    "CALL 0x100c1feb"
  ],
  [
    "100c5f7e",
    "40",
    "INC EAX"
  ],
  [
    "100c5f7f",
    "a3486f2f10",
    "MOV [0x102f6f48],EAX"
  ],
  [
    "100c5f84",
    "83c007",
    "ADD EAX,0x7"
  ],
  [
    "100c5f87",
    "83e0f8",
    "AND EAX,0xfffffff8"
  ],
  [
    "100c5f8a",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5f8b",
    "ff151c6f2f10",
    "CALL dword ptr [0x102f6f1c]"
  ],
  [
    "100c5f91",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c5f93",
    "59",
    "POP ECX"
  ],
  [
    "100c5f94",
    "a3446f2f10",
    "MOV [0x102f6f44],EAX"
  ],
  [
    "100c5f99",
    "743e",
    "JZ 0x100c5fd9"
  ],
  [
    "100c5f9b",
    "ff35486f2f10",
    "PUSH dword ptr [0x102f6f48]"
  ],
  [
    "100c5fa1",
    "8d4df0",
    "LEA ECX,[EBP + -0x10]"
  ],
  [
    "100c5fa4",
    "50",
    "PUSH EAX"
  ],
  [
    "100c5fa5",
    "e89ec0ffff",
    "CALL 0x100c2048"
  ],
  [
    "100c5faa",
    "a1446f2f10",
    "MOV EAX,[0x102f6f44]"
  ],
  [
    "100c5faf",
    "8bd0",
    "MOV EDX,EAX"
  ],
  [
    "100c5fb1",
    "eb17",
    "JMP 0x100c5fca"
  ],
  [
    "100c5fb3",
    "80f920",
    "CMP CL,0x20"
  ],
  [
    "100c5fb6",
    "750e",
    "JNZ 0x100c5fc6"
  ],
  [
    "100c5fb8",
    "40",
    "INC EAX"
  ],
  [
    "100c5fb9",
    "880a",
    "MOV byte ptr [EDX],CL"
  ],
  [
    "100c5fbb",
    "42",
    "INC EDX"
  ],
  [
    "100c5fbc",
    "eb01",
    "JMP 0x100c5fbf"
  ],
  [
    "100c5fbe",
    "40",
    "INC EAX"
  ],
  [
    "100c5fbf",
    "803820",
    "CMP byte ptr [EAX],0x20"
  ],
  [
    "100c5fc2",
    "74fa",
    "JZ 0x100c5fbe"
  ],
  [
    "100c5fc4",
    "eb04",
    "JMP 0x100c5fca"
  ],
  [
    "100c5fc6",
    "880a",
    "MOV byte ptr [EDX],CL"
  ],
  [
    "100c5fc8",
    "42",
    "INC EDX"
  ],
  [
    "100c5fc9",
    "40",
    "INC EAX"
  ],
  [
    "100c5fca",
    "8a08",
    "MOV CL,byte ptr [EAX]"
  ],
  [
    "100c5fcc",
    "84c9",
    "TEST CL,CL"
  ],
  [
    "100c5fce",
    "75e3",
    "JNZ 0x100c5fb3"
  ],
  [
    "100c5fd0",
    "8ac1",
    "MOV AL,CL"
  ],
  [
    "100c5fd2",
    "8802",
    "MOV byte ptr [EDX],AL"
  ],
  [
    "100c5fd4",
    "a1446f2f10",
    "MOV EAX,[0x102f6f44]"
  ],
  [
    "100c5fd9",
    "c9",
    "LEAVE"
  ],
  [
    "100c5fda",
    "c3",
    "RET"
  ],
  [
    "100c2351",
    "55",
    "PUSH EBP"
  ],
  [
    "100c2352",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100c2354",
    "56",
    "PUSH ESI"
  ],
  [
    "100c2355",
    "57",
    "PUSH EDI"
  ],
  [
    "100c2356",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100c2358",
    "e832feffff",
    "CALL 0x100c218f"
  ],
  [
    "100c235d",
    "8d7e3c",
    "LEA EDI,[ESI + 0x3c]"
  ],
  [
    "100c2360",
    "8bcf",
    "MOV ECX,EDI"
  ],
  [
    "100c2362",
    "e828feffff",
    "CALL 0x100c218f"
  ],
  [
    "100c2367",
    "8b450c",
    "MOV EAX,dword ptr [EBP + 0xc]"
  ],
  [
    "100c236a",
    "a3406f2f10",
    "MOV [0x102f6f40],EAX"
  ],
  [
    "100c236f",
    "a33c6f2f10",
    "MOV [0x102f6f3c],EAX"
  ],
  [
    "100c2374",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100c2377",
    "33c9",
    "XOR ECX,ECX"
  ],
  [
    "100c2379",
    "3bc1",
    "CMP EAX,ECX"
  ],
  [
    "100c237b",
    "7411",
    "JZ 0x100c238e"
  ],
  [
    "100c237d",
    "8b5510",
    "MOV EDX,dword ptr [EBP + 0x10]"
  ],
  [
    "100c2380",
    "4a",
    "DEC EDX"
  ],
  [
    "100c2381",
    "8915486f2f10",
    "MOV dword ptr [0x102f6f48],EDX"
  ],
  [
    "100c2387",
    "a3446f2f10",
    "MOV [0x102f6f44],EAX"
  ],
  [
    "100c238c",
    "eb0c",
    "JMP 0x100c239a"
  ],
  [
    "100c238e",
    "890d446f2f10",
    "MOV dword ptr [0x102f6f44],ECX"
  ],
  [
    "100c2394",
    "890d486f2f10",
    "MOV dword ptr [0x102f6f48],ECX"
  ],
  [
    "100c239a",
    "8b4518",
    "MOV EAX,dword ptr [EBP + 0x18]"
  ],
  [
    "100c239d",
    "a34c6f2f10",
    "MOV [0x102f6f4c],EAX"
  ],
  [
    "100c23a2",
    "8b4514",
    "MOV EAX,dword ptr [EBP + 0x14]"
  ],
  [
    "100c23a5",
    "893d346f2f10",
    "MOV dword ptr [0x102f6f34],EDI"
  ],
  [
    "100c23ab",
    "a3506f2f10",
    "MOV [0x102f6f50],EAX"
  ],
  [
    "100c23b0",
    "5f",
    "POP EDI"
  ],
  [
    "100c23b1",
    "8935306f2f10",
    "MOV dword ptr [0x102f6f30],ESI"
  ],
  [
    "100c23b7",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100c23b9",
    "880d546f2f10",
    "MOV byte ptr [0x102f6f54],CL"
  ],
  [
    "100c23bf",
    "5e",
    "POP ESI"
  ],
  [
    "100c23c0",
    "5d",
    "POP EBP"
  ],
  [
    "100c23c1",
    "c21400",
    "RET 0x14"
  ],
  [
    "100c218f",
    "56",
    "PUSH ESI"
  ],
  [
    "100c2190",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100c2192",
    "6a03",
    "PUSH 0x3"
  ],
  [
    "100c2194",
    "8d4e2c",
    "LEA ECX,[ESI + 0x2c]"
  ],
  [
    "100c2197",
    "e88cfdffff",
    "CALL 0x100c1f28"
  ],
  [
    "100c219c",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100c219e",
    "8d4e34",
    "LEA ECX,[ESI + 0x34]"
  ],
  [
    "100c21a1",
    "e882fdffff",
    "CALL 0x100c1f28"
  ],
  [
    "100c21a6",
    "830eff",
    "OR dword ptr [ESI],0xffffffff"
  ],
  [
    "100c21a9",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100c21ab",
    "5e",
    "POP ESI"
  ],
  [
    "100c21ac",
    "c3",
    "RET"
  ],
  [
    "100c1f28",
    "56",
    "PUSH ESI"
  ],
  [
    "100c1f29",
    "57",
    "PUSH EDI"
  ],
  [
    "100c1f2a",
    "8b7c240c",
    "MOV EDI,dword ptr [ESP + 0xc]"
  ],
  [
    "100c1f2e",
    "83ff01",
    "CMP EDI,0x1"
  ],
  [
    "100c1f31",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100c1f33",
    "7409",
    "JZ 0x100c1f3e"
  ],
  [
    "100c1f35",
    "83ff03",
    "CMP EDI,0x3"
  ],
  [
    "100c1f38",
    "7404",
    "JZ 0x100c1f3e"
  ],
  [
    "100c1f3a",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c1f3c",
    "eb02",
    "JMP 0x100c1f40"
  ],
  [
    "100c1f3e",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100c1f40",
    "8b4e04",
    "MOV ECX,dword ptr [ESI + 0x4]"
  ],
  [
    "100c1f43",
    "33c8",
    "XOR ECX,EAX"
  ],
  [
    "100c1f45",
    "83e10f",
    "AND ECX,0xf"
  ],
  [
    "100c1f48",
    "314e04",
    "XOR dword ptr [ESI + 0x4],ECX"
  ],
  [
    "100c1f4b",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100c1f4d",
    "6a10",
    "PUSH 0x10"
  ],
  [
    "100c1f4f",
    "b91c6f2f10",
    "MOV ECX,0x102f6f1c"
  ],
  [
    "100c1f54",
    "e86efbffff",
    "CALL 0x100c1ac7"
  ],
  [
    "100c1f59",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c1f5b",
    "740a",
    "JZ 0x100c1f67"
  ],
  [
    "100c1f5d",
    "57",
    "PUSH EDI"
  ],
  [
    "100c1f5e",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100c1f60",
    "e86afeffff",
    "CALL 0x100c1dcf"
  ],
  [
    "100c1f65",
    "eb02",
    "JMP 0x100c1f69"
  ],
  [
    "100c1f67",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c1f69",
    "8166040ff0ffff",
    "AND dword ptr [ESI + 0x4],0xfffff00f"
  ],
  [
    "100c1f70",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c1f72",
    "8b4e04",
    "MOV ECX,dword ptr [ESI + 0x4]"
  ],
  [
    "100c1f75",
    "8906",
    "MOV dword ptr [ESI],EAX"
  ],
  [
    "100c1f77",
    "7509",
    "JNZ 0x100c1f82"
  ],
  [
    "100c1f79",
    "83e1f3",
    "AND ECX,0xfffffff3"
  ],
  [
    "100c1f7c",
    "83c903",
    "OR ECX,0x3"
  ],
  [
    "100c1f7f",
    "894e04",
    "MOV dword ptr [ESI + 0x4],ECX"
  ],
  [
    "100c1f82",
    "5f",
    "POP EDI"
  ],
  [
    "100c1f83",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100c1f85",
    "5e",
    "POP ESI"
  ],
  [
    "100c1f86",
    "c20400",
    "RET 0x4"
  ],
  [
    "100c1ac7",
    "56",
    "PUSH ESI"
  ],
  [
    "100c1ac8",
    "57",
    "PUSH EDI"
  ],
  [
    "100c1ac9",
    "8b7c240c",
    "MOV EDI,dword ptr [ESP + 0xc]"
  ],
  [
    "100c1acd",
    "83c707",
    "ADD EDI,0x7"
  ],
  [
    "100c1ad0",
    "83e7f8",
    "AND EDI,0xfffffff8"
  ],
  [
    "100c1ad3",
    "837c241000",
    "CMP dword ptr [ESP + 0x10],0x0"
  ],
  [
    "100c1ad8",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100c1ada",
    "7406",
    "JZ 0x100c1ae2"
  ],
  [
    "100c1adc",
    "57",
    "PUSH EDI"
  ],
  [
    "100c1add",
    "ff16",
    "CALL dword ptr [ESI]"
  ],
  [
    "100c1adf",
    "59",
    "POP ECX"
  ],
  [
    "100c1ae0",
    "eb64",
    "JMP 0x100c1b46"
  ],
  [
    "100c1ae2",
    "85ff",
    "TEST EDI,EDI"
  ],
  [
    "100c1ae4",
    "7703",
    "JA 0x100c1ae9"
  ],
  [
    "100c1ae6",
    "6a08",
    "PUSH 0x8"
  ],
  [
    "100c1ae8",
    "5f",
    "POP EDI"
  ],
  [
    "100c1ae9",
    "8b4610",
    "MOV EAX,dword ptr [ESI + 0x10]"
  ],
  [
    "100c1aec",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100c1aee",
    "53",
    "PUSH EBX"
  ],
  [
    "100c1aef",
    "7345",
    "JNC 0x100c1b36"
  ],
  [
    "100c1af1",
    "bb00100000",
    "MOV EBX,0x1000"
  ],
  [
    "100c1af6",
    "3bfb",
    "CMP EDI,EBX"
  ],
  [
    "100c1af8",
    "7738",
    "JA 0x100c1b32"
  ],
  [
    "100c1afa",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100c1afc",
    "6804100000",
    "PUSH 0x1004"
  ],
  [
    "100c1b01",
    "b91c6f2f10",
    "MOV ECX,0x102f6f1c"
  ],
  [
    "100c1b06",
    "e8bcffffff",
    "CALL 0x100c1ac7"
  ],
  [
    "100c1b0b",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c1b0d",
    "7405",
    "JZ 0x100c1b14"
  ],
  [
    "100c1b0f",
    "832000",
    "AND dword ptr [EAX],0x0"
  ],
  [
    "100c1b12",
    "eb02",
    "JMP 0x100c1b16"
  ],
  [
    "100c1b14",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c1b16",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100c1b18",
    "7418",
    "JZ 0x100c1b32"
  ],
  [
    "100c1b1a",
    "8b4e0c",
    "MOV ECX,dword ptr [ESI + 0xc]"
  ],
  [
    "100c1b1d",
    "85c9",
    "TEST ECX,ECX"
  ],
  [
    "100c1b1f",
    "7404",
    "JZ 0x100c1b25"
  ],
  [
    "100c1b21",
    "8901",
    "MOV dword ptr [ECX],EAX"
  ],
  [
    "100c1b23",
    "eb03",
    "JMP 0x100c1b28"
  ],
  [
    "100c1b25",
    "894608",
    "MOV dword ptr [ESI + 0x8],EAX"
  ],
  [
    "100c1b28",
    "2bdf",
    "SUB EBX,EDI"
  ],
  [
    "100c1b2a",
    "89460c",
    "MOV dword ptr [ESI + 0xc],EAX"
  ],
  [
    "100c1b2d",
    "895e10",
    "MOV dword ptr [ESI + 0x10],EBX"
  ],
  [
    "100c1b30",
    "eb09",
    "JMP 0x100c1b3b"
  ],
  [
    "100c1b32",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100c1b34",
    "eb0f",
    "JMP 0x100c1b45"
  ],
  [
    "100c1b36",
    "2bc7",
    "SUB EAX,EDI"
  ],
  [
    "100c1b38",
    "894610",
    "MOV dword ptr [ESI + 0x10],EAX"
  ],
  [
    "100c1b3b",
    "8b460c",
    "MOV EAX,dword ptr [ESI + 0xc]"
  ],
  [
    "100c1b3e",
    "8b4e10",
    "MOV ECX,dword ptr [ESI + 0x10]"
  ],
  [
    "100c1b41",
    "8d440804",
    "LEA EAX,[EAX + ECX*0x1 + 0x4]"
  ],
  [
    "100c1b45",
    "5b",
    "POP EBX"
  ],
  [
    "100c1b46",
    "5f",
    "POP EDI"
  ],
  [
    "100c1b47",
    "5e",
    "POP ESI"
  ],
  [
    "100c1b48",
    "c20800",
    "RET 0x8"
  ],
  [
    "100c1dcf",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "100c1dd1",
    "8b4c2404",
    "MOV ECX,dword ptr [ESP + 0x4]"
  ],
  [
    "100c1dd5",
    "83600400",
    "AND dword ptr [EAX + 0x4],0x0"
  ],
  [
    "100c1dd9",
    "83f902",
    "CMP ECX,0x2"
  ],
  [
    "100c1ddc",
    "c700ac290f10",
    "MOV dword ptr [EAX],0x100f29ac"
  ],
  [
    "100c1de2",
    "894808",
    "MOV dword ptr [EAX + 0x8],ECX"
  ],
  [
    "100c1de5",
    "7505",
    "JNZ 0x100c1dec"
  ],
  [
    "100c1de7",
    "6a04",
    "PUSH 0x4"
  ],
  [
    "100c1de9",
    "59",
    "POP ECX"
  ],
  [
    "100c1dea",
    "eb02",
    "JMP 0x100c1dee"
  ],
  [
    "100c1dec",
    "33c9",
    "XOR ECX,ECX"
  ],
  [
    "100c1dee",
    "89480c",
    "MOV dword ptr [EAX + 0xc],ECX"
  ],
  [
    "100c1df1",
    "c20400",
    "RET 0x4"
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
    "10020bf0",
    "b801000000",
    "MOV EAX,0x1"
  ],
  [
    "10020bf5",
    "8405a4271410",
    "TEST byte ptr [0x101427a4],AL"
  ],
  [
    "10020bfb",
    "7537",
    "JNZ 0x10020c34"
  ],
  [
    "10020bfd",
    "0905a4271410",
    "OR dword ptr [0x101427a4],EAX"
  ],
  [
    "10020c03",
    "803d9d27141000",
    "CMP byte ptr [0x1014279d],0x0"
  ],
  [
    "10020c0a",
    "a2a1271410",
    "MOV [0x101427a1],AL"
  ],
  [
    "10020c0f",
    "750f",
    "JNZ 0x10020c20"
  ],
  [
    "10020c11",
    "a2a1271410",
    "MOV [0x101427a1],AL"
  ],
  [
    "10020c16",
    "a29d271410",
    "MOV [0x1014279d],AL"
  ],
  [
    "10020c1b",
    "a29c271410",
    "MOV [0x1014279c],AL"
  ],
  [
    "10020c20",
    "6810270e10",
    "PUSH 0x100e2710"
  ],
  [
    "10020c25",
    "c605a027141000",
    "MOV byte ptr [0x101427a0],0x0"
  ],
  [
    "10020c2c",
    "e89f660800",
    "CALL 0x100a72d0"
  ],
  [
    "10020c31",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "10020c34",
    "b8a0271410",
    "MOV EAX,0x101427a0"
  ],
  [
    "10020c39",
    "c3",
    "RET"
  ],
  [
    "1003d410",
    "55",
    "PUSH EBP"
  ],
  [
    "1003d411",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "1003d413",
    "6aff",
    "PUSH -0x1"
  ],
  [
    "1003d415",
    "6818830f10",
    "PUSH 0x100f8318"
  ],
  [
    "1003d41a",
    "68806f0a10",
    "PUSH 0x100a6f80"
  ],
  [
    "1003d41f",
    "64a100000000",
    "MOV EAX,FS:[0x0]"
  ],
  [
    "1003d425",
    "50",
    "PUSH EAX"
  ],
  [
    "1003d426",
    "64892500000000",
    "MOV dword ptr FS:[0x0],ESP"
  ],
  [
    "1003d42d",
    "83ec0c",
    "SUB ESP,0xc"
  ],
  [
    "1003d430",
    "53",
    "PUSH EBX"
  ],
  [
    "1003d431",
    "56",
    "PUSH ESI"
  ],
  [
    "1003d432",
    "57",
    "PUSH EDI"
  ],
  [
    "1003d433",
    "8965e8",
    "MOV dword ptr [EBP + -0x18],ESP"
  ],
  [
    "1003d436",
    "a000b02f10",
    "MOV AL,[0x102fb000]"
  ],
  [
    "1003d43b",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "1003d43d",
    "751f",
    "JNZ 0x1003d45e"
  ],
  [
    "1003d43f",
    "68e8030000",
    "PUSH 0x3e8"
  ],
  [
    "1003d444",
    "68189a1810",
    "PUSH 0x10189a18"
  ],
  [
    "1003d449",
    "ff156c962f10",
    "CALL dword ptr [0x102f966c]"
  ],
  [
    "1003d44f",
    "83f801",
    "CMP EAX,0x1"
  ],
  [
    "1003d452",
    "0f94c0",
    "SETZ AL"
  ],
  [
    "1003d455",
    "a200b02f10",
    "MOV [0x102fb000],AL"
  ],
  [
    "1003d45a",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "1003d45c",
    "740b",
    "JZ 0x1003d469"
  ],
  [
    "1003d45e",
    "68189a1810",
    "PUSH 0x10189a18"
  ],
  [
    "1003d463",
    "ff1504962f10",
    "CALL dword ptr [0x102f9604]"
  ],
  [
    "1003d469",
    "c745fc00000000",
    "MOV dword ptr [EBP + -0x4],0x0"
  ],
  [
    "1003d470",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "1003d473",
    "50",
    "PUSH EAX"
  ],
  [
    "1003d474",
    "e8af3bfcff",
    "CALL 0x10001028"
  ],
  [
    "1003d479",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "1003d47b",
    "8975e4",
    "MOV dword ptr [EBP + -0x1c],ESI"
  ],
  [
    "1003d47e",
    "c745fcffffffff",
    "MOV dword ptr [EBP + -0x4],0xffffffff"
  ],
  [
    "1003d485",
    "68189a1810",
    "PUSH 0x10189a18"
  ],
  [
    "1003d48a",
    "ff1508962f10",
    "CALL dword ptr [0x102f9608]"
  ],
  [
    "1003d490",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "1003d492",
    "8b4df0",
    "MOV ECX,dword ptr [EBP + -0x10]"
  ],
  [
    "1003d495",
    "64890d00000000",
    "MOV dword ptr FS:[0x0],ECX"
  ],
  [
    "1003d49c",
    "5f",
    "POP EDI"
  ],
  [
    "1003d49d",
    "5e",
    "POP ESI"
  ],
  [
    "1003d49e",
    "5b",
    "POP EBX"
  ],
  [
    "1003d49f",
    "8be5",
    "MOV ESP,EBP"
  ],
  [
    "1003d4a1",
    "5d",
    "POP EBP"
  ],
  [
    "1003d4a2",
    "c20400",
    "RET 0x4"
  ],
  [
    "1003d2f0",
    "56",
    "PUSH ESI"
  ],
  [
    "1003d2f1",
    "8b742408",
    "MOV ESI,dword ptr [ESP + 0x8]"
  ],
  [
    "1003d2f5",
    "81fe00100000",
    "CMP ESI,0x1000"
  ],
  [
    "1003d2fb",
    "770d",
    "JA 0x1003d30a"
  ],
  [
    "1003d2fd",
    "8b04b550b02f10",
    "MOV EAX,dword ptr [ESI*0x4 + 0x102fb050]"
  ],
  [
    "1003d304",
    "ffd0",
    "CALL EAX"
  ],
  [
    "1003d306",
    "5e",
    "POP ESI"
  ],
  [
    "1003d307",
    "c20400",
    "RET 0x4"
  ],
  [
    "1003d30a",
    "81fef0ff0300",
    "CMP ESI,0x3fff0"
  ],
  [
    "1003d310",
    "770a",
    "JA 0x1003d31c"
  ],
  [
    "1003d312",
    "56",
    "PUSH ESI"
  ],
  [
    "1003d313",
    "e82ca3fcff",
    "CALL 0x10007644"
  ],
  [
    "1003d318",
    "5e",
    "POP ESI"
  ],
  [
    "1003d319",
    "c20400",
    "RET 0x4"
  ],
  [
    "1003d31c",
    "833d08b02f1000",
    "CMP dword ptr [0x102fb008],0x0"
  ],
  [
    "1003d323",
    "7537",
    "JNZ 0x1003d35c"
  ],
  [
    "1003d325",
    "ff158c962f10",
    "CALL dword ptr [0x102f968c]"
  ],
  [
    "1003d32b",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1003d32d",
    "a308b02f10",
    "MOV [0x102fb008],EAX"
  ],
  [
    "1003d332",
    "7504",
    "JNZ 0x1003d338"
  ],
  [
    "1003d334",
    "5e",
    "POP ESI"
  ],
  [
    "1003d335",
    "c20400",
    "RET 0x4"
  ],
  [
    "1003d338",
    "6a04",
    "PUSH 0x4"
  ],
  [
    "1003d33a",
    "8d4c240c",
    "LEA ECX,[ESP + 0xc]"
  ],
  [
    "1003d33e",
    "51",
    "PUSH ECX"
  ],
  [
    "1003d33f",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1003d341",
    "50",
    "PUSH EAX"
  ],
  [
    "1003d342",
    "c744241802000000",
    "MOV dword ptr [ESP + 0x18],0x2"
  ],
  [
    "1003d34a",
    "ff1588962f10",
    "CALL dword ptr [0x102f9688]"
  ],
  [
    "1003d350",
    "83f801",
    "CMP EAX,0x1"
  ],
  [
    "1003d353",
    "0f94c2",
    "SETZ DL"
  ],
  [
    "1003d356",
    "881501b02f10",
    "MOV byte ptr [0x102fb001],DL"
  ],
  [
    "1003d35c",
    "a118b02f10",
    "MOV EAX,[0x102fb018]"
  ],
  [
    "1003d361",
    "81c6ff0f0000",
    "ADD ESI,0xfff"
  ],
  [
    "1003d367",
    "83c001",
    "ADD EAX,0x1"
  ],
  [
    "1003d36a",
    "81e600f0ffff",
    "AND ESI,0xfffff000"
  ],
  [
    "1003d370",
    "39051cb02f10",
    "CMP dword ptr [0x102fb01c],EAX"
  ],
  [
    "1003d376",
    "a318b02f10",
    "MOV [0x102fb018],EAX"
  ],
  [
    "1003d37b",
    "7305",
    "JNC 0x1003d382"
  ],
  [
    "1003d37d",
    "a31cb02f10",
    "MOV [0x102fb01c],EAX"
  ],
  [
    "1003d382",
    "393528b02f10",
    "CMP dword ptr [0x102fb028],ESI"
  ],
  [
    "1003d388",
    "7606",
    "JBE 0x1003d390"
  ],
  [
    "1003d38a",
    "893528b02f10",
    "MOV dword ptr [0x102fb028],ESI"
  ],
  [
    "1003d390",
    "39352cb02f10",
    "CMP dword ptr [0x102fb02c],ESI"
  ],
  [
    "1003d396",
    "7306",
    "JNC 0x1003d39e"
  ],
  [
    "1003d398",
    "89352cb02f10",
    "MOV dword ptr [0x102fb02c],ESI"
  ],
  [
    "1003d39e",
    "a108b02f10",
    "MOV EAX,[0x102fb008]"
  ],
  [
    "1003d3a3",
    "57",
    "PUSH EDI"
  ],
  [
    "1003d3a4",
    "8b3d84962f10",
    "MOV EDI,dword ptr [0x102f9684]"
  ],
  [
    "1003d3aa",
    "56",
    "PUSH ESI"
  ],
  [
    "1003d3ab",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1003d3ad",
    "50",
    "PUSH EAX"
  ],
  [
    "1003d3ae",
    "ffd7",
    "CALL EDI"
  ],
  [
    "1003d3b0",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1003d3b2",
    "7536",
    "JNZ 0x1003d3ea"
  ],
  [
    "1003d3b4",
    "8b0d08b02f10",
    "MOV ECX,dword ptr [0x102fb008]"
  ],
  [
    "1003d3ba",
    "83050cb02f1001",
    "ADD dword ptr [0x102fb00c],0x1"
  ],
  [
    "1003d3c1",
    "50",
    "PUSH EAX"
  ],
  [
    "1003d3c2",
    "51",
    "PUSH ECX"
  ],
  [
    "1003d3c3",
    "ff157c962f10",
    "CALL dword ptr [0x102f967c]"
  ],
  [
    "1003d3c9",
    "8b1508b02f10",
    "MOV EDX,dword ptr [0x102fb008]"
  ],
  [
    "1003d3cf",
    "56",
    "PUSH ESI"
  ],
  [
    "1003d3d0",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1003d3d2",
    "52",
    "PUSH EDX"
  ],
  [
    "1003d3d3",
    "a314b02f10",
    "MOV [0x102fb014],EAX"
  ],
  [
    "1003d3d8",
    "ffd7",
    "CALL EDI"
  ],
  [
    "1003d3da",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1003d3dc",
    "750c",
    "JNZ 0x1003d3ea"
  ],
  [
    "1003d3de",
    "830510b02f1001",
    "ADD dword ptr [0x102fb010],0x1"
  ],
  [
    "1003d3e5",
    "5f",
    "POP EDI"
  ],
  [
    "1003d3e6",
    "5e",
    "POP ESI"
  ],
  [
    "1003d3e7",
    "c20400",
    "RET 0x4"
  ],
  [
    "1003d3ea",
    "8b0d20b02f10",
    "MOV ECX,dword ptr [0x102fb020]"
  ],
  [
    "1003d3f0",
    "03ce",
    "ADD ECX,ESI"
  ],
  [
    "1003d3f2",
    "390d24b02f10",
    "CMP dword ptr [0x102fb024],ECX"
  ],
  [
    "1003d3f8",
    "890d20b02f10",
    "MOV dword ptr [0x102fb020],ECX"
  ],
  [
    "1003d3fe",
    "7306",
    "JNC 0x1003d406"
  ],
  [
    "1003d400",
    "890d24b02f10",
    "MOV dword ptr [0x102fb024],ECX"
  ],
  [
    "1003d406",
    "5f",
    "POP EDI"
  ],
  [
    "1003d407",
    "5e",
    "POP ESI"
  ],
  [
    "1003d408",
    "c20400",
    "RET 0x4"
  ],
  [
    "10047f10",
    "a158fd2f10",
    "MOV EAX,[0x102ffd58]"
  ],
  [
    "10047f15",
    "83c001",
    "ADD EAX,0x1"
  ],
  [
    "10047f18",
    "390560fd2f10",
    "CMP dword ptr [0x102ffd60],EAX"
  ],
  [
    "10047f1e",
    "a358fd2f10",
    "MOV [0x102ffd58],EAX"
  ],
  [
    "10047f23",
    "7305",
    "JNC 0x10047f2a"
  ],
  [
    "10047f25",
    "a360fd2f10",
    "MOV [0x102ffd60],EAX"
  ],
  [
    "10047f2a",
    "53",
    "PUSH EBX"
  ],
  [
    "10047f2b",
    "56",
    "PUSH ESI"
  ],
  [
    "10047f2c",
    "57",
    "PUSH EDI"
  ],
  [
    "10047f2d",
    "8b3d80962f10",
    "MOV EDI,dword ptr [0x102f9680]"
  ],
  [
    "10047f33",
    "bbffff0000",
    "MOV EBX,0xffff"
  ],
  [
    "10047f38",
    "eb06",
    "JMP 0x10047f40"
  ],
  [
    "10047f40",
    "8b355cfd2f10",
    "MOV ESI,dword ptr [0x102ffd5c]"
  ],
  [
    "10047f46",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "10047f48",
    "741c",
    "JZ 0x10047f66"
  ],
  [
    "10047f4a",
    "8d9b00000000",
    "LEA EBX,[EBX]"
  ],
  [
    "10047f50",
    "395e08",
    "CMP dword ptr [ESI + 0x8],EBX"
  ],
  [
    "10047f53",
    "740b",
    "JZ 0x10047f60"
  ],
  [
    "10047f55",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "10047f57",
    "e8fee0fbff",
    "CALL 0x1000605a"
  ],
  [
    "10047f5c",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "10047f5e",
    "752c",
    "JNZ 0x10047f8c"
  ],
  [
    "10047f60",
    "8b36",
    "MOV ESI,dword ptr [ESI]"
  ],
  [
    "10047f62",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "10047f64",
    "75ea",
    "JNZ 0x10047f50"
  ],
  [
    "10047f66",
    "6a04",
    "PUSH 0x4"
  ],
  [
    "10047f68",
    "6800301000",
    "PUSH 0x103000"
  ],
  [
    "10047f6d",
    "6800201000",
    "PUSH 0x102000"
  ],
  [
    "10047f72",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "10047f74",
    "ffd7",
    "CALL EDI"
  ],
  [
    "10047f76",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "10047f78",
    "7409",
    "JZ 0x10047f83"
  ],
  [
    "10047f7a",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "10047f7c",
    "e84be2fbff",
    "CALL 0x100061cc"
  ],
  [
    "10047f81",
    "ebbd",
    "JMP 0x10047f40"
  ],
  [
    "10047f83",
    "5f",
    "POP EDI"
  ],
  [
    "10047f84",
    "5e",
    "POP ESI"
  ],
  [
    "10047f85",
    "5b",
    "POP EBX"
  ],
  [
    "10047f86",
    "ff2594b02f10",
    "JMP dword ptr [0x102fb094]"
  ],
  [
    "10047f8c",
    "5f",
    "POP EDI"
  ],
  [
    "10047f8d",
    "5e",
    "POP ESI"
  ],
  [
    "10047f8e",
    "5b",
    "POP EBX"
  ],
  [
    "10047f8f",
    "c3",
    "RET"
  ],
  [
    "10045da0",
    "83ec08",
    "SUB ESP,0x8"
  ],
  [
    "10045da3",
    "833df0fe2f1000",
    "CMP dword ptr [0x102ffef0],0x0"
  ],
  [
    "10045daa",
    "56",
    "PUSH ESI"
  ],
  [
    "10045dab",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "10045dad",
    "89742408",
    "MOV dword ptr [ESP + 0x8],ESI"
  ],
  [
    "10045db1",
    "754f",
    "JNZ 0x10045e02"
  ],
  [
    "10045db3",
    "6a14",
    "PUSH 0x14"
  ],
  [
    "10045db5",
    "e8184e0600",
    "CALL 0x100aabd2"
  ],
  [
    "10045dba",
    "8bd0",
    "MOV EDX,EAX"
  ],
  [
    "10045dbc",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "10045dbf",
    "85d2",
    "TEST EDX,EDX"
  ],
  [
    "10045dc1",
    "89542404",
    "MOV dword ptr [ESP + 0x4],EDX"
  ],
  [
    "10045dc5",
    "7433",
    "JZ 0x10045dfa"
  ],
  [
    "10045dc7",
    "c7420455880010",
    "MOV dword ptr [EDX + 0x4],0x10008855"
  ],
  [
    "10045dce",
    "c7420840660010",
    "MOV dword ptr [EDX + 0x8],0x10006640"
  ],
  [
    "10045dd5",
    "c7420ce3130010",
    "MOV dword ptr [EDX + 0xc],0x100013e3"
  ],
  [
    "10045ddc",
    "c742109e7b0010",
    "MOV dword ptr [EDX + 0x10],0x10007b9e"
  ],
  [
    "10045de3",
    "c70200000000",
    "MOV dword ptr [EDX],0x0"
  ],
  [
    "10045de9",
    "8b4c2404",
    "MOV ECX,dword ptr [ESP + 0x4]"
  ],
  [
    "10045ded",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "10045def",
    "f0870504b02f10",
    "XCHG.LOCK dword ptr [0x102fb004],EAX"
  ],
  [
    "10045df6",
    "8901",
    "MOV dword ptr [ECX],EAX"
  ],
  [
    "10045df8",
    "eb02",
    "JMP 0x10045dfc"
  ],
  [
    "10045dfa",
    "33d2",
    "XOR EDX,EDX"
  ],
  [
    "10045dfc",
    "8915f0fe2f10",
    "MOV dword ptr [0x102ffef0],EDX"
  ],
  [
    "10045e02",
    "6800200000",
    "PUSH 0x2000"
  ],
  [
    "10045e07",
    "8d8600001000",
    "LEA EAX,[ESI + 0x100000]"
  ],
  [
    "10045e0d",
    "6aff",
    "PUSH -0x1"
  ],
  [
    "10045e0f",
    "50",
    "PUSH EAX"
  ],
  [
    "10045e10",
    "c7460800000000",
    "MOV dword ptr [ESI + 0x8],0x0"
  ],
  [
    "10045e17",
    "c7460c00000000",
    "MOV dword ptr [ESI + 0xc],0x0"
  ],
  [
    "10045e1e",
    "e85d1b0600",
    "CALL 0x100a7980"
  ],
  [
    "10045e23",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "10045e26",
    "c786fc1f1000ffffff7f",
    "MOV dword ptr [ESI + 0x101ffc],0x7fffffff"
  ],
  [
    "10045e30",
    "c70600000000",
    "MOV dword ptr [ESI],0x0"
  ],
  [
    "10045e36",
    "8b4c2408",
    "MOV ECX,dword ptr [ESP + 0x8]"
  ],
  [
    "10045e3a",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "10045e3c",
    "f087055cfd2f10",
    "XCHG.LOCK dword ptr [0x102ffd5c],EAX"
  ],
  [
    "10045e43",
    "8901",
    "MOV dword ptr [ECX],EAX"
  ],
  [
    "10045e45",
    "8b0df0fe2f10",
    "MOV ECX,dword ptr [0x102ffef0]"
  ],
  [
    "10045e4b",
    "56",
    "PUSH ESI"
  ],
  [
    "10045e4c",
    "68f0ff0f00",
    "PUSH 0xffff0"
  ],
  [
    "10045e51",
    "83c610",
    "ADD ESI,0x10"
  ],
  [
    "10045e54",
    "56",
    "PUSH ESI"
  ],
  [
    "10045e55",
    "e88ab4fbff",
    "CALL 0x100012e4"
  ],
  [
    "10045e5a",
    "5e",
    "POP ESI"
  ],
  [
    "10045e5b",
    "83c408",
    "ADD ESP,0x8"
  ],
  [
    "10045e5e",
    "c3",
    "RET"
  ],
  [
    "100aabd2",
    "55",
    "PUSH EBP"
  ],
  [
    "100aabd3",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100aabd5",
    "83ec0c",
    "SUB ESP,0xc"
  ],
  [
    "100aabd8",
    "eb0d",
    "JMP 0x100aabe7"
  ],
  [
    "100aabda",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100aabdd",
    "e85b140100",
    "CALL 0x100bc03d"
  ],
  [
    "100aabe2",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100aabe4",
    "59",
    "POP ECX"
  ],
  [
    "100aabe5",
    "740f",
    "JZ 0x100aabf6"
  ],
  [
    "100aabe7",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100aabea",
    "e807ffffff",
    "CALL 0x100aaaf6"
  ],
  [
    "100aabef",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100aabf1",
    "59",
    "POP ECX"
  ],
  [
    "100aabf2",
    "74e6",
    "JZ 0x100aabda"
  ],
  [
    "100aabf4",
    "c9",
    "LEAVE"
  ],
  [
    "100aabf5",
    "c3",
    "RET"
  ],
  [
    "100aabf6",
    "f6057c642f1001",
    "TEST byte ptr [0x102f647c],0x1"
  ],
  [
    "100aabfd",
    "be70642f10",
    "MOV ESI,0x102f6470"
  ],
  [
    "100aac02",
    "7519",
    "JNZ 0x100aac1d"
  ],
  [
    "100aac04",
    "830d7c642f1001",
    "OR dword ptr [0x102f647c],0x1"
  ],
  [
    "100aac0b",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100aac0d",
    "e8a7ffffff",
    "CALL 0x100aabb9"
  ],
  [
    "100aac12",
    "6841310e10",
    "PUSH 0x100e3141"
  ],
  [
    "100aac17",
    "e8b4c6ffff",
    "CALL 0x100a72d0"
  ],
  [
    "100aac1c",
    "59",
    "POP ECX"
  ],
  [
    "100aac1d",
    "56",
    "PUSH ESI"
  ],
  [
    "100aac1e",
    "8d4df4",
    "LEA ECX,[EBP + -0xc]"
  ],
  [
    "100aac21",
    "e868320000",
    "CALL 0x100ade8e"
  ],
  [
    "100aac26",
    "68dc830f10",
    "PUSH 0x100f83dc"
  ],
  [
    "100aac2b",
    "8d45f4",
    "LEA EAX,[EBP + -0xc]"
  ],
  [
    "100aac2e",
    "50",
    "PUSH EAX"
  ],
  [
    "100aac2f",
    "c745f494ce0e10",
    "MOV dword ptr [EBP + -0xc],0x100ece94"
  ],
  [
    "100aac36",
    "e8f7fbffff",
    "CALL 0x100aa832"
  ],
  [
    "100aaaf6",
    "55",
    "PUSH EBP"
  ],
  [
    "100aaaf7",
    "8b6c2408",
    "MOV EBP,dword ptr [ESP + 0x8]"
  ],
  [
    "100aaafb",
    "83fde0",
    "CMP EBP,-0x20"
  ],
  [
    "100aaafe",
    "0f879f000000",
    "JA 0x100aaba3"
  ],
  [
    "100aab04",
    "53",
    "PUSH EBX"
  ],
  [
    "100aab05",
    "8b1d84962f10",
    "MOV EBX,dword ptr [0x102f9684]"
  ],
  [
    "100aab0b",
    "56",
    "PUSH ESI"
  ],
  [
    "100aab0c",
    "57",
    "PUSH EDI"
  ],
  [
    "100aab0d",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100aab0f",
    "3935c86a2f10",
    "CMP dword ptr [0x102f6ac8],ESI"
  ],
  [
    "100aab15",
    "8bfd",
    "MOV EDI,EBP"
  ],
  [
    "100aab17",
    "7518",
    "JNZ 0x100aab31"
  ],
  [
    "100aab19",
    "e81b640000",
    "CALL 0x100b0f39"
  ],
  [
    "100aab1e",
    "6a1e",
    "PUSH 0x1e"
  ],
  [
    "100aab20",
    "e854620000",
    "CALL 0x100b0d79"
  ],
  [
    "100aab25",
    "68ff000000",
    "PUSH 0xff"
  ],
  [
    "100aab2a",
    "e80ff9ffff",
    "CALL 0x100aa43e"
  ],
  [
    "100aab2f",
    "59",
    "POP ECX"
  ],
  [
    "100aab30",
    "59",
    "POP ECX"
  ],
  [
    "100aab31",
    "a130852f10",
    "MOV EAX,[0x102f8530]"
  ],
  [
    "100aab36",
    "83f801",
    "CMP EAX,0x1"
  ],
  [
    "100aab39",
    "750e",
    "JNZ 0x100aab49"
  ],
  [
    "100aab3b",
    "3bee",
    "CMP EBP,ESI"
  ],
  [
    "100aab3d",
    "7404",
    "JZ 0x100aab43"
  ],
  [
    "100aab3f",
    "8bc5",
    "MOV EAX,EBP"
  ],
  [
    "100aab41",
    "eb03",
    "JMP 0x100aab46"
  ],
  [
    "100aab43",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100aab45",
    "40",
    "INC EAX"
  ],
  [
    "100aab46",
    "50",
    "PUSH EAX"
  ],
  [
    "100aab47",
    "eb1e",
    "JMP 0x100aab67"
  ],
  [
    "100aab49",
    "83f803",
    "CMP EAX,0x3"
  ],
  [
    "100aab4c",
    "750b",
    "JNZ 0x100aab59"
  ],
  [
    "100aab4e",
    "55",
    "PUSH EBP"
  ],
  [
    "100aab4f",
    "e8defeffff",
    "CALL 0x100aaa32"
  ],
  [
    "100aab54",
    "3bc6",
    "CMP EAX,ESI"
  ],
  [
    "100aab56",
    "59",
    "POP ECX"
  ],
  [
    "100aab57",
    "7517",
    "JNZ 0x100aab70"
  ],
  [
    "100aab59",
    "3bee",
    "CMP EBP,ESI"
  ],
  [
    "100aab5b",
    "7503",
    "JNZ 0x100aab60"
  ],
  [
    "100aab5d",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100aab5f",
    "47",
    "INC EDI"
  ],
  [
    "100aab60",
    "83c70f",
    "ADD EDI,0xf"
  ],
  [
    "100aab63",
    "83e7f0",
    "AND EDI,0xfffffff0"
  ],
  [
    "100aab66",
    "57",
    "PUSH EDI"
  ],
  [
    "100aab67",
    "56",
    "PUSH ESI"
  ],
  [
    "100aab68",
    "ff35c86a2f10",
    "PUSH dword ptr [0x102f6ac8]"
  ],
  [
    "100aab6e",
    "ffd3",
    "CALL EBX"
  ],
  [
    "100aab70",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100aab72",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "100aab74",
    "7526",
    "JNZ 0x100aab9c"
  ],
  [
    "100aab76",
    "3905d06a2f10",
    "CMP dword ptr [0x102f6ad0],EAX"
  ],
  [
    "100aab7c",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "100aab7e",
    "5f",
    "POP EDI"
  ],
  [
    "100aab7f",
    "740d",
    "JZ 0x100aab8e"
  ],
  [
    "100aab81",
    "55",
    "PUSH EBP"
  ],
  [
    "100aab82",
    "e8b6140100",
    "CALL 0x100bc03d"
  ],
  [
    "100aab87",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100aab89",
    "59",
    "POP ECX"
  ],
  [
    "100aab8a",
    "7581",
    "JNZ 0x100aab0d"
  ],
  [
    "100aab8c",
    "eb07",
    "JMP 0x100aab95"
  ],
  [
    "100aab8e",
    "e83e420000",
    "CALL 0x100aedd1"
  ],
  [
    "100aab93",
    "8938",
    "MOV dword ptr [EAX],EDI"
  ],
  [
    "100aab95",
    "e837420000",
    "CALL 0x100aedd1"
  ],
  [
    "100aab9a",
    "8938",
    "MOV dword ptr [EAX],EDI"
  ],
  [
    "100aab9c",
    "5f",
    "POP EDI"
  ],
  [
    "100aab9d",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100aab9f",
    "5e",
    "POP ESI"
  ],
  [
    "100aaba0",
    "5b",
    "POP EBX"
  ],
  [
    "100aaba1",
    "5d",
    "POP EBP"
  ],
  [
    "100aaba2",
    "c3",
    "RET"
  ],
  [
    "100aaba3",
    "55",
    "PUSH EBP"
  ],
  [
    "100aaba4",
    "e894140100",
    "CALL 0x100bc03d"
  ],
  [
    "100aaba9",
    "59",
    "POP ECX"
  ],
  [
    "100aabaa",
    "e822420000",
    "CALL 0x100aedd1"
  ],
  [
    "100aabaf",
    "c7000c000000",
    "MOV dword ptr [EAX],0xc"
  ],
  [
    "100aabb5",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100aabb7",
    "5d",
    "POP EBP"
  ],
  [
    "100aabb8",
    "c3",
    "RET"
  ],
  [
    "100a7980",
    "8b54240c",
    "MOV EDX,dword ptr [ESP + 0xc]"
  ],
  [
    "100a7984",
    "8b4c2404",
    "MOV ECX,dword ptr [ESP + 0x4]"
  ],
  [
    "100a7988",
    "85d2",
    "TEST EDX,EDX"
  ],
  [
    "100a798a",
    "7469",
    "JZ 0x100a79f5"
  ],
  [
    "100a798c",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100a798e",
    "8a442408",
    "MOV AL,byte ptr [ESP + 0x8]"
  ],
  [
    "100a7992",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100a7994",
    "7516",
    "JNZ 0x100a79ac"
  ],
  [
    "100a7996",
    "81fa00010000",
    "CMP EDX,0x100"
  ],
  [
    "100a799c",
    "720e",
    "JC 0x100a79ac"
  ],
  [
    "100a799e",
    "833d4c852f1000",
    "CMP dword ptr [0x102f854c],0x0"
  ],
  [
    "100a79a5",
    "7405",
    "JZ 0x100a79ac"
  ],
  [
    "100a79a7",
    "e930d10000",
    "JMP 0x100b4adc"
  ],
  [
    "100a79ac",
    "57",
    "PUSH EDI"
  ],
  [
    "100a79ad",
    "8bf9",
    "MOV EDI,ECX"
  ],
  [
    "100a79af",
    "83fa04",
    "CMP EDX,0x4"
  ],
  [
    "100a79b2",
    "7231",
    "JC 0x100a79e5"
  ],
  [
    "100a79b4",
    "f7d9",
    "NEG ECX"
  ],
  [
    "100a79b6",
    "83e103",
    "AND ECX,0x3"
  ],
  [
    "100a79b9",
    "740c",
    "JZ 0x100a79c7"
  ],
  [
    "100a79bb",
    "2bd1",
    "SUB EDX,ECX"
  ],
  [
    "100a79bd",
    "8807",
    "MOV byte ptr [EDI],AL"
  ],
  [
    "100a79bf",
    "83c701",
    "ADD EDI,0x1"
  ],
  [
    "100a79c2",
    "83e901",
    "SUB ECX,0x1"
  ],
  [
    "100a79c5",
    "75f6",
    "JNZ 0x100a79bd"
  ],
  [
    "100a79c7",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100a79c9",
    "c1e008",
    "SHL EAX,0x8"
  ],
  [
    "100a79cc",
    "03c1",
    "ADD EAX,ECX"
  ],
  [
    "100a79ce",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100a79d0",
    "c1e010",
    "SHL EAX,0x10"
  ],
  [
    "100a79d3",
    "03c1",
    "ADD EAX,ECX"
  ],
  [
    "100a79d5",
    "8bca",
    "MOV ECX,EDX"
  ],
  [
    "100a79d7",
    "83e203",
    "AND EDX,0x3"
  ],
  [
    "100a79da",
    "c1e902",
    "SHR ECX,0x2"
  ],
  [
    "100a79dd",
    "7406",
    "JZ 0x100a79e5"
  ],
  [
    "100a79df",
    "f3ab",
    "STOSD.REP ES:EDI"
  ],
  [
    "100a79e1",
    "85d2",
    "TEST EDX,EDX"
  ],
  [
    "100a79e3",
    "740a",
    "JZ 0x100a79ef"
  ],
  [
    "100a79e5",
    "8807",
    "MOV byte ptr [EDI],AL"
  ],
  [
    "100a79e7",
    "83c701",
    "ADD EDI,0x1"
  ],
  [
    "100a79ea",
    "83ea01",
    "SUB EDX,0x1"
  ],
  [
    "100a79ed",
    "75f6",
    "JNZ 0x100a79e5"
  ],
  [
    "100a79ef",
    "8b442408",
    "MOV EAX,dword ptr [ESP + 0x8]"
  ],
  [
    "100a79f3",
    "5f",
    "POP EDI"
  ],
  [
    "100a79f4",
    "c3",
    "RET"
  ],
  [
    "100a79f5",
    "8b442404",
    "MOV EAX,dword ptr [ESP + 0x4]"
  ],
  [
    "100a79f9",
    "c3",
    "RET"
  ],
  [
    "1003c650",
    "51",
    "PUSH ECX"
  ],
  [
    "1003c651",
    "8b44240c",
    "MOV EAX,dword ptr [ESP + 0xc]"
  ],
  [
    "1003c655",
    "53",
    "PUSH EBX"
  ],
  [
    "1003c656",
    "8b1d30b02f10",
    "MOV EBX,dword ptr [0x102fb030]"
  ],
  [
    "1003c65c",
    "56",
    "PUSH ESI"
  ],
  [
    "1003c65d",
    "894c2408",
    "MOV dword ptr [ESP + 0x8],ECX"
  ],
  [
    "1003c661",
    "8b4c2410",
    "MOV ECX,dword ptr [ESP + 0x10]"
  ],
  [
    "1003c665",
    "57",
    "PUSH EDI"
  ],
  [
    "1003c666",
    "8d3c01",
    "LEA EDI,[ECX + EAX*0x1]"
  ],
  [
    "1003c669",
    "8bcb",
    "MOV ECX,EBX"
  ],
  [
    "1003c66b",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "1003c66d",
    "85c9",
    "TEST ECX,ECX"
  ],
  [
    "1003c66f",
    "7428",
    "JZ 0x1003c699"
  ],
  [
    "1003c671",
    "55",
    "PUSH EBP"
  ],
  [
    "1003c672",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "1003c674",
    "d1e8",
    "SHR EAX,0x1"
  ],
  [
    "1003c676",
    "8d1430",
    "LEA EDX,[EAX + ESI*0x1]"
  ],
  [
    "1003c679",
    "8bea",
    "MOV EBP,EDX"
  ],
  [
    "1003c67b",
    "c1e504",
    "SHL EBP,0x4"
  ],
  [
    "1003c67e",
    "3bbd189a1410",
    "CMP EDI,dword ptr [EBP + 0x10149a18]"
  ],
  [
    "1003c684",
    "7704",
    "JA 0x1003c68a"
  ],
  [
    "1003c686",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1003c688",
    "eb0a",
    "JMP 0x1003c694"
  ],
  [
    "1003c68a",
    "83ceff",
    "OR ESI,0xffffffff"
  ],
  [
    "1003c68d",
    "2bf0",
    "SUB ESI,EAX"
  ],
  [
    "1003c68f",
    "03ce",
    "ADD ECX,ESI"
  ],
  [
    "1003c691",
    "8d7201",
    "LEA ESI,[EDX + 0x1]"
  ],
  [
    "1003c694",
    "85c9",
    "TEST ECX,ECX"
  ],
  [
    "1003c696",
    "75da",
    "JNZ 0x1003c672"
  ],
  [
    "1003c698",
    "5d",
    "POP EBP"
  ],
  [
    "1003c699",
    "3bf3",
    "CMP ESI,EBX"
  ],
  [
    "1003c69b",
    "7327",
    "JNC 0x1003c6c4"
  ],
  [
    "1003c69d",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "1003c69f",
    "c1e004",
    "SHL EAX,0x4"
  ],
  [
    "1003c6a2",
    "2bde",
    "SUB EBX,ESI"
  ],
  [
    "1003c6a4",
    "c1e304",
    "SHL EBX,0x4"
  ],
  [
    "1003c6a7",
    "8d90189a1410",
    "LEA EDX,[EAX + 0x10149a18]"
  ],
  [
    "1003c6ad",
    "53",
    "PUSH EBX"
  ],
  [
    "1003c6ae",
    "52",
    "PUSH EDX"
  ],
  [
    "1003c6af",
    "8d80289a1410",
    "LEA EAX,[EAX + 0x10149a28]"
  ],
  [
    "1003c6b5",
    "50",
    "PUSH EAX"
  ],
  [
    "1003c6b6",
    "e8a5bd0600",
    "CALL 0x100a8460"
  ],
  [
    "1003c6bb",
    "8b1d30b02f10",
    "MOV EBX,dword ptr [0x102fb030]"
  ],
  [
    "1003c6c1",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "1003c6c4",
    "8b4c241c",
    "MOV ECX,dword ptr [ESP + 0x1c]"
  ],
  [
    "1003c6c8",
    "8b54240c",
    "MOV EDX,dword ptr [ESP + 0xc]"
  ],
  [
    "1003c6cc",
    "8b442414",
    "MOV EAX,dword ptr [ESP + 0x14]"
  ],
  [
    "1003c6d0",
    "83c301",
    "ADD EBX,0x1"
  ],
  [
    "1003c6d3",
    "c1e604",
    "SHL ESI,0x4"
  ],
  [
    "1003c6d6",
    "89be1c9a1410",
    "MOV dword ptr [ESI + 0x10149a1c],EDI"
  ],
  [
    "1003c6dc",
    "5f",
    "POP EDI"
  ],
  [
    "1003c6dd",
    "898e209a1410",
    "MOV dword ptr [ESI + 0x10149a20],ECX"
  ],
  [
    "1003c6e3",
    "8996249a1410",
    "MOV dword ptr [ESI + 0x10149a24],EDX"
  ],
  [
    "1003c6e9",
    "8986189a1410",
    "MOV dword ptr [ESI + 0x10149a18],EAX"
  ],
  [
    "1003c6ef",
    "5e",
    "POP ESI"
  ],
  [
    "1003c6f0",
    "891d30b02f10",
    "MOV dword ptr [0x102fb030],EBX"
  ],
  [
    "1003c6f6",
    "5b",
    "POP EBX"
  ],
  [
    "1003c6f7",
    "59",
    "POP ECX"
  ],
  [
    "1003c6f8",
    "c20c00",
    "RET 0xc"
  ],
  [
    "1003e090",
    "55",
    "PUSH EBP"
  ],
  [
    "1003e091",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "1003e093",
    "83ec08",
    "SUB ESP,0x8"
  ],
  [
    "1003e096",
    "53",
    "PUSH EBX"
  ],
  [
    "1003e097",
    "56",
    "PUSH ESI"
  ],
  [
    "1003e098",
    "57",
    "PUSH EDI"
  ],
  [
    "1003e099",
    "894df8",
    "MOV dword ptr [EBP + -0x8],ECX"
  ],
  [
    "1003e09c",
    "c745fc00000000",
    "MOV dword ptr [EBP + -0x4],0x0"
  ],
  [
    "1003e0a3",
    "60",
    "PUSHAD"
  ],
  [
    "1003e0a4",
    "8b75f8",
    "MOV ESI,dword ptr [EBP + -0x8]"
  ],
  [
    "1003e0a7",
    "8b0dac7a0e10",
    "MOV ECX,dword ptr [0x100e7aac]"
  ],
  [
    "1003e0ad",
    "8b560c",
    "MOV EDX,dword ptr [ESI + 0xc]"
  ],
  [
    "1003e0b0",
    "8dbe00001000",
    "LEA EDI,[ESI + 0x100000]"
  ],
  [
    "1003e0b6",
    "f0ff4608",
    "INC.LOCK dword ptr [ESI + 0x8]"
  ],
  [
    "1003e0ba",
    "83c11f",
    "ADD ECX,0x1f"
  ],
  [
    "1003e0bd",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "1003e0bf",
    "c1e905",
    "SHR ECX,0x5"
  ],
  [
    "1003e0c2",
    "8d3c97",
    "LEA EDI,[EDI + EDX*0x4]"
  ],
  [
    "1003e0c5",
    "2bca",
    "SUB ECX,EDX"
  ],
  [
    "1003e0c7",
    "fc",
    "CLD"
  ],
  [
    "1003e0c8",
    "f3af",
    "SCASD.REPE ES:EDI"
  ],
  [
    "1003e0ca",
    "7439",
    "JZ 0x1003e105"
  ],
  [
    "1003e0cc",
    "41",
    "INC ECX"
  ],
  [
    "1003e0cd",
    "83ef04",
    "SUB EDI,0x4"
  ],
  [
    "1003e0d0",
    "833f00",
    "CMP dword ptr [EDI],0x0"
  ],
  [
    "1003e0d3",
    "74f2",
    "JZ 0x1003e0c7"
  ],
  [
    "1003e0d5",
    "0fbc17",
    "BSF EDX,dword ptr [EDI]"
  ],
  [
    "1003e0d8",
    "74f6",
    "JZ 0x1003e0d0"
  ],
  [
    "1003e0da",
    "f00fb317",
    "BTR.LOCK [EDI],EDX"
  ],
  [
    "1003e0de",
    "73f0",
    "JNC 0x1003e0d0"
  ],
  [
    "1003e0e0",
    "a1ac7a0e10",
    "MOV EAX,[0x100e7aac]"
  ],
  [
    "1003e0e5",
    "83c01f",
    "ADD EAX,0x1f"
  ],
  [
    "1003e0e8",
    "c1e805",
    "SHR EAX,0x5"
  ],
  [
    "1003e0eb",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "1003e0ed",
    "89460c",
    "MOV dword ptr [ESI + 0xc],EAX"
  ],
  [
    "1003e0f0",
    "c1e005",
    "SHL EAX,0x5"
  ],
  [
    "1003e0f3",
    "03c2",
    "ADD EAX,EDX"
  ],
  [
    "1003e0f5",
    "0faf05a87a0e10",
    "IMUL EAX,dword ptr [0x100e7aa8]"
  ],
  [
    "1003e0fc",
    "8d443010",
    "LEA EAX,[EAX + ESI*0x1 + 0x10]"
  ],
  [
    "1003e100",
    "8945fc",
    "MOV dword ptr [EBP + -0x4],EAX"
  ],
  [
    "1003e103",
    "eb07",
    "JMP 0x1003e10c"
  ],
  [
    "1003e105",
    "f0ff4e08",
    "DEC.LOCK dword ptr [ESI + 0x8]"
  ],
  [
    "1003e109",
    "894e0c",
    "MOV dword ptr [ESI + 0xc],ECX"
  ],
  [
    "1003e10c",
    "61",
    "POPAD"
  ],
  [
    "1003e10d",
    "8b45fc",
    "MOV EAX,dword ptr [EBP + -0x4]"
  ],
  [
    "1003e110",
    "5f",
    "POP EDI"
  ],
  [
    "1003e111",
    "5e",
    "POP ESI"
  ],
  [
    "1003e112",
    "5b",
    "POP EBX"
  ],
  [
    "1003e113",
    "8be5",
    "MOV ESP,EBP"
  ],
  [
    "1003e115",
    "5d",
    "POP EBP"
  ],
  [
    "1003e116",
    "c3",
    "RET"
  ],
  [
    "100a7a00",
    "55",
    "PUSH EBP"
  ],
  [
    "100a7a01",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100a7a03",
    "57",
    "PUSH EDI"
  ],
  [
    "100a7a04",
    "56",
    "PUSH ESI"
  ],
  [
    "100a7a05",
    "8b750c",
    "MOV ESI,dword ptr [EBP + 0xc]"
  ],
  [
    "100a7a08",
    "8b4d10",
    "MOV ECX,dword ptr [EBP + 0x10]"
  ],
  [
    "100a7a0b",
    "8b7d08",
    "MOV EDI,dword ptr [EBP + 0x8]"
  ],
  [
    "100a7a0e",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "100a7a10",
    "8bd1",
    "MOV EDX,ECX"
  ],
  [
    "100a7a12",
    "03c6",
    "ADD EAX,ESI"
  ],
  [
    "100a7a14",
    "3bfe",
    "CMP EDI,ESI"
  ],
  [
    "100a7a16",
    "7608",
    "JBE 0x100a7a20"
  ],
  [
    "100a7a18",
    "3bf8",
    "CMP EDI,EAX"
  ],
  [
    "100a7a1a",
    "0f82a4010000",
    "JC 0x100a7bc4"
  ],
  [
    "100a7a20",
    "81f900010000",
    "CMP ECX,0x100"
  ],
  [
    "100a7a26",
    "721f",
    "JC 0x100a7a47"
  ],
  [
    "100a7a28",
    "833d4c852f1000",
    "CMP dword ptr [0x102f854c],0x0"
  ],
  [
    "100a7a2f",
    "7416",
    "JZ 0x100a7a47"
  ],
  [
    "100a7a31",
    "57",
    "PUSH EDI"
  ],
  [
    "100a7a32",
    "56",
    "PUSH ESI"
  ],
  [
    "100a7a33",
    "83e70f",
    "AND EDI,0xf"
  ],
  [
    "100a7a36",
    "83e60f",
    "AND ESI,0xf"
  ],
  [
    "100a7a39",
    "3bfe",
    "CMP EDI,ESI"
  ],
  [
    "100a7a3b",
    "5e",
    "POP ESI"
  ],
  [
    "100a7a3c",
    "5f",
    "POP EDI"
  ],
  [
    "100a7a3d",
    "7508",
    "JNZ 0x100a7a47"
  ],
  [
    "100a7a3f",
    "5e",
    "POP ESI"
  ],
  [
    "100a7a40",
    "5f",
    "POP EDI"
  ],
  [
    "100a7a41",
    "5d",
    "POP EBP"
  ],
  [
    "100a7a42",
    "e9d3d10000",
    "JMP 0x100b4c1a"
  ],
  [
    "100a7a47",
    "f7c703000000",
    "TEST EDI,0x3"
  ],
  [
    "100a7a4d",
    "7515",
    "JNZ 0x100a7a64"
  ],
  [
    "100a7a4f",
    "c1e902",
    "SHR ECX,0x2"
  ],
  [
    "100a7a52",
    "83e203",
    "AND EDX,0x3"
  ],
  [
    "100a7a55",
    "83f908",
    "CMP ECX,0x8"
  ],
  [
    "100a7a58",
    "722a",
    "JC 0x100a7a84"
  ],
  [
    "100a7a5a",
    "f3a5",
    "MOVSD.REP ES:EDI,ESI"
  ],
  [
    "100a7a5c",
    "ff2495747b0a10",
    "JMP dword ptr [EDX*0x4 + 0x100a7b74]"
  ],
  [
    "100a7a64",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100a7a66",
    "ba03000000",
    "MOV EDX,0x3"
  ],
  [
    "100a7a6b",
    "83e904",
    "SUB ECX,0x4"
  ],
  [
    "100a7a6e",
    "720c",
    "JC 0x100a7a7c"
  ],
  [
    "100a7a70",
    "83e003",
    "AND EAX,0x3"
  ],
  [
    "100a7a73",
    "03c8",
    "ADD ECX,EAX"
  ],
  [
    "100a7a75",
    "ff2485887a0a10",
    "JMP dword ptr [EAX*0x4 + 0x100a7a88]"
  ],
  [
    "100a7a7c",
    "ff248d847b0a10",
    "JMP dword ptr [ECX*0x4 + 0x100a7b84]"
  ],
  [
    "100a7a84",
    "ff248d087b0a10",
    "JMP dword ptr [ECX*0x4 + 0x100a7b08]"
  ],
  [
    "100a7a98",
    "23d1",
    "AND EDX,ECX"
  ],
  [
    "100a7a9a",
    "8a06",
    "MOV AL,byte ptr [ESI]"
  ],
  [
    "100a7a9c",
    "8807",
    "MOV byte ptr [EDI],AL"
  ],
  [
    "100a7a9e",
    "8a4601",
    "MOV AL,byte ptr [ESI + 0x1]"
  ],
  [
    "100a7aa1",
    "884701",
    "MOV byte ptr [EDI + 0x1],AL"
  ],
  [
    "100a7aa4",
    "8a4602",
    "MOV AL,byte ptr [ESI + 0x2]"
  ],
  [
    "100a7aa7",
    "c1e902",
    "SHR ECX,0x2"
  ],
  [
    "100a7aaa",
    "884702",
    "MOV byte ptr [EDI + 0x2],AL"
  ],
  [
    "100a7aad",
    "83c603",
    "ADD ESI,0x3"
  ],
  [
    "100a7ab0",
    "83c703",
    "ADD EDI,0x3"
  ],
  [
    "100a7ab3",
    "83f908",
    "CMP ECX,0x8"
  ],
  [
    "100a7ab6",
    "72cc",
    "JC 0x100a7a84"
  ],
  [
    "100a7ab8",
    "f3a5",
    "MOVSD.REP ES:EDI,ESI"
  ],
  [
    "100a7aba",
    "ff2495747b0a10",
    "JMP dword ptr [EDX*0x4 + 0x100a7b74]"
  ],
  [
    "100a7ac4",
    "23d1",
    "AND EDX,ECX"
  ],
  [
    "100a7ac6",
    "8a06",
    "MOV AL,byte ptr [ESI]"
  ],
  [
    "100a7ac8",
    "8807",
    "MOV byte ptr [EDI],AL"
  ],
  [
    "100a7aca",
    "8a4601",
    "MOV AL,byte ptr [ESI + 0x1]"
  ],
  [
    "100a7acd",
    "c1e902",
    "SHR ECX,0x2"
  ],
  [
    "100a7ad0",
    "884701",
    "MOV byte ptr [EDI + 0x1],AL"
  ],
  [
    "100a7ad3",
    "83c602",
    "ADD ESI,0x2"
  ],
  [
    "100a7ad6",
    "83c702",
    "ADD EDI,0x2"
  ],
  [
    "100a7ad9",
    "83f908",
    "CMP ECX,0x8"
  ],
  [
    "100a7adc",
    "72a6",
    "JC 0x100a7a84"
  ],
  [
    "100a7ade",
    "f3a5",
    "MOVSD.REP ES:EDI,ESI"
  ],
  [
    "100a7ae0",
    "ff2495747b0a10",
    "JMP dword ptr [EDX*0x4 + 0x100a7b74]"
  ],
  [
    "100a7ae8",
    "23d1",
    "AND EDX,ECX"
  ],
  [
    "100a7aea",
    "8a06",
    "MOV AL,byte ptr [ESI]"
  ],
  [
    "100a7aec",
    "8807",
    "MOV byte ptr [EDI],AL"
  ],
  [
    "100a7aee",
    "83c601",
    "ADD ESI,0x1"
  ],
  [
    "100a7af1",
    "c1e902",
    "SHR ECX,0x2"
  ],
  [
    "100a7af4",
    "83c701",
    "ADD EDI,0x1"
  ],
  [
    "100a7af7",
    "83f908",
    "CMP ECX,0x8"
  ],
  [
    "100a7afa",
    "7288",
    "JC 0x100a7a84"
  ],
  [
    "100a7afc",
    "f3a5",
    "MOVSD.REP ES:EDI,ESI"
  ],
  [
    "100a7afe",
    "ff2495747b0a10",
    "JMP dword ptr [EDX*0x4 + 0x100a7b74]"
  ],
  [
    "100a7b28",
    "8b448ee4",
    "MOV EAX,dword ptr [ESI + ECX*0x4 + -0x1c]"
  ],
  [
    "100a7b2c",
    "89448fe4",
    "MOV dword ptr [EDI + ECX*0x4 + -0x1c],EAX"
  ],
  [
    "100a7b30",
    "8b448ee8",
    "MOV EAX,dword ptr [ESI + ECX*0x4 + -0x18]"
  ],
  [
    "100a7b34",
    "89448fe8",
    "MOV dword ptr [EDI + ECX*0x4 + -0x18],EAX"
  ],
  [
    "100a7b38",
    "8b448eec",
    "MOV EAX,dword ptr [ESI + ECX*0x4 + -0x14]"
  ],
  [
    "100a7b3c",
    "89448fec",
    "MOV dword ptr [EDI + ECX*0x4 + -0x14],EAX"
  ],
  [
    "100a7b40",
    "8b448ef0",
    "MOV EAX,dword ptr [ESI + ECX*0x4 + -0x10]"
  ],
  [
    "100a7b44",
    "89448ff0",
    "MOV dword ptr [EDI + ECX*0x4 + -0x10],EAX"
  ],
  [
    "100a7b48",
    "8b448ef4",
    "MOV EAX,dword ptr [ESI + ECX*0x4 + -0xc]"
  ],
  [
    "100a7b4c",
    "89448ff4",
    "MOV dword ptr [EDI + ECX*0x4 + -0xc],EAX"
  ],
  [
    "100a7b50",
    "8b448ef8",
    "MOV EAX,dword ptr [ESI + ECX*0x4 + -0x8]"
  ],
  [
    "100a7b54",
    "89448ff8",
    "MOV dword ptr [EDI + ECX*0x4 + -0x8],EAX"
  ],
  [
    "100a7b58",
    "8b448efc",
    "MOV EAX,dword ptr [ESI + ECX*0x4 + -0x4]"
  ],
  [
    "100a7b5c",
    "89448ffc",
    "MOV dword ptr [EDI + ECX*0x4 + -0x4],EAX"
  ],
  [
    "100a7b60",
    "8d048d00000000",
    "LEA EAX,[ECX*0x4 + 0x0]"
  ],
  [
    "100a7b67",
    "03f0",
    "ADD ESI,EAX"
  ],
  [
    "100a7b69",
    "03f8",
    "ADD EDI,EAX"
  ],
  [
    "100a7b6b",
    "ff2495747b0a10",
    "JMP dword ptr [EDX*0x4 + 0x100a7b74]"
  ],
  [
    "100a7b84",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100a7b87",
    "5e",
    "POP ESI"
  ],
  [
    "100a7b88",
    "5f",
    "POP EDI"
  ],
  [
    "100a7b89",
    "c9",
    "LEAVE"
  ],
  [
    "100a7b8a",
    "c3",
    "RET"
  ],
  [
    "100a7b8c",
    "8a06",
    "MOV AL,byte ptr [ESI]"
  ],
  [
    "100a7b8e",
    "8807",
    "MOV byte ptr [EDI],AL"
  ],
  [
    "100a7b90",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100a7b93",
    "5e",
    "POP ESI"
  ],
  [
    "100a7b94",
    "5f",
    "POP EDI"
  ],
  [
    "100a7b95",
    "c9",
    "LEAVE"
  ],
  [
    "100a7b96",
    "c3",
    "RET"
  ],
  [
    "100a7b98",
    "8a06",
    "MOV AL,byte ptr [ESI]"
  ],
  [
    "100a7b9a",
    "8807",
    "MOV byte ptr [EDI],AL"
  ],
  [
    "100a7b9c",
    "8a4601",
    "MOV AL,byte ptr [ESI + 0x1]"
  ],
  [
    "100a7b9f",
    "884701",
    "MOV byte ptr [EDI + 0x1],AL"
  ],
  [
    "100a7ba2",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100a7ba5",
    "5e",
    "POP ESI"
  ],
  [
    "100a7ba6",
    "5f",
    "POP EDI"
  ],
  [
    "100a7ba7",
    "c9",
    "LEAVE"
  ],
  [
    "100a7ba8",
    "c3",
    "RET"
  ],
  [
    "100a7bac",
    "8a06",
    "MOV AL,byte ptr [ESI]"
  ],
  [
    "100a7bae",
    "8807",
    "MOV byte ptr [EDI],AL"
  ],
  [
    "100a7bb0",
    "8a4601",
    "MOV AL,byte ptr [ESI + 0x1]"
  ],
  [
    "100a7bb3",
    "884701",
    "MOV byte ptr [EDI + 0x1],AL"
  ],
  [
    "100a7bb6",
    "8a4602",
    "MOV AL,byte ptr [ESI + 0x2]"
  ],
  [
    "100a7bb9",
    "884702",
    "MOV byte ptr [EDI + 0x2],AL"
  ],
  [
    "100a7bbc",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100a7bbf",
    "5e",
    "POP ESI"
  ],
  [
    "100a7bc0",
    "5f",
    "POP EDI"
  ],
  [
    "100a7bc1",
    "c9",
    "LEAVE"
  ],
  [
    "100a7bc2",
    "c3",
    "RET"
  ],
  [
    "100a7bc4",
    "8d7431fc",
    "LEA ESI,[ECX + ESI*0x1 + -0x4]"
  ],
  [
    "100a7bc8",
    "8d7c39fc",
    "LEA EDI,[ECX + EDI*0x1 + -0x4]"
  ],
  [
    "100a7bcc",
    "f7c703000000",
    "TEST EDI,0x3"
  ],
  [
    "100a7bd2",
    "7524",
    "JNZ 0x100a7bf8"
  ],
  [
    "100a7bd4",
    "c1e902",
    "SHR ECX,0x2"
  ],
  [
    "100a7bd7",
    "83e203",
    "AND EDX,0x3"
  ],
  [
    "100a7bda",
    "83f908",
    "CMP ECX,0x8"
  ],
  [
    "100a7bdd",
    "720d",
    "JC 0x100a7bec"
  ],
  [
    "100a7bdf",
    "fd",
    "STD"
  ],
  [
    "100a7be0",
    "f3a5",
    "MOVSD.REP ES:EDI,ESI"
  ],
  [
    "100a7be2",
    "fc",
    "CLD"
  ],
  [
    "100a7be3",
    "ff2495107d0a10",
    "JMP dword ptr [EDX*0x4 + 0x100a7d10]"
  ],
  [
    "100a7bec",
    "f7d9",
    "NEG ECX"
  ],
  [
    "100a7bee",
    "ff248dc07c0a10",
    "JMP dword ptr [ECX*0x4 + 0x100a7cc0]"
  ],
  [
    "100a7bf8",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100a7bfa",
    "ba03000000",
    "MOV EDX,0x3"
  ],
  [
    "100a7bff",
    "83f904",
    "CMP ECX,0x4"
  ],
  [
    "100a7c02",
    "720c",
    "JC 0x100a7c10"
  ],
  [
    "100a7c04",
    "83e003",
    "AND EAX,0x3"
  ],
  [
    "100a7c07",
    "2bc8",
    "SUB ECX,EAX"
  ],
  [
    "100a7c09",
    "ff2485147c0a10",
    "JMP dword ptr [EAX*0x4 + 0x100a7c14]"
  ],
  [
    "100a7c10",
    "ff248d107d0a10",
    "JMP dword ptr [ECX*0x4 + 0x100a7d10]"
  ],
  [
    "100a7c24",
    "8a4603",
    "MOV AL,byte ptr [ESI + 0x3]"
  ],
  [
    "100a7c27",
    "23d1",
    "AND EDX,ECX"
  ],
  [
    "100a7c29",
    "884703",
    "MOV byte ptr [EDI + 0x3],AL"
  ],
  [
    "100a7c2c",
    "83ee01",
    "SUB ESI,0x1"
  ],
  [
    "100a7c2f",
    "c1e902",
    "SHR ECX,0x2"
  ],
  [
    "100a7c32",
    "83ef01",
    "SUB EDI,0x1"
  ],
  [
    "100a7c35",
    "83f908",
    "CMP ECX,0x8"
  ],
  [
    "100a7c38",
    "72b2",
    "JC 0x100a7bec"
  ],
  [
    "100a7c3a",
    "fd",
    "STD"
  ],
  [
    "100a7c3b",
    "f3a5",
    "MOVSD.REP ES:EDI,ESI"
  ],
  [
    "100a7c3d",
    "fc",
    "CLD"
  ],
  [
    "100a7c3e",
    "ff2495107d0a10",
    "JMP dword ptr [EDX*0x4 + 0x100a7d10]"
  ],
  [
    "100a7c48",
    "8a4603",
    "MOV AL,byte ptr [ESI + 0x3]"
  ],
  [
    "100a7c4b",
    "23d1",
    "AND EDX,ECX"
  ],
  [
    "100a7c4d",
    "884703",
    "MOV byte ptr [EDI + 0x3],AL"
  ],
  [
    "100a7c50",
    "8a4602",
    "MOV AL,byte ptr [ESI + 0x2]"
  ],
  [
    "100a7c53",
    "c1e902",
    "SHR ECX,0x2"
  ],
  [
    "100a7c56",
    "884702",
    "MOV byte ptr [EDI + 0x2],AL"
  ],
  [
    "100a7c59",
    "83ee02",
    "SUB ESI,0x2"
  ],
  [
    "100a7c5c",
    "83ef02",
    "SUB EDI,0x2"
  ],
  [
    "100a7c5f",
    "83f908",
    "CMP ECX,0x8"
  ],
  [
    "100a7c62",
    "7288",
    "JC 0x100a7bec"
  ],
  [
    "100a7c64",
    "fd",
    "STD"
  ],
  [
    "100a7c65",
    "f3a5",
    "MOVSD.REP ES:EDI,ESI"
  ],
  [
    "100a7c67",
    "fc",
    "CLD"
  ],
  [
    "100a7c68",
    "ff2495107d0a10",
    "JMP dword ptr [EDX*0x4 + 0x100a7d10]"
  ],
  [
    "100a7c70",
    "8a4603",
    "MOV AL,byte ptr [ESI + 0x3]"
  ],
  [
    "100a7c73",
    "23d1",
    "AND EDX,ECX"
  ],
  [
    "100a7c75",
    "884703",
    "MOV byte ptr [EDI + 0x3],AL"
  ],
  [
    "100a7c78",
    "8a4602",
    "MOV AL,byte ptr [ESI + 0x2]"
  ],
  [
    "100a7c7b",
    "884702",
    "MOV byte ptr [EDI + 0x2],AL"
  ],
  [
    "100a7c7e",
    "8a4601",
    "MOV AL,byte ptr [ESI + 0x1]"
  ],
  [
    "100a7c81",
    "c1e902",
    "SHR ECX,0x2"
  ],
  [
    "100a7c84",
    "884701",
    "MOV byte ptr [EDI + 0x1],AL"
  ],
  [
    "100a7c87",
    "83ee03",
    "SUB ESI,0x3"
  ],
  [
    "100a7c8a",
    "83ef03",
    "SUB EDI,0x3"
  ],
  [
    "100a7c8d",
    "83f908",
    "CMP ECX,0x8"
  ],
  [
    "100a7c90",
    "0f8256ffffff",
    "JC 0x100a7bec"
  ],
  [
    "100a7c96",
    "fd",
    "STD"
  ],
  [
    "100a7c97",
    "f3a5",
    "MOVSD.REP ES:EDI,ESI"
  ],
  [
    "100a7c99",
    "fc",
    "CLD"
  ],
  [
    "100a7c9a",
    "ff2495107d0a10",
    "JMP dword ptr [EDX*0x4 + 0x100a7d10]"
  ],
  [
    "100a7cc4",
    "8b448e1c",
    "MOV EAX,dword ptr [ESI + ECX*0x4 + 0x1c]"
  ],
  [
    "100a7cc8",
    "89448f1c",
    "MOV dword ptr [EDI + ECX*0x4 + 0x1c],EAX"
  ],
  [
    "100a7ccc",
    "8b448e18",
    "MOV EAX,dword ptr [ESI + ECX*0x4 + 0x18]"
  ],
  [
    "100a7cd0",
    "89448f18",
    "MOV dword ptr [EDI + ECX*0x4 + 0x18],EAX"
  ],
  [
    "100a7cd4",
    "8b448e14",
    "MOV EAX,dword ptr [ESI + ECX*0x4 + 0x14]"
  ],
  [
    "100a7cd8",
    "89448f14",
    "MOV dword ptr [EDI + ECX*0x4 + 0x14],EAX"
  ],
  [
    "100a7cdc",
    "8b448e10",
    "MOV EAX,dword ptr [ESI + ECX*0x4 + 0x10]"
  ],
  [
    "100a7ce0",
    "89448f10",
    "MOV dword ptr [EDI + ECX*0x4 + 0x10],EAX"
  ],
  [
    "100a7ce4",
    "8b448e0c",
    "MOV EAX,dword ptr [ESI + ECX*0x4 + 0xc]"
  ],
  [
    "100a7ce8",
    "89448f0c",
    "MOV dword ptr [EDI + ECX*0x4 + 0xc],EAX"
  ],
  [
    "100a7cec",
    "8b448e08",
    "MOV EAX,dword ptr [ESI + ECX*0x4 + 0x8]"
  ],
  [
    "100a7cf0",
    "89448f08",
    "MOV dword ptr [EDI + ECX*0x4 + 0x8],EAX"
  ],
  [
    "100a7cf4",
    "8b448e04",
    "MOV EAX,dword ptr [ESI + ECX*0x4 + 0x4]"
  ],
  [
    "100a7cf8",
    "89448f04",
    "MOV dword ptr [EDI + ECX*0x4 + 0x4],EAX"
  ],
  [
    "100a7cfc",
    "8d048d00000000",
    "LEA EAX,[ECX*0x4 + 0x0]"
  ],
  [
    "100a7d03",
    "03f0",
    "ADD ESI,EAX"
  ],
  [
    "100a7d05",
    "03f8",
    "ADD EDI,EAX"
  ],
  [
    "100a7d07",
    "ff2495107d0a10",
    "JMP dword ptr [EDX*0x4 + 0x100a7d10]"
  ],
  [
    "100a7d20",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100a7d23",
    "5e",
    "POP ESI"
  ],
  [
    "100a7d24",
    "5f",
    "POP EDI"
  ],
  [
    "100a7d25",
    "c9",
    "LEAVE"
  ],
  [
    "100a7d26",
    "c3",
    "RET"
  ],
  [
    "100a7d28",
    "8a4603",
    "MOV AL,byte ptr [ESI + 0x3]"
  ],
  [
    "100a7d2b",
    "884703",
    "MOV byte ptr [EDI + 0x3],AL"
  ],
  [
    "100a7d2e",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100a7d31",
    "5e",
    "POP ESI"
  ],
  [
    "100a7d32",
    "5f",
    "POP EDI"
  ],
  [
    "100a7d33",
    "c9",
    "LEAVE"
  ],
  [
    "100a7d34",
    "c3",
    "RET"
  ],
  [
    "100a7d38",
    "8a4603",
    "MOV AL,byte ptr [ESI + 0x3]"
  ],
  [
    "100a7d3b",
    "884703",
    "MOV byte ptr [EDI + 0x3],AL"
  ],
  [
    "100a7d3e",
    "8a4602",
    "MOV AL,byte ptr [ESI + 0x2]"
  ],
  [
    "100a7d41",
    "884702",
    "MOV byte ptr [EDI + 0x2],AL"
  ],
  [
    "100a7d44",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100a7d47",
    "5e",
    "POP ESI"
  ],
  [
    "100a7d48",
    "5f",
    "POP EDI"
  ],
  [
    "100a7d49",
    "c9",
    "LEAVE"
  ],
  [
    "100a7d4a",
    "c3",
    "RET"
  ],
  [
    "100a7d4c",
    "8a4603",
    "MOV AL,byte ptr [ESI + 0x3]"
  ],
  [
    "100a7d4f",
    "884703",
    "MOV byte ptr [EDI + 0x3],AL"
  ],
  [
    "100a7d52",
    "8a4602",
    "MOV AL,byte ptr [ESI + 0x2]"
  ],
  [
    "100a7d55",
    "884702",
    "MOV byte ptr [EDI + 0x2],AL"
  ],
  [
    "100a7d58",
    "8a4601",
    "MOV AL,byte ptr [ESI + 0x1]"
  ],
  [
    "100a7d5b",
    "884701",
    "MOV byte ptr [EDI + 0x1],AL"
  ],
  [
    "100a7d5e",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100a7d61",
    "5e",
    "POP ESI"
  ],
  [
    "100a7d62",
    "5f",
    "POP EDI"
  ],
  [
    "100a7d63",
    "c9",
    "LEAVE"
  ],
  [
    "100a7d64",
    "c3",
    "RET"
  ],
  [
    "1000619f",
    "e95c870800",
    "JMP 0x1008e900"
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
  ],
  [
    "10002aae",
    "e93de10100",
    "JMP 0x10020bf0"
  ],
  [
    "10003cd8",
    "e923ce0100",
    "JMP 0x10020b00"
  ],
  [
    "10020b00",
    "e93c69feff",
    "JMP 0x10007441"
  ],
  [
    "10007441",
    "e9ca5f0300",
    "JMP 0x1003d410"
  ],
  [
    "10001028",
    "e9c3c20300",
    "JMP 0x1003d2f0"
  ],
  [
    "10002d97",
    "e974510400",
    "JMP 0x10047f10"
  ],
  [
    "100061cc",
    "e9cffb0300",
    "JMP 0x10045da0"
  ],
  [
    "100012e4",
    "e967b30300",
    "JMP 0x1003c650"
  ],
  [
    "1000605a",
    "e931800300",
    "JMP 0x1003e090"
  ]
];
const instructions=new Map<string,SharedInitializerInstruction>(rows.map(([address,bytes,instruction])=>
  [address!,Object.freeze({address:address!,bytes:bytes!,instruction:instruction!})]));
export function sharedInitializerInstruction(address:string):SharedInitializerInstruction {
  const row=instructions.get(address);if(!row)throw new Error('Unowned SharedBase initializer instruction '+address);return row;
}
