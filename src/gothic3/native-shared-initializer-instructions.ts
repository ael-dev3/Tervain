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
