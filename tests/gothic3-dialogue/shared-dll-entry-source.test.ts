import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import observation from '../../assets/gothic3/shared-dll-entry-source/windows-version-api-observation.json';
import source from '../../assets/gothic3/shared-dll-entry-source/source.json';
import {sharedDllEntryInstruction} from '../../src/gothic3/native-shared-dll-entry-instructions';
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
describe('original SharedBase DLL entry evidence',()=>{
 it('retains every original body and thunk instruction without granting execution',()=>{
  expect(source.inputSha256).toBe('5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214');
  expect(source.verifiedAgainstOriginalPE).toBe(true);
  expect(source.methods).toHaveLength(86);
  expect(source.methods.reduce((n,m)=>n+m.instructions.length,0)).toBe(4898);
  for(const method of source.methods){
   for(const row of method.instructions){const emitted=sharedDllEntryInstruction(row.va);expect(emitted).toEqual({address:row.va,bytes:row.bytes,instruction:row.instruction});expect(Object.isFrozen(emitted)).toBe(true);}
   for(const row of method.entryChain)expect(sharedDllEntryInstruction(row.va)).toEqual({address:row.va,bytes:row.bytes,instruction:'JMP 0x'+row.targetVA});
  }
  expect(()=>sharedDllEntryInstruction('00000000')).toThrow('Unowned');
 });
 it('preserves the absence of DllGetVersion in the installed export table',()=>{
  expect(source.versionExportLookup).toMatchObject({name:'DllGetVersion',namedExportCount:4805,matches:[]});
  expect(source.imports.map(i=>i.name)).toContain('LoadLibraryA');
  expect(source.imports.map(i=>i.name)).toContain('GetProcAddress');
 });
 it('preserves the actual version resource and translated FileVersion text',()=>{
  expect(source.versionResources.entries).toHaveLength(1);
  const entry=source.versionResources.entries[0]!;
  expect(entry.path).toEqual([16,1,1031]);expect(entry.size).toBe(868);
  expect(sha(Buffer.from(entry.bytes,'hex'))).toBe(entry.sha256);
  expect(entry.sha256).toBe('2b94742476a11cd051b72d535033a373ab7d4ddb68ec2ecda3cdf459e59974d3');
  const strings=entry.blocks.children.find(b=>b.key==='StringFileInfo')!;
  expect(strings.children[0]!.children.find(b=>b.key==='FileVersion')!.text).toBe('1, 60, 25931, 29');
 });
 it('retains cold guard and optional hook bytes',()=>{
  for(const name of ['optionalCrtHook','dllInitializerObject','dllInitializerGuard'])expect(source.coldImages.find(i=>i.label===name)!.bytes).toBe('00000000');
  expect(sharedDllEntryInstruction('100a164f').instruction).toBe('RET 0xc');
 });
});

it('preserves the prepared ANSI version buffer and contained actual query results',()=>{
 expect(observation.inputSha256).toBe(source.inputSha256);
 expect(observation.size).toBe(1740);expect(observation.handle).toBe(0);
 const bytes=Buffer.from(observation.preparedBufferBytes,'hex');
 expect(bytes.length).toBe(observation.size);expect(sha(bytes)).toBe(observation.preparedBufferSha256);
 expect(observation.queries.map(q=>[q.offset,q.length])).toEqual([[864,4],[1200,17]]);
 for(const query of observation.queries){
  expect(query.result).toBe(1);expect(query.offset).toBeGreaterThanOrEqual(0);
  expect(query.offset+query.length).toBeLessThanOrEqual(bytes.length);
  expect(bytes.subarray(query.offset,query.offset+query.length).toString('hex')).toBe(query.bytes);
 }
 expect(Buffer.from(observation.queries[1]!.bytes,'hex').toString('ascii')).toBe('1, 60, 25931, 29\0');
});

it('replays only the observed query mutations from the initialized API buffer',()=>{
 const bytes=Buffer.from(observation.initialBufferBytes,'hex');
 expect(bytes.length).toBe(observation.size);expect(sha(bytes)).toBe(observation.initialBufferSha256);
 expect(observation.queries.map(q=>q.changedBytes.length)).toEqual([0,16]);
 for(const query of observation.queries){
  expect(sha(bytes)).toBe(query.beforeSha256);
  for(const change of query.changedBytes){expect(change.offset).toBeLessThan(bytes.length);expect(bytes[change.offset]).toBe(change.before);bytes[change.offset]=change.after;}
  expect(sha(bytes)).toBe(query.afterSha256);
 }
 expect(bytes.toString('hex')).toBe(observation.preparedBufferBytes);
});

