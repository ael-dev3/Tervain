import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect, it} from 'vitest';
import {sharedInitializerHeader,sharedInitializerInstruction} from '../../src/gothic3/native-shared-initializer-instructions';

const base='assets/gothic3/shared-initializer-source/';
const source=JSON.parse(readFileSync(base+'source.json','utf8'));
const sha=(raw:Uint8Array)=>createHash('sha256').update(raw).digest('hex');
it('matches every generated initializer row and header to original admitted receipts',()=>{
  for(const body of ['100aa632','100ae900','100ae880','100ae8b0','100a78fe','100a788e','100b4407','100b448b','100b444f','100ae27b','100aa47d','100a7265','100aef10','100b1854','100b4b6b','100ce095','100ce045','100aeb68','100aebad','100bef05','100ce0f5','100a72d0','100a7294','100a71ac','100ae2f2','100b10d6','100aa453','100aa45c','100a72ca','100e1660','100e1440','100e1450','100e1470','100e14b0','100e14c0','100e14d0','100e14e0','100e14f0','100e1500','100e1510','100135f0','10013240','10020bf0','1003d410','1003d2f0','10047f10','10045da0','100aabd2','100aaaf6']){
    for(const row of readFileSync(base+body+'.asm.txt','utf8').trim().split('\n')){
      const [address,bytes,instruction]=row.split(' | ');
      const emitted=sharedInitializerInstruction(address!);
      expect(emitted).toEqual({address,bytes,instruction});expect(Object.isFrozen(emitted)).toBe(true);
    }
  }
  expect(sharedInitializerHeader).toEqual(source.imageHeader);expect(Object.isFrozen(sharedInitializerHeader)).toBe(true);
  expect(sha(Buffer.from(sharedInitializerHeader.raw,'hex'))).toBe('c7ce61ba6cf382ccf9417ec15d15b55e36f9766a73cc3a8dda440879f735d6d3');
  expect(()=>sharedInitializerInstruction('100b4426')).toThrow('Unowned');
});
interface Method {
  bodyVA:string; instructionCount:number; bodyByteCount:number;
  assemblySha256:string; bodyInstructionBytesSha256:string;
  cSha256:string|null; reconstructedCUnavailable?:boolean;
  decoder?:string; allDirectBranchesRecovered?:boolean;
}
it('pins original SharedBase source identity without granting initializer execution',()=>{
  expect(source.schema).toBe('gothic3-shared-initializer-source-v1');
  expect(source.sharedBaseSha256).toBe('5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214');
  expect(source.verifiedAgainstOriginalPE).toBe(true);
  expect(source.sourceOnly).toBe(true);
  expect(source.initializerExecutionCompleted).toBe(false);
  expect(Object.keys(source.methods)).toHaveLength(61);
  expect((Object.values(source.methods) as Method[]).reduce((sum,m)=>sum+m.instructionCount,0)).toBe(1355);
});
it('preserves every admitted instruction byte and separates unavailable C exports',()=>{
  let recovered=0;
  for(const method of Object.values(source.methods) as Method[]){
    const assembly=readFileSync(base+method.bodyVA.slice(2)+'.asm.txt');
    expect(sha(assembly)).toBe(method.assemblySha256);
    const rows=assembly.toString('utf8').trim().split('\n').map(row=>row.split(' | '));
    const bytes=Buffer.concat(rows.map(row=>Buffer.from(row[1]!,'hex')));
    expect(rows.length).toBe(method.instructionCount);
    expect(bytes.length).toBe(method.bodyByteCount);
    expect(sha(bytes)).toBe(method.bodyInstructionBytesSha256);
    if(method.cSha256){
      expect(sha(readFileSync(base+method.bodyVA.slice(2)+'.c.txt'))).toBe(method.cSha256);
    }else{
      expect(method.reconstructedCUnavailable).toBe(true);
    }
    if(method.decoder){
      recovered++;
      expect(method.decoder).toBe('capstone 5.0.7');
      expect(method.allDirectBranchesRecovered).toBe(true);
      const boundaries=new Set(rows.map(row=>parseInt(row[0]!,16)));
      for(const row of rows){
        if(/^j\w+ /.test(row[2]!)){
          const target=row[2]!.match(/0x([a-f0-9]+)/);
          expect(target).not.toBeNull();
          expect(boundaries.has(parseInt(target![1]!,16))).toBe(true);
        }
      }
    }
  }
  expect(recovered).toBe(6);
});
it('retains table ordering, NULL gaps and every registered callback entry',()=>{
  const expected:Record<string,{count:number; hash:string; indices:number[]}>= {
    floatingPointHook:{count:1,hash:'578066c9e9bb88987e901dedba5d9b22be488e0e257a091ed2365dd0279d28f1',indices:[0]},
    errorInitializers:{count:135,hash:'f215c2271c89b18acd8f55938e07e3b8905b43d4cd683f37545c961d8f87eafc',indices:[65,66,67,68,69]},
    voidInitializers:{count:214,hash:'fd99f7fcf539bc68eea33517557e25e1478c48baa66261e6658f02fad3552833',indices:[65,130,131,132,133,134,135,136,138,139,140,141,142,143,144,145,146]},
    dynamicTlsHook:{count:1,hash:'df3f619804a92fdb4057192dc43dd748ea778adc52bc498ce80524c014b81119',indices:[]},
  };
  for(const [label,pin] of Object.entries(expected)){
    const table=source.tables[label]; const raw=Buffer.from(table.raw,'hex');
    expect(sha(raw)).toBe(pin.hash); expect(table.sha256).toBe(pin.hash);
    expect(raw.length).toBe(pin.count*4); expect(table.entryCount).toBe(pin.count);
    expect(table.scope).toBe('cold-original-image'); expect(table.liveValueCaptured).toBe(false);
    expect(parseInt(table.endExclusive,16)-parseInt(table.address,16)).toBe(raw.length);
    const indices=[];
    for(let index=0;index<pin.count;index++)if(raw.readUInt32LE(index*4)!==0)indices.push(index);
    expect(indices).toEqual(pin.indices);
    expect(table.callbacks.map((entry:{index:number})=>entry.index)).toEqual(indices);
    for(const entry of table.callbacks){
      expect(parseInt(entry.targetVA,16)).toBe(raw.readUInt32LE(entry.index*4));
      expect(parseInt(entry.slotVA,16)).toBe(parseInt(table.address,16)+entry.index*4);
      expect(source.methods[source.entries[entry.targetVA].methodLabel]).toBeDefined();
    }
  }
  expect(source.tables.floatingPointHook.callbacks[0].targetVA).toBe('100a78fe');
  expect(source.tables.dynamicTlsHook.section.loaderZeroFillBytes).toBe(4);
});
it('captures the section write flag and cold conversion/exit/RTC storage',()=>{
  const hook=source.tables.floatingPointHook;
  const section=source.sectionHeaders.find((entry:{virtualAddress:string;virtualSize:number})=>
    parseInt(entry.virtualAddress,16)<=parseInt(hook.address,16)&&
    parseInt(hook.address,16)<parseInt(entry.virtualAddress,16)+entry.virtualSize);
  expect(section.name).toBe('.rdata');
  expect(parseInt(section.characteristics,16)&0x80000000).toBe(0);
  expect(Buffer.from(section.raw,'hex').readUInt32LE(36)).toBe(parseInt(section.characteristics,16));
  for(const value of Object.values(source.coldGlobals) as {raw:string;bytes:number;sha256:string;liveValueCaptured:boolean}[]){
    const raw=Buffer.from(value.raw,'hex');expect(raw.length).toBe(value.bytes);
    expect(sha(raw)).toBe(value.sha256);expect(value.liveValueCaptured).toBe(false);
  }
  expect(source.coldGlobals.floatConversionTable.raw).toBe('9fdf0c10'.repeat(10));
  expect(source.coldGlobals.rtcTerminators.raw).toBe('00'.repeat(256));
});
it('retains original CALL encodings and distinguishes imports from indirect callbacks',()=>{
  expect(source.calls).toHaveLength(136);
  for(const call of source.calls){
    const raw=Buffer.from(call.raw,'hex');
    if(call.kind==='direct'){
      expect(raw[0]).toBe(0xe8);
      expect(parseInt(call.address,16)+5+raw.readInt32LE(1)).toBe(parseInt(call.targetVA,16));
    }else if(call.kind==='image-indirect'){
      expect(raw.subarray(0,2).toString('hex')).toBe('ff15');
      expect(raw.readUInt32LE(2)).toBe(parseInt(call.slotVA,16));
    }else expect(call.kind).toBe('register-or-memory-indirect');
  }
  const criticalSection=source.calls.find((call:{address:string})=>call.address==='100e1455');
  expect(criticalSection.importEntry.name).toBe('InitializeCriticalSection');
  expect(source.calls.find((call:{address:string})=>call.address==='100aa692').kind).toBe('register-or-memory-indirect');
  expect(source.rtcTerminationEntry).toBe('100bb8e7');
});

