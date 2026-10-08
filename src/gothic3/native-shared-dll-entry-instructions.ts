/** Captured original DLL entry syntax; execution requires runtime ownership. */
export interface SharedDllEntryInstruction {readonly address:string;readonly bytes:string;readonly instruction:string;}
const rows:readonly (readonly string[])[] = [
  [
    "10002112",
    "e9d9e90100",
    "JMP 0x10020af0"
  ],
  [
    "10002883",
    "e9389c0400",
    "JMP 0x1004c4c0"
  ],
  [
    "10002d42",
    "e979950400",
    "JMP 0x1004c2c0"
  ],
  [
    "10002e46",
    "e9a59c0300",
    "JMP 0x1003caf0"
  ],
  [
    "10005b37",
    "e9c46b0300",
    "JMP 0x1003c700"
  ],
  [
    "10005b69",
    "e9e26f0300",
    "JMP 0x1003cb50"
  ],
  [
    "10006645",
    "e946af0900",
    "JMP 0x100a1590"
  ],
  [
    "1000781a",
    "e9014c0400",
    "JMP 0x1004c420"
  ],
  [
    "10008058",
    "e923450400",
    "JMP 0x1004c580"
  ],
  [
    "1000840e",
    "e9dd130400",
    "JMP 0x100497f0"
  ],
  [
    "1000871f",
    "e92c110400",
    "JMP 0x10049850"
  ],
  [
    "10008a76",
    "e9b58b0900",
    "JMP 0x100a1630"
  ],
  [
    "10020af0",
    "e97450feff",
    "JMP 0x10005b69"
  ],
  [
    "1003c700",
    "8b1530b02f10",
    "MOV EDX,dword ptr [0x102fb030]"
  ],
  [
    "1003c706",
    "53",
    "PUSH EBX"
  ],
  [
    "1003c707",
    "56",
    "PUSH ESI"
  ],
  [
    "1003c708",
    "57",
    "PUSH EDI"
  ],
  [
    "1003c709",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "1003c70b",
    "85d2",
    "TEST EDX,EDX"
  ],
  [
    "1003c70d",
    "7432",
    "JZ 0x1003c741"
  ],
  [
    "1003c70f",
    "8b5c2410",
    "MOV EBX,dword ptr [ESP + 0x10]"
  ],
  [
    "1003c713",
    "8bc2",
    "MOV EAX,EDX"
  ],
  [
    "1003c715",
    "d1e8",
    "SHR EAX,0x1"
  ],
  [
    "1003c717",
    "8d3438",
    "LEA ESI,[EAX + EDI*0x1]"
  ],
  [
    "1003c71a",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "1003c71c",
    "c1e104",
    "SHL ECX,0x4"
  ],
  [
    "1003c71f",
    "3b99189a1410",
    "CMP EBX,dword ptr [ECX + 0x10149a18]"
  ],
  [
    "1003c725",
    "7304",
    "JNC 0x1003c72b"
  ],
  [
    "1003c727",
    "8bd0",
    "MOV EDX,EAX"
  ],
  [
    "1003c729",
    "eb12",
    "JMP 0x1003c73d"
  ],
  [
    "1003c72b",
    "3b991c9a1410",
    "CMP EBX,dword ptr [ECX + 0x10149a1c]"
  ],
  [
    "1003c731",
    "7216",
    "JC 0x1003c749"
  ],
  [
    "1003c733",
    "83c9ff",
    "OR ECX,0xffffffff"
  ],
  [
    "1003c736",
    "2bc8",
    "SUB ECX,EAX"
  ],
  [
    "1003c738",
    "03d1",
    "ADD EDX,ECX"
  ],
  [
    "1003c73a",
    "8d7e01",
    "LEA EDI,[ESI + 0x1]"
  ],
  [
    "1003c73d",
    "85d2",
    "TEST EDX,EDX"
  ],
  [
    "1003c73f",
    "75d2",
    "JNZ 0x1003c713"
  ],
  [
    "1003c741",
    "5f",
    "POP EDI"
  ],
  [
    "1003c742",
    "5e",
    "POP ESI"
  ],
  [
    "1003c743",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "1003c745",
    "5b",
    "POP EBX"
  ],
  [
    "1003c746",
    "c20400",
    "RET 0x4"
  ],
  [
    "1003c749",
    "03c7",
    "ADD EAX,EDI"
  ],
  [
    "1003c74b",
    "5f",
    "POP EDI"
  ],
  [
    "1003c74c",
    "c1e004",
    "SHL EAX,0x4"
  ],
  [
    "1003c74f",
    "5e",
    "POP ESI"
  ],
  [
    "1003c750",
    "05189a1410",
    "ADD EAX,0x10149a18"
  ],
  [
    "1003c755",
    "5b",
    "POP EBX"
  ],
  [
    "1003c756",
    "c20400",
    "RET 0x4"
  ],
  [
    "1003caf0",
    "56",
    "PUSH ESI"
  ],
  [
    "1003caf1",
    "8b742408",
    "MOV ESI,dword ptr [ESP + 0x8]"
  ],
  [
    "1003caf5",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "1003caf7",
    "7451",
    "JZ 0x1003cb4a"
  ],
  [
    "1003caf9",
    "56",
    "PUSH ESI"
  ],
  [
    "1003cafa",
    "e83890fcff",
    "CALL 0x10005b37"
  ],
  [
    "1003caff",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1003cb01",
    "56",
    "PUSH ESI"
  ],
  [
    "1003cb02",
    "7410",
    "JZ 0x1003cb14"
  ],
  [
    "1003cb04",
    "8b5008",
    "MOV EDX,dword ptr [EAX + 0x8]"
  ],
  [
    "1003cb07",
    "8b480c",
    "MOV ECX,dword ptr [EAX + 0xc]"
  ],
  [
    "1003cb0a",
    "8b4104",
    "MOV EAX,dword ptr [ECX + 0x4]"
  ],
  [
    "1003cb0d",
    "52",
    "PUSH EDX"
  ],
  [
    "1003cb0e",
    "ffd0",
    "CALL EAX"
  ],
  [
    "1003cb10",
    "5e",
    "POP ESI"
  ],
  [
    "1003cb11",
    "c20400",
    "RET 0x4"
  ],
  [
    "1003cb14",
    "e8c89afcff",
    "CALL 0x100065e1"
  ],
  [
    "1003cb19",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "1003cb1b",
    "752d",
    "JNZ 0x1003cb4a"
  ],
  [
    "1003cb1d",
    "8b0d08b02f10",
    "MOV ECX,dword ptr [0x102fb008]"
  ],
  [
    "1003cb23",
    "832d18b02f1001",
    "SUB dword ptr [0x102fb018],0x1"
  ],
  [
    "1003cb2a",
    "56",
    "PUSH ESI"
  ],
  [
    "1003cb2b",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1003cb2d",
    "51",
    "PUSH ECX"
  ],
  [
    "1003cb2e",
    "ff1578962f10",
    "CALL dword ptr [0x102f9678]"
  ],
  [
    "1003cb34",
    "8b1508b02f10",
    "MOV EDX,dword ptr [0x102fb008]"
  ],
  [
    "1003cb3a",
    "290520b02f10",
    "SUB dword ptr [0x102fb020],EAX"
  ],
  [
    "1003cb40",
    "56",
    "PUSH ESI"
  ],
  [
    "1003cb41",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1003cb43",
    "52",
    "PUSH EDX"
  ],
  [
    "1003cb44",
    "ff1574962f10",
    "CALL dword ptr [0x102f9674]"
  ],
  [
    "1003cb4a",
    "5e",
    "POP ESI"
  ],
  [
    "1003cb4b",
    "c20400",
    "RET 0x4"
  ],
  [
    "1003cb50",
    "55",
    "PUSH EBP"
  ],
  [
    "1003cb51",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "1003cb53",
    "6aff",
    "PUSH -0x1"
  ],
  [
    "1003cb55",
    "68e8820f10",
    "PUSH 0x100f82e8"
  ],
  [
    "1003cb5a",
    "68806f0a10",
    "PUSH 0x100a6f80"
  ],
  [
    "1003cb5f",
    "64a100000000",
    "MOV EAX,FS:[0x0]"
  ],
  [
    "1003cb65",
    "50",
    "PUSH EAX"
  ],
  [
    "1003cb66",
    "64892500000000",
    "MOV dword ptr FS:[0x0],ESP"
  ],
  [
    "1003cb6d",
    "83ec08",
    "SUB ESP,0x8"
  ],
  [
    "1003cb70",
    "53",
    "PUSH EBX"
  ],
  [
    "1003cb71",
    "56",
    "PUSH ESI"
  ],
  [
    "1003cb72",
    "57",
    "PUSH EDI"
  ],
  [
    "1003cb73",
    "8965e8",
    "MOV dword ptr [EBP + -0x18],ESP"
  ],
  [
    "1003cb76",
    "a000b02f10",
    "MOV AL,[0x102fb000]"
  ],
  [
    "1003cb7b",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "1003cb7d",
    "751f",
    "JNZ 0x1003cb9e"
  ],
  [
    "1003cb7f",
    "68e8030000",
    "PUSH 0x3e8"
  ],
  [
    "1003cb84",
    "68189a1810",
    "PUSH 0x10189a18"
  ],
  [
    "1003cb89",
    "ff156c962f10",
    "CALL dword ptr [0x102f966c]"
  ],
  [
    "1003cb8f",
    "83f801",
    "CMP EAX,0x1"
  ],
  [
    "1003cb92",
    "0f94c0",
    "SETZ AL"
  ],
  [
    "1003cb95",
    "a200b02f10",
    "MOV [0x102fb000],AL"
  ],
  [
    "1003cb9a",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "1003cb9c",
    "740b",
    "JZ 0x1003cba9"
  ],
  [
    "1003cb9e",
    "68189a1810",
    "PUSH 0x10189a18"
  ],
  [
    "1003cba3",
    "ff1504962f10",
    "CALL dword ptr [0x102f9604]"
  ],
  [
    "1003cba9",
    "c745fc00000000",
    "MOV dword ptr [EBP + -0x4],0x0"
  ],
  [
    "1003cbb0",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "1003cbb3",
    "50",
    "PUSH EAX"
  ],
  [
    "1003cbb4",
    "e88d62fcff",
    "CALL 0x10002e46"
  ],
  [
    "1003cbb9",
    "c745fcffffffff",
    "MOV dword ptr [EBP + -0x4],0xffffffff"
  ],
  [
    "1003cbc0",
    "68189a1810",
    "PUSH 0x10189a18"
  ],
  [
    "1003cbc5",
    "ff1508962f10",
    "CALL dword ptr [0x102f9608]"
  ],
  [
    "1003cbcb",
    "8b4df0",
    "MOV ECX,dword ptr [EBP + -0x10]"
  ],
  [
    "1003cbce",
    "64890d00000000",
    "MOV dword ptr FS:[0x0],ECX"
  ],
  [
    "1003cbd5",
    "5f",
    "POP EDI"
  ],
  [
    "1003cbd6",
    "5e",
    "POP ESI"
  ],
  [
    "1003cbd7",
    "5b",
    "POP EBX"
  ],
  [
    "1003cbd8",
    "8be5",
    "MOV ESP,EBP"
  ],
  [
    "1003cbda",
    "5d",
    "POP EBP"
  ],
  [
    "1003cbdb",
    "c20400",
    "RET 0x4"
  ],
  [
    "100497f0",
    "8b442404",
    "MOV EAX,dword ptr [ESP + 0x4]"
  ],
  [
    "100497f4",
    "8b4c2408",
    "MOV ECX,dword ptr [ESP + 0x8]"
  ],
  [
    "100497f8",
    "50",
    "PUSH EAX"
  ],
  [
    "100497f9",
    "68d8010000",
    "PUSH 0x1d8"
  ],
  [
    "100497fe",
    "68f87d0e10",
    "PUSH 0x100e7df8"
  ],
  [
    "10049803",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "10049805",
    "51",
    "PUSH ECX"
  ],
  [
    "10049806",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "10049808",
    "e8a7f0fbff",
    "CALL 0x100088b4"
  ],
  [
    "1004980d",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1004980f",
    "e84cbdfbff",
    "CALL 0x10005560"
  ],
  [
    "10049814",
    "c20800",
    "RET 0x8"
  ],
  [
    "10049850",
    "648b0d2c000000",
    "MOV ECX,dword ptr FS:[0x2c]"
  ],
  [
    "10049857",
    "a180642f10",
    "MOV EAX,[0x102f6480]"
  ],
  [
    "1004985c",
    "8b0481",
    "MOV EAX,dword ptr [ECX + EAX*0x4]"
  ],
  [
    "1004985f",
    "56",
    "PUSH ESI"
  ],
  [
    "10049860",
    "8db008010000",
    "LEA ESI,[EAX + 0x108]"
  ],
  [
    "10049866",
    "8b44240c",
    "MOV EAX,dword ptr [ESP + 0xc]"
  ],
  [
    "1004986a",
    "8d542410",
    "LEA EDX,[ESP + 0x10]"
  ],
  [
    "1004986e",
    "52",
    "PUSH EDX"
  ],
  [
    "1004986f",
    "50",
    "PUSH EAX"
  ],
  [
    "10049870",
    "56",
    "PUSH ESI"
  ],
  [
    "10049871",
    "e8b1e60500",
    "CALL 0x100a7f27"
  ],
  [
    "10049876",
    "8b4c2414",
    "MOV ECX,dword ptr [ESP + 0x14]"
  ],
  [
    "1004987a",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "1004987d",
    "51",
    "PUSH ECX"
  ],
  [
    "1004987e",
    "68d8010000",
    "PUSH 0x1d8"
  ],
  [
    "10049883",
    "68f87d0e10",
    "PUSH 0x100e7df8"
  ],
  [
    "10049888",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1004988a",
    "56",
    "PUSH ESI"
  ],
  [
    "1004988b",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "1004988d",
    "e822f0fbff",
    "CALL 0x100088b4"
  ],
  [
    "10049892",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "10049894",
    "e8c7bcfbff",
    "CALL 0x10005560"
  ],
  [
    "10049899",
    "5e",
    "POP ESI"
  ],
  [
    "1004989a",
    "c3",
    "RET"
  ],
  [
    "1004c2c0",
    "51",
    "PUSH ECX"
  ],
  [
    "1004c2c1",
    "55",
    "PUSH EBP"
  ],
  [
    "1004c2c2",
    "8b6c240c",
    "MOV EBP,dword ptr [ESP + 0xc]"
  ],
  [
    "1004c2c6",
    "56",
    "PUSH ESI"
  ],
  [
    "1004c2c7",
    "57",
    "PUSH EDI"
  ],
  [
    "1004c2c8",
    "8d442414",
    "LEA EAX,[ESP + 0x14]"
  ],
  [
    "1004c2cc",
    "50",
    "PUSH EAX"
  ],
  [
    "1004c2cd",
    "55",
    "PUSH EBP"
  ],
  [
    "1004c2ce",
    "c744241400000000",
    "MOV dword ptr [ESP + 0x14],0x0"
  ],
  [
    "1004c2d6",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "1004c2d8",
    "e805930800",
    "CALL 0x100d55e2"
  ],
  [
    "1004c2dd",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "1004c2df",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "1004c2e1",
    "0f841a010000",
    "JZ 0x1004c401"
  ],
  [
    "1004c2e7",
    "8d4e01",
    "LEA ECX,[ESI + 0x1]"
  ],
  [
    "1004c2ea",
    "51",
    "PUSH ECX"
  ],
  [
    "1004c2eb",
    "e8be67fbff",
    "CALL 0x10002aae"
  ],
  [
    "1004c2f0",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1004c2f2",
    "e8e179fbff",
    "CALL 0x10003cd8"
  ],
  [
    "1004c2f7",
    "8b542414",
    "MOV EDX,dword ptr [ESP + 0x14]"
  ],
  [
    "1004c2fb",
    "8bf8",
    "MOV EDI,EAX"
  ],
  [
    "1004c2fd",
    "57",
    "PUSH EDI"
  ],
  [
    "1004c2fe",
    "56",
    "PUSH ESI"
  ],
  [
    "1004c2ff",
    "52",
    "PUSH EDX"
  ],
  [
    "1004c300",
    "55",
    "PUSH EBP"
  ],
  [
    "1004c301",
    "e8d6920800",
    "CALL 0x100d55dc"
  ],
  [
    "1004c306",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1004c308",
    "0f84f3000000",
    "JZ 0x1004c401"
  ],
  [
    "1004c30e",
    "68ec810e10",
    "PUSH 0x100e81ec"
  ],
  [
    "1004c313",
    "6890b11a10",
    "PUSH 0x101ab190"
  ],
  [
    "1004c318",
    "e817df0500",
    "CALL 0x100aa234"
  ],
  [
    "1004c31d",
    "83c408",
    "ADD ESP,0x8"
  ],
  [
    "1004c320",
    "8d442414",
    "LEA EAX,[ESP + 0x14]"
  ],
  [
    "1004c324",
    "50",
    "PUSH EAX"
  ],
  [
    "1004c325",
    "8d4c2410",
    "LEA ECX,[ESP + 0x10]"
  ],
  [
    "1004c329",
    "51",
    "PUSH ECX"
  ],
  [
    "1004c32a",
    "6890b11a10",
    "PUSH 0x101ab190"
  ],
  [
    "1004c32f",
    "57",
    "PUSH EDI"
  ],
  [
    "1004c330",
    "e8a1920800",
    "CALL 0x100d55d6"
  ],
  [
    "1004c335",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1004c337",
    "743b",
    "JZ 0x1004c374"
  ],
  [
    "1004c339",
    "837c241404",
    "CMP dword ptr [ESP + 0x14],0x4"
  ],
  [
    "1004c33e",
    "7534",
    "JNZ 0x1004c374"
  ],
  [
    "1004c340",
    "8b54240c",
    "MOV EDX,dword ptr [ESP + 0xc]"
  ],
  [
    "1004c344",
    "8b02",
    "MOV EAX,dword ptr [EDX]"
  ],
  [
    "1004c346",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1004c348",
    "c1e910",
    "SHR ECX,0x10"
  ],
  [
    "1004c34b",
    "81e1ff000000",
    "AND ECX,0xff"
  ],
  [
    "1004c351",
    "51",
    "PUSH ECX"
  ],
  [
    "1004c352",
    "8bd0",
    "MOV EDX,EAX"
  ],
  [
    "1004c354",
    "c1ea18",
    "SHR EDX,0x18"
  ],
  [
    "1004c357",
    "52",
    "PUSH EDX"
  ],
  [
    "1004c358",
    "0fb6c8",
    "MOVZX ECX,AL"
  ],
  [
    "1004c35b",
    "51",
    "PUSH ECX"
  ],
  [
    "1004c35c",
    "0fb6d4",
    "MOVZX EDX,AH"
  ],
  [
    "1004c35f",
    "52",
    "PUSH EDX"
  ],
  [
    "1004c360",
    "68b4810e10",
    "PUSH 0x100e81b4"
  ],
  [
    "1004c365",
    "6890b11a10",
    "PUSH 0x101ab190"
  ],
  [
    "1004c36a",
    "e8c5de0500",
    "CALL 0x100aa234"
  ],
  [
    "1004c36f",
    "83c418",
    "ADD ESP,0x18"
  ],
  [
    "1004c372",
    "eb1c",
    "JMP 0x1004c390"
  ],
  [
    "1004c374",
    "ff15ac962f10",
    "CALL dword ptr [0x102f96ac]"
  ],
  [
    "1004c37a",
    "0fb7c0",
    "MOVZX EAX,AX"
  ],
  [
    "1004c37d",
    "50",
    "PUSH EAX"
  ],
  [
    "1004c37e",
    "6888810e10",
    "PUSH 0x100e8188"
  ],
  [
    "1004c383",
    "6890b11a10",
    "PUSH 0x101ab190"
  ],
  [
    "1004c388",
    "e8a7de0500",
    "CALL 0x100aa234"
  ],
  [
    "1004c38d",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "1004c390",
    "8d4c2414",
    "LEA ECX,[ESP + 0x14]"
  ],
  [
    "1004c394",
    "51",
    "PUSH ECX"
  ],
  [
    "1004c395",
    "8d542410",
    "LEA EDX,[ESP + 0x10]"
  ],
  [
    "1004c399",
    "52",
    "PUSH EDX"
  ],
  [
    "1004c39a",
    "6890b11a10",
    "PUSH 0x101ab190"
  ],
  [
    "1004c39f",
    "57",
    "PUSH EDI"
  ],
  [
    "1004c3a0",
    "e831920800",
    "CALL 0x100d55d6"
  ],
  [
    "1004c3a5",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1004c3a7",
    "7458",
    "JZ 0x1004c401"
  ],
  [
    "1004c3a9",
    "817c241400010000",
    "CMP dword ptr [ESP + 0x14],0x100"
  ],
  [
    "1004c3b1",
    "8b44240c",
    "MOV EAX,dword ptr [ESP + 0xc]"
  ],
  [
    "1004c3b5",
    "7317",
    "JNC 0x1004c3ce"
  ],
  [
    "1004c3b7",
    "ba90b11a10",
    "MOV EDX,0x101ab190"
  ],
  [
    "1004c3bc",
    "2bd0",
    "SUB EDX,EAX"
  ],
  [
    "1004c3be",
    "8bff",
    "MOV EDI,EDI"
  ],
  [
    "1004c3c0",
    "8a08",
    "MOV CL,byte ptr [EAX]"
  ],
  [
    "1004c3c2",
    "880c02",
    "MOV byte ptr [EDX + EAX*0x1],CL"
  ],
  [
    "1004c3c5",
    "83c001",
    "ADD EAX,0x1"
  ],
  [
    "1004c3c8",
    "84c9",
    "TEST CL,CL"
  ],
  [
    "1004c3ca",
    "75f4",
    "JNZ 0x1004c3c0"
  ],
  [
    "1004c3cc",
    "eb1a",
    "JMP 0x1004c3e8"
  ],
  [
    "1004c3ce",
    "68fa000000",
    "PUSH 0xfa"
  ],
  [
    "1004c3d3",
    "50",
    "PUSH EAX"
  ],
  [
    "1004c3d4",
    "6890b11a10",
    "PUSH 0x101ab190"
  ],
  [
    "1004c3d9",
    "e8a2e40500",
    "CALL 0x100aa880"
  ],
  [
    "1004c3de",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "1004c3e1",
    "c6058ab21a1000",
    "MOV byte ptr [0x101ab28a],0x0"
  ],
  [
    "1004c3e8",
    "57",
    "PUSH EDI"
  ],
  [
    "1004c3e9",
    "e8c066fbff",
    "CALL 0x10002aae"
  ],
  [
    "1004c3ee",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1004c3f0",
    "e81d5dfbff",
    "CALL 0x10002112"
  ],
  [
    "1004c3f5",
    "5f",
    "POP EDI"
  ],
  [
    "1004c3f6",
    "5e",
    "POP ESI"
  ],
  [
    "1004c3f7",
    "b890b11a10",
    "MOV EAX,0x101ab190"
  ],
  [
    "1004c3fc",
    "5d",
    "POP EBP"
  ],
  [
    "1004c3fd",
    "59",
    "POP ECX"
  ],
  [
    "1004c3fe",
    "c20400",
    "RET 0x4"
  ],
  [
    "1004c401",
    "57",
    "PUSH EDI"
  ],
  [
    "1004c402",
    "e8a766fbff",
    "CALL 0x10002aae"
  ],
  [
    "1004c407",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1004c409",
    "e8045dfbff",
    "CALL 0x10002112"
  ],
  [
    "1004c40e",
    "5f",
    "POP EDI"
  ],
  [
    "1004c40f",
    "5e",
    "POP ESI"
  ],
  [
    "1004c410",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "1004c412",
    "5d",
    "POP EBP"
  ],
  [
    "1004c413",
    "59",
    "POP ECX"
  ],
  [
    "1004c414",
    "c20400",
    "RET 0x4"
  ],
  [
    "1004c420",
    "8b442404",
    "MOV EAX,dword ptr [ESP + 0x4]"
  ],
  [
    "1004c424",
    "680c820e10",
    "PUSH 0x100e820c"
  ],
  [
    "1004c429",
    "50",
    "PUSH EAX"
  ],
  [
    "1004c42a",
    "e8d1080600",
    "CALL 0x100acd00"
  ],
  [
    "1004c42f",
    "83c408",
    "ADD ESP,0x8"
  ],
  [
    "1004c432",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1004c434",
    "7505",
    "JNZ 0x1004c43b"
  ],
  [
    "1004c436",
    "32c0",
    "XOR AL,AL"
  ],
  [
    "1004c438",
    "c21400",
    "RET 0x14"
  ],
  [
    "1004c43b",
    "50",
    "PUSH EAX"
  ],
  [
    "1004c43c",
    "e801b50500",
    "CALL 0x100a7942"
  ],
  [
    "1004c441",
    "8b4c240c",
    "MOV ECX,dword ptr [ESP + 0xc]"
  ],
  [
    "1004c445",
    "680c820e10",
    "PUSH 0x100e820c"
  ],
  [
    "1004c44a",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1004c44c",
    "8901",
    "MOV dword ptr [ECX],EAX"
  ],
  [
    "1004c44e",
    "e8ad080600",
    "CALL 0x100acd00"
  ],
  [
    "1004c453",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "1004c456",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1004c458",
    "74dc",
    "JZ 0x1004c436"
  ],
  [
    "1004c45a",
    "50",
    "PUSH EAX"
  ],
  [
    "1004c45b",
    "e8e2b40500",
    "CALL 0x100a7942"
  ],
  [
    "1004c460",
    "8b542410",
    "MOV EDX,dword ptr [ESP + 0x10]"
  ],
  [
    "1004c464",
    "680c820e10",
    "PUSH 0x100e820c"
  ],
  [
    "1004c469",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1004c46b",
    "8902",
    "MOV dword ptr [EDX],EAX"
  ],
  [
    "1004c46d",
    "e88e080600",
    "CALL 0x100acd00"
  ],
  [
    "1004c472",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "1004c475",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1004c477",
    "74bd",
    "JZ 0x1004c436"
  ],
  [
    "1004c479",
    "50",
    "PUSH EAX"
  ],
  [
    "1004c47a",
    "e8c3b40500",
    "CALL 0x100a7942"
  ],
  [
    "1004c47f",
    "8b4c2414",
    "MOV ECX,dword ptr [ESP + 0x14]"
  ],
  [
    "1004c483",
    "680c820e10",
    "PUSH 0x100e820c"
  ],
  [
    "1004c488",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1004c48a",
    "8901",
    "MOV dword ptr [ECX],EAX"
  ],
  [
    "1004c48c",
    "e86f080600",
    "CALL 0x100acd00"
  ],
  [
    "1004c491",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "1004c494",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1004c496",
    "750b",
    "JNZ 0x1004c4a3"
  ],
  [
    "1004c498",
    "8b542414",
    "MOV EDX,dword ptr [ESP + 0x14]"
  ],
  [
    "1004c49c",
    "8902",
    "MOV dword ptr [EDX],EAX"
  ],
  [
    "1004c49e",
    "b001",
    "MOV AL,0x1"
  ],
  [
    "1004c4a0",
    "c21400",
    "RET 0x14"
  ],
  [
    "1004c4a3",
    "50",
    "PUSH EAX"
  ],
  [
    "1004c4a4",
    "e899b40500",
    "CALL 0x100a7942"
  ],
  [
    "1004c4a9",
    "8b4c2418",
    "MOV ECX,dword ptr [ESP + 0x18]"
  ],
  [
    "1004c4ad",
    "8901",
    "MOV dword ptr [ECX],EAX"
  ],
  [
    "1004c4af",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "1004c4b2",
    "b001",
    "MOV AL,0x1"
  ],
  [
    "1004c4b4",
    "c21400",
    "RET 0x14"
  ],
  [
    "1004c4c0",
    "51",
    "PUSH ECX"
  ],
  [
    "1004c4c1",
    "56",
    "PUSH ESI"
  ],
  [
    "1004c4c2",
    "8b74240c",
    "MOV ESI,dword ptr [ESP + 0xc]"
  ],
  [
    "1004c4c6",
    "57",
    "PUSH EDI"
  ],
  [
    "1004c4c7",
    "8d442408",
    "LEA EAX,[ESP + 0x8]"
  ],
  [
    "1004c4cb",
    "50",
    "PUSH EAX"
  ],
  [
    "1004c4cc",
    "56",
    "PUSH ESI"
  ],
  [
    "1004c4cd",
    "c744241000000000",
    "MOV dword ptr [ESP + 0x10],0x0"
  ],
  [
    "1004c4d5",
    "e808910800",
    "CALL 0x100d55e2"
  ],
  [
    "1004c4da",
    "8bf8",
    "MOV EDI,EAX"
  ],
  [
    "1004c4dc",
    "85ff",
    "TEST EDI,EDI"
  ],
  [
    "1004c4de",
    "7508",
    "JNZ 0x1004c4e8"
  ],
  [
    "1004c4e0",
    "5f",
    "POP EDI"
  ],
  [
    "1004c4e1",
    "32c0",
    "XOR AL,AL"
  ],
  [
    "1004c4e3",
    "5e",
    "POP ESI"
  ],
  [
    "1004c4e4",
    "59",
    "POP ECX"
  ],
  [
    "1004c4e5",
    "c21400",
    "RET 0x14"
  ],
  [
    "1004c4e8",
    "53",
    "PUSH EBX"
  ],
  [
    "1004c4e9",
    "57",
    "PUSH EDI"
  ],
  [
    "1004c4ea",
    "e8bf65fbff",
    "CALL 0x10002aae"
  ],
  [
    "1004c4ef",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1004c4f1",
    "e8e277fbff",
    "CALL 0x10003cd8"
  ],
  [
    "1004c4f6",
    "8b4c240c",
    "MOV ECX,dword ptr [ESP + 0xc]"
  ],
  [
    "1004c4fa",
    "8bd8",
    "MOV EBX,EAX"
  ],
  [
    "1004c4fc",
    "53",
    "PUSH EBX"
  ],
  [
    "1004c4fd",
    "57",
    "PUSH EDI"
  ],
  [
    "1004c4fe",
    "51",
    "PUSH ECX"
  ],
  [
    "1004c4ff",
    "56",
    "PUSH ESI"
  ],
  [
    "1004c500",
    "895c2424",
    "MOV dword ptr [ESP + 0x24],EBX"
  ],
  [
    "1004c504",
    "e8d3900800",
    "CALL 0x100d55dc"
  ],
  [
    "1004c509",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1004c50b",
    "7516",
    "JNZ 0x1004c523"
  ],
  [
    "1004c50d",
    "53",
    "PUSH EBX"
  ],
  [
    "1004c50e",
    "e89b65fbff",
    "CALL 0x10002aae"
  ],
  [
    "1004c513",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1004c515",
    "e8f85bfbff",
    "CALL 0x10002112"
  ],
  [
    "1004c51a",
    "5b",
    "POP EBX"
  ],
  [
    "1004c51b",
    "5f",
    "POP EDI"
  ],
  [
    "1004c51c",
    "32c0",
    "XOR AL,AL"
  ],
  [
    "1004c51e",
    "5e",
    "POP ESI"
  ],
  [
    "1004c51f",
    "59",
    "POP ECX"
  ],
  [
    "1004c520",
    "c21400",
    "RET 0x14"
  ],
  [
    "1004c523",
    "55",
    "PUSH EBP"
  ],
  [
    "1004c524",
    "56",
    "PUSH ESI"
  ],
  [
    "1004c525",
    "e81868fbff",
    "CALL 0x10002d42"
  ],
  [
    "1004c52a",
    "8b7c2428",
    "MOV EDI,dword ptr [ESP + 0x28]"
  ],
  [
    "1004c52e",
    "8b6c2424",
    "MOV EBP,dword ptr [ESP + 0x24]"
  ],
  [
    "1004c532",
    "8b542420",
    "MOV EDX,dword ptr [ESP + 0x20]"
  ],
  [
    "1004c536",
    "57",
    "PUSH EDI"
  ],
  [
    "1004c537",
    "55",
    "PUSH EBP"
  ],
  [
    "1004c538",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "1004c53a",
    "8b442424",
    "MOV EAX,dword ptr [ESP + 0x24]"
  ],
  [
    "1004c53e",
    "52",
    "PUSH EDX"
  ],
  [
    "1004c53f",
    "50",
    "PUSH EAX"
  ],
  [
    "1004c540",
    "56",
    "PUSH ESI"
  ],
  [
    "1004c541",
    "e8d4b2fbff",
    "CALL 0x1000781a"
  ],
  [
    "1004c546",
    "8ad8",
    "MOV BL,AL"
  ],
  [
    "1004c548",
    "84db",
    "TEST BL,BL"
  ],
  [
    "1004c54a",
    "7514",
    "JNZ 0x1004c560"
  ],
  [
    "1004c54c",
    "8b4c2420",
    "MOV ECX,dword ptr [ESP + 0x20]"
  ],
  [
    "1004c550",
    "8b54241c",
    "MOV EDX,dword ptr [ESP + 0x1c]"
  ],
  [
    "1004c554",
    "57",
    "PUSH EDI"
  ],
  [
    "1004c555",
    "55",
    "PUSH EBP"
  ],
  [
    "1004c556",
    "51",
    "PUSH ECX"
  ],
  [
    "1004c557",
    "52",
    "PUSH EDX"
  ],
  [
    "1004c558",
    "56",
    "PUSH ESI"
  ],
  [
    "1004c559",
    "e8bcb2fbff",
    "CALL 0x1000781a"
  ],
  [
    "1004c55e",
    "8ad8",
    "MOV BL,AL"
  ],
  [
    "1004c560",
    "8b442418",
    "MOV EAX,dword ptr [ESP + 0x18]"
  ],
  [
    "1004c564",
    "50",
    "PUSH EAX"
  ],
  [
    "1004c565",
    "e84465fbff",
    "CALL 0x10002aae"
  ],
  [
    "1004c56a",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1004c56c",
    "e8a15bfbff",
    "CALL 0x10002112"
  ],
  [
    "1004c571",
    "5d",
    "POP EBP"
  ],
  [
    "1004c572",
    "8ac3",
    "MOV AL,BL"
  ],
  [
    "1004c574",
    "5b",
    "POP EBX"
  ],
  [
    "1004c575",
    "5f",
    "POP EDI"
  ],
  [
    "1004c576",
    "5e",
    "POP ESI"
  ],
  [
    "1004c577",
    "59",
    "POP ECX"
  ],
  [
    "1004c578",
    "c21400",
    "RET 0x14"
  ],
  [
    "1004c580",
    "81ec18010000",
    "SUB ESP,0x118"
  ],
  [
    "1004c586",
    "53",
    "PUSH EBX"
  ],
  [
    "1004c587",
    "55",
    "PUSH EBP"
  ],
  [
    "1004c588",
    "8b2db0962f10",
    "MOV EBP,dword ptr [0x102f96b0]"
  ],
  [
    "1004c58e",
    "56",
    "PUSH ESI"
  ],
  [
    "1004c58f",
    "57",
    "PUSH EDI"
  ],
  [
    "1004c590",
    "8bbc242c010000",
    "MOV EDI,dword ptr [ESP + 0x12c]"
  ],
  [
    "1004c597",
    "57",
    "PUSH EDI"
  ],
  [
    "1004c598",
    "8d442428",
    "LEA EAX,[ESP + 0x28]"
  ],
  [
    "1004c59c",
    "50",
    "PUSH EAX"
  ],
  [
    "1004c59d",
    "b301",
    "MOV BL,0x1"
  ],
  [
    "1004c59f",
    "ffd5",
    "CALL EBP"
  ],
  [
    "1004c5a1",
    "8d4c2424",
    "LEA ECX,[ESP + 0x24]"
  ],
  [
    "1004c5a5",
    "51",
    "PUSH ECX"
  ],
  [
    "1004c5a6",
    "ff1540962f10",
    "CALL dword ptr [0x102f9640]"
  ],
  [
    "1004c5ac",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "1004c5ae",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "1004c5b0",
    "747c",
    "JZ 0x1004c62e"
  ],
  [
    "1004c5b2",
    "6810820e10",
    "PUSH 0x100e8210"
  ],
  [
    "1004c5b7",
    "56",
    "PUSH ESI"
  ],
  [
    "1004c5b8",
    "ff1548962f10",
    "CALL dword ptr [0x102f9648]"
  ],
  [
    "1004c5be",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1004c5c0",
    "745f",
    "JZ 0x1004c621"
  ],
  [
    "1004c5c2",
    "33c9",
    "XOR ECX,ECX"
  ],
  [
    "1004c5c4",
    "8d542410",
    "LEA EDX,[ESP + 0x10]"
  ],
  [
    "1004c5c8",
    "894c2410",
    "MOV dword ptr [ESP + 0x10],ECX"
  ],
  [
    "1004c5cc",
    "52",
    "PUSH EDX"
  ],
  [
    "1004c5cd",
    "894c2418",
    "MOV dword ptr [ESP + 0x18],ECX"
  ],
  [
    "1004c5d1",
    "894c241c",
    "MOV dword ptr [ESP + 0x1c],ECX"
  ],
  [
    "1004c5d5",
    "894c2420",
    "MOV dword ptr [ESP + 0x20],ECX"
  ],
  [
    "1004c5d9",
    "894c2424",
    "MOV dword ptr [ESP + 0x24],ECX"
  ],
  [
    "1004c5dd",
    "c744241414000000",
    "MOV dword ptr [ESP + 0x14],0x14"
  ],
  [
    "1004c5e5",
    "ffd0",
    "CALL EAX"
  ],
  [
    "1004c5e7",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1004c5e9",
    "7c36",
    "JL 0x1004c621"
  ],
  [
    "1004c5eb",
    "8b442414",
    "MOV EAX,dword ptr [ESP + 0x14]"
  ],
  [
    "1004c5ef",
    "8b8c2430010000",
    "MOV ECX,dword ptr [ESP + 0x130]"
  ],
  [
    "1004c5f6",
    "8b542418",
    "MOV EDX,dword ptr [ESP + 0x18]"
  ],
  [
    "1004c5fa",
    "8901",
    "MOV dword ptr [ECX],EAX"
  ],
  [
    "1004c5fc",
    "8b842434010000",
    "MOV EAX,dword ptr [ESP + 0x134]"
  ],
  [
    "1004c603",
    "8b4c241c",
    "MOV ECX,dword ptr [ESP + 0x1c]"
  ],
  [
    "1004c607",
    "8910",
    "MOV dword ptr [EAX],EDX"
  ],
  [
    "1004c609",
    "8b942438010000",
    "MOV EDX,dword ptr [ESP + 0x138]"
  ],
  [
    "1004c610",
    "8b442420",
    "MOV EAX,dword ptr [ESP + 0x20]"
  ],
  [
    "1004c614",
    "890a",
    "MOV dword ptr [EDX],ECX"
  ],
  [
    "1004c616",
    "8b8c243c010000",
    "MOV ECX,dword ptr [ESP + 0x13c]"
  ],
  [
    "1004c61d",
    "8901",
    "MOV dword ptr [ECX],EAX"
  ],
  [
    "1004c61f",
    "eb02",
    "JMP 0x1004c623"
  ],
  [
    "1004c621",
    "32db",
    "XOR BL,BL"
  ],
  [
    "1004c623",
    "56",
    "PUSH ESI"
  ],
  [
    "1004c624",
    "ff1544962f10",
    "CALL dword ptr [0x102f9644]"
  ],
  [
    "1004c62a",
    "84db",
    "TEST BL,BL"
  ],
  [
    "1004c62c",
    "7542",
    "JNZ 0x1004c670"
  ],
  [
    "1004c62e",
    "57",
    "PUSH EDI"
  ],
  [
    "1004c62f",
    "8d542428",
    "LEA EDX,[ESP + 0x28]"
  ],
  [
    "1004c633",
    "52",
    "PUSH EDX"
  ],
  [
    "1004c634",
    "ffd5",
    "CALL EBP"
  ],
  [
    "1004c636",
    "8b84243c010000",
    "MOV EAX,dword ptr [ESP + 0x13c]"
  ],
  [
    "1004c63d",
    "8b8c2438010000",
    "MOV ECX,dword ptr [ESP + 0x138]"
  ],
  [
    "1004c644",
    "8b942434010000",
    "MOV EDX,dword ptr [ESP + 0x134]"
  ],
  [
    "1004c64b",
    "50",
    "PUSH EAX"
  ],
  [
    "1004c64c",
    "8b842434010000",
    "MOV EAX,dword ptr [ESP + 0x134]"
  ],
  [
    "1004c653",
    "51",
    "PUSH ECX"
  ],
  [
    "1004c654",
    "52",
    "PUSH EDX"
  ],
  [
    "1004c655",
    "50",
    "PUSH EAX"
  ],
  [
    "1004c656",
    "8d4c2434",
    "LEA ECX,[ESP + 0x34]"
  ],
  [
    "1004c65a",
    "51",
    "PUSH ECX"
  ],
  [
    "1004c65b",
    "e82362fbff",
    "CALL 0x10002883"
  ],
  [
    "1004c660",
    "5f",
    "POP EDI"
  ],
  [
    "1004c661",
    "5e",
    "POP ESI"
  ],
  [
    "1004c662",
    "5d",
    "POP EBP"
  ],
  [
    "1004c663",
    "0fb6c0",
    "MOVZX EAX,AL"
  ],
  [
    "1004c666",
    "5b",
    "POP EBX"
  ],
  [
    "1004c667",
    "81c418010000",
    "ADD ESP,0x118"
  ],
  [
    "1004c66d",
    "c21400",
    "RET 0x14"
  ],
  [
    "1004c670",
    "5f",
    "POP EDI"
  ],
  [
    "1004c671",
    "5e",
    "POP ESI"
  ],
  [
    "1004c672",
    "5d",
    "POP EBP"
  ],
  [
    "1004c673",
    "b801000000",
    "MOV EAX,0x1"
  ],
  [
    "1004c678",
    "5b",
    "POP EBX"
  ],
  [
    "1004c679",
    "81c418010000",
    "ADD ESP,0x118"
  ],
  [
    "1004c67f",
    "c21400",
    "RET 0x14"
  ],
  [
    "100a1590",
    "83ec10",
    "SUB ESP,0x10"
  ],
  [
    "100a1593",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100a1595",
    "56",
    "PUSH ESI"
  ],
  [
    "100a1596",
    "89442410",
    "MOV dword ptr [ESP + 0x10],EAX"
  ],
  [
    "100a159a",
    "8944240c",
    "MOV dword ptr [ESP + 0xc],EAX"
  ],
  [
    "100a159e",
    "89442408",
    "MOV dword ptr [ESP + 0x8],EAX"
  ],
  [
    "100a15a2",
    "89442404",
    "MOV dword ptr [ESP + 0x4],EAX"
  ],
  [
    "100a15a6",
    "8d442404",
    "LEA EAX,[ESP + 0x4]"
  ],
  [
    "100a15aa",
    "50",
    "PUSH EAX"
  ],
  [
    "100a15ab",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100a15ad",
    "8d4c240c",
    "LEA ECX,[ESP + 0xc]"
  ],
  [
    "100a15b1",
    "51",
    "PUSH ECX"
  ],
  [
    "100a15b2",
    "8d542414",
    "LEA EDX,[ESP + 0x14]"
  ],
  [
    "100a15b6",
    "52",
    "PUSH EDX"
  ],
  [
    "100a15b7",
    "8d44241c",
    "LEA EAX,[ESP + 0x1c]"
  ],
  [
    "100a15bb",
    "50",
    "PUSH EAX"
  ],
  [
    "100a15bc",
    "6814bb0e10",
    "PUSH 0x100ebb14"
  ],
  [
    "100a15c1",
    "e8926af6ff",
    "CALL 0x10008058"
  ],
  [
    "100a15c6",
    "68b8ba0e10",
    "PUSH 0x100ebab8"
  ],
  [
    "100a15cb",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100a15cd",
    "e83c6ef6ff",
    "CALL 0x1000840e"
  ],
  [
    "100a15d2",
    "8b4c2404",
    "MOV ECX,dword ptr [ESP + 0x4]"
  ],
  [
    "100a15d6",
    "8b542408",
    "MOV EDX,dword ptr [ESP + 0x8]"
  ],
  [
    "100a15da",
    "8b44240c",
    "MOV EAX,dword ptr [ESP + 0xc]"
  ],
  [
    "100a15de",
    "51",
    "PUSH ECX"
  ],
  [
    "100a15df",
    "8b4c2414",
    "MOV ECX,dword ptr [ESP + 0x14]"
  ],
  [
    "100a15e3",
    "52",
    "PUSH EDX"
  ],
  [
    "100a15e4",
    "50",
    "PUSH EAX"
  ],
  [
    "100a15e5",
    "51",
    "PUSH ECX"
  ],
  [
    "100a15e6",
    "6868ba0e10",
    "PUSH 0x100eba68"
  ],
  [
    "100a15eb",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100a15ed",
    "e82d71f6ff",
    "CALL 0x1000871f"
  ],
  [
    "100a15f2",
    "83c418",
    "ADD ESP,0x18"
  ],
  [
    "100a15f5",
    "68b8ba0e10",
    "PUSH 0x100ebab8"
  ],
  [
    "100a15fa",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100a15fc",
    "e80d6ef6ff",
    "CALL 0x1000840e"
  ],
  [
    "100a1601",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100a1603",
    "5e",
    "POP ESI"
  ],
  [
    "100a1604",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100a1607",
    "c3",
    "RET"
  ],
  [
    "100a1630",
    "f605f0482f1001",
    "TEST byte ptr [0x102f48f0],0x1"
  ],
  [
    "100a1637",
    "7511",
    "JNZ 0x100a164a"
  ],
  [
    "100a1639",
    "830df0482f1001",
    "OR dword ptr [0x102f48f0],0x1"
  ],
  [
    "100a1640",
    "b9ec482f10",
    "MOV ECX,0x102f48ec"
  ],
  [
    "100a1645",
    "e8fb4ff6ff",
    "CALL 0x10006645"
  ],
  [
    "100a164a",
    "b801000000",
    "MOV EAX,0x1"
  ],
  [
    "100a164f",
    "c20c00",
    "RET 0xc"
  ],
  [
    "100a74b6",
    "8b442404",
    "MOV EAX,dword ptr [ESP + 0x4]"
  ],
  [
    "100a74ba",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100a74bc",
    "56",
    "PUSH ESI"
  ],
  [
    "100a74bd",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100a74bf",
    "c6460c00",
    "MOV byte ptr [ESI + 0xc],0x0"
  ],
  [
    "100a74c3",
    "7563",
    "JNZ 0x100a7528"
  ],
  [
    "100a74c5",
    "e878700000",
    "CALL 0x100ae542"
  ],
  [
    "100a74ca",
    "894608",
    "MOV dword ptr [ESI + 0x8],EAX"
  ],
  [
    "100a74cd",
    "8b486c",
    "MOV ECX,dword ptr [EAX + 0x6c]"
  ],
  [
    "100a74d0",
    "890e",
    "MOV dword ptr [ESI],ECX"
  ],
  [
    "100a74d2",
    "8b4868",
    "MOV ECX,dword ptr [EAX + 0x68]"
  ],
  [
    "100a74d5",
    "894e04",
    "MOV dword ptr [ESI + 0x4],ECX"
  ],
  [
    "100a74d8",
    "8b0e",
    "MOV ECX,dword ptr [ESI]"
  ],
  [
    "100a74da",
    "3b0d68141410",
    "CMP ECX,dword ptr [0x10141468]"
  ],
  [
    "100a74e0",
    "7412",
    "JZ 0x100a74f4"
  ],
  [
    "100a74e2",
    "8b0d84131410",
    "MOV ECX,dword ptr [0x10141384]"
  ],
  [
    "100a74e8",
    "854870",
    "TEST dword ptr [EAX + 0x70],ECX"
  ],
  [
    "100a74eb",
    "7507",
    "JNZ 0x100a74f4"
  ],
  [
    "100a74ed",
    "e840a60000",
    "CALL 0x100b1b32"
  ],
  [
    "100a74f2",
    "8906",
    "MOV dword ptr [ESI],EAX"
  ],
  [
    "100a74f4",
    "8b4604",
    "MOV EAX,dword ptr [ESI + 0x4]"
  ],
  [
    "100a74f7",
    "3b0588121410",
    "CMP EAX,dword ptr [0x10141288]"
  ],
  [
    "100a74fd",
    "7416",
    "JZ 0x100a7515"
  ],
  [
    "100a74ff",
    "8b4608",
    "MOV EAX,dword ptr [ESI + 0x8]"
  ],
  [
    "100a7502",
    "8b0d84131410",
    "MOV ECX,dword ptr [0x10141384]"
  ],
  [
    "100a7508",
    "854870",
    "TEST dword ptr [EAX + 0x70],ECX"
  ],
  [
    "100a750b",
    "7508",
    "JNZ 0x100a7515"
  ],
  [
    "100a750d",
    "e8759e0000",
    "CALL 0x100b1387"
  ],
  [
    "100a7512",
    "894604",
    "MOV dword ptr [ESI + 0x4],EAX"
  ],
  [
    "100a7515",
    "8b4608",
    "MOV EAX,dword ptr [ESI + 0x8]"
  ],
  [
    "100a7518",
    "f6407002",
    "TEST byte ptr [EAX + 0x70],0x2"
  ],
  [
    "100a751c",
    "7514",
    "JNZ 0x100a7532"
  ],
  [
    "100a751e",
    "83487002",
    "OR dword ptr [EAX + 0x70],0x2"
  ],
  [
    "100a7522",
    "c6460c01",
    "MOV byte ptr [ESI + 0xc],0x1"
  ],
  [
    "100a7526",
    "eb0a",
    "JMP 0x100a7532"
  ],
  [
    "100a7528",
    "8b08",
    "MOV ECX,dword ptr [EAX]"
  ],
  [
    "100a752a",
    "890e",
    "MOV dword ptr [ESI],ECX"
  ],
  [
    "100a752c",
    "8b4004",
    "MOV EAX,dword ptr [EAX + 0x4]"
  ],
  [
    "100a752f",
    "894604",
    "MOV dword ptr [ESI + 0x4],EAX"
  ],
  [
    "100a7532",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100a7534",
    "5e",
    "POP ESI"
  ],
  [
    "100a7535",
    "c20400",
    "RET 0x4"
  ],
  [
    "100a99b3",
    "55",
    "PUSH EBP"
  ],
  [
    "100a99b4",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100a99b6",
    "83ec10",
    "SUB ESP,0x10"
  ],
  [
    "100a99b9",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100a99bc",
    "8d4df0",
    "LEA ECX,[EBP + -0x10]"
  ],
  [
    "100a99bf",
    "e8f2daffff",
    "CALL 0x100a74b6"
  ],
  [
    "100a99c4",
    "0fb64508",
    "MOVZX EAX,byte ptr [EBP + 0x8]"
  ],
  [
    "100a99c8",
    "8b4df0",
    "MOV ECX,dword ptr [EBP + -0x10]"
  ],
  [
    "100a99cb",
    "8b89c8000000",
    "MOV ECX,dword ptr [ECX + 0xc8]"
  ],
  [
    "100a99d1",
    "0fb70441",
    "MOVZX EAX,word ptr [ECX + EAX*0x2]"
  ],
  [
    "100a99d5",
    "2500800000",
    "AND EAX,0x8000"
  ],
  [
    "100a99da",
    "807dfc00",
    "CMP byte ptr [EBP + -0x4],0x0"
  ],
  [
    "100a99de",
    "7407",
    "JZ 0x100a99e7"
  ],
  [
    "100a99e0",
    "8b4df8",
    "MOV ECX,dword ptr [EBP + -0x8]"
  ],
  [
    "100a99e3",
    "836170fd",
    "AND dword ptr [ECX + 0x70],0xfffffffd"
  ],
  [
    "100a99e7",
    "c9",
    "LEAVE"
  ],
  [
    "100a99e8",
    "c3",
    "RET"
  ],
  [
    "100aa234",
    "55",
    "PUSH EBP"
  ],
  [
    "100aa235",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100aa237",
    "83ec20",
    "SUB ESP,0x20"
  ],
  [
    "100aa23a",
    "53",
    "PUSH EBX"
  ],
  [
    "100aa23b",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100aa23d",
    "395d0c",
    "CMP dword ptr [EBP + 0xc],EBX"
  ],
  [
    "100aa240",
    "751d",
    "JNZ 0x100aa25f"
  ],
  [
    "100aa242",
    "e88a4b0000",
    "CALL 0x100aedd1"
  ],
  [
    "100aa247",
    "53",
    "PUSH EBX"
  ],
  [
    "100aa248",
    "53",
    "PUSH EBX"
  ],
  [
    "100aa249",
    "53",
    "PUSH EBX"
  ],
  [
    "100aa24a",
    "53",
    "PUSH EBX"
  ],
  [
    "100aa24b",
    "53",
    "PUSH EBX"
  ],
  [
    "100aa24c",
    "c70016000000",
    "MOV dword ptr [EAX],0x16"
  ],
  [
    "100aa252",
    "e87b3f0000",
    "CALL 0x100ae1d2"
  ],
  [
    "100aa257",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100aa25a",
    "83c8ff",
    "OR EAX,0xffffffff"
  ],
  [
    "100aa25d",
    "eb4d",
    "JMP 0x100aa2ac"
  ],
  [
    "100aa25f",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100aa262",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100aa264",
    "74dc",
    "JZ 0x100aa242"
  ],
  [
    "100aa266",
    "56",
    "PUSH ESI"
  ],
  [
    "100aa267",
    "8945e8",
    "MOV dword ptr [EBP + -0x18],EAX"
  ],
  [
    "100aa26a",
    "8945e0",
    "MOV dword ptr [EBP + -0x20],EAX"
  ],
  [
    "100aa26d",
    "8d4510",
    "LEA EAX,[EBP + 0x10]"
  ],
  [
    "100aa270",
    "50",
    "PUSH EAX"
  ],
  [
    "100aa271",
    "53",
    "PUSH EBX"
  ],
  [
    "100aa272",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100aa275",
    "8d45e0",
    "LEA EAX,[EBP + -0x20]"
  ],
  [
    "100aa278",
    "50",
    "PUSH EAX"
  ],
  [
    "100aa279",
    "c745e4ffffff7f",
    "MOV dword ptr [EBP + -0x1c],0x7fffffff"
  ],
  [
    "100aa280",
    "c745ec42000000",
    "MOV dword ptr [EBP + -0x14],0x42"
  ],
  [
    "100aa287",
    "e8c9b00000",
    "CALL 0x100b5355"
  ],
  [
    "100aa28c",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100aa28f",
    "ff4de4",
    "DEC dword ptr [EBP + -0x1c]"
  ],
  [
    "100aa292",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100aa294",
    "7807",
    "JS 0x100aa29d"
  ],
  [
    "100aa296",
    "8b45e0",
    "MOV EAX,dword ptr [EBP + -0x20]"
  ],
  [
    "100aa299",
    "8818",
    "MOV byte ptr [EAX],BL"
  ],
  [
    "100aa29b",
    "eb0c",
    "JMP 0x100aa2a9"
  ],
  [
    "100aa29d",
    "8d45e0",
    "LEA EAX,[EBP + -0x20]"
  ],
  [
    "100aa2a0",
    "50",
    "PUSH EAX"
  ],
  [
    "100aa2a1",
    "53",
    "PUSH EBX"
  ],
  [
    "100aa2a2",
    "e882ae0000",
    "CALL 0x100b5129"
  ],
  [
    "100aa2a7",
    "59",
    "POP ECX"
  ],
  [
    "100aa2a8",
    "59",
    "POP ECX"
  ],
  [
    "100aa2a9",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100aa2ab",
    "5e",
    "POP ESI"
  ],
  [
    "100aa2ac",
    "5b",
    "POP EBX"
  ],
  [
    "100aa2ad",
    "c9",
    "LEAVE"
  ],
  [
    "100aa2ae",
    "c3",
    "RET"
  ],
  [
    "100adc25",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "100adc27",
    "6858880f10",
    "PUSH 0x100f8858"
  ],
  [
    "100adc2c",
    "e8370f0000",
    "CALL 0x100aeb68"
  ],
  [
    "100adc31",
    "8bf9",
    "MOV EDI,ECX"
  ],
  [
    "100adc33",
    "8bf2",
    "MOV ESI,EDX"
  ],
  [
    "100adc35",
    "8b5d08",
    "MOV EBX,dword ptr [EBP + 0x8]"
  ],
  [
    "100adc38",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100adc3a",
    "40",
    "INC EAX"
  ],
  [
    "100adc3b",
    "8945e4",
    "MOV dword ptr [EBP + -0x1c],EAX"
  ],
  [
    "100adc3e",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "100adc40",
    "750c",
    "JNZ 0x100adc4e"
  ],
  [
    "100adc42",
    "39158c642f10",
    "CMP dword ptr [0x102f648c],EDX"
  ],
  [
    "100adc48",
    "0f84c5000000",
    "JZ 0x100add13"
  ],
  [
    "100adc4e",
    "8365fc00",
    "AND dword ptr [EBP + -0x4],0x0"
  ],
  [
    "100adc52",
    "3bf0",
    "CMP ESI,EAX"
  ],
  [
    "100adc54",
    "7405",
    "JZ 0x100adc5b"
  ],
  [
    "100adc56",
    "83fe02",
    "CMP ESI,0x2"
  ],
  [
    "100adc59",
    "752e",
    "JNZ 0x100adc89"
  ],
  [
    "100adc5b",
    "a180d60e10",
    "MOV EAX,[0x100ed680]"
  ],
  [
    "100adc60",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100adc62",
    "7408",
    "JZ 0x100adc6c"
  ],
  [
    "100adc64",
    "57",
    "PUSH EDI"
  ],
  [
    "100adc65",
    "56",
    "PUSH ESI"
  ],
  [
    "100adc66",
    "53",
    "PUSH EBX"
  ],
  [
    "100adc67",
    "ffd0",
    "CALL EAX"
  ],
  [
    "100adc69",
    "8945e4",
    "MOV dword ptr [EBP + -0x1c],EAX"
  ],
  [
    "100adc6c",
    "837de400",
    "CMP dword ptr [EBP + -0x1c],0x0"
  ],
  [
    "100adc70",
    "0f8496000000",
    "JZ 0x100add0c"
  ],
  [
    "100adc76",
    "57",
    "PUSH EDI"
  ],
  [
    "100adc77",
    "56",
    "PUSH ESI"
  ],
  [
    "100adc78",
    "53",
    "PUSH EBX"
  ],
  [
    "100adc79",
    "e8cefdffff",
    "CALL 0x100ada4c"
  ],
  [
    "100adc7e",
    "8945e4",
    "MOV dword ptr [EBP + -0x1c],EAX"
  ],
  [
    "100adc81",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100adc83",
    "0f8483000000",
    "JZ 0x100add0c"
  ],
  [
    "100adc89",
    "57",
    "PUSH EDI"
  ],
  [
    "100adc8a",
    "56",
    "PUSH ESI"
  ],
  [
    "100adc8b",
    "53",
    "PUSH EBX"
  ],
  [
    "100adc8c",
    "e8e5adf5ff",
    "CALL 0x10008a76"
  ],
  [
    "100adc91",
    "8945e4",
    "MOV dword ptr [EBP + -0x1c],EAX"
  ],
  [
    "100adc94",
    "83fe01",
    "CMP ESI,0x1"
  ],
  [
    "100adc97",
    "7524",
    "JNZ 0x100adcbd"
  ],
  [
    "100adc99",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100adc9b",
    "7520",
    "JNZ 0x100adcbd"
  ],
  [
    "100adc9d",
    "57",
    "PUSH EDI"
  ],
  [
    "100adc9e",
    "50",
    "PUSH EAX"
  ],
  [
    "100adc9f",
    "53",
    "PUSH EBX"
  ],
  [
    "100adca0",
    "e8d1adf5ff",
    "CALL 0x10008a76"
  ],
  [
    "100adca5",
    "57",
    "PUSH EDI"
  ],
  [
    "100adca6",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100adca8",
    "53",
    "PUSH EBX"
  ],
  [
    "100adca9",
    "e89efdffff",
    "CALL 0x100ada4c"
  ],
  [
    "100adcae",
    "a180d60e10",
    "MOV EAX,[0x100ed680]"
  ],
  [
    "100adcb3",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100adcb5",
    "7406",
    "JZ 0x100adcbd"
  ],
  [
    "100adcb7",
    "57",
    "PUSH EDI"
  ],
  [
    "100adcb8",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100adcba",
    "53",
    "PUSH EBX"
  ],
  [
    "100adcbb",
    "ffd0",
    "CALL EAX"
  ],
  [
    "100adcbd",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "100adcbf",
    "7405",
    "JZ 0x100adcc6"
  ],
  [
    "100adcc1",
    "83fe03",
    "CMP ESI,0x3"
  ],
  [
    "100adcc4",
    "7526",
    "JNZ 0x100adcec"
  ],
  [
    "100adcc6",
    "57",
    "PUSH EDI"
  ],
  [
    "100adcc7",
    "56",
    "PUSH ESI"
  ],
  [
    "100adcc8",
    "53",
    "PUSH EBX"
  ],
  [
    "100adcc9",
    "e87efdffff",
    "CALL 0x100ada4c"
  ],
  [
    "100adcce",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100adcd0",
    "7503",
    "JNZ 0x100adcd5"
  ],
  [
    "100adcd2",
    "2145e4",
    "AND dword ptr [EBP + -0x1c],EAX"
  ],
  [
    "100adcd5",
    "837de400",
    "CMP dword ptr [EBP + -0x1c],0x0"
  ],
  [
    "100adcd9",
    "7411",
    "JZ 0x100adcec"
  ],
  [
    "100adcdb",
    "a180d60e10",
    "MOV EAX,[0x100ed680]"
  ],
  [
    "100adce0",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100adce2",
    "7408",
    "JZ 0x100adcec"
  ],
  [
    "100adce4",
    "57",
    "PUSH EDI"
  ],
  [
    "100adce5",
    "56",
    "PUSH ESI"
  ],
  [
    "100adce6",
    "53",
    "PUSH EBX"
  ],
  [
    "100adce7",
    "ffd0",
    "CALL EAX"
  ],
  [
    "100adce9",
    "8945e4",
    "MOV dword ptr [EBP + -0x1c],EAX"
  ],
  [
    "100adcec",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100adcf3",
    "8b45e4",
    "MOV EAX,dword ptr [EBP + -0x1c]"
  ],
  [
    "100adcf6",
    "eb1d",
    "JMP 0x100add15"
  ],
  [
    "100add0c",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100add13",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100add15",
    "e8930e0000",
    "CALL 0x100aebad"
  ],
  [
    "100add1a",
    "c3",
    "RET"
  ],
  [
    "100b5289",
    "f6410c40",
    "TEST byte ptr [ECX + 0xc],0x40"
  ],
  [
    "100b528d",
    "7406",
    "JZ 0x100b5295"
  ],
  [
    "100b528f",
    "83790800",
    "CMP dword ptr [ECX + 0x8],0x0"
  ],
  [
    "100b5293",
    "7424",
    "JZ 0x100b52b9"
  ],
  [
    "100b5295",
    "ff4904",
    "DEC dword ptr [ECX + 0x4]"
  ],
  [
    "100b5298",
    "780b",
    "JS 0x100b52a5"
  ],
  [
    "100b529a",
    "8b11",
    "MOV EDX,dword ptr [ECX]"
  ],
  [
    "100b529c",
    "8802",
    "MOV byte ptr [EDX],AL"
  ],
  [
    "100b529e",
    "ff01",
    "INC dword ptr [ECX]"
  ],
  [
    "100b52a0",
    "0fb6c0",
    "MOVZX EAX,AL"
  ],
  [
    "100b52a3",
    "eb0c",
    "JMP 0x100b52b1"
  ],
  [
    "100b52a5",
    "0fbec0",
    "MOVSX EAX,AL"
  ],
  [
    "100b52a8",
    "51",
    "PUSH ECX"
  ],
  [
    "100b52a9",
    "50",
    "PUSH EAX"
  ],
  [
    "100b52aa",
    "e87afeffff",
    "CALL 0x100b5129"
  ],
  [
    "100b52af",
    "59",
    "POP ECX"
  ],
  [
    "100b52b0",
    "59",
    "POP ECX"
  ],
  [
    "100b52b1",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100b52b4",
    "7503",
    "JNZ 0x100b52b9"
  ],
  [
    "100b52b6",
    "0906",
    "OR dword ptr [ESI],EAX"
  ],
  [
    "100b52b8",
    "c3",
    "RET"
  ],
  [
    "100b52b9",
    "ff06",
    "INC dword ptr [ESI]"
  ],
  [
    "100b52bb",
    "c3",
    "RET"
  ],
  [
    "100b52bc",
    "55",
    "PUSH EBP"
  ],
  [
    "100b52bd",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100b52bf",
    "56",
    "PUSH ESI"
  ],
  [
    "100b52c0",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100b52c2",
    "eb13",
    "JMP 0x100b52d7"
  ],
  [
    "100b52c4",
    "8b4d10",
    "MOV ECX,dword ptr [EBP + 0x10]"
  ],
  [
    "100b52c7",
    "8a4508",
    "MOV AL,byte ptr [EBP + 0x8]"
  ],
  [
    "100b52ca",
    "ff4d0c",
    "DEC dword ptr [EBP + 0xc]"
  ],
  [
    "100b52cd",
    "e8b7ffffff",
    "CALL 0x100b5289"
  ],
  [
    "100b52d2",
    "833eff",
    "CMP dword ptr [ESI],-0x1"
  ],
  [
    "100b52d5",
    "7406",
    "JZ 0x100b52dd"
  ],
  [
    "100b52d7",
    "837d0c00",
    "CMP dword ptr [EBP + 0xc],0x0"
  ],
  [
    "100b52db",
    "7fe7",
    "JG 0x100b52c4"
  ],
  [
    "100b52dd",
    "5e",
    "POP ESI"
  ],
  [
    "100b52de",
    "5d",
    "POP EBP"
  ],
  [
    "100b52df",
    "c3",
    "RET"
  ],
  [
    "100b52e0",
    "f6470c40",
    "TEST byte ptr [EDI + 0xc],0x40"
  ],
  [
    "100b52e4",
    "53",
    "PUSH EBX"
  ],
  [
    "100b52e5",
    "56",
    "PUSH ESI"
  ],
  [
    "100b52e6",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100b52e8",
    "8bd9",
    "MOV EBX,ECX"
  ],
  [
    "100b52ea",
    "7434",
    "JZ 0x100b5320"
  ],
  [
    "100b52ec",
    "837f0800",
    "CMP dword ptr [EDI + 0x8],0x0"
  ],
  [
    "100b52f0",
    "752e",
    "JNZ 0x100b5320"
  ],
  [
    "100b52f2",
    "8b44240c",
    "MOV EAX,dword ptr [ESP + 0xc]"
  ],
  [
    "100b52f6",
    "0106",
    "ADD dword ptr [ESI],EAX"
  ],
  [
    "100b52f8",
    "eb2d",
    "JMP 0x100b5327"
  ],
  [
    "100b52fa",
    "8a03",
    "MOV AL,byte ptr [EBX]"
  ],
  [
    "100b52fc",
    "ff4c240c",
    "DEC dword ptr [ESP + 0xc]"
  ],
  [
    "100b5300",
    "8bcf",
    "MOV ECX,EDI"
  ],
  [
    "100b5302",
    "e882ffffff",
    "CALL 0x100b5289"
  ],
  [
    "100b5307",
    "43",
    "INC EBX"
  ],
  [
    "100b5308",
    "833eff",
    "CMP dword ptr [ESI],-0x1"
  ],
  [
    "100b530b",
    "7513",
    "JNZ 0x100b5320"
  ],
  [
    "100b530d",
    "e8bf9affff",
    "CALL 0x100aedd1"
  ],
  [
    "100b5312",
    "83382a",
    "CMP dword ptr [EAX],0x2a"
  ],
  [
    "100b5315",
    "7510",
    "JNZ 0x100b5327"
  ],
  [
    "100b5317",
    "8bcf",
    "MOV ECX,EDI"
  ],
  [
    "100b5319",
    "b03f",
    "MOV AL,0x3f"
  ],
  [
    "100b531b",
    "e869ffffff",
    "CALL 0x100b5289"
  ],
  [
    "100b5320",
    "837c240c00",
    "CMP dword ptr [ESP + 0xc],0x0"
  ],
  [
    "100b5325",
    "7fd3",
    "JG 0x100b52fa"
  ],
  [
    "100b5327",
    "5e",
    "POP ESI"
  ],
  [
    "100b5328",
    "5b",
    "POP EBX"
  ],
  [
    "100b5329",
    "c3",
    "RET"
  ],
  [
    "100b5355",
    "55",
    "PUSH EBP"
  ],
  [
    "100b5356",
    "8dac2408feffff",
    "LEA EBP,[ESP + 0xfffffe08]"
  ],
  [
    "100b535d",
    "81ec78020000",
    "SUB ESP,0x278"
  ],
  [
    "100b5363",
    "a16c0d1410",
    "MOV EAX,[0x10140d6c]"
  ],
  [
    "100b5368",
    "33c5",
    "XOR EAX,EBP"
  ],
  [
    "100b536a",
    "8985f4010000",
    "MOV dword ptr [EBP + 0x1f4],EAX"
  ],
  [
    "100b5370",
    "8b8500020000",
    "MOV EAX,dword ptr [EBP + 0x200]"
  ],
  [
    "100b5376",
    "53",
    "PUSH EBX"
  ],
  [
    "100b5377",
    "8b9d04020000",
    "MOV EBX,dword ptr [EBP + 0x204]"
  ],
  [
    "100b537d",
    "56",
    "PUSH ESI"
  ],
  [
    "100b537e",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100b5380",
    "57",
    "PUSH EDI"
  ],
  [
    "100b5381",
    "8bbd0c020000",
    "MOV EDI,dword ptr [EBP + 0x20c]"
  ],
  [
    "100b5387",
    "ffb508020000",
    "PUSH dword ptr [EBP + 0x208]"
  ],
  [
    "100b538d",
    "8d4d9c",
    "LEA ECX,[EBP + -0x64]"
  ],
  [
    "100b5390",
    "8945d0",
    "MOV dword ptr [EBP + -0x30],EAX"
  ],
  [
    "100b5393",
    "897dd4",
    "MOV dword ptr [EBP + -0x2c],EDI"
  ],
  [
    "100b5396",
    "8975b4",
    "MOV dword ptr [EBP + -0x4c],ESI"
  ],
  [
    "100b5399",
    "8975e8",
    "MOV dword ptr [EBP + -0x18],ESI"
  ],
  [
    "100b539c",
    "8975c0",
    "MOV dword ptr [EBP + -0x40],ESI"
  ],
  [
    "100b539f",
    "8975e0",
    "MOV dword ptr [EBP + -0x20],ESI"
  ],
  [
    "100b53a2",
    "8975c4",
    "MOV dword ptr [EBP + -0x3c],ESI"
  ],
  [
    "100b53a5",
    "8975b0",
    "MOV dword ptr [EBP + -0x50],ESI"
  ],
  [
    "100b53a8",
    "8975bc",
    "MOV dword ptr [EBP + -0x44],ESI"
  ],
  [
    "100b53ab",
    "e80621ffff",
    "CALL 0x100a74b6"
  ],
  [
    "100b53b0",
    "3975d0",
    "CMP dword ptr [EBP + -0x30],ESI"
  ],
  [
    "100b53b3",
    "752d",
    "JNZ 0x100b53e2"
  ],
  [
    "100b53b5",
    "e8179affff",
    "CALL 0x100aedd1"
  ],
  [
    "100b53ba",
    "56",
    "PUSH ESI"
  ],
  [
    "100b53bb",
    "56",
    "PUSH ESI"
  ],
  [
    "100b53bc",
    "56",
    "PUSH ESI"
  ],
  [
    "100b53bd",
    "56",
    "PUSH ESI"
  ],
  [
    "100b53be",
    "c70016000000",
    "MOV dword ptr [EAX],0x16"
  ],
  [
    "100b53c4",
    "56",
    "PUSH ESI"
  ],
  [
    "100b53c5",
    "e8088effff",
    "CALL 0x100ae1d2"
  ],
  [
    "100b53ca",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100b53cd",
    "807da800",
    "CMP byte ptr [EBP + -0x58],0x0"
  ],
  [
    "100b53d1",
    "7407",
    "JZ 0x100b53da"
  ],
  [
    "100b53d3",
    "8b45a4",
    "MOV EAX,dword ptr [EBP + -0x5c]"
  ],
  [
    "100b53d6",
    "836070fd",
    "AND dword ptr [EAX + 0x70],0xfffffffd"
  ],
  [
    "100b53da",
    "83c8ff",
    "OR EAX,0xffffffff"
  ],
  [
    "100b53dd",
    "e9cf080000",
    "JMP 0x100b5cb1"
  ],
  [
    "100b53e2",
    "8b45d0",
    "MOV EAX,dword ptr [EBP + -0x30]"
  ],
  [
    "100b53e5",
    "f6400c40",
    "TEST byte ptr [EAX + 0xc],0x40"
  ],
  [
    "100b53e9",
    "0f85a4000000",
    "JNZ 0x100b5493"
  ],
  [
    "100b53ef",
    "50",
    "PUSH EAX"
  ],
  [
    "100b53f0",
    "e8fc9f0000",
    "CALL 0x100bf3f1"
  ],
  [
    "100b53f5",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100b53f8",
    "59",
    "POP ECX"
  ],
  [
    "100b53f9",
    "7436",
    "JZ 0x100b5431"
  ],
  [
    "100b53fb",
    "ff75d0",
    "PUSH dword ptr [EBP + -0x30]"
  ],
  [
    "100b53fe",
    "e8ee9f0000",
    "CALL 0x100bf3f1"
  ],
  [
    "100b5403",
    "83f8fe",
    "CMP EAX,-0x2"
  ],
  [
    "100b5406",
    "59",
    "POP ECX"
  ],
  [
    "100b5407",
    "7428",
    "JZ 0x100b5431"
  ],
  [
    "100b5409",
    "ff75d0",
    "PUSH dword ptr [EBP + -0x30]"
  ],
  [
    "100b540c",
    "e8e09f0000",
    "CALL 0x100bf3f1"
  ],
  [
    "100b5411",
    "ff75d0",
    "PUSH dword ptr [EBP + -0x30]"
  ],
  [
    "100b5414",
    "c1f805",
    "SAR EAX,0x5"
  ],
  [
    "100b5417",
    "8d3485c0702f10",
    "LEA ESI,[EAX*0x4 + 0x102f70c0]"
  ],
  [
    "100b541e",
    "e8ce9f0000",
    "CALL 0x100bf3f1"
  ],
  [
    "100b5423",
    "83e01f",
    "AND EAX,0x1f"
  ],
  [
    "100b5426",
    "6bc038",
    "IMUL EAX,EAX,0x38"
  ],
  [
    "100b5429",
    "0306",
    "ADD EAX,dword ptr [ESI]"
  ],
  [
    "100b542b",
    "59",
    "POP ECX"
  ],
  [
    "100b542c",
    "59",
    "POP ECX"
  ],
  [
    "100b542d",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100b542f",
    "eb05",
    "JMP 0x100b5436"
  ],
  [
    "100b5431",
    "b8101a1410",
    "MOV EAX,0x10141a10"
  ],
  [
    "100b5436",
    "f640247f",
    "TEST byte ptr [EAX + 0x24],0x7f"
  ],
  [
    "100b543a",
    "0f8575ffffff",
    "JNZ 0x100b53b5"
  ],
  [
    "100b5440",
    "ff75d0",
    "PUSH dword ptr [EBP + -0x30]"
  ],
  [
    "100b5443",
    "e8a99f0000",
    "CALL 0x100bf3f1"
  ],
  [
    "100b5448",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100b544b",
    "59",
    "POP ECX"
  ],
  [
    "100b544c",
    "7436",
    "JZ 0x100b5484"
  ],
  [
    "100b544e",
    "ff75d0",
    "PUSH dword ptr [EBP + -0x30]"
  ],
  [
    "100b5451",
    "e89b9f0000",
    "CALL 0x100bf3f1"
  ],
  [
    "100b5456",
    "83f8fe",
    "CMP EAX,-0x2"
  ],
  [
    "100b5459",
    "59",
    "POP ECX"
  ],
  [
    "100b545a",
    "7428",
    "JZ 0x100b5484"
  ],
  [
    "100b545c",
    "ff75d0",
    "PUSH dword ptr [EBP + -0x30]"
  ],
  [
    "100b545f",
    "e88d9f0000",
    "CALL 0x100bf3f1"
  ],
  [
    "100b5464",
    "ff75d0",
    "PUSH dword ptr [EBP + -0x30]"
  ],
  [
    "100b5467",
    "c1f805",
    "SAR EAX,0x5"
  ],
  [
    "100b546a",
    "8d3485c0702f10",
    "LEA ESI,[EAX*0x4 + 0x102f70c0]"
  ],
  [
    "100b5471",
    "e87b9f0000",
    "CALL 0x100bf3f1"
  ],
  [
    "100b5476",
    "83e01f",
    "AND EAX,0x1f"
  ],
  [
    "100b5479",
    "6bc038",
    "IMUL EAX,EAX,0x38"
  ],
  [
    "100b547c",
    "0306",
    "ADD EAX,dword ptr [ESI]"
  ],
  [
    "100b547e",
    "59",
    "POP ECX"
  ],
  [
    "100b547f",
    "59",
    "POP ECX"
  ],
  [
    "100b5480",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100b5482",
    "eb05",
    "JMP 0x100b5489"
  ],
  [
    "100b5484",
    "b8101a1410",
    "MOV EAX,0x10141a10"
  ],
  [
    "100b5489",
    "f6402480",
    "TEST byte ptr [EAX + 0x24],0x80"
  ],
  [
    "100b548d",
    "0f8522ffffff",
    "JNZ 0x100b53b5"
  ],
  [
    "100b5493",
    "3bde",
    "CMP EBX,ESI"
  ],
  [
    "100b5495",
    "0f841affffff",
    "JZ 0x100b53b5"
  ],
  [
    "100b549b",
    "8a13",
    "MOV DL,byte ptr [EBX]"
  ],
  [
    "100b549d",
    "33c9",
    "XOR ECX,ECX"
  ],
  [
    "100b549f",
    "84d2",
    "TEST DL,DL"
  ],
  [
    "100b54a1",
    "8975cc",
    "MOV dword ptr [EBP + -0x34],ESI"
  ],
  [
    "100b54a4",
    "8975d8",
    "MOV dword ptr [EBP + -0x28],ESI"
  ],
  [
    "100b54a7",
    "8975ac",
    "MOV dword ptr [EBP + -0x54],ESI"
  ],
  [
    "100b54aa",
    "8855e7",
    "MOV byte ptr [EBP + -0x19],DL"
  ],
  [
    "100b54ad",
    "0f84ee070000",
    "JZ 0x100b5ca1"
  ],
  [
    "100b54b3",
    "43",
    "INC EBX"
  ],
  [
    "100b54b4",
    "837dcc00",
    "CMP dword ptr [EBP + -0x34],0x0"
  ],
  [
    "100b54b8",
    "895db8",
    "MOV dword ptr [EBP + -0x48],EBX"
  ],
  [
    "100b54bb",
    "0f8ce0070000",
    "JL 0x100b5ca1"
  ],
  [
    "100b54c1",
    "8ac2",
    "MOV AL,DL"
  ],
  [
    "100b54c3",
    "2c20",
    "SUB AL,0x20"
  ],
  [
    "100b54c5",
    "3c58",
    "CMP AL,0x58"
  ],
  [
    "100b54c7",
    "7711",
    "JA 0x100b54da"
  ],
  [
    "100b54c9",
    "0fbec2",
    "MOVSX EAX,DL"
  ],
  [
    "100b54cc",
    "0fb68050de0e10",
    "MOVZX EAX,byte ptr [EAX + 0x100ede50]"
  ],
  [
    "100b54d3",
    "83e00f",
    "AND EAX,0xf"
  ],
  [
    "100b54d6",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100b54d8",
    "eb04",
    "JMP 0x100b54de"
  ],
  [
    "100b54da",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100b54dc",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100b54de",
    "0fbe84c170de0e10",
    "MOVSX EAX,byte ptr [ECX + EAX*0x8 + 0x100ede70]"
  ],
  [
    "100b54e6",
    "6a07",
    "PUSH 0x7"
  ],
  [
    "100b54e8",
    "c1f804",
    "SAR EAX,0x4"
  ],
  [
    "100b54eb",
    "59",
    "POP ECX"
  ],
  [
    "100b54ec",
    "3bc1",
    "CMP EAX,ECX"
  ],
  [
    "100b54ee",
    "89458c",
    "MOV dword ptr [EBP + -0x74],EAX"
  ],
  [
    "100b54f1",
    "0f877a070000",
    "JA 0x100b5c71"
  ],
  [
    "100b54f7",
    "ff2485c95c0b10",
    "JMP dword ptr [EAX*0x4 + 0x100b5cc9]"
  ],
  [
    "100b54fe",
    "834de0ff",
    "OR dword ptr [EBP + -0x20],0xffffffff"
  ],
  [
    "100b5502",
    "897588",
    "MOV dword ptr [EBP + -0x78],ESI"
  ],
  [
    "100b5505",
    "8975b0",
    "MOV dword ptr [EBP + -0x50],ESI"
  ],
  [
    "100b5508",
    "8975c0",
    "MOV dword ptr [EBP + -0x40],ESI"
  ],
  [
    "100b550b",
    "8975c4",
    "MOV dword ptr [EBP + -0x3c],ESI"
  ],
  [
    "100b550e",
    "8975e8",
    "MOV dword ptr [EBP + -0x18],ESI"
  ],
  [
    "100b5511",
    "8975bc",
    "MOV dword ptr [EBP + -0x44],ESI"
  ],
  [
    "100b5514",
    "e958070000",
    "JMP 0x100b5c71"
  ],
  [
    "100b5519",
    "0fbec2",
    "MOVSX EAX,DL"
  ],
  [
    "100b551c",
    "83e820",
    "SUB EAX,0x20"
  ],
  [
    "100b551f",
    "743e",
    "JZ 0x100b555f"
  ],
  [
    "100b5521",
    "83e803",
    "SUB EAX,0x3"
  ],
  [
    "100b5524",
    "742d",
    "JZ 0x100b5553"
  ],
  [
    "100b5526",
    "83e808",
    "SUB EAX,0x8"
  ],
  [
    "100b5529",
    "741f",
    "JZ 0x100b554a"
  ],
  [
    "100b552b",
    "48",
    "DEC EAX"
  ],
  [
    "100b552c",
    "48",
    "DEC EAX"
  ],
  [
    "100b552d",
    "7412",
    "JZ 0x100b5541"
  ],
  [
    "100b552f",
    "83e803",
    "SUB EAX,0x3"
  ],
  [
    "100b5532",
    "0f8539070000",
    "JNZ 0x100b5c71"
  ],
  [
    "100b5538",
    "834de808",
    "OR dword ptr [EBP + -0x18],0x8"
  ],
  [
    "100b553c",
    "e930070000",
    "JMP 0x100b5c71"
  ],
  [
    "100b5541",
    "834de804",
    "OR dword ptr [EBP + -0x18],0x4"
  ],
  [
    "100b5545",
    "e927070000",
    "JMP 0x100b5c71"
  ],
  [
    "100b554a",
    "834de801",
    "OR dword ptr [EBP + -0x18],0x1"
  ],
  [
    "100b554e",
    "e91e070000",
    "JMP 0x100b5c71"
  ],
  [
    "100b5553",
    "814de880000000",
    "OR dword ptr [EBP + -0x18],0x80"
  ],
  [
    "100b555a",
    "e912070000",
    "JMP 0x100b5c71"
  ],
  [
    "100b555f",
    "834de802",
    "OR dword ptr [EBP + -0x18],0x2"
  ],
  [
    "100b5563",
    "e909070000",
    "JMP 0x100b5c71"
  ],
  [
    "100b5568",
    "80fa2a",
    "CMP DL,0x2a"
  ],
  [
    "100b556b",
    "7520",
    "JNZ 0x100b558d"
  ],
  [
    "100b556d",
    "83c704",
    "ADD EDI,0x4"
  ],
  [
    "100b5570",
    "897dd4",
    "MOV dword ptr [EBP + -0x2c],EDI"
  ],
  [
    "100b5573",
    "8b7ffc",
    "MOV EDI,dword ptr [EDI + -0x4]"
  ],
  [
    "100b5576",
    "3bfe",
    "CMP EDI,ESI"
  ],
  [
    "100b5578",
    "897dc0",
    "MOV dword ptr [EBP + -0x40],EDI"
  ],
  [
    "100b557b",
    "0f8df0060000",
    "JGE 0x100b5c71"
  ],
  [
    "100b5581",
    "834de804",
    "OR dword ptr [EBP + -0x18],0x4"
  ],
  [
    "100b5585",
    "f75dc0",
    "NEG dword ptr [EBP + -0x40]"
  ],
  [
    "100b5588",
    "e9e4060000",
    "JMP 0x100b5c71"
  ],
  [
    "100b558d",
    "8b45c0",
    "MOV EAX,dword ptr [EBP + -0x40]"
  ],
  [
    "100b5590",
    "6bc00a",
    "IMUL EAX,EAX,0xa"
  ],
  [
    "100b5593",
    "0fbeca",
    "MOVSX ECX,DL"
  ],
  [
    "100b5596",
    "8d4408d0",
    "LEA EAX,[EAX + ECX*0x1 + -0x30]"
  ],
  [
    "100b559a",
    "8945c0",
    "MOV dword ptr [EBP + -0x40],EAX"
  ],
  [
    "100b559d",
    "e9cf060000",
    "JMP 0x100b5c71"
  ],
  [
    "100b55a2",
    "8975e0",
    "MOV dword ptr [EBP + -0x20],ESI"
  ],
  [
    "100b55a5",
    "e9c7060000",
    "JMP 0x100b5c71"
  ],
  [
    "100b55aa",
    "80fa2a",
    "CMP DL,0x2a"
  ],
  [
    "100b55ad",
    "751d",
    "JNZ 0x100b55cc"
  ],
  [
    "100b55af",
    "83c704",
    "ADD EDI,0x4"
  ],
  [
    "100b55b2",
    "897dd4",
    "MOV dword ptr [EBP + -0x2c],EDI"
  ],
  [
    "100b55b5",
    "8b7ffc",
    "MOV EDI,dword ptr [EDI + -0x4]"
  ],
  [
    "100b55b8",
    "3bfe",
    "CMP EDI,ESI"
  ],
  [
    "100b55ba",
    "897de0",
    "MOV dword ptr [EBP + -0x20],EDI"
  ],
  [
    "100b55bd",
    "0f8dae060000",
    "JGE 0x100b5c71"
  ],
  [
    "100b55c3",
    "834de0ff",
    "OR dword ptr [EBP + -0x20],0xffffffff"
  ],
  [
    "100b55c7",
    "e9a5060000",
    "JMP 0x100b5c71"
  ],
  [
    "100b55cc",
    "8b45e0",
    "MOV EAX,dword ptr [EBP + -0x20]"
  ],
  [
    "100b55cf",
    "6bc00a",
    "IMUL EAX,EAX,0xa"
  ],
  [
    "100b55d2",
    "0fbeca",
    "MOVSX ECX,DL"
  ],
  [
    "100b55d5",
    "8d4408d0",
    "LEA EAX,[EAX + ECX*0x1 + -0x30]"
  ],
  [
    "100b55d9",
    "8945e0",
    "MOV dword ptr [EBP + -0x20],EAX"
  ],
  [
    "100b55dc",
    "e990060000",
    "JMP 0x100b5c71"
  ],
  [
    "100b55e1",
    "80fa49",
    "CMP DL,0x49"
  ],
  [
    "100b55e4",
    "7446",
    "JZ 0x100b562c"
  ],
  [
    "100b55e6",
    "80fa68",
    "CMP DL,0x68"
  ],
  [
    "100b55e9",
    "7438",
    "JZ 0x100b5623"
  ],
  [
    "100b55eb",
    "80fa6c",
    "CMP DL,0x6c"
  ],
  [
    "100b55ee",
    "7415",
    "JZ 0x100b5605"
  ],
  [
    "100b55f0",
    "80fa77",
    "CMP DL,0x77"
  ],
  [
    "100b55f3",
    "0f8578060000",
    "JNZ 0x100b5c71"
  ],
  [
    "100b55f9",
    "814de800080000",
    "OR dword ptr [EBP + -0x18],0x800"
  ],
  [
    "100b5600",
    "e96c060000",
    "JMP 0x100b5c71"
  ],
  [
    "100b5605",
    "803b6c",
    "CMP byte ptr [EBX],0x6c"
  ],
  [
    "100b5608",
    "7510",
    "JNZ 0x100b561a"
  ],
  [
    "100b560a",
    "43",
    "INC EBX"
  ],
  [
    "100b560b",
    "814de800100000",
    "OR dword ptr [EBP + -0x18],0x1000"
  ],
  [
    "100b5612",
    "895db8",
    "MOV dword ptr [EBP + -0x48],EBX"
  ],
  [
    "100b5615",
    "e957060000",
    "JMP 0x100b5c71"
  ],
  [
    "100b561a",
    "834de810",
    "OR dword ptr [EBP + -0x18],0x10"
  ],
  [
    "100b561e",
    "e94e060000",
    "JMP 0x100b5c71"
  ],
  [
    "100b5623",
    "834de820",
    "OR dword ptr [EBP + -0x18],0x20"
  ],
  [
    "100b5627",
    "e945060000",
    "JMP 0x100b5c71"
  ],
  [
    "100b562c",
    "8a03",
    "MOV AL,byte ptr [EBX]"
  ],
  [
    "100b562e",
    "3c36",
    "CMP AL,0x36"
  ],
  [
    "100b5630",
    "7517",
    "JNZ 0x100b5649"
  ],
  [
    "100b5632",
    "807b0134",
    "CMP byte ptr [EBX + 0x1],0x34"
  ],
  [
    "100b5636",
    "7511",
    "JNZ 0x100b5649"
  ],
  [
    "100b5638",
    "43",
    "INC EBX"
  ],
  [
    "100b5639",
    "43",
    "INC EBX"
  ],
  [
    "100b563a",
    "814de800800000",
    "OR dword ptr [EBP + -0x18],0x8000"
  ],
  [
    "100b5641",
    "895db8",
    "MOV dword ptr [EBP + -0x48],EBX"
  ],
  [
    "100b5644",
    "e928060000",
    "JMP 0x100b5c71"
  ],
  [
    "100b5649",
    "3c33",
    "CMP AL,0x33"
  ],
  [
    "100b564b",
    "7517",
    "JNZ 0x100b5664"
  ],
  [
    "100b564d",
    "807b0132",
    "CMP byte ptr [EBX + 0x1],0x32"
  ],
  [
    "100b5651",
    "7511",
    "JNZ 0x100b5664"
  ],
  [
    "100b5653",
    "43",
    "INC EBX"
  ],
  [
    "100b5654",
    "43",
    "INC EBX"
  ],
  [
    "100b5655",
    "8165e8ff7fffff",
    "AND dword ptr [EBP + -0x18],0xffff7fff"
  ],
  [
    "100b565c",
    "895db8",
    "MOV dword ptr [EBP + -0x48],EBX"
  ],
  [
    "100b565f",
    "e90d060000",
    "JMP 0x100b5c71"
  ],
  [
    "100b5664",
    "3c64",
    "CMP AL,0x64"
  ],
  [
    "100b5666",
    "0f8405060000",
    "JZ 0x100b5c71"
  ],
  [
    "100b566c",
    "3c69",
    "CMP AL,0x69"
  ],
  [
    "100b566e",
    "0f84fd050000",
    "JZ 0x100b5c71"
  ],
  [
    "100b5674",
    "3c6f",
    "CMP AL,0x6f"
  ],
  [
    "100b5676",
    "0f84f5050000",
    "JZ 0x100b5c71"
  ],
  [
    "100b567c",
    "3c75",
    "CMP AL,0x75"
  ],
  [
    "100b567e",
    "0f84ed050000",
    "JZ 0x100b5c71"
  ],
  [
    "100b5684",
    "3c78",
    "CMP AL,0x78"
  ],
  [
    "100b5686",
    "0f84e5050000",
    "JZ 0x100b5c71"
  ],
  [
    "100b568c",
    "3c58",
    "CMP AL,0x58"
  ],
  [
    "100b568e",
    "0f84dd050000",
    "JZ 0x100b5c71"
  ],
  [
    "100b5694",
    "89758c",
    "MOV dword ptr [EBP + -0x74],ESI"
  ],
  [
    "100b5697",
    "8d459c",
    "LEA EAX,[EBP + -0x64]"
  ],
  [
    "100b569a",
    "50",
    "PUSH EAX"
  ],
  [
    "100b569b",
    "0fb6c2",
    "MOVZX EAX,DL"
  ],
  [
    "100b569e",
    "50",
    "PUSH EAX"
  ],
  [
    "100b569f",
    "8975bc",
    "MOV dword ptr [EBP + -0x44],ESI"
  ],
  [
    "100b56a2",
    "e80c43ffff",
    "CALL 0x100a99b3"
  ],
  [
    "100b56a7",
    "59",
    "POP ECX"
  ],
  [
    "100b56a8",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b56aa",
    "8a45e7",
    "MOV AL,byte ptr [EBP + -0x19]"
  ],
  [
    "100b56ad",
    "59",
    "POP ECX"
  ],
  [
    "100b56ae",
    "7419",
    "JZ 0x100b56c9"
  ],
  [
    "100b56b0",
    "8b4dd0",
    "MOV ECX,dword ptr [EBP + -0x30]"
  ],
  [
    "100b56b3",
    "8d75cc",
    "LEA ESI,[EBP + -0x34]"
  ],
  [
    "100b56b6",
    "e8cefbffff",
    "CALL 0x100b5289"
  ],
  [
    "100b56bb",
    "8a03",
    "MOV AL,byte ptr [EBX]"
  ],
  [
    "100b56bd",
    "43",
    "INC EBX"
  ],
  [
    "100b56be",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100b56c0",
    "895db8",
    "MOV dword ptr [EBP + -0x48],EBX"
  ],
  [
    "100b56c3",
    "0f84c1050000",
    "JZ 0x100b5c8a"
  ],
  [
    "100b56c9",
    "8b4dd0",
    "MOV ECX,dword ptr [EBP + -0x30]"
  ],
  [
    "100b56cc",
    "8d75cc",
    "LEA ESI,[EBP + -0x34]"
  ],
  [
    "100b56cf",
    "e8b5fbffff",
    "CALL 0x100b5289"
  ],
  [
    "100b56d4",
    "e998050000",
    "JMP 0x100b5c71"
  ],
  [
    "100b56d9",
    "0fbec2",
    "MOVSX EAX,DL"
  ],
  [
    "100b56dc",
    "83f864",
    "CMP EAX,0x64"
  ],
  [
    "100b56df",
    "0f8f72010000",
    "JG 0x100b5857"
  ],
  [
    "100b56e5",
    "0f84eb010000",
    "JZ 0x100b58d6"
  ],
  [
    "100b56eb",
    "83f853",
    "CMP EAX,0x53"
  ],
  [
    "100b56ee",
    "0f8fab000000",
    "JG 0x100b579f"
  ],
  [
    "100b56f4",
    "745a",
    "JZ 0x100b5750"
  ],
  [
    "100b56f6",
    "83e841",
    "SUB EAX,0x41"
  ],
  [
    "100b56f9",
    "7410",
    "JZ 0x100b570b"
  ],
  [
    "100b56fb",
    "48",
    "DEC EAX"
  ],
  [
    "100b56fc",
    "48",
    "DEC EAX"
  ],
  [
    "100b56fd",
    "7440",
    "JZ 0x100b573f"
  ],
  [
    "100b56ff",
    "48",
    "DEC EAX"
  ],
  [
    "100b5700",
    "48",
    "DEC EAX"
  ],
  [
    "100b5701",
    "7408",
    "JZ 0x100b570b"
  ],
  [
    "100b5703",
    "48",
    "DEC EAX"
  ],
  [
    "100b5704",
    "48",
    "DEC EAX"
  ],
  [
    "100b5705",
    "0f854e040000",
    "JNZ 0x100b5b59"
  ],
  [
    "100b570b",
    "80c220",
    "ADD DL,0x20"
  ],
  [
    "100b570e",
    "c7458801000000",
    "MOV dword ptr [EBP + -0x78],0x1"
  ],
  [
    "100b5715",
    "8855e7",
    "MOV byte ptr [EBP + -0x19],DL"
  ],
  [
    "100b5718",
    "834de840",
    "OR dword ptr [EBP + -0x18],0x40"
  ],
  [
    "100b571c",
    "3975e0",
    "CMP dword ptr [EBP + -0x20],ESI"
  ],
  [
    "100b571f",
    "8d5dec",
    "LEA EBX,[EBP + -0x14]"
  ],
  [
    "100b5722",
    "b800020000",
    "MOV EAX,0x200"
  ],
  [
    "100b5727",
    "895ddc",
    "MOV dword ptr [EBP + -0x24],EBX"
  ],
  [
    "100b572a",
    "894598",
    "MOV dword ptr [EBP + -0x68],EAX"
  ],
  [
    "100b572d",
    "0f8dc7010000",
    "JGE 0x100b58fa"
  ],
  [
    "100b5733",
    "c745e006000000",
    "MOV dword ptr [EBP + -0x20],0x6"
  ],
  [
    "100b573a",
    "e909020000",
    "JMP 0x100b5948"
  ],
  [
    "100b573f",
    "66f745e83008",
    "TEST word ptr [EBP + -0x18],0x830"
  ],
  [
    "100b5745",
    "7575",
    "JNZ 0x100b57bc"
  ],
  [
    "100b5747",
    "814de800080000",
    "OR dword ptr [EBP + -0x18],0x800"
  ],
  [
    "100b574e",
    "eb6c",
    "JMP 0x100b57bc"
  ],
  [
    "100b5750",
    "66f745e83008",
    "TEST word ptr [EBP + -0x18],0x830"
  ],
  [
    "100b5756",
    "7507",
    "JNZ 0x100b575f"
  ],
  [
    "100b5758",
    "814de800080000",
    "OR dword ptr [EBP + -0x18],0x800"
  ],
  [
    "100b575f",
    "8b4de0",
    "MOV ECX,dword ptr [EBP + -0x20]"
  ],
  [
    "100b5762",
    "83f9ff",
    "CMP ECX,-0x1"
  ],
  [
    "100b5765",
    "7505",
    "JNZ 0x100b576c"
  ],
  [
    "100b5767",
    "b9ffffff7f",
    "MOV ECX,0x7fffffff"
  ],
  [
    "100b576c",
    "83c704",
    "ADD EDI,0x4"
  ],
  [
    "100b576f",
    "66f745e81008",
    "TEST word ptr [EBP + -0x18],0x810"
  ],
  [
    "100b5775",
    "897dd4",
    "MOV dword ptr [EBP + -0x2c],EDI"
  ],
  [
    "100b5778",
    "8b7ffc",
    "MOV EDI,dword ptr [EDI + -0x4]"
  ],
  [
    "100b577b",
    "897ddc",
    "MOV dword ptr [EBP + -0x24],EDI"
  ],
  [
    "100b577e",
    "0f84b3030000",
    "JZ 0x100b5b37"
  ],
  [
    "100b5784",
    "3bfe",
    "CMP EDI,ESI"
  ],
  [
    "100b5786",
    "7508",
    "JNZ 0x100b5790"
  ],
  [
    "100b5788",
    "a1ac141410",
    "MOV EAX,[0x101414ac]"
  ],
  [
    "100b578d",
    "8945dc",
    "MOV dword ptr [EBP + -0x24],EAX"
  ],
  [
    "100b5790",
    "8b45dc",
    "MOV EAX,dword ptr [EBP + -0x24]"
  ],
  [
    "100b5793",
    "c745bc01000000",
    "MOV dword ptr [EBP + -0x44],0x1"
  ],
  [
    "100b579a",
    "e98d030000",
    "JMP 0x100b5b2c"
  ],
  [
    "100b579f",
    "83e858",
    "SUB EAX,0x58"
  ],
  [
    "100b57a2",
    "0f8439020000",
    "JZ 0x100b59e1"
  ],
  [
    "100b57a8",
    "48",
    "DEC EAX"
  ],
  [
    "100b57a9",
    "48",
    "DEC EAX"
  ],
  [
    "100b57aa",
    "745d",
    "JZ 0x100b5809"
  ],
  [
    "100b57ac",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100b57ae",
    "0f8464ffffff",
    "JZ 0x100b5718"
  ],
  [
    "100b57b4",
    "48",
    "DEC EAX"
  ],
  [
    "100b57b5",
    "48",
    "DEC EAX"
  ],
  [
    "100b57b6",
    "0f859d030000",
    "JNZ 0x100b5b59"
  ],
  [
    "100b57bc",
    "83c704",
    "ADD EDI,0x4"
  ],
  [
    "100b57bf",
    "66f745e81008",
    "TEST word ptr [EBP + -0x18],0x810"
  ],
  [
    "100b57c5",
    "897dd4",
    "MOV dword ptr [EBP + -0x2c],EDI"
  ],
  [
    "100b57c8",
    "7427",
    "JZ 0x100b57f1"
  ],
  [
    "100b57ca",
    "0fb747fc",
    "MOVZX EAX,word ptr [EDI + -0x4]"
  ],
  [
    "100b57ce",
    "50",
    "PUSH EAX"
  ],
  [
    "100b57cf",
    "6800020000",
    "PUSH 0x200"
  ],
  [
    "100b57d4",
    "8d45ec",
    "LEA EAX,[EBP + -0x14]"
  ],
  [
    "100b57d7",
    "50",
    "PUSH EAX"
  ],
  [
    "100b57d8",
    "8d45d8",
    "LEA EAX,[EBP + -0x28]"
  ],
  [
    "100b57db",
    "50",
    "PUSH EAX"
  ],
  [
    "100b57dc",
    "e8de960100",
    "CALL 0x100ceebf"
  ],
  [
    "100b57e1",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100b57e4",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b57e6",
    "7416",
    "JZ 0x100b57fe"
  ],
  [
    "100b57e8",
    "c745b001000000",
    "MOV dword ptr [EBP + -0x50],0x1"
  ],
  [
    "100b57ef",
    "eb0d",
    "JMP 0x100b57fe"
  ],
  [
    "100b57f1",
    "8a47fc",
    "MOV AL,byte ptr [EDI + -0x4]"
  ],
  [
    "100b57f4",
    "8845ec",
    "MOV byte ptr [EBP + -0x14],AL"
  ],
  [
    "100b57f7",
    "c745d801000000",
    "MOV dword ptr [EBP + -0x28],0x1"
  ],
  [
    "100b57fe",
    "8d45ec",
    "LEA EAX,[EBP + -0x14]"
  ],
  [
    "100b5801",
    "8945dc",
    "MOV dword ptr [EBP + -0x24],EAX"
  ],
  [
    "100b5804",
    "e950030000",
    "JMP 0x100b5b59"
  ],
  [
    "100b5809",
    "8b07",
    "MOV EAX,dword ptr [EDI]"
  ],
  [
    "100b580b",
    "83c704",
    "ADD EDI,0x4"
  ],
  [
    "100b580e",
    "3bc6",
    "CMP EAX,ESI"
  ],
  [
    "100b5810",
    "897dd4",
    "MOV dword ptr [EBP + -0x2c],EDI"
  ],
  [
    "100b5813",
    "742e",
    "JZ 0x100b5843"
  ],
  [
    "100b5815",
    "8b4804",
    "MOV ECX,dword ptr [EAX + 0x4]"
  ],
  [
    "100b5818",
    "3bce",
    "CMP ECX,ESI"
  ],
  [
    "100b581a",
    "7427",
    "JZ 0x100b5843"
  ],
  [
    "100b581c",
    "66f745e80008",
    "TEST word ptr [EBP + -0x18],0x800"
  ],
  [
    "100b5822",
    "0fbf00",
    "MOVSX EAX,word ptr [EAX]"
  ],
  [
    "100b5825",
    "894ddc",
    "MOV dword ptr [EBP + -0x24],ECX"
  ],
  [
    "100b5828",
    "7411",
    "JZ 0x100b583b"
  ],
  [
    "100b582a",
    "99",
    "CDQ"
  ],
  [
    "100b582b",
    "2bc2",
    "SUB EAX,EDX"
  ],
  [
    "100b582d",
    "d1f8",
    "SAR EAX,0x1"
  ],
  [
    "100b582f",
    "c745bc01000000",
    "MOV dword ptr [EBP + -0x44],0x1"
  ],
  [
    "100b5836",
    "e91b030000",
    "JMP 0x100b5b56"
  ],
  [
    "100b583b",
    "8975bc",
    "MOV dword ptr [EBP + -0x44],ESI"
  ],
  [
    "100b583e",
    "e913030000",
    "JMP 0x100b5b56"
  ],
  [
    "100b5843",
    "a1a8141410",
    "MOV EAX,[0x101414a8]"
  ],
  [
    "100b5848",
    "8945dc",
    "MOV dword ptr [EBP + -0x24],EAX"
  ],
  [
    "100b584b",
    "50",
    "PUSH EAX"
  ],
  [
    "100b584c",
    "e82fd2ffff",
    "CALL 0x100b2a80"
  ],
  [
    "100b5851",
    "59",
    "POP ECX"
  ],
  [
    "100b5852",
    "e9ff020000",
    "JMP 0x100b5b56"
  ],
  [
    "100b5857",
    "83f870",
    "CMP EAX,0x70"
  ],
  [
    "100b585a",
    "0f8f86010000",
    "JG 0x100b59e6"
  ],
  [
    "100b5860",
    "0f8474010000",
    "JZ 0x100b59da"
  ],
  [
    "100b5866",
    "83f865",
    "CMP EAX,0x65"
  ],
  [
    "100b5869",
    "0f8cea020000",
    "JL 0x100b5b59"
  ],
  [
    "100b586f",
    "83f867",
    "CMP EAX,0x67"
  ],
  [
    "100b5872",
    "0f8ea0feffff",
    "JLE 0x100b5718"
  ],
  [
    "100b5878",
    "83f869",
    "CMP EAX,0x69"
  ],
  [
    "100b587b",
    "7459",
    "JZ 0x100b58d6"
  ],
  [
    "100b587d",
    "83f86e",
    "CMP EAX,0x6e"
  ],
  [
    "100b5880",
    "741f",
    "JZ 0x100b58a1"
  ],
  [
    "100b5882",
    "83f86f",
    "CMP EAX,0x6f"
  ],
  [
    "100b5885",
    "0f85ce020000",
    "JNZ 0x100b5b59"
  ],
  [
    "100b588b",
    "f645e880",
    "TEST byte ptr [EBP + -0x18],0x80"
  ],
  [
    "100b588f",
    "c745d808000000",
    "MOV dword ptr [EBP + -0x28],0x8"
  ],
  [
    "100b5896",
    "7449",
    "JZ 0x100b58e1"
  ],
  [
    "100b5898",
    "814de800020000",
    "OR dword ptr [EBP + -0x18],0x200"
  ],
  [
    "100b589f",
    "eb40",
    "JMP 0x100b58e1"
  ],
  [
    "100b58a1",
    "8b37",
    "MOV ESI,dword ptr [EDI]"
  ],
  [
    "100b58a3",
    "83c704",
    "ADD EDI,0x4"
  ],
  [
    "100b58a6",
    "897dd4",
    "MOV dword ptr [EBP + -0x2c],EDI"
  ],
  [
    "100b58a9",
    "e89c940100",
    "CALL 0x100ced4a"
  ],
  [
    "100b58ae",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b58b0",
    "0f84d4030000",
    "JZ 0x100b5c8a"
  ],
  [
    "100b58b6",
    "f645e820",
    "TEST byte ptr [EBP + -0x18],0x20"
  ],
  [
    "100b58ba",
    "7409",
    "JZ 0x100b58c5"
  ],
  [
    "100b58bc",
    "668b45cc",
    "MOV AX,word ptr [EBP + -0x34]"
  ],
  [
    "100b58c0",
    "668906",
    "MOV word ptr [ESI],AX"
  ],
  [
    "100b58c3",
    "eb05",
    "JMP 0x100b58ca"
  ],
  [
    "100b58c5",
    "8b45cc",
    "MOV EAX,dword ptr [EBP + -0x34]"
  ],
  [
    "100b58c8",
    "8906",
    "MOV dword ptr [ESI],EAX"
  ],
  [
    "100b58ca",
    "c745b001000000",
    "MOV dword ptr [EBP + -0x50],0x1"
  ],
  [
    "100b58d1",
    "e988030000",
    "JMP 0x100b5c5e"
  ],
  [
    "100b58d6",
    "834de840",
    "OR dword ptr [EBP + -0x18],0x40"
  ],
  [
    "100b58da",
    "c745d80a000000",
    "MOV dword ptr [EBP + -0x28],0xa"
  ],
  [
    "100b58e1",
    "8b4de8",
    "MOV ECX,dword ptr [EBP + -0x18]"
  ],
  [
    "100b58e4",
    "6685c9",
    "TEST CX,CX"
  ],
  [
    "100b58e7",
    "0f8943010000",
    "JNS 0x100b5a30"
  ],
  [
    "100b58ed",
    "8b07",
    "MOV EAX,dword ptr [EDI]"
  ],
  [
    "100b58ef",
    "8b5704",
    "MOV EDX,dword ptr [EDI + 0x4]"
  ],
  [
    "100b58f2",
    "83c708",
    "ADD EDI,0x8"
  ],
  [
    "100b58f5",
    "e96b010000",
    "JMP 0x100b5a65"
  ],
  [
    "100b58fa",
    "750e",
    "JNZ 0x100b590a"
  ],
  [
    "100b58fc",
    "80fa67",
    "CMP DL,0x67"
  ],
  [
    "100b58ff",
    "7547",
    "JNZ 0x100b5948"
  ],
  [
    "100b5901",
    "c745e001000000",
    "MOV dword ptr [EBP + -0x20],0x1"
  ],
  [
    "100b5908",
    "eb3e",
    "JMP 0x100b5948"
  ],
  [
    "100b590a",
    "3945e0",
    "CMP dword ptr [EBP + -0x20],EAX"
  ],
  [
    "100b590d",
    "7e03",
    "JLE 0x100b5912"
  ],
  [
    "100b590f",
    "8945e0",
    "MOV dword ptr [EBP + -0x20],EAX"
  ],
  [
    "100b5912",
    "817de0a3000000",
    "CMP dword ptr [EBP + -0x20],0xa3"
  ],
  [
    "100b5919",
    "7e2d",
    "JLE 0x100b5948"
  ],
  [
    "100b591b",
    "8b75e0",
    "MOV ESI,dword ptr [EBP + -0x20]"
  ],
  [
    "100b591e",
    "81c65d010000",
    "ADD ESI,0x15d"
  ],
  [
    "100b5924",
    "56",
    "PUSH ESI"
  ],
  [
    "100b5925",
    "e8a695ffff",
    "CALL 0x100aeed0"
  ],
  [
    "100b592a",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b592c",
    "8a55e7",
    "MOV DL,byte ptr [EBP + -0x19]"
  ],
  [
    "100b592f",
    "59",
    "POP ECX"
  ],
  [
    "100b5930",
    "8945ac",
    "MOV dword ptr [EBP + -0x54],EAX"
  ],
  [
    "100b5933",
    "740a",
    "JZ 0x100b593f"
  ],
  [
    "100b5935",
    "8945dc",
    "MOV dword ptr [EBP + -0x24],EAX"
  ],
  [
    "100b5938",
    "897598",
    "MOV dword ptr [EBP + -0x68],ESI"
  ],
  [
    "100b593b",
    "8bd8",
    "MOV EBX,EAX"
  ],
  [
    "100b593d",
    "eb07",
    "JMP 0x100b5946"
  ],
  [
    "100b593f",
    "c745e0a3000000",
    "MOV dword ptr [EBP + -0x20],0xa3"
  ],
  [
    "100b5946",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100b5948",
    "8b07",
    "MOV EAX,dword ptr [EDI]"
  ],
  [
    "100b594a",
    "83c708",
    "ADD EDI,0x8"
  ],
  [
    "100b594d",
    "894580",
    "MOV dword ptr [EBP + -0x80],EAX"
  ],
  [
    "100b5950",
    "8b47fc",
    "MOV EAX,dword ptr [EDI + -0x4]"
  ],
  [
    "100b5953",
    "894584",
    "MOV dword ptr [EBP + -0x7c],EAX"
  ],
  [
    "100b5956",
    "8d459c",
    "LEA EAX,[EBP + -0x64]"
  ],
  [
    "100b5959",
    "50",
    "PUSH EAX"
  ],
  [
    "100b595a",
    "ff7588",
    "PUSH dword ptr [EBP + -0x78]"
  ],
  [
    "100b595d",
    "0fbec2",
    "MOVSX EAX,DL"
  ],
  [
    "100b5960",
    "ff75e0",
    "PUSH dword ptr [EBP + -0x20]"
  ],
  [
    "100b5963",
    "897dd4",
    "MOV dword ptr [EBP + -0x2c],EDI"
  ],
  [
    "100b5966",
    "50",
    "PUSH EAX"
  ],
  [
    "100b5967",
    "ff7598",
    "PUSH dword ptr [EBP + -0x68]"
  ],
  [
    "100b596a",
    "8d4580",
    "LEA EAX,[EBP + -0x80]"
  ],
  [
    "100b596d",
    "53",
    "PUSH EBX"
  ],
  [
    "100b596e",
    "50",
    "PUSH EAX"
  ],
  [
    "100b596f",
    "ff3598141410",
    "PUSH dword ptr [0x10141498]"
  ],
  [
    "100b5975",
    "e87889ffff",
    "CALL 0x100ae2f2"
  ],
  [
    "100b597a",
    "59",
    "POP ECX"
  ],
  [
    "100b597b",
    "ffd0",
    "CALL EAX"
  ],
  [
    "100b597d",
    "8b7de8",
    "MOV EDI,dword ptr [EBP + -0x18]"
  ],
  [
    "100b5980",
    "83c41c",
    "ADD ESP,0x1c"
  ],
  [
    "100b5983",
    "81e780000000",
    "AND EDI,0x80"
  ],
  [
    "100b5989",
    "741a",
    "JZ 0x100b59a5"
  ],
  [
    "100b598b",
    "3975e0",
    "CMP dword ptr [EBP + -0x20],ESI"
  ],
  [
    "100b598e",
    "7515",
    "JNZ 0x100b59a5"
  ],
  [
    "100b5990",
    "8d459c",
    "LEA EAX,[EBP + -0x64]"
  ],
  [
    "100b5993",
    "50",
    "PUSH EAX"
  ],
  [
    "100b5994",
    "53",
    "PUSH EBX"
  ],
  [
    "100b5995",
    "ff35a4141410",
    "PUSH dword ptr [0x101414a4]"
  ],
  [
    "100b599b",
    "e85289ffff",
    "CALL 0x100ae2f2"
  ],
  [
    "100b59a0",
    "59",
    "POP ECX"
  ],
  [
    "100b59a1",
    "ffd0",
    "CALL EAX"
  ],
  [
    "100b59a3",
    "59",
    "POP ECX"
  ],
  [
    "100b59a4",
    "59",
    "POP ECX"
  ],
  [
    "100b59a5",
    "807de767",
    "CMP byte ptr [EBP + -0x19],0x67"
  ],
  [
    "100b59a9",
    "7519",
    "JNZ 0x100b59c4"
  ],
  [
    "100b59ab",
    "3bfe",
    "CMP EDI,ESI"
  ],
  [
    "100b59ad",
    "7515",
    "JNZ 0x100b59c4"
  ],
  [
    "100b59af",
    "8d459c",
    "LEA EAX,[EBP + -0x64]"
  ],
  [
    "100b59b2",
    "50",
    "PUSH EAX"
  ],
  [
    "100b59b3",
    "53",
    "PUSH EBX"
  ],
  [
    "100b59b4",
    "ff35a0141410",
    "PUSH dword ptr [0x101414a0]"
  ],
  [
    "100b59ba",
    "e83389ffff",
    "CALL 0x100ae2f2"
  ],
  [
    "100b59bf",
    "59",
    "POP ECX"
  ],
  [
    "100b59c0",
    "ffd0",
    "CALL EAX"
  ],
  [
    "100b59c2",
    "59",
    "POP ECX"
  ],
  [
    "100b59c3",
    "59",
    "POP ECX"
  ],
  [
    "100b59c4",
    "803b2d",
    "CMP byte ptr [EBX],0x2d"
  ],
  [
    "100b59c7",
    "750b",
    "JNZ 0x100b59d4"
  ],
  [
    "100b59c9",
    "814de800010000",
    "OR dword ptr [EBP + -0x18],0x100"
  ],
  [
    "100b59d0",
    "43",
    "INC EBX"
  ],
  [
    "100b59d1",
    "895ddc",
    "MOV dword ptr [EBP + -0x24],EBX"
  ],
  [
    "100b59d4",
    "53",
    "PUSH EBX"
  ],
  [
    "100b59d5",
    "e972feffff",
    "JMP 0x100b584c"
  ],
  [
    "100b59da",
    "c745e008000000",
    "MOV dword ptr [EBP + -0x20],0x8"
  ],
  [
    "100b59e1",
    "894db4",
    "MOV dword ptr [EBP + -0x4c],ECX"
  ],
  [
    "100b59e4",
    "eb21",
    "JMP 0x100b5a07"
  ],
  [
    "100b59e6",
    "83e873",
    "SUB EAX,0x73"
  ],
  [
    "100b59e9",
    "0f8470fdffff",
    "JZ 0x100b575f"
  ],
  [
    "100b59ef",
    "48",
    "DEC EAX"
  ],
  [
    "100b59f0",
    "48",
    "DEC EAX"
  ],
  [
    "100b59f1",
    "0f84e3feffff",
    "JZ 0x100b58da"
  ],
  [
    "100b59f7",
    "83e803",
    "SUB EAX,0x3"
  ],
  [
    "100b59fa",
    "0f8559010000",
    "JNZ 0x100b5b59"
  ],
  [
    "100b5a00",
    "c745b427000000",
    "MOV dword ptr [EBP + -0x4c],0x27"
  ],
  [
    "100b5a07",
    "f645e880",
    "TEST byte ptr [EBP + -0x18],0x80"
  ],
  [
    "100b5a0b",
    "c745d810000000",
    "MOV dword ptr [EBP + -0x28],0x10"
  ],
  [
    "100b5a12",
    "0f84c9feffff",
    "JZ 0x100b58e1"
  ],
  [
    "100b5a18",
    "8a45b4",
    "MOV AL,byte ptr [EBP + -0x4c]"
  ],
  [
    "100b5a1b",
    "0451",
    "ADD AL,0x51"
  ],
  [
    "100b5a1d",
    "c645c830",
    "MOV byte ptr [EBP + -0x38],0x30"
  ],
  [
    "100b5a21",
    "8845c9",
    "MOV byte ptr [EBP + -0x37],AL"
  ],
  [
    "100b5a24",
    "c745c402000000",
    "MOV dword ptr [EBP + -0x3c],0x2"
  ],
  [
    "100b5a2b",
    "e9b1feffff",
    "JMP 0x100b58e1"
  ],
  [
    "100b5a30",
    "66f7c10010",
    "TEST CX,0x1000"
  ],
  [
    "100b5a35",
    "0f85b2feffff",
    "JNZ 0x100b58ed"
  ],
  [
    "100b5a3b",
    "83c704",
    "ADD EDI,0x4"
  ],
  [
    "100b5a3e",
    "f6c120",
    "TEST CL,0x20"
  ],
  [
    "100b5a41",
    "7415",
    "JZ 0x100b5a58"
  ],
  [
    "100b5a43",
    "f6c140",
    "TEST CL,0x40"
  ],
  [
    "100b5a46",
    "897dd4",
    "MOV dword ptr [EBP + -0x2c],EDI"
  ],
  [
    "100b5a49",
    "7406",
    "JZ 0x100b5a51"
  ],
  [
    "100b5a4b",
    "0fbf47fc",
    "MOVSX EAX,word ptr [EDI + -0x4]"
  ],
  [
    "100b5a4f",
    "eb04",
    "JMP 0x100b5a55"
  ],
  [
    "100b5a51",
    "0fb747fc",
    "MOVZX EAX,word ptr [EDI + -0x4]"
  ],
  [
    "100b5a55",
    "99",
    "CDQ"
  ],
  [
    "100b5a56",
    "eb10",
    "JMP 0x100b5a68"
  ],
  [
    "100b5a58",
    "f6c140",
    "TEST CL,0x40"
  ],
  [
    "100b5a5b",
    "8b47fc",
    "MOV EAX,dword ptr [EDI + -0x4]"
  ],
  [
    "100b5a5e",
    "7403",
    "JZ 0x100b5a63"
  ],
  [
    "100b5a60",
    "99",
    "CDQ"
  ],
  [
    "100b5a61",
    "eb02",
    "JMP 0x100b5a65"
  ],
  [
    "100b5a63",
    "33d2",
    "XOR EDX,EDX"
  ],
  [
    "100b5a65",
    "897dd4",
    "MOV dword ptr [EBP + -0x2c],EDI"
  ],
  [
    "100b5a68",
    "f6c140",
    "TEST CL,0x40"
  ],
  [
    "100b5a6b",
    "7418",
    "JZ 0x100b5a85"
  ],
  [
    "100b5a6d",
    "3bd6",
    "CMP EDX,ESI"
  ],
  [
    "100b5a6f",
    "7f14",
    "JG 0x100b5a85"
  ],
  [
    "100b5a71",
    "7c04",
    "JL 0x100b5a77"
  ],
  [
    "100b5a73",
    "3bc6",
    "CMP EAX,ESI"
  ],
  [
    "100b5a75",
    "730e",
    "JNC 0x100b5a85"
  ],
  [
    "100b5a77",
    "f7d8",
    "NEG EAX"
  ],
  [
    "100b5a79",
    "83d200",
    "ADC EDX,0x0"
  ],
  [
    "100b5a7c",
    "f7da",
    "NEG EDX"
  ],
  [
    "100b5a7e",
    "814de800010000",
    "OR dword ptr [EBP + -0x18],0x100"
  ],
  [
    "100b5a85",
    "66f745e80090",
    "TEST word ptr [EBP + -0x18],0x9000"
  ],
  [
    "100b5a8b",
    "8bda",
    "MOV EBX,EDX"
  ],
  [
    "100b5a8d",
    "8bf8",
    "MOV EDI,EAX"
  ],
  [
    "100b5a8f",
    "7502",
    "JNZ 0x100b5a93"
  ],
  [
    "100b5a91",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100b5a93",
    "837de000",
    "CMP dword ptr [EBP + -0x20],0x0"
  ],
  [
    "100b5a97",
    "7d09",
    "JGE 0x100b5aa2"
  ],
  [
    "100b5a99",
    "c745e001000000",
    "MOV dword ptr [EBP + -0x20],0x1"
  ],
  [
    "100b5aa0",
    "eb11",
    "JMP 0x100b5ab3"
  ],
  [
    "100b5aa2",
    "8365e8f7",
    "AND dword ptr [EBP + -0x18],0xfffffff7"
  ],
  [
    "100b5aa6",
    "b800020000",
    "MOV EAX,0x200"
  ],
  [
    "100b5aab",
    "3945e0",
    "CMP dword ptr [EBP + -0x20],EAX"
  ],
  [
    "100b5aae",
    "7e03",
    "JLE 0x100b5ab3"
  ],
  [
    "100b5ab0",
    "8945e0",
    "MOV dword ptr [EBP + -0x20],EAX"
  ],
  [
    "100b5ab3",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100b5ab5",
    "0bc3",
    "OR EAX,EBX"
  ],
  [
    "100b5ab7",
    "7503",
    "JNZ 0x100b5abc"
  ],
  [
    "100b5ab9",
    "2145c4",
    "AND dword ptr [EBP + -0x3c],EAX"
  ],
  [
    "100b5abc",
    "8db5eb010000",
    "LEA ESI,[EBP + 0x1eb]"
  ],
  [
    "100b5ac2",
    "8b45e0",
    "MOV EAX,dword ptr [EBP + -0x20]"
  ],
  [
    "100b5ac5",
    "ff4de0",
    "DEC dword ptr [EBP + -0x20]"
  ],
  [
    "100b5ac8",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b5aca",
    "7f06",
    "JG 0x100b5ad2"
  ],
  [
    "100b5acc",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100b5ace",
    "0bc3",
    "OR EAX,EBX"
  ],
  [
    "100b5ad0",
    "7424",
    "JZ 0x100b5af6"
  ],
  [
    "100b5ad2",
    "8b45d8",
    "MOV EAX,dword ptr [EBP + -0x28]"
  ],
  [
    "100b5ad5",
    "99",
    "CDQ"
  ],
  [
    "100b5ad6",
    "52",
    "PUSH EDX"
  ],
  [
    "100b5ad7",
    "50",
    "PUSH EAX"
  ],
  [
    "100b5ad8",
    "53",
    "PUSH EBX"
  ],
  [
    "100b5ad9",
    "57",
    "PUSH EDI"
  ],
  [
    "100b5ada",
    "e8d1840100",
    "CALL 0x100cdfb0"
  ],
  [
    "100b5adf",
    "83c130",
    "ADD ECX,0x30"
  ],
  [
    "100b5ae2",
    "83f939",
    "CMP ECX,0x39"
  ],
  [
    "100b5ae5",
    "895d98",
    "MOV dword ptr [EBP + -0x68],EBX"
  ],
  [
    "100b5ae8",
    "8bf8",
    "MOV EDI,EAX"
  ],
  [
    "100b5aea",
    "8bda",
    "MOV EBX,EDX"
  ],
  [
    "100b5aec",
    "7e03",
    "JLE 0x100b5af1"
  ],
  [
    "100b5aee",
    "034db4",
    "ADD ECX,dword ptr [EBP + -0x4c]"
  ],
  [
    "100b5af1",
    "880e",
    "MOV byte ptr [ESI],CL"
  ],
  [
    "100b5af3",
    "4e",
    "DEC ESI"
  ],
  [
    "100b5af4",
    "ebcc",
    "JMP 0x100b5ac2"
  ],
  [
    "100b5af6",
    "8d85eb010000",
    "LEA EAX,[EBP + 0x1eb]"
  ],
  [
    "100b5afc",
    "2bc6",
    "SUB EAX,ESI"
  ],
  [
    "100b5afe",
    "46",
    "INC ESI"
  ],
  [
    "100b5aff",
    "66f745e80002",
    "TEST word ptr [EBP + -0x18],0x200"
  ],
  [
    "100b5b05",
    "8945d8",
    "MOV dword ptr [EBP + -0x28],EAX"
  ],
  [
    "100b5b08",
    "8975dc",
    "MOV dword ptr [EBP + -0x24],ESI"
  ],
  [
    "100b5b0b",
    "744c",
    "JZ 0x100b5b59"
  ],
  [
    "100b5b0d",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b5b0f",
    "7407",
    "JZ 0x100b5b18"
  ],
  [
    "100b5b11",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100b5b13",
    "803930",
    "CMP byte ptr [ECX],0x30"
  ],
  [
    "100b5b16",
    "7441",
    "JZ 0x100b5b59"
  ],
  [
    "100b5b18",
    "ff4ddc",
    "DEC dword ptr [EBP + -0x24]"
  ],
  [
    "100b5b1b",
    "8b4ddc",
    "MOV ECX,dword ptr [EBP + -0x24]"
  ],
  [
    "100b5b1e",
    "c60130",
    "MOV byte ptr [ECX],0x30"
  ],
  [
    "100b5b21",
    "40",
    "INC EAX"
  ],
  [
    "100b5b22",
    "eb32",
    "JMP 0x100b5b56"
  ],
  [
    "100b5b24",
    "49",
    "DEC ECX"
  ],
  [
    "100b5b25",
    "663930",
    "CMP word ptr [EAX],SI"
  ],
  [
    "100b5b28",
    "7406",
    "JZ 0x100b5b30"
  ],
  [
    "100b5b2a",
    "40",
    "INC EAX"
  ],
  [
    "100b5b2b",
    "40",
    "INC EAX"
  ],
  [
    "100b5b2c",
    "3bce",
    "CMP ECX,ESI"
  ],
  [
    "100b5b2e",
    "75f4",
    "JNZ 0x100b5b24"
  ],
  [
    "100b5b30",
    "2b45dc",
    "SUB EAX,dword ptr [EBP + -0x24]"
  ],
  [
    "100b5b33",
    "d1f8",
    "SAR EAX,0x1"
  ],
  [
    "100b5b35",
    "eb1f",
    "JMP 0x100b5b56"
  ],
  [
    "100b5b37",
    "3bfe",
    "CMP EDI,ESI"
  ],
  [
    "100b5b39",
    "7508",
    "JNZ 0x100b5b43"
  ],
  [
    "100b5b3b",
    "a1a8141410",
    "MOV EAX,[0x101414a8]"
  ],
  [
    "100b5b40",
    "8945dc",
    "MOV dword ptr [EBP + -0x24],EAX"
  ],
  [
    "100b5b43",
    "8b45dc",
    "MOV EAX,dword ptr [EBP + -0x24]"
  ],
  [
    "100b5b46",
    "eb07",
    "JMP 0x100b5b4f"
  ],
  [
    "100b5b48",
    "49",
    "DEC ECX"
  ],
  [
    "100b5b49",
    "803800",
    "CMP byte ptr [EAX],0x0"
  ],
  [
    "100b5b4c",
    "7405",
    "JZ 0x100b5b53"
  ],
  [
    "100b5b4e",
    "40",
    "INC EAX"
  ],
  [
    "100b5b4f",
    "3bce",
    "CMP ECX,ESI"
  ],
  [
    "100b5b51",
    "75f5",
    "JNZ 0x100b5b48"
  ],
  [
    "100b5b53",
    "2b45dc",
    "SUB EAX,dword ptr [EBP + -0x24]"
  ],
  [
    "100b5b56",
    "8945d8",
    "MOV dword ptr [EBP + -0x28],EAX"
  ],
  [
    "100b5b59",
    "837db000",
    "CMP dword ptr [EBP + -0x50],0x0"
  ],
  [
    "100b5b5d",
    "0f85fb000000",
    "JNZ 0x100b5c5e"
  ],
  [
    "100b5b63",
    "8b45e8",
    "MOV EAX,dword ptr [EBP + -0x18]"
  ],
  [
    "100b5b66",
    "a840",
    "TEST AL,0x40"
  ],
  [
    "100b5b68",
    "7425",
    "JZ 0x100b5b8f"
  ],
  [
    "100b5b6a",
    "66a90001",
    "TEST AX,0x100"
  ],
  [
    "100b5b6e",
    "7406",
    "JZ 0x100b5b76"
  ],
  [
    "100b5b70",
    "c645c82d",
    "MOV byte ptr [EBP + -0x38],0x2d"
  ],
  [
    "100b5b74",
    "eb12",
    "JMP 0x100b5b88"
  ],
  [
    "100b5b76",
    "a801",
    "TEST AL,0x1"
  ],
  [
    "100b5b78",
    "7406",
    "JZ 0x100b5b80"
  ],
  [
    "100b5b7a",
    "c645c82b",
    "MOV byte ptr [EBP + -0x38],0x2b"
  ],
  [
    "100b5b7e",
    "eb08",
    "JMP 0x100b5b88"
  ],
  [
    "100b5b80",
    "a802",
    "TEST AL,0x2"
  ],
  [
    "100b5b82",
    "740b",
    "JZ 0x100b5b8f"
  ],
  [
    "100b5b84",
    "c645c820",
    "MOV byte ptr [EBP + -0x38],0x20"
  ],
  [
    "100b5b88",
    "c745c401000000",
    "MOV dword ptr [EBP + -0x3c],0x1"
  ],
  [
    "100b5b8f",
    "8b5dc0",
    "MOV EBX,dword ptr [EBP + -0x40]"
  ],
  [
    "100b5b92",
    "2b5dd8",
    "SUB EBX,dword ptr [EBP + -0x28]"
  ],
  [
    "100b5b95",
    "2b5dc4",
    "SUB EBX,dword ptr [EBP + -0x3c]"
  ],
  [
    "100b5b98",
    "f645e80c",
    "TEST byte ptr [EBP + -0x18],0xc"
  ],
  [
    "100b5b9c",
    "7511",
    "JNZ 0x100b5baf"
  ],
  [
    "100b5b9e",
    "ff75d0",
    "PUSH dword ptr [EBP + -0x30]"
  ],
  [
    "100b5ba1",
    "8d45cc",
    "LEA EAX,[EBP + -0x34]"
  ],
  [
    "100b5ba4",
    "53",
    "PUSH EBX"
  ],
  [
    "100b5ba5",
    "6a20",
    "PUSH 0x20"
  ],
  [
    "100b5ba7",
    "e810f7ffff",
    "CALL 0x100b52bc"
  ],
  [
    "100b5bac",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100b5baf",
    "ff75c4",
    "PUSH dword ptr [EBP + -0x3c]"
  ],
  [
    "100b5bb2",
    "8b7dd0",
    "MOV EDI,dword ptr [EBP + -0x30]"
  ],
  [
    "100b5bb5",
    "8d45cc",
    "LEA EAX,[EBP + -0x34]"
  ],
  [
    "100b5bb8",
    "8d4dc8",
    "LEA ECX,[EBP + -0x38]"
  ],
  [
    "100b5bbb",
    "e820f7ffff",
    "CALL 0x100b52e0"
  ],
  [
    "100b5bc0",
    "f645e808",
    "TEST byte ptr [EBP + -0x18],0x8"
  ],
  [
    "100b5bc4",
    "59",
    "POP ECX"
  ],
  [
    "100b5bc5",
    "7415",
    "JZ 0x100b5bdc"
  ],
  [
    "100b5bc7",
    "f645e804",
    "TEST byte ptr [EBP + -0x18],0x4"
  ],
  [
    "100b5bcb",
    "750f",
    "JNZ 0x100b5bdc"
  ],
  [
    "100b5bcd",
    "57",
    "PUSH EDI"
  ],
  [
    "100b5bce",
    "53",
    "PUSH EBX"
  ],
  [
    "100b5bcf",
    "6a30",
    "PUSH 0x30"
  ],
  [
    "100b5bd1",
    "8d45cc",
    "LEA EAX,[EBP + -0x34]"
  ],
  [
    "100b5bd4",
    "e8e3f6ffff",
    "CALL 0x100b52bc"
  ],
  [
    "100b5bd9",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100b5bdc",
    "837dbc00",
    "CMP dword ptr [EBP + -0x44],0x0"
  ],
  [
    "100b5be0",
    "8b45d8",
    "MOV EAX,dword ptr [EBP + -0x28]"
  ],
  [
    "100b5be3",
    "7451",
    "JZ 0x100b5c36"
  ],
  [
    "100b5be5",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b5be7",
    "7e4d",
    "JLE 0x100b5c36"
  ],
  [
    "100b5be9",
    "8b75dc",
    "MOV ESI,dword ptr [EBP + -0x24]"
  ],
  [
    "100b5bec",
    "894598",
    "MOV dword ptr [EBP + -0x68],EAX"
  ],
  [
    "100b5bef",
    "0fb706",
    "MOVZX EAX,word ptr [ESI]"
  ],
  [
    "100b5bf2",
    "ff4d98",
    "DEC dword ptr [EBP + -0x68]"
  ],
  [
    "100b5bf5",
    "50",
    "PUSH EAX"
  ],
  [
    "100b5bf6",
    "6a06",
    "PUSH 0x6"
  ],
  [
    "100b5bf8",
    "8d85ec010000",
    "LEA EAX,[EBP + 0x1ec]"
  ],
  [
    "100b5bfe",
    "50",
    "PUSH EAX"
  ],
  [
    "100b5bff",
    "8d4590",
    "LEA EAX,[EBP + -0x70]"
  ],
  [
    "100b5c02",
    "46",
    "INC ESI"
  ],
  [
    "100b5c03",
    "50",
    "PUSH EAX"
  ],
  [
    "100b5c04",
    "46",
    "INC ESI"
  ],
  [
    "100b5c05",
    "e8b5920100",
    "CALL 0x100ceebf"
  ],
  [
    "100b5c0a",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100b5c0d",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b5c0f",
    "751f",
    "JNZ 0x100b5c30"
  ],
  [
    "100b5c11",
    "394590",
    "CMP dword ptr [EBP + -0x70],EAX"
  ],
  [
    "100b5c14",
    "741a",
    "JZ 0x100b5c30"
  ],
  [
    "100b5c16",
    "ff7590",
    "PUSH dword ptr [EBP + -0x70]"
  ],
  [
    "100b5c19",
    "8d45cc",
    "LEA EAX,[EBP + -0x34]"
  ],
  [
    "100b5c1c",
    "8d8dec010000",
    "LEA ECX,[EBP + 0x1ec]"
  ],
  [
    "100b5c22",
    "e8b9f6ffff",
    "CALL 0x100b52e0"
  ],
  [
    "100b5c27",
    "837d9800",
    "CMP dword ptr [EBP + -0x68],0x0"
  ],
  [
    "100b5c2b",
    "59",
    "POP ECX"
  ],
  [
    "100b5c2c",
    "75c1",
    "JNZ 0x100b5bef"
  ],
  [
    "100b5c2e",
    "eb13",
    "JMP 0x100b5c43"
  ],
  [
    "100b5c30",
    "834dccff",
    "OR dword ptr [EBP + -0x34],0xffffffff"
  ],
  [
    "100b5c34",
    "eb0d",
    "JMP 0x100b5c43"
  ],
  [
    "100b5c36",
    "8b4ddc",
    "MOV ECX,dword ptr [EBP + -0x24]"
  ],
  [
    "100b5c39",
    "50",
    "PUSH EAX"
  ],
  [
    "100b5c3a",
    "8d45cc",
    "LEA EAX,[EBP + -0x34]"
  ],
  [
    "100b5c3d",
    "e89ef6ffff",
    "CALL 0x100b52e0"
  ],
  [
    "100b5c42",
    "59",
    "POP ECX"
  ],
  [
    "100b5c43",
    "837dcc00",
    "CMP dword ptr [EBP + -0x34],0x0"
  ],
  [
    "100b5c47",
    "7c15",
    "JL 0x100b5c5e"
  ],
  [
    "100b5c49",
    "f645e804",
    "TEST byte ptr [EBP + -0x18],0x4"
  ],
  [
    "100b5c4d",
    "740f",
    "JZ 0x100b5c5e"
  ],
  [
    "100b5c4f",
    "57",
    "PUSH EDI"
  ],
  [
    "100b5c50",
    "53",
    "PUSH EBX"
  ],
  [
    "100b5c51",
    "6a20",
    "PUSH 0x20"
  ],
  [
    "100b5c53",
    "8d45cc",
    "LEA EAX,[EBP + -0x34]"
  ],
  [
    "100b5c56",
    "e861f6ffff",
    "CALL 0x100b52bc"
  ],
  [
    "100b5c5b",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100b5c5e",
    "837dac00",
    "CMP dword ptr [EBP + -0x54],0x0"
  ],
  [
    "100b5c62",
    "740d",
    "JZ 0x100b5c71"
  ],
  [
    "100b5c64",
    "ff75ac",
    "PUSH dword ptr [EBP + -0x54]"
  ],
  [
    "100b5c67",
    "e8384dffff",
    "CALL 0x100aa9a4"
  ],
  [
    "100b5c6c",
    "8365ac00",
    "AND dword ptr [EBP + -0x54],0x0"
  ],
  [
    "100b5c70",
    "59",
    "POP ECX"
  ],
  [
    "100b5c71",
    "8b5db8",
    "MOV EBX,dword ptr [EBP + -0x48]"
  ],
  [
    "100b5c74",
    "8a03",
    "MOV AL,byte ptr [EBX]"
  ],
  [
    "100b5c76",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100b5c78",
    "8845e7",
    "MOV byte ptr [EBP + -0x19],AL"
  ],
  [
    "100b5c7b",
    "7424",
    "JZ 0x100b5ca1"
  ],
  [
    "100b5c7d",
    "8b4d8c",
    "MOV ECX,dword ptr [EBP + -0x74]"
  ],
  [
    "100b5c80",
    "8b7dd4",
    "MOV EDI,dword ptr [EBP + -0x2c]"
  ],
  [
    "100b5c83",
    "8ad0",
    "MOV DL,AL"
  ],
  [
    "100b5c85",
    "e929f8ffff",
    "JMP 0x100b54b3"
  ],
  [
    "100b5c8a",
    "e84291ffff",
    "CALL 0x100aedd1"
  ],
  [
    "100b5c8f",
    "c70016000000",
    "MOV dword ptr [EAX],0x16"
  ],
  [
    "100b5c95",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100b5c97",
    "50",
    "PUSH EAX"
  ],
  [
    "100b5c98",
    "50",
    "PUSH EAX"
  ],
  [
    "100b5c99",
    "50",
    "PUSH EAX"
  ],
  [
    "100b5c9a",
    "50",
    "PUSH EAX"
  ],
  [
    "100b5c9b",
    "50",
    "PUSH EAX"
  ],
  [
    "100b5c9c",
    "e924f7ffff",
    "JMP 0x100b53c5"
  ],
  [
    "100b5ca1",
    "807da800",
    "CMP byte ptr [EBP + -0x58],0x0"
  ],
  [
    "100b5ca5",
    "7407",
    "JZ 0x100b5cae"
  ],
  [
    "100b5ca7",
    "8b45a4",
    "MOV EAX,dword ptr [EBP + -0x5c]"
  ],
  [
    "100b5caa",
    "836070fd",
    "AND dword ptr [EAX + 0x70],0xfffffffd"
  ],
  [
    "100b5cae",
    "8b45cc",
    "MOV EAX,dword ptr [EBP + -0x34]"
  ],
  [
    "100b5cb1",
    "8b8df4010000",
    "MOV ECX,dword ptr [EBP + 0x1f4]"
  ],
  [
    "100b5cb7",
    "5f",
    "POP EDI"
  ],
  [
    "100b5cb8",
    "5e",
    "POP ESI"
  ],
  [
    "100b5cb9",
    "33cd",
    "XOR ECX,EBP"
  ],
  [
    "100b5cbb",
    "5b",
    "POP EBX"
  ],
  [
    "100b5cbc",
    "e807a5ffff",
    "CALL 0x100b01c8"
  ],
  [
    "100b5cc1",
    "81c5f8010000",
    "ADD EBP,0x1f8"
  ],
  [
    "100b5cc7",
    "c9",
    "LEAVE"
  ],
  [
    "100b5cc8",
    "c3",
    "RET"
  ],
  [
    "100cdfb0",
    "56",
    "PUSH ESI"
  ],
  [
    "100cdfb1",
    "8b442414",
    "MOV EAX,dword ptr [ESP + 0x14]"
  ],
  [
    "100cdfb5",
    "0bc0",
    "OR EAX,EAX"
  ],
  [
    "100cdfb7",
    "7528",
    "JNZ 0x100cdfe1"
  ],
  [
    "100cdfb9",
    "8b4c2410",
    "MOV ECX,dword ptr [ESP + 0x10]"
  ],
  [
    "100cdfbd",
    "8b44240c",
    "MOV EAX,dword ptr [ESP + 0xc]"
  ],
  [
    "100cdfc1",
    "33d2",
    "XOR EDX,EDX"
  ],
  [
    "100cdfc3",
    "f7f1",
    "DIV ECX"
  ],
  [
    "100cdfc5",
    "8bd8",
    "MOV EBX,EAX"
  ],
  [
    "100cdfc7",
    "8b442408",
    "MOV EAX,dword ptr [ESP + 0x8]"
  ],
  [
    "100cdfcb",
    "f7f1",
    "DIV ECX"
  ],
  [
    "100cdfcd",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100cdfcf",
    "8bc3",
    "MOV EAX,EBX"
  ],
  [
    "100cdfd1",
    "f7642410",
    "MUL dword ptr [ESP + 0x10]"
  ],
  [
    "100cdfd5",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100cdfd7",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100cdfd9",
    "f7642410",
    "MUL dword ptr [ESP + 0x10]"
  ],
  [
    "100cdfdd",
    "03d1",
    "ADD EDX,ECX"
  ],
  [
    "100cdfdf",
    "eb47",
    "JMP 0x100ce028"
  ],
  [
    "100cdfe1",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100cdfe3",
    "8b5c2410",
    "MOV EBX,dword ptr [ESP + 0x10]"
  ],
  [
    "100cdfe7",
    "8b54240c",
    "MOV EDX,dword ptr [ESP + 0xc]"
  ],
  [
    "100cdfeb",
    "8b442408",
    "MOV EAX,dword ptr [ESP + 0x8]"
  ],
  [
    "100cdfef",
    "d1e9",
    "SHR ECX,0x1"
  ],
  [
    "100cdff1",
    "d1db",
    "RCR EBX,0x1"
  ],
  [
    "100cdff3",
    "d1ea",
    "SHR EDX,0x1"
  ],
  [
    "100cdff5",
    "d1d8",
    "RCR EAX,0x1"
  ],
  [
    "100cdff7",
    "0bc9",
    "OR ECX,ECX"
  ],
  [
    "100cdff9",
    "75f4",
    "JNZ 0x100cdfef"
  ],
  [
    "100cdffb",
    "f7f3",
    "DIV EBX"
  ],
  [
    "100cdffd",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100cdfff",
    "f7642414",
    "MUL dword ptr [ESP + 0x14]"
  ],
  [
    "100ce003",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100ce005",
    "8b442410",
    "MOV EAX,dword ptr [ESP + 0x10]"
  ],
  [
    "100ce009",
    "f7e6",
    "MUL ESI"
  ],
  [
    "100ce00b",
    "03d1",
    "ADD EDX,ECX"
  ],
  [
    "100ce00d",
    "720e",
    "JC 0x100ce01d"
  ],
  [
    "100ce00f",
    "3b54240c",
    "CMP EDX,dword ptr [ESP + 0xc]"
  ],
  [
    "100ce013",
    "7708",
    "JA 0x100ce01d"
  ],
  [
    "100ce015",
    "720f",
    "JC 0x100ce026"
  ],
  [
    "100ce017",
    "3b442408",
    "CMP EAX,dword ptr [ESP + 0x8]"
  ],
  [
    "100ce01b",
    "7609",
    "JBE 0x100ce026"
  ],
  [
    "100ce01d",
    "4e",
    "DEC ESI"
  ],
  [
    "100ce01e",
    "2b442410",
    "SUB EAX,dword ptr [ESP + 0x10]"
  ],
  [
    "100ce022",
    "1b542414",
    "SBB EDX,dword ptr [ESP + 0x14]"
  ],
  [
    "100ce026",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100ce028",
    "2b442408",
    "SUB EAX,dword ptr [ESP + 0x8]"
  ],
  [
    "100ce02c",
    "1b54240c",
    "SBB EDX,dword ptr [ESP + 0xc]"
  ],
  [
    "100ce030",
    "f7da",
    "NEG EDX"
  ],
  [
    "100ce032",
    "f7d8",
    "NEG EAX"
  ],
  [
    "100ce034",
    "83da00",
    "SBB EDX,0x0"
  ],
  [
    "100ce037",
    "8bca",
    "MOV ECX,EDX"
  ],
  [
    "100ce039",
    "8bd3",
    "MOV EDX,EBX"
  ],
  [
    "100ce03b",
    "8bd9",
    "MOV EBX,ECX"
  ],
  [
    "100ce03d",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100ce03f",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100ce041",
    "5e",
    "POP ESI"
  ],
  [
    "100ce042",
    "c21000",
    "RET 0x10"
  ],
  [
    "100d55d6",
    "ff25f4982f10",
    "JMP dword ptr [0x102f98f4]"
  ],
  [
    "100d55dc",
    "ff25ec982f10",
    "JMP dword ptr [0x102f98ec]"
  ],
  [
    "100d55e2",
    "ff25f0982f10",
    "JMP dword ptr [0x102f98f0]"
  ]
];
const instructions=new Map<string,SharedDllEntryInstruction>(rows.map(([address,bytes,instruction])=>
 [address!,Object.freeze({address:address!,bytes:bytes!,instruction:instruction!})]));
export function sharedDllEntryInstruction(address:string):SharedDllEntryInstruction {
 const row=instructions.get(address);if(!row)throw new Error('Unowned SharedBase DLL entry instruction '+address);return row;
}