it('retains VERSION import thunk bytes and their original IAT receipts',()=>{
 expect(source.versionImportThunks).toHaveLength(3);for(const thunk of source.versionImportThunks){expect(thunk.import.module).toBe('VERSION.dll');expect(thunk.bytes).toBe('ff25'+Buffer.from(Uint32Array.of(parseInt(thunk.import.iatVA,16)).buffer).toString('hex'));expect(sharedDllEntryInstruction(thunk.address)).toEqual({address:thunk.address,bytes:thunk.bytes,instruction:thunk.instruction});}
});


it('captures the actual formatted query helper, output engine and zero-filled output buffer',()=>{
 const helper=source.methods.find(m=>m.label==='versionQuerySprintf')!;
 const engine=source.methods.find(m=>m.label==='formattedOutputEngine')!;
 expect(helper.bodyVA).toBe('0x100aa234');expect(helper.instructions).toHaveLength(51);
 expect(helper.instructions.find(i=>i.va==='100aa287')!.instruction).toBe('CALL 0x100b5355');
 expect(engine.bodyVA).toBe('0x100b5355');expect(engine.instructions).toHaveLength(769);
 const output=source.coldImages.find(i=>i.label==='versionQueryOutput')!;
 expect(output.address).toBe('101ab190');expect(output.size).toBe(256);
 expect(output.bytes).toBe('00'.repeat(256));
 const literal=(label:string)=>Buffer.from(source.coldImages.find(i=>i.label===label)!.bytes,'hex').toString('ascii');
 expect(literal('translatedVersionQuery')).toBe('\\StringFileInfo\\%02X%02X%02X%02X\\FileVersion\0');
 expect(literal('localeVersionQuery')).toBe('\\StringFileInfo\\%04X04B0\\FileVersion\0');
});


it('retains the original output-engine classification and dispatch tables',()=>{
 const state=source.coldImages.find(i=>i.label==='formatStateTables')!,dispatch=source.coldImages.find(i=>i.label==='formatDispatchTable')!;
 expect(state.address).toBe('100ede50');expect(state.size).toBe(160);expect(sha(Buffer.from(state.bytes,'hex'))).toBe('6bf8a02d2cbf9c2988998af836adcb53cab68d22121cdec740ab7a7b3b5c2a33');
 expect(dispatch.address).toBe('100b5cc9');expect(dispatch.size).toBe(32);expect(sha(Buffer.from(dispatch.bytes,'hex'))).toBe('d308f11f17971e936cc54ad67ed00c4810c67f8e05732e6e9a05e048582e8b4d');
 const bytes=Buffer.from(dispatch.bytes,'hex');const targets=Array.from({length:8},(_,i)=>bytes.readUInt32LE(i*4).toString(16));expect(targets).toEqual(['100b5697','100b54fe','100b5519','100b5568','100b55a2','100b55aa','100b55e1','100b56d9']);for(const target of targets)expect(sharedDllEntryInstruction(target).address).toBe(target);
});


it('retains original cold MessageAdmin state and source metadata for DLL logging',()=>{
 expect(source.coldImages.find(row=>row.label==='dllMessageGuard')!.bytes).toBe('00000000');expect(source.coldImages.find(row=>row.label==='dllMessageState')!.bytes).toBe('00'.repeat(32));expect(sharedDllEntryInstruction('10049760').instruction).toBe('TEST byte ptr [0x10197d94],0x1');expect(sharedDllEntryInstruction('10049559').instruction).toBe('CALL 0x10006ebf');
});

it('captures the original variable-pool cold bins and buffer scope',()=>{
 expect(source.coldImages.find(row=>row.label==='dllLargePoolBins')).toMatchObject({address:'10144214',size:0x4004,bytes:'00'.repeat(0x4004)});expect(source.coldImages.find(row=>row.label==='dllLargePoolRegionFirst')).toMatchObject({address:'10148218',size:4,bytes:'00000000'});expect(source.coldImages.find(row=>row.label==='dllLargePoolRegionCount')).toMatchObject({address:'102fb04c',size:4,bytes:'00000000'});expect(source.coldImages.find(row=>row.label==='dllErrorBufferScope')).toMatchObject({address:'100f8338',size:12,bytes:'ffffffff39d9031043d90310'});
});

it('pins the original ErrorAdmin termination callback bytes',()=>{expect(source.coldImages.find(row=>row.label==='dllErrorShutdownSource')).toMatchObject({address:'100e2770',size:22,bytes:'b9582a1410e84a0bf2ff68602a1410ff15f8952f10c3'});});