it('pins the original pointer encoding lookup inputs and availability branches',()=>{
  expect(source.coldGlobals.pointerModuleName.raw).toBe('4b45524e454c33322e444c4c00');
  expect(source.coldGlobals.pointerEncodeProcedureName.raw).toBe('456e636f6465506f696e74657200');
  expect(source.coldGlobals.tlsGetterIndex).toMatchObject({address:'10140b48',raw:'ffffffff'});
  expect(source.coldGlobals.threadDataIndex).toMatchObject({address:'10140b44',raw:'ffffffff'});
  expect(source.coldGlobals.tlsGetValueImportSlot.address).toBe('102f97b8');
  expect(source.methods.pointerEncodingAvailable.bodyVA).toBe('0x100ae20f');
  expect(source.calls.find((call:{address:string})=>call.address==='100ae225').targetVA).toBe('100aa54c');
  expect(source.calls.find((call:{address:string})=>call.address==='100ae256').targetVA).toBe('100b0be0');
});

it('captures original processor exception-frame dependencies without executing them',()=>{
 expect(source.methods.exceptionFrameEnter.bodyVA).toBe('0x100aeb68');
 expect(source.methods.exceptionFrameLeave.bodyVA).toBe('0x100aebad');
 expect(source.coldGlobals.processorProbeScope).toMatchObject({address:'100f8ec0',bytes:28,liveValueCaptured:false});
 expect(sharedInitializerInstruction('100aeb68').instruction).toBe('PUSH 0x100aec00');
});

