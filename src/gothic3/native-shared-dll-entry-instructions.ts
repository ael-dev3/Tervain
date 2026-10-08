/** Captured original DLL entry syntax; execution requires runtime ownership. */
export interface SharedDllEntryInstruction {readonly address:string;readonly bytes:string;readonly instruction:string;}
const rows:readonly (readonly string[])[] = [
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
  ]
];
const instructions=new Map<string,SharedDllEntryInstruction>(rows.map(([address,bytes,instruction])=>
 [address!,Object.freeze({address:address!,bytes:bytes!,instruction:instruction!})]));
export function sharedDllEntryInstruction(address:string):SharedDllEntryInstruction {
 const row=instructions.get(address);if(!row)throw new Error('Unowned SharedBase DLL entry instruction '+address);return row;
}
