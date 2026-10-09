/** Captured original DLL entry syntax; execution requires runtime ownership. */
export interface SharedDllEntryInstruction {readonly address:string;readonly bytes:string;readonly instruction:string;}
const rows:readonly (readonly string[])[] = [
  [
    "1000102d",
    "e9be140200",
    "JMP 0x100224f0"
  ],
  [
    "100010e1",
    "e95afb0100",
    "JMP 0x10020c40"
  ],
  [
    "10001334",
    "e9579c0400",
    "JMP 0x1004af90"
  ],
  [
    "10001c21",
    "e95a790400",
    "JMP 0x10049580"
  ],
  [
    "10001db1",
    "e9aa090200",
    "JMP 0x10022760"
  ],
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
    "10002df6",
    "e995f70100",
    "JMP 0x10022590"
  ],
  [
    "10002e46",
    "e9a59c0300",
    "JMP 0x1003caf0"
  ],
  [
    "100032c4",
    "e9d7f30100",
    "JMP 0x100226a0"
  ],
  [
    "10004133",
    "e9d8c90100",
    "JMP 0x10020b10"
  ],
  [
    "100052fe",
    "e98d840300",
    "JMP 0x1003d790"
  ],
  [
    "10005560",
    "e9ab3f0400",
    "JMP 0x10049510"
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
    "1000631b",
    "e9603a0400",
    "JMP 0x10049d80"
  ],
  [
    "10006645",
    "e946af0900",
    "JMP 0x100a1590"
  ],
  [
    "10006947",
    "e904c70100",
    "JMP 0x10023050"
  ],
  [
    "10006b7c",
    "e96f2a0400",
    "JMP 0x100495f0"
  ],
  [
    "10006c1c",
    "e93fad0100",
    "JMP 0x10021960"
  ],
  [
    "10006ebf",
    "e9cc250400",
    "JMP 0x10049490"
  ],
  [
    "10007441",
    "e9ca5f0300",
    "JMP 0x1003d410"
  ],
  [
    "10007644",
    "e9a75b0300",
    "JMP 0x1003d1f0"
  ],
  [
    "10007784",
    "e957bc0100",
    "JMP 0x100233e0"
  ],
  [
    "1000781a",
    "e9014c0400",
    "JMP 0x1004c420"
  ],
  [
    "10007aa9",
    "e972560300",
    "JMP 0x1003d120"
  ],
  [
    "10007cac",
    "e99f190400",
    "JMP 0x10049650"
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
    "10008887",
    "e924290400",
    "JMP 0x1004b1b0"
  ],
  [
    "1000888c",
    "e90f500300",
    "JMP 0x1003d8a0"
  ],
  [
    "100088b4",
    "e9a70e0400",
    "JMP 0x10049760"
  ],
  [
    "100089e5",
    "e9162e0400",
    "JMP 0x1004b800"
  ],
  [
    "10008a76",
    "e9b58b0900",
    "JMP 0x100a1630"
  ],
  [
    "10008b11",
    "e96a290400",
    "JMP 0x1004b480"
  ],
  [
    "10020af0",
    "e97450feff",
    "JMP 0x10005b69"
  ],
  [
    "10020b10",
    "e9777dfeff",
    "JMP 0x1000888c"
  ],
  [
    "10020c40",
    "b801000000",
    "MOV EAX,0x1"
  ],
  [
    "10020c45",
    "8405a4271410",
    "TEST byte ptr [0x101427a4],AL"
  ],
  [
    "10020c4b",
    "7537",
    "JNZ 0x10020c84"
  ],
  [
    "10020c4d",
    "0905a4271410",
    "OR dword ptr [0x101427a4],EAX"
  ],
  [
    "10020c53",
    "803d9d27141000",
    "CMP byte ptr [0x1014279d],0x0"
  ],
  [
    "10020c5a",
    "a2a1271410",
    "MOV [0x101427a1],AL"
  ],
  [
    "10020c5f",
    "750f",
    "JNZ 0x10020c70"
  ],
  [
    "10020c61",
    "a2a1271410",
    "MOV [0x101427a1],AL"
  ],
  [
    "10020c66",
    "a29d271410",
    "MOV [0x1014279d],AL"
  ],
  [
    "10020c6b",
    "a29c271410",
    "MOV [0x1014279c],AL"
  ],
  [
    "10020c70",
    "6810270e10",
    "PUSH 0x100e2710"
  ],
  [
    "10020c75",
    "c605a027141000",
    "MOV byte ptr [0x101427a0],0x0"
  ],
  [
    "10020c7c",
    "e84f660800",
    "CALL 0x100a72d0"
  ],
  [
    "10020c81",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "10020c84",
    "8b442404",
    "MOV EAX,dword ptr [ESP + 0x4]"
  ],
  [
    "10020c88",
    "56",
    "PUSH ESI"
  ],
  [
    "10020c89",
    "50",
    "PUSH EAX"
  ],
  [
    "10020c8a",
    "e8b267feff",
    "CALL 0x10007441"
  ],
  [
    "10020c8f",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "10020c91",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "10020c93",
    "7532",
    "JNZ 0x10020cc7"
  ],
  [
    "10020c95",
    "68d8690e10",
    "PUSH 0x100e69d8"
  ],
  [
    "10020c9a",
    "68a8271410",
    "PUSH 0x101427a8"
  ],
  [
    "10020c9f",
    "e890950800",
    "CALL 0x100aa234"
  ],
  [
    "10020ca4",
    "83c408",
    "ADD ESP,0x8"
  ],
  [
    "10020ca7",
    "684e010000",
    "PUSH 0x14e"
  ],
  [
    "10020cac",
    "68b8690e10",
    "PUSH 0x100e69b8"
  ],
  [
    "10020cb1",
    "689c690e10",
    "PUSH 0x100e699c"
  ],
  [
    "10020cb6",
    "68a8271410",
    "PUSH 0x101427a8"
  ],
  [
    "10020cbb",
    "e85c5ffeff",
    "CALL 0x10006c1c"
  ],
  [
    "10020cc0",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "10020cc2",
    "e83b42feff",
    "CALL 0x10004f02"
  ],
  [
    "10020cc7",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "10020cc9",
    "5e",
    "POP ESI"
  ],
  [
    "10020cca",
    "c20800",
    "RET 0x8"
  ],
  [
    "10021960",
    "b801000000",
    "MOV EAX,0x1"
  ],
  [
    "10021965",
    "84058c2a1410",
    "TEST byte ptr [0x10142a8c],AL"
  ],
  [
    "1002196b",
    "7548",
    "JNZ 0x100219b5"
  ],
  [
    "1002196d",
    "09058c2a1410",
    "OR dword ptr [0x10142a8c],EAX"
  ],
  [
    "10021973",
    "68602a1410",
    "PUSH 0x10142a60"
  ],
  [
    "10021978",
    "ff15f4952f10",
    "CALL dword ptr [0x102f95f4]"
  ],
  [
    "1002197e",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "10021980",
    "b9582a1410",
    "MOV ECX,0x10142a58"
  ],
  [
    "10021985",
    "a3582a1410",
    "MOV [0x10142a58],EAX"
  ],
  [
    "1002198a",
    "a25c2a1410",
    "MOV [0x10142a5c],AL"
  ],
  [
    "1002198f",
    "a25d2a1410",
    "MOV [0x10142a5d],AL"
  ],
  [
    "10021994",
    "a3782a1410",
    "MOV [0x10142a78],EAX"
  ],
  [
    "10021999",
    "a37c2a1410",
    "MOV [0x10142a7c],EAX"
  ],
  [
    "1002199e",
    "a3802a1410",
    "MOV [0x10142a80],EAX"
  ],
  [
    "100219a3",
    "e80904feff",
    "CALL 0x10001db1"
  ],
  [
    "100219a8",
    "6870270e10",
    "PUSH 0x100e2770"
  ],
  [
    "100219ad",
    "e81e590800",
    "CALL 0x100a72d0"
  ],
  [
    "100219b2",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "100219b5",
    "b8582a1410",
    "MOV EAX,0x10142a58"
  ],
  [
    "100219ba",
    "c3",
    "RET"
  ],
  [
    "100224f0",
    "56",
    "PUSH ESI"
  ],
  [
    "100224f1",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100224f3",
    "8b4e20",
    "MOV ECX,dword ptr [ESI + 0x20]"
  ],
  [
    "100224f6",
    "85c9",
    "TEST ECX,ECX"
  ],
  [
    "100224f8",
    "744b",
    "JZ 0x10022545"
  ],
  [
    "100224fa",
    "57",
    "PUSH EDI"
  ],
  [
    "100224fb",
    "8b7c240c",
    "MOV EDI,dword ptr [ESP + 0xc]"
  ],
  [
    "100224ff",
    "85ff",
    "TEST EDI,EDI"
  ],
  [
    "10022501",
    "7441",
    "JZ 0x10022544"
  ],
  [
    "10022503",
    "80791001",
    "CMP byte ptr [ECX + 0x10],0x1"
  ],
  [
    "10022507",
    "750a",
    "JNZ 0x10022513"
  ],
  [
    "10022509",
    "6828401410",
    "PUSH 0x10144028"
  ],
  [
    "1002250e",
    "e83444feff",
    "CALL 0x10006947"
  ],
  [
    "10022513",
    "68fa000000",
    "PUSH 0xfa"
  ],
  [
    "10022518",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1002251a",
    "68f83e1410",
    "PUSH 0x10143ef8"
  ],
  [
    "1002251f",
    "e85c540800",
    "CALL 0x100a7980"
  ],
  [
    "10022524",
    "68f9000000",
    "PUSH 0xf9"
  ],
  [
    "10022529",
    "57",
    "PUSH EDI"
  ],
  [
    "1002252a",
    "68f83e1410",
    "PUSH 0x10143ef8"
  ],
  [
    "1002252f",
    "e84c830800",
    "CALL 0x100aa880"
  ],
  [
    "10022534",
    "8b4e20",
    "MOV ECX,dword ptr [ESI + 0x20]"
  ],
  [
    "10022537",
    "83c418",
    "ADD ESP,0x18"
  ],
  [
    "1002253a",
    "68f83e1410",
    "PUSH 0x10143ef8"
  ],
  [
    "1002253f",
    "e84052feff",
    "CALL 0x10007784"
  ],
  [
    "10022544",
    "5f",
    "POP EDI"
  ],
  [
    "10022545",
    "5e",
    "POP ESI"
  ],
  [
    "10022546",
    "c20400",
    "RET 0x4"
  ],
  [
    "10022590",
    "56",
    "PUSH ESI"
  ],
  [
    "10022591",
    "8b742414",
    "MOV ESI,dword ptr [ESP + 0x14]"
  ],
  [
    "10022595",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "10022597",
    "7506",
    "JNZ 0x1002259f"
  ],
  [
    "10022599",
    "32c0",
    "XOR AL,AL"
  ],
  [
    "1002259b",
    "5e",
    "POP ESI"
  ],
  [
    "1002259c",
    "c21c00",
    "RET 0x1c"
  ],
  [
    "1002259f",
    "e87846feff",
    "CALL 0x10006c1c"
  ],
  [
    "100225a4",
    "3bf0",
    "CMP ESI,EAX"
  ],
  [
    "100225a6",
    "75f1",
    "JNZ 0x10022599"
  ],
  [
    "100225a8",
    "55",
    "PUSH EBP"
  ],
  [
    "100225a9",
    "8b6c2410",
    "MOV EBP,dword ptr [ESP + 0x10]"
  ],
  [
    "100225ad",
    "85ed",
    "TEST EBP,EBP"
  ],
  [
    "100225af",
    "7507",
    "JNZ 0x100225b8"
  ],
  [
    "100225b1",
    "5d",
    "POP EBP"
  ],
  [
    "100225b2",
    "32c0",
    "XOR AL,AL"
  ],
  [
    "100225b4",
    "5e",
    "POP ESI"
  ],
  [
    "100225b5",
    "c21c00",
    "RET 0x1c"
  ],
  [
    "100225b8",
    "8bc5",
    "MOV EAX,EBP"
  ],
  [
    "100225ba",
    "8d5001",
    "LEA EDX,[EAX + 0x1]"
  ],
  [
    "100225bd",
    "8d4900",
    "LEA ECX,[ECX]"
  ],
  [
    "100225c0",
    "8a08",
    "MOV CL,byte ptr [EAX]"
  ],
  [
    "100225c2",
    "83c001",
    "ADD EAX,0x1"
  ],
  [
    "100225c5",
    "84c9",
    "TEST CL,CL"
  ],
  [
    "100225c7",
    "75f7",
    "JNZ 0x100225c0"
  ],
  [
    "100225c9",
    "53",
    "PUSH EBX"
  ],
  [
    "100225ca",
    "8b5c2418",
    "MOV EBX,dword ptr [ESP + 0x18]"
  ],
  [
    "100225ce",
    "2bc2",
    "SUB EAX,EDX"
  ],
  [
    "100225d0",
    "85db",
    "TEST EBX,EBX"
  ],
  [
    "100225d2",
    "57",
    "PUSH EDI"
  ],
  [
    "100225d3",
    "7418",
    "JZ 0x100225ed"
  ],
  [
    "100225d5",
    "8bcb",
    "MOV ECX,EBX"
  ],
  [
    "100225d7",
    "8d7101",
    "LEA ESI,[ECX + 0x1]"
  ],
  [
    "100225da",
    "8d9b00000000",
    "LEA EBX,[EBX]"
  ],
  [
    "100225e0",
    "8a11",
    "MOV DL,byte ptr [ECX]"
  ],
  [
    "100225e2",
    "83c101",
    "ADD ECX,0x1"
  ],
  [
    "100225e5",
    "84d2",
    "TEST DL,DL"
  ],
  [
    "100225e7",
    "75f7",
    "JNZ 0x100225e0"
  ],
  [
    "100225e9",
    "2bce",
    "SUB ECX,ESI"
  ],
  [
    "100225eb",
    "03c1",
    "ADD EAX,ECX"
  ],
  [
    "100225ed",
    "8b7c2424",
    "MOV EDI,dword ptr [ESP + 0x24]"
  ],
  [
    "100225f1",
    "85ff",
    "TEST EDI,EDI"
  ],
  [
    "100225f3",
    "7418",
    "JZ 0x1002260d"
  ],
  [
    "100225f5",
    "8bcf",
    "MOV ECX,EDI"
  ],
  [
    "100225f7",
    "8d7101",
    "LEA ESI,[ECX + 0x1]"
  ],
  [
    "100225fa",
    "8d9b00000000",
    "LEA EBX,[EBX]"
  ],
  [
    "10022600",
    "8a11",
    "MOV DL,byte ptr [ECX]"
  ],
  [
    "10022602",
    "83c101",
    "ADD ECX,0x1"
  ],
  [
    "10022605",
    "84d2",
    "TEST DL,DL"
  ],
  [
    "10022607",
    "75f7",
    "JNZ 0x10022600"
  ],
  [
    "10022609",
    "2bce",
    "SUB ECX,ESI"
  ],
  [
    "1002260b",
    "03c1",
    "ADD EAX,ECX"
  ],
  [
    "1002260d",
    "0500020000",
    "ADD EAX,0x200"
  ],
  [
    "10022612",
    "50",
    "PUSH EAX"
  ],
  [
    "10022613",
    "e8de840800",
    "CALL 0x100aaaf6"
  ],
  [
    "10022618",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "1002261b",
    "85ff",
    "TEST EDI,EDI"
  ],
  [
    "1002261d",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "1002261f",
    "7432",
    "JZ 0x10022653"
  ],
  [
    "10022621",
    "85db",
    "TEST EBX,EBX"
  ],
  [
    "10022623",
    "57",
    "PUSH EDI"
  ],
  [
    "10022624",
    "7516",
    "JNZ 0x1002263c"
  ],
  [
    "10022626",
    "8b44242c",
    "MOV EAX,dword ptr [ESP + 0x2c]"
  ],
  [
    "1002262a",
    "50",
    "PUSH EAX"
  ],
  [
    "1002262b",
    "55",
    "PUSH EBP"
  ],
  [
    "1002262c",
    "6804710e10",
    "PUSH 0x100e7104"
  ],
  [
    "10022631",
    "56",
    "PUSH ESI"
  ],
  [
    "10022632",
    "e8fd7b0800",
    "CALL 0x100aa234"
  ],
  [
    "10022637",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "1002263a",
    "eb3c",
    "JMP 0x10022678"
  ],
  [
    "1002263c",
    "8b4c242c",
    "MOV ECX,dword ptr [ESP + 0x2c]"
  ],
  [
    "10022640",
    "51",
    "PUSH ECX"
  ],
  [
    "10022641",
    "53",
    "PUSH EBX"
  ],
  [
    "10022642",
    "55",
    "PUSH EBP"
  ],
  [
    "10022643",
    "68e4700e10",
    "PUSH 0x100e70e4"
  ],
  [
    "10022648",
    "56",
    "PUSH ESI"
  ],
  [
    "10022649",
    "e8e67b0800",
    "CALL 0x100aa234"
  ],
  [
    "1002264e",
    "83c418",
    "ADD ESP,0x18"
  ],
  [
    "10022651",
    "eb25",
    "JMP 0x10022678"
  ],
  [
    "10022653",
    "85db",
    "TEST EBX,EBX"
  ],
  [
    "10022655",
    "7511",
    "JNZ 0x10022668"
  ],
  [
    "10022657",
    "55",
    "PUSH EBP"
  ],
  [
    "10022658",
    "68e0700e10",
    "PUSH 0x100e70e0"
  ],
  [
    "1002265d",
    "56",
    "PUSH ESI"
  ],
  [
    "1002265e",
    "e8d17b0800",
    "CALL 0x100aa234"
  ],
  [
    "10022663",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "10022666",
    "eb10",
    "JMP 0x10022678"
  ],
  [
    "10022668",
    "53",
    "PUSH EBX"
  ],
  [
    "10022669",
    "55",
    "PUSH EBP"
  ],
  [
    "1002266a",
    "68d0700e10",
    "PUSH 0x100e70d0"
  ],
  [
    "1002266f",
    "56",
    "PUSH ESI"
  ],
  [
    "10022670",
    "e8bf7b0800",
    "CALL 0x100aa234"
  ],
  [
    "10022675",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "10022678",
    "56",
    "PUSH ESI"
  ],
  [
    "10022679",
    "e89e45feff",
    "CALL 0x10006c1c"
  ],
  [
    "1002267e",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "10022680",
    "e8a8e9fdff",
    "CALL 0x1000102d"
  ],
  [
    "10022685",
    "56",
    "PUSH ESI"
  ],
  [
    "10022686",
    "e819830800",
    "CALL 0x100aa9a4"
  ],
  [
    "1002268b",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "1002268e",
    "5f",
    "POP EDI"
  ],
  [
    "1002268f",
    "5b",
    "POP EBX"
  ],
  [
    "10022690",
    "5d",
    "POP EBP"
  ],
  [
    "10022691",
    "b001",
    "MOV AL,0x1"
  ],
  [
    "10022693",
    "5e",
    "POP ESI"
  ],
  [
    "10022694",
    "c21c00",
    "RET 0x1c"
  ],
  [
    "100226a0",
    "53",
    "PUSH EBX"
  ],
  [
    "100226a1",
    "56",
    "PUSH ESI"
  ],
  [
    "100226a2",
    "57",
    "PUSH EDI"
  ],
  [
    "100226a3",
    "8bf9",
    "MOV EDI,ECX"
  ],
  [
    "100226a5",
    "8b7720",
    "MOV ESI,dword ptr [EDI + 0x20]"
  ],
  [
    "100226a8",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100226aa",
    "3bf3",
    "CMP ESI,EBX"
  ],
  [
    "100226ac",
    "742a",
    "JZ 0x100226d8"
  ],
  [
    "100226ae",
    "8b06",
    "MOV EAX,dword ptr [ESI]"
  ],
  [
    "100226b0",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100226b2",
    "741b",
    "JZ 0x100226cf"
  ],
  [
    "100226b4",
    "50",
    "PUSH EAX"
  ],
  [
    "100226b5",
    "e8f403feff",
    "CALL 0x10002aae"
  ],
  [
    "100226ba",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100226bc",
    "e851fafdff",
    "CALL 0x10002112"
  ],
  [
    "100226c1",
    "891e",
    "MOV dword ptr [ESI],EBX"
  ],
  [
    "100226c3",
    "895e04",
    "MOV dword ptr [ESI + 0x4],EBX"
  ],
  [
    "100226c6",
    "895e08",
    "MOV dword ptr [ESI + 0x8],EBX"
  ],
  [
    "100226c9",
    "895e0c",
    "MOV dword ptr [ESI + 0xc],EBX"
  ],
  [
    "100226cc",
    "885e10",
    "MOV byte ptr [ESI + 0x10],BL"
  ],
  [
    "100226cf",
    "56",
    "PUSH ESI"
  ],
  [
    "100226d0",
    "e85a7b0800",
    "CALL 0x100aa22f"
  ],
  [
    "100226d5",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "100226d8",
    "8b7724",
    "MOV ESI,dword ptr [EDI + 0x24]"
  ],
  [
    "100226db",
    "3bf3",
    "CMP ESI,EBX"
  ],
  [
    "100226dd",
    "7424",
    "JZ 0x10022703"
  ],
  [
    "100226df",
    "8b06",
    "MOV EAX,dword ptr [ESI]"
  ],
  [
    "100226e1",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100226e3",
    "7415",
    "JZ 0x100226fa"
  ],
  [
    "100226e5",
    "50",
    "PUSH EAX"
  ],
  [
    "100226e6",
    "e8c303feff",
    "CALL 0x10002aae"
  ],
  [
    "100226eb",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100226ed",
    "e820fafdff",
    "CALL 0x10002112"
  ],
  [
    "100226f2",
    "891e",
    "MOV dword ptr [ESI],EBX"
  ],
  [
    "100226f4",
    "895e04",
    "MOV dword ptr [ESI + 0x4],EBX"
  ],
  [
    "100226f7",
    "895e08",
    "MOV dword ptr [ESI + 0x8],EBX"
  ],
  [
    "100226fa",
    "56",
    "PUSH ESI"
  ],
  [
    "100226fb",
    "e82f7b0800",
    "CALL 0x100aa22f"
  ],
  [
    "10022700",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "10022703",
    "8b7728",
    "MOV ESI,dword ptr [EDI + 0x28]"
  ],
  [
    "10022706",
    "3bf3",
    "CMP ESI,EBX"
  ],
  [
    "10022708",
    "7424",
    "JZ 0x1002272e"
  ],
  [
    "1002270a",
    "8b06",
    "MOV EAX,dword ptr [ESI]"
  ],
  [
    "1002270c",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "1002270e",
    "7415",
    "JZ 0x10022725"
  ],
  [
    "10022710",
    "50",
    "PUSH EAX"
  ],
  [
    "10022711",
    "e89803feff",
    "CALL 0x10002aae"
  ],
  [
    "10022716",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "10022718",
    "e8f5f9fdff",
    "CALL 0x10002112"
  ],
  [
    "1002271d",
    "891e",
    "MOV dword ptr [ESI],EBX"
  ],
  [
    "1002271f",
    "895e04",
    "MOV dword ptr [ESI + 0x4],EBX"
  ],
  [
    "10022722",
    "895e08",
    "MOV dword ptr [ESI + 0x8],EBX"
  ],
  [
    "10022725",
    "56",
    "PUSH ESI"
  ],
  [
    "10022726",
    "e8047b0800",
    "CALL 0x100aa22f"
  ],
  [
    "1002272b",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "1002272e",
    "68f62d0010",
    "PUSH 0x10002df6"
  ],
  [
    "10022733",
    "891f",
    "MOV dword ptr [EDI],EBX"
  ],
  [
    "10022735",
    "885f04",
    "MOV byte ptr [EDI + 0x4],BL"
  ],
  [
    "10022738",
    "885f05",
    "MOV byte ptr [EDI + 0x5],BL"
  ],
  [
    "1002273b",
    "895f20",
    "MOV dword ptr [EDI + 0x20],EBX"
  ],
  [
    "1002273e",
    "895f24",
    "MOV dword ptr [EDI + 0x24],EBX"
  ],
  [
    "10022741",
    "895f28",
    "MOV dword ptr [EDI + 0x28],EBX"
  ],
  [
    "10022744",
    "e86b61feff",
    "CALL 0x100088b4"
  ],
  [
    "10022749",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1002274b",
    "e8d1f4fdff",
    "CALL 0x10001c21"
  ],
  [
    "10022750",
    "5f",
    "POP EDI"
  ],
  [
    "10022751",
    "5e",
    "POP ESI"
  ],
  [
    "10022752",
    "5b",
    "POP EBX"
  ],
  [
    "10022753",
    "c3",
    "RET"
  ],
  [
    "10022760",
    "53",
    "PUSH EBX"
  ],
  [
    "10022761",
    "56",
    "PUSH ESI"
  ],
  [
    "10022762",
    "57",
    "PUSH EDI"
  ],
  [
    "10022763",
    "8bf9",
    "MOV EDI,ECX"
  ],
  [
    "10022765",
    "e85a0bfeff",
    "CALL 0x100032c4"
  ],
  [
    "1002276a",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "1002276c",
    "6a14",
    "PUSH 0x14"
  ],
  [
    "1002276e",
    "891f",
    "MOV dword ptr [EDI],EBX"
  ],
  [
    "10022770",
    "885f04",
    "MOV byte ptr [EDI + 0x4],BL"
  ],
  [
    "10022773",
    "885f05",
    "MOV byte ptr [EDI + 0x5],BL"
  ],
  [
    "10022776",
    "895f20",
    "MOV dword ptr [EDI + 0x20],EBX"
  ],
  [
    "10022779",
    "895f24",
    "MOV dword ptr [EDI + 0x24],EBX"
  ],
  [
    "1002277c",
    "895f28",
    "MOV dword ptr [EDI + 0x28],EBX"
  ],
  [
    "1002277f",
    "e84e840800",
    "CALL 0x100aabd2"
  ],
  [
    "10022784",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "10022786",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "10022789",
    "3bf3",
    "CMP ESI,EBX"
  ],
  [
    "1002278b",
    "7439",
    "JZ 0x100227c6"
  ],
  [
    "1002278d",
    "68d4300000",
    "PUSH 0x30d4"
  ],
  [
    "10022792",
    "53",
    "PUSH EBX"
  ],
  [
    "10022793",
    "891e",
    "MOV dword ptr [ESI],EBX"
  ],
  [
    "10022795",
    "895e04",
    "MOV dword ptr [ESI + 0x4],EBX"
  ],
  [
    "10022798",
    "895e08",
    "MOV dword ptr [ESI + 0x8],EBX"
  ],
  [
    "1002279b",
    "895e0c",
    "MOV dword ptr [ESI + 0xc],EBX"
  ],
  [
    "1002279e",
    "885e10",
    "MOV byte ptr [ESI + 0x10],BL"
  ],
  [
    "100227a1",
    "e80803feff",
    "CALL 0x10002aae"
  ],
  [
    "100227a6",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100227a8",
    "e88619feff",
    "CALL 0x10004133"
  ],
  [
    "100227ad",
    "385e10",
    "CMP byte ptr [ESI + 0x10],BL"
  ],
  [
    "100227b0",
    "8906",
    "MOV dword ptr [ESI],EAX"
  ],
  [
    "100227b2",
    "7406",
    "JZ 0x100227ba"
  ],
  [
    "100227b4",
    "8b4604",
    "MOV EAX,dword ptr [ESI + 0x4]"
  ],
  [
    "100227b7",
    "89460c",
    "MOV dword ptr [ESI + 0xc],EAX"
  ],
  [
    "100227ba",
    "c7460432000000",
    "MOV dword ptr [ESI + 0x4],0x32"
  ],
  [
    "100227c1",
    "885e10",
    "MOV byte ptr [ESI + 0x10],BL"
  ],
  [
    "100227c4",
    "eb02",
    "JMP 0x100227c8"
  ],
  [
    "100227c6",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100227c8",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "100227ca",
    "897720",
    "MOV dword ptr [EDI + 0x20],ESI"
  ],
  [
    "100227cd",
    "e800840800",
    "CALL 0x100aabd2"
  ],
  [
    "100227d2",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "100227d5",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100227d7",
    "740a",
    "JZ 0x100227e3"
  ],
  [
    "100227d9",
    "8918",
    "MOV dword ptr [EAX],EBX"
  ],
  [
    "100227db",
    "895804",
    "MOV dword ptr [EAX + 0x4],EBX"
  ],
  [
    "100227de",
    "895808",
    "MOV dword ptr [EAX + 0x8],EBX"
  ],
  [
    "100227e1",
    "eb02",
    "JMP 0x100227e5"
  ],
  [
    "100227e3",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100227e5",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "100227e7",
    "894724",
    "MOV dword ptr [EDI + 0x24],EAX"
  ],
  [
    "100227ea",
    "e8e3830800",
    "CALL 0x100aabd2"
  ],
  [
    "100227ef",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "100227f2",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100227f4",
    "740a",
    "JZ 0x10022800"
  ],
  [
    "100227f6",
    "8918",
    "MOV dword ptr [EAX],EBX"
  ],
  [
    "100227f8",
    "895804",
    "MOV dword ptr [EAX + 0x4],EBX"
  ],
  [
    "100227fb",
    "895808",
    "MOV dword ptr [EAX + 0x8],EBX"
  ],
  [
    "100227fe",
    "eb02",
    "JMP 0x10022802"
  ],
  [
    "10022800",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "10022802",
    "57",
    "PUSH EDI"
  ],
  [
    "10022803",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "10022805",
    "68f62d0010",
    "PUSH 0x10002df6"
  ],
  [
    "1002280a",
    "894728",
    "MOV dword ptr [EDI + 0x28],EAX"
  ],
  [
    "1002280d",
    "e8a260feff",
    "CALL 0x100088b4"
  ],
  [
    "10022812",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "10022814",
    "e89354feff",
    "CALL 0x10007cac"
  ],
  [
    "10022819",
    "5f",
    "POP EDI"
  ],
  [
    "1002281a",
    "5e",
    "POP ESI"
  ],
  [
    "1002281b",
    "5b",
    "POP EBX"
  ],
  [
    "1002281c",
    "c3",
    "RET"
  ],
  [
    "10023050",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "10023052",
    "33d2",
    "XOR EDX,EDX"
  ],
  [
    "10023054",
    "385010",
    "CMP byte ptr [EAX + 0x10],DL"
  ],
  [
    "10023057",
    "7511",
    "JNZ 0x1002306a"
  ],
  [
    "10023059",
    "3910",
    "CMP dword ptr [EAX],EDX"
  ],
  [
    "1002305b",
    "7408",
    "JZ 0x10023065"
  ],
  [
    "1002305d",
    "8b4808",
    "MOV ECX,dword ptr [EAX + 0x8]"
  ],
  [
    "10023060",
    "3b480c",
    "CMP ECX,dword ptr [EAX + 0xc]"
  ],
  [
    "10023063",
    "7505",
    "JNZ 0x1002306a"
  ],
  [
    "10023065",
    "32c0",
    "XOR AL,AL"
  ],
  [
    "10023067",
    "c20400",
    "RET 0x4"
  ],
  [
    "1002306a",
    "56",
    "PUSH ESI"
  ],
  [
    "1002306b",
    "8b7008",
    "MOV ESI,dword ptr [EAX + 0x8]"
  ],
  [
    "1002306e",
    "69f6fa000000",
    "IMUL ESI,ESI,0xfa"
  ],
  [
    "10023074",
    "0330",
    "ADD ESI,dword ptr [EAX]"
  ],
  [
    "10023076",
    "57",
    "PUSH EDI"
  ],
  [
    "10023077",
    "8b7c240c",
    "MOV EDI,dword ptr [ESP + 0xc]"
  ],
  [
    "1002307b",
    "b93e000000",
    "MOV ECX,0x3e"
  ],
  [
    "10023080",
    "f3a5",
    "MOVSD.REP ES:EDI,ESI"
  ],
  [
    "10023082",
    "66a5",
    "MOVSW ES:EDI,ESI"
  ],
  [
    "10023084",
    "83400801",
    "ADD dword ptr [EAX + 0x8],0x1"
  ],
  [
    "10023088",
    "8b4808",
    "MOV ECX,dword ptr [EAX + 0x8]"
  ],
  [
    "1002308b",
    "3b4804",
    "CMP ECX,dword ptr [EAX + 0x4]"
  ],
  [
    "1002308e",
    "5f",
    "POP EDI"
  ],
  [
    "1002308f",
    "5e",
    "POP ESI"
  ],
  [
    "10023090",
    "7503",
    "JNZ 0x10023095"
  ],
  [
    "10023092",
    "895008",
    "MOV dword ptr [EAX + 0x8],EDX"
  ],
  [
    "10023095",
    "885010",
    "MOV byte ptr [EAX + 0x10],DL"
  ],
  [
    "10023098",
    "b001",
    "MOV AL,0x1"
  ],
  [
    "1002309a",
    "c20400",
    "RET 0x4"
  ],
  [
    "100233e0",
    "80791000",
    "CMP byte ptr [ECX + 0x10],0x0"
  ],
  [
    "100233e4",
    "7405",
    "JZ 0x100233eb"
  ],
  [
    "100233e6",
    "32c0",
    "XOR AL,AL"
  ],
  [
    "100233e8",
    "c20400",
    "RET 0x4"
  ],
  [
    "100233eb",
    "8b410c",
    "MOV EAX,dword ptr [ECX + 0xc]"
  ],
  [
    "100233ee",
    "8d5001",
    "LEA EDX,[EAX + 0x1]"
  ],
  [
    "100233f1",
    "3b5104",
    "CMP EDX,dword ptr [ECX + 0x4]"
  ],
  [
    "100233f4",
    "89510c",
    "MOV dword ptr [ECX + 0xc],EDX"
  ],
  [
    "100233f7",
    "7507",
    "JNZ 0x10023400"
  ],
  [
    "100233f9",
    "c7410c00000000",
    "MOV dword ptr [ECX + 0xc],0x0"
  ],
  [
    "10023400",
    "8b510c",
    "MOV EDX,dword ptr [ECX + 0xc]"
  ],
  [
    "10023403",
    "3b5108",
    "CMP EDX,dword ptr [ECX + 0x8]"
  ],
  [
    "10023406",
    "56",
    "PUSH ESI"
  ],
  [
    "10023407",
    "8b742408",
    "MOV ESI,dword ptr [ESP + 0x8]"
  ],
  [
    "1002340b",
    "0f94c2",
    "SETZ DL"
  ],
  [
    "1002340e",
    "69c0fa000000",
    "IMUL EAX,EAX,0xfa"
  ],
  [
    "10023414",
    "0301",
    "ADD EAX,dword ptr [ECX]"
  ],
  [
    "10023416",
    "57",
    "PUSH EDI"
  ],
  [
    "10023417",
    "885110",
    "MOV byte ptr [ECX + 0x10],DL"
  ],
  [
    "1002341a",
    "8bf8",
    "MOV EDI,EAX"
  ],
  [
    "1002341c",
    "b93e000000",
    "MOV ECX,0x3e"
  ],
  [
    "10023421",
    "f3a5",
    "MOVSD.REP ES:EDI,ESI"
  ],
  [
    "10023423",
    "66a5",
    "MOVSW ES:EDI,ESI"
  ],
  [
    "10023425",
    "5f",
    "POP EDI"
  ],
  [
    "10023426",
    "b001",
    "MOV AL,0x1"
  ],
  [
    "10023428",
    "5e",
    "POP ESI"
  ],
  [
    "10023429",
    "c20400",
    "RET 0x4"
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
    "1003d120",
    "53",
    "PUSH EBX"
  ],
  [
    "1003d121",
    "56",
    "PUSH ESI"
  ],
  [
    "1003d122",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "1003d124",
    "c7460400000000",
    "MOV dword ptr [ESI + 0x4],0x0"
  ],
  [
    "1003d12b",
    "c70600000000",
    "MOV dword ptr [ESI],0x0"
  ],
  [
    "1003d131",
    "c7460800100000",
    "MOV dword ptr [ESI + 0x8],0x1000"
  ],
  [
    "1003d138",
    "c7460c00000000",
    "MOV dword ptr [ESI + 0xc],0x0"
  ],
  [
    "1003d13f",
    "8b1d4cb02f10",
    "MOV EBX,dword ptr [0x102fb04c]"
  ],
  [
    "1003d145",
    "57",
    "PUSH EDI"
  ],
  [
    "1003d146",
    "8bcb",
    "MOV ECX,EBX"
  ],
  [
    "1003d148",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "1003d14a",
    "85c9",
    "TEST ECX,ECX"
  ],
  [
    "1003d14c",
    "7424",
    "JZ 0x1003d172"
  ],
  [
    "1003d14e",
    "8bff",
    "MOV EDI,EDI"
  ],
  [
    "1003d150",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "1003d152",
    "d1e8",
    "SHR EAX,0x1"
  ],
  [
    "1003d154",
    "8d1438",
    "LEA EDX,[EAX + EDI*0x1]"
  ],
  [
    "1003d157",
    "39349518821410",
    "CMP dword ptr [EDX*0x4 + 0x10148218],ESI"
  ],
  [
    "1003d15e",
    "7604",
    "JBE 0x1003d164"
  ],
  [
    "1003d160",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1003d162",
    "eb0a",
    "JMP 0x1003d16e"
  ],
  [
    "1003d164",
    "83cfff",
    "OR EDI,0xffffffff"
  ],
  [
    "1003d167",
    "2bf8",
    "SUB EDI,EAX"
  ],
  [
    "1003d169",
    "03cf",
    "ADD ECX,EDI"
  ],
  [
    "1003d16b",
    "8d7a01",
    "LEA EDI,[EDX + 0x1]"
  ],
  [
    "1003d16e",
    "85c9",
    "TEST ECX,ECX"
  ],
  [
    "1003d170",
    "75de",
    "JNZ 0x1003d150"
  ],
  [
    "1003d172",
    "3bfb",
    "CMP EDI,EBX"
  ],
  [
    "1003d174",
    "7325",
    "JNC 0x1003d19b"
  ],
  [
    "1003d176",
    "2bdf",
    "SUB EBX,EDI"
  ],
  [
    "1003d178",
    "03db",
    "ADD EBX,EBX"
  ],
  [
    "1003d17a",
    "03db",
    "ADD EBX,EBX"
  ],
  [
    "1003d17c",
    "53",
    "PUSH EBX"
  ],
  [
    "1003d17d",
    "8d04bd18821410",
    "LEA EAX,[EDI*0x4 + 0x10148218]"
  ],
  [
    "1003d184",
    "50",
    "PUSH EAX"
  ],
  [
    "1003d185",
    "8d0cbd1c821410",
    "LEA ECX,[EDI*0x4 + 0x1014821c]"
  ],
  [
    "1003d18c",
    "51",
    "PUSH ECX"
  ],
  [
    "1003d18d",
    "e8ceb20600",
    "CALL 0x100a8460"
  ],
  [
    "1003d192",
    "8b1d4cb02f10",
    "MOV EBX,dword ptr [0x102fb04c]"
  ],
  [
    "1003d198",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "1003d19b",
    "83c301",
    "ADD EBX,0x1"
  ],
  [
    "1003d19e",
    "8934bd18821410",
    "MOV dword ptr [EDI*0x4 + 0x10148218],ESI"
  ],
  [
    "1003d1a5",
    "891d4cb02f10",
    "MOV dword ptr [0x102fb04c],EBX"
  ],
  [
    "1003d1ab",
    "8b5608",
    "MOV EDX,dword ptr [ESI + 0x8]"
  ],
  [
    "1003d1ae",
    "c7461400000000",
    "MOV dword ptr [ESI + 0x14],0x0"
  ],
  [
    "1003d1b5",
    "8b049514421410",
    "MOV EAX,dword ptr [EDX*0x4 + 0x10144214]"
  ],
  [
    "1003d1bc",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1003d1be",
    "894610",
    "MOV dword ptr [ESI + 0x10],EAX"
  ],
  [
    "1003d1c1",
    "7411",
    "JZ 0x1003d1d4"
  ],
  [
    "1003d1c3",
    "897014",
    "MOV dword ptr [EAX + 0x14],ESI"
  ],
  [
    "1003d1c6",
    "8b4608",
    "MOV EAX,dword ptr [ESI + 0x8]"
  ],
  [
    "1003d1c9",
    "5f",
    "POP EDI"
  ],
  [
    "1003d1ca",
    "89348514421410",
    "MOV dword ptr [EAX*0x4 + 0x10144214],ESI"
  ],
  [
    "1003d1d1",
    "5e",
    "POP ESI"
  ],
  [
    "1003d1d2",
    "5b",
    "POP EBX"
  ],
  [
    "1003d1d3",
    "c3",
    "RET"
  ],
  [
    "1003d1d4",
    "8bca",
    "MOV ECX,EDX"
  ],
  [
    "1003d1d6",
    "5f",
    "POP EDI"
  ],
  [
    "1003d1d7",
    "89348d14421410",
    "MOV dword ptr [ECX*0x4 + 0x10144214],ESI"
  ],
  [
    "1003d1de",
    "5e",
    "POP ESI"
  ],
  [
    "1003d1df",
    "5b",
    "POP EBX"
  ],
  [
    "1003d1e0",
    "c3",
    "RET"
  ],
  [
    "1003d1f0",
    "56",
    "PUSH ESI"
  ],
  [
    "1003d1f1",
    "8b3580962f10",
    "MOV ESI,dword ptr [0x102f9680]"
  ],
  [
    "1003d1f7",
    "57",
    "PUSH EDI"
  ],
  [
    "1003d1f8",
    "8b7c240c",
    "MOV EDI,dword ptr [ESP + 0xc]"
  ],
  [
    "1003d1fc",
    "81c70f040000",
    "ADD EDI,0x40f"
  ],
  [
    "1003d202",
    "c1ef0a",
    "SHR EDI,0xa"
  ],
  [
    "1003d205",
    "81ff00100000",
    "CMP EDI,0x1000"
  ],
  [
    "1003d20b",
    "8bcf",
    "MOV ECX,EDI"
  ],
  [
    "1003d20d",
    "771a",
    "JA 0x1003d229"
  ],
  [
    "1003d20f",
    "8d04bd14421410",
    "LEA EAX,[EDI*0x4 + 0x10144214]"
  ],
  [
    "1003d216",
    "833800",
    "CMP dword ptr [EAX],0x0"
  ],
  [
    "1003d219",
    "752f",
    "JNZ 0x1003d24a"
  ],
  [
    "1003d21b",
    "83c101",
    "ADD ECX,0x1"
  ],
  [
    "1003d21e",
    "83c004",
    "ADD EAX,0x4"
  ],
  [
    "1003d221",
    "81f900100000",
    "CMP ECX,0x1000"
  ],
  [
    "1003d227",
    "76ed",
    "JBE 0x1003d216"
  ],
  [
    "1003d229",
    "6a04",
    "PUSH 0x4"
  ],
  [
    "1003d22b",
    "6800301000",
    "PUSH 0x103000"
  ],
  [
    "1003d230",
    "6800004000",
    "PUSH 0x400000"
  ],
  [
    "1003d235",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1003d237",
    "ffd6",
    "CALL ESI"
  ],
  [
    "1003d239",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1003d23b",
    "0f84a2000000",
    "JZ 0x1003d2e3"
  ],
  [
    "1003d241",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1003d243",
    "e861a8fcff",
    "CALL 0x10007aa9"
  ],
  [
    "1003d248",
    "ebbb",
    "JMP 0x1003d205"
  ],
  [
    "1003d24a",
    "8b148d14421410",
    "MOV EDX,dword ptr [ECX*0x4 + 0x10144214]"
  ],
  [
    "1003d251",
    "8b7210",
    "MOV ESI,dword ptr [EDX + 0x10]"
  ],
  [
    "1003d254",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "1003d256",
    "8d4210",
    "LEA EAX,[EDX + 0x10]"
  ],
  [
    "1003d259",
    "55",
    "PUSH EBP"
  ],
  [
    "1003d25a",
    "7406",
    "JZ 0x1003d262"
  ],
  [
    "1003d25c",
    "8b6a14",
    "MOV EBP,dword ptr [EDX + 0x14]"
  ],
  [
    "1003d25f",
    "896e14",
    "MOV dword ptr [ESI + 0x14],EBP"
  ],
  [
    "1003d262",
    "8b7214",
    "MOV ESI,dword ptr [EDX + 0x14]"
  ],
  [
    "1003d265",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "1003d267",
    "7405",
    "JZ 0x1003d26e"
  ],
  [
    "1003d269",
    "8b28",
    "MOV EBP,dword ptr [EAX]"
  ],
  [
    "1003d26b",
    "896e10",
    "MOV dword ptr [ESI + 0x10],EBP"
  ],
  [
    "1003d26e",
    "8b7208",
    "MOV ESI,dword ptr [EDX + 0x8]"
  ],
  [
    "1003d271",
    "3914b514421410",
    "CMP dword ptr [ESI*0x4 + 0x10144214],EDX"
  ],
  [
    "1003d278",
    "7509",
    "JNZ 0x1003d283"
  ],
  [
    "1003d27a",
    "8b28",
    "MOV EBP,dword ptr [EAX]"
  ],
  [
    "1003d27c",
    "892cb514421410",
    "MOV dword ptr [ESI*0x4 + 0x10144214],EBP"
  ],
  [
    "1003d283",
    "3bf9",
    "CMP EDI,ECX"
  ],
  [
    "1003d285",
    "5d",
    "POP EBP"
  ],
  [
    "1003d286",
    "744f",
    "JZ 0x1003d2d7"
  ],
  [
    "1003d288",
    "8bcf",
    "MOV ECX,EDI"
  ],
  [
    "1003d28a",
    "c1e10a",
    "SHL ECX,0xa"
  ],
  [
    "1003d28d",
    "03ca",
    "ADD ECX,EDX"
  ],
  [
    "1003d28f",
    "c7410c00000000",
    "MOV dword ptr [ECX + 0xc],0x0"
  ],
  [
    "1003d296",
    "8b7208",
    "MOV ESI,dword ptr [EDX + 0x8]"
  ],
  [
    "1003d299",
    "2bf7",
    "SUB ESI,EDI"
  ],
  [
    "1003d29b",
    "897108",
    "MOV dword ptr [ECX + 0x8],ESI"
  ],
  [
    "1003d29e",
    "8b7204",
    "MOV ESI,dword ptr [EDX + 0x4]"
  ],
  [
    "1003d2a1",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "1003d2a3",
    "897104",
    "MOV dword ptr [ECX + 0x4],ESI"
  ],
  [
    "1003d2a6",
    "8911",
    "MOV dword ptr [ECX],EDX"
  ],
  [
    "1003d2a8",
    "7402",
    "JZ 0x1003d2ac"
  ],
  [
    "1003d2aa",
    "890e",
    "MOV dword ptr [ESI],ECX"
  ],
  [
    "1003d2ac",
    "894a04",
    "MOV dword ptr [EDX + 0x4],ECX"
  ],
  [
    "1003d2af",
    "897a08",
    "MOV dword ptr [EDX + 0x8],EDI"
  ],
  [
    "1003d2b2",
    "8b7108",
    "MOV ESI,dword ptr [ECX + 0x8]"
  ],
  [
    "1003d2b5",
    "c7411400000000",
    "MOV dword ptr [ECX + 0x14],0x0"
  ],
  [
    "1003d2bc",
    "8b34b514421410",
    "MOV ESI,dword ptr [ESI*0x4 + 0x10144214]"
  ],
  [
    "1003d2c3",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "1003d2c5",
    "897110",
    "MOV dword ptr [ECX + 0x10],ESI"
  ],
  [
    "1003d2c8",
    "7403",
    "JZ 0x1003d2cd"
  ],
  [
    "1003d2ca",
    "894e14",
    "MOV dword ptr [ESI + 0x14],ECX"
  ],
  [
    "1003d2cd",
    "8b7108",
    "MOV ESI,dword ptr [ECX + 0x8]"
  ],
  [
    "1003d2d0",
    "890cb514421410",
    "MOV dword ptr [ESI*0x4 + 0x10144214],ECX"
  ],
  [
    "1003d2d7",
    "5f",
    "POP EDI"
  ],
  [
    "1003d2d8",
    "c7420c01000000",
    "MOV dword ptr [EDX + 0xc],0x1"
  ],
  [
    "1003d2df",
    "5e",
    "POP ESI"
  ],
  [
    "1003d2e0",
    "c20400",
    "RET 0x4"
  ],
  [
    "1003d2e3",
    "5f",
    "POP EDI"
  ],
  [
    "1003d2e4",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "1003d2e6",
    "5e",
    "POP ESI"
  ],
  [
    "1003d2e7",
    "c20400",
    "RET 0x4"
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
    "1003d790",
    "56",
    "PUSH ESI"
  ],
  [
    "1003d791",
    "8b742408",
    "MOV ESI,dword ptr [ESP + 0x8]"
  ],
  [
    "1003d795",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "1003d797",
    "750e",
    "JNZ 0x1003d7a7"
  ],
  [
    "1003d799",
    "8b44240c",
    "MOV EAX,dword ptr [ESP + 0xc]"
  ],
  [
    "1003d79d",
    "50",
    "PUSH EAX"
  ],
  [
    "1003d79e",
    "e88538fcff",
    "CALL 0x10001028"
  ],
  [
    "1003d7a3",
    "5e",
    "POP ESI"
  ],
  [
    "1003d7a4",
    "c20800",
    "RET 0x8"
  ],
  [
    "1003d7a7",
    "56",
    "PUSH ESI"
  ],
  [
    "1003d7a8",
    "e88a83fcff",
    "CALL 0x10005b37"
  ],
  [
    "1003d7ad",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1003d7af",
    "7416",
    "JZ 0x1003d7c7"
  ],
  [
    "1003d7b1",
    "8b54240c",
    "MOV EDX,dword ptr [ESP + 0xc]"
  ],
  [
    "1003d7b5",
    "8b480c",
    "MOV ECX,dword ptr [EAX + 0xc]"
  ],
  [
    "1003d7b8",
    "8b4008",
    "MOV EAX,dword ptr [EAX + 0x8]"
  ],
  [
    "1003d7bb",
    "8b4908",
    "MOV ECX,dword ptr [ECX + 0x8]"
  ],
  [
    "1003d7be",
    "52",
    "PUSH EDX"
  ],
  [
    "1003d7bf",
    "56",
    "PUSH ESI"
  ],
  [
    "1003d7c0",
    "50",
    "PUSH EAX"
  ],
  [
    "1003d7c1",
    "ffd1",
    "CALL ECX"
  ],
  [
    "1003d7c3",
    "5e",
    "POP ESI"
  ],
  [
    "1003d7c4",
    "c20800",
    "RET 0x8"
  ],
  [
    "1003d7c7",
    "8b74240c",
    "MOV ESI,dword ptr [ESP + 0xc]"
  ],
  [
    "1003d7cb",
    "56",
    "PUSH ESI"
  ],
  [
    "1003d7cc",
    "8d54240c",
    "LEA EDX,[ESP + 0xc]"
  ],
  [
    "1003d7d0",
    "52",
    "PUSH EDX"
  ],
  [
    "1003d7d1",
    "e8eca7fcff",
    "CALL 0x10007fc2"
  ],
  [
    "1003d7d6",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "1003d7d8",
    "7408",
    "JZ 0x1003d7e2"
  ],
  [
    "1003d7da",
    "8b442408",
    "MOV EAX,dword ptr [ESP + 0x8]"
  ],
  [
    "1003d7de",
    "5e",
    "POP ESI"
  ],
  [
    "1003d7df",
    "c20800",
    "RET 0x8"
  ],
  [
    "1003d7e2",
    "81c6ff0f0000",
    "ADD ESI,0xfff"
  ],
  [
    "1003d7e8",
    "81e600f0ffff",
    "AND ESI,0xfffff000"
  ],
  [
    "1003d7ee",
    "393528b02f10",
    "CMP dword ptr [0x102fb028],ESI"
  ],
  [
    "1003d7f4",
    "7606",
    "JBE 0x1003d7fc"
  ],
  [
    "1003d7f6",
    "893528b02f10",
    "MOV dword ptr [0x102fb028],ESI"
  ],
  [
    "1003d7fc",
    "39352cb02f10",
    "CMP dword ptr [0x102fb02c],ESI"
  ],
  [
    "1003d802",
    "7306",
    "JNC 0x1003d80a"
  ],
  [
    "1003d804",
    "89352cb02f10",
    "MOV dword ptr [0x102fb02c],ESI"
  ],
  [
    "1003d80a",
    "a108b02f10",
    "MOV EAX,[0x102fb008]"
  ],
  [
    "1003d80f",
    "53",
    "PUSH EBX"
  ],
  [
    "1003d810",
    "57",
    "PUSH EDI"
  ],
  [
    "1003d811",
    "8b7c2410",
    "MOV EDI,dword ptr [ESP + 0x10]"
  ],
  [
    "1003d815",
    "57",
    "PUSH EDI"
  ],
  [
    "1003d816",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1003d818",
    "50",
    "PUSH EAX"
  ],
  [
    "1003d819",
    "ff1578962f10",
    "CALL dword ptr [0x102f9678]"
  ],
  [
    "1003d81f",
    "8b0d08b02f10",
    "MOV ECX,dword ptr [0x102fb008]"
  ],
  [
    "1003d825",
    "8b1d90962f10",
    "MOV EBX,dword ptr [0x102f9690]"
  ],
  [
    "1003d82b",
    "290520b02f10",
    "SUB dword ptr [0x102fb020],EAX"
  ],
  [
    "1003d831",
    "56",
    "PUSH ESI"
  ],
  [
    "1003d832",
    "57",
    "PUSH EDI"
  ],
  [
    "1003d833",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1003d835",
    "51",
    "PUSH ECX"
  ],
  [
    "1003d836",
    "ffd3",
    "CALL EBX"
  ],
  [
    "1003d838",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1003d83a",
    "7537",
    "JNZ 0x1003d873"
  ],
  [
    "1003d83c",
    "8b1508b02f10",
    "MOV EDX,dword ptr [0x102fb008]"
  ],
  [
    "1003d842",
    "83050cb02f1001",
    "ADD dword ptr [0x102fb00c],0x1"
  ],
  [
    "1003d849",
    "50",
    "PUSH EAX"
  ],
  [
    "1003d84a",
    "52",
    "PUSH EDX"
  ],
  [
    "1003d84b",
    "ff157c962f10",
    "CALL dword ptr [0x102f967c]"
  ],
  [
    "1003d851",
    "56",
    "PUSH ESI"
  ],
  [
    "1003d852",
    "57",
    "PUSH EDI"
  ],
  [
    "1003d853",
    "a314b02f10",
    "MOV [0x102fb014],EAX"
  ],
  [
    "1003d858",
    "a108b02f10",
    "MOV EAX,[0x102fb008]"
  ],
  [
    "1003d85d",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1003d85f",
    "50",
    "PUSH EAX"
  ],
  [
    "1003d860",
    "ffd3",
    "CALL EBX"
  ],
  [
    "1003d862",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1003d864",
    "750d",
    "JNZ 0x1003d873"
  ],
  [
    "1003d866",
    "830510b02f1001",
    "ADD dword ptr [0x102fb010],0x1"
  ],
  [
    "1003d86d",
    "5f",
    "POP EDI"
  ],
  [
    "1003d86e",
    "5b",
    "POP EBX"
  ],
  [
    "1003d86f",
    "5e",
    "POP ESI"
  ],
  [
    "1003d870",
    "c20800",
    "RET 0x8"
  ],
  [
    "1003d873",
    "8b0d20b02f10",
    "MOV ECX,dword ptr [0x102fb020]"
  ],
  [
    "1003d879",
    "03ce",
    "ADD ECX,ESI"
  ],
  [
    "1003d87b",
    "390d24b02f10",
    "CMP dword ptr [0x102fb024],ECX"
  ],
  [
    "1003d881",
    "890d20b02f10",
    "MOV dword ptr [0x102fb020],ECX"
  ],
  [
    "1003d887",
    "7306",
    "JNC 0x1003d88f"
  ],
  [
    "1003d889",
    "890d24b02f10",
    "MOV dword ptr [0x102fb024],ECX"
  ],
  [
    "1003d88f",
    "5f",
    "POP EDI"
  ],
  [
    "1003d890",
    "5b",
    "POP EBX"
  ],
  [
    "1003d891",
    "5e",
    "POP ESI"
  ],
  [
    "1003d892",
    "c20800",
    "RET 0x8"
  ],
  [
    "1003d8a0",
    "55",
    "PUSH EBP"
  ],
  [
    "1003d8a1",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "1003d8a3",
    "6aff",
    "PUSH -0x1"
  ],
  [
    "1003d8a5",
    "6838830f10",
    "PUSH 0x100f8338"
  ],
  [
    "1003d8aa",
    "68806f0a10",
    "PUSH 0x100a6f80"
  ],
  [
    "1003d8af",
    "64a100000000",
    "MOV EAX,FS:[0x0]"
  ],
  [
    "1003d8b5",
    "50",
    "PUSH EAX"
  ],
  [
    "1003d8b6",
    "64892500000000",
    "MOV dword ptr FS:[0x0],ESP"
  ],
  [
    "1003d8bd",
    "83ec0c",
    "SUB ESP,0xc"
  ],
  [
    "1003d8c0",
    "53",
    "PUSH EBX"
  ],
  [
    "1003d8c1",
    "56",
    "PUSH ESI"
  ],
  [
    "1003d8c2",
    "57",
    "PUSH EDI"
  ],
  [
    "1003d8c3",
    "8965e8",
    "MOV dword ptr [EBP + -0x18],ESP"
  ],
  [
    "1003d8c6",
    "a000b02f10",
    "MOV AL,[0x102fb000]"
  ],
  [
    "1003d8cb",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "1003d8cd",
    "751f",
    "JNZ 0x1003d8ee"
  ],
  [
    "1003d8cf",
    "68e8030000",
    "PUSH 0x3e8"
  ],
  [
    "1003d8d4",
    "68189a1810",
    "PUSH 0x10189a18"
  ],
  [
    "1003d8d9",
    "ff156c962f10",
    "CALL dword ptr [0x102f966c]"
  ],
  [
    "1003d8df",
    "83f801",
    "CMP EAX,0x1"
  ],
  [
    "1003d8e2",
    "0f94c0",
    "SETZ AL"
  ],
  [
    "1003d8e5",
    "a200b02f10",
    "MOV [0x102fb000],AL"
  ],
  [
    "1003d8ea",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "1003d8ec",
    "740b",
    "JZ 0x1003d8f9"
  ],
  [
    "1003d8ee",
    "68189a1810",
    "PUSH 0x10189a18"
  ],
  [
    "1003d8f3",
    "ff1504962f10",
    "CALL dword ptr [0x102f9604]"
  ],
  [
    "1003d8f9",
    "c745fc00000000",
    "MOV dword ptr [EBP + -0x4],0x0"
  ],
  [
    "1003d900",
    "8b450c",
    "MOV EAX,dword ptr [EBP + 0xc]"
  ],
  [
    "1003d903",
    "50",
    "PUSH EAX"
  ],
  [
    "1003d904",
    "8b4d08",
    "MOV ECX,dword ptr [EBP + 0x8]"
  ],
  [
    "1003d907",
    "51",
    "PUSH ECX"
  ],
  [
    "1003d908",
    "e8f179fcff",
    "CALL 0x100052fe"
  ],
  [
    "1003d90d",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "1003d90f",
    "8975e4",
    "MOV dword ptr [EBP + -0x1c],ESI"
  ],
  [
    "1003d912",
    "c745fcffffffff",
    "MOV dword ptr [EBP + -0x4],0xffffffff"
  ],
  [
    "1003d919",
    "68189a1810",
    "PUSH 0x10189a18"
  ],
  [
    "1003d91e",
    "ff1508962f10",
    "CALL dword ptr [0x102f9608]"
  ],
  [
    "1003d924",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "1003d926",
    "8b4df0",
    "MOV ECX,dword ptr [EBP + -0x10]"
  ],
  [
    "1003d929",
    "64890d00000000",
    "MOV dword ptr FS:[0x0],ECX"
  ],
  [
    "1003d930",
    "5f",
    "POP EDI"
  ],
  [
    "1003d931",
    "5e",
    "POP ESI"
  ],
  [
    "1003d932",
    "5b",
    "POP EBX"
  ],
  [
    "1003d933",
    "8be5",
    "MOV ESP,EBP"
  ],
  [
    "1003d935",
    "5d",
    "POP EBP"
  ],
  [
    "1003d936",
    "c20800",
    "RET 0x8"
  ],
  [
    "10049490",
    "51",
    "PUSH ECX"
  ],
  [
    "10049491",
    "8b01",
    "MOV EAX,dword ptr [ECX]"
  ],
  [
    "10049493",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "10049495",
    "890c24",
    "MOV dword ptr [ESP],ECX"
  ],
  [
    "10049498",
    "7465",
    "JZ 0x100494ff"
  ],
  [
    "1004949a",
    "57",
    "PUSH EDI"
  ],
  [
    "1004949b",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "1004949d",
    "397804",
    "CMP dword ptr [EAX + 0x4],EDI"
  ],
  [
    "100494a0",
    "7e56",
    "JLE 0x100494f8"
  ],
  [
    "100494a2",
    "53",
    "PUSH EBX"
  ],
  [
    "100494a3",
    "8b5c2428",
    "MOV EBX,dword ptr [ESP + 0x28]"
  ],
  [
    "100494a7",
    "55",
    "PUSH EBP"
  ],
  [
    "100494a8",
    "8b6c2428",
    "MOV EBP,dword ptr [ESP + 0x28]"
  ],
  [
    "100494ac",
    "56",
    "PUSH ESI"
  ],
  [
    "100494ad",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100494af",
    "90",
    "NOP"
  ],
  [
    "100494b0",
    "8b00",
    "MOV EAX,dword ptr [EAX]"
  ],
  [
    "100494b2",
    "8b0c30",
    "MOV ECX,dword ptr [EAX + ESI*0x1]"
  ],
  [
    "100494b5",
    "03c6",
    "ADD EAX,ESI"
  ],
  [
    "100494b7",
    "85c9",
    "TEST ECX,ECX"
  ],
  [
    "100494b9",
    "7422",
    "JZ 0x100494dd"
  ],
  [
    "100494bb",
    "8b542418",
    "MOV EDX,dword ptr [ESP + 0x18]"
  ],
  [
    "100494bf",
    "3b5008",
    "CMP EDX,dword ptr [EAX + 0x8]"
  ],
  [
    "100494c2",
    "7519",
    "JNZ 0x100494dd"
  ],
  [
    "100494c4",
    "8b542428",
    "MOV EDX,dword ptr [ESP + 0x28]"
  ],
  [
    "100494c8",
    "8b4004",
    "MOV EAX,dword ptr [EAX + 0x4]"
  ],
  [
    "100494cb",
    "53",
    "PUSH EBX"
  ],
  [
    "100494cc",
    "55",
    "PUSH EBP"
  ],
  [
    "100494cd",
    "52",
    "PUSH EDX"
  ],
  [
    "100494ce",
    "8b54242c",
    "MOV EDX,dword ptr [ESP + 0x2c]"
  ],
  [
    "100494d2",
    "50",
    "PUSH EAX"
  ],
  [
    "100494d3",
    "8b44242c",
    "MOV EAX,dword ptr [ESP + 0x2c]"
  ],
  [
    "100494d7",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100494d9",
    "52",
    "PUSH EDX"
  ],
  [
    "100494da",
    "50",
    "PUSH EAX"
  ],
  [
    "100494db",
    "ffd1",
    "CALL ECX"
  ],
  [
    "100494dd",
    "8b4c2410",
    "MOV ECX,dword ptr [ESP + 0x10]"
  ],
  [
    "100494e1",
    "8b01",
    "MOV EAX,dword ptr [ECX]"
  ],
  [
    "100494e3",
    "83c701",
    "ADD EDI,0x1"
  ],
  [
    "100494e6",
    "83c60c",
    "ADD ESI,0xc"
  ],
  [
    "100494e9",
    "3b7804",
    "CMP EDI,dword ptr [EAX + 0x4]"
  ],
  [
    "100494ec",
    "7cc2",
    "JL 0x100494b0"
  ],
  [
    "100494ee",
    "5e",
    "POP ESI"
  ],
  [
    "100494ef",
    "5d",
    "POP EBP"
  ],
  [
    "100494f0",
    "5b",
    "POP EBX"
  ],
  [
    "100494f1",
    "32c0",
    "XOR AL,AL"
  ],
  [
    "100494f3",
    "5f",
    "POP EDI"
  ],
  [
    "100494f4",
    "59",
    "POP ECX"
  ],
  [
    "100494f5",
    "c21c00",
    "RET 0x1c"
  ],
  [
    "100494f8",
    "32c0",
    "XOR AL,AL"
  ],
  [
    "100494fa",
    "5f",
    "POP EDI"
  ],
  [
    "100494fb",
    "59",
    "POP ECX"
  ],
  [
    "100494fc",
    "c21c00",
    "RET 0x1c"
  ],
  [
    "100494ff",
    "32c0",
    "XOR AL,AL"
  ],
  [
    "10049501",
    "59",
    "POP ECX"
  ],
  [
    "10049502",
    "c21c00",
    "RET 0x1c"
  ],
  [
    "10049510",
    "51",
    "PUSH ECX"
  ],
  [
    "10049511",
    "8b442408",
    "MOV EAX,dword ptr [ESP + 0x8]"
  ],
  [
    "10049515",
    "57",
    "PUSH EDI"
  ],
  [
    "10049516",
    "8bf9",
    "MOV EDI,ECX"
  ],
  [
    "10049518",
    "3b471c",
    "CMP EAX,dword ptr [EDI + 0x1c]"
  ],
  [
    "1004951b",
    "7e57",
    "JLE 0x10049574"
  ],
  [
    "1004951d",
    "53",
    "PUSH EBX"
  ],
  [
    "1004951e",
    "55",
    "PUSH EBP"
  ],
  [
    "1004951f",
    "8d4704",
    "LEA EAX,[EDI + 0x4]"
  ],
  [
    "10049522",
    "56",
    "PUSH ESI"
  ],
  [
    "10049523",
    "50",
    "PUSH EAX"
  ],
  [
    "10049524",
    "89442414",
    "MOV dword ptr [ESP + 0x14],EAX"
  ],
  [
    "10049528",
    "ff1504962f10",
    "CALL dword ptr [0x102f9604]"
  ],
  [
    "1004952e",
    "8b5c242c",
    "MOV EBX,dword ptr [ESP + 0x2c]"
  ],
  [
    "10049532",
    "8b6c2428",
    "MOV EBP,dword ptr [ESP + 0x28]"
  ],
  [
    "10049536",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "10049538",
    "eb06",
    "JMP 0x10049540"
  ],
  [
    "10049540",
    "8b4c2424",
    "MOV ECX,dword ptr [ESP + 0x24]"
  ],
  [
    "10049544",
    "8b542420",
    "MOV EDX,dword ptr [ESP + 0x20]"
  ],
  [
    "10049548",
    "8b44241c",
    "MOV EAX,dword ptr [ESP + 0x1c]"
  ],
  [
    "1004954c",
    "53",
    "PUSH EBX"
  ],
  [
    "1004954d",
    "55",
    "PUSH EBP"
  ],
  [
    "1004954e",
    "51",
    "PUSH ECX"
  ],
  [
    "1004954f",
    "8b4c2424",
    "MOV ECX,dword ptr [ESP + 0x24]"
  ],
  [
    "10049553",
    "52",
    "PUSH EDX"
  ],
  [
    "10049554",
    "50",
    "PUSH EAX"
  ],
  [
    "10049555",
    "51",
    "PUSH ECX"
  ],
  [
    "10049556",
    "56",
    "PUSH ESI"
  ],
  [
    "10049557",
    "8bcf",
    "MOV ECX,EDI"
  ],
  [
    "10049559",
    "e861d9fbff",
    "CALL 0x10006ebf"
  ],
  [
    "1004955e",
    "83c601",
    "ADD ESI,0x1"
  ],
  [
    "10049561",
    "83fe03",
    "CMP ESI,0x3"
  ],
  [
    "10049564",
    "7cda",
    "JL 0x10049540"
  ],
  [
    "10049566",
    "8b542410",
    "MOV EDX,dword ptr [ESP + 0x10]"
  ],
  [
    "1004956a",
    "52",
    "PUSH EDX"
  ],
  [
    "1004956b",
    "ff1508962f10",
    "CALL dword ptr [0x102f9608]"
  ],
  [
    "10049571",
    "5e",
    "POP ESI"
  ],
  [
    "10049572",
    "5d",
    "POP EBP"
  ],
  [
    "10049573",
    "5b",
    "POP EBX"
  ],
  [
    "10049574",
    "b001",
    "MOV AL,0x1"
  ],
  [
    "10049576",
    "5f",
    "POP EDI"
  ],
  [
    "10049577",
    "59",
    "POP ECX"
  ],
  [
    "10049578",
    "c21800",
    "RET 0x18"
  ],
  [
    "10049580",
    "8b09",
    "MOV ECX,dword ptr [ECX]"
  ],
  [
    "10049582",
    "85c9",
    "TEST ECX,ECX"
  ],
  [
    "10049584",
    "7505",
    "JNZ 0x1004958b"
  ],
  [
    "10049586",
    "32c0",
    "XOR AL,AL"
  ],
  [
    "10049588",
    "c20400",
    "RET 0x4"
  ],
  [
    "1004958b",
    "8b4104",
    "MOV EAX,dword ptr [ECX + 0x4]"
  ],
  [
    "1004958e",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "10049590",
    "56",
    "PUSH ESI"
  ],
  [
    "10049591",
    "7e26",
    "JLE 0x100495b9"
  ],
  [
    "10049593",
    "8b31",
    "MOV ESI,dword ptr [ECX]"
  ],
  [
    "10049595",
    "8d1440",
    "LEA EDX,[EAX + EAX*0x2]"
  ],
  [
    "10049598",
    "8d1496",
    "LEA EDX,[ESI + EDX*0x4]"
  ],
  [
    "1004959b",
    "8b742408",
    "MOV ESI,dword ptr [ESP + 0x8]"
  ],
  [
    "1004959f",
    "90",
    "NOP"
  ],
  [
    "100495a0",
    "83ea0c",
    "SUB EDX,0xc"
  ],
  [
    "100495a3",
    "83e801",
    "SUB EAX,0x1"
  ],
  [
    "100495a6",
    "3932",
    "CMP dword ptr [EDX],ESI"
  ],
  [
    "100495a8",
    "740a",
    "JZ 0x100495b4"
  ],
  [
    "100495aa",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100495ac",
    "75f2",
    "JNZ 0x100495a0"
  ],
  [
    "100495ae",
    "32c0",
    "XOR AL,AL"
  ],
  [
    "100495b0",
    "5e",
    "POP ESI"
  ],
  [
    "100495b1",
    "c20400",
    "RET 0x4"
  ],
  [
    "100495b4",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100495b7",
    "7506",
    "JNZ 0x100495bf"
  ],
  [
    "100495b9",
    "32c0",
    "XOR AL,AL"
  ],
  [
    "100495bb",
    "5e",
    "POP ESI"
  ],
  [
    "100495bc",
    "c20400",
    "RET 0x4"
  ],
  [
    "100495bf",
    "50",
    "PUSH EAX"
  ],
  [
    "100495c0",
    "e85db2fbff",
    "CALL 0x10004822"
  ],
  [
    "100495c5",
    "b001",
    "MOV AL,0x1"
  ],
  [
    "100495c7",
    "5e",
    "POP ESI"
  ],
  [
    "100495c8",
    "c20400",
    "RET 0x4"
  ],
  [
    "100495f0",
    "56",
    "PUSH ESI"
  ],
  [
    "100495f1",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100495f3",
    "833e00",
    "CMP dword ptr [ESI],0x0"
  ],
  [
    "100495f6",
    "7406",
    "JZ 0x100495fe"
  ],
  [
    "100495f8",
    "56",
    "PUSH ESI"
  ],
  [
    "100495f9",
    "e8a595fbff",
    "CALL 0x10002ba3"
  ],
  [
    "100495fe",
    "68e3000000",
    "PUSH 0xe3"
  ],
  [
    "10049603",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "10049605",
    "c7461c01000000",
    "MOV dword ptr [ESI + 0x1c],0x1"
  ],
  [
    "1004960c",
    "c70600000000",
    "MOV dword ptr [ESI],0x0"
  ],
  [
    "10049612",
    "e8ca7afbff",
    "CALL 0x100010e1"
  ],
  [
    "10049617",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "10049619",
    "741c",
    "JZ 0x10049637"
  ],
  [
    "1004961b",
    "c70000000000",
    "MOV dword ptr [EAX],0x0"
  ],
  [
    "10049621",
    "c7400400000000",
    "MOV dword ptr [EAX + 0x4],0x0"
  ],
  [
    "10049628",
    "c7400800000000",
    "MOV dword ptr [EAX + 0x8],0x0"
  ],
  [
    "1004962f",
    "8906",
    "MOV dword ptr [ESI],EAX"
  ],
  [
    "10049631",
    "5e",
    "POP ESI"
  ],
  [
    "10049632",
    "e9e5d5fbff",
    "JMP 0x10006c1c"
  ],
  [
    "10049637",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "10049639",
    "8906",
    "MOV dword ptr [ESI],EAX"
  ],
  [
    "1004963b",
    "5e",
    "POP ESI"
  ],
  [
    "1004963c",
    "e9dbd5fbff",
    "JMP 0x10006c1c"
  ],
  [
    "10049650",
    "53",
    "PUSH EBX"
  ],
  [
    "10049651",
    "8b5c2408",
    "MOV EBX,dword ptr [ESP + 0x8]"
  ],
  [
    "10049655",
    "57",
    "PUSH EDI"
  ],
  [
    "10049656",
    "8b39",
    "MOV EDI,dword ptr [ECX]"
  ],
  [
    "10049658",
    "85ff",
    "TEST EDI,EDI"
  ],
  [
    "1004965a",
    "7429",
    "JZ 0x10049685"
  ],
  [
    "1004965c",
    "8b4704",
    "MOV EAX,dword ptr [EDI + 0x4]"
  ],
  [
    "1004965f",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "10049661",
    "7e22",
    "JLE 0x10049685"
  ],
  [
    "10049663",
    "8b17",
    "MOV EDX,dword ptr [EDI]"
  ],
  [
    "10049665",
    "8d0c40",
    "LEA ECX,[EAX + EAX*0x2]"
  ],
  [
    "10049668",
    "8d0c8a",
    "LEA ECX,[EDX + ECX*0x4]"
  ],
  [
    "1004966b",
    "eb03",
    "JMP 0x10049670"
  ],
  [
    "10049670",
    "83e90c",
    "SUB ECX,0xc"
  ],
  [
    "10049673",
    "83e801",
    "SUB EAX,0x1"
  ],
  [
    "10049676",
    "3919",
    "CMP dword ptr [ECX],EBX"
  ],
  [
    "10049678",
    "7406",
    "JZ 0x10049680"
  ],
  [
    "1004967a",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1004967c",
    "75f2",
    "JNZ 0x10049670"
  ],
  [
    "1004967e",
    "eb05",
    "JMP 0x10049685"
  ],
  [
    "10049680",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "10049683",
    "756f",
    "JNZ 0x100496f4"
  ],
  [
    "10049685",
    "8b5704",
    "MOV EDX,dword ptr [EDI + 0x4]"
  ],
  [
    "10049688",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "1004968a",
    "85d2",
    "TEST EDX,EDX"
  ],
  [
    "1004968c",
    "7e14",
    "JLE 0x100496a2"
  ],
  [
    "1004968e",
    "8b0f",
    "MOV ECX,dword ptr [EDI]"
  ],
  [
    "10049690",
    "83c108",
    "ADD ECX,0x8"
  ],
  [
    "10049693",
    "833900",
    "CMP dword ptr [ECX],0x0"
  ],
  [
    "10049696",
    "7448",
    "JZ 0x100496e0"
  ],
  [
    "10049698",
    "83c001",
    "ADD EAX,0x1"
  ],
  [
    "1004969b",
    "83c10c",
    "ADD ECX,0xc"
  ],
  [
    "1004969e",
    "3bc2",
    "CMP EAX,EDX"
  ],
  [
    "100496a0",
    "7cf1",
    "JL 0x10049693"
  ],
  [
    "100496a2",
    "56",
    "PUSH ESI"
  ],
  [
    "100496a3",
    "8bf2",
    "MOV ESI,EDX"
  ],
  [
    "100496a5",
    "83c601",
    "ADD ESI,0x1"
  ],
  [
    "100496a8",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100496aa",
    "f7d8",
    "NEG EAX"
  ],
  [
    "100496ac",
    "1bc0",
    "SBB EAX,EAX"
  ],
  [
    "100496ae",
    "f7d8",
    "NEG EAX"
  ],
  [
    "100496b0",
    "83e801",
    "SUB EAX,0x1"
  ],
  [
    "100496b3",
    "50",
    "PUSH EAX"
  ],
  [
    "100496b4",
    "56",
    "PUSH ESI"
  ],
  [
    "100496b5",
    "8bcf",
    "MOV ECX,EDI"
  ],
  [
    "100496b7",
    "e85fccfbff",
    "CALL 0x1000631b"
  ],
  [
    "100496bc",
    "8b17",
    "MOV EDX,dword ptr [EDI]"
  ],
  [
    "100496be",
    "897704",
    "MOV dword ptr [EDI + 0x4],ESI"
  ],
  [
    "100496c1",
    "8d0c76",
    "LEA ECX,[ESI + ESI*0x2]"
  ],
  [
    "100496c4",
    "8d448af4",
    "LEA EAX,[EDX + ECX*0x4 + -0xc]"
  ],
  [
    "100496c8",
    "8b4c2418",
    "MOV ECX,dword ptr [ESP + 0x18]"
  ],
  [
    "100496cc",
    "8b542414",
    "MOV EDX,dword ptr [ESP + 0x14]"
  ],
  [
    "100496d0",
    "5e",
    "POP ESI"
  ],
  [
    "100496d1",
    "8918",
    "MOV dword ptr [EAX],EBX"
  ],
  [
    "100496d3",
    "5f",
    "POP EDI"
  ],
  [
    "100496d4",
    "894804",
    "MOV dword ptr [EAX + 0x4],ECX"
  ],
  [
    "100496d7",
    "895008",
    "MOV dword ptr [EAX + 0x8],EDX"
  ],
  [
    "100496da",
    "b001",
    "MOV AL,0x1"
  ],
  [
    "100496dc",
    "5b",
    "POP EBX"
  ],
  [
    "100496dd",
    "c20c00",
    "RET 0xc"
  ],
  [
    "100496e0",
    "6a30",
    "PUSH 0x30"
  ],
  [
    "100496e2",
    "68d07d0e10",
    "PUSH 0x100e7dd0"
  ],
  [
    "100496e7",
    "68707d0e10",
    "PUSH 0x100e7d70"
  ],
  [
    "100496ec",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100496ee",
    "ff15a8982f10",
    "CALL dword ptr [0x102f98a8]"
  ],
  [
    "100496f4",
    "5f",
    "POP EDI"
  ],
  [
    "100496f5",
    "32c0",
    "XOR AL,AL"
  ],
  [
    "100496f7",
    "5b",
    "POP EBX"
  ],
  [
    "100496f8",
    "c20c00",
    "RET 0xc"
  ],
  [
    "10049760",
    "f605947d191001",
    "TEST byte ptr [0x10197d94],0x1"
  ],
  [
    "10049767",
    "7547",
    "JNZ 0x100497b0"
  ],
  [
    "10049769",
    "830d947d191001",
    "OR dword ptr [0x10197d94],0x1"
  ],
  [
    "10049770",
    "68707d1910",
    "PUSH 0x10197d70"
  ],
  [
    "10049775",
    "ff15f4952f10",
    "CALL dword ptr [0x102f95f4]"
  ],
  [
    "1004977b",
    "b96c7d1910",
    "MOV ECX,0x10197d6c"
  ],
  [
    "10049780",
    "c705887d191001000000",
    "MOV dword ptr [0x10197d88],0x1"
  ],
  [
    "1004978a",
    "c7056c7d191000000000",
    "MOV dword ptr [0x10197d6c],0x0"
  ],
  [
    "10049794",
    "e8e3d3fbff",
    "CALL 0x10006b7c"
  ],
  [
    "10049799",
    "e873f3fbff",
    "CALL 0x10008b11"
  ],
  [
    "1004979e",
    "e8917bfbff",
    "CALL 0x10001334"
  ],
  [
    "100497a3",
    "68d0270e10",
    "PUSH 0x100e27d0"
  ],
  [
    "100497a8",
    "e823db0500",
    "CALL 0x100a72d0"
  ],
  [
    "100497ad",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "100497b0",
    "b86c7d1910",
    "MOV EAX,0x10197d6c"
  ],
  [
    "100497b5",
    "c3",
    "RET"
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
    "10049d80",
    "8b542404",
    "MOV EDX,dword ptr [ESP + 0x4]"
  ],
  [
    "10049d84",
    "53",
    "PUSH EBX"
  ],
  [
    "10049d85",
    "57",
    "PUSH EDI"
  ],
  [
    "10049d86",
    "8bf9",
    "MOV EDI,ECX"
  ],
  [
    "10049d88",
    "8b5f08",
    "MOV EBX,dword ptr [EDI + 0x8]"
  ],
  [
    "10049d8b",
    "3bda",
    "CMP EBX,EDX"
  ],
  [
    "10049d8d",
    "7d6e",
    "JGE 0x10049dfd"
  ],
  [
    "10049d8f",
    "8b4c2410",
    "MOV ECX,dword ptr [ESP + 0x10]"
  ],
  [
    "10049d93",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "10049d95",
    "85c9",
    "TEST ECX,ECX"
  ],
  [
    "10049d97",
    "7e04",
    "JLE 0x10049d9d"
  ],
  [
    "10049d99",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "10049d9b",
    "eb1f",
    "JMP 0x10049dbc"
  ],
  [
    "10049d9d",
    "751d",
    "JNZ 0x10049dbc"
  ],
  [
    "10049d9f",
    "8bc3",
    "MOV EAX,EBX"
  ],
  [
    "10049da1",
    "c1f803",
    "SAR EAX,0x3"
  ],
  [
    "10049da4",
    "3d00040000",
    "CMP EAX,0x400"
  ],
  [
    "10049da9",
    "7f0c",
    "JG 0x10049db7"
  ],
  [
    "10049dab",
    "83f808",
    "CMP EAX,0x8"
  ],
  [
    "10049dae",
    "7d0c",
    "JGE 0x10049dbc"
  ],
  [
    "10049db0",
    "b808000000",
    "MOV EAX,0x8"
  ],
  [
    "10049db5",
    "eb05",
    "JMP 0x10049dbc"
  ],
  [
    "10049db7",
    "b800040000",
    "MOV EAX,0x400"
  ],
  [
    "10049dbc",
    "8b0f",
    "MOV ECX,dword ptr [EDI]"
  ],
  [
    "10049dbe",
    "56",
    "PUSH ESI"
  ],
  [
    "10049dbf",
    "8d3410",
    "LEA ESI,[EAX + EDX*0x1]"
  ],
  [
    "10049dc2",
    "8d0476",
    "LEA EAX,[ESI + ESI*0x2]"
  ],
  [
    "10049dc5",
    "03c0",
    "ADD EAX,EAX"
  ],
  [
    "10049dc7",
    "03c0",
    "ADD EAX,EAX"
  ],
  [
    "10049dc9",
    "50",
    "PUSH EAX"
  ],
  [
    "10049dca",
    "51",
    "PUSH ECX"
  ],
  [
    "10049dcb",
    "e8de8cfbff",
    "CALL 0x10002aae"
  ],
  [
    "10049dd0",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "10049dd2",
    "e85ca3fbff",
    "CALL 0x10004133"
  ],
  [
    "10049dd7",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "10049dd9",
    "2bcb",
    "SUB ECX,EBX"
  ],
  [
    "10049ddb",
    "8d1449",
    "LEA EDX,[ECX + ECX*0x2]"
  ],
  [
    "10049dde",
    "8b4f04",
    "MOV ECX,dword ptr [EDI + 0x4]"
  ],
  [
    "10049de1",
    "03d2",
    "ADD EDX,EDX"
  ],
  [
    "10049de3",
    "03d2",
    "ADD EDX,EDX"
  ],
  [
    "10049de5",
    "52",
    "PUSH EDX"
  ],
  [
    "10049de6",
    "8d0c49",
    "LEA ECX,[ECX + ECX*0x2]"
  ],
  [
    "10049de9",
    "8d1488",
    "LEA EDX,[EAX + ECX*0x4]"
  ],
  [
    "10049dec",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "10049dee",
    "52",
    "PUSH EDX"
  ],
  [
    "10049def",
    "8907",
    "MOV dword ptr [EDI],EAX"
  ],
  [
    "10049df1",
    "e88adb0500",
    "CALL 0x100a7980"
  ],
  [
    "10049df6",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "10049df9",
    "897708",
    "MOV dword ptr [EDI + 0x8],ESI"
  ],
  [
    "10049dfc",
    "5e",
    "POP ESI"
  ],
  [
    "10049dfd",
    "5f",
    "POP EDI"
  ],
  [
    "10049dfe",
    "5b",
    "POP EBX"
  ],
  [
    "10049dff",
    "c20800",
    "RET 0x8"
  ],
  [
    "1004af90",
    "b801000000",
    "MOV EAX,0x1"
  ],
  [
    "1004af95",
    "8405e47d1910",
    "TEST byte ptr [0x10197de4],AL"
  ],
  [
    "1004af9b",
    "7532",
    "JNZ 0x1004afcf"
  ],
  [
    "1004af9d",
    "0905e47d1910",
    "OR dword ptr [0x10197de4],EAX"
  ],
  [
    "1004afa3",
    "68c07d1910",
    "PUSH 0x10197dc0"
  ],
  [
    "1004afa8",
    "ff15f4952f10",
    "CALL dword ptr [0x102f95f4]"
  ],
  [
    "1004afae",
    "b9c07d1910",
    "MOV ECX,0x10197dc0"
  ],
  [
    "1004afb3",
    "c705d87d1910ffffffff",
    "MOV dword ptr [0x10197dd8],0xffffffff"
  ],
  [
    "1004afbd",
    "e8c5d8fbff",
    "CALL 0x10008887"
  ],
  [
    "1004afc2",
    "6830280e10",
    "PUSH 0x100e2830"
  ],
  [
    "1004afc7",
    "e804c30500",
    "CALL 0x100a72d0"
  ],
  [
    "1004afcc",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "1004afcf",
    "b8c07d1910",
    "MOV EAX,0x10197dc0"
  ],
  [
    "1004afd4",
    "c3",
    "RET"
  ],
  [
    "1004b1b0",
    "81eca4010000",
    "SUB ESP,0x1a4"
  ],
  [
    "1004b1b6",
    "56",
    "PUSH ESI"
  ],
  [
    "1004b1b7",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "1004b1b9",
    "8b4618",
    "MOV EAX,dword ptr [ESI + 0x18]"
  ],
  [
    "1004b1bc",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "1004b1bf",
    "7414",
    "JZ 0x1004b1d5"
  ],
  [
    "1004b1c1",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1004b1c3",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "1004b1c5",
    "8d4c240f",
    "LEA ECX,[ESP + 0xf]"
  ],
  [
    "1004b1c9",
    "51",
    "PUSH ECX"
  ],
  [
    "1004b1ca",
    "50",
    "PUSH EAX"
  ],
  [
    "1004b1cb",
    "c644241701",
    "MOV byte ptr [ESP + 0x17],0x1"
  ],
  [
    "1004b1d0",
    "e817a60800",
    "CALL 0x100d57ec"
  ],
  [
    "1004b1d5",
    "6822570010",
    "PUSH 0x10005722"
  ],
  [
    "1004b1da",
    "e8d5d6fbff",
    "CALL 0x100088b4"
  ],
  [
    "1004b1df",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1004b1e1",
    "e83b6afbff",
    "CALL 0x10001c21"
  ],
  [
    "1004b1e6",
    "6894800e10",
    "PUSH 0x100e8094"
  ],
  [
    "1004b1eb",
    "6888800e10",
    "PUSH 0x100e8088"
  ],
  [
    "1004b1f0",
    "c74618ffffffff",
    "MOV dword ptr [ESI + 0x18],0xffffffff"
  ],
  [
    "1004b1f7",
    "e8971a0600",
    "CALL 0x100acc93"
  ],
  [
    "1004b1fc",
    "83c408",
    "ADD ESP,0x8"
  ],
  [
    "1004b1ff",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "1004b201",
    "0f8491000000",
    "JZ 0x1004b298"
  ],
  [
    "1004b207",
    "50",
    "PUSH EAX"
  ],
  [
    "1004b208",
    "e834160600",
    "CALL 0x100ac841"
  ],
  [
    "1004b20d",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "1004b210",
    "56",
    "PUSH ESI"
  ],
  [
    "1004b211",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "1004b213",
    "6822570010",
    "PUSH 0x10005722"
  ],
  [
    "1004b218",
    "c605bc7d191001",
    "MOV byte ptr [0x10197dbc],0x1"
  ],
  [
    "1004b21f",
    "e890d6fbff",
    "CALL 0x100088b4"
  ],
  [
    "1004b224",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1004b226",
    "e881cafbff",
    "CALL 0x10007cac"
  ],
  [
    "1004b22b",
    "8d542418",
    "LEA EDX,[ESP + 0x18]"
  ],
  [
    "1004b22f",
    "52",
    "PUSH EDX"
  ],
  [
    "1004b230",
    "6801010000",
    "PUSH 0x101"
  ],
  [
    "1004b235",
    "e8d0a50800",
    "CALL 0x100d580a"
  ],
  [
    "1004b23a",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1004b23c",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "1004b23e",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "1004b240",
    "e8bfa50800",
    "CALL 0x100d5804"
  ],
  [
    "1004b245",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "1004b248",
    "894618",
    "MOV dword ptr [ESI + 0x18],EAX"
  ],
  [
    "1004b24b",
    "7434",
    "JZ 0x1004b281"
  ],
  [
    "1004b24d",
    "687c800e10",
    "PUSH 0x100e807c"
  ],
  [
    "1004b252",
    "e8a7a50800",
    "CALL 0x100d57fe"
  ],
  [
    "1004b257",
    "6867120000",
    "PUSH 0x1267"
  ],
  [
    "1004b25c",
    "89442410",
    "MOV dword ptr [ESP + 0x10],EAX"
  ],
  [
    "1004b260",
    "e893a50800",
    "CALL 0x100d57f8"
  ],
  [
    "1004b265",
    "8b4e18",
    "MOV ECX,dword ptr [ESI + 0x18]"
  ],
  [
    "1004b268",
    "668944240a",
    "MOV word ptr [ESP + 0xa],AX"
  ],
  [
    "1004b26d",
    "6a10",
    "PUSH 0x10"
  ],
  [
    "1004b26f",
    "8d44240c",
    "LEA EAX,[ESP + 0xc]"
  ],
  [
    "1004b273",
    "50",
    "PUSH EAX"
  ],
  [
    "1004b274",
    "51",
    "PUSH ECX"
  ],
  [
    "1004b275",
    "66c74424140200",
    "MOV word ptr [ESP + 0x14],0x2"
  ],
  [
    "1004b27c",
    "e871a50800",
    "CALL 0x100d57f2"
  ],
  [
    "1004b281",
    "8b4618",
    "MOV EAX,dword ptr [ESI + 0x18]"
  ],
  [
    "1004b284",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1004b286",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "1004b288",
    "8d54240e",
    "LEA EDX,[ESP + 0xe]"
  ],
  [
    "1004b28c",
    "52",
    "PUSH EDX"
  ],
  [
    "1004b28d",
    "50",
    "PUSH EAX"
  ],
  [
    "1004b28e",
    "c644241600",
    "MOV byte ptr [ESP + 0x16],0x0"
  ],
  [
    "1004b293",
    "e854a50800",
    "CALL 0x100d57ec"
  ],
  [
    "1004b298",
    "5e",
    "POP ESI"
  ],
  [
    "1004b299",
    "81c4a4010000",
    "ADD ESP,0x1a4"
  ],
  [
    "1004b29f",
    "c3",
    "RET"
  ],
  [
    "1004b480",
    "b801000000",
    "MOV EAX,0x1"
  ],
  [
    "1004b485",
    "840544b11a10",
    "TEST byte ptr [0x101ab144],AL"
  ],
  [
    "1004b48b",
    "7534",
    "JNZ 0x1004b4c1"
  ],
  [
    "1004b48d",
    "090544b11a10",
    "OR dword ptr [0x101ab144],EAX"
  ],
  [
    "1004b493",
    "681cb11a10",
    "PUSH 0x101ab11c"
  ],
  [
    "1004b498",
    "ff15f4952f10",
    "CALL dword ptr [0x102f95f4]"
  ],
  [
    "1004b49e",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "1004b4a0",
    "b91cb11a10",
    "MOV ECX,0x101ab11c"
  ],
  [
    "1004b4a5",
    "a338b11a10",
    "MOV [0x101ab138],EAX"
  ],
  [
    "1004b4aa",
    "a334b11a10",
    "MOV [0x101ab134],EAX"
  ],
  [
    "1004b4af",
    "e831d5fbff",
    "CALL 0x100089e5"
  ],
  [
    "1004b4b4",
    "6890280e10",
    "PUSH 0x100e2890"
  ],
  [
    "1004b4b9",
    "e812be0500",
    "CALL 0x100a72d0"
  ],
  [
    "1004b4be",
    "83c404",
    "ADD ESP,0x4"
  ],
  [
    "1004b4c1",
    "b81cb11a10",
    "MOV EAX,0x101ab11c"
  ],
  [
    "1004b4c6",
    "c3",
    "RET"
  ],
  [
    "1004b800",
    "56",
    "PUSH ESI"
  ],
  [
    "1004b801",
    "57",
    "PUSH EDI"
  ],
  [
    "1004b802",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "1004b804",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "1004b806",
    "68068c0010",
    "PUSH 0x10008c06"
  ],
  [
    "1004b80b",
    "897e1c",
    "MOV dword ptr [ESI + 0x1c],EDI"
  ],
  [
    "1004b80e",
    "897e18",
    "MOV dword ptr [ESI + 0x18],EDI"
  ],
  [
    "1004b811",
    "e89ed0fbff",
    "CALL 0x100088b4"
  ],
  [
    "1004b816",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1004b818",
    "e80464fbff",
    "CALL 0x10001c21"
  ],
  [
    "1004b81d",
    "56",
    "PUSH ESI"
  ],
  [
    "1004b81e",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "1004b820",
    "68068c0010",
    "PUSH 0x10008c06"
  ],
  [
    "1004b825",
    "897e1c",
    "MOV dword ptr [ESI + 0x1c],EDI"
  ],
  [
    "1004b828",
    "897e18",
    "MOV dword ptr [ESI + 0x18],EDI"
  ],
  [
    "1004b82b",
    "e884d0fbff",
    "CALL 0x100088b4"
  ],
  [
    "1004b830",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "1004b832",
    "e875c4fbff",
    "CALL 0x10007cac"
  ],
  [
    "1004b837",
    "6814810e10",
    "PUSH 0x100e8114"
  ],
  [
    "1004b83c",
    "57",
    "PUSH EDI"
  ],
  [
    "1004b83d",
    "ff15b4982f10",
    "CALL dword ptr [0x102f98b4]"
  ],
  [
    "1004b843",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "1004b845",
    "894618",
    "MOV dword ptr [ESI + 0x18],EAX"
  ],
  [
    "1004b848",
    "0f847e000000",
    "JZ 0x1004b8cc"
  ],
  [
    "1004b84e",
    "53",
    "PUSH EBX"
  ],
  [
    "1004b84f",
    "55",
    "PUSH EBP"
  ],
  [
    "1004b850",
    "6804810e10",
    "PUSH 0x100e8104"
  ],
  [
    "1004b855",
    "ff15b8982f10",
    "CALL dword ptr [0x102f98b8]"
  ],
  [
    "1004b85b",
    "8b2da0962f10",
    "MOV EBP,dword ptr [0x102f96a0]"
  ],
  [
    "1004b861",
    "68fc800e10",
    "PUSH 0x100e80fc"
  ],
  [
    "1004b866",
    "8bf8",
    "MOV EDI,EAX"
  ],
  [
    "1004b868",
    "ffd5",
    "CALL EBP"
  ],
  [
    "1004b86a",
    "0fb7d8",
    "MOVZX EBX,AX"
  ],
  [
    "1004b86d",
    "0fb7c3",
    "MOVZX EAX,BX"
  ],
  [
    "1004b870",
    "50",
    "PUSH EAX"
  ],
  [
    "1004b871",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1004b873",
    "57",
    "PUSH EDI"
  ],
  [
    "1004b874",
    "68ffff0000",
    "PUSH 0xffff"
  ],
  [
    "1004b879",
    "ff159c982f10",
    "CALL dword ptr [0x102f989c]"
  ],
  [
    "1004b87f",
    "90",
    "NOP"
  ],
  [
    "1004b880",
    "53",
    "PUSH EBX"
  ],
  [
    "1004b881",
    "ff159c962f10",
    "CALL dword ptr [0x102f969c]"
  ],
  [
    "1004b887",
    "6685c0",
    "TEST AX,AX"
  ],
  [
    "1004b88a",
    "75f4",
    "JNZ 0x1004b880"
  ],
  [
    "1004b88c",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1004b88e",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1004b890",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1004b892",
    "ff1598962f10",
    "CALL dword ptr [0x102f9698]"
  ],
  [
    "1004b898",
    "68f4800e10",
    "PUSH 0x100e80f4"
  ],
  [
    "1004b89d",
    "89461c",
    "MOV dword ptr [ESI + 0x1c],EAX"
  ],
  [
    "1004b8a0",
    "ffd5",
    "CALL EBP"
  ],
  [
    "1004b8a2",
    "0fb7f0",
    "MOVZX ESI,AX"
  ],
  [
    "1004b8a5",
    "0fb7ce",
    "MOVZX ECX,SI"
  ],
  [
    "1004b8a8",
    "51",
    "PUSH ECX"
  ],
  [
    "1004b8a9",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "1004b8ab",
    "57",
    "PUSH EDI"
  ],
  [
    "1004b8ac",
    "68ffff0000",
    "PUSH 0xffff"
  ],
  [
    "1004b8b1",
    "ff159c982f10",
    "CALL dword ptr [0x102f989c]"
  ],
  [
    "1004b8b7",
    "5d",
    "POP EBP"
  ],
  [
    "1004b8b8",
    "5b",
    "POP EBX"
  ],
  [
    "1004b8b9",
    "8da42400000000",
    "LEA ESP,[ESP]"
  ],
  [
    "1004b8c0",
    "56",
    "PUSH ESI"
  ],
  [
    "1004b8c1",
    "ff159c962f10",
    "CALL dword ptr [0x102f969c]"
  ],
  [
    "1004b8c7",
    "6685c0",
    "TEST AX,AX"
  ],
  [
    "1004b8ca",
    "75f4",
    "JNZ 0x1004b8c0"
  ],
  [
    "1004b8cc",
    "5f",
    "POP EDI"
  ],
  [
    "1004b8cd",
    "5e",
    "POP ESI"
  ],
  [
    "1004b8ce",
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
    "100a791c",
    "6a0a",
    "PUSH 0xa"
  ],
  [
    "100a791e",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100a7920",
    "ff74240c",
    "PUSH dword ptr [ESP + 0xc]"
  ],
  [
    "100a7924",
    "e8b6cd0000",
    "CALL 0x100b46df"
  ],
  [
    "100a7929",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100a792c",
    "c3",
    "RET"
  ],
  [
    "100a7942",
    "e9d5ffffff",
    "JMP 0x100a791c"
  ],
  [
    "100a7f27",
    "ff74240c",
    "PUSH dword ptr [ESP + 0xc]"
  ],
  [
    "100a7f2b",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100a7f2d",
    "ff742410",
    "PUSH dword ptr [ESP + 0x10]"
  ],
  [
    "100a7f31",
    "ff742410",
    "PUSH dword ptr [ESP + 0x10]"
  ],
  [
    "100a7f35",
    "e871ffffff",
    "CALL 0x100a7eab"
  ],
  [
    "100a7f3a",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100a7f3d",
    "c3",
    "RET"
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
    "100aa49d",
    "8b4c2404",
    "MOV ECX,dword ptr [ESP + 0x4]"
  ],
  [
    "100aa4a1",
    "56",
    "PUSH ESI"
  ],
  [
    "100aa4a2",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100aa4a4",
    "3bce",
    "CMP ECX,ESI"
  ],
  [
    "100aa4a6",
    "751d",
    "JNZ 0x100aa4c5"
  ],
  [
    "100aa4a8",
    "e824490000",
    "CALL 0x100aedd1"
  ],
  [
    "100aa4ad",
    "56",
    "PUSH ESI"
  ],
  [
    "100aa4ae",
    "56",
    "PUSH ESI"
  ],
  [
    "100aa4af",
    "56",
    "PUSH ESI"
  ],
  [
    "100aa4b0",
    "56",
    "PUSH ESI"
  ],
  [
    "100aa4b1",
    "56",
    "PUSH ESI"
  ],
  [
    "100aa4b2",
    "c70016000000",
    "MOV dword ptr [EAX],0x16"
  ],
  [
    "100aa4b8",
    "e8153d0000",
    "CALL 0x100ae1d2"
  ],
  [
    "100aa4bd",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100aa4c0",
    "6a16",
    "PUSH 0x16"
  ],
  [
    "100aa4c2",
    "58",
    "POP EAX"
  ],
  [
    "100aa4c3",
    "5e",
    "POP ESI"
  ],
  [
    "100aa4c4",
    "c3",
    "RET"
  ],
  [
    "100aa4c5",
    "a12c642f10",
    "MOV EAX,[0x102f642c]"
  ],
  [
    "100aa4ca",
    "3bc6",
    "CMP EAX,ESI"
  ],
  [
    "100aa4cc",
    "74da",
    "JZ 0x100aa4a8"
  ],
  [
    "100aa4ce",
    "8901",
    "MOV dword ptr [ECX],EAX"
  ],
  [
    "100aa4d0",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100aa4d2",
    "5e",
    "POP ESI"
  ],
  [
    "100aa4d3",
    "c3",
    "RET"
  ],
  [
    "100aa880",
    "8b4c240c",
    "MOV ECX,dword ptr [ESP + 0xc]"
  ],
  [
    "100aa884",
    "57",
    "PUSH EDI"
  ],
  [
    "100aa885",
    "85c9",
    "TEST ECX,ECX"
  ],
  [
    "100aa887",
    "0f8492000000",
    "JZ 0x100aa91f"
  ],
  [
    "100aa88d",
    "56",
    "PUSH ESI"
  ],
  [
    "100aa88e",
    "53",
    "PUSH EBX"
  ],
  [
    "100aa88f",
    "8bd9",
    "MOV EBX,ECX"
  ],
  [
    "100aa891",
    "8b742414",
    "MOV ESI,dword ptr [ESP + 0x14]"
  ],
  [
    "100aa895",
    "f7c603000000",
    "TEST ESI,0x3"
  ],
  [
    "100aa89b",
    "8b7c2410",
    "MOV EDI,dword ptr [ESP + 0x10]"
  ],
  [
    "100aa89f",
    "750b",
    "JNZ 0x100aa8ac"
  ],
  [
    "100aa8a1",
    "c1e902",
    "SHR ECX,0x2"
  ],
  [
    "100aa8a4",
    "0f8585000000",
    "JNZ 0x100aa92f"
  ],
  [
    "100aa8aa",
    "eb27",
    "JMP 0x100aa8d3"
  ],
  [
    "100aa8ac",
    "8a06",
    "MOV AL,byte ptr [ESI]"
  ],
  [
    "100aa8ae",
    "83c601",
    "ADD ESI,0x1"
  ],
  [
    "100aa8b1",
    "8807",
    "MOV byte ptr [EDI],AL"
  ],
  [
    "100aa8b3",
    "83c701",
    "ADD EDI,0x1"
  ],
  [
    "100aa8b6",
    "83e901",
    "SUB ECX,0x1"
  ],
  [
    "100aa8b9",
    "742b",
    "JZ 0x100aa8e6"
  ],
  [
    "100aa8bb",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100aa8bd",
    "742f",
    "JZ 0x100aa8ee"
  ],
  [
    "100aa8bf",
    "f7c603000000",
    "TEST ESI,0x3"
  ],
  [
    "100aa8c5",
    "75e5",
    "JNZ 0x100aa8ac"
  ],
  [
    "100aa8c7",
    "8bd9",
    "MOV EBX,ECX"
  ],
  [
    "100aa8c9",
    "c1e902",
    "SHR ECX,0x2"
  ],
  [
    "100aa8cc",
    "7561",
    "JNZ 0x100aa92f"
  ],
  [
    "100aa8ce",
    "83e303",
    "AND EBX,0x3"
  ],
  [
    "100aa8d1",
    "7413",
    "JZ 0x100aa8e6"
  ],
  [
    "100aa8d3",
    "8a06",
    "MOV AL,byte ptr [ESI]"
  ],
  [
    "100aa8d5",
    "83c601",
    "ADD ESI,0x1"
  ],
  [
    "100aa8d8",
    "8807",
    "MOV byte ptr [EDI],AL"
  ],
  [
    "100aa8da",
    "83c701",
    "ADD EDI,0x1"
  ],
  [
    "100aa8dd",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100aa8df",
    "7437",
    "JZ 0x100aa918"
  ],
  [
    "100aa8e1",
    "83eb01",
    "SUB EBX,0x1"
  ],
  [
    "100aa8e4",
    "75ed",
    "JNZ 0x100aa8d3"
  ],
  [
    "100aa8e6",
    "8b442410",
    "MOV EAX,dword ptr [ESP + 0x10]"
  ],
  [
    "100aa8ea",
    "5b",
    "POP EBX"
  ],
  [
    "100aa8eb",
    "5e",
    "POP ESI"
  ],
  [
    "100aa8ec",
    "5f",
    "POP EDI"
  ],
  [
    "100aa8ed",
    "c3",
    "RET"
  ],
  [
    "100aa8ee",
    "f7c703000000",
    "TEST EDI,0x3"
  ],
  [
    "100aa8f4",
    "7416",
    "JZ 0x100aa90c"
  ],
  [
    "100aa8f6",
    "8807",
    "MOV byte ptr [EDI],AL"
  ],
  [
    "100aa8f8",
    "83c701",
    "ADD EDI,0x1"
  ],
  [
    "100aa8fb",
    "83e901",
    "SUB ECX,0x1"
  ],
  [
    "100aa8fe",
    "0f8498000000",
    "JZ 0x100aa99c"
  ],
  [
    "100aa904",
    "f7c703000000",
    "TEST EDI,0x3"
  ],
  [
    "100aa90a",
    "75ea",
    "JNZ 0x100aa8f6"
  ],
  [
    "100aa90c",
    "8bd9",
    "MOV EBX,ECX"
  ],
  [
    "100aa90e",
    "c1e902",
    "SHR ECX,0x2"
  ],
  [
    "100aa911",
    "7574",
    "JNZ 0x100aa987"
  ],
  [
    "100aa913",
    "8807",
    "MOV byte ptr [EDI],AL"
  ],
  [
    "100aa915",
    "83c701",
    "ADD EDI,0x1"
  ],
  [
    "100aa918",
    "83eb01",
    "SUB EBX,0x1"
  ],
  [
    "100aa91b",
    "75f6",
    "JNZ 0x100aa913"
  ],
  [
    "100aa91d",
    "5b",
    "POP EBX"
  ],
  [
    "100aa91e",
    "5e",
    "POP ESI"
  ],
  [
    "100aa91f",
    "8b442408",
    "MOV EAX,dword ptr [ESP + 0x8]"
  ],
  [
    "100aa923",
    "5f",
    "POP EDI"
  ],
  [
    "100aa924",
    "c3",
    "RET"
  ],
  [
    "100aa925",
    "8917",
    "MOV dword ptr [EDI],EDX"
  ],
  [
    "100aa927",
    "83c704",
    "ADD EDI,0x4"
  ],
  [
    "100aa92a",
    "83e901",
    "SUB ECX,0x1"
  ],
  [
    "100aa92d",
    "749f",
    "JZ 0x100aa8ce"
  ],
  [
    "100aa92f",
    "bafffefe7e",
    "MOV EDX,0x7efefeff"
  ],
  [
    "100aa934",
    "8b06",
    "MOV EAX,dword ptr [ESI]"
  ],
  [
    "100aa936",
    "03d0",
    "ADD EDX,EAX"
  ],
  [
    "100aa938",
    "83f0ff",
    "XOR EAX,0xffffffff"
  ],
  [
    "100aa93b",
    "33c2",
    "XOR EAX,EDX"
  ],
  [
    "100aa93d",
    "8b16",
    "MOV EDX,dword ptr [ESI]"
  ],
  [
    "100aa93f",
    "83c604",
    "ADD ESI,0x4"
  ],
  [
    "100aa942",
    "a900010181",
    "TEST EAX,0x81010100"
  ],
  [
    "100aa947",
    "74dc",
    "JZ 0x100aa925"
  ],
  [
    "100aa949",
    "84d2",
    "TEST DL,DL"
  ],
  [
    "100aa94b",
    "742c",
    "JZ 0x100aa979"
  ],
  [
    "100aa94d",
    "84f6",
    "TEST DH,DH"
  ],
  [
    "100aa94f",
    "741e",
    "JZ 0x100aa96f"
  ],
  [
    "100aa951",
    "f7c20000ff00",
    "TEST EDX,0xff0000"
  ],
  [
    "100aa957",
    "740c",
    "JZ 0x100aa965"
  ],
  [
    "100aa959",
    "f7c2000000ff",
    "TEST EDX,0xff000000"
  ],
  [
    "100aa95f",
    "75c4",
    "JNZ 0x100aa925"
  ],
  [
    "100aa961",
    "8917",
    "MOV dword ptr [EDI],EDX"
  ],
  [
    "100aa963",
    "eb18",
    "JMP 0x100aa97d"
  ],
  [
    "100aa965",
    "81e2ffff0000",
    "AND EDX,0xffff"
  ],
  [
    "100aa96b",
    "8917",
    "MOV dword ptr [EDI],EDX"
  ],
  [
    "100aa96d",
    "eb0e",
    "JMP 0x100aa97d"
  ],
  [
    "100aa96f",
    "81e2ff000000",
    "AND EDX,0xff"
  ],
  [
    "100aa975",
    "8917",
    "MOV dword ptr [EDI],EDX"
  ],
  [
    "100aa977",
    "eb04",
    "JMP 0x100aa97d"
  ],
  [
    "100aa979",
    "33d2",
    "XOR EDX,EDX"
  ],
  [
    "100aa97b",
    "8917",
    "MOV dword ptr [EDI],EDX"
  ],
  [
    "100aa97d",
    "83c704",
    "ADD EDI,0x4"
  ],
  [
    "100aa980",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100aa982",
    "83e901",
    "SUB ECX,0x1"
  ],
  [
    "100aa985",
    "740c",
    "JZ 0x100aa993"
  ],
  [
    "100aa987",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100aa989",
    "8907",
    "MOV dword ptr [EDI],EAX"
  ],
  [
    "100aa98b",
    "83c704",
    "ADD EDI,0x4"
  ],
  [
    "100aa98e",
    "83e901",
    "SUB ECX,0x1"
  ],
  [
    "100aa991",
    "75f6",
    "JNZ 0x100aa989"
  ],
  [
    "100aa993",
    "83e303",
    "AND EBX,0x3"
  ],
  [
    "100aa996",
    "0f8577ffffff",
    "JNZ 0x100aa913"
  ],
  [
    "100aa99c",
    "8b442410",
    "MOV EAX,dword ptr [ESP + 0x10]"
  ],
  [
    "100aa9a0",
    "5b",
    "POP EBX"
  ],
  [
    "100aa9a1",
    "5e",
    "POP ESI"
  ],
  [
    "100aa9a2",
    "5f",
    "POP EDI"
  ],
  [
    "100aa9a3",
    "c3",
    "RET"
  ],
  [
    "100ac7cf",
    "53",
    "PUSH EBX"
  ],
  [
    "100ac7d0",
    "56",
    "PUSH ESI"
  ],
  [
    "100ac7d1",
    "8b74240c",
    "MOV ESI,dword ptr [ESP + 0xc]"
  ],
  [
    "100ac7d5",
    "57",
    "PUSH EDI"
  ],
  [
    "100ac7d6",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100ac7d8",
    "83cbff",
    "OR EBX,0xffffffff"
  ],
  [
    "100ac7db",
    "3bf7",
    "CMP ESI,EDI"
  ],
  [
    "100ac7dd",
    "751c",
    "JNZ 0x100ac7fb"
  ],
  [
    "100ac7df",
    "e8ed250000",
    "CALL 0x100aedd1"
  ],
  [
    "100ac7e4",
    "57",
    "PUSH EDI"
  ],
  [
    "100ac7e5",
    "57",
    "PUSH EDI"
  ],
  [
    "100ac7e6",
    "57",
    "PUSH EDI"
  ],
  [
    "100ac7e7",
    "57",
    "PUSH EDI"
  ],
  [
    "100ac7e8",
    "57",
    "PUSH EDI"
  ],
  [
    "100ac7e9",
    "c70016000000",
    "MOV dword ptr [EAX],0x16"
  ],
  [
    "100ac7ef",
    "e8de190000",
    "CALL 0x100ae1d2"
  ],
  [
    "100ac7f4",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100ac7f7",
    "0bc3",
    "OR EAX,EBX"
  ],
  [
    "100ac7f9",
    "eb42",
    "JMP 0x100ac83d"
  ],
  [
    "100ac7fb",
    "f6460c83",
    "TEST byte ptr [ESI + 0xc],0x83"
  ],
  [
    "100ac7ff",
    "7437",
    "JZ 0x100ac838"
  ],
  [
    "100ac801",
    "56",
    "PUSH ESI"
  ],
  [
    "100ac802",
    "e8a02f0100",
    "CALL 0x100bf7a7"
  ],
  [
    "100ac807",
    "56",
    "PUSH ESI"
  ],
  [
    "100ac808",
    "8bd8",
    "MOV EBX,EAX"
  ],
  [
    "100ac80a",
    "e86c2f0100",
    "CALL 0x100bf77b"
  ],
  [
    "100ac80f",
    "56",
    "PUSH ESI"
  ],
  [
    "100ac810",
    "e8dc2b0100",
    "CALL 0x100bf3f1"
  ],
  [
    "100ac815",
    "50",
    "PUSH EAX"
  ],
  [
    "100ac816",
    "e8932e0100",
    "CALL 0x100bf6ae"
  ],
  [
    "100ac81b",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100ac81e",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100ac820",
    "7d05",
    "JGE 0x100ac827"
  ],
  [
    "100ac822",
    "83cbff",
    "OR EBX,0xffffffff"
  ],
  [
    "100ac825",
    "eb11",
    "JMP 0x100ac838"
  ],
  [
    "100ac827",
    "8b461c",
    "MOV EAX,dword ptr [ESI + 0x1c]"
  ],
  [
    "100ac82a",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100ac82c",
    "740a",
    "JZ 0x100ac838"
  ],
  [
    "100ac82e",
    "50",
    "PUSH EAX"
  ],
  [
    "100ac82f",
    "e870e1ffff",
    "CALL 0x100aa9a4"
  ],
  [
    "100ac834",
    "59",
    "POP ECX"
  ],
  [
    "100ac835",
    "897e1c",
    "MOV dword ptr [ESI + 0x1c],EDI"
  ],
  [
    "100ac838",
    "897e0c",
    "MOV dword ptr [ESI + 0xc],EDI"
  ],
  [
    "100ac83b",
    "8bc3",
    "MOV EAX,EBX"
  ],
  [
    "100ac83d",
    "5f",
    "POP EDI"
  ],
  [
    "100ac83e",
    "5e",
    "POP ESI"
  ],
  [
    "100ac83f",
    "5b",
    "POP EBX"
  ],
  [
    "100ac840",
    "c3",
    "RET"
  ],
  [
    "100ac841",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "100ac843",
    "68d0860f10",
    "PUSH 0x100f86d0"
  ],
  [
    "100ac848",
    "e81b230000",
    "CALL 0x100aeb68"
  ],
  [
    "100ac84d",
    "834de4ff",
    "OR dword ptr [EBP + -0x1c],0xffffffff"
  ],
  [
    "100ac851",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100ac853",
    "8b7508",
    "MOV ESI,dword ptr [EBP + 0x8]"
  ],
  [
    "100ac856",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100ac858",
    "3bf7",
    "CMP ESI,EDI"
  ],
  [
    "100ac85a",
    "0f95c0",
    "SETNZ AL"
  ],
  [
    "100ac85d",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100ac85f",
    "751d",
    "JNZ 0x100ac87e"
  ],
  [
    "100ac861",
    "e86b250000",
    "CALL 0x100aedd1"
  ],
  [
    "100ac866",
    "c70016000000",
    "MOV dword ptr [EAX],0x16"
  ],
  [
    "100ac86c",
    "57",
    "PUSH EDI"
  ],
  [
    "100ac86d",
    "57",
    "PUSH EDI"
  ],
  [
    "100ac86e",
    "57",
    "PUSH EDI"
  ],
  [
    "100ac86f",
    "57",
    "PUSH EDI"
  ],
  [
    "100ac870",
    "57",
    "PUSH EDI"
  ],
  [
    "100ac871",
    "e85c190000",
    "CALL 0x100ae1d2"
  ],
  [
    "100ac876",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100ac879",
    "83c8ff",
    "OR EAX,0xffffffff"
  ],
  [
    "100ac87c",
    "eb0c",
    "JMP 0x100ac88a"
  ],
  [
    "100ac87e",
    "f6460c40",
    "TEST byte ptr [ESI + 0xc],0x40"
  ],
  [
    "100ac882",
    "740c",
    "JZ 0x100ac890"
  ],
  [
    "100ac884",
    "897e0c",
    "MOV dword ptr [ESI + 0xc],EDI"
  ],
  [
    "100ac887",
    "8b45e4",
    "MOV EAX,dword ptr [EBP + -0x1c]"
  ],
  [
    "100ac88a",
    "e81e230000",
    "CALL 0x100aebad"
  ],
  [
    "100ac88f",
    "c3",
    "RET"
  ],
  [
    "100ac890",
    "56",
    "PUSH ESI"
  ],
  [
    "100ac891",
    "e840270100",
    "CALL 0x100befd6"
  ],
  [
    "100ac896",
    "59",
    "POP ECX"
  ],
  [
    "100ac897",
    "897dfc",
    "MOV dword ptr [EBP + -0x4],EDI"
  ],
  [
    "100ac89a",
    "56",
    "PUSH ESI"
  ],
  [
    "100ac89b",
    "e82fffffff",
    "CALL 0x100ac7cf"
  ],
  [
    "100ac8a0",
    "59",
    "POP ECX"
  ],
  [
    "100ac8a1",
    "8945e4",
    "MOV dword ptr [EBP + -0x1c],EAX"
  ],
  [
    "100ac8a4",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100ac8ab",
    "e805000000",
    "CALL 0x100ac8b5"
  ],
  [
    "100ac8b0",
    "ebd5",
    "JMP 0x100ac887"
  ],
  [
    "100ac8b5",
    "56",
    "PUSH ESI"
  ],
  [
    "100ac8b6",
    "e885270100",
    "CALL 0x100bf040"
  ],
  [
    "100ac8bb",
    "59",
    "POP ECX"
  ],
  [
    "100ac8bc",
    "c3",
    "RET"
  ],
  [
    "100acbcf",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "100acbd1",
    "6830870f10",
    "PUSH 0x100f8730"
  ],
  [
    "100acbd6",
    "e88d1f0000",
    "CALL 0x100aeb68"
  ],
  [
    "100acbdb",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100acbdd",
    "895de4",
    "MOV dword ptr [EBP + -0x1c],EBX"
  ],
  [
    "100acbe0",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100acbe2",
    "8b7d08",
    "MOV EDI,dword ptr [EBP + 0x8]"
  ],
  [
    "100acbe5",
    "3bfb",
    "CMP EDI,EBX"
  ],
  [
    "100acbe7",
    "0f95c0",
    "SETNZ AL"
  ],
  [
    "100acbea",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100acbec",
    "751c",
    "JNZ 0x100acc0a"
  ],
  [
    "100acbee",
    "e8de210000",
    "CALL 0x100aedd1"
  ],
  [
    "100acbf3",
    "c70016000000",
    "MOV dword ptr [EAX],0x16"
  ],
  [
    "100acbf9",
    "53",
    "PUSH EBX"
  ],
  [
    "100acbfa",
    "53",
    "PUSH EBX"
  ],
  [
    "100acbfb",
    "53",
    "PUSH EBX"
  ],
  [
    "100acbfc",
    "53",
    "PUSH EBX"
  ],
  [
    "100acbfd",
    "53",
    "PUSH EBX"
  ],
  [
    "100acbfe",
    "e8cf150000",
    "CALL 0x100ae1d2"
  ],
  [
    "100acc03",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100acc06",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100acc08",
    "eb79",
    "JMP 0x100acc83"
  ],
  [
    "100acc0a",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100acc0c",
    "8b750c",
    "MOV ESI,dword ptr [EBP + 0xc]"
  ],
  [
    "100acc0f",
    "3bf3",
    "CMP ESI,EBX"
  ],
  [
    "100acc11",
    "0f95c0",
    "SETNZ AL"
  ],
  [
    "100acc14",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100acc16",
    "74d6",
    "JZ 0x100acbee"
  ],
  [
    "100acc18",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100acc1a",
    "381e",
    "CMP byte ptr [ESI],BL"
  ],
  [
    "100acc1c",
    "0f95c0",
    "SETNZ AL"
  ],
  [
    "100acc1f",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100acc21",
    "74cb",
    "JZ 0x100acbee"
  ],
  [
    "100acc23",
    "e847310100",
    "CALL 0x100bfd6f"
  ],
  [
    "100acc28",
    "894508",
    "MOV dword ptr [EBP + 0x8],EAX"
  ],
  [
    "100acc2b",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100acc2d",
    "750d",
    "JNZ 0x100acc3c"
  ],
  [
    "100acc2f",
    "e89d210000",
    "CALL 0x100aedd1"
  ],
  [
    "100acc34",
    "c70018000000",
    "MOV dword ptr [EAX],0x18"
  ],
  [
    "100acc3a",
    "ebca",
    "JMP 0x100acc06"
  ],
  [
    "100acc3c",
    "895dfc",
    "MOV dword ptr [EBP + -0x4],EBX"
  ],
  [
    "100acc3f",
    "381f",
    "CMP byte ptr [EDI],BL"
  ],
  [
    "100acc41",
    "7520",
    "JNZ 0x100acc63"
  ],
  [
    "100acc43",
    "e889210000",
    "CALL 0x100aedd1"
  ],
  [
    "100acc48",
    "c70016000000",
    "MOV dword ptr [EAX],0x16"
  ],
  [
    "100acc4e",
    "6afe",
    "PUSH -0x2"
  ],
  [
    "100acc50",
    "8d45f0",
    "LEA EAX,[EBP + -0x10]"
  ],
  [
    "100acc53",
    "50",
    "PUSH EAX"
  ],
  [
    "100acc54",
    "686c0d1410",
    "PUSH 0x10140d6c"
  ],
  [
    "100acc59",
    "e842320100",
    "CALL 0x100bfea0"
  ],
  [
    "100acc5e",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100acc61",
    "eba3",
    "JMP 0x100acc06"
  ],
  [
    "100acc63",
    "50",
    "PUSH EAX"
  ],
  [
    "100acc64",
    "ff7510",
    "PUSH dword ptr [EBP + 0x10]"
  ],
  [
    "100acc67",
    "56",
    "PUSH ESI"
  ],
  [
    "100acc68",
    "57",
    "PUSH EDI"
  ],
  [
    "100acc69",
    "e8612e0100",
    "CALL 0x100bfacf"
  ],
  [
    "100acc6e",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100acc71",
    "8945e4",
    "MOV dword ptr [EBP + -0x1c],EAX"
  ],
  [
    "100acc74",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100acc7b",
    "e809000000",
    "CALL 0x100acc89"
  ],
  [
    "100acc80",
    "8b45e4",
    "MOV EAX,dword ptr [EBP + -0x1c]"
  ],
  [
    "100acc83",
    "e8251f0000",
    "CALL 0x100aebad"
  ],
  [
    "100acc88",
    "c3",
    "RET"
  ],
  [
    "100acc89",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100acc8c",
    "e8af230100",
    "CALL 0x100bf040"
  ],
  [
    "100acc91",
    "59",
    "POP ECX"
  ],
  [
    "100acc92",
    "c3",
    "RET"
  ],
  [
    "100acc93",
    "6a40",
    "PUSH 0x40"
  ],
  [
    "100acc95",
    "ff74240c",
    "PUSH dword ptr [ESP + 0xc]"
  ],
  [
    "100acc99",
    "ff74240c",
    "PUSH dword ptr [ESP + 0xc]"
  ],
  [
    "100acc9d",
    "e82dffffff",
    "CALL 0x100acbcf"
  ],
  [
    "100acca2",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100acca5",
    "c3",
    "RET"
  ],
  [
    "100acd00",
    "55",
    "PUSH EBP"
  ],
  [
    "100acd01",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100acd03",
    "83ec2c",
    "SUB ESP,0x2c"
  ],
  [
    "100acd06",
    "a16c0d1410",
    "MOV EAX,[0x10140d6c]"
  ],
  [
    "100acd0b",
    "33c5",
    "XOR EAX,EBP"
  ],
  [
    "100acd0d",
    "8945fc",
    "MOV dword ptr [EBP + -0x4],EAX"
  ],
  [
    "100acd10",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100acd13",
    "53",
    "PUSH EBX"
  ],
  [
    "100acd14",
    "56",
    "PUSH ESI"
  ],
  [
    "100acd15",
    "8b750c",
    "MOV ESI,dword ptr [EBP + 0xc]"
  ],
  [
    "100acd18",
    "57",
    "PUSH EDI"
  ],
  [
    "100acd19",
    "8945d4",
    "MOV dword ptr [EBP + -0x2c],EAX"
  ],
  [
    "100acd1c",
    "e821180000",
    "CALL 0x100ae542"
  ],
  [
    "100acd21",
    "6a08",
    "PUSH 0x8"
  ],
  [
    "100acd23",
    "59",
    "POP ECX"
  ],
  [
    "100acd24",
    "8945d8",
    "MOV dword ptr [EBP + -0x28],EAX"
  ],
  [
    "100acd27",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100acd29",
    "8d7ddc",
    "LEA EDI,[EBP + -0x24]"
  ],
  [
    "100acd2c",
    "6a07",
    "PUSH 0x7"
  ],
  [
    "100acd2e",
    "f3ab",
    "STOSD.REP ES:EDI"
  ],
  [
    "100acd30",
    "5f",
    "POP EDI"
  ],
  [
    "100acd31",
    "8a16",
    "MOV DL,byte ptr [ESI]"
  ],
  [
    "100acd33",
    "0fb6ca",
    "MOVZX ECX,DL"
  ],
  [
    "100acd36",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "100acd38",
    "23cf",
    "AND ECX,EDI"
  ],
  [
    "100acd3a",
    "b301",
    "MOV BL,0x1"
  ],
  [
    "100acd3c",
    "d2e3",
    "SHL BL,CL"
  ],
  [
    "100acd3e",
    "c1e803",
    "SHR EAX,0x3"
  ],
  [
    "100acd41",
    "8d4405dc",
    "LEA EAX,[EBP + EAX*0x1 + -0x24]"
  ],
  [
    "100acd45",
    "0818",
    "OR byte ptr [EAX],BL"
  ],
  [
    "100acd47",
    "46",
    "INC ESI"
  ],
  [
    "100acd48",
    "84d2",
    "TEST DL,DL"
  ],
  [
    "100acd4a",
    "75e5",
    "JNZ 0x100acd31"
  ],
  [
    "100acd4c",
    "8b55d4",
    "MOV EDX,dword ptr [EBP + -0x2c]"
  ],
  [
    "100acd4f",
    "85d2",
    "TEST EDX,EDX"
  ],
  [
    "100acd51",
    "750d",
    "JNZ 0x100acd60"
  ],
  [
    "100acd53",
    "8b45d8",
    "MOV EAX,dword ptr [EBP + -0x28]"
  ],
  [
    "100acd56",
    "8b5018",
    "MOV EDX,dword ptr [EAX + 0x18]"
  ],
  [
    "100acd59",
    "eb05",
    "JMP 0x100acd60"
  ],
  [
    "100acd5b",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100acd5d",
    "741a",
    "JZ 0x100acd79"
  ],
  [
    "100acd5f",
    "42",
    "INC EDX"
  ],
  [
    "100acd60",
    "8a02",
    "MOV AL,byte ptr [EDX]"
  ],
  [
    "100acd62",
    "0fb6f0",
    "MOVZX ESI,AL"
  ],
  [
    "100acd65",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100acd67",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100acd69",
    "23cf",
    "AND ECX,EDI"
  ],
  [
    "100acd6b",
    "43",
    "INC EBX"
  ],
  [
    "100acd6c",
    "d3e3",
    "SHL EBX,CL"
  ],
  [
    "100acd6e",
    "c1ee03",
    "SHR ESI,0x3"
  ],
  [
    "100acd71",
    "8a4c35dc",
    "MOV CL,byte ptr [EBP + ESI*0x1 + -0x24]"
  ],
  [
    "100acd75",
    "84d9",
    "TEST CL,BL"
  ],
  [
    "100acd77",
    "75e2",
    "JNZ 0x100acd5b"
  ],
  [
    "100acd79",
    "8bda",
    "MOV EBX,EDX"
  ],
  [
    "100acd7b",
    "eb18",
    "JMP 0x100acd95"
  ],
  [
    "100acd7d",
    "0fb632",
    "MOVZX ESI,byte ptr [EDX]"
  ],
  [
    "100acd80",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100acd82",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100acd84",
    "23cf",
    "AND ECX,EDI"
  ],
  [
    "100acd86",
    "40",
    "INC EAX"
  ],
  [
    "100acd87",
    "d3e0",
    "SHL EAX,CL"
  ],
  [
    "100acd89",
    "c1ee03",
    "SHR ESI,0x3"
  ],
  [
    "100acd8c",
    "8a4c35dc",
    "MOV CL,byte ptr [EBP + ESI*0x1 + -0x24]"
  ],
  [
    "100acd90",
    "84c1",
    "TEST CL,AL"
  ],
  [
    "100acd92",
    "7508",
    "JNZ 0x100acd9c"
  ],
  [
    "100acd94",
    "42",
    "INC EDX"
  ],
  [
    "100acd95",
    "803a00",
    "CMP byte ptr [EDX],0x0"
  ],
  [
    "100acd98",
    "75e3",
    "JNZ 0x100acd7d"
  ],
  [
    "100acd9a",
    "eb04",
    "JMP 0x100acda0"
  ],
  [
    "100acd9c",
    "c60200",
    "MOV byte ptr [EDX],0x0"
  ],
  [
    "100acd9f",
    "42",
    "INC EDX"
  ],
  [
    "100acda0",
    "8b45d8",
    "MOV EAX,dword ptr [EBP + -0x28]"
  ],
  [
    "100acda3",
    "8b4dfc",
    "MOV ECX,dword ptr [EBP + -0x4]"
  ],
  [
    "100acda6",
    "895018",
    "MOV dword ptr [EAX + 0x18],EDX"
  ],
  [
    "100acda9",
    "8bc3",
    "MOV EAX,EBX"
  ],
  [
    "100acdab",
    "2bc2",
    "SUB EAX,EDX"
  ],
  [
    "100acdad",
    "f7d8",
    "NEG EAX"
  ],
  [
    "100acdaf",
    "1bc0",
    "SBB EAX,EAX"
  ],
  [
    "100acdb1",
    "5f",
    "POP EDI"
  ],
  [
    "100acdb2",
    "23c3",
    "AND EAX,EBX"
  ],
  [
    "100acdb4",
    "5e",
    "POP ESI"
  ],
  [
    "100acdb5",
    "33cd",
    "XOR ECX,EBP"
  ],
  [
    "100acdb7",
    "5b",
    "POP EBX"
  ],
  [
    "100acdb8",
    "e80b340000",
    "CALL 0x100b01c8"
  ],
  [
    "100acdbd",
    "c9",
    "LEAVE"
  ],
  [
    "100acdbe",
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
    "100ae1d2",
    "55",
    "PUSH EBP"
  ],
  [
    "100ae1d3",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100ae1d5",
    "ff35a0642f10",
    "PUSH dword ptr [0x102f64a0]"
  ],
  [
    "100ae1db",
    "e812010000",
    "CALL 0x100ae2f2"
  ],
  [
    "100ae1e0",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100ae1e2",
    "59",
    "POP ECX"
  ],
  [
    "100ae1e3",
    "7403",
    "JZ 0x100ae1e8"
  ],
  [
    "100ae1e5",
    "5d",
    "POP EBP"
  ],
  [
    "100ae1e6",
    "ffe0",
    "JMP EAX"
  ],
  [
    "100ae1e8",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100ae1ea",
    "e89f2c0100",
    "CALL 0x100c0e8e"
  ],
  [
    "100ae1ef",
    "59",
    "POP ECX"
  ],
  [
    "100ae1f0",
    "5d",
    "POP EBP"
  ],
  [
    "100ae1f1",
    "e9a8feffff",
    "JMP 0x100ae09e"
  ],
  [
    "100ae384",
    "56",
    "PUSH ESI"
  ],
  [
    "100ae385",
    "ff35480b1410",
    "PUSH dword ptr [0x10140b48]"
  ],
  [
    "100ae38b",
    "ff15b8972f10",
    "CALL dword ptr [0x102f97b8]"
  ],
  [
    "100ae391",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100ae393",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "100ae395",
    "751b",
    "JNZ 0x100ae3b2"
  ],
  [
    "100ae397",
    "ff35a8642f10",
    "PUSH dword ptr [0x102f64a8]"
  ],
  [
    "100ae39d",
    "e850ffffff",
    "CALL 0x100ae2f2"
  ],
  [
    "100ae3a2",
    "59",
    "POP ECX"
  ],
  [
    "100ae3a3",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100ae3a5",
    "56",
    "PUSH ESI"
  ],
  [
    "100ae3a6",
    "ff35480b1410",
    "PUSH dword ptr [0x10140b48]"
  ],
  [
    "100ae3ac",
    "ff15c0972f10",
    "CALL dword ptr [0x102f97c0]"
  ],
  [
    "100ae3b2",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100ae3b4",
    "5e",
    "POP ESI"
  ],
  [
    "100ae3b5",
    "c3",
    "RET"
  ],
  [
    "100ae4cb",
    "56",
    "PUSH ESI"
  ],
  [
    "100ae4cc",
    "57",
    "PUSH EDI"
  ],
  [
    "100ae4cd",
    "ff1580972f10",
    "CALL dword ptr [0x102f9780]"
  ],
  [
    "100ae4d3",
    "ff35440b1410",
    "PUSH dword ptr [0x10140b44]"
  ],
  [
    "100ae4d9",
    "8bf8",
    "MOV EDI,EAX"
  ],
  [
    "100ae4db",
    "e8a4feffff",
    "CALL 0x100ae384"
  ],
  [
    "100ae4e0",
    "ffd0",
    "CALL EAX"
  ],
  [
    "100ae4e2",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100ae4e4",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "100ae4e6",
    "754e",
    "JNZ 0x100ae536"
  ],
  [
    "100ae4e8",
    "6814020000",
    "PUSH 0x214"
  ],
  [
    "100ae4ed",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100ae4ef",
    "e81c0a0000",
    "CALL 0x100aef10"
  ],
  [
    "100ae4f4",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100ae4f6",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "100ae4f8",
    "59",
    "POP ECX"
  ],
  [
    "100ae4f9",
    "59",
    "POP ECX"
  ],
  [
    "100ae4fa",
    "743a",
    "JZ 0x100ae536"
  ],
  [
    "100ae4fc",
    "56",
    "PUSH ESI"
  ],
  [
    "100ae4fd",
    "ff35440b1410",
    "PUSH dword ptr [0x10140b44]"
  ],
  [
    "100ae503",
    "ff35ac642f10",
    "PUSH dword ptr [0x102f64ac]"
  ],
  [
    "100ae509",
    "e8e4fdffff",
    "CALL 0x100ae2f2"
  ],
  [
    "100ae50e",
    "59",
    "POP ECX"
  ],
  [
    "100ae50f",
    "ffd0",
    "CALL EAX"
  ],
  [
    "100ae511",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100ae513",
    "7418",
    "JZ 0x100ae52d"
  ],
  [
    "100ae515",
    "6a00",
    "PUSH 0x0"
  ],
  [
    "100ae517",
    "56",
    "PUSH ESI"
  ],
  [
    "100ae518",
    "e8effeffff",
    "CALL 0x100ae40c"
  ],
  [
    "100ae51d",
    "59",
    "POP ECX"
  ],
  [
    "100ae51e",
    "59",
    "POP ECX"
  ],
  [
    "100ae51f",
    "ff1520962f10",
    "CALL dword ptr [0x102f9620]"
  ],
  [
    "100ae525",
    "834e04ff",
    "OR dword ptr [ESI + 0x4],0xffffffff"
  ],
  [
    "100ae529",
    "8906",
    "MOV dword ptr [ESI],EAX"
  ],
  [
    "100ae52b",
    "eb09",
    "JMP 0x100ae536"
  ],
  [
    "100ae52d",
    "56",
    "PUSH ESI"
  ],
  [
    "100ae52e",
    "e871c4ffff",
    "CALL 0x100aa9a4"
  ],
  [
    "100ae533",
    "59",
    "POP ECX"
  ],
  [
    "100ae534",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100ae536",
    "57",
    "PUSH EDI"
  ],
  [
    "100ae537",
    "ff157c972f10",
    "CALL dword ptr [0x102f977c]"
  ],
  [
    "100ae53d",
    "5f",
    "POP EDI"
  ],
  [
    "100ae53e",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100ae540",
    "5e",
    "POP ESI"
  ],
  [
    "100ae541",
    "c3",
    "RET"
  ],
  [
    "100aed96",
    "8b442404",
    "MOV EAX,dword ptr [ESP + 0x4]"
  ],
  [
    "100aed9a",
    "33c9",
    "XOR ECX,ECX"
  ],
  [
    "100aed9c",
    "3b04cdd80b1410",
    "CMP EAX,dword ptr [ECX*0x8 + 0x10140bd8]"
  ],
  [
    "100aeda3",
    "7412",
    "JZ 0x100aedb7"
  ],
  [
    "100aeda5",
    "41",
    "INC ECX"
  ],
  [
    "100aeda6",
    "83f92d",
    "CMP ECX,0x2d"
  ],
  [
    "100aeda9",
    "72f1",
    "JC 0x100aed9c"
  ],
  [
    "100aedab",
    "8d48ed",
    "LEA ECX,[EAX + -0x13]"
  ],
  [
    "100aedae",
    "83f911",
    "CMP ECX,0x11"
  ],
  [
    "100aedb1",
    "770c",
    "JA 0x100aedbf"
  ],
  [
    "100aedb3",
    "6a0d",
    "PUSH 0xd"
  ],
  [
    "100aedb5",
    "58",
    "POP EAX"
  ],
  [
    "100aedb6",
    "c3",
    "RET"
  ],
  [
    "100aedb7",
    "8b04cddc0b1410",
    "MOV EAX,dword ptr [ECX*0x8 + 0x10140bdc]"
  ],
  [
    "100aedbe",
    "c3",
    "RET"
  ],
  [
    "100aedbf",
    "0544ffffff",
    "ADD EAX,0xffffff44"
  ],
  [
    "100aedc4",
    "6a0e",
    "PUSH 0xe"
  ],
  [
    "100aedc6",
    "59",
    "POP ECX"
  ],
  [
    "100aedc7",
    "3bc8",
    "CMP ECX,EAX"
  ],
  [
    "100aedc9",
    "1bc0",
    "SBB EAX,EAX"
  ],
  [
    "100aedcb",
    "23c1",
    "AND EAX,ECX"
  ],
  [
    "100aedcd",
    "83c008",
    "ADD EAX,0x8"
  ],
  [
    "100aedd0",
    "c3",
    "RET"
  ],
  [
    "100aedd1",
    "e8f5f6ffff",
    "CALL 0x100ae4cb"
  ],
  [
    "100aedd6",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100aedd8",
    "7506",
    "JNZ 0x100aede0"
  ],
  [
    "100aedda",
    "b8400d1410",
    "MOV EAX,0x10140d40"
  ],
  [
    "100aeddf",
    "c3",
    "RET"
  ],
  [
    "100aede0",
    "83c008",
    "ADD EAX,0x8"
  ],
  [
    "100aede3",
    "c3",
    "RET"
  ],
  [
    "100aede4",
    "e8e2f6ffff",
    "CALL 0x100ae4cb"
  ],
  [
    "100aede9",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100aedeb",
    "7506",
    "JNZ 0x100aedf3"
  ],
  [
    "100aeded",
    "b8440d1410",
    "MOV EAX,0x10140d44"
  ],
  [
    "100aedf2",
    "c3",
    "RET"
  ],
  [
    "100aedf3",
    "83c00c",
    "ADD EAX,0xc"
  ],
  [
    "100aedf6",
    "c3",
    "RET"
  ],
  [
    "100aedf7",
    "56",
    "PUSH ESI"
  ],
  [
    "100aedf8",
    "e8e7ffffff",
    "CALL 0x100aede4"
  ],
  [
    "100aedfd",
    "8b4c2408",
    "MOV ECX,dword ptr [ESP + 0x8]"
  ],
  [
    "100aee01",
    "51",
    "PUSH ECX"
  ],
  [
    "100aee02",
    "8908",
    "MOV dword ptr [EAX],ECX"
  ],
  [
    "100aee04",
    "e88dffffff",
    "CALL 0x100aed96"
  ],
  [
    "100aee09",
    "59",
    "POP ECX"
  ],
  [
    "100aee0a",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100aee0c",
    "e8c0ffffff",
    "CALL 0x100aedd1"
  ],
  [
    "100aee11",
    "8930",
    "MOV dword ptr [EAX],ESI"
  ],
  [
    "100aee13",
    "5e",
    "POP ESI"
  ],
  [
    "100aee14",
    "c3",
    "RET"
  ],
  [
    "100b2b0b",
    "55",
    "PUSH EBP"
  ],
  [
    "100b2b0c",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100b2b0e",
    "83ec18",
    "SUB ESP,0x18"
  ],
  [
    "100b2b11",
    "53",
    "PUSH EBX"
  ],
  [
    "100b2b12",
    "ff7510",
    "PUSH dword ptr [EBP + 0x10]"
  ],
  [
    "100b2b15",
    "8d4de8",
    "LEA ECX,[EBP + -0x18]"
  ],
  [
    "100b2b18",
    "e89949ffff",
    "CALL 0x100a74b6"
  ],
  [
    "100b2b1d",
    "8b5d08",
    "MOV EBX,dword ptr [EBP + 0x8]"
  ],
  [
    "100b2b20",
    "8d4301",
    "LEA EAX,[EBX + 0x1]"
  ],
  [
    "100b2b23",
    "3d00010000",
    "CMP EAX,0x100"
  ],
  [
    "100b2b28",
    "770f",
    "JA 0x100b2b39"
  ],
  [
    "100b2b2a",
    "8b45e8",
    "MOV EAX,dword ptr [EBP + -0x18]"
  ],
  [
    "100b2b2d",
    "8b80c8000000",
    "MOV EAX,dword ptr [EAX + 0xc8]"
  ],
  [
    "100b2b33",
    "0fb70458",
    "MOVZX EAX,word ptr [EAX + EBX*0x2]"
  ],
  [
    "100b2b37",
    "eb75",
    "JMP 0x100b2bae"
  ],
  [
    "100b2b39",
    "895d08",
    "MOV dword ptr [EBP + 0x8],EBX"
  ],
  [
    "100b2b3c",
    "c17d0808",
    "SAR dword ptr [EBP + 0x8],0x8"
  ],
  [
    "100b2b40",
    "8d45e8",
    "LEA EAX,[EBP + -0x18]"
  ],
  [
    "100b2b43",
    "50",
    "PUSH EAX"
  ],
  [
    "100b2b44",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100b2b47",
    "25ff000000",
    "AND EAX,0xff"
  ],
  [
    "100b2b4c",
    "50",
    "PUSH EAX"
  ],
  [
    "100b2b4d",
    "e8616effff",
    "CALL 0x100a99b3"
  ],
  [
    "100b2b52",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b2b54",
    "59",
    "POP ECX"
  ],
  [
    "100b2b55",
    "59",
    "POP ECX"
  ],
  [
    "100b2b56",
    "7412",
    "JZ 0x100b2b6a"
  ],
  [
    "100b2b58",
    "8a4508",
    "MOV AL,byte ptr [EBP + 0x8]"
  ],
  [
    "100b2b5b",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100b2b5d",
    "8845f8",
    "MOV byte ptr [EBP + -0x8],AL"
  ],
  [
    "100b2b60",
    "885df9",
    "MOV byte ptr [EBP + -0x7],BL"
  ],
  [
    "100b2b63",
    "c645fa00",
    "MOV byte ptr [EBP + -0x6],0x0"
  ],
  [
    "100b2b67",
    "59",
    "POP ECX"
  ],
  [
    "100b2b68",
    "eb0a",
    "JMP 0x100b2b74"
  ],
  [
    "100b2b6a",
    "33c9",
    "XOR ECX,ECX"
  ],
  [
    "100b2b6c",
    "885df8",
    "MOV byte ptr [EBP + -0x8],BL"
  ],
  [
    "100b2b6f",
    "c645f900",
    "MOV byte ptr [EBP + -0x7],0x0"
  ],
  [
    "100b2b73",
    "41",
    "INC ECX"
  ],
  [
    "100b2b74",
    "8b45e8",
    "MOV EAX,dword ptr [EBP + -0x18]"
  ],
  [
    "100b2b77",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100b2b79",
    "ff7014",
    "PUSH dword ptr [EAX + 0x14]"
  ],
  [
    "100b2b7c",
    "ff7004",
    "PUSH dword ptr [EAX + 0x4]"
  ],
  [
    "100b2b7f",
    "8d45fc",
    "LEA EAX,[EBP + -0x4]"
  ],
  [
    "100b2b82",
    "50",
    "PUSH EAX"
  ],
  [
    "100b2b83",
    "51",
    "PUSH ECX"
  ],
  [
    "100b2b84",
    "8d45f8",
    "LEA EAX,[EBP + -0x8]"
  ],
  [
    "100b2b87",
    "50",
    "PUSH EAX"
  ],
  [
    "100b2b88",
    "8d45e8",
    "LEA EAX,[EBP + -0x18]"
  ],
  [
    "100b2b8b",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100b2b8d",
    "50",
    "PUSH EAX"
  ],
  [
    "100b2b8e",
    "e8ac440100",
    "CALL 0x100c703f"
  ],
  [
    "100b2b93",
    "83c420",
    "ADD ESP,0x20"
  ],
  [
    "100b2b96",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b2b98",
    "7510",
    "JNZ 0x100b2baa"
  ],
  [
    "100b2b9a",
    "3845f4",
    "CMP byte ptr [EBP + -0xc],AL"
  ],
  [
    "100b2b9d",
    "7407",
    "JZ 0x100b2ba6"
  ],
  [
    "100b2b9f",
    "8b45f0",
    "MOV EAX,dword ptr [EBP + -0x10]"
  ],
  [
    "100b2ba2",
    "836070fd",
    "AND dword ptr [EAX + 0x70],0xfffffffd"
  ],
  [
    "100b2ba6",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100b2ba8",
    "eb14",
    "JMP 0x100b2bbe"
  ],
  [
    "100b2baa",
    "0fb745fc",
    "MOVZX EAX,word ptr [EBP + -0x4]"
  ],
  [
    "100b2bae",
    "23450c",
    "AND EAX,dword ptr [EBP + 0xc]"
  ],
  [
    "100b2bb1",
    "807df400",
    "CMP byte ptr [EBP + -0xc],0x0"
  ],
  [
    "100b2bb5",
    "7407",
    "JZ 0x100b2bbe"
  ],
  [
    "100b2bb7",
    "8b4df0",
    "MOV ECX,dword ptr [EBP + -0x10]"
  ],
  [
    "100b2bba",
    "836170fd",
    "AND dword ptr [ECX + 0x70],0xfffffffd"
  ],
  [
    "100b2bbe",
    "5b",
    "POP EBX"
  ],
  [
    "100b2bbf",
    "c9",
    "LEAVE"
  ],
  [
    "100b2bc0",
    "c3",
    "RET"
  ],
  [
    "100b44b4",
    "55",
    "PUSH EBP"
  ],
  [
    "100b44b5",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100b44b7",
    "83ec14",
    "SUB ESP,0x14"
  ],
  [
    "100b44ba",
    "56",
    "PUSH ESI"
  ],
  [
    "100b44bb",
    "57",
    "PUSH EDI"
  ],
  [
    "100b44bc",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100b44bf",
    "8d4dec",
    "LEA ECX,[EBP + -0x14]"
  ],
  [
    "100b44c2",
    "e8ef2fffff",
    "CALL 0x100a74b6"
  ],
  [
    "100b44c7",
    "8b4510",
    "MOV EAX,dword ptr [EBP + 0x10]"
  ],
  [
    "100b44ca",
    "8b750c",
    "MOV ESI,dword ptr [EBP + 0xc]"
  ],
  [
    "100b44cd",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100b44cf",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100b44d1",
    "7402",
    "JZ 0x100b44d5"
  ],
  [
    "100b44d3",
    "8930",
    "MOV dword ptr [EAX],ESI"
  ],
  [
    "100b44d5",
    "3bf7",
    "CMP ESI,EDI"
  ],
  [
    "100b44d7",
    "752c",
    "JNZ 0x100b4505"
  ],
  [
    "100b44d9",
    "e8f3a8ffff",
    "CALL 0x100aedd1"
  ],
  [
    "100b44de",
    "57",
    "PUSH EDI"
  ],
  [
    "100b44df",
    "57",
    "PUSH EDI"
  ],
  [
    "100b44e0",
    "57",
    "PUSH EDI"
  ],
  [
    "100b44e1",
    "57",
    "PUSH EDI"
  ],
  [
    "100b44e2",
    "57",
    "PUSH EDI"
  ],
  [
    "100b44e3",
    "c70016000000",
    "MOV dword ptr [EAX],0x16"
  ],
  [
    "100b44e9",
    "e8e49cffff",
    "CALL 0x100ae1d2"
  ],
  [
    "100b44ee",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100b44f1",
    "807df800",
    "CMP byte ptr [EBP + -0x8],0x0"
  ],
  [
    "100b44f5",
    "7407",
    "JZ 0x100b44fe"
  ],
  [
    "100b44f7",
    "8b45f4",
    "MOV EAX,dword ptr [EBP + -0xc]"
  ],
  [
    "100b44fa",
    "836070fd",
    "AND dword ptr [EAX + 0x70],0xfffffffd"
  ],
  [
    "100b44fe",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100b4500",
    "e9d6010000",
    "JMP 0x100b46db"
  ],
  [
    "100b4505",
    "397d14",
    "CMP dword ptr [EBP + 0x14],EDI"
  ],
  [
    "100b4508",
    "740c",
    "JZ 0x100b4516"
  ],
  [
    "100b450a",
    "837d1402",
    "CMP dword ptr [EBP + 0x14],0x2"
  ],
  [
    "100b450e",
    "7cc9",
    "JL 0x100b44d9"
  ],
  [
    "100b4510",
    "837d1424",
    "CMP dword ptr [EBP + 0x14],0x24"
  ],
  [
    "100b4514",
    "7fc3",
    "JG 0x100b44d9"
  ],
  [
    "100b4516",
    "8b4dec",
    "MOV ECX,dword ptr [EBP + -0x14]"
  ],
  [
    "100b4519",
    "53",
    "PUSH EBX"
  ],
  [
    "100b451a",
    "8a1e",
    "MOV BL,byte ptr [ESI]"
  ],
  [
    "100b451c",
    "897dfc",
    "MOV dword ptr [EBP + -0x4],EDI"
  ],
  [
    "100b451f",
    "8d7e01",
    "LEA EDI,[ESI + 0x1]"
  ],
  [
    "100b4522",
    "83b9ac00000001",
    "CMP dword ptr [ECX + 0xac],0x1"
  ],
  [
    "100b4529",
    "7e17",
    "JLE 0x100b4542"
  ],
  [
    "100b452b",
    "8d45ec",
    "LEA EAX,[EBP + -0x14]"
  ],
  [
    "100b452e",
    "50",
    "PUSH EAX"
  ],
  [
    "100b452f",
    "0fb6c3",
    "MOVZX EAX,BL"
  ],
  [
    "100b4532",
    "6a08",
    "PUSH 0x8"
  ],
  [
    "100b4534",
    "50",
    "PUSH EAX"
  ],
  [
    "100b4535",
    "e8d1e5ffff",
    "CALL 0x100b2b0b"
  ],
  [
    "100b453a",
    "8b4dec",
    "MOV ECX,dword ptr [EBP + -0x14]"
  ],
  [
    "100b453d",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100b4540",
    "eb10",
    "JMP 0x100b4552"
  ],
  [
    "100b4542",
    "8b91c8000000",
    "MOV EDX,dword ptr [ECX + 0xc8]"
  ],
  [
    "100b4548",
    "0fb6c3",
    "MOVZX EAX,BL"
  ],
  [
    "100b454b",
    "0fb60442",
    "MOVZX EAX,byte ptr [EDX + EAX*0x2]"
  ],
  [
    "100b454f",
    "83e008",
    "AND EAX,0x8"
  ],
  [
    "100b4552",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b4554",
    "7405",
    "JZ 0x100b455b"
  ],
  [
    "100b4556",
    "8a1f",
    "MOV BL,byte ptr [EDI]"
  ],
  [
    "100b4558",
    "47",
    "INC EDI"
  ],
  [
    "100b4559",
    "ebc7",
    "JMP 0x100b4522"
  ],
  [
    "100b455b",
    "80fb2d",
    "CMP BL,0x2d"
  ],
  [
    "100b455e",
    "7506",
    "JNZ 0x100b4566"
  ],
  [
    "100b4560",
    "834d1802",
    "OR dword ptr [EBP + 0x18],0x2"
  ],
  [
    "100b4564",
    "eb05",
    "JMP 0x100b456b"
  ],
  [
    "100b4566",
    "80fb2b",
    "CMP BL,0x2b"
  ],
  [
    "100b4569",
    "7503",
    "JNZ 0x100b456e"
  ],
  [
    "100b456b",
    "8a1f",
    "MOV BL,byte ptr [EDI]"
  ],
  [
    "100b456d",
    "47",
    "INC EDI"
  ],
  [
    "100b456e",
    "8b4514",
    "MOV EAX,dword ptr [EBP + 0x14]"
  ],
  [
    "100b4571",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b4573",
    "0f8c49010000",
    "JL 0x100b46c2"
  ],
  [
    "100b4579",
    "83f801",
    "CMP EAX,0x1"
  ],
  [
    "100b457c",
    "0f8440010000",
    "JZ 0x100b46c2"
  ],
  [
    "100b4582",
    "83f824",
    "CMP EAX,0x24"
  ],
  [
    "100b4585",
    "0f8f37010000",
    "JG 0x100b46c2"
  ],
  [
    "100b458b",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b458d",
    "752a",
    "JNZ 0x100b45b9"
  ],
  [
    "100b458f",
    "80fb30",
    "CMP BL,0x30"
  ],
  [
    "100b4592",
    "7409",
    "JZ 0x100b459d"
  ],
  [
    "100b4594",
    "c745140a000000",
    "MOV dword ptr [EBP + 0x14],0xa"
  ],
  [
    "100b459b",
    "eb34",
    "JMP 0x100b45d1"
  ],
  [
    "100b459d",
    "8a07",
    "MOV AL,byte ptr [EDI]"
  ],
  [
    "100b459f",
    "3c78",
    "CMP AL,0x78"
  ],
  [
    "100b45a1",
    "740d",
    "JZ 0x100b45b0"
  ],
  [
    "100b45a3",
    "3c58",
    "CMP AL,0x58"
  ],
  [
    "100b45a5",
    "7409",
    "JZ 0x100b45b0"
  ],
  [
    "100b45a7",
    "c7451408000000",
    "MOV dword ptr [EBP + 0x14],0x8"
  ],
  [
    "100b45ae",
    "eb21",
    "JMP 0x100b45d1"
  ],
  [
    "100b45b0",
    "c7451410000000",
    "MOV dword ptr [EBP + 0x14],0x10"
  ],
  [
    "100b45b7",
    "eb0a",
    "JMP 0x100b45c3"
  ],
  [
    "100b45b9",
    "83f810",
    "CMP EAX,0x10"
  ],
  [
    "100b45bc",
    "7513",
    "JNZ 0x100b45d1"
  ],
  [
    "100b45be",
    "80fb30",
    "CMP BL,0x30"
  ],
  [
    "100b45c1",
    "750e",
    "JNZ 0x100b45d1"
  ],
  [
    "100b45c3",
    "8a07",
    "MOV AL,byte ptr [EDI]"
  ],
  [
    "100b45c5",
    "3c78",
    "CMP AL,0x78"
  ],
  [
    "100b45c7",
    "7404",
    "JZ 0x100b45cd"
  ],
  [
    "100b45c9",
    "3c58",
    "CMP AL,0x58"
  ],
  [
    "100b45cb",
    "7504",
    "JNZ 0x100b45d1"
  ],
  [
    "100b45cd",
    "47",
    "INC EDI"
  ],
  [
    "100b45ce",
    "8a1f",
    "MOV BL,byte ptr [EDI]"
  ],
  [
    "100b45d0",
    "47",
    "INC EDI"
  ],
  [
    "100b45d1",
    "8bb1c8000000",
    "MOV ESI,dword ptr [ECX + 0xc8]"
  ],
  [
    "100b45d7",
    "83c8ff",
    "OR EAX,0xffffffff"
  ],
  [
    "100b45da",
    "33d2",
    "XOR EDX,EDX"
  ],
  [
    "100b45dc",
    "f77514",
    "DIV dword ptr [EBP + 0x14]"
  ],
  [
    "100b45df",
    "0fb6cb",
    "MOVZX ECX,BL"
  ],
  [
    "100b45e2",
    "0fb70c4e",
    "MOVZX ECX,word ptr [ESI + ECX*0x2]"
  ],
  [
    "100b45e6",
    "f6c104",
    "TEST CL,0x4"
  ],
  [
    "100b45e9",
    "7408",
    "JZ 0x100b45f3"
  ],
  [
    "100b45eb",
    "0fbecb",
    "MOVSX ECX,BL"
  ],
  [
    "100b45ee",
    "83e930",
    "SUB ECX,0x30"
  ],
  [
    "100b45f1",
    "eb1a",
    "JMP 0x100b460d"
  ],
  [
    "100b45f3",
    "66f7c10301",
    "TEST CX,0x103"
  ],
  [
    "100b45f8",
    "7431",
    "JZ 0x100b462b"
  ],
  [
    "100b45fa",
    "8acb",
    "MOV CL,BL"
  ],
  [
    "100b45fc",
    "80e961",
    "SUB CL,0x61"
  ],
  [
    "100b45ff",
    "80f919",
    "CMP CL,0x19"
  ],
  [
    "100b4602",
    "0fbecb",
    "MOVSX ECX,BL"
  ],
  [
    "100b4605",
    "7703",
    "JA 0x100b460a"
  ],
  [
    "100b4607",
    "83e920",
    "SUB ECX,0x20"
  ],
  [
    "100b460a",
    "83c1c9",
    "ADD ECX,-0x37"
  ],
  [
    "100b460d",
    "3b4d14",
    "CMP ECX,dword ptr [EBP + 0x14]"
  ],
  [
    "100b4610",
    "7319",
    "JNC 0x100b462b"
  ],
  [
    "100b4612",
    "834d1808",
    "OR dword ptr [EBP + 0x18],0x8"
  ],
  [
    "100b4616",
    "3945fc",
    "CMP dword ptr [EBP + -0x4],EAX"
  ],
  [
    "100b4619",
    "7227",
    "JC 0x100b4642"
  ],
  [
    "100b461b",
    "7504",
    "JNZ 0x100b4621"
  ],
  [
    "100b461d",
    "3bca",
    "CMP ECX,EDX"
  ],
  [
    "100b461f",
    "7621",
    "JBE 0x100b4642"
  ],
  [
    "100b4621",
    "834d1804",
    "OR dword ptr [EBP + 0x18],0x4"
  ],
  [
    "100b4625",
    "837d1000",
    "CMP dword ptr [EBP + 0x10],0x0"
  ],
  [
    "100b4629",
    "7523",
    "JNZ 0x100b464e"
  ],
  [
    "100b462b",
    "8b4518",
    "MOV EAX,dword ptr [EBP + 0x18]"
  ],
  [
    "100b462e",
    "4f",
    "DEC EDI"
  ],
  [
    "100b462f",
    "a808",
    "TEST AL,0x8"
  ],
  [
    "100b4631",
    "7520",
    "JNZ 0x100b4653"
  ],
  [
    "100b4633",
    "837d1000",
    "CMP dword ptr [EBP + 0x10],0x0"
  ],
  [
    "100b4637",
    "7403",
    "JZ 0x100b463c"
  ],
  [
    "100b4639",
    "8b7d0c",
    "MOV EDI,dword ptr [EBP + 0xc]"
  ],
  [
    "100b463c",
    "8365fc00",
    "AND dword ptr [EBP + -0x4],0x0"
  ],
  [
    "100b4640",
    "eb5c",
    "JMP 0x100b469e"
  ],
  [
    "100b4642",
    "8b5dfc",
    "MOV EBX,dword ptr [EBP + -0x4]"
  ],
  [
    "100b4645",
    "0faf5d14",
    "IMUL EBX,dword ptr [EBP + 0x14]"
  ],
  [
    "100b4649",
    "03d9",
    "ADD EBX,ECX"
  ],
  [
    "100b464b",
    "895dfc",
    "MOV dword ptr [EBP + -0x4],EBX"
  ],
  [
    "100b464e",
    "8a1f",
    "MOV BL,byte ptr [EDI]"
  ],
  [
    "100b4650",
    "47",
    "INC EDI"
  ],
  [
    "100b4651",
    "eb8c",
    "JMP 0x100b45df"
  ],
  [
    "100b4653",
    "a804",
    "TEST AL,0x4"
  ],
  [
    "100b4655",
    "beffffff7f",
    "MOV ESI,0x7fffffff"
  ],
  [
    "100b465a",
    "751b",
    "JNZ 0x100b4677"
  ],
  [
    "100b465c",
    "a801",
    "TEST AL,0x1"
  ],
  [
    "100b465e",
    "753e",
    "JNZ 0x100b469e"
  ],
  [
    "100b4660",
    "83e002",
    "AND EAX,0x2"
  ],
  [
    "100b4663",
    "7409",
    "JZ 0x100b466e"
  ],
  [
    "100b4665",
    "817dfc00000080",
    "CMP dword ptr [EBP + -0x4],0x80000000"
  ],
  [
    "100b466c",
    "7709",
    "JA 0x100b4677"
  ],
  [
    "100b466e",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b4670",
    "752c",
    "JNZ 0x100b469e"
  ],
  [
    "100b4672",
    "3975fc",
    "CMP dword ptr [EBP + -0x4],ESI"
  ],
  [
    "100b4675",
    "7627",
    "JBE 0x100b469e"
  ],
  [
    "100b4677",
    "e855a7ffff",
    "CALL 0x100aedd1"
  ],
  [
    "100b467c",
    "f6451801",
    "TEST byte ptr [EBP + 0x18],0x1"
  ],
  [
    "100b4680",
    "c70022000000",
    "MOV dword ptr [EAX],0x22"
  ],
  [
    "100b4686",
    "7406",
    "JZ 0x100b468e"
  ],
  [
    "100b4688",
    "834dfcff",
    "OR dword ptr [EBP + -0x4],0xffffffff"
  ],
  [
    "100b468c",
    "eb10",
    "JMP 0x100b469e"
  ],
  [
    "100b468e",
    "8a4518",
    "MOV AL,byte ptr [EBP + 0x18]"
  ],
  [
    "100b4691",
    "2402",
    "AND AL,0x2"
  ],
  [
    "100b4693",
    "f6d8",
    "NEG AL"
  ],
  [
    "100b4695",
    "1bc0",
    "SBB EAX,EAX"
  ],
  [
    "100b4697",
    "f7d8",
    "NEG EAX"
  ],
  [
    "100b4699",
    "03c6",
    "ADD EAX,ESI"
  ],
  [
    "100b469b",
    "8945fc",
    "MOV dword ptr [EBP + -0x4],EAX"
  ],
  [
    "100b469e",
    "8b4510",
    "MOV EAX,dword ptr [EBP + 0x10]"
  ],
  [
    "100b46a1",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b46a3",
    "7402",
    "JZ 0x100b46a7"
  ],
  [
    "100b46a5",
    "8938",
    "MOV dword ptr [EAX],EDI"
  ],
  [
    "100b46a7",
    "f6451802",
    "TEST byte ptr [EBP + 0x18],0x2"
  ],
  [
    "100b46ab",
    "7403",
    "JZ 0x100b46b0"
  ],
  [
    "100b46ad",
    "f75dfc",
    "NEG dword ptr [EBP + -0x4]"
  ],
  [
    "100b46b0",
    "807df800",
    "CMP byte ptr [EBP + -0x8],0x0"
  ],
  [
    "100b46b4",
    "7407",
    "JZ 0x100b46bd"
  ],
  [
    "100b46b6",
    "8b45f4",
    "MOV EAX,dword ptr [EBP + -0xc]"
  ],
  [
    "100b46b9",
    "836070fd",
    "AND dword ptr [EAX + 0x70],0xfffffffd"
  ],
  [
    "100b46bd",
    "8b45fc",
    "MOV EAX,dword ptr [EBP + -0x4]"
  ],
  [
    "100b46c0",
    "eb18",
    "JMP 0x100b46da"
  ],
  [
    "100b46c2",
    "8b4510",
    "MOV EAX,dword ptr [EBP + 0x10]"
  ],
  [
    "100b46c5",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100b46c7",
    "7402",
    "JZ 0x100b46cb"
  ],
  [
    "100b46c9",
    "8930",
    "MOV dword ptr [EAX],ESI"
  ],
  [
    "100b46cb",
    "807df800",
    "CMP byte ptr [EBP + -0x8],0x0"
  ],
  [
    "100b46cf",
    "7407",
    "JZ 0x100b46d8"
  ],
  [
    "100b46d1",
    "8b45f4",
    "MOV EAX,dword ptr [EBP + -0xc]"
  ],
  [
    "100b46d4",
    "836070fd",
    "AND dword ptr [EAX + 0x70],0xfffffffd"
  ],
  [
    "100b46d8",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100b46da",
    "5b",
    "POP EBX"
  ],
  [
    "100b46db",
    "5f",
    "POP EDI"
  ],
  [
    "100b46dc",
    "5e",
    "POP ESI"
  ],
  [
    "100b46dd",
    "c9",
    "LEAVE"
  ],
  [
    "100b46de",
    "c3",
    "RET"
  ],
  [
    "100b46df",
    "55",
    "PUSH EBP"
  ],
  [
    "100b46e0",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100b46e2",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100b46e4",
    "39052c692f10",
    "CMP dword ptr [0x102f692c],EAX"
  ],
  [
    "100b46ea",
    "50",
    "PUSH EAX"
  ],
  [
    "100b46eb",
    "ff7510",
    "PUSH dword ptr [EBP + 0x10]"
  ],
  [
    "100b46ee",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100b46f1",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100b46f4",
    "7507",
    "JNZ 0x100b46fd"
  ],
  [
    "100b46f6",
    "6870141410",
    "PUSH 0x10141470"
  ],
  [
    "100b46fb",
    "eb01",
    "JMP 0x100b46fe"
  ],
  [
    "100b46fd",
    "50",
    "PUSH EAX"
  ],
  [
    "100b46fe",
    "e8b1fdffff",
    "CALL 0x100b44b4"
  ],
  [
    "100b4703",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100b4706",
    "5d",
    "POP EBP"
  ],
  [
    "100b4707",
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
    "100bbf17",
    "ff742404",
    "PUSH dword ptr [ESP + 0x4]"
  ],
  [
    "100bbf1b",
    "ff15f4952f10",
    "CALL dword ptr [0x102f95f4]"
  ],
  [
    "100bbf21",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100bbf23",
    "40",
    "INC EAX"
  ],
  [
    "100bbf24",
    "c20800",
    "RET 0x8"
  ],
  [
    "100bbf27",
    "6a14",
    "PUSH 0x14"
  ],
  [
    "100bbf29",
    "68188d0f10",
    "PUSH 0x100f8d18"
  ],
  [
    "100bbf2e",
    "e8352cffff",
    "CALL 0x100aeb68"
  ],
  [
    "100bbf33",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100bbf35",
    "897de4",
    "MOV dword ptr [EBP + -0x1c],EDI"
  ],
  [
    "100bbf38",
    "ff35c06a2f10",
    "PUSH dword ptr [0x102f6ac0]"
  ],
  [
    "100bbf3e",
    "e8af23ffff",
    "CALL 0x100ae2f2"
  ],
  [
    "100bbf43",
    "59",
    "POP ECX"
  ],
  [
    "100bbf44",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100bbf46",
    "3bf7",
    "CMP ESI,EDI"
  ],
  [
    "100bbf48",
    "7553",
    "JNZ 0x100bbf9d"
  ],
  [
    "100bbf4a",
    "8d45e4",
    "LEA EAX,[EBP + -0x1c]"
  ],
  [
    "100bbf4d",
    "50",
    "PUSH EAX"
  ],
  [
    "100bbf4e",
    "e84ae5feff",
    "CALL 0x100aa49d"
  ],
  [
    "100bbf53",
    "59",
    "POP ECX"
  ],
  [
    "100bbf54",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100bbf56",
    "740d",
    "JZ 0x100bbf65"
  ],
  [
    "100bbf58",
    "57",
    "PUSH EDI"
  ],
  [
    "100bbf59",
    "57",
    "PUSH EDI"
  ],
  [
    "100bbf5a",
    "57",
    "PUSH EDI"
  ],
  [
    "100bbf5b",
    "57",
    "PUSH EDI"
  ],
  [
    "100bbf5c",
    "57",
    "PUSH EDI"
  ],
  [
    "100bbf5d",
    "e83c21ffff",
    "CALL 0x100ae09e"
  ],
  [
    "100bbf65",
    "837de401",
    "CMP dword ptr [EBP + -0x1c],0x1"
  ],
  [
    "100bbf69",
    "7421",
    "JZ 0x100bbf8c"
  ],
  [
    "100bbf6b",
    "6818df0e10",
    "PUSH 0x100edf18"
  ],
  [
    "100bbf70",
    "ff1568972f10",
    "CALL dword ptr [0x102f9768]"
  ],
  [
    "100bbf76",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100bbf78",
    "7412",
    "JZ 0x100bbf8c"
  ],
  [
    "100bbf7a",
    "68f0de0e10",
    "PUSH 0x100edef0"
  ],
  [
    "100bbf7f",
    "50",
    "PUSH EAX"
  ],
  [
    "100bbf80",
    "ff1548962f10",
    "CALL dword ptr [0x102f9648]"
  ],
  [
    "100bbf86",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100bbf88",
    "3bf7",
    "CMP ESI,EDI"
  ],
  [
    "100bbf8a",
    "7505",
    "JNZ 0x100bbf91"
  ],
  [
    "100bbf8c",
    "be17bf0b10",
    "MOV ESI,0x100bbf17"
  ],
  [
    "100bbf91",
    "56",
    "PUSH ESI"
  ],
  [
    "100bbf92",
    "e8e422ffff",
    "CALL 0x100ae27b"
  ],
  [
    "100bbf97",
    "59",
    "POP ECX"
  ],
  [
    "100bbf98",
    "a3c06a2f10",
    "MOV [0x102f6ac0],EAX"
  ],
  [
    "100bbf9d",
    "897dfc",
    "MOV dword ptr [EBP + -0x4],EDI"
  ],
  [
    "100bbfa0",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100bbfa3",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100bbfa6",
    "ffd6",
    "CALL ESI"
  ],
  [
    "100bbfa8",
    "8945e0",
    "MOV dword ptr [EBP + -0x20],EAX"
  ],
  [
    "100bbfab",
    "eb2f",
    "JMP 0x100bbfdc"
  ],
  [
    "100bbfdc",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100bbfe3",
    "8b45e0",
    "MOV EAX,dword ptr [EBP + -0x20]"
  ],
  [
    "100bbfe6",
    "e8c22bffff",
    "CALL 0x100aebad"
  ],
  [
    "100bbfeb",
    "c3",
    "RET"
  ],
  [
    "100befd6",
    "56",
    "PUSH ESI"
  ],
  [
    "100befd7",
    "8b742408",
    "MOV ESI,dword ptr [ESP + 0x8]"
  ],
  [
    "100befdb",
    "b890171410",
    "MOV EAX,0x10141790"
  ],
  [
    "100befe0",
    "3bf0",
    "CMP ESI,EAX"
  ],
  [
    "100befe2",
    "7222",
    "JC 0x100bf006"
  ],
  [
    "100befe4",
    "81fef0191410",
    "CMP ESI,0x101419f0"
  ],
  [
    "100befea",
    "771a",
    "JA 0x100bf006"
  ],
  [
    "100befec",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100befee",
    "2bc8",
    "SUB ECX,EAX"
  ],
  [
    "100beff0",
    "c1f905",
    "SAR ECX,0x5"
  ],
  [
    "100beff3",
    "83c110",
    "ADD ECX,0x10"
  ],
  [
    "100beff6",
    "51",
    "PUSH ECX"
  ],
  [
    "100beff7",
    "e896c8ffff",
    "CALL 0x100bb892"
  ],
  [
    "100beffc",
    "814e0c00800000",
    "OR dword ptr [ESI + 0xc],0x8000"
  ],
  [
    "100bf003",
    "59",
    "POP ECX"
  ],
  [
    "100bf004",
    "5e",
    "POP ESI"
  ],
  [
    "100bf005",
    "c3",
    "RET"
  ],
  [
    "100bf006",
    "83c620",
    "ADD ESI,0x20"
  ],
  [
    "100bf009",
    "56",
    "PUSH ESI"
  ],
  [
    "100bf00a",
    "ff1504962f10",
    "CALL dword ptr [0x102f9604]"
  ],
  [
    "100bf010",
    "5e",
    "POP ESI"
  ],
  [
    "100bf011",
    "c3",
    "RET"
  ],
  [
    "100bf012",
    "8b442404",
    "MOV EAX,dword ptr [ESP + 0x4]"
  ],
  [
    "100bf016",
    "83f814",
    "CMP EAX,0x14"
  ],
  [
    "100bf019",
    "7d16",
    "JGE 0x100bf031"
  ],
  [
    "100bf01b",
    "83c010",
    "ADD EAX,0x10"
  ],
  [
    "100bf01e",
    "50",
    "PUSH EAX"
  ],
  [
    "100bf01f",
    "e86ec8ffff",
    "CALL 0x100bb892"
  ],
  [
    "100bf024",
    "8b44240c",
    "MOV EAX,dword ptr [ESP + 0xc]"
  ],
  [
    "100bf028",
    "81480c00800000",
    "OR dword ptr [EAX + 0xc],0x8000"
  ],
  [
    "100bf02f",
    "59",
    "POP ECX"
  ],
  [
    "100bf030",
    "c3",
    "RET"
  ],
  [
    "100bf031",
    "8b442408",
    "MOV EAX,dword ptr [ESP + 0x8]"
  ],
  [
    "100bf035",
    "83c020",
    "ADD EAX,0x20"
  ],
  [
    "100bf038",
    "50",
    "PUSH EAX"
  ],
  [
    "100bf039",
    "ff1504962f10",
    "CALL dword ptr [0x102f9604]"
  ],
  [
    "100bf03f",
    "c3",
    "RET"
  ],
  [
    "100bf040",
    "8b442404",
    "MOV EAX,dword ptr [ESP + 0x4]"
  ],
  [
    "100bf044",
    "b990171410",
    "MOV ECX,0x10141790"
  ],
  [
    "100bf049",
    "3bc1",
    "CMP EAX,ECX"
  ],
  [
    "100bf04b",
    "721e",
    "JC 0x100bf06b"
  ],
  [
    "100bf04d",
    "3df0191410",
    "CMP EAX,0x101419f0"
  ],
  [
    "100bf052",
    "7717",
    "JA 0x100bf06b"
  ],
  [
    "100bf054",
    "81600cff7fffff",
    "AND dword ptr [EAX + 0xc],0xffff7fff"
  ],
  [
    "100bf05b",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100bf05d",
    "c1f805",
    "SAR EAX,0x5"
  ],
  [
    "100bf060",
    "83c010",
    "ADD EAX,0x10"
  ],
  [
    "100bf063",
    "50",
    "PUSH EAX"
  ],
  [
    "100bf064",
    "e839c7ffff",
    "CALL 0x100bb7a2"
  ],
  [
    "100bf069",
    "59",
    "POP ECX"
  ],
  [
    "100bf06a",
    "c3",
    "RET"
  ],
  [
    "100bf06b",
    "83c020",
    "ADD EAX,0x20"
  ],
  [
    "100bf06e",
    "50",
    "PUSH EAX"
  ],
  [
    "100bf06f",
    "ff1508962f10",
    "CALL dword ptr [0x102f9608]"
  ],
  [
    "100bf075",
    "c3",
    "RET"
  ],
  [
    "100bf3f1",
    "8b442404",
    "MOV EAX,dword ptr [ESP + 0x4]"
  ],
  [
    "100bf3f5",
    "56",
    "PUSH ESI"
  ],
  [
    "100bf3f6",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100bf3f8",
    "3bc6",
    "CMP EAX,ESI"
  ],
  [
    "100bf3fa",
    "751d",
    "JNZ 0x100bf419"
  ],
  [
    "100bf3fc",
    "e8d0f9feff",
    "CALL 0x100aedd1"
  ],
  [
    "100bf401",
    "56",
    "PUSH ESI"
  ],
  [
    "100bf402",
    "56",
    "PUSH ESI"
  ],
  [
    "100bf403",
    "56",
    "PUSH ESI"
  ],
  [
    "100bf404",
    "56",
    "PUSH ESI"
  ],
  [
    "100bf405",
    "56",
    "PUSH ESI"
  ],
  [
    "100bf406",
    "c70016000000",
    "MOV dword ptr [EAX],0x16"
  ],
  [
    "100bf40c",
    "e8c1edfeff",
    "CALL 0x100ae1d2"
  ],
  [
    "100bf411",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100bf414",
    "83c8ff",
    "OR EAX,0xffffffff"
  ],
  [
    "100bf417",
    "5e",
    "POP ESI"
  ],
  [
    "100bf418",
    "c3",
    "RET"
  ],
  [
    "100bf419",
    "8b4010",
    "MOV EAX,dword ptr [EAX + 0x10]"
  ],
  [
    "100bf41c",
    "5e",
    "POP ESI"
  ],
  [
    "100bf41d",
    "c3",
    "RET"
  ],
  [
    "100bf61a",
    "56",
    "PUSH ESI"
  ],
  [
    "100bf61b",
    "8b742408",
    "MOV ESI,dword ptr [ESP + 0x8]"
  ],
  [
    "100bf61f",
    "57",
    "PUSH EDI"
  ],
  [
    "100bf620",
    "56",
    "PUSH ESI"
  ],
  [
    "100bf621",
    "e834160100",
    "CALL 0x100d0c5a"
  ],
  [
    "100bf626",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100bf629",
    "59",
    "POP ECX"
  ],
  [
    "100bf62a",
    "744d",
    "JZ 0x100bf679"
  ],
  [
    "100bf62c",
    "83fe01",
    "CMP ESI,0x1"
  ],
  [
    "100bf62f",
    "a1c0702f10",
    "MOV EAX,[0x102f70c0]"
  ],
  [
    "100bf634",
    "7506",
    "JNZ 0x100bf63c"
  ],
  [
    "100bf636",
    "f6407401",
    "TEST byte ptr [EAX + 0x74],0x1"
  ],
  [
    "100bf63a",
    "750b",
    "JNZ 0x100bf647"
  ],
  [
    "100bf63c",
    "83fe02",
    "CMP ESI,0x2"
  ],
  [
    "100bf63f",
    "751c",
    "JNZ 0x100bf65d"
  ],
  [
    "100bf641",
    "f6403c01",
    "TEST byte ptr [EAX + 0x3c],0x1"
  ],
  [
    "100bf645",
    "7416",
    "JZ 0x100bf65d"
  ],
  [
    "100bf647",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100bf649",
    "e80c160100",
    "CALL 0x100d0c5a"
  ],
  [
    "100bf64e",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100bf650",
    "8bf8",
    "MOV EDI,EAX"
  ],
  [
    "100bf652",
    "e803160100",
    "CALL 0x100d0c5a"
  ],
  [
    "100bf657",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100bf659",
    "59",
    "POP ECX"
  ],
  [
    "100bf65a",
    "59",
    "POP ECX"
  ],
  [
    "100bf65b",
    "741c",
    "JZ 0x100bf679"
  ],
  [
    "100bf65d",
    "56",
    "PUSH ESI"
  ],
  [
    "100bf65e",
    "e8f7150100",
    "CALL 0x100d0c5a"
  ],
  [
    "100bf663",
    "59",
    "POP ECX"
  ],
  [
    "100bf664",
    "50",
    "PUSH EAX"
  ],
  [
    "100bf665",
    "ff15e8952f10",
    "CALL dword ptr [0x102f95e8]"
  ],
  [
    "100bf66b",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100bf66d",
    "750a",
    "JNZ 0x100bf679"
  ],
  [
    "100bf66f",
    "ff1580972f10",
    "CALL dword ptr [0x102f9780]"
  ],
  [
    "100bf675",
    "8bf8",
    "MOV EDI,EAX"
  ],
  [
    "100bf677",
    "eb02",
    "JMP 0x100bf67b"
  ],
  [
    "100bf679",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100bf67b",
    "56",
    "PUSH ESI"
  ],
  [
    "100bf67c",
    "e858150100",
    "CALL 0x100d0bd9"
  ],
  [
    "100bf681",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100bf683",
    "83e61f",
    "AND ESI,0x1f"
  ],
  [
    "100bf686",
    "6bf638",
    "IMUL ESI,ESI,0x38"
  ],
  [
    "100bf689",
    "c1f805",
    "SAR EAX,0x5"
  ],
  [
    "100bf68c",
    "85ff",
    "TEST EDI,EDI"
  ],
  [
    "100bf68e",
    "8b0485c0702f10",
    "MOV EAX,dword ptr [EAX*0x4 + 0x102f70c0]"
  ],
  [
    "100bf695",
    "59",
    "POP ECX"
  ],
  [
    "100bf696",
    "c644300400",
    "MOV byte ptr [EAX + ESI*0x1 + 0x4],0x0"
  ],
  [
    "100bf69b",
    "740c",
    "JZ 0x100bf6a9"
  ],
  [
    "100bf69d",
    "57",
    "PUSH EDI"
  ],
  [
    "100bf69e",
    "e854f7feff",
    "CALL 0x100aedf7"
  ],
  [
    "100bf6a3",
    "59",
    "POP ECX"
  ],
  [
    "100bf6a4",
    "83c8ff",
    "OR EAX,0xffffffff"
  ],
  [
    "100bf6a7",
    "eb02",
    "JMP 0x100bf6ab"
  ],
  [
    "100bf6a9",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100bf6ab",
    "5f",
    "POP EDI"
  ],
  [
    "100bf6ac",
    "5e",
    "POP ESI"
  ],
  [
    "100bf6ad",
    "c3",
    "RET"
  ],
  [
    "100bf6ae",
    "6a10",
    "PUSH 0x10"
  ],
  [
    "100bf6b0",
    "68988d0f10",
    "PUSH 0x100f8d98"
  ],
  [
    "100bf6b5",
    "e8aef4feff",
    "CALL 0x100aeb68"
  ],
  [
    "100bf6ba",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100bf6bd",
    "83f8fe",
    "CMP EAX,-0x2"
  ],
  [
    "100bf6c0",
    "751b",
    "JNZ 0x100bf6dd"
  ],
  [
    "100bf6c2",
    "e81df7feff",
    "CALL 0x100aede4"
  ],
  [
    "100bf6c7",
    "832000",
    "AND dword ptr [EAX],0x0"
  ],
  [
    "100bf6ca",
    "e802f7feff",
    "CALL 0x100aedd1"
  ],
  [
    "100bf6cf",
    "c70009000000",
    "MOV dword ptr [EAX],0x9"
  ],
  [
    "100bf6d5",
    "83c8ff",
    "OR EAX,0xffffffff"
  ],
  [
    "100bf6d8",
    "e98e000000",
    "JMP 0x100bf76b"
  ],
  [
    "100bf6dd",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100bf6df",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100bf6e1",
    "7c08",
    "JL 0x100bf6eb"
  ],
  [
    "100bf6e3",
    "3b0568702f10",
    "CMP EAX,dword ptr [0x102f7068]"
  ],
  [
    "100bf6e9",
    "7221",
    "JC 0x100bf70c"
  ],
  [
    "100bf6eb",
    "e8f4f6feff",
    "CALL 0x100aede4"
  ],
  [
    "100bf6f0",
    "8938",
    "MOV dword ptr [EAX],EDI"
  ],
  [
    "100bf6f2",
    "e8daf6feff",
    "CALL 0x100aedd1"
  ],
  [
    "100bf6f7",
    "c70009000000",
    "MOV dword ptr [EAX],0x9"
  ],
  [
    "100bf6fd",
    "57",
    "PUSH EDI"
  ],
  [
    "100bf6fe",
    "57",
    "PUSH EDI"
  ],
  [
    "100bf6ff",
    "57",
    "PUSH EDI"
  ],
  [
    "100bf700",
    "57",
    "PUSH EDI"
  ],
  [
    "100bf701",
    "57",
    "PUSH EDI"
  ],
  [
    "100bf702",
    "e8cbeafeff",
    "CALL 0x100ae1d2"
  ],
  [
    "100bf707",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100bf70a",
    "ebc9",
    "JMP 0x100bf6d5"
  ],
  [
    "100bf70c",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100bf70e",
    "c1f905",
    "SAR ECX,0x5"
  ],
  [
    "100bf711",
    "8d1c8dc0702f10",
    "LEA EBX,[ECX*0x4 + 0x102f70c0]"
  ],
  [
    "100bf718",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100bf71a",
    "83e61f",
    "AND ESI,0x1f"
  ],
  [
    "100bf71d",
    "6bf638",
    "IMUL ESI,ESI,0x38"
  ],
  [
    "100bf720",
    "8b0b",
    "MOV ECX,dword ptr [EBX]"
  ],
  [
    "100bf722",
    "0fb64c3104",
    "MOVZX ECX,byte ptr [ECX + ESI*0x1 + 0x4]"
  ],
  [
    "100bf727",
    "83e101",
    "AND ECX,0x1"
  ],
  [
    "100bf72a",
    "74bf",
    "JZ 0x100bf6eb"
  ],
  [
    "100bf72c",
    "50",
    "PUSH EAX"
  ],
  [
    "100bf72d",
    "e899150100",
    "CALL 0x100d0ccb"
  ],
  [
    "100bf732",
    "59",
    "POP ECX"
  ],
  [
    "100bf733",
    "897dfc",
    "MOV dword ptr [EBP + -0x4],EDI"
  ],
  [
    "100bf736",
    "8b03",
    "MOV EAX,dword ptr [EBX]"
  ],
  [
    "100bf738",
    "f644300401",
    "TEST byte ptr [EAX + ESI*0x1 + 0x4],0x1"
  ],
  [
    "100bf73d",
    "740e",
    "JZ 0x100bf74d"
  ],
  [
    "100bf73f",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100bf742",
    "e8d3feffff",
    "CALL 0x100bf61a"
  ],
  [
    "100bf747",
    "59",
    "POP ECX"
  ],
  [
    "100bf748",
    "8945e4",
    "MOV dword ptr [EBP + -0x1c],EAX"
  ],
  [
    "100bf74b",
    "eb0f",
    "JMP 0x100bf75c"
  ],
  [
    "100bf74d",
    "e87ff6feff",
    "CALL 0x100aedd1"
  ],
  [
    "100bf752",
    "c70009000000",
    "MOV dword ptr [EAX],0x9"
  ],
  [
    "100bf758",
    "834de4ff",
    "OR dword ptr [EBP + -0x1c],0xffffffff"
  ],
  [
    "100bf75c",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100bf763",
    "e809000000",
    "CALL 0x100bf771"
  ],
  [
    "100bf768",
    "8b45e4",
    "MOV EAX,dword ptr [EBP + -0x1c]"
  ],
  [
    "100bf76b",
    "e83df4feff",
    "CALL 0x100aebad"
  ],
  [
    "100bf770",
    "c3",
    "RET"
  ],
  [
    "100bf771",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100bf774",
    "e8f2150100",
    "CALL 0x100d0d6b"
  ],
  [
    "100bf779",
    "59",
    "POP ECX"
  ],
  [
    "100bf77a",
    "c3",
    "RET"
  ],
  [
    "100bf77b",
    "56",
    "PUSH ESI"
  ],
  [
    "100bf77c",
    "8b742408",
    "MOV ESI,dword ptr [ESP + 0x8]"
  ],
  [
    "100bf780",
    "8b460c",
    "MOV EAX,dword ptr [ESI + 0xc]"
  ],
  [
    "100bf783",
    "a883",
    "TEST AL,0x83"
  ],
  [
    "100bf785",
    "741e",
    "JZ 0x100bf7a5"
  ],
  [
    "100bf787",
    "a808",
    "TEST AL,0x8"
  ],
  [
    "100bf789",
    "741a",
    "JZ 0x100bf7a5"
  ],
  [
    "100bf78b",
    "ff7608",
    "PUSH dword ptr [ESI + 0x8]"
  ],
  [
    "100bf78e",
    "e811b2feff",
    "CALL 0x100aa9a4"
  ],
  [
    "100bf793",
    "81660cf7fbffff",
    "AND dword ptr [ESI + 0xc],0xfffffbf7"
  ],
  [
    "100bf79a",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100bf79c",
    "59",
    "POP ECX"
  ],
  [
    "100bf79d",
    "8906",
    "MOV dword ptr [ESI],EAX"
  ],
  [
    "100bf79f",
    "894608",
    "MOV dword ptr [ESI + 0x8],EAX"
  ],
  [
    "100bf7a2",
    "894604",
    "MOV dword ptr [ESI + 0x4],EAX"
  ],
  [
    "100bf7a5",
    "5e",
    "POP ESI"
  ],
  [
    "100bf7a6",
    "c3",
    "RET"
  ],
  [
    "100bf7a7",
    "53",
    "PUSH EBX"
  ],
  [
    "100bf7a8",
    "56",
    "PUSH ESI"
  ],
  [
    "100bf7a9",
    "8b74240c",
    "MOV ESI,dword ptr [ESP + 0xc]"
  ],
  [
    "100bf7ad",
    "8b460c",
    "MOV EAX,dword ptr [ESI + 0xc]"
  ],
  [
    "100bf7b0",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100bf7b2",
    "80e103",
    "AND CL,0x3"
  ],
  [
    "100bf7b5",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100bf7b7",
    "80f902",
    "CMP CL,0x2"
  ],
  [
    "100bf7ba",
    "753f",
    "JNZ 0x100bf7fb"
  ],
  [
    "100bf7bc",
    "66a90801",
    "TEST AX,0x108"
  ],
  [
    "100bf7c0",
    "7439",
    "JZ 0x100bf7fb"
  ],
  [
    "100bf7c2",
    "8b4608",
    "MOV EAX,dword ptr [ESI + 0x8]"
  ],
  [
    "100bf7c5",
    "57",
    "PUSH EDI"
  ],
  [
    "100bf7c6",
    "8b3e",
    "MOV EDI,dword ptr [ESI]"
  ],
  [
    "100bf7c8",
    "2bf8",
    "SUB EDI,EAX"
  ],
  [
    "100bf7ca",
    "85ff",
    "TEST EDI,EDI"
  ],
  [
    "100bf7cc",
    "7e2c",
    "JLE 0x100bf7fa"
  ],
  [
    "100bf7ce",
    "57",
    "PUSH EDI"
  ],
  [
    "100bf7cf",
    "50",
    "PUSH EAX"
  ],
  [
    "100bf7d0",
    "56",
    "PUSH ESI"
  ],
  [
    "100bf7d1",
    "e81bfcffff",
    "CALL 0x100bf3f1"
  ],
  [
    "100bf7d6",
    "59",
    "POP ECX"
  ],
  [
    "100bf7d7",
    "50",
    "PUSH EAX"
  ],
  [
    "100bf7d8",
    "e8b1f20000",
    "CALL 0x100cea8e"
  ],
  [
    "100bf7dd",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100bf7e0",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100bf7e2",
    "750f",
    "JNZ 0x100bf7f3"
  ],
  [
    "100bf7e4",
    "8b460c",
    "MOV EAX,dword ptr [ESI + 0xc]"
  ],
  [
    "100bf7e7",
    "84c0",
    "TEST AL,AL"
  ],
  [
    "100bf7e9",
    "790f",
    "JNS 0x100bf7fa"
  ],
  [
    "100bf7eb",
    "83e0fd",
    "AND EAX,0xfffffffd"
  ],
  [
    "100bf7ee",
    "89460c",
    "MOV dword ptr [ESI + 0xc],EAX"
  ],
  [
    "100bf7f1",
    "eb07",
    "JMP 0x100bf7fa"
  ],
  [
    "100bf7f3",
    "834e0c20",
    "OR dword ptr [ESI + 0xc],0x20"
  ],
  [
    "100bf7f7",
    "83cbff",
    "OR EBX,0xffffffff"
  ],
  [
    "100bf7fa",
    "5f",
    "POP EDI"
  ],
  [
    "100bf7fb",
    "8b4608",
    "MOV EAX,dword ptr [ESI + 0x8]"
  ],
  [
    "100bf7fe",
    "83660400",
    "AND dword ptr [ESI + 0x4],0x0"
  ],
  [
    "100bf802",
    "8906",
    "MOV dword ptr [ESI],EAX"
  ],
  [
    "100bf804",
    "5e",
    "POP ESI"
  ],
  [
    "100bf805",
    "8bc3",
    "MOV EAX,EBX"
  ],
  [
    "100bf807",
    "5b",
    "POP EBX"
  ],
  [
    "100bf808",
    "c3",
    "RET"
  ],
  [
    "100bfacf",
    "55",
    "PUSH EBP"
  ],
  [
    "100bfad0",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100bfad2",
    "83ec10",
    "SUB ESP,0x10"
  ],
  [
    "100bfad5",
    "a1886f2f10",
    "MOV EAX,[0x102f6f88]"
  ],
  [
    "100bfada",
    "53",
    "PUSH EBX"
  ],
  [
    "100bfadb",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100bfadd",
    "56",
    "PUSH ESI"
  ],
  [
    "100bfade",
    "8b750c",
    "MOV ESI,dword ptr [EBP + 0xc]"
  ],
  [
    "100bfae1",
    "8945fc",
    "MOV dword ptr [EBP + -0x4],EAX"
  ],
  [
    "100bfae4",
    "895df4",
    "MOV dword ptr [EBP + -0xc],EBX"
  ],
  [
    "100bfae7",
    "895df8",
    "MOV dword ptr [EBP + -0x8],EBX"
  ],
  [
    "100bfaea",
    "895df0",
    "MOV dword ptr [EBP + -0x10],EBX"
  ],
  [
    "100bfaed",
    "eb01",
    "JMP 0x100bfaf0"
  ],
  [
    "100bfaef",
    "46",
    "INC ESI"
  ],
  [
    "100bfaf0",
    "803e20",
    "CMP byte ptr [ESI],0x20"
  ],
  [
    "100bfaf3",
    "74fa",
    "JZ 0x100bfaef"
  ],
  [
    "100bfaf5",
    "8a06",
    "MOV AL,byte ptr [ESI]"
  ],
  [
    "100bfaf7",
    "3c61",
    "CMP AL,0x61"
  ],
  [
    "100bfaf9",
    "7439",
    "JZ 0x100bfb34"
  ],
  [
    "100bfafb",
    "3c72",
    "CMP AL,0x72"
  ],
  [
    "100bfafd",
    "742c",
    "JZ 0x100bfb2b"
  ],
  [
    "100bfaff",
    "3c77",
    "CMP AL,0x77"
  ],
  [
    "100bfb01",
    "741f",
    "JZ 0x100bfb22"
  ],
  [
    "100bfb03",
    "e8c9f2feff",
    "CALL 0x100aedd1"
  ],
  [
    "100bfb08",
    "53",
    "PUSH EBX"
  ],
  [
    "100bfb09",
    "53",
    "PUSH EBX"
  ],
  [
    "100bfb0a",
    "53",
    "PUSH EBX"
  ],
  [
    "100bfb0b",
    "53",
    "PUSH EBX"
  ],
  [
    "100bfb0c",
    "53",
    "PUSH EBX"
  ],
  [
    "100bfb0d",
    "c70016000000",
    "MOV dword ptr [EAX],0x16"
  ],
  [
    "100bfb13",
    "e8bae6feff",
    "CALL 0x100ae1d2"
  ],
  [
    "100bfb18",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100bfb1b",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100bfb1d",
    "e949020000",
    "JMP 0x100bfd6b"
  ],
  [
    "100bfb22",
    "c7450c01030000",
    "MOV dword ptr [EBP + 0xc],0x301"
  ],
  [
    "100bfb29",
    "eb10",
    "JMP 0x100bfb3b"
  ],
  [
    "100bfb2b",
    "834dfc01",
    "OR dword ptr [EBP + -0x4],0x1"
  ],
  [
    "100bfb2f",
    "895d0c",
    "MOV dword ptr [EBP + 0xc],EBX"
  ],
  [
    "100bfb32",
    "eb0b",
    "JMP 0x100bfb3f"
  ],
  [
    "100bfb34",
    "c7450c09010000",
    "MOV dword ptr [EBP + 0xc],0x109"
  ],
  [
    "100bfb3b",
    "834dfc02",
    "OR dword ptr [EBP + -0x4],0x2"
  ],
  [
    "100bfb3f",
    "33c9",
    "XOR ECX,ECX"
  ],
  [
    "100bfb41",
    "41",
    "INC ECX"
  ],
  [
    "100bfb42",
    "46",
    "INC ESI"
  ],
  [
    "100bfb43",
    "8a06",
    "MOV AL,byte ptr [ESI]"
  ],
  [
    "100bfb45",
    "3ac3",
    "CMP AL,BL"
  ],
  [
    "100bfb47",
    "57",
    "PUSH EDI"
  ],
  [
    "100bfb48",
    "0f84b7010000",
    "JZ 0x100bfd05"
  ],
  [
    "100bfb4e",
    "8d517f",
    "LEA EDX,[ECX + 0x7f]"
  ],
  [
    "100bfb51",
    "bf00400000",
    "MOV EDI,0x4000"
  ],
  [
    "100bfb56",
    "3bcb",
    "CMP ECX,EBX"
  ],
  [
    "100bfb58",
    "0f842b010000",
    "JZ 0x100bfc89"
  ],
  [
    "100bfb5e",
    "0fbec0",
    "MOVSX EAX,AL"
  ],
  [
    "100bfb61",
    "83f853",
    "CMP EAX,0x53"
  ],
  [
    "100bfb64",
    "0f8fa2000000",
    "JG 0x100bfc0c"
  ],
  [
    "100bfb6a",
    "0f848a000000",
    "JZ 0x100bfbfa"
  ],
  [
    "100bfb70",
    "83e820",
    "SUB EAX,0x20"
  ],
  [
    "100bfb73",
    "0f8405010000",
    "JZ 0x100bfc7e"
  ],
  [
    "100bfb79",
    "83e80b",
    "SUB EAX,0xb"
  ],
  [
    "100bfb7c",
    "7456",
    "JZ 0x100bfbd4"
  ],
  [
    "100bfb7e",
    "48",
    "DEC EAX"
  ],
  [
    "100bfb7f",
    "7447",
    "JZ 0x100bfbc8"
  ],
  [
    "100bfb81",
    "83e818",
    "SUB EAX,0x18"
  ],
  [
    "100bfb84",
    "742f",
    "JZ 0x100bfbb5"
  ],
  [
    "100bfb86",
    "83e80a",
    "SUB EAX,0xa"
  ],
  [
    "100bfb89",
    "7422",
    "JZ 0x100bfbad"
  ],
  [
    "100bfb8b",
    "83e804",
    "SUB EAX,0x4"
  ],
  [
    "100bfb8e",
    "0f857a010000",
    "JNZ 0x100bfd0e"
  ],
  [
    "100bfb94",
    "395df8",
    "CMP dword ptr [EBP + -0x8],EBX"
  ],
  [
    "100bfb97",
    "0f85d6000000",
    "JNZ 0x100bfc73"
  ],
  [
    "100bfb9d",
    "834d0c10",
    "OR dword ptr [EBP + 0xc],0x10"
  ],
  [
    "100bfba1",
    "c745f801000000",
    "MOV dword ptr [EBP + -0x8],0x1"
  ],
  [
    "100bfba8",
    "e9d1000000",
    "JMP 0x100bfc7e"
  ],
  [
    "100bfbad",
    "09550c",
    "OR dword ptr [EBP + 0xc],EDX"
  ],
  [
    "100bfbb0",
    "e9c9000000",
    "JMP 0x100bfc7e"
  ],
  [
    "100bfbb5",
    "f6450c40",
    "TEST byte ptr [EBP + 0xc],0x40"
  ],
  [
    "100bfbb9",
    "0f85b4000000",
    "JNZ 0x100bfc73"
  ],
  [
    "100bfbbf",
    "834d0c40",
    "OR dword ptr [EBP + 0xc],0x40"
  ],
  [
    "100bfbc3",
    "e9b6000000",
    "JMP 0x100bfc7e"
  ],
  [
    "100bfbc8",
    "c745f001000000",
    "MOV dword ptr [EBP + -0x10],0x1"
  ],
  [
    "100bfbcf",
    "e99f000000",
    "JMP 0x100bfc73"
  ],
  [
    "100bfbd4",
    "f6450c02",
    "TEST byte ptr [EBP + 0xc],0x2"
  ],
  [
    "100bfbd8",
    "0f8595000000",
    "JNZ 0x100bfc73"
  ],
  [
    "100bfbde",
    "8b450c",
    "MOV EAX,dword ptr [EBP + 0xc]"
  ],
  [
    "100bfbe1",
    "83e0fe",
    "AND EAX,0xfffffffe"
  ],
  [
    "100bfbe4",
    "83c802",
    "OR EAX,0x2"
  ],
  [
    "100bfbe7",
    "89450c",
    "MOV dword ptr [EBP + 0xc],EAX"
  ],
  [
    "100bfbea",
    "8b45fc",
    "MOV EAX,dword ptr [EBP + -0x4]"
  ],
  [
    "100bfbed",
    "83e0fc",
    "AND EAX,0xfffffffc"
  ],
  [
    "100bfbf0",
    "0bc2",
    "OR EAX,EDX"
  ],
  [
    "100bfbf2",
    "8945fc",
    "MOV dword ptr [EBP + -0x4],EAX"
  ],
  [
    "100bfbf5",
    "e984000000",
    "JMP 0x100bfc7e"
  ],
  [
    "100bfbfa",
    "395df8",
    "CMP dword ptr [EBP + -0x8],EBX"
  ],
  [
    "100bfbfd",
    "7574",
    "JNZ 0x100bfc73"
  ],
  [
    "100bfbff",
    "834d0c20",
    "OR dword ptr [EBP + 0xc],0x20"
  ],
  [
    "100bfc03",
    "c745f801000000",
    "MOV dword ptr [EBP + -0x8],0x1"
  ],
  [
    "100bfc0a",
    "eb72",
    "JMP 0x100bfc7e"
  ],
  [
    "100bfc0c",
    "83e854",
    "SUB EAX,0x54"
  ],
  [
    "100bfc0f",
    "745a",
    "JZ 0x100bfc6b"
  ],
  [
    "100bfc11",
    "83e80e",
    "SUB EAX,0xe"
  ],
  [
    "100bfc14",
    "7444",
    "JZ 0x100bfc5a"
  ],
  [
    "100bfc16",
    "48",
    "DEC EAX"
  ],
  [
    "100bfc17",
    "7430",
    "JZ 0x100bfc49"
  ],
  [
    "100bfc19",
    "83e80b",
    "SUB EAX,0xb"
  ],
  [
    "100bfc1c",
    "7416",
    "JZ 0x100bfc34"
  ],
  [
    "100bfc1e",
    "83e806",
    "SUB EAX,0x6"
  ],
  [
    "100bfc21",
    "0f85e7000000",
    "JNZ 0x100bfd0e"
  ],
  [
    "100bfc27",
    "66f7450c00c0",
    "TEST word ptr [EBP + 0xc],0xc000"
  ],
  [
    "100bfc2d",
    "7544",
    "JNZ 0x100bfc73"
  ],
  [
    "100bfc2f",
    "097d0c",
    "OR dword ptr [EBP + 0xc],EDI"
  ],
  [
    "100bfc32",
    "eb4a",
    "JMP 0x100bfc7e"
  ],
  [
    "100bfc34",
    "395df4",
    "CMP dword ptr [EBP + -0xc],EBX"
  ],
  [
    "100bfc37",
    "753a",
    "JNZ 0x100bfc73"
  ],
  [
    "100bfc39",
    "8165fcffbfffff",
    "AND dword ptr [EBP + -0x4],0xffffbfff"
  ],
  [
    "100bfc40",
    "c745f401000000",
    "MOV dword ptr [EBP + -0xc],0x1"
  ],
  [
    "100bfc47",
    "eb35",
    "JMP 0x100bfc7e"
  ],
  [
    "100bfc49",
    "395df4",
    "CMP dword ptr [EBP + -0xc],EBX"
  ],
  [
    "100bfc4c",
    "7525",
    "JNZ 0x100bfc73"
  ],
  [
    "100bfc4e",
    "097dfc",
    "OR dword ptr [EBP + -0x4],EDI"
  ],
  [
    "100bfc51",
    "c745f401000000",
    "MOV dword ptr [EBP + -0xc],0x1"
  ],
  [
    "100bfc58",
    "eb24",
    "JMP 0x100bfc7e"
  ],
  [
    "100bfc5a",
    "66f7450c00c0",
    "TEST word ptr [EBP + 0xc],0xc000"
  ],
  [
    "100bfc60",
    "7511",
    "JNZ 0x100bfc73"
  ],
  [
    "100bfc62",
    "814d0c00800000",
    "OR dword ptr [EBP + 0xc],0x8000"
  ],
  [
    "100bfc69",
    "eb13",
    "JMP 0x100bfc7e"
  ],
  [
    "100bfc6b",
    "66f7450c0010",
    "TEST word ptr [EBP + 0xc],0x1000"
  ],
  [
    "100bfc71",
    "7404",
    "JZ 0x100bfc77"
  ],
  [
    "100bfc73",
    "33c9",
    "XOR ECX,ECX"
  ],
  [
    "100bfc75",
    "eb07",
    "JMP 0x100bfc7e"
  ],
  [
    "100bfc77",
    "814d0c00100000",
    "OR dword ptr [EBP + 0xc],0x1000"
  ],
  [
    "100bfc7e",
    "46",
    "INC ESI"
  ],
  [
    "100bfc7f",
    "8a06",
    "MOV AL,byte ptr [ESI]"
  ],
  [
    "100bfc81",
    "3ac3",
    "CMP AL,BL"
  ],
  [
    "100bfc83",
    "0f85cdfeffff",
    "JNZ 0x100bfb56"
  ],
  [
    "100bfc89",
    "395df0",
    "CMP dword ptr [EBP + -0x10],EBX"
  ],
  [
    "100bfc8c",
    "7477",
    "JZ 0x100bfd05"
  ],
  [
    "100bfc8e",
    "eb01",
    "JMP 0x100bfc91"
  ],
  [
    "100bfc90",
    "46",
    "INC ESI"
  ],
  [
    "100bfc91",
    "803e20",
    "CMP byte ptr [ESI],0x20"
  ],
  [
    "100bfc94",
    "74fa",
    "JZ 0x100bfc90"
  ],
  [
    "100bfc96",
    "6a04",
    "PUSH 0x4"
  ],
  [
    "100bfc98",
    "56",
    "PUSH ESI"
  ],
  [
    "100bfc99",
    "68e8090f10",
    "PUSH 0x100f09e8"
  ],
  [
    "100bfc9e",
    "e83e210100",
    "CALL 0x100d1de1"
  ],
  [
    "100bfca3",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100bfca6",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100bfca8",
    "7564",
    "JNZ 0x100bfd0e"
  ],
  [
    "100bfcaa",
    "83c604",
    "ADD ESI,0x4"
  ],
  [
    "100bfcad",
    "68f0090f10",
    "PUSH 0x100f09f0"
  ],
  [
    "100bfcb2",
    "56",
    "PUSH ESI"
  ],
  [
    "100bfcb3",
    "e8ad1f0100",
    "CALL 0x100d1c65"
  ],
  [
    "100bfcb8",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100bfcba",
    "59",
    "POP ECX"
  ],
  [
    "100bfcbb",
    "59",
    "POP ECX"
  ],
  [
    "100bfcbc",
    "750c",
    "JNZ 0x100bfcca"
  ],
  [
    "100bfcbe",
    "83c605",
    "ADD ESI,0x5"
  ],
  [
    "100bfcc1",
    "814d0c00000400",
    "OR dword ptr [EBP + 0xc],0x40000"
  ],
  [
    "100bfcc8",
    "eb3b",
    "JMP 0x100bfd05"
  ],
  [
    "100bfcca",
    "68f8090f10",
    "PUSH 0x100f09f8"
  ],
  [
    "100bfccf",
    "56",
    "PUSH ESI"
  ],
  [
    "100bfcd0",
    "e8901f0100",
    "CALL 0x100d1c65"
  ],
  [
    "100bfcd5",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100bfcd7",
    "59",
    "POP ECX"
  ],
  [
    "100bfcd8",
    "59",
    "POP ECX"
  ],
  [
    "100bfcd9",
    "750c",
    "JNZ 0x100bfce7"
  ],
  [
    "100bfcdb",
    "83c608",
    "ADD ESI,0x8"
  ],
  [
    "100bfcde",
    "814d0c00000200",
    "OR dword ptr [EBP + 0xc],0x20000"
  ],
  [
    "100bfce5",
    "eb1e",
    "JMP 0x100bfd05"
  ],
  [
    "100bfce7",
    "68040a0f10",
    "PUSH 0x100f0a04"
  ],
  [
    "100bfcec",
    "56",
    "PUSH ESI"
  ],
  [
    "100bfced",
    "e8731f0100",
    "CALL 0x100d1c65"
  ],
  [
    "100bfcf2",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100bfcf4",
    "59",
    "POP ECX"
  ],
  [
    "100bfcf5",
    "59",
    "POP ECX"
  ],
  [
    "100bfcf6",
    "7516",
    "JNZ 0x100bfd0e"
  ],
  [
    "100bfcf8",
    "83c607",
    "ADD ESI,0x7"
  ],
  [
    "100bfcfb",
    "814d0c00000100",
    "OR dword ptr [EBP + 0xc],0x10000"
  ],
  [
    "100bfd02",
    "eb01",
    "JMP 0x100bfd05"
  ],
  [
    "100bfd04",
    "46",
    "INC ESI"
  ],
  [
    "100bfd05",
    "803e20",
    "CMP byte ptr [ESI],0x20"
  ],
  [
    "100bfd08",
    "74fa",
    "JZ 0x100bfd04"
  ],
  [
    "100bfd0a",
    "381e",
    "CMP byte ptr [ESI],BL"
  ],
  [
    "100bfd0c",
    "741a",
    "JZ 0x100bfd28"
  ],
  [
    "100bfd0e",
    "e8bef0feff",
    "CALL 0x100aedd1"
  ],
  [
    "100bfd13",
    "53",
    "PUSH EBX"
  ],
  [
    "100bfd14",
    "53",
    "PUSH EBX"
  ],
  [
    "100bfd15",
    "53",
    "PUSH EBX"
  ],
  [
    "100bfd16",
    "53",
    "PUSH EBX"
  ],
  [
    "100bfd17",
    "53",
    "PUSH EBX"
  ],
  [
    "100bfd18",
    "c70016000000",
    "MOV dword ptr [EAX],0x16"
  ],
  [
    "100bfd1e",
    "e8afe4feff",
    "CALL 0x100ae1d2"
  ],
  [
    "100bfd23",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100bfd26",
    "eb1e",
    "JMP 0x100bfd46"
  ],
  [
    "100bfd28",
    "6880010000",
    "PUSH 0x180"
  ],
  [
    "100bfd2d",
    "ff7510",
    "PUSH dword ptr [EBP + 0x10]"
  ],
  [
    "100bfd30",
    "8d45f0",
    "LEA EAX,[EBP + -0x10]"
  ],
  [
    "100bfd33",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100bfd36",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100bfd39",
    "50",
    "PUSH EAX"
  ],
  [
    "100bfd3a",
    "e8ee1c0100",
    "CALL 0x100d1a2d"
  ],
  [
    "100bfd3f",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100bfd42",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100bfd44",
    "7404",
    "JZ 0x100bfd4a"
  ],
  [
    "100bfd46",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100bfd48",
    "eb20",
    "JMP 0x100bfd6a"
  ],
  [
    "100bfd4a",
    "8b4514",
    "MOV EAX,dword ptr [EBP + 0x14]"
  ],
  [
    "100bfd4d",
    "ff05d46a2f10",
    "INC dword ptr [0x102f6ad4]"
  ],
  [
    "100bfd53",
    "8b4dfc",
    "MOV ECX,dword ptr [EBP + -0x4]"
  ],
  [
    "100bfd56",
    "89480c",
    "MOV dword ptr [EAX + 0xc],ECX"
  ],
  [
    "100bfd59",
    "8b4df0",
    "MOV ECX,dword ptr [EBP + -0x10]"
  ],
  [
    "100bfd5c",
    "895804",
    "MOV dword ptr [EAX + 0x4],EBX"
  ],
  [
    "100bfd5f",
    "8918",
    "MOV dword ptr [EAX],EBX"
  ],
  [
    "100bfd61",
    "895808",
    "MOV dword ptr [EAX + 0x8],EBX"
  ],
  [
    "100bfd64",
    "89581c",
    "MOV dword ptr [EAX + 0x1c],EBX"
  ],
  [
    "100bfd67",
    "894810",
    "MOV dword ptr [EAX + 0x10],ECX"
  ],
  [
    "100bfd6a",
    "5f",
    "POP EDI"
  ],
  [
    "100bfd6b",
    "5e",
    "POP ESI"
  ],
  [
    "100bfd6c",
    "5b",
    "POP EBX"
  ],
  [
    "100bfd6d",
    "c9",
    "LEAVE"
  ],
  [
    "100bfd6e",
    "c3",
    "RET"
  ],
  [
    "100bfd6f",
    "6a10",
    "PUSH 0x10"
  ],
  [
    "100bfd71",
    "68208e0f10",
    "PUSH 0x100f8e20"
  ],
  [
    "100bfd76",
    "e8ededfeff",
    "CALL 0x100aeb68"
  ],
  [
    "100bfd7b",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100bfd7d",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100bfd7f",
    "897de4",
    "MOV dword ptr [EBP + -0x1c],EDI"
  ],
  [
    "100bfd82",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100bfd84",
    "e809bbffff",
    "CALL 0x100bb892"
  ],
  [
    "100bfd89",
    "59",
    "POP ECX"
  ],
  [
    "100bfd8a",
    "895dfc",
    "MOV dword ptr [EBP + -0x4],EBX"
  ],
  [
    "100bfd8d",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100bfd8f",
    "8975e0",
    "MOV dword ptr [EBP + -0x20],ESI"
  ],
  [
    "100bfd92",
    "3b3500852f10",
    "CMP ESI,dword ptr [0x102f8500]"
  ],
  [
    "100bfd98",
    "0f8dc7000000",
    "JGE 0x100bfe65"
  ],
  [
    "100bfd9e",
    "a1c0712f10",
    "MOV EAX,[0x102f71c0]"
  ],
  [
    "100bfda3",
    "8d04b0",
    "LEA EAX,[EAX + ESI*0x4]"
  ],
  [
    "100bfda6",
    "3918",
    "CMP dword ptr [EAX],EBX"
  ],
  [
    "100bfda8",
    "7456",
    "JZ 0x100bfe00"
  ],
  [
    "100bfdaa",
    "8b00",
    "MOV EAX,dword ptr [EAX]"
  ],
  [
    "100bfdac",
    "8b400c",
    "MOV EAX,dword ptr [EAX + 0xc]"
  ],
  [
    "100bfdaf",
    "a883",
    "TEST AL,0x83"
  ],
  [
    "100bfdb1",
    "7546",
    "JNZ 0x100bfdf9"
  ],
  [
    "100bfdb3",
    "6685c0",
    "TEST AX,AX"
  ],
  [
    "100bfdb6",
    "7841",
    "JS 0x100bfdf9"
  ],
  [
    "100bfdb8",
    "8d46fd",
    "LEA EAX,[ESI + -0x3]"
  ],
  [
    "100bfdbb",
    "83f810",
    "CMP EAX,0x10"
  ],
  [
    "100bfdbe",
    "7712",
    "JA 0x100bfdd2"
  ],
  [
    "100bfdc0",
    "8d4610",
    "LEA EAX,[ESI + 0x10]"
  ],
  [
    "100bfdc3",
    "50",
    "PUSH EAX"
  ],
  [
    "100bfdc4",
    "e806baffff",
    "CALL 0x100bb7cf"
  ],
  [
    "100bfdc9",
    "59",
    "POP ECX"
  ],
  [
    "100bfdca",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100bfdcc",
    "0f8493000000",
    "JZ 0x100bfe65"
  ],
  [
    "100bfdd2",
    "a1c0712f10",
    "MOV EAX,[0x102f71c0]"
  ],
  [
    "100bfdd7",
    "ff34b0",
    "PUSH dword ptr [EAX + ESI*0x4]"
  ],
  [
    "100bfdda",
    "56",
    "PUSH ESI"
  ],
  [
    "100bfddb",
    "e832f2ffff",
    "CALL 0x100bf012"
  ],
  [
    "100bfde0",
    "59",
    "POP ECX"
  ],
  [
    "100bfde1",
    "59",
    "POP ECX"
  ],
  [
    "100bfde2",
    "a1c0712f10",
    "MOV EAX,[0x102f71c0]"
  ],
  [
    "100bfde7",
    "8b04b0",
    "MOV EAX,dword ptr [EAX + ESI*0x4]"
  ],
  [
    "100bfdea",
    "f6400c83",
    "TEST byte ptr [EAX + 0xc],0x83"
  ],
  [
    "100bfdee",
    "740c",
    "JZ 0x100bfdfc"
  ],
  [
    "100bfdf0",
    "50",
    "PUSH EAX"
  ],
  [
    "100bfdf1",
    "56",
    "PUSH ESI"
  ],
  [
    "100bfdf2",
    "e87ff2ffff",
    "CALL 0x100bf076"
  ],
  [
    "100bfdf7",
    "59",
    "POP ECX"
  ],
  [
    "100bfdf8",
    "59",
    "POP ECX"
  ],
  [
    "100bfdf9",
    "46",
    "INC ESI"
  ],
  [
    "100bfdfa",
    "eb93",
    "JMP 0x100bfd8f"
  ],
  [
    "100bfdfc",
    "8bf8",
    "MOV EDI,EAX"
  ],
  [
    "100bfdfe",
    "eb62",
    "JMP 0x100bfe62"
  ],
  [
    "100bfe00",
    "c1e602",
    "SHL ESI,0x2"
  ],
  [
    "100bfe03",
    "6a38",
    "PUSH 0x38"
  ],
  [
    "100bfe05",
    "e8c6f0feff",
    "CALL 0x100aeed0"
  ],
  [
    "100bfe0a",
    "59",
    "POP ECX"
  ],
  [
    "100bfe0b",
    "8b0dc0712f10",
    "MOV ECX,dword ptr [0x102f71c0]"
  ],
  [
    "100bfe11",
    "89040e",
    "MOV dword ptr [ESI + ECX*0x1],EAX"
  ],
  [
    "100bfe14",
    "a1c0712f10",
    "MOV EAX,[0x102f71c0]"
  ],
  [
    "100bfe19",
    "03c6",
    "ADD EAX,ESI"
  ],
  [
    "100bfe1b",
    "3918",
    "CMP dword ptr [EAX],EBX"
  ],
  [
    "100bfe1d",
    "7446",
    "JZ 0x100bfe65"
  ],
  [
    "100bfe1f",
    "68a00f0000",
    "PUSH 0xfa0"
  ],
  [
    "100bfe24",
    "8b00",
    "MOV EAX,dword ptr [EAX]"
  ],
  [
    "100bfe26",
    "83c020",
    "ADD EAX,0x20"
  ],
  [
    "100bfe29",
    "50",
    "PUSH EAX"
  ],
  [
    "100bfe2a",
    "e8f8c0ffff",
    "CALL 0x100bbf27"
  ],
  [
    "100bfe2f",
    "59",
    "POP ECX"
  ],
  [
    "100bfe30",
    "59",
    "POP ECX"
  ],
  [
    "100bfe31",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100bfe33",
    "a1c0712f10",
    "MOV EAX,[0x102f71c0]"
  ],
  [
    "100bfe38",
    "7513",
    "JNZ 0x100bfe4d"
  ],
  [
    "100bfe3a",
    "ff3406",
    "PUSH dword ptr [ESI + EAX*0x1]"
  ],
  [
    "100bfe3d",
    "e862abfeff",
    "CALL 0x100aa9a4"
  ],
  [
    "100bfe42",
    "59",
    "POP ECX"
  ],
  [
    "100bfe43",
    "a1c0712f10",
    "MOV EAX,[0x102f71c0]"
  ],
  [
    "100bfe48",
    "891c06",
    "MOV dword ptr [ESI + EAX*0x1],EBX"
  ],
  [
    "100bfe4b",
    "eb18",
    "JMP 0x100bfe65"
  ],
  [
    "100bfe4d",
    "8b0406",
    "MOV EAX,dword ptr [ESI + EAX*0x1]"
  ],
  [
    "100bfe50",
    "83c020",
    "ADD EAX,0x20"
  ],
  [
    "100bfe53",
    "50",
    "PUSH EAX"
  ],
  [
    "100bfe54",
    "ff1504962f10",
    "CALL dword ptr [0x102f9604]"
  ],
  [
    "100bfe5a",
    "a1c0712f10",
    "MOV EAX,[0x102f71c0]"
  ],
  [
    "100bfe5f",
    "8b3c06",
    "MOV EDI,dword ptr [ESI + EAX*0x1]"
  ],
  [
    "100bfe62",
    "897de4",
    "MOV dword ptr [EBP + -0x1c],EDI"
  ],
  [
    "100bfe65",
    "3bfb",
    "CMP EDI,EBX"
  ],
  [
    "100bfe67",
    "7416",
    "JZ 0x100bfe7f"
  ],
  [
    "100bfe69",
    "81670c00800000",
    "AND dword ptr [EDI + 0xc],0x8000"
  ],
  [
    "100bfe70",
    "895f04",
    "MOV dword ptr [EDI + 0x4],EBX"
  ],
  [
    "100bfe73",
    "895f08",
    "MOV dword ptr [EDI + 0x8],EBX"
  ],
  [
    "100bfe76",
    "891f",
    "MOV dword ptr [EDI],EBX"
  ],
  [
    "100bfe78",
    "895f1c",
    "MOV dword ptr [EDI + 0x1c],EBX"
  ],
  [
    "100bfe7b",
    "834f10ff",
    "OR dword ptr [EDI + 0x10],0xffffffff"
  ],
  [
    "100bfe7f",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100bfe86",
    "e80b000000",
    "CALL 0x100bfe96"
  ],
  [
    "100bfe8b",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100bfe8d",
    "e81bedfeff",
    "CALL 0x100aebad"
  ],
  [
    "100bfe92",
    "c3",
    "RET"
  ],
  [
    "100bfe96",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100bfe98",
    "e805b9ffff",
    "CALL 0x100bb7a2"
  ],
  [
    "100bfe9d",
    "59",
    "POP ECX"
  ],
  [
    "100bfe9e",
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
    "100d0b5c",
    "8b442404",
    "MOV EAX,dword ptr [ESP + 0x4]"
  ],
  [
    "100d0b60",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100d0b62",
    "56",
    "PUSH ESI"
  ],
  [
    "100d0b63",
    "57",
    "PUSH EDI"
  ],
  [
    "100d0b64",
    "7c5a",
    "JL 0x100d0bc0"
  ],
  [
    "100d0b66",
    "3b0568702f10",
    "CMP EAX,dword ptr [0x102f7068]"
  ],
  [
    "100d0b6c",
    "7352",
    "JNC 0x100d0bc0"
  ],
  [
    "100d0b6e",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100d0b70",
    "83e61f",
    "AND ESI,0x1f"
  ],
  [
    "100d0b73",
    "6bf638",
    "IMUL ESI,ESI,0x38"
  ],
  [
    "100d0b76",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100d0b78",
    "c1f905",
    "SAR ECX,0x5"
  ],
  [
    "100d0b7b",
    "8d3c8dc0702f10",
    "LEA EDI,[ECX*0x4 + 0x102f70c0]"
  ],
  [
    "100d0b82",
    "8b0f",
    "MOV ECX,dword ptr [EDI]"
  ],
  [
    "100d0b84",
    "833c0eff",
    "CMP dword ptr [ESI + ECX*0x1],-0x1"
  ],
  [
    "100d0b88",
    "7536",
    "JNZ 0x100d0bc0"
  ],
  [
    "100d0b8a",
    "833d9c642f1001",
    "CMP dword ptr [0x102f649c],0x1"
  ],
  [
    "100d0b91",
    "53",
    "PUSH EBX"
  ],
  [
    "100d0b92",
    "8b5c2414",
    "MOV EBX,dword ptr [ESP + 0x14]"
  ],
  [
    "100d0b96",
    "751e",
    "JNZ 0x100d0bb6"
  ],
  [
    "100d0b98",
    "83e800",
    "SUB EAX,0x0"
  ],
  [
    "100d0b9b",
    "7410",
    "JZ 0x100d0bad"
  ],
  [
    "100d0b9d",
    "48",
    "DEC EAX"
  ],
  [
    "100d0b9e",
    "7408",
    "JZ 0x100d0ba8"
  ],
  [
    "100d0ba0",
    "48",
    "DEC EAX"
  ],
  [
    "100d0ba1",
    "7513",
    "JNZ 0x100d0bb6"
  ],
  [
    "100d0ba3",
    "53",
    "PUSH EBX"
  ],
  [
    "100d0ba4",
    "6af4",
    "PUSH -0xc"
  ],
  [
    "100d0ba6",
    "eb08",
    "JMP 0x100d0bb0"
  ],
  [
    "100d0ba8",
    "53",
    "PUSH EBX"
  ],
  [
    "100d0ba9",
    "6af5",
    "PUSH -0xb"
  ],
  [
    "100d0bab",
    "eb03",
    "JMP 0x100d0bb0"
  ],
  [
    "100d0bad",
    "53",
    "PUSH EBX"
  ],
  [
    "100d0bae",
    "6af6",
    "PUSH -0xa"
  ],
  [
    "100d0bb0",
    "ff1508972f10",
    "CALL dword ptr [0x102f9708]"
  ],
  [
    "100d0bb6",
    "8b07",
    "MOV EAX,dword ptr [EDI]"
  ],
  [
    "100d0bb8",
    "891c06",
    "MOV dword ptr [ESI + EAX*0x1],EBX"
  ],
  [
    "100d0bbb",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100d0bbd",
    "5b",
    "POP EBX"
  ],
  [
    "100d0bbe",
    "eb16",
    "JMP 0x100d0bd6"
  ],
  [
    "100d0bc0",
    "e80ce2fdff",
    "CALL 0x100aedd1"
  ],
  [
    "100d0bc5",
    "c70009000000",
    "MOV dword ptr [EAX],0x9"
  ],
  [
    "100d0bcb",
    "e814e2fdff",
    "CALL 0x100aede4"
  ],
  [
    "100d0bd0",
    "832000",
    "AND dword ptr [EAX],0x0"
  ],
  [
    "100d0bd3",
    "83c8ff",
    "OR EAX,0xffffffff"
  ],
  [
    "100d0bd6",
    "5f",
    "POP EDI"
  ],
  [
    "100d0bd7",
    "5e",
    "POP ESI"
  ],
  [
    "100d0bd8",
    "c3",
    "RET"
  ],
  [
    "100d0bd9",
    "8b4c2404",
    "MOV ECX,dword ptr [ESP + 0x4]"
  ],
  [
    "100d0bdd",
    "53",
    "PUSH EBX"
  ],
  [
    "100d0bde",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100d0be0",
    "3bcb",
    "CMP ECX,EBX"
  ],
  [
    "100d0be2",
    "56",
    "PUSH ESI"
  ],
  [
    "100d0be3",
    "57",
    "PUSH EDI"
  ],
  [
    "100d0be4",
    "7c5b",
    "JL 0x100d0c41"
  ],
  [
    "100d0be6",
    "3b0d68702f10",
    "CMP ECX,dword ptr [0x102f7068]"
  ],
  [
    "100d0bec",
    "7353",
    "JNC 0x100d0c41"
  ],
  [
    "100d0bee",
    "8bf1",
    "MOV ESI,ECX"
  ],
  [
    "100d0bf0",
    "83e61f",
    "AND ESI,0x1f"
  ],
  [
    "100d0bf3",
    "6bf638",
    "IMUL ESI,ESI,0x38"
  ],
  [
    "100d0bf6",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "100d0bf8",
    "c1f805",
    "SAR EAX,0x5"
  ],
  [
    "100d0bfb",
    "8d3c85c0702f10",
    "LEA EDI,[EAX*0x4 + 0x102f70c0]"
  ],
  [
    "100d0c02",
    "8b07",
    "MOV EAX,dword ptr [EDI]"
  ],
  [
    "100d0c04",
    "03c6",
    "ADD EAX,ESI"
  ],
  [
    "100d0c06",
    "f6400401",
    "TEST byte ptr [EAX + 0x4],0x1"
  ],
  [
    "100d0c0a",
    "7435",
    "JZ 0x100d0c41"
  ],
  [
    "100d0c0c",
    "8338ff",
    "CMP dword ptr [EAX],-0x1"
  ],
  [
    "100d0c0f",
    "7430",
    "JZ 0x100d0c41"
  ],
  [
    "100d0c11",
    "833d9c642f1001",
    "CMP dword ptr [0x102f649c],0x1"
  ],
  [
    "100d0c18",
    "751d",
    "JNZ 0x100d0c37"
  ],
  [
    "100d0c1a",
    "2bcb",
    "SUB ECX,EBX"
  ],
  [
    "100d0c1c",
    "7410",
    "JZ 0x100d0c2e"
  ],
  [
    "100d0c1e",
    "49",
    "DEC ECX"
  ],
  [
    "100d0c1f",
    "7408",
    "JZ 0x100d0c29"
  ],
  [
    "100d0c21",
    "49",
    "DEC ECX"
  ],
  [
    "100d0c22",
    "7513",
    "JNZ 0x100d0c37"
  ],
  [
    "100d0c24",
    "53",
    "PUSH EBX"
  ],
  [
    "100d0c25",
    "6af4",
    "PUSH -0xc"
  ],
  [
    "100d0c27",
    "eb08",
    "JMP 0x100d0c31"
  ],
  [
    "100d0c29",
    "53",
    "PUSH EBX"
  ],
  [
    "100d0c2a",
    "6af5",
    "PUSH -0xb"
  ],
  [
    "100d0c2c",
    "eb03",
    "JMP 0x100d0c31"
  ],
  [
    "100d0c2e",
    "53",
    "PUSH EBX"
  ],
  [
    "100d0c2f",
    "6af6",
    "PUSH -0xa"
  ],
  [
    "100d0c31",
    "ff1508972f10",
    "CALL dword ptr [0x102f9708]"
  ],
  [
    "100d0c37",
    "8b07",
    "MOV EAX,dword ptr [EDI]"
  ],
  [
    "100d0c39",
    "830c06ff",
    "OR dword ptr [ESI + EAX*0x1],0xffffffff"
  ],
  [
    "100d0c3d",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100d0c3f",
    "eb15",
    "JMP 0x100d0c56"
  ],
  [
    "100d0c41",
    "e88be1fdff",
    "CALL 0x100aedd1"
  ],
  [
    "100d0c46",
    "c70009000000",
    "MOV dword ptr [EAX],0x9"
  ],
  [
    "100d0c4c",
    "e893e1fdff",
    "CALL 0x100aede4"
  ],
  [
    "100d0c51",
    "8918",
    "MOV dword ptr [EAX],EBX"
  ],
  [
    "100d0c53",
    "83c8ff",
    "OR EAX,0xffffffff"
  ],
  [
    "100d0c56",
    "5f",
    "POP EDI"
  ],
  [
    "100d0c57",
    "5e",
    "POP ESI"
  ],
  [
    "100d0c58",
    "5b",
    "POP EBX"
  ],
  [
    "100d0c59",
    "c3",
    "RET"
  ],
  [
    "100d0c5a",
    "8b442404",
    "MOV EAX,dword ptr [ESP + 0x4]"
  ],
  [
    "100d0c5e",
    "83f8fe",
    "CMP EAX,-0x2"
  ],
  [
    "100d0c61",
    "7517",
    "JNZ 0x100d0c7a"
  ],
  [
    "100d0c63",
    "e87ce1fdff",
    "CALL 0x100aede4"
  ],
  [
    "100d0c68",
    "832000",
    "AND dword ptr [EAX],0x0"
  ],
  [
    "100d0c6b",
    "e861e1fdff",
    "CALL 0x100aedd1"
  ],
  [
    "100d0c70",
    "c70009000000",
    "MOV dword ptr [EAX],0x9"
  ],
  [
    "100d0c76",
    "83c8ff",
    "OR EAX,0xffffffff"
  ],
  [
    "100d0c79",
    "c3",
    "RET"
  ],
  [
    "100d0c7a",
    "56",
    "PUSH ESI"
  ],
  [
    "100d0c7b",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100d0c7d",
    "3bc6",
    "CMP EAX,ESI"
  ],
  [
    "100d0c7f",
    "7c22",
    "JL 0x100d0ca3"
  ],
  [
    "100d0c81",
    "3b0568702f10",
    "CMP EAX,dword ptr [0x102f7068]"
  ],
  [
    "100d0c87",
    "731a",
    "JNC 0x100d0ca3"
  ],
  [
    "100d0c89",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100d0c8b",
    "83e01f",
    "AND EAX,0x1f"
  ],
  [
    "100d0c8e",
    "6bc038",
    "IMUL EAX,EAX,0x38"
  ],
  [
    "100d0c91",
    "c1f905",
    "SAR ECX,0x5"
  ],
  [
    "100d0c94",
    "8b0c8dc0702f10",
    "MOV ECX,dword ptr [ECX*0x4 + 0x102f70c0]"
  ],
  [
    "100d0c9b",
    "03c1",
    "ADD EAX,ECX"
  ],
  [
    "100d0c9d",
    "f6400401",
    "TEST byte ptr [EAX + 0x4],0x1"
  ],
  [
    "100d0ca1",
    "7524",
    "JNZ 0x100d0cc7"
  ],
  [
    "100d0ca3",
    "e83ce1fdff",
    "CALL 0x100aede4"
  ],
  [
    "100d0ca8",
    "8930",
    "MOV dword ptr [EAX],ESI"
  ],
  [
    "100d0caa",
    "e822e1fdff",
    "CALL 0x100aedd1"
  ],
  [
    "100d0caf",
    "56",
    "PUSH ESI"
  ],
  [
    "100d0cb0",
    "56",
    "PUSH ESI"
  ],
  [
    "100d0cb1",
    "56",
    "PUSH ESI"
  ],
  [
    "100d0cb2",
    "56",
    "PUSH ESI"
  ],
  [
    "100d0cb3",
    "56",
    "PUSH ESI"
  ],
  [
    "100d0cb4",
    "c70009000000",
    "MOV dword ptr [EAX],0x9"
  ],
  [
    "100d0cba",
    "e813d5fdff",
    "CALL 0x100ae1d2"
  ],
  [
    "100d0cbf",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100d0cc2",
    "83c8ff",
    "OR EAX,0xffffffff"
  ],
  [
    "100d0cc5",
    "5e",
    "POP ESI"
  ],
  [
    "100d0cc6",
    "c3",
    "RET"
  ],
  [
    "100d0cc7",
    "8b00",
    "MOV EAX,dword ptr [EAX]"
  ],
  [
    "100d0cc9",
    "5e",
    "POP ESI"
  ],
  [
    "100d0cca",
    "c3",
    "RET"
  ],
  [
    "100d0ccb",
    "6a0c",
    "PUSH 0xc"
  ],
  [
    "100d0ccd",
    "68a08f0f10",
    "PUSH 0x100f8fa0"
  ],
  [
    "100d0cd2",
    "e891defdff",
    "CALL 0x100aeb68"
  ],
  [
    "100d0cd7",
    "8b7d08",
    "MOV EDI,dword ptr [EBP + 0x8]"
  ],
  [
    "100d0cda",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100d0cdc",
    "c1f805",
    "SAR EAX,0x5"
  ],
  [
    "100d0cdf",
    "8bf7",
    "MOV ESI,EDI"
  ],
  [
    "100d0ce1",
    "83e61f",
    "AND ESI,0x1f"
  ],
  [
    "100d0ce4",
    "6bf638",
    "IMUL ESI,ESI,0x38"
  ],
  [
    "100d0ce7",
    "033485c0702f10",
    "ADD ESI,dword ptr [EAX*0x4 + 0x102f70c0]"
  ],
  [
    "100d0cee",
    "c745e401000000",
    "MOV dword ptr [EBP + -0x1c],0x1"
  ],
  [
    "100d0cf5",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100d0cf7",
    "395e08",
    "CMP dword ptr [ESI + 0x8],EBX"
  ],
  [
    "100d0cfa",
    "7536",
    "JNZ 0x100d0d32"
  ],
  [
    "100d0cfc",
    "6a0a",
    "PUSH 0xa"
  ],
  [
    "100d0cfe",
    "e88fabfeff",
    "CALL 0x100bb892"
  ],
  [
    "100d0d03",
    "59",
    "POP ECX"
  ],
  [
    "100d0d04",
    "895dfc",
    "MOV dword ptr [EBP + -0x4],EBX"
  ],
  [
    "100d0d07",
    "395e08",
    "CMP dword ptr [ESI + 0x8],EBX"
  ],
  [
    "100d0d0a",
    "751a",
    "JNZ 0x100d0d26"
  ],
  [
    "100d0d0c",
    "68a00f0000",
    "PUSH 0xfa0"
  ],
  [
    "100d0d11",
    "8d460c",
    "LEA EAX,[ESI + 0xc]"
  ],
  [
    "100d0d14",
    "50",
    "PUSH EAX"
  ],
  [
    "100d0d15",
    "e80db2feff",
    "CALL 0x100bbf27"
  ],
  [
    "100d0d1a",
    "59",
    "POP ECX"
  ],
  [
    "100d0d1b",
    "59",
    "POP ECX"
  ],
  [
    "100d0d1c",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100d0d1e",
    "7503",
    "JNZ 0x100d0d23"
  ],
  [
    "100d0d20",
    "895de4",
    "MOV dword ptr [EBP + -0x1c],EBX"
  ],
  [
    "100d0d23",
    "ff4608",
    "INC dword ptr [ESI + 0x8]"
  ],
  [
    "100d0d26",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100d0d2d",
    "e830000000",
    "CALL 0x100d0d62"
  ],
  [
    "100d0d32",
    "395de4",
    "CMP dword ptr [EBP + -0x1c],EBX"
  ],
  [
    "100d0d35",
    "741d",
    "JZ 0x100d0d54"
  ],
  [
    "100d0d37",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100d0d39",
    "c1f805",
    "SAR EAX,0x5"
  ],
  [
    "100d0d3c",
    "83e71f",
    "AND EDI,0x1f"
  ],
  [
    "100d0d3f",
    "6bff38",
    "IMUL EDI,EDI,0x38"
  ],
  [
    "100d0d42",
    "8b0485c0702f10",
    "MOV EAX,dword ptr [EAX*0x4 + 0x102f70c0]"
  ],
  [
    "100d0d49",
    "8d44380c",
    "LEA EAX,[EAX + EDI*0x1 + 0xc]"
  ],
  [
    "100d0d4d",
    "50",
    "PUSH EAX"
  ],
  [
    "100d0d4e",
    "ff1504962f10",
    "CALL dword ptr [0x102f9604]"
  ],
  [
    "100d0d54",
    "8b45e4",
    "MOV EAX,dword ptr [EBP + -0x1c]"
  ],
  [
    "100d0d57",
    "e851defdff",
    "CALL 0x100aebad"
  ],
  [
    "100d0d5c",
    "c3",
    "RET"
  ],
  [
    "100d0d6b",
    "8b442404",
    "MOV EAX,dword ptr [ESP + 0x4]"
  ],
  [
    "100d0d6f",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100d0d71",
    "83e01f",
    "AND EAX,0x1f"
  ],
  [
    "100d0d74",
    "6bc038",
    "IMUL EAX,EAX,0x38"
  ],
  [
    "100d0d77",
    "c1f905",
    "SAR ECX,0x5"
  ],
  [
    "100d0d7a",
    "8b0c8dc0702f10",
    "MOV ECX,dword ptr [ECX*0x4 + 0x102f70c0]"
  ],
  [
    "100d0d81",
    "8d44010c",
    "LEA EAX,[ECX + EAX*0x1 + 0xc]"
  ],
  [
    "100d0d85",
    "50",
    "PUSH EAX"
  ],
  [
    "100d0d86",
    "ff1508962f10",
    "CALL dword ptr [0x102f9608]"
  ],
  [
    "100d0d8c",
    "c3",
    "RET"
  ],
  [
    "100d0d8d",
    "6a18",
    "PUSH 0x18"
  ],
  [
    "100d0d8f",
    "68c08f0f10",
    "PUSH 0x100f8fc0"
  ],
  [
    "100d0d94",
    "e8cfddfdff",
    "CALL 0x100aeb68"
  ],
  [
    "100d0d99",
    "834de4ff",
    "OR dword ptr [EBP + -0x1c],0xffffffff"
  ],
  [
    "100d0d9d",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100d0d9f",
    "897ddc",
    "MOV dword ptr [EBP + -0x24],EDI"
  ],
  [
    "100d0da2",
    "6a0b",
    "PUSH 0xb"
  ],
  [
    "100d0da4",
    "e826aafeff",
    "CALL 0x100bb7cf"
  ],
  [
    "100d0da9",
    "59",
    "POP ECX"
  ],
  [
    "100d0daa",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100d0dac",
    "7508",
    "JNZ 0x100d0db6"
  ],
  [
    "100d0dae",
    "83c8ff",
    "OR EAX,0xffffffff"
  ],
  [
    "100d0db1",
    "e967010000",
    "JMP 0x100d0f1d"
  ],
  [
    "100d0db6",
    "6a0b",
    "PUSH 0xb"
  ],
  [
    "100d0db8",
    "e8d5aafeff",
    "CALL 0x100bb892"
  ],
  [
    "100d0dbd",
    "59",
    "POP ECX"
  ],
  [
    "100d0dbe",
    "897dfc",
    "MOV dword ptr [EBP + -0x4],EDI"
  ],
  [
    "100d0dc1",
    "897dd8",
    "MOV dword ptr [EBP + -0x28],EDI"
  ],
  [
    "100d0dc4",
    "83ff40",
    "CMP EDI,0x40"
  ],
  [
    "100d0dc7",
    "0f8d41010000",
    "JGE 0x100d0f0e"
  ],
  [
    "100d0dcd",
    "8b34bdc0702f10",
    "MOV ESI,dword ptr [EDI*0x4 + 0x102f70c0]"
  ],
  [
    "100d0dd4",
    "85f6",
    "TEST ESI,ESI"
  ],
  [
    "100d0dd6",
    "0f84bf000000",
    "JZ 0x100d0e9b"
  ],
  [
    "100d0ddc",
    "8975e0",
    "MOV dword ptr [EBP + -0x20],ESI"
  ],
  [
    "100d0ddf",
    "8b04bdc0702f10",
    "MOV EAX,dword ptr [EDI*0x4 + 0x102f70c0]"
  ],
  [
    "100d0de6",
    "0500070000",
    "ADD EAX,0x700"
  ],
  [
    "100d0deb",
    "3bf0",
    "CMP ESI,EAX"
  ],
  [
    "100d0ded",
    "0f839c000000",
    "JNC 0x100d0e8f"
  ],
  [
    "100d0df3",
    "f6460401",
    "TEST byte ptr [ESI + 0x4],0x1"
  ],
  [
    "100d0df7",
    "755c",
    "JNZ 0x100d0e55"
  ],
  [
    "100d0df9",
    "837e0800",
    "CMP dword ptr [ESI + 0x8],0x0"
  ],
  [
    "100d0dfd",
    "7539",
    "JNZ 0x100d0e38"
  ],
  [
    "100d0dff",
    "6a0a",
    "PUSH 0xa"
  ],
  [
    "100d0e01",
    "e88caafeff",
    "CALL 0x100bb892"
  ],
  [
    "100d0e06",
    "59",
    "POP ECX"
  ],
  [
    "100d0e07",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100d0e09",
    "43",
    "INC EBX"
  ],
  [
    "100d0e0a",
    "895dfc",
    "MOV dword ptr [EBP + -0x4],EBX"
  ],
  [
    "100d0e0d",
    "837e0800",
    "CMP dword ptr [ESI + 0x8],0x0"
  ],
  [
    "100d0e11",
    "751c",
    "JNZ 0x100d0e2f"
  ],
  [
    "100d0e13",
    "68a00f0000",
    "PUSH 0xfa0"
  ],
  [
    "100d0e18",
    "8d460c",
    "LEA EAX,[ESI + 0xc]"
  ],
  [
    "100d0e1b",
    "50",
    "PUSH EAX"
  ],
  [
    "100d0e1c",
    "e806b1feff",
    "CALL 0x100bbf27"
  ],
  [
    "100d0e21",
    "59",
    "POP ECX"
  ],
  [
    "100d0e22",
    "59",
    "POP ECX"
  ],
  [
    "100d0e23",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100d0e25",
    "7505",
    "JNZ 0x100d0e2c"
  ],
  [
    "100d0e27",
    "895ddc",
    "MOV dword ptr [EBP + -0x24],EBX"
  ],
  [
    "100d0e2a",
    "eb03",
    "JMP 0x100d0e2f"
  ],
  [
    "100d0e2c",
    "ff4608",
    "INC dword ptr [ESI + 0x8]"
  ],
  [
    "100d0e2f",
    "8365fc00",
    "AND dword ptr [EBP + -0x4],0x0"
  ],
  [
    "100d0e33",
    "e828000000",
    "CALL 0x100d0e60"
  ],
  [
    "100d0e38",
    "837ddc00",
    "CMP dword ptr [EBP + -0x24],0x0"
  ],
  [
    "100d0e3c",
    "7517",
    "JNZ 0x100d0e55"
  ],
  [
    "100d0e3e",
    "8d5e0c",
    "LEA EBX,[ESI + 0xc]"
  ],
  [
    "100d0e41",
    "53",
    "PUSH EBX"
  ],
  [
    "100d0e42",
    "ff1504962f10",
    "CALL dword ptr [0x102f9604]"
  ],
  [
    "100d0e48",
    "f6460401",
    "TEST byte ptr [ESI + 0x4],0x1"
  ],
  [
    "100d0e4c",
    "741b",
    "JZ 0x100d0e69"
  ],
  [
    "100d0e4e",
    "53",
    "PUSH EBX"
  ],
  [
    "100d0e4f",
    "ff1508962f10",
    "CALL dword ptr [0x102f9608]"
  ],
  [
    "100d0e55",
    "83c638",
    "ADD ESI,0x38"
  ],
  [
    "100d0e58",
    "eb82",
    "JMP 0x100d0ddc"
  ],
  [
    "100d0e60",
    "6a0a",
    "PUSH 0xa"
  ],
  [
    "100d0e62",
    "e83ba9feff",
    "CALL 0x100bb7a2"
  ],
  [
    "100d0e67",
    "59",
    "POP ECX"
  ],
  [
    "100d0e68",
    "c3",
    "RET"
  ],
  [
    "100d0e69",
    "837ddc00",
    "CMP dword ptr [EBP + -0x24],0x0"
  ],
  [
    "100d0e6d",
    "75e6",
    "JNZ 0x100d0e55"
  ],
  [
    "100d0e6f",
    "c6460401",
    "MOV byte ptr [ESI + 0x4],0x1"
  ],
  [
    "100d0e73",
    "830eff",
    "OR dword ptr [ESI],0xffffffff"
  ],
  [
    "100d0e76",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100d0e78",
    "2b04bdc0702f10",
    "SUB EAX,dword ptr [EDI*0x4 + 0x102f70c0]"
  ],
  [
    "100d0e7f",
    "99",
    "CDQ"
  ],
  [
    "100d0e80",
    "6a38",
    "PUSH 0x38"
  ],
  [
    "100d0e82",
    "59",
    "POP ECX"
  ],
  [
    "100d0e83",
    "f7f9",
    "IDIV ECX"
  ],
  [
    "100d0e85",
    "8bcf",
    "MOV ECX,EDI"
  ],
  [
    "100d0e87",
    "c1e105",
    "SHL ECX,0x5"
  ],
  [
    "100d0e8a",
    "03c1",
    "ADD EAX,ECX"
  ],
  [
    "100d0e8c",
    "8945e4",
    "MOV dword ptr [EBP + -0x1c],EAX"
  ],
  [
    "100d0e8f",
    "837de4ff",
    "CMP dword ptr [EBP + -0x1c],-0x1"
  ],
  [
    "100d0e93",
    "7579",
    "JNZ 0x100d0f0e"
  ],
  [
    "100d0e95",
    "47",
    "INC EDI"
  ],
  [
    "100d0e96",
    "e926ffffff",
    "JMP 0x100d0dc1"
  ],
  [
    "100d0e9b",
    "6a38",
    "PUSH 0x38"
  ],
  [
    "100d0e9d",
    "6a20",
    "PUSH 0x20"
  ],
  [
    "100d0e9f",
    "e86ce0fdff",
    "CALL 0x100aef10"
  ],
  [
    "100d0ea4",
    "59",
    "POP ECX"
  ],
  [
    "100d0ea5",
    "59",
    "POP ECX"
  ],
  [
    "100d0ea6",
    "8945e0",
    "MOV dword ptr [EBP + -0x20],EAX"
  ],
  [
    "100d0ea9",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100d0eab",
    "7461",
    "JZ 0x100d0f0e"
  ],
  [
    "100d0ead",
    "8d0cbdc0702f10",
    "LEA ECX,[EDI*0x4 + 0x102f70c0]"
  ],
  [
    "100d0eb4",
    "8901",
    "MOV dword ptr [ECX],EAX"
  ],
  [
    "100d0eb6",
    "830568702f1020",
    "ADD dword ptr [0x102f7068],0x20"
  ],
  [
    "100d0ebd",
    "8b11",
    "MOV EDX,dword ptr [ECX]"
  ],
  [
    "100d0ebf",
    "81c200070000",
    "ADD EDX,0x700"
  ],
  [
    "100d0ec5",
    "3bc2",
    "CMP EAX,EDX"
  ],
  [
    "100d0ec7",
    "7317",
    "JNC 0x100d0ee0"
  ],
  [
    "100d0ec9",
    "c6400400",
    "MOV byte ptr [EAX + 0x4],0x0"
  ],
  [
    "100d0ecd",
    "8308ff",
    "OR dword ptr [EAX],0xffffffff"
  ],
  [
    "100d0ed0",
    "c640050a",
    "MOV byte ptr [EAX + 0x5],0xa"
  ],
  [
    "100d0ed4",
    "83600800",
    "AND dword ptr [EAX + 0x8],0x0"
  ],
  [
    "100d0ed8",
    "83c038",
    "ADD EAX,0x38"
  ],
  [
    "100d0edb",
    "8945e0",
    "MOV dword ptr [EBP + -0x20],EAX"
  ],
  [
    "100d0ede",
    "ebdd",
    "JMP 0x100d0ebd"
  ],
  [
    "100d0ee0",
    "c1e705",
    "SHL EDI,0x5"
  ],
  [
    "100d0ee3",
    "897de4",
    "MOV dword ptr [EBP + -0x1c],EDI"
  ],
  [
    "100d0ee6",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100d0ee8",
    "c1f805",
    "SAR EAX,0x5"
  ],
  [
    "100d0eeb",
    "8bcf",
    "MOV ECX,EDI"
  ],
  [
    "100d0eed",
    "83e11f",
    "AND ECX,0x1f"
  ],
  [
    "100d0ef0",
    "6bc938",
    "IMUL ECX,ECX,0x38"
  ],
  [
    "100d0ef3",
    "8b0485c0702f10",
    "MOV EAX,dword ptr [EAX*0x4 + 0x102f70c0]"
  ],
  [
    "100d0efa",
    "c644080401",
    "MOV byte ptr [EAX + ECX*0x1 + 0x4],0x1"
  ],
  [
    "100d0eff",
    "57",
    "PUSH EDI"
  ],
  [
    "100d0f00",
    "e8c6fdffff",
    "CALL 0x100d0ccb"
  ],
  [
    "100d0f05",
    "59",
    "POP ECX"
  ],
  [
    "100d0f06",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100d0f08",
    "7504",
    "JNZ 0x100d0f0e"
  ],
  [
    "100d0f0a",
    "834de4ff",
    "OR dword ptr [EBP + -0x1c],0xffffffff"
  ],
  [
    "100d0f0e",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100d0f15",
    "e809000000",
    "CALL 0x100d0f23"
  ],
  [
    "100d0f1a",
    "8b45e4",
    "MOV EAX,dword ptr [EBP + -0x1c]"
  ],
  [
    "100d0f1d",
    "e88bdcfdff",
    "CALL 0x100aebad"
  ],
  [
    "100d0f22",
    "c3",
    "RET"
  ],
  [
    "100d0f23",
    "6a0b",
    "PUSH 0xb"
  ],
  [
    "100d0f25",
    "e878a8feff",
    "CALL 0x100bb7a2"
  ],
  [
    "100d0f2a",
    "59",
    "POP ECX"
  ],
  [
    "100d0f2b",
    "c3",
    "RET"
  ],
  [
    "100d1122",
    "55",
    "PUSH EBP"
  ],
  [
    "100d1123",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100d1125",
    "83ec34",
    "SUB ESP,0x34"
  ],
  [
    "100d1128",
    "53",
    "PUSH EBX"
  ],
  [
    "100d1129",
    "33db",
    "XOR EBX,EBX"
  ],
  [
    "100d112b",
    "f6451080",
    "TEST byte ptr [EBP + 0x10],0x80"
  ],
  [
    "100d112f",
    "56",
    "PUSH ESI"
  ],
  [
    "100d1130",
    "57",
    "PUSH EDI"
  ],
  [
    "100d1131",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100d1133",
    "895ddc",
    "MOV dword ptr [EBP + -0x24],EBX"
  ],
  [
    "100d1136",
    "895dd8",
    "MOV dword ptr [EBP + -0x28],EBX"
  ],
  [
    "100d1139",
    "885dfe",
    "MOV byte ptr [EBP + -0x2],BL"
  ],
  [
    "100d113c",
    "c745cc0c000000",
    "MOV dword ptr [EBP + -0x34],0xc"
  ],
  [
    "100d1143",
    "895dd0",
    "MOV dword ptr [EBP + -0x30],EBX"
  ],
  [
    "100d1146",
    "7409",
    "JZ 0x100d1151"
  ],
  [
    "100d1148",
    "895dd4",
    "MOV dword ptr [EBP + -0x2c],EBX"
  ],
  [
    "100d114b",
    "c645ff10",
    "MOV byte ptr [EBP + -0x1],0x10"
  ],
  [
    "100d114f",
    "eb0a",
    "JMP 0x100d115b"
  ],
  [
    "100d1151",
    "c745d401000000",
    "MOV dword ptr [EBP + -0x2c],0x1"
  ],
  [
    "100d1158",
    "885dff",
    "MOV byte ptr [EBP + -0x1],BL"
  ],
  [
    "100d115b",
    "8d45dc",
    "LEA EAX,[EBP + -0x24]"
  ],
  [
    "100d115e",
    "50",
    "PUSH EAX"
  ],
  [
    "100d115f",
    "e877330000",
    "CALL 0x100d44db"
  ],
  [
    "100d1164",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100d1166",
    "59",
    "POP ECX"
  ],
  [
    "100d1167",
    "740d",
    "JZ 0x100d1176"
  ],
  [
    "100d1169",
    "53",
    "PUSH EBX"
  ],
  [
    "100d116a",
    "53",
    "PUSH EBX"
  ],
  [
    "100d116b",
    "53",
    "PUSH EBX"
  ],
  [
    "100d116c",
    "53",
    "PUSH EBX"
  ],
  [
    "100d116d",
    "53",
    "PUSH EBX"
  ],
  [
    "100d116e",
    "e82bcffdff",
    "CALL 0x100ae09e"
  ],
  [
    "100d1176",
    "8d45d8",
    "LEA EAX,[EBP + -0x28]"
  ],
  [
    "100d1179",
    "50",
    "PUSH EAX"
  ],
  [
    "100d117a",
    "e81e93fdff",
    "CALL 0x100aa49d"
  ],
  [
    "100d117f",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100d1181",
    "59",
    "POP ECX"
  ],
  [
    "100d1182",
    "740d",
    "JZ 0x100d1191"
  ],
  [
    "100d1184",
    "53",
    "PUSH EBX"
  ],
  [
    "100d1185",
    "53",
    "PUSH EBX"
  ],
  [
    "100d1186",
    "53",
    "PUSH EBX"
  ],
  [
    "100d1187",
    "53",
    "PUSH EBX"
  ],
  [
    "100d1188",
    "53",
    "PUSH EBX"
  ],
  [
    "100d1189",
    "e810cffdff",
    "CALL 0x100ae09e"
  ],
  [
    "100d1191",
    "8b4d10",
    "MOV ECX,dword ptr [EBP + 0x10]"
  ],
  [
    "100d1194",
    "b800800000",
    "MOV EAX,0x8000"
  ],
  [
    "100d1199",
    "85c8",
    "TEST EAX,ECX"
  ],
  [
    "100d119b",
    "7511",
    "JNZ 0x100d11ae"
  ],
  [
    "100d119d",
    "f7c100400700",
    "TEST ECX,0x74000"
  ],
  [
    "100d11a3",
    "7505",
    "JNZ 0x100d11aa"
  ],
  [
    "100d11a5",
    "3945dc",
    "CMP dword ptr [EBP + -0x24],EAX"
  ],
  [
    "100d11a8",
    "7404",
    "JZ 0x100d11ae"
  ],
  [
    "100d11aa",
    "804dff80",
    "OR byte ptr [EBP + -0x1],0x80"
  ],
  [
    "100d11ae",
    "8bc1",
    "MOV EAX,ECX"
  ],
  [
    "100d11b0",
    "83e003",
    "AND EAX,0x3"
  ],
  [
    "100d11b3",
    "2bc3",
    "SUB EAX,EBX"
  ],
  [
    "100d11b5",
    "ba000000c0",
    "MOV EDX,0xc0000000"
  ],
  [
    "100d11ba",
    "bf00000080",
    "MOV EDI,0x80000000"
  ],
  [
    "100d11bf",
    "7447",
    "JZ 0x100d1208"
  ],
  [
    "100d11c1",
    "48",
    "DEC EAX"
  ],
  [
    "100d11c2",
    "742e",
    "JZ 0x100d11f2"
  ],
  [
    "100d11c4",
    "48",
    "DEC EAX"
  ],
  [
    "100d11c5",
    "7426",
    "JZ 0x100d11ed"
  ],
  [
    "100d11c7",
    "e818dcfdff",
    "CALL 0x100aede4"
  ],
  [
    "100d11cc",
    "8918",
    "MOV dword ptr [EAX],EBX"
  ],
  [
    "100d11ce",
    "830eff",
    "OR dword ptr [ESI],0xffffffff"
  ],
  [
    "100d11d1",
    "e8fbdbfdff",
    "CALL 0x100aedd1"
  ],
  [
    "100d11d6",
    "6a16",
    "PUSH 0x16"
  ],
  [
    "100d11d8",
    "5e",
    "POP ESI"
  ],
  [
    "100d11d9",
    "53",
    "PUSH EBX"
  ],
  [
    "100d11da",
    "53",
    "PUSH EBX"
  ],
  [
    "100d11db",
    "53",
    "PUSH EBX"
  ],
  [
    "100d11dc",
    "53",
    "PUSH EBX"
  ],
  [
    "100d11dd",
    "53",
    "PUSH EBX"
  ],
  [
    "100d11de",
    "8930",
    "MOV dword ptr [EAX],ESI"
  ],
  [
    "100d11e0",
    "e8edcffdff",
    "CALL 0x100ae1d2"
  ],
  [
    "100d11e5",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100d11e8",
    "e9cd050000",
    "JMP 0x100d17ba"
  ],
  [
    "100d11ed",
    "8955f8",
    "MOV dword ptr [EBP + -0x8],EDX"
  ],
  [
    "100d11f0",
    "eb19",
    "JMP 0x100d120b"
  ],
  [
    "100d11f2",
    "f6c108",
    "TEST CL,0x8"
  ],
  [
    "100d11f5",
    "7408",
    "JZ 0x100d11ff"
  ],
  [
    "100d11f7",
    "f7c100000700",
    "TEST ECX,0x70000"
  ],
  [
    "100d11fd",
    "75ee",
    "JNZ 0x100d11ed"
  ],
  [
    "100d11ff",
    "c745f800000040",
    "MOV dword ptr [EBP + -0x8],0x40000000"
  ],
  [
    "100d1206",
    "eb03",
    "JMP 0x100d120b"
  ],
  [
    "100d1208",
    "897df8",
    "MOV dword ptr [EBP + -0x8],EDI"
  ],
  [
    "100d120b",
    "8b4514",
    "MOV EAX,dword ptr [EBP + 0x14]"
  ],
  [
    "100d120e",
    "6a10",
    "PUSH 0x10"
  ],
  [
    "100d1210",
    "59",
    "POP ECX"
  ],
  [
    "100d1211",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100d1213",
    "7437",
    "JZ 0x100d124c"
  ],
  [
    "100d1215",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100d1217",
    "742a",
    "JZ 0x100d1243"
  ],
  [
    "100d1219",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100d121b",
    "741d",
    "JZ 0x100d123a"
  ],
  [
    "100d121d",
    "2bc1",
    "SUB EAX,ECX"
  ],
  [
    "100d121f",
    "7410",
    "JZ 0x100d1231"
  ],
  [
    "100d1221",
    "83e840",
    "SUB EAX,0x40"
  ],
  [
    "100d1224",
    "75a1",
    "JNZ 0x100d11c7"
  ],
  [
    "100d1226",
    "397df8",
    "CMP dword ptr [EBP + -0x8],EDI"
  ],
  [
    "100d1229",
    "0f94c0",
    "SETZ AL"
  ],
  [
    "100d122c",
    "8945f0",
    "MOV dword ptr [EBP + -0x10],EAX"
  ],
  [
    "100d122f",
    "eb1e",
    "JMP 0x100d124f"
  ],
  [
    "100d1231",
    "c745f003000000",
    "MOV dword ptr [EBP + -0x10],0x3"
  ],
  [
    "100d1238",
    "eb15",
    "JMP 0x100d124f"
  ],
  [
    "100d123a",
    "c745f002000000",
    "MOV dword ptr [EBP + -0x10],0x2"
  ],
  [
    "100d1241",
    "eb0c",
    "JMP 0x100d124f"
  ],
  [
    "100d1243",
    "c745f001000000",
    "MOV dword ptr [EBP + -0x10],0x1"
  ],
  [
    "100d124a",
    "eb03",
    "JMP 0x100d124f"
  ],
  [
    "100d124c",
    "895df0",
    "MOV dword ptr [EBP + -0x10],EBX"
  ],
  [
    "100d124f",
    "8b4510",
    "MOV EAX,dword ptr [EBP + 0x10]"
  ],
  [
    "100d1252",
    "ba00070000",
    "MOV EDX,0x700"
  ],
  [
    "100d1257",
    "23c2",
    "AND EAX,EDX"
  ],
  [
    "100d1259",
    "b900040000",
    "MOV ECX,0x400"
  ],
  [
    "100d125e",
    "3bc1",
    "CMP EAX,ECX"
  ],
  [
    "100d1260",
    "bf00010000",
    "MOV EDI,0x100"
  ],
  [
    "100d1265",
    "7f3b",
    "JG 0x100d12a2"
  ],
  [
    "100d1267",
    "7430",
    "JZ 0x100d1299"
  ],
  [
    "100d1269",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100d126b",
    "742c",
    "JZ 0x100d1299"
  ],
  [
    "100d126d",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100d126f",
    "741f",
    "JZ 0x100d1290"
  ],
  [
    "100d1271",
    "3d00020000",
    "CMP EAX,0x200"
  ],
  [
    "100d1276",
    "0f8499000000",
    "JZ 0x100d1315"
  ],
  [
    "100d127c",
    "3d00030000",
    "CMP EAX,0x300"
  ],
  [
    "100d1281",
    "0f8540ffffff",
    "JNZ 0x100d11c7"
  ],
  [
    "100d1287",
    "c745ec02000000",
    "MOV dword ptr [EBP + -0x14],0x2"
  ],
  [
    "100d128e",
    "eb2f",
    "JMP 0x100d12bf"
  ],
  [
    "100d1290",
    "c745ec04000000",
    "MOV dword ptr [EBP + -0x14],0x4"
  ],
  [
    "100d1297",
    "eb26",
    "JMP 0x100d12bf"
  ],
  [
    "100d1299",
    "c745ec03000000",
    "MOV dword ptr [EBP + -0x14],0x3"
  ],
  [
    "100d12a0",
    "eb1d",
    "JMP 0x100d12bf"
  ],
  [
    "100d12a2",
    "3d00050000",
    "CMP EAX,0x500"
  ],
  [
    "100d12a7",
    "740f",
    "JZ 0x100d12b8"
  ],
  [
    "100d12a9",
    "3d00060000",
    "CMP EAX,0x600"
  ],
  [
    "100d12ae",
    "7465",
    "JZ 0x100d1315"
  ],
  [
    "100d12b0",
    "3bc2",
    "CMP EAX,EDX"
  ],
  [
    "100d12b2",
    "0f850fffffff",
    "JNZ 0x100d11c7"
  ],
  [
    "100d12b8",
    "c745ec01000000",
    "MOV dword ptr [EBP + -0x14],0x1"
  ],
  [
    "100d12bf",
    "8b4510",
    "MOV EAX,dword ptr [EBP + 0x10]"
  ],
  [
    "100d12c2",
    "85c7",
    "TEST EDI,EAX"
  ],
  [
    "100d12c4",
    "c745f480000000",
    "MOV dword ptr [EBP + -0xc],0x80"
  ],
  [
    "100d12cb",
    "7416",
    "JZ 0x100d12e3"
  ],
  [
    "100d12cd",
    "8b0d28642f10",
    "MOV ECX,dword ptr [0x102f6428]"
  ],
  [
    "100d12d3",
    "f7d1",
    "NOT ECX"
  ],
  [
    "100d12d5",
    "234d18",
    "AND ECX,dword ptr [EBP + 0x18]"
  ],
  [
    "100d12d8",
    "84c9",
    "TEST CL,CL"
  ],
  [
    "100d12da",
    "7807",
    "JS 0x100d12e3"
  ],
  [
    "100d12dc",
    "c745f401000000",
    "MOV dword ptr [EBP + -0xc],0x1"
  ],
  [
    "100d12e3",
    "a840",
    "TEST AL,0x40"
  ],
  [
    "100d12e5",
    "7418",
    "JZ 0x100d12ff"
  ],
  [
    "100d12e7",
    "814df400000004",
    "OR dword ptr [EBP + -0xc],0x4000000"
  ],
  [
    "100d12ee",
    "814df800000100",
    "OR dword ptr [EBP + -0x8],0x10000"
  ],
  [
    "100d12f5",
    "837dd802",
    "CMP dword ptr [EBP + -0x28],0x2"
  ],
  [
    "100d12f9",
    "7504",
    "JNZ 0x100d12ff"
  ],
  [
    "100d12fb",
    "834df004",
    "OR dword ptr [EBP + -0x10],0x4"
  ],
  [
    "100d12ff",
    "66a90010",
    "TEST AX,0x1000"
  ],
  [
    "100d1303",
    "7403",
    "JZ 0x100d1308"
  ],
  [
    "100d1305",
    "097df4",
    "OR dword ptr [EBP + -0xc],EDI"
  ],
  [
    "100d1308",
    "a820",
    "TEST AL,0x20"
  ],
  [
    "100d130a",
    "7412",
    "JZ 0x100d131e"
  ],
  [
    "100d130c",
    "814df400000008",
    "OR dword ptr [EBP + -0xc],0x8000000"
  ],
  [
    "100d1313",
    "eb14",
    "JMP 0x100d1329"
  ],
  [
    "100d1315",
    "c745ec05000000",
    "MOV dword ptr [EBP + -0x14],0x5"
  ],
  [
    "100d131c",
    "eba1",
    "JMP 0x100d12bf"
  ],
  [
    "100d131e",
    "a810",
    "TEST AL,0x10"
  ],
  [
    "100d1320",
    "7407",
    "JZ 0x100d1329"
  ],
  [
    "100d1322",
    "814df400000010",
    "OR dword ptr [EBP + -0xc],0x10000000"
  ],
  [
    "100d1329",
    "e85ffaffff",
    "CALL 0x100d0d8d"
  ],
  [
    "100d132e",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100d1331",
    "8906",
    "MOV dword ptr [ESI],EAX"
  ],
  [
    "100d1333",
    "751a",
    "JNZ 0x100d134f"
  ],
  [
    "100d1335",
    "e8aadafdff",
    "CALL 0x100aede4"
  ],
  [
    "100d133a",
    "8918",
    "MOV dword ptr [EAX],EBX"
  ],
  [
    "100d133c",
    "830eff",
    "OR dword ptr [ESI],0xffffffff"
  ],
  [
    "100d133f",
    "e88ddafdff",
    "CALL 0x100aedd1"
  ],
  [
    "100d1344",
    "c70018000000",
    "MOV dword ptr [EAX],0x18"
  ],
  [
    "100d134a",
    "e98e000000",
    "JMP 0x100d13dd"
  ],
  [
    "100d134f",
    "8b4508",
    "MOV EAX,dword ptr [EBP + 0x8]"
  ],
  [
    "100d1352",
    "8b3d60962f10",
    "MOV EDI,dword ptr [0x102f9660]"
  ],
  [
    "100d1358",
    "53",
    "PUSH EBX"
  ],
  [
    "100d1359",
    "ff75f4",
    "PUSH dword ptr [EBP + -0xc]"
  ],
  [
    "100d135c",
    "c70001000000",
    "MOV dword ptr [EAX],0x1"
  ],
  [
    "100d1362",
    "ff75ec",
    "PUSH dword ptr [EBP + -0x14]"
  ],
  [
    "100d1365",
    "8d45cc",
    "LEA EAX,[EBP + -0x34]"
  ],
  [
    "100d1368",
    "50",
    "PUSH EAX"
  ],
  [
    "100d1369",
    "ff75f0",
    "PUSH dword ptr [EBP + -0x10]"
  ],
  [
    "100d136c",
    "ff75f8",
    "PUSH dword ptr [EBP + -0x8]"
  ],
  [
    "100d136f",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100d1372",
    "ffd7",
    "CALL EDI"
  ],
  [
    "100d1374",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100d1377",
    "8945e4",
    "MOV dword ptr [EBP + -0x1c],EAX"
  ],
  [
    "100d137a",
    "756d",
    "JNZ 0x100d13e9"
  ],
  [
    "100d137c",
    "8b4df8",
    "MOV ECX,dword ptr [EBP + -0x8]"
  ],
  [
    "100d137f",
    "b8000000c0",
    "MOV EAX,0xc0000000"
  ],
  [
    "100d1384",
    "23c8",
    "AND ECX,EAX"
  ],
  [
    "100d1386",
    "3bc8",
    "CMP ECX,EAX"
  ],
  [
    "100d1388",
    "752b",
    "JNZ 0x100d13b5"
  ],
  [
    "100d138a",
    "f6451001",
    "TEST byte ptr [EBP + 0x10],0x1"
  ],
  [
    "100d138e",
    "7425",
    "JZ 0x100d13b5"
  ],
  [
    "100d1390",
    "8165f8ffffff7f",
    "AND dword ptr [EBP + -0x8],0x7fffffff"
  ],
  [
    "100d1397",
    "53",
    "PUSH EBX"
  ],
  [
    "100d1398",
    "ff75f4",
    "PUSH dword ptr [EBP + -0xc]"
  ],
  [
    "100d139b",
    "8d45cc",
    "LEA EAX,[EBP + -0x34]"
  ],
  [
    "100d139e",
    "ff75ec",
    "PUSH dword ptr [EBP + -0x14]"
  ],
  [
    "100d13a1",
    "50",
    "PUSH EAX"
  ],
  [
    "100d13a2",
    "ff75f0",
    "PUSH dword ptr [EBP + -0x10]"
  ],
  [
    "100d13a5",
    "ff75f8",
    "PUSH dword ptr [EBP + -0x8]"
  ],
  [
    "100d13a8",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100d13ab",
    "ffd7",
    "CALL EDI"
  ],
  [
    "100d13ad",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100d13b0",
    "8945e4",
    "MOV dword ptr [EBP + -0x1c],EAX"
  ],
  [
    "100d13b3",
    "7534",
    "JNZ 0x100d13e9"
  ],
  [
    "100d13b5",
    "8b36",
    "MOV ESI,dword ptr [ESI]"
  ],
  [
    "100d13b7",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100d13b9",
    "83e61f",
    "AND ESI,0x1f"
  ],
  [
    "100d13bc",
    "6bf638",
    "IMUL ESI,ESI,0x38"
  ],
  [
    "100d13bf",
    "c1f805",
    "SAR EAX,0x5"
  ],
  [
    "100d13c2",
    "8b0485c0702f10",
    "MOV EAX,dword ptr [EAX*0x4 + 0x102f70c0]"
  ],
  [
    "100d13c9",
    "8d443004",
    "LEA EAX,[EAX + ESI*0x1 + 0x4]"
  ],
  [
    "100d13cd",
    "8020fe",
    "AND byte ptr [EAX],0xfe"
  ],
  [
    "100d13d0",
    "ff1580972f10",
    "CALL dword ptr [0x102f9780]"
  ],
  [
    "100d13d6",
    "50",
    "PUSH EAX"
  ],
  [
    "100d13d7",
    "e81bdafdff",
    "CALL 0x100aedf7"
  ],
  [
    "100d13dc",
    "59",
    "POP ECX"
  ],
  [
    "100d13dd",
    "e8efd9fdff",
    "CALL 0x100aedd1"
  ],
  [
    "100d13e2",
    "8b00",
    "MOV EAX,dword ptr [EAX]"
  ],
  [
    "100d13e4",
    "e98d040000",
    "JMP 0x100d1876"
  ],
  [
    "100d13e9",
    "ff75e4",
    "PUSH dword ptr [EBP + -0x1c]"
  ],
  [
    "100d13ec",
    "ff15bc962f10",
    "CALL dword ptr [0x102f96bc]"
  ],
  [
    "100d13f2",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100d13f4",
    "7544",
    "JNZ 0x100d143a"
  ],
  [
    "100d13f6",
    "8b36",
    "MOV ESI,dword ptr [ESI]"
  ],
  [
    "100d13f8",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100d13fa",
    "83e61f",
    "AND ESI,0x1f"
  ],
  [
    "100d13fd",
    "6bf638",
    "IMUL ESI,ESI,0x38"
  ],
  [
    "100d1400",
    "c1f805",
    "SAR EAX,0x5"
  ],
  [
    "100d1403",
    "8b0485c0702f10",
    "MOV EAX,dword ptr [EAX*0x4 + 0x102f70c0]"
  ],
  [
    "100d140a",
    "8d443004",
    "LEA EAX,[EAX + ESI*0x1 + 0x4]"
  ],
  [
    "100d140e",
    "8020fe",
    "AND byte ptr [EAX],0xfe"
  ],
  [
    "100d1411",
    "ff1580972f10",
    "CALL dword ptr [0x102f9780]"
  ],
  [
    "100d1417",
    "8bf0",
    "MOV ESI,EAX"
  ],
  [
    "100d1419",
    "56",
    "PUSH ESI"
  ],
  [
    "100d141a",
    "e8d8d9fdff",
    "CALL 0x100aedf7"
  ],
  [
    "100d141f",
    "59",
    "POP ECX"
  ],
  [
    "100d1420",
    "ff75e4",
    "PUSH dword ptr [EBP + -0x1c]"
  ],
  [
    "100d1423",
    "ff15e8952f10",
    "CALL dword ptr [0x102f95e8]"
  ],
  [
    "100d1429",
    "3bf3",
    "CMP ESI,EBX"
  ],
  [
    "100d142b",
    "75b0",
    "JNZ 0x100d13dd"
  ],
  [
    "100d142d",
    "e89fd9fdff",
    "CALL 0x100aedd1"
  ],
  [
    "100d1432",
    "c7000d000000",
    "MOV dword ptr [EAX],0xd"
  ],
  [
    "100d1438",
    "eba3",
    "JMP 0x100d13dd"
  ],
  [
    "100d143a",
    "83f802",
    "CMP EAX,0x2"
  ],
  [
    "100d143d",
    "7506",
    "JNZ 0x100d1445"
  ],
  [
    "100d143f",
    "804dff40",
    "OR byte ptr [EBP + -0x1],0x40"
  ],
  [
    "100d1443",
    "eb09",
    "JMP 0x100d144e"
  ],
  [
    "100d1445",
    "83f803",
    "CMP EAX,0x3"
  ],
  [
    "100d1448",
    "7504",
    "JNZ 0x100d144e"
  ],
  [
    "100d144a",
    "804dff08",
    "OR byte ptr [EBP + -0x1],0x8"
  ],
  [
    "100d144e",
    "ff75e4",
    "PUSH dword ptr [EBP + -0x1c]"
  ],
  [
    "100d1451",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d1453",
    "e804f7ffff",
    "CALL 0x100d0b5c"
  ],
  [
    "100d1458",
    "8b06",
    "MOV EAX,dword ptr [ESI]"
  ],
  [
    "100d145a",
    "8bd0",
    "MOV EDX,EAX"
  ],
  [
    "100d145c",
    "83e01f",
    "AND EAX,0x1f"
  ],
  [
    "100d145f",
    "6bc038",
    "IMUL EAX,EAX,0x38"
  ],
  [
    "100d1462",
    "c1fa05",
    "SAR EDX,0x5"
  ],
  [
    "100d1465",
    "8b1495c0702f10",
    "MOV EDX,dword ptr [EDX*0x4 + 0x102f70c0]"
  ],
  [
    "100d146c",
    "59",
    "POP ECX"
  ],
  [
    "100d146d",
    "59",
    "POP ECX"
  ],
  [
    "100d146e",
    "8a4dff",
    "MOV CL,byte ptr [EBP + -0x1]"
  ],
  [
    "100d1471",
    "80c901",
    "OR CL,0x1"
  ],
  [
    "100d1474",
    "884c0204",
    "MOV byte ptr [EDX + EAX*0x1 + 0x4],CL"
  ],
  [
    "100d1478",
    "8b06",
    "MOV EAX,dword ptr [ESI]"
  ],
  [
    "100d147a",
    "8bd0",
    "MOV EDX,EAX"
  ],
  [
    "100d147c",
    "83e01f",
    "AND EAX,0x1f"
  ],
  [
    "100d147f",
    "6bc038",
    "IMUL EAX,EAX,0x38"
  ],
  [
    "100d1482",
    "c1fa05",
    "SAR EDX,0x5"
  ],
  [
    "100d1485",
    "8b1495c0702f10",
    "MOV EDX,dword ptr [EDX*0x4 + 0x102f70c0]"
  ],
  [
    "100d148c",
    "8d440224",
    "LEA EAX,[EDX + EAX*0x1 + 0x24]"
  ],
  [
    "100d1490",
    "802080",
    "AND byte ptr [EAX],0x80"
  ],
  [
    "100d1493",
    "884dfd",
    "MOV byte ptr [EBP + -0x3],CL"
  ],
  [
    "100d1496",
    "8065fd48",
    "AND byte ptr [EBP + -0x3],0x48"
  ],
  [
    "100d149a",
    "884dff",
    "MOV byte ptr [EBP + -0x1],CL"
  ],
  [
    "100d149d",
    "0f8580000000",
    "JNZ 0x100d1523"
  ],
  [
    "100d14a3",
    "f6c180",
    "TEST CL,0x80"
  ],
  [
    "100d14a6",
    "0f8447010000",
    "JZ 0x100d15f3"
  ],
  [
    "100d14ac",
    "f6451002",
    "TEST byte ptr [EBP + 0x10],0x2"
  ],
  [
    "100d14b0",
    "7471",
    "JZ 0x100d1523"
  ],
  [
    "100d14b2",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100d14b4",
    "83cfff",
    "OR EDI,0xffffffff"
  ],
  [
    "100d14b7",
    "57",
    "PUSH EDI"
  ],
  [
    "100d14b8",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d14ba",
    "e8c2e4feff",
    "CALL 0x100bf981"
  ],
  [
    "100d14bf",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100d14c2",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100d14c4",
    "8945e8",
    "MOV dword ptr [EBP + -0x18],EAX"
  ],
  [
    "100d14c7",
    "7519",
    "JNZ 0x100d14e2"
  ],
  [
    "100d14c9",
    "e816d9fdff",
    "CALL 0x100aede4"
  ],
  [
    "100d14ce",
    "813883000000",
    "CMP dword ptr [EAX],0x83"
  ],
  [
    "100d14d4",
    "744d",
    "JZ 0x100d1523"
  ],
  [
    "100d14d6",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d14d8",
    "e83de1feff",
    "CALL 0x100bf61a"
  ],
  [
    "100d14dd",
    "e9fafeffff",
    "JMP 0x100d13dc"
  ],
  [
    "100d14e2",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100d14e4",
    "8d45fc",
    "LEA EAX,[EBP + -0x4]"
  ],
  [
    "100d14e7",
    "50",
    "PUSH EAX"
  ],
  [
    "100d14e8",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d14ea",
    "885dfc",
    "MOV byte ptr [EBP + -0x4],BL"
  ],
  [
    "100d14ed",
    "e870250000",
    "CALL 0x100d3a62"
  ],
  [
    "100d14f2",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100d14f5",
    "85c0",
    "TEST EAX,EAX"
  ],
  [
    "100d14f7",
    "751a",
    "JNZ 0x100d1513"
  ],
  [
    "100d14f9",
    "807dfc1a",
    "CMP byte ptr [EBP + -0x4],0x1a"
  ],
  [
    "100d14fd",
    "7514",
    "JNZ 0x100d1513"
  ],
  [
    "100d14ff",
    "8b45e8",
    "MOV EAX,dword ptr [EBP + -0x18]"
  ],
  [
    "100d1502",
    "99",
    "CDQ"
  ],
  [
    "100d1503",
    "52",
    "PUSH EDX"
  ],
  [
    "100d1504",
    "50",
    "PUSH EAX"
  ],
  [
    "100d1505",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d1507",
    "e8142c0000",
    "CALL 0x100d4120"
  ],
  [
    "100d150c",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100d150f",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100d1511",
    "74c3",
    "JZ 0x100d14d6"
  ],
  [
    "100d1513",
    "53",
    "PUSH EBX"
  ],
  [
    "100d1514",
    "53",
    "PUSH EBX"
  ],
  [
    "100d1515",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d1517",
    "e865e4feff",
    "CALL 0x100bf981"
  ],
  [
    "100d151c",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100d151f",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100d1521",
    "74b3",
    "JZ 0x100d14d6"
  ],
  [
    "100d1523",
    "f645ff80",
    "TEST byte ptr [EBP + -0x1],0x80"
  ],
  [
    "100d1527",
    "0f84c6000000",
    "JZ 0x100d15f3"
  ],
  [
    "100d152d",
    "b900400700",
    "MOV ECX,0x74000"
  ],
  [
    "100d1532",
    "854d10",
    "TEST dword ptr [EBP + 0x10],ECX"
  ],
  [
    "100d1535",
    "bf00400000",
    "MOV EDI,0x4000"
  ],
  [
    "100d153a",
    "750f",
    "JNZ 0x100d154b"
  ],
  [
    "100d153c",
    "8b45dc",
    "MOV EAX,dword ptr [EBP + -0x24]"
  ],
  [
    "100d153f",
    "23c1",
    "AND EAX,ECX"
  ],
  [
    "100d1541",
    "7505",
    "JNZ 0x100d1548"
  ],
  [
    "100d1543",
    "097d10",
    "OR dword ptr [EBP + 0x10],EDI"
  ],
  [
    "100d1546",
    "eb03",
    "JMP 0x100d154b"
  ],
  [
    "100d1548",
    "094510",
    "OR dword ptr [EBP + 0x10],EAX"
  ],
  [
    "100d154b",
    "8b4510",
    "MOV EAX,dword ptr [EBP + 0x10]"
  ],
  [
    "100d154e",
    "23c1",
    "AND EAX,ECX"
  ],
  [
    "100d1550",
    "3bc7",
    "CMP EAX,EDI"
  ],
  [
    "100d1552",
    "7444",
    "JZ 0x100d1598"
  ],
  [
    "100d1554",
    "3d00000100",
    "CMP EAX,0x10000"
  ],
  [
    "100d1559",
    "7429",
    "JZ 0x100d1584"
  ],
  [
    "100d155b",
    "3d00400100",
    "CMP EAX,0x14000"
  ],
  [
    "100d1560",
    "7422",
    "JZ 0x100d1584"
  ],
  [
    "100d1562",
    "3d00000200",
    "CMP EAX,0x20000"
  ],
  [
    "100d1567",
    "7429",
    "JZ 0x100d1592"
  ],
  [
    "100d1569",
    "3d00400200",
    "CMP EAX,0x24000"
  ],
  [
    "100d156e",
    "7422",
    "JZ 0x100d1592"
  ],
  [
    "100d1570",
    "3d00000400",
    "CMP EAX,0x40000"
  ],
  [
    "100d1575",
    "7407",
    "JZ 0x100d157e"
  ],
  [
    "100d1577",
    "3d00400400",
    "CMP EAX,0x44000"
  ],
  [
    "100d157c",
    "751d",
    "JNZ 0x100d159b"
  ],
  [
    "100d157e",
    "c645fe01",
    "MOV byte ptr [EBP + -0x2],0x1"
  ],
  [
    "100d1582",
    "eb17",
    "JMP 0x100d159b"
  ],
  [
    "100d1584",
    "8b4d10",
    "MOV ECX,dword ptr [EBP + 0x10]"
  ],
  [
    "100d1587",
    "b801030000",
    "MOV EAX,0x301"
  ],
  [
    "100d158c",
    "23c8",
    "AND ECX,EAX"
  ],
  [
    "100d158e",
    "3bc8",
    "CMP ECX,EAX"
  ],
  [
    "100d1590",
    "7509",
    "JNZ 0x100d159b"
  ],
  [
    "100d1592",
    "c645fe02",
    "MOV byte ptr [EBP + -0x2],0x2"
  ],
  [
    "100d1596",
    "eb03",
    "JMP 0x100d159b"
  ],
  [
    "100d1598",
    "885dfe",
    "MOV byte ptr [EBP + -0x2],BL"
  ],
  [
    "100d159b",
    "f7451000000700",
    "TEST dword ptr [EBP + 0x10],0x70000"
  ],
  [
    "100d15a2",
    "744f",
    "JZ 0x100d15f3"
  ],
  [
    "100d15a4",
    "f645ff40",
    "TEST byte ptr [EBP + -0x1],0x40"
  ],
  [
    "100d15a8",
    "895de8",
    "MOV dword ptr [EBP + -0x18],EBX"
  ],
  [
    "100d15ab",
    "7546",
    "JNZ 0x100d15f3"
  ],
  [
    "100d15ad",
    "8b45f8",
    "MOV EAX,dword ptr [EBP + -0x8]"
  ],
  [
    "100d15b0",
    "b9000000c0",
    "MOV ECX,0xc0000000"
  ],
  [
    "100d15b5",
    "23c1",
    "AND EAX,ECX"
  ],
  [
    "100d15b7",
    "3d00000040",
    "CMP EAX,0x40000000"
  ],
  [
    "100d15bc",
    "0f848b010000",
    "JZ 0x100d174d"
  ],
  [
    "100d15c2",
    "3d00000080",
    "CMP EAX,0x80000000"
  ],
  [
    "100d15c7",
    "0f8447010000",
    "JZ 0x100d1714"
  ],
  [
    "100d15cd",
    "3bc1",
    "CMP EAX,ECX"
  ],
  [
    "100d15cf",
    "7522",
    "JNZ 0x100d15f3"
  ],
  [
    "100d15d1",
    "8b45ec",
    "MOV EAX,dword ptr [EBP + -0x14]"
  ],
  [
    "100d15d4",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100d15d6",
    "761b",
    "JBE 0x100d15f3"
  ],
  [
    "100d15d8",
    "83f802",
    "CMP EAX,0x2"
  ],
  [
    "100d15db",
    "0f8614020000",
    "JBE 0x100d17f5"
  ],
  [
    "100d15e1",
    "83f804",
    "CMP EAX,0x4"
  ],
  [
    "100d15e4",
    "0f86fc000000",
    "JBE 0x100d16e6"
  ],
  [
    "100d15ea",
    "83f805",
    "CMP EAX,0x5"
  ],
  [
    "100d15ed",
    "0f8402020000",
    "JZ 0x100d17f5"
  ],
  [
    "100d15f3",
    "8b06",
    "MOV EAX,dword ptr [ESI]"
  ],
  [
    "100d15f5",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100d15f7",
    "83e01f",
    "AND EAX,0x1f"
  ],
  [
    "100d15fa",
    "6bc038",
    "IMUL EAX,EAX,0x38"
  ],
  [
    "100d15fd",
    "c1f905",
    "SAR ECX,0x5"
  ],
  [
    "100d1600",
    "8b0c8dc0702f10",
    "MOV ECX,dword ptr [ECX*0x4 + 0x102f70c0]"
  ],
  [
    "100d1607",
    "8d440124",
    "LEA EAX,[ECX + EAX*0x1 + 0x24]"
  ],
  [
    "100d160b",
    "8a08",
    "MOV CL,byte ptr [EAX]"
  ],
  [
    "100d160d",
    "324dfe",
    "XOR CL,byte ptr [EBP + -0x2]"
  ],
  [
    "100d1610",
    "80e17f",
    "AND CL,0x7f"
  ],
  [
    "100d1613",
    "3008",
    "XOR byte ptr [EAX],CL"
  ],
  [
    "100d1615",
    "8b06",
    "MOV EAX,dword ptr [ESI]"
  ],
  [
    "100d1617",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100d1619",
    "83e01f",
    "AND EAX,0x1f"
  ],
  [
    "100d161c",
    "6bc038",
    "IMUL EAX,EAX,0x38"
  ],
  [
    "100d161f",
    "c1f905",
    "SAR ECX,0x5"
  ],
  [
    "100d1622",
    "8b0c8dc0702f10",
    "MOV ECX,dword ptr [ECX*0x4 + 0x102f70c0]"
  ],
  [
    "100d1629",
    "8d440124",
    "LEA EAX,[ECX + EAX*0x1 + 0x24]"
  ],
  [
    "100d162d",
    "8b4d10",
    "MOV ECX,dword ptr [EBP + 0x10]"
  ],
  [
    "100d1630",
    "8a10",
    "MOV DL,byte ptr [EAX]"
  ],
  [
    "100d1632",
    "c1e910",
    "SHR ECX,0x10"
  ],
  [
    "100d1635",
    "c0e107",
    "SHL CL,0x7"
  ],
  [
    "100d1638",
    "80e27f",
    "AND DL,0x7f"
  ],
  [
    "100d163b",
    "0aca",
    "OR CL,DL"
  ],
  [
    "100d163d",
    "385dfd",
    "CMP byte ptr [EBP + -0x3],BL"
  ],
  [
    "100d1640",
    "8808",
    "MOV byte ptr [EAX],CL"
  ],
  [
    "100d1642",
    "7521",
    "JNZ 0x100d1665"
  ],
  [
    "100d1644",
    "f6451008",
    "TEST byte ptr [EBP + 0x10],0x8"
  ],
  [
    "100d1648",
    "741b",
    "JZ 0x100d1665"
  ],
  [
    "100d164a",
    "8b06",
    "MOV EAX,dword ptr [ESI]"
  ],
  [
    "100d164c",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100d164e",
    "83e01f",
    "AND EAX,0x1f"
  ],
  [
    "100d1651",
    "6bc038",
    "IMUL EAX,EAX,0x38"
  ],
  [
    "100d1654",
    "c1f905",
    "SAR ECX,0x5"
  ],
  [
    "100d1657",
    "8b0c8dc0702f10",
    "MOV ECX,dword ptr [ECX*0x4 + 0x102f70c0]"
  ],
  [
    "100d165e",
    "8d440104",
    "LEA EAX,[ECX + EAX*0x1 + 0x4]"
  ],
  [
    "100d1662",
    "800820",
    "OR byte ptr [EAX],0x20"
  ],
  [
    "100d1665",
    "8b7df8",
    "MOV EDI,dword ptr [EBP + -0x8]"
  ],
  [
    "100d1668",
    "b8000000c0",
    "MOV EAX,0xc0000000"
  ],
  [
    "100d166d",
    "8bcf",
    "MOV ECX,EDI"
  ],
  [
    "100d166f",
    "23c8",
    "AND ECX,EAX"
  ],
  [
    "100d1671",
    "3bc8",
    "CMP ECX,EAX"
  ],
  [
    "100d1673",
    "0f85fb010000",
    "JNZ 0x100d1874"
  ],
  [
    "100d1679",
    "f6451001",
    "TEST byte ptr [EBP + 0x10],0x1"
  ],
  [
    "100d167d",
    "0f84f1010000",
    "JZ 0x100d1874"
  ],
  [
    "100d1683",
    "ff75e4",
    "PUSH dword ptr [EBP + -0x1c]"
  ],
  [
    "100d1686",
    "ff15e8952f10",
    "CALL dword ptr [0x102f95e8]"
  ],
  [
    "100d168c",
    "53",
    "PUSH EBX"
  ],
  [
    "100d168d",
    "ff75f4",
    "PUSH dword ptr [EBP + -0xc]"
  ],
  [
    "100d1690",
    "8d45cc",
    "LEA EAX,[EBP + -0x34]"
  ],
  [
    "100d1693",
    "6a03",
    "PUSH 0x3"
  ],
  [
    "100d1695",
    "50",
    "PUSH EAX"
  ],
  [
    "100d1696",
    "ff75f0",
    "PUSH dword ptr [EBP + -0x10]"
  ],
  [
    "100d1699",
    "81e7ffffff7f",
    "AND EDI,0x7fffffff"
  ],
  [
    "100d169f",
    "57",
    "PUSH EDI"
  ],
  [
    "100d16a0",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100d16a3",
    "ff1560962f10",
    "CALL dword ptr [0x102f9660]"
  ],
  [
    "100d16a9",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100d16ac",
    "0f85ab010000",
    "JNZ 0x100d185d"
  ],
  [
    "100d16b2",
    "ff1580972f10",
    "CALL dword ptr [0x102f9780]"
  ],
  [
    "100d16b8",
    "50",
    "PUSH EAX"
  ],
  [
    "100d16b9",
    "e839d7fdff",
    "CALL 0x100aedf7"
  ],
  [
    "100d16be",
    "8b06",
    "MOV EAX,dword ptr [ESI]"
  ],
  [
    "100d16c0",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100d16c2",
    "83e01f",
    "AND EAX,0x1f"
  ],
  [
    "100d16c5",
    "6bc038",
    "IMUL EAX,EAX,0x38"
  ],
  [
    "100d16c8",
    "c1f905",
    "SAR ECX,0x5"
  ],
  [
    "100d16cb",
    "8b0c8dc0702f10",
    "MOV ECX,dword ptr [ECX*0x4 + 0x102f70c0]"
  ],
  [
    "100d16d2",
    "8d440104",
    "LEA EAX,[ECX + EAX*0x1 + 0x4]"
  ],
  [
    "100d16d6",
    "8020fe",
    "AND byte ptr [EAX],0xfe"
  ],
  [
    "100d16d9",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d16db",
    "e8f9f4ffff",
    "CALL 0x100d0bd9"
  ],
  [
    "100d16e0",
    "59",
    "POP ECX"
  ],
  [
    "100d16e1",
    "e9f6fcffff",
    "JMP 0x100d13dc"
  ],
  [
    "100d16e6",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100d16e8",
    "53",
    "PUSH EBX"
  ],
  [
    "100d16e9",
    "53",
    "PUSH EBX"
  ],
  [
    "100d16ea",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d16ec",
    "e83bccffff",
    "CALL 0x100ce32c"
  ],
  [
    "100d16f1",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100d16f4",
    "0bc2",
    "OR EAX,EDX"
  ],
  [
    "100d16f6",
    "0f84f9000000",
    "JZ 0x100d17f5"
  ],
  [
    "100d16fc",
    "53",
    "PUSH EBX"
  ],
  [
    "100d16fd",
    "53",
    "PUSH EBX"
  ],
  [
    "100d16fe",
    "53",
    "PUSH EBX"
  ],
  [
    "100d16ff",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d1701",
    "e826ccffff",
    "CALL 0x100ce32c"
  ],
  [
    "100d1706",
    "23c2",
    "AND EAX,EDX"
  ],
  [
    "100d1708",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100d170b",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100d170e",
    "0f84c2fdffff",
    "JZ 0x100d14d6"
  ],
  [
    "100d1714",
    "6a03",
    "PUSH 0x3"
  ],
  [
    "100d1716",
    "8d45e8",
    "LEA EAX,[EBP + -0x18]"
  ],
  [
    "100d1719",
    "50",
    "PUSH EAX"
  ],
  [
    "100d171a",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d171c",
    "e841230000",
    "CALL 0x100d3a62"
  ],
  [
    "100d1721",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100d1724",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100d1727",
    "0f84a9fdffff",
    "JZ 0x100d14d6"
  ],
  [
    "100d172d",
    "83f802",
    "CMP EAX,0x2"
  ],
  [
    "100d1730",
    "7467",
    "JZ 0x100d1799"
  ],
  [
    "100d1732",
    "83f803",
    "CMP EAX,0x3"
  ],
  [
    "100d1735",
    "0f85ac000000",
    "JNZ 0x100d17e7"
  ],
  [
    "100d173b",
    "817de8efbbbf00",
    "CMP dword ptr [EBP + -0x18],0xbfbbef"
  ],
  [
    "100d1742",
    "7555",
    "JNZ 0x100d1799"
  ],
  [
    "100d1744",
    "c645fe01",
    "MOV byte ptr [EBP + -0x2],0x1"
  ],
  [
    "100d1748",
    "e9a6feffff",
    "JMP 0x100d15f3"
  ],
  [
    "100d174d",
    "8b45ec",
    "MOV EAX,dword ptr [EBP + -0x14]"
  ],
  [
    "100d1750",
    "3bc3",
    "CMP EAX,EBX"
  ],
  [
    "100d1752",
    "0f869bfeffff",
    "JBE 0x100d15f3"
  ],
  [
    "100d1758",
    "83f802",
    "CMP EAX,0x2"
  ],
  [
    "100d175b",
    "0f8694000000",
    "JBE 0x100d17f5"
  ],
  [
    "100d1761",
    "83f804",
    "CMP EAX,0x4"
  ],
  [
    "100d1764",
    "0f8780feffff",
    "JA 0x100d15ea"
  ],
  [
    "100d176a",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100d176c",
    "53",
    "PUSH EBX"
  ],
  [
    "100d176d",
    "53",
    "PUSH EBX"
  ],
  [
    "100d176e",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d1770",
    "e8b7cbffff",
    "CALL 0x100ce32c"
  ],
  [
    "100d1775",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100d1778",
    "0bc2",
    "OR EAX,EDX"
  ],
  [
    "100d177a",
    "7479",
    "JZ 0x100d17f5"
  ],
  [
    "100d177c",
    "53",
    "PUSH EBX"
  ],
  [
    "100d177d",
    "53",
    "PUSH EBX"
  ],
  [
    "100d177e",
    "53",
    "PUSH EBX"
  ],
  [
    "100d177f",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d1781",
    "e8a6cbffff",
    "CALL 0x100ce32c"
  ],
  [
    "100d1786",
    "83c410",
    "ADD ESP,0x10"
  ],
  [
    "100d1789",
    "23c2",
    "AND EAX,EDX"
  ],
  [
    "100d178b",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100d178e",
    "0f855ffeffff",
    "JNZ 0x100d15f3"
  ],
  [
    "100d1794",
    "e93dfdffff",
    "JMP 0x100d14d6"
  ],
  [
    "100d1799",
    "8b45e8",
    "MOV EAX,dword ptr [EBP + -0x18]"
  ],
  [
    "100d179c",
    "25ffff0000",
    "AND EAX,0xffff"
  ],
  [
    "100d17a1",
    "3dfeff0000",
    "CMP EAX,0xfffe"
  ],
  [
    "100d17a6",
    "7519",
    "JNZ 0x100d17c1"
  ],
  [
    "100d17a8",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d17aa",
    "e86bdefeff",
    "CALL 0x100bf61a"
  ],
  [
    "100d17af",
    "59",
    "POP ECX"
  ],
  [
    "100d17b0",
    "e81cd6fdff",
    "CALL 0x100aedd1"
  ],
  [
    "100d17b5",
    "6a16",
    "PUSH 0x16"
  ],
  [
    "100d17b7",
    "5e",
    "POP ESI"
  ],
  [
    "100d17b8",
    "8930",
    "MOV dword ptr [EAX],ESI"
  ],
  [
    "100d17ba",
    "8bc6",
    "MOV EAX,ESI"
  ],
  [
    "100d17bc",
    "e9b5000000",
    "JMP 0x100d1876"
  ],
  [
    "100d17c1",
    "3dfffe0000",
    "CMP EAX,0xfeff"
  ],
  [
    "100d17c6",
    "751f",
    "JNZ 0x100d17e7"
  ],
  [
    "100d17c8",
    "53",
    "PUSH EBX"
  ],
  [
    "100d17c9",
    "6a02",
    "PUSH 0x2"
  ],
  [
    "100d17cb",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d17cd",
    "e8afe1feff",
    "CALL 0x100bf981"
  ],
  [
    "100d17d2",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100d17d5",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100d17d8",
    "0f84f8fcffff",
    "JZ 0x100d14d6"
  ],
  [
    "100d17de",
    "c645fe02",
    "MOV byte ptr [EBP + -0x2],0x2"
  ],
  [
    "100d17e2",
    "e90cfeffff",
    "JMP 0x100d15f3"
  ],
  [
    "100d17e7",
    "53",
    "PUSH EBX"
  ],
  [
    "100d17e8",
    "53",
    "PUSH EBX"
  ],
  [
    "100d17e9",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d17eb",
    "e891e1feff",
    "CALL 0x100bf981"
  ],
  [
    "100d17f0",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100d17f3",
    "eb96",
    "JMP 0x100d178b"
  ],
  [
    "100d17f5",
    "0fbe45fe",
    "MOVSX EAX,byte ptr [EBP + -0x2]"
  ],
  [
    "100d17f9",
    "33ff",
    "XOR EDI,EDI"
  ],
  [
    "100d17fb",
    "48",
    "DEC EAX"
  ],
  [
    "100d17fc",
    "7417",
    "JZ 0x100d1815"
  ],
  [
    "100d17fe",
    "48",
    "DEC EAX"
  ],
  [
    "100d17ff",
    "0f85eefdffff",
    "JNZ 0x100d15f3"
  ],
  [
    "100d1805",
    "c745e8fffe0000",
    "MOV dword ptr [EBP + -0x18],0xfeff"
  ],
  [
    "100d180c",
    "c745ec02000000",
    "MOV dword ptr [EBP + -0x14],0x2"
  ],
  [
    "100d1813",
    "eb0e",
    "JMP 0x100d1823"
  ],
  [
    "100d1815",
    "c745e8efbbbf00",
    "MOV dword ptr [EBP + -0x18],0xbfbbef"
  ],
  [
    "100d181c",
    "c745ec03000000",
    "MOV dword ptr [EBP + -0x14],0x3"
  ],
  [
    "100d1823",
    "8b45ec",
    "MOV EAX,dword ptr [EBP + -0x14]"
  ],
  [
    "100d1826",
    "2bc7",
    "SUB EAX,EDI"
  ],
  [
    "100d1828",
    "50",
    "PUSH EAX"
  ],
  [
    "100d1829",
    "8d443de8",
    "LEA EAX,[EBP + EDI*0x1 + -0x18]"
  ],
  [
    "100d182d",
    "50",
    "PUSH EAX"
  ],
  [
    "100d182e",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d1830",
    "e859d2ffff",
    "CALL 0x100cea8e"
  ],
  [
    "100d1835",
    "83c40c",
    "ADD ESP,0xc"
  ],
  [
    "100d1838",
    "83f8ff",
    "CMP EAX,-0x1"
  ],
  [
    "100d183b",
    "740c",
    "JZ 0x100d1849"
  ],
  [
    "100d183d",
    "03f8",
    "ADD EDI,EAX"
  ],
  [
    "100d183f",
    "397dec",
    "CMP dword ptr [EBP + -0x14],EDI"
  ],
  [
    "100d1842",
    "7fdf",
    "JG 0x100d1823"
  ],
  [
    "100d1844",
    "e9aafdffff",
    "JMP 0x100d15f3"
  ],
  [
    "100d1849",
    "ff36",
    "PUSH dword ptr [ESI]"
  ],
  [
    "100d184b",
    "e8caddfeff",
    "CALL 0x100bf61a"
  ],
  [
    "100d1850",
    "59",
    "POP ECX"
  ],
  [
    "100d1851",
    "e87bd5fdff",
    "CALL 0x100aedd1"
  ],
  [
    "100d1856",
    "8b00",
    "MOV EAX,dword ptr [EAX]"
  ],
  [
    "100d1858",
    "8945e0",
    "MOV dword ptr [EBP + -0x20],EAX"
  ],
  [
    "100d185b",
    "eb19",
    "JMP 0x100d1876"
  ],
  [
    "100d185d",
    "8b36",
    "MOV ESI,dword ptr [ESI]"
  ],
  [
    "100d185f",
    "8bce",
    "MOV ECX,ESI"
  ],
  [
    "100d1861",
    "c1f905",
    "SAR ECX,0x5"
  ],
  [
    "100d1864",
    "8b0c8dc0702f10",
    "MOV ECX,dword ptr [ECX*0x4 + 0x102f70c0]"
  ],
  [
    "100d186b",
    "83e61f",
    "AND ESI,0x1f"
  ],
  [
    "100d186e",
    "6bf638",
    "IMUL ESI,ESI,0x38"
  ],
  [
    "100d1871",
    "89040e",
    "MOV dword ptr [ESI + ECX*0x1],EAX"
  ],
  [
    "100d1874",
    "8bc3",
    "MOV EAX,EBX"
  ],
  [
    "100d1876",
    "5f",
    "POP EDI"
  ],
  [
    "100d1877",
    "5e",
    "POP ESI"
  ],
  [
    "100d1878",
    "5b",
    "POP EBX"
  ],
  [
    "100d1879",
    "c9",
    "LEAVE"
  ],
  [
    "100d187a",
    "c3",
    "RET"
  ],
  [
    "100d1931",
    "6a14",
    "PUSH 0x14"
  ],
  [
    "100d1933",
    "6848900f10",
    "PUSH 0x100f9048"
  ],
  [
    "100d1938",
    "e82bd2fdff",
    "CALL 0x100aeb68"
  ],
  [
    "100d193d",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100d193f",
    "8975e4",
    "MOV dword ptr [EBP + -0x1c],ESI"
  ],
  [
    "100d1942",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100d1944",
    "8b7d18",
    "MOV EDI,dword ptr [EBP + 0x18]"
  ],
  [
    "100d1947",
    "3bfe",
    "CMP EDI,ESI"
  ],
  [
    "100d1949",
    "0f95c0",
    "SETNZ AL"
  ],
  [
    "100d194c",
    "3bc6",
    "CMP EAX,ESI"
  ],
  [
    "100d194e",
    "751b",
    "JNZ 0x100d196b"
  ],
  [
    "100d1950",
    "e87cd4fdff",
    "CALL 0x100aedd1"
  ],
  [
    "100d1955",
    "6a16",
    "PUSH 0x16"
  ],
  [
    "100d1957",
    "5f",
    "POP EDI"
  ],
  [
    "100d1958",
    "8938",
    "MOV dword ptr [EAX],EDI"
  ],
  [
    "100d195a",
    "56",
    "PUSH ESI"
  ],
  [
    "100d195b",
    "56",
    "PUSH ESI"
  ],
  [
    "100d195c",
    "56",
    "PUSH ESI"
  ],
  [
    "100d195d",
    "56",
    "PUSH ESI"
  ],
  [
    "100d195e",
    "56",
    "PUSH ESI"
  ],
  [
    "100d195f",
    "e86ec8fdff",
    "CALL 0x100ae1d2"
  ],
  [
    "100d1964",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100d1967",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100d1969",
    "eb59",
    "JMP 0x100d19c4"
  ],
  [
    "100d196b",
    "830fff",
    "OR dword ptr [EDI],0xffffffff"
  ],
  [
    "100d196e",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100d1970",
    "397508",
    "CMP dword ptr [EBP + 0x8],ESI"
  ],
  [
    "100d1973",
    "0f95c0",
    "SETNZ AL"
  ],
  [
    "100d1976",
    "3bc6",
    "CMP EAX,ESI"
  ],
  [
    "100d1978",
    "74d6",
    "JZ 0x100d1950"
  ],
  [
    "100d197a",
    "39751c",
    "CMP dword ptr [EBP + 0x1c],ESI"
  ],
  [
    "100d197d",
    "740f",
    "JZ 0x100d198e"
  ],
  [
    "100d197f",
    "8b4514",
    "MOV EAX,dword ptr [EBP + 0x14]"
  ],
  [
    "100d1982",
    "257ffeffff",
    "AND EAX,0xfffffe7f"
  ],
  [
    "100d1987",
    "f7d8",
    "NEG EAX"
  ],
  [
    "100d1989",
    "1bc0",
    "SBB EAX,EAX"
  ],
  [
    "100d198b",
    "40",
    "INC EAX"
  ],
  [
    "100d198c",
    "74c2",
    "JZ 0x100d1950"
  ],
  [
    "100d198e",
    "8975fc",
    "MOV dword ptr [EBP + -0x4],ESI"
  ],
  [
    "100d1991",
    "ff7514",
    "PUSH dword ptr [EBP + 0x14]"
  ],
  [
    "100d1994",
    "ff7510",
    "PUSH dword ptr [EBP + 0x10]"
  ],
  [
    "100d1997",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100d199a",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100d199d",
    "8d45e4",
    "LEA EAX,[EBP + -0x1c]"
  ],
  [
    "100d19a0",
    "50",
    "PUSH EAX"
  ],
  [
    "100d19a1",
    "8bc7",
    "MOV EAX,EDI"
  ],
  [
    "100d19a3",
    "e87af7ffff",
    "CALL 0x100d1122"
  ],
  [
    "100d19a8",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100d19ab",
    "8945e0",
    "MOV dword ptr [EBP + -0x20],EAX"
  ],
  [
    "100d19ae",
    "c745fcfeffffff",
    "MOV dword ptr [EBP + -0x4],0xfffffffe"
  ],
  [
    "100d19b5",
    "e815000000",
    "CALL 0x100d19cf"
  ],
  [
    "100d19ba",
    "8b45e0",
    "MOV EAX,dword ptr [EBP + -0x20]"
  ],
  [
    "100d19bd",
    "3bc6",
    "CMP EAX,ESI"
  ],
  [
    "100d19bf",
    "7403",
    "JZ 0x100d19c4"
  ],
  [
    "100d19c1",
    "830fff",
    "OR dword ptr [EDI],0xffffffff"
  ],
  [
    "100d19c4",
    "e8e4d1fdff",
    "CALL 0x100aebad"
  ],
  [
    "100d19c9",
    "c3",
    "RET"
  ],
  [
    "100d19cf",
    "3975e4",
    "CMP dword ptr [EBP + -0x1c],ESI"
  ],
  [
    "100d19d2",
    "7428",
    "JZ 0x100d19fc"
  ],
  [
    "100d19d4",
    "3975e0",
    "CMP dword ptr [EBP + -0x20],ESI"
  ],
  [
    "100d19d7",
    "741b",
    "JZ 0x100d19f4"
  ],
  [
    "100d19d9",
    "8b07",
    "MOV EAX,dword ptr [EDI]"
  ],
  [
    "100d19db",
    "8bc8",
    "MOV ECX,EAX"
  ],
  [
    "100d19dd",
    "c1f905",
    "SAR ECX,0x5"
  ],
  [
    "100d19e0",
    "83e01f",
    "AND EAX,0x1f"
  ],
  [
    "100d19e3",
    "6bc038",
    "IMUL EAX,EAX,0x38"
  ],
  [
    "100d19e6",
    "8b0c8dc0702f10",
    "MOV ECX,dword ptr [ECX*0x4 + 0x102f70c0]"
  ],
  [
    "100d19ed",
    "8d440104",
    "LEA EAX,[ECX + EAX*0x1 + 0x4]"
  ],
  [
    "100d19f1",
    "8020fe",
    "AND byte ptr [EAX],0xfe"
  ],
  [
    "100d19f4",
    "ff37",
    "PUSH dword ptr [EDI]"
  ],
  [
    "100d19f6",
    "e870f3ffff",
    "CALL 0x100d0d6b"
  ],
  [
    "100d19fb",
    "59",
    "POP ECX"
  ],
  [
    "100d19fc",
    "c3",
    "RET"
  ],
  [
    "100d1a2d",
    "55",
    "PUSH EBP"
  ],
  [
    "100d1a2e",
    "8bec",
    "MOV EBP,ESP"
  ],
  [
    "100d1a30",
    "6a01",
    "PUSH 0x1"
  ],
  [
    "100d1a32",
    "ff7508",
    "PUSH dword ptr [EBP + 0x8]"
  ],
  [
    "100d1a35",
    "ff7518",
    "PUSH dword ptr [EBP + 0x18]"
  ],
  [
    "100d1a38",
    "ff7514",
    "PUSH dword ptr [EBP + 0x14]"
  ],
  [
    "100d1a3b",
    "ff7510",
    "PUSH dword ptr [EBP + 0x10]"
  ],
  [
    "100d1a3e",
    "ff750c",
    "PUSH dword ptr [EBP + 0xc]"
  ],
  [
    "100d1a41",
    "e8ebfeffff",
    "CALL 0x100d1931"
  ],
  [
    "100d1a46",
    "83c418",
    "ADD ESP,0x18"
  ],
  [
    "100d1a49",
    "5d",
    "POP EBP"
  ],
  [
    "100d1a4a",
    "c3",
    "RET"
  ],
  [
    "100d44db",
    "8b442404",
    "MOV EAX,dword ptr [ESP + 0x4]"
  ],
  [
    "100d44df",
    "56",
    "PUSH ESI"
  ],
  [
    "100d44e0",
    "33f6",
    "XOR ESI,ESI"
  ],
  [
    "100d44e2",
    "3bc6",
    "CMP EAX,ESI"
  ],
  [
    "100d44e4",
    "751d",
    "JNZ 0x100d4503"
  ],
  [
    "100d44e6",
    "e8e6a8fdff",
    "CALL 0x100aedd1"
  ],
  [
    "100d44eb",
    "56",
    "PUSH ESI"
  ],
  [
    "100d44ec",
    "56",
    "PUSH ESI"
  ],
  [
    "100d44ed",
    "56",
    "PUSH ESI"
  ],
  [
    "100d44ee",
    "56",
    "PUSH ESI"
  ],
  [
    "100d44ef",
    "56",
    "PUSH ESI"
  ],
  [
    "100d44f0",
    "c70016000000",
    "MOV dword ptr [EAX],0x16"
  ],
  [
    "100d44f6",
    "e8d79cfdff",
    "CALL 0x100ae1d2"
  ],
  [
    "100d44fb",
    "83c414",
    "ADD ESP,0x14"
  ],
  [
    "100d44fe",
    "6a16",
    "PUSH 0x16"
  ],
  [
    "100d4500",
    "58",
    "POP EAX"
  ],
  [
    "100d4501",
    "5e",
    "POP ESI"
  ],
  [
    "100d4502",
    "c3",
    "RET"
  ],
  [
    "100d4503",
    "8b0d48702f10",
    "MOV ECX,dword ptr [0x102f7048]"
  ],
  [
    "100d4509",
    "8908",
    "MOV dword ptr [EAX],ECX"
  ],
  [
    "100d450b",
    "33c0",
    "XOR EAX,EAX"
  ],
  [
    "100d450d",
    "5e",
    "POP ESI"
  ],
  [
    "100d450e",
    "c3",
    "RET"
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