it('recovers processor exception filter and handler targets from the original scope',()=>{
 const scope=Buffer.from(source.coldGlobals.processorProbeScope.raw,'hex');
 expect(scope.readUInt32LE(20)).toBe(0x100ce062);expect(scope.readUInt32LE(24)).toBe(0x100ce07e);
 expect(source.methods.processorProbeExceptionFilter.decoder).toBe('capstone 5.0.7');
 expect(source.methods.processorProbeExceptionHandler.decoder).toBe('capstone 5.0.7');
 const filter=readFileSync(base+'100ce062.asm.txt','utf8');expect(filter).toContain('cmp eax, 0xc0000005');expect(filter).toContain('cmp eax, 0xc000001d');
 const handler=readFileSync(base+'100ce07e.asm.txt','utf8');expect(handler).toContain('and dword ptr [ebp - 0x1c], 0');
 expect(()=>sharedInitializerInstruction('100ce062')).toThrow('Unowned');
});

it('pins the original twenty FILE records and their buffer/descriptor fields',()=>{
 const files=source.coldGlobals.stdioFiles;expect(files).toMatchObject({address:'10141790',bytes:640,sha256:'f2a2cf29c97d8939530c43bb672a5b8097ce8fdb131e92ef721a7d85e477e9f3',liveValueCaptured:false});const raw=Buffer.from(files.raw,'hex');expect(sha(raw)).toBe(files.sha256);expect(raw.readUInt32LE(12)).toBe(257);for(let index=0;index<3;index++)expect(raw.readUInt32LE(index*32+16)).toBe(index);
});

it('retains loader-zero static section storage and original InitializeCriticalSection IAT bytes',()=>{
 expect(source.coldGlobals.staticCriticalSection).toMatchObject({address:'10197da0',bytes:24,raw:'00'.repeat(24),section:{fileBackedBytes:0,loaderZeroFillBytes:24},liveValueCaptured:false});expect(source.coldGlobals.initializeSectionImportSlot).toMatchObject({address:'102f95f4',bytes:4,raw:'349b2f00'});
});

it('retains the file-backed static source and loader-zero destination separately',()=>{
 expect(source.coldGlobals.staticValueSource).toMatchObject({address:'100ebb28',bytes:16,raw:'00'.repeat(16),section:{fileBackedBytes:16,loaderZeroFillBytes:0}});expect(source.coldGlobals.staticValueDestination).toMatchObject({address:'101ab150',bytes:16,raw:'00'.repeat(16),section:{fileBackedBytes:0,loaderZeroFillBytes:16}});
});

