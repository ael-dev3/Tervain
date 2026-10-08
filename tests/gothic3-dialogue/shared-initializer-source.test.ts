import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect, it} from 'vitest';
import {sharedInitializerHeader,sharedInitializerInstruction} from '../../src/gothic3/native-shared-initializer-instructions';

const base='assets/gothic3/shared-initializer-source/';
const source=JSON.parse(readFileSync(base+'source.json','utf8'));
const sha=(raw:Uint8Array)=>createHash('sha256').update(raw).digest('hex');
it('matches every generated initializer row and header to original admitted receipts',()=>{
  for(const body of ['100aa632','100ae900','100ae880','100ae8b0','100a78fe','100a788e','100b4407','100b448b','100b444f','100ae27b','100aa47d','100a7265','100aef10','100b1854','100b4b6b','100ce095']){
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
  expect(Object.keys(source.methods)).toHaveLength(43);
  expect((Object.values(source.methods) as Method[]).reduce((sum,m)=>sum+m.instructionCount,0)).toBe(768);
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
  expect(recovered).toBe(4);
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
  expect(source.calls).toHaveLength(74);
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
 expect(()=>sharedInitializerInstruction('100aeb68')).toThrow('Unowned');
});