it('retains Root literal, text-constructor thunks and allocation dependency bytes',()=>{
 expect(source.coldGlobals.rootTextLiteral).toMatchObject({address:'100e9b5c',raw:'526f6f7400',bytes:5,liveValueCaptured:false});expect(source.methods.rootTextConstructor.entryChain).toEqual([{va:'10003ba7',bytes:'e944fa0000',targetVA:'100135f0'}]);expect(source.methods.rootTextAlloc.entryChain).toEqual([{va:'10007d65',bytes:'e9d6b40000',targetVA:'10013240'}]);expect(sharedInitializerInstruction('10003ba7').bytes).toBe('e944fa0000');expect(sharedInitializerInstruction('10007d65').bytes).toBe('e9d6b40000');
});

it('retains original MemoryAdmin GetInstance thunk and static guard storage',()=>{
 expect(source.methods.memoryGetInstance.entryChain).toEqual([{va:'10002aae',bytes:'e93de10100',targetVA:'10020bf0'}]);expect(sharedInitializerInstruction('10002aae').bytes).toBe('e93de10100');expect(source.coldGlobals.memoryAdminState).toMatchObject({address:'10142798',bytes:16,raw:'00'.repeat(16),liveValueCaptured:false});
});

it('retains original Malloc thunk chain, scope and heap-section imports',()=>{
 expect(source.methods.memoryMalloc.entryChain).toEqual([{va:'10003cd8',bytes:'e923ce0100',targetVA:'10020b00'},{va:'10020b00',bytes:'e93c69feff',targetVA:'10007441'},{va:'10007441',bytes:'e9ca5f0300',targetVA:'1003d410'}]);expect(source.coldGlobals.memoryMallocScope).toMatchObject({address:'100f8318',raw:'ffffffffa5d40310afd40310',bytes:12});expect(source.coldGlobals.memoryHeapSection).toMatchObject({address:'10189a18',bytes:24,raw:'00'.repeat(24)});expect(source.calls.find((call:{address:string})=>call.address==='1003d449').importEntry).toMatchObject({module:'KERNEL32.dll',name:'InitializeCriticalSectionAndSpinCount'});
});

it('pins the lower dispatcher and 16-byte pool instruction bodies and entry thunks',()=>{
  for(const [label,entry,body,thunk,hash,count] of [
    ['heapAllocate','10001028','1003d2f0','e9c3c20300','81a87d3f55464496b395c0d896cf0bf6e3d9386e1312f40effb2dcb0f29debf0',81],
    ['pool16Dispatch','10002d97','10047f10','e974510400','ca60809dbb386056b7f7b05993e45ac896079a37e28034dfc0ad840583c60e03',43],
    ['pool16Initialize','100061cc','10045da0','e9cffb0300','2581efd22be28d3f60729e79fa46125e7f0b4c4bd711d68ca0ad2bfdf9e7777d',48],
    ['pool16Allocate','1000605a','1003e090','e931800300','ac1587863d6014b6666d859f2f1d81eb2879152e6297a3860bad25e62e4cf324',51],
  ] as const){
    const method=source.methods[label];expect(method.entryVA).toBe('0x'+entry);
    expect(method.bodyVA).toBe('0x'+body);expect(method.instructionCount).toBe(count);
    expect(method.bodyInstructionBytesSha256).toBe(hash);
    expect(method.entryChain).toEqual([{va:entry,bytes:thunk,targetVA:body}]);
    const bytes=Buffer.from(thunk,'hex');expect(bytes[0]).toBe(0xe9);
    expect(parseInt(entry,16)+5+bytes.readInt32LE(1)).toBe(parseInt(body,16));
  }
  // Bitmap allocator execution remains unadmitted.
  expect(()=>sharedInitializerInstruction('1003e090')).toThrow('Unowned');
});
it('preserves every original size-to-pool dispatch slot including the 13-byte selection',()=>{
  const table=source.coldGlobals.heapDispatchTable;const raw=Buffer.from(table.raw,'hex');
  expect(table.address).toBe('102fb050');expect(table.bytes).toBe(4097*4);
  expect(table.section.fileBackedBytes).toBe(raw.length);expect(table.section.loaderZeroFillBytes).toBe(0);
  expect(sha(raw)).toBe(table.sha256);
  const ranges=[
    [0,0x10008698],[5,0x10006a14],[9,0x100028f6],[13,0x10002d97],
    [17,0x10002aa9],[21,0x10004214],[25,0x10005966],[29,0x10008152],
    [33,0x100031d4],[41,0x1000617c],[49,0x1000196a],[57,0x10006dac],
    [65,0x10004002],[81,0x10007315],[97,0x10003102],[113,0x1000690b],
    [129,0x10005fc9],[161,0x10006be5],[193,0x100070c7],[225,0x10004c2d],
    [257,0x100077a7],[321,0x10006eec],[385,0x10003012],[449,0x10007662],
    [513,0x10005448],[641,0x10006b9f],[769,0x10004b1f],[897,0x10004d13],
    [1025,0x1000719e],[1281,0x1000647e],[1537,0x10007be9],[1793,0x1000460b],
    [2049,0x1000830f],[2561,0x100024d2],[3073,0x10002e7d],[3585,0x1000536c],
  ];
  for(let range=0;range<ranges.length;range++){
    for(let index=ranges[range]![0]!;index<(ranges[range+1]?.[0]??4097);index++){
      expect(raw.readUInt32LE(index*4)).toBe(ranges[range]![1]);
    }
  }
  expect(raw.readUInt32LE(13*4)).toBe(0x10002d97);
  expect(0x102fb050+17*4).toBe(0x102fb094);
  expect(raw.readUInt32LE(17*4)).toBe(0x10002aa9);
});
it('retains original pool globals, bitmap geometry and VirtualAlloc request evidence',()=>{
  for(const [label,address,raw] of [
    ['pool16State','102ffd58','00'.repeat(12)],['pool16Descriptor','102ffef0','00000000'],
    ['poolDescriptorList','102fb004','00000000'],['pool16Geometry','100e7aa8','10000000ffff0000'],
    ['poolVirtualAllocImport','102f9680','da9d2f00'],
  ]){
    const receipt=source.coldGlobals[label!];expect(receipt.address).toBe(address);
    expect(receipt.raw).toBe(raw);expect(receipt.bytes).toBe(raw!.length/2);
    expect(sha(Buffer.from(raw!,'hex'))).toBe(receipt.sha256);
    expect(receipt.liveValueCaptured).toBe(false);
  }
  expect(source.coldGlobals.poolVirtualAllocImport.importEntry).toEqual({iatVA:'0x102f9680',module:'KERNEL32.dll',name:'VirtualAlloc',ordinal:null});
  const rows=readFileSync(base+'10047f10.asm.txt','utf8');
  expect(rows).toContain('10047f68 | 6800301000 | PUSH 0x103000');
  expect(rows).toContain('10047f6d | 6800201000 | PUSH 0x102000');
  expect(rows).toContain('10047f72 | 6a00 | PUSH 0x0');
  expect(rows).toContain('10047f74 | ffd7 | CALL EDI');
  expect(rows).toContain('10047f86 | ff2594b02f10 | JMP dword ptr [0x102fb094]');
  const init=readFileSync(base+'10045da0.asm.txt','utf8');
  expect(init).toContain('MOV dword ptr [ESI + 0x101ffc],0x7fffffff');
  expect(init).toContain('XCHG.LOCK dword ptr [0x102ffd5c],EAX');
  const bitmap=readFileSync(base+'1003e090.asm.txt','utf8');
  expect(bitmap).toContain('SCASD.REPE ES:EDI');expect(bitmap).toContain('BTR.LOCK [EDI],EDX');
  expect(source.calls.find((call:{address:string})=>call.address==='10047f7c').targetVA).toBe('100061cc');
  expect(source.calls).toHaveLength(136);
});

it('pins descriptor CRT new/malloc bodies and the original HeapAlloc IAT',()=>{
 expect(source.methods.crtOperatorNew.bodyInstructionBytesSha256).toBe('3cf0637b4a6ec05fe2a843ef56071ae4e1142a1aec075e0234556d46c4ff5197');
 expect(source.methods.crtMalloc.bodyInstructionBytesSha256).toBe('70262c4e3e41925b21175c516dbef31313d2260ef97767a9a6676779eedf7a08');
 const receipt=source.coldGlobals.poolHeapAllocImport;expect(receipt.address).toBe('102f9684');expect(receipt.raw).toBe('ea9d2f00');expect(receipt.importEntry).toEqual({iatVA:'0x102f9684',module:'KERNEL32.dll',name:'HeapAlloc',ordinal:null});expect(sha(Buffer.from(receipt.raw,'hex'))).toBe(receipt.sha256);
 expect(sharedInitializerInstruction('100061cc')).toEqual({address:'100061cc',bytes:'e9cffb0300',instruction:'JMP 0x10045da0'});
 expect(source.calls.find((call:{address:string})=>call.address==='100aabea').targetVA).toBe('100aaaf6');
 expect(source.calls.find((call:{address:string})=>call.address==='100aab6e').kind).toBe('register-or-memory-indirect');
});
